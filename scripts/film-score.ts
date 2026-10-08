import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fingerprint } from '../lib/film-voices';
import { MOODS, type Mood } from '../content/incidents/openai-hf/music';
import { EMPTY_MANIFEST, type VoiceManifest } from '../content/incidents/openai-hf/voices';

/**
 * The film's own music: dark ambient beds, composed in code and rendered here, one for each mood in content/incidents/openai-hf/music.ts.
 * Nothing is sampled or downloaded, so there is nothing to license: the beds are ours. They are drones, slow pads, a few sparse low notes,
 * far-off metal and a great deal of reverb, in D minor; each is built so that its end runs into its beginning (every slow movement
 * completes whole cycles in the bed, and the reverb tail is folded back onto the start), so it can be looped.
 *
 *   npx tsx scripts/film-score.ts                  render all six beds into public/film/music/ and record them in the manifest
 *   npx tsx scripts/film-score.ts --moods cold     only these
 *   npx tsx scripts/film-score.ts --report         render and print each bed's loudness, peak and spectrum, without keeping anything
 *
 * They are meant to sit far under a voice, so each is mastered quietly (about -21 dBFS RMS, peaks below -3 dBFS). The player makes them
 * quieter still while anyone speaks. Replace a bed by any MP3 and point the manifest at it: the player only knows "a bed for a mood".
 * (Eleven Music can compose beds from the same prompts on a paid plan: `npm run film:voices -- music`.)
 */

const SR = 44100;
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.FILM_MUSIC_DIR ?? path.join(ROOT, 'public/film/music');
const MANIFEST = process.env.FILM_VOICES_MANIFEST ?? path.join(ROOT, 'content/incidents/openai-hf/voices.manifest.json');

type Buf = Float32Array;
type Stereo = { l: Buf; r: Buf };
const stereo = (n: number): Stereo => ({ l: new Float32Array(n), r: new Float32Array(n) });
const TAU = Math.PI * 2;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
/** Note names to MIDI numbers: D2 is 38. */
const N: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const note = (name: string) => { const m = /^([A-G])([b#]?)(-?\d)$/.exec(name)!; return 12 * (+m[3] + 1) + N[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };

/** A small, repeatable random-number generator: the same bed every time. */
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** A state-variable filter (Chamberlin): low-pass and band-pass outputs, the cutoff changeable every sample. */
class Svf {
  low = 0; band = 0;
  step(x: number, fc: number, q = 0.7): { low: number; band: number } {
    const f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6) / SR);
    this.low += f * this.band;
    const high = x - this.low - q * this.band;
    this.band += f * high;
    return { low: this.low, band: this.band };
  }
}

/** Freeverb-style reverb: eight combs and four all-passes in parallel/series, with a long, dark tail. Works on one channel; the right channel is detuned. */
function reverb(input: Buf, opts: { size: number; feedback: number; damp: number; spread: number }): Buf {
  const base = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(d => Math.round((d + opts.spread) * opts.size));
  const ap = [556, 441, 341, 225].map(d => Math.round((d + opts.spread / 2) * Math.max(1, opts.size / 2)));
  const out = new Float32Array(input.length);
  const combs = base.map(d => ({ buf: new Float32Array(d), i: 0, lp: 0 }));
  const aps = ap.map(d => ({ buf: new Float32Array(d), i: 0 }));
  for (let n = 0; n < input.length; n++) {
    const x = input[n] * 0.015;
    let acc = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * (1 - opts.damp) + c.lp * opts.damp;
      c.buf[c.i] = x + c.lp * opts.feedback;
      if (++c.i >= c.buf.length) c.i = 0;
      acc += y;
    }
    for (const a of aps) {
      const y = a.buf[a.i];
      const z = acc;
      acc = -z + y;
      a.buf[a.i] = z + y * 0.5;
      if (++a.i >= a.buf.length) a.i = 0;
    }
    out[n] = acc;
  }
  return out;
}

