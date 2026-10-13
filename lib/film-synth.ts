import fs from 'node:fs';

/**
 * The instruments of the film scores, shared by scripts/day-before-score.ts. They are the ones scripts/film-score.ts made the first film's
 * music with (copied from it, so that film's script stays exactly as it was): drones, slow pads, a low piano-like note, glassy bells,
 * far-off metal, a sub pulse, a tick, wind, a long dark reverb, and a quiet master. Everything is synthesized in code: nothing is sampled
 * or downloaded, so there is nothing to license.
 */

export const SR = 44100;

export type Buf = Float32Array;
export type Stereo = { l: Buf; r: Buf };
export const stereo = (n: number): Stereo => ({ l: new Float32Array(n), r: new Float32Array(n) });
export const TAU = Math.PI * 2;
export const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
/** Note names to MIDI numbers: D2 is 38. */
const N: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const note = (name: string) => { const m = /^([A-G])([b#]?)(-?\d)$/.exec(name)!; return 12 * (+m[3] + 1) + N[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };

/** A small, repeatable random-number generator: the same bed every time. */
export function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** A state-variable filter (Chamberlin): low-pass and band-pass outputs, the cutoff changeable every sample. */
export class Svf {
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
export function reverb(input: Buf, opts: { size: number; feedback: number; damp: number; spread: number }): Buf {
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
export class Bed {
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
export function drone(b: Bed, freq: number, gain: number, k: number, pan = 0, wet = 0.3, phase = 0) {
  const n = Math.round(b.seconds * SR);
  let p1 = 0, p2 = 0, p3 = 0;
  for (let i = 0; i < n; i++) {
    p1 += freq / SR; p2 += freq * 1.0035 / SR; p3 += freq * 2 / SR;
    const swell = 0.75 + 0.25 * b.lfo(i, k, phase);
    b.put(i, gain * swell * (Math.sin(TAU * p1) * 0.6 + Math.sin(TAU * p2) * 0.4 + Math.sin(TAU * p3) * 0.18), pan, wet);
  }
}

/** A slow pad: for each note, three saws a few cents apart through a low-pass whose cutoff moves slowly between `lo` and `hi`. */
export function pad(b: Bed, notes: number[], opts: { gain: number; lo: number; hi: number; k: number; kAmp?: number; pan?: number; wet?: number; tremolo?: { hz: number; depth: number }; gate?: (i: number) => number }) {
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
export function wind(b: Bed, gain: number, lo: number, hi: number, k: number, seed: number, wet = 0.6) {
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
export function lowNote(b: Bed, t: number, midi: number, vel: number, pan: number, wet = 0.85, decay = 4) {
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
export function bell(b: Bed, t: number, midi: number, vel: number, pan: number, wet = 0.95, decay = 3.5) {
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
export function metal(b: Bed, t: number, base: number, vel: number, pan: number, wet = 0.9, decay = 1.1) {
  const start = Math.round(t * SR), len = Math.round(decay * 3 * SR);
  const parts = [1, 1.47, 2.09, 2.56, 3.18, 4.07];
  for (const [pi, ratio] of parts.entries()) {
    const f = base * ratio; let ph = 0;
    for (let j = 0; j < len; j++) { ph += f / SR; b.put(start + j, Math.sin(TAU * ph) * vel * Math.exp(-j / (decay * SR / (1 + pi * 0.4))) / (1 + pi * 0.5), pan, wet); }
  }
}

/** A sub-bass pulse: a sine that falls from `top` to `low` in a tenth of a second. */
export function thump(b: Bed, t: number, vel: number, top = 120, low = 38, decay = 0.45) {
  const start = Math.round(t * SR), len = Math.round(decay * 3 * SR);
  let ph = 0;
  for (let j = 0; j < len; j++) {
    const tt = j / SR, f = low + (top - low) * Math.exp(-tt / 0.045);
    ph += f / SR;
    b.put(start + j, Math.sin(TAU * ph) * vel * Math.exp(-tt / decay) * Math.min(1, j / (0.002 * SR)), 0, 0.15);
  }
}

/** A soft click, far away: a few milliseconds of filtered noise. */
export function tick(b: Bed, t: number, vel: number, pan: number, seed: number) {
  const r = rng(seed), f = new Svf(), start = Math.round(t * SR), len = Math.round(0.03 * SR);
  for (let j = 0; j < len; j++) b.put(start + j, f.step(r() * 2 - 1, 2600, 1.2).band * vel * Math.exp(-j / (0.004 * SR)), pan, 0.5);
}

/** Quiet and soft: peaks below -3 dBFS, an average level about -21 dBFS, the very top rolled off; the ends of the loop are not touched. */
export function master(s: Stereo): Stereo {
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

export function writeWav(file: string, s: Stereo) {
  const n = s.l.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s.l[i] * 32767))), 44 + i * 4); buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s.r[i] * 32767))), 46 + i * 4); }
  fs.writeFileSync(file, buf);
}


/**
 * Finish a bed that is meant to loop: the reverb on the send, then the tail folded back onto the start so that the end runs into the
 * beginning. A bed that is not meant to loop passes `fold: false` and keeps its tail as a fade-out instead.
 */
export function finish(b: Bed, opts: { size: number; feedback: number; damp: number; wetGain?: number; fold?: boolean }): Stereo {
  const n = Math.round(b.seconds * SR);
  const rl = reverb(b.wet.l, { size: opts.size, feedback: opts.feedback, damp: opts.damp, spread: 0 });
  const rr = reverb(b.wet.r, { size: opts.size, feedback: opts.feedback, damp: opts.damp, spread: 23 });
  const out = stereo(opts.fold === false ? b.n : n);
  const g = opts.wetGain ?? 1.6;
  for (let i = 0; i < b.n; i++) {
    const j = opts.fold === false ? i : i % n;
    out.l[j] += b.dry.l[i] + rl[i] * g; out.r[j] += b.dry.r[i] + rr[i] * g;
  }
  return out;
}