/** Everything a bed is made of: a dry mix and a send to the reverb, both stereo, with room past the end for the tail. */
class Bed {
  dry: Stereo; wet: Stereo;
  constructor(readonly seconds: number, readonly tail: number) { const n = Math.round((seconds + tail) * SR); this.dry = stereo(n); this.wet = stereo(n); }
  get n() { return this.dry.l.length; }
  /** Add one mono sample at index `i`, panned (-1 left … 1 right), with `wet` of it sent to the reverb. */
  put(i: number, v: number, pan: number, wet: number) {
    if (i < 0 || i >= this.n) return;
    const l = v * Math.cos((pan + 1) * Math.PI / 4), r = v * Math.sin((pan + 1) * Math.PI / 4);
    this.dry.l[i] += l * (1 - wet); this.dry.r[i] += r * (1 - wet);
    this.wet.l[i] += l * wet; this.wet.r[i] += r * wet;
  }
  /** A slow movement that completes `k` whole cycles in the bed, so the end meets the start. */
  lfo(i: number, k: number, phase = 0) { return Math.sin(TAU * (k * i / (this.seconds * SR) + phase)); }
}

// ——— The sounds ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** A held drone: a sine and its octave, a hair out of tune with itself, swelling slowly. */
function drone(b: Bed, freq: number, gain: number, k: number, pan = 0, wet = 0.3, phase = 0) {
  const n = Math.round(b.seconds * SR);
  let p1 = 0, p2 = 0, p3 = 0;
  for (let i = 0; i < n; i++) {
    p1 += freq / SR; p2 += freq * 1.0035 / SR; p3 += freq * 2 / SR;
    const swell = 0.75 + 0.25 * b.lfo(i, k, phase);
    b.put(i, gain * swell * (Math.sin(TAU * p1) * 0.6 + Math.sin(TAU * p2) * 0.4 + Math.sin(TAU * p3) * 0.18), pan, wet);
  }
}

/** A slow pad: for each note, three saws a few cents apart through a low-pass whose cutoff moves slowly between `lo` and `hi`. */
function pad(b: Bed, notes: number[], opts: { gain: number; lo: number; hi: number; k: number; kAmp?: number; pan?: number; wet?: number; tremolo?: { hz: number; depth: number }; gate?: (i: number) => number }) {
  const n = Math.round(b.seconds * SR);
  notes.forEach((m, vi) => {
    const f = hz(m);
    const ph = [vi * 0.13, vi * 0.31, vi * 0.57];
    const det = [0.9964, 1, 1.0038];
    const filt = new Svf();
    const pos = (vi / Math.max(1, notes.length - 1)) * 2 - 1;
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < 3; j++) { ph[j] += f * det[j] / SR; ph[j] -= Math.floor(ph[j]); s += 2 * ph[j] - 1; }
      const fc = opts.lo + (opts.hi - opts.lo) * (0.5 + 0.5 * b.lfo(i, opts.k, vi * 0.21));
      let y = filt.step(s / 3, fc).low;
      y *= 0.8 + 0.2 * b.lfo(i, opts.kAmp ?? opts.k + 1, vi * 0.33);
      if (opts.tremolo) y *= 1 - opts.tremolo.depth * (0.5 + 0.5 * Math.sin(TAU * opts.tremolo.hz * i / SR + vi));
      if (opts.gate) y *= opts.gate(i);
      b.put(i, y * opts.gain, (opts.pan ?? 0.6) * pos, opts.wet ?? 0.5);
    }
  });
}

/** Wind: noise through a moving band-pass. */
function wind(b: Bed, gain: number, lo: number, hi: number, k: number, seed: number, wet = 0.6) {
  const r = rng(seed), f1 = new Svf(), f2 = new Svf();
  const n = Math.round(b.seconds * SR);
  for (let i = 0; i < n; i++) {
    const x = r() * 2 - 1;
    const fc = lo + (hi - lo) * (0.5 + 0.5 * b.lfo(i, k, 0.1));
    const y = f1.step(x, fc, 0.35).band * 0.6 + f2.step(x, fc * 1.5, 0.35).band * 0.4;
    const amp = 0.5 + 0.5 * b.lfo(i, k + 1, 0.4);
    b.put(i, y * gain * amp, 0.3 * b.lfo(i, k + 2), wet);
  }
}

/** A low piano-like note: a few harmonics that fade at different rates, a soft strike, a long decay. */
function lowNote(b: Bed, t: number, midi: number, vel: number, pan: number, wet = 0.85, decay = 4) {
  const f = hz(midi), start = Math.round(t * SR), len = Math.round(decay * 2.2 * SR);
  for (let h = 1; h <= 6; h++) {
    const amp = vel / h ** 1.25, tau = decay / (0.6 + h * 0.5);
    let ph = 0;
    for (let j = 0; j < len; j++) {
      ph += f * h * (1 + 0.0002 * h * h) / SR;
      const e = Math.min(1, j / (0.006 * SR)) * Math.exp(-j / (tau * SR));
      b.put(start + j, Math.sin(TAU * ph) * amp * e, pan, wet);
    }
  }
}

/** A glassy bell: two sines in an inharmonic ratio, bright at first and then dull. */
function bell(b: Bed, t: number, midi: number, vel: number, pan: number, wet = 0.95, decay = 3.5) {
  const f = hz(midi), start = Math.round(t * SR), len = Math.round(decay * 2.5 * SR);
  let pc = 0, pm = 0;
  for (let j = 0; j < len; j++) {
    const tt = j / SR, e = Math.min(1, j / (0.004 * SR)) * Math.exp(-tt / decay);
    pm += f * 2.7 / SR; pc += f / SR;
    const idx = 2.2 * Math.exp(-tt / (decay * 0.35));
    b.put(start + j, Math.sin(TAU * pc + idx * Math.sin(TAU * pm)) * vel * e, pan, wet);
  }
}

/** Far-off metal: a few inharmonic sines that die away quickly. */
function metal(b: Bed, t: number, base: number, vel: number, pan: number, wet = 0.9, decay = 1.1) {
  const start = Math.round(t * SR), len = Math.round(decay * 3 * SR);
  const parts = [1, 1.47, 2.09, 2.56, 3.18, 4.07];
  for (const [pi, ratio] of parts.entries()) {
    const f = base * ratio; let ph = 0;
    for (let j = 0; j < len; j++) { ph += f / SR; b.put(start + j, Math.sin(TAU * ph) * vel * Math.exp(-j / (decay * SR / (1 + pi * 0.4))) / (1 + pi * 0.5), pan, wet); }
  }
}

/** A sub-bass pulse: a sine that falls from `top` to `low` in a tenth of a second. */
function thump(b: Bed, t: number, vel: number, top = 120, low = 38, decay = 0.45) {
  const start = Math.round(t * SR), len = Math.round(decay * 3 * SR);
  let ph = 0;
  for (let j = 0; j < len; j++) {
    const tt = j / SR, f = low + (top - low) * Math.exp(-tt / 0.045);
    ph += f / SR;
    b.put(start + j, Math.sin(TAU * ph) * vel * Math.exp(-tt / decay) * Math.min(1, j / (0.002 * SR)), 0, 0.15);
  }
}

/** A soft click, far away: a few milliseconds of filtered noise. */
function tick(b: Bed, t: number, vel: number, pan: number, seed: number) {
  const r = rng(seed), f = new Svf(), start = Math.round(t * SR), len = Math.round(0.03 * SR);
  for (let j = 0; j < len; j++) b.put(start + j, f.step(r() * 2 - 1, 2600, 1.2).band * vel * Math.exp(-j / (0.004 * SR)), pan, 0.5);
}

// ——— The beds ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

const D = (n: string) => note(n);

function renderMood(mood: Mood, seconds: number): Stereo {
  const b = new Bed(seconds, 14);
  const rand = rng(({ cold: 11, signal: 23, surge: 37, hollow: 41, aftermath: 53, open: 67 } as Record<Mood, number>)[mood]);
  const at = (from: number, to: number) => from + rand() * (to - from);
  let size = 2.2, feedback = 0.955, damp = 0.45;
  // The weight is kept low and the body in the middle: on a laptop's speakers or a phone there is almost nothing below 120 Hz, so what is
  // heard must live above it. The drones are the floor; the pads, the notes and the air are what carry the mood.
  if (mood === 'cold') {
    drone(b, hz(D('D1')), 0.3, 2, 0, 0.25);
    drone(b, hz(D('A1')), 0.12, 3, -0.2, 0.3, 0.3);
    pad(b, [D('D3'), D('A3'), D('D4'), D('F4')], { gain: 0.24, lo: 260, hi: 900, k: 3, wet: 0.55 });
    pad(b, [D('A2'), D('F3')], { gain: 0.13, lo: 200, hi: 520, k: 2, wet: 0.5, pan: 0.3 });
    pad(b, [D('A4'), D('D5')], { gain: 0.06, lo: 700, hi: 2200, k: 5, wet: 0.8, pan: 0.9 });
    wind(b, 0.3, 1400, 4800, 4, 5, 0.8);
    for (let i = 0; i < 9; i++) lowNote(b, at(2, seconds - 20), [D('D3'), D('F3'), D('A3'), D('C4'), D('D4')][Math.floor(rand() * 5)], 0.34, at(-0.7, 0.7), 0.85, 5);
    for (let i = 0; i < 5; i++) metal(b, at(5, seconds - 15), 520 + rand() * 300, 0.05, at(-0.8, 0.8));
  } else if (mood === 'signal') {
    size = 2.0; feedback = 0.94;
    drone(b, hz(D('D1')), 0.24, 2, 0, 0.25);
    drone(b, hz(D('A1')), 0.14, 4, 0.2, 0.3, 0.2);
    pad(b, [D('D3'), D('A3'), D('E4'), D('F4')], { gain: 0.22, lo: 300, hi: 1100, k: 4, kAmp: 5, wet: 0.5 });
    pad(b, [D('C5'), D('E5')], { gain: 0.05, lo: 900, hi: 2800, k: 6, wet: 0.8, pan: 0.9 });
    wind(b, 0.18, 2200, 6800, 3, 9, 0.8);
    // Signals: a slow arpeggio of D-minor tones, 60 to the minute, that comes and goes, with two echoes of each.
    const scale = ['D4', 'F4', 'A4', 'C5', 'E5', 'A4', 'F4', 'D5'].map(D);
    for (let beat = 0; beat < seconds; beat += 1) {
      const presence = 0.5 + 0.5 * Math.sin(TAU * (3 * beat / seconds));
      if (rand() > 0.35 + 0.4 * presence) continue;
      const m = scale[Math.floor(rand() * scale.length)];
      const pan = at(-0.6, 0.6);
      for (const [d, g] of [[0, 1], [0.75, 0.45], [1.5, 0.2]] as const) bell(b, beat + d, m, 0.05 * g * (0.5 + presence * 0.8), pan + d * 0.1, 0.9, 1.6);
    }
    for (let t = 0.5; t < seconds; t += 0.5) if (rand() > 0.55) tick(b, t, 0.07, at(-0.9, 0.9), Math.floor(t * 100));
  } else if (mood === 'surge') {
    size = 1.6; feedback = 0.9; damp = 0.5;
    const beat = 60 / 78;
    drone(b, hz(D('D1')), 0.26, 2, 0, 0.15);
    pad(b, [D('D3'), D('A3'), D('D4'), D('F4')], { gain: 0.17, lo: 600, hi: 1500, k: 6, wet: 0.35, tremolo: { hz: 7.8, depth: 0.55 } });
    pad(b, [D('D2'), D('Eb3')], { gain: 0.14, lo: 220, hi: 1300, k: 8, kAmp: 8, wet: 0.35 });
    for (let t = 0, i = 0; t < seconds - 0.1; t += beat, i++) {
      thump(b, t, i % 4 === 0 ? 0.45 : 0.28);
      if (i % 2 === 1 && rand() > 0.15) metal(b, t + beat / 2, 330 + rand() * 600, 0.07, at(-0.7, 0.7), 0.55, 0.7);
      if (rand() > 0.7) thump(b, t + beat * 0.75, 0.14, 90, 45, 0.25);
    }
    const r2 = rng(77), f = new Svf(), n = Math.round(seconds * SR);
    for (let i = 0; i < n; i++) { // a gated, industrial rustle in sixteenths
      const x = (r2() * 2 - 1), step = Math.floor(i / (beat / 4 * SR)), on = ((step * 2654435761) >>> 0) % 7 < 4 ? 1 : 0.2;
      b.put(i, f.step(x, 800, 0.5).band * 0.13 * on, 0.4 * b.lfo(i, 3), 0.3);
    }
  } else if (mood === 'hollow') {
    size = 2.6; feedback = 0.965;
    drone(b, hz(D('D1')), 0.22, 2, 0, 0.3);
    drone(b, hz(D('A1')), 0.1, 3, 0.1, 0.4, 0.4);
    pad(b, [D('A3'), D('D4')], { gain: 0.06, lo: 250, hi: 600, k: 2, wet: 0.8 });
    wind(b, 0.24, 500, 1700, 3, 13, 0.9);
    [['A3', 14], ['D4', 41], ['F4', 74], ['A3', 103]].forEach(([m, t], i) => bell(b, +t, D(m as string), 0.09, i % 2 ? 0.5 : -0.5, 1, 6));
  } else if (mood === 'open') {
    // Not a loop: four minutes that follow the film's last part, one movement into the next. The facts are read over a still, low D minor with
    // a few low notes; under the system card a thin tritone shimmers high up and a slow tick counts (monitors); under the White House
    // there is an open fifth, neither minor nor major; and from the first line of our view the chords widen and warm and never settle,
    // while far-off bells come on one by one, and then more of them: the lights.
    size = 2.4; feedback = 0.96;
    const ease = (x: number) => { const y = Math.max(0, Math.min(1, x)); return y * y * (3 - 2 * y); };
    const win = (t0: number, t1: number, fin: number, fout: number) => (i: number) => { const t = i / SR; if (t < t0 || t > t1 + fout) return 0; return ease((t - t0) / fin) * (t > t1 ? ease(1 - (t - t1) / fout) : 1); };
    drone(b, hz(D('D1')), 0.26, 2, 0, 0.3);
    drone(b, hz(D('A1')), 0.1, 3, 0.1, 0.35, 0.3);
    pad(b, [D('D3'), D('A3'), D('D4'), D('F4')], { gain: 0.19, lo: 260, hi: 800, k: 3, wet: 0.55, gate: win(0, 104, 5, 12) });
    pad(b, [D('A2'), D('F3')], { gain: 0.1, lo: 200, hi: 500, k: 2, wet: 0.5, pan: 0.3, gate: win(0, 104, 5, 12) });
    pad(b, [D('A4'), D('Eb5')], { gain: 0.05, lo: 700, hi: 2000, k: 5, wet: 0.85, pan: 0.8, gate: win(88, 152, 8, 10) });
    for (let t = 96; t < 152; t += 1.5) tick(b, t, 0.05, Math.round(t / 1.5) % 2 ? -0.6 : 0.6, Math.floor(t * 100));
    pad(b, [D('D3'), D('A3'), D('D4'), D('A4')], { gain: 0.1, lo: 280, hi: 760, k: 2, wet: 0.6, gate: win(144, 186, 12, 12) });
    pad(b, [D('D3'), D('A3')], { gain: 0.07, lo: 220, hi: 520, k: 2, wet: 0.5, gate: win(96, 146, 10, 14) });
    const chords: [number, number, string[]][] = [
      [182, 206, ['Bb2', 'F3', 'A3', 'D4']],
      [198, 220, ['F3', 'A3', 'C4', 'E4']],
      [212, 236, ['C3', 'G3', 'D4', 'G4']],
      [226, 270, ['D3', 'A3', 'E4', 'A4']],
    ];
    chords.forEach(([t0, t1, ns], ci) => pad(b, ns.map(D), { gain: 0.17 + 0.03 * ci, lo: 360 + 60 * ci, hi: 1300 + 220 * ci, k: 3, wet: 0.6, gate: win(t0, t1, 9, 10) }));
    wind(b, 0.1, 900, 3000, 3, 29, 0.9);
    // Low notes, one every dozen seconds or so (never two together), a little quieter once the unease begins.
    for (let i = 0; i < 13; i++) lowNote(b, 8 + i * 11.8 + at(-2, 2), [D('D3'), D('F3'), D('A3'), D('C4'), D('D4')][(i * 3 + Math.floor(rand() * 2)) % 5], i < 9 ? 0.25 : 0.18, at(-0.7, 0.7), 0.85, 5);
    // The lights: far bells, a few seconds apart at first, then closer together, rising.
    const lights = ['D5', 'A5', 'F5', 'C6', 'A5', 'D6', 'F5', 'G5', 'A5', 'C6', 'D6', 'F6'].map(D);
    for (let t = 186, gap = 5.2, k = 0; t < 238; k++) {
      bell(b, t, lights[k % lights.length] + (rand() > 0.85 ? -12 : 0), 0.045 + 0.02 * Math.min(1, (t - 186) / 45), at(-0.8, 0.8), 0.95, 3.2);
      t += gap * (0.8 + rand() * 0.5); gap = Math.max(1.1, gap * 0.9);
    }
  } else {
    size = 2.2; feedback = 0.955;
    drone(b, hz(D('D1')), 0.24, 2, 0, 0.3);
    drone(b, hz(D('D2')), 0.14, 3, 0.1, 0.4, 0.5);
    // Four chords, each a long breath: Dm, Bb, F, C (the last left open).
    const chords = [['D3', 'A3', 'D4', 'F4'], ['Bb2', 'F3', 'Bb3', 'D4'], ['F3', 'C4', 'F4', 'A4'], ['C3', 'G3', 'C4', 'E4']].map(c => c.map(D));
    const span = seconds / chords.length;
    chords.forEach((chord, ci) => {
      const gate = (i: number) => { const t = i / SR - ci * span; const x = t < 0 ? t + seconds : t; if (x < 0 || x > span + 8) return 0; const a = Math.min(1, x / 7), r = x > span ? Math.max(0, 1 - (x - span) / 8) : 1; return a * r; };
      pad(b, chord, { gain: 0.22, lo: 320, hi: 900, k: 3, wet: 0.6, gate });
      for (let j = 0; j < 4; j++) lowNote(b, ci * span + 3 + j * 5.5 + rand(), chord[j % chord.length] + (j % 2 ? 12 : 0), 0.22, at(-0.6, 0.6), 0.85, 4.5);
    });
    wind(b, 0.1, 1200, 3600, 3, 21, 0.9);
  }
  // Reverb on the send, then fold the tail back onto the start so that the end runs into the beginning.
  const n = Math.round(seconds * SR);
  const rl = reverb(b.wet.l, { size, feedback, damp, spread: 0 }), rr = reverb(b.wet.r, { size, feedback, damp, spread: 23 });
  const out = stereo(n);
  const gainWet = 1.6;
  for (let i = 0; i < b.n; i++) {
    const j = i % n;
    out.l[j] += b.dry.l[i] + rl[i] * gainWet; out.r[j] += b.dry.r[i] + rr[i] * gainWet;
  }
  return out;
}

/** Quiet and soft: peaks below -3 dBFS, an average level about -21 dBFS, the very top rolled off; the ends of the loop are not touched. */
function master(s: Stereo): Stereo {
  const n = s.l.length;
  // A gentle low-pass to keep it dark, a high-pass to keep out what speakers cannot play, both one-pole.
  const lp = (x: Buf, a: number) => { let y = 0; for (let i = 0; i < n; i++) { y += a * (x[i] - y); x[i] = y; } };
  const hp = (x: Buf, a: number) => { let y = 0; for (let i = 0; i < n; i++) { y += a * (x[i] - y); x[i] -= y; } };
  for (const ch of [s.l, s.r]) { lp(ch, 1 - Math.exp(-TAU * 9000 / SR)); hp(ch, 1 - Math.exp(-TAU * 28 / SR)); }
  let sum = 0; for (let i = 0; i < n; i++) sum += s.l[i] * s.l[i] + s.r[i] * s.r[i];
  const rms = Math.sqrt(sum / (2 * n));
  const g = 10 ** (-21 / 20) / rms;
  const peak = 10 ** (-3 / 20);
  for (const ch of [s.l, s.r]) for (let i = 0; i < n; i++) { const v = ch[i] * g; ch[i] = Math.abs(v) < peak * 0.7 ? v : Math.sign(v) * (peak * 0.7 + (peak * 0.3) * Math.tanh((Math.abs(v) - peak * 0.7) / (peak * 0.3))); }
  return s;
}

function writeWav(file: string, s: Stereo) {
  const n = s.l.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s.l[i] * 32767))), 44 + i * 4); buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s.r[i] * 32767))), 46 + i * 4); }
  fs.writeFileSync(file, buf);
}

const args = process.argv.slice(2);
const opt = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const wanted = (opt('moods')?.split(',') ?? MOODS.map(m => m.id)) as Mood[];
const report = args.includes('--report');

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest: VoiceManifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { ...EMPTY_MANIFEST, lines: {} };
  const sec = (manifest.music ??= { provider: null, draft: false, lines: {} });
  for (const id of wanted) {
    const def = MOODS.find(m => m.id === id);
    if (!def) throw new Error(`no mood ${id}`);
    const started = Date.now();
    const bed = master(renderMood(id, def.seconds));
    const tmp = path.join(OUT, `.tmp-${id}.wav`);
    writeWav(tmp, bed);
    const identity = fingerprint(['film-score-v1', id, def.seconds, fs.readFileSync(__filename, 'utf8')]);
    const file = `${id}.${identity.slice(0, 10)}.mp3`;
    const mp3 = path.join(OUT, file);
    if (!report) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-codec:a', 'libmp3lame', '-b:a', '112k', mp3]);
    // How loud it really is, measured on what will be played (the MP3), and how high its peaks go.
    const info = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', report ? tmp : mp3, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
    fs.rmSync(tmp, { force: true });
    const summary = info.slice(info.lastIndexOf('Summary:'));
    const pick = (re: RegExp) => /(-?\d+\.\d+)/.exec(re.exec(summary)?.[0] ?? '')?.[1] ?? '?';
    // How the sound is spread over low, middle and high, in dB (a dark bed has most below a kilohertz).
    const band = (hi: string, lo: string) => { const out = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', report ? tmp : mp3, '-af', `highpass=f=${lo},lowpass=f=${hi},volumedetect`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr; return /mean_volume:\s+(-?\d+\.\d+)/.exec(out)?.[1] ?? '?'; };
    const spread = `sub ${band('120', '20')} | low ${band('500', '120')} | mid ${band('2000', '500')} | high ${band('8000', '2000')}`;
    console.log(`${id.padEnd(10)} ${def.seconds} s, rendered in ${((Date.now() - started) / 1000).toFixed(1)} s: loudness ${pick(/I:\s+-?\d+\.\d+ LUFS/)} LUFS, true peak ${pick(/Peak:\s+-?\d+\.\d+ dBFS/)} dBFS, range ${pick(/LRA:\s+-?\d+\.\d+ LU/)} LU`);
    console.log(`           ${spread} dB`);
    if (!report) {
      sec.lines[id] = { file, seconds: def.seconds, prompt: def.prompt, model: 'film-score-v1' };
      sec.provider = 'synth'; sec.draft = false; sec.model = 'film-score-v1'; sec.generated = new Date().toISOString();
      fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
    }
  }
  if (!report) {
    const used = new Set(Object.values(sec.lines).map(t => t.file));
    for (const f of fs.readdirSync(OUT)) if (f.endsWith('.mp3') && !used.has(f)) fs.rmSync(path.join(OUT, f));
  }
}
main();
