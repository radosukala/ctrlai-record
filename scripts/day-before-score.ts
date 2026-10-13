import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fingerprint } from '../lib/film-voices';
import { Bed, SR, bell, drone, finish, hz, lowNote, master, metal, note, pad, rng, thump, tick, wind, writeWav, type Stereo } from '../lib/film-synth';
import { mp3Seconds } from '../lib/film-voices';
import { MOOD_BY_ID, MOODS, type Mood, type MusicManifest } from '../content/scenarios/day-before/music';

/**
 * The music of "The day before": dark, warm ambient beds composed in code and rendered here, one for each mood in
 * content/scenarios/day-before/music.ts. The instruments are the ones the first film's score was made with (lib/film-synth.ts): drones,
 * slow pads, a low piano-like note, glassy bells, far-off metal, a sub pulse, a tick, wind and a long dark reverb. Nothing is sampled or
 * downloaded, so there is nothing to license. A bed that loops is built so that its end runs into its beginning: every slow movement
 * completes whole cycles, a chord that is let go of is let go of at the start of the next cycle, and the reverb tail is folded onto the
 * start.
 *
 * One small theme runs through all of it (see music.ts): a rising arch in D that comes home, D F A G F D. It is heard whole in the lamp,
 * warmer in the evening, broken in the first hour, asked and not answered while nobody knows who, low under the decisions, falling at dawn,
 * and in the end played through in the major.
 *
 *   npx tsx scripts/day-before-score.ts                  render every bed into public/day-before/music/ and record them in the manifest
 *   npx tsx scripts/day-before-score.ts --moods lamp     only these
 *   npx tsx scripts/day-before-score.ts --report         render and print each bed's loudness, peak, spectrum and loop seam, keep nothing
 *
 * Each is mastered quietly (about -21 dBFS RMS, peaks below -3 dBFS) because it sits under a voice; the player makes it quieter still
 * while the narrator speaks.
 */

const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.DAY_BEFORE_MUSIC_DIR ?? path.join(ROOT, 'public/day-before/music');
const MANIFEST = process.env.DAY_BEFORE_MUSIC_MANIFEST ?? path.join(ROOT, 'content/scenarios/day-before/music.manifest.json');
const BITRATE = '96k';

const D = (n: string) => note(n);
const ease = (x: number) => { const y = Math.max(0, Math.min(1, x)); return y * y * (3 - 2 * y); };
/** A section that is on between t0 and t1 seconds, rising over `fin` and dying over `fout`. */
const win = (t0: number, t1: number, fin: number, fout: number) => (i: number) => { const t = i / SR; if (t < t0 || t > t1 + fout) return 0; return ease((t - t0) / fin) * (t > t1 ? ease(1 - (t - t1) / fout) : 1); };

/** The theme: a rising arch in D that comes home (note, beats). */
const THEME: [string, number][] = [['D5', 1], ['F5', 1], ['A5', 1.5], ['G5', 1], ['F5', 1], ['D5', 3]];
/** The theme played through in the major, as it is finally heard. */
const THEME_MAJOR: [string, number][] = [['D5', 1], ['F#5', 1], ['A5', 1.5], ['B5', 1], ['A5', 1], ['F#5', 1], ['D5', 3.5]];
/** The theme as it falls at dawn. */
const THEME_FALLING: [string, number][] = [['A5', 1.5], ['G5', 1], ['E5', 1.5], ['D5', 3]];

type PhraseOpts = { beat: number; vel: number; pan?: number; wet?: number; decay?: number; detune?: number; echo?: boolean; octave?: number };
/** Play a phrase on the bells; returns the time its last note begins. */
function phrase(b: Bed, t: number, notes: [string, number][], o: PhraseOpts): number {
  let tt = t;
  for (const [n, beats] of notes) {
    const m = D(n) + (o.octave ?? 0) + (o.detune ?? 0);
    bell(b, tt, m, o.vel, o.pan ?? 0, o.wet ?? 0.9, o.decay ?? 3);
    if (o.echo) bell(b, tt + 0.75, m, o.vel * 0.33, -(o.pan ?? 0.3), o.wet ?? 0.95, o.decay ?? 3);
    tt += beats * o.beat;
  }
  return tt;
}

/** Chords that follow one another across the bed, each a long breath, the last one handing over to the first at the seam. */
function chords(b: Bed, list: string[][], opts: { gain: number; lo: number; hi: number; k: number; wet: number; attack?: number; release?: number; pan?: number }) {
  const span = b.seconds / list.length, atk = opts.attack ?? 7, rel = opts.release ?? 8;
  list.forEach((chord, ci) => {
    const gate = (i: number) => {
      const t = i / SR - ci * span;
      const x = t < 0 ? t + b.seconds : t;
      if (x < 0 || x > span + rel) return 0;
      return Math.min(1, x / atk) * (x > span ? Math.max(0, 1 - (x - span) / rel) : 1);
    };
    pad(b, chord.map(D), { gain: opts.gain, lo: opts.lo, hi: opts.hi, k: opts.k, wet: opts.wet, pan: opts.pan, gate });
  });
}

/** The low notes: one every so often, never two together, taken from `pool` in turn with a little chance in it. */
function lows(b: Bed, rand: () => number, from: number, to: number, every: number, pool: string[], vel: number, decay = 5) {
  for (let i = 0, t = from; t < to; i++, t += every * (0.85 + rand() * 0.3)) lowNote(b, t, D(pool[(i + Math.floor(rand() * 2)) % pool.length]), vel, -0.6 + rand() * 1.2, 0.85, decay);
}

const SEED: Record<Mood, number> = { lamp: 101, evening: 113, unease: 127, unknown: 139, wait1: 151, dawn: 163, wait2: 173, wait3: 181, resolve: 193 };

function renderMood(id: Mood): Stereo {
  const def = MOOD_BY_ID[id];
  const seconds = def.seconds;
  const b = new Bed(seconds, 14);
  const rand = rng(SEED[id]);
  const at = (from: number, to: number) => from + rand() * (to - from);
  let size = 2.2, feedback = 0.955, damp = 0.45, wetGain = 1.6;

  if (id === 'lamp') {
    // A lamp comes on. The first second is nearly silent; a soft click and a low pulse as the power arrives (the film's lamp lights at 1.4 s;
    // the click is laid on after the fade-in, in `lampClick`),
    // then a warm Dm9 grows under the theme, heard whole three times, and for the title (at 44.5 s) the harmony opens to a bare fifth.
    size = 2.4; feedback = 0.96;
    drone(b, hz(D('D1')), 0.26, 1, 0, 0.3);
    drone(b, hz(D('A1')), 0.1, 2, 0.15, 0.35, 0.3);
    pad(b, ['D3', 'A3', 'E4', 'F4'].map(D), { gain: 0.2, lo: 260, hi: 800, k: 3, wet: 0.55, gate: win(2, 60, 7, 12) });
    pad(b, ['A2', 'F3'].map(D), { gain: 0.1, lo: 200, hi: 520, k: 2, wet: 0.5, pan: 0.3, gate: win(14, 60, 8, 12) });
    pad(b, ['A4', 'D5'].map(D), { gain: 0.05, lo: 700, hi: 2200, k: 5, wet: 0.85, pan: 0.9, gate: win(26, 60, 10, 12) });
    phrase(b, 6, THEME, { beat: 1.4, vel: 0.06, pan: -0.2 });
    phrase(b, 24, THEME, { beat: 1.4, vel: 0.065, pan: 0.2, echo: true });
    lows(b, rand, 9, 40, 9, ['D3', 'A3', 'F3', 'D3'], 0.28);
    phrase(b, 33, THEME, { beat: 1.4, vel: 0.07, pan: 0, echo: true });
    pad(b, ['D3', 'A3', 'D4', 'A4'].map(D), { gain: 0.15, lo: 300, hi: 900, k: 2, wet: 0.6, gate: win(42, 60, 3, 12) });
    bell(b, 45, D('D6'), 0.06, 0.3, 0.95, 5); bell(b, 45.4, D('A5'), 0.04, -0.3, 0.95, 5);
    wind(b, 0.14, 1000, 3600, 3, 5, 0.85);
  } else if (id === 'evening') {
    // An ordinary evening: Dm9, G6/9, Dm9, Cmaj9 (Dorian: the bright sixth), a slow low note on each beat of a 4-second bar, and the theme warm.
    chords(b, [['D3', 'A3', 'E4', 'F4'], ['G2', 'D3', 'A3', 'B3', 'E4'], ['D3', 'A3', 'E4', 'F4'], ['C3', 'G3', 'D4', 'E4', 'B4']], { gain: 0.2, lo: 320, hi: 1000, k: 4, wet: 0.55 });
    drone(b, hz(D('D1')), 0.22, 2, 0, 0.3);
    drone(b, hz(D('A1')), 0.1, 3, 0.15, 0.35, 0.3);
    for (let t = 2, i = 0; t < seconds - 2; t += 4, i++) lowNote(b, t, D(i % 2 ? 'A2' : 'D2'), 0.2, i % 2 ? 0.2 : -0.2, 0.8, 4);
    phrase(b, 8, THEME, { beat: 1.4, vel: 0.055, pan: -0.3, echo: true });
    phrase(b, 40, THEME, { beat: 1.4, vel: 0.055, pan: 0.3, echo: true, octave: 0 });
    for (const t of [22, 54]) bell(b, t, D('B5'), 0.035, at(-0.5, 0.5), 0.95, 3.5);
    wind(b, 0.1, 900, 3200, 3, 9, 0.85);
  } else if (id === 'unease') {
    // The first hour. The theme breaks: three notes and a silence; then flat; then one flat note alone. A clock starts (a tick every two
    // seconds from the twentieth), a half step creeps in over the chord (Eb over D), far-off metal, a slow pulse underneath near the end.
    size = 2.3; feedback = 0.955;
    drone(b, hz(D('D1')), 0.26, 2, 0, 0.25);
    drone(b, hz(D('A1')), 0.12, 3, 0.15, 0.3, 0.3);
    drone(b, hz(D('Eb2')), 0.07, 1, -0.2, 0.35, 0.5);
    pad(b, ['D3', 'A3', 'D4', 'F4'].map(D), { gain: 0.2, lo: 260, hi: 900, k: 3, wet: 0.5 });
    pad(b, ['A2', 'F3'].map(D), { gain: 0.1, lo: 200, hi: 520, k: 2, wet: 0.5, pan: 0.3 });
    pad(b, ['Eb4', 'A4'].map(D), { gain: 0.05, lo: 600, hi: 1800, k: 5, wet: 0.8, pan: 0.8, gate: win(36, 80, 14, 8) });
    phrase(b, 8, THEME.slice(0, 3), { beat: 1.8, vel: 0.06, pan: -0.3, echo: true });
    phrase(b, 44, THEME.slice(0, 3), { beat: 2.0, vel: 0.06, pan: 0.2, detune: -0.35, echo: true });
    bell(b, 70, D('D5') - 0.5, 0.06, 0, 0.95, 6);
    for (const t of [14, 33, 52, 77]) metal(b, t, 480 + rand() * 280, 0.05, at(-0.8, 0.8));
    for (let t = 20; t < 88; t += 2) tick(b, t, 0.05 + 0.02 * ease((t - 20) / 60), (Math.round(t / 2) % 2 ? -0.5 : 0.5), 300 + t);
    for (let t = 54; t < 84; t += 3) thump(b, t, 0.1 + 0.05 * ease((t - 54) / 30), 90, 42, 0.4);
    lows(b, rand, 5, seconds - 6, 11, ['D3', 'A2', 'F3', 'D3', 'C3'], 0.26);
    wind(b, 0.2, 1100, 4200, 3, 17, 0.85);
  } else if (id === 'unknown') {
    // Who did this? Nobody knows. A suspended chord that never decides (Dsus4 over a tritone shimmer), one note asked again and again, the
    // first interval of the theme (D to F) asked and never answered, and a clock that has slowed to a tick every two seconds.
    size = 2.5; feedback = 0.96;
    drone(b, hz(D('D1')), 0.22, 2, 0, 0.3);
    drone(b, hz(D('A1')), 0.1, 3, 0.1, 0.35, 0.2);
    pad(b, ['D3', 'G3', 'A3', 'D4'].map(D), { gain: 0.16, lo: 240, hi: 700, k: 2, wet: 0.6 });
    pad(b, ['A4', 'Eb5'].map(D), { gain: 0.045, lo: 700, hi: 2000, k: 6, wet: 0.85, pan: 0.8 });
    for (let t = 4; t < seconds - 8; t += 6) bell(b, t, D('A4'), 0.04, at(-0.5, 0.5), 0.95, 3.5);
    for (const t of [18, 46]) { bell(b, t, D('D5'), 0.06, -0.3, 0.95, 4); bell(b, t + 2.6, D('F5'), 0.06, -0.1, 0.95, 5); }
    for (let t = 1; t < seconds - 1; t += 2) tick(b, t, 0.045, Math.round(t / 2) % 2 ? -0.6 : 0.6, 500 + t);
    lows(b, rand, 10, seconds - 10, 24, ['D3', 'A2'], 0.22);
    wind(b, 0.14, 700, 2600, 3, 21, 0.9);
  } else if (id === 'wait1') {
    // Decisions one and two: the film is waiting for you. A low Dm, a very soft tick each second (the clock the question puts up), a
    // slow pulse, the opening three notes of the theme in the lowest register every half minute or so, one far bell.
    size = 2.2; feedback = 0.95;
    drone(b, hz(D('D1')), 0.24, 2, 0, 0.25);
    drone(b, hz(D('A1')), 0.1, 3, 0.15, 0.3, 0.3);
    chords(b, [['D3', 'A3', 'D4', 'F4'], ['D3', 'A3', 'C4', 'F4'], ['D3', 'A3', 'D4', 'F4'], ['Bb2', 'F3', 'Bb3', 'D4']], { gain: 0.2, lo: 260, hi: 800, k: 4, wet: 0.55, attack: 9, release: 9 });
    pad(b, ['A2', 'F3'].map(D), { gain: 0.1, lo: 200, hi: 500, k: 2, wet: 0.5, pan: 0.3 });
    for (let t = 0.5; t < seconds; t += 1) tick(b, t, 0.032, (Math.round(t) % 2 ? -0.4 : 0.4), 700 + Math.round(t));
    for (let t = 2; t < seconds - 2; t += 3) thump(b, t, 0.07, 80, 42, 0.5);
    for (const t of [12, 44, 76]) for (const [j, n] of ['D3', 'F3', 'A3'].entries()) lowNote(b, t + j * 2.2, D(n), 0.28, -0.3 + j * 0.3, 0.85, 5);
    for (const t of [30, 62, 91]) bell(b, t, D('A5'), 0.04, at(-0.6, 0.6), 0.95, 4);
    wind(b, 0.11, 900, 3000, 3, 31, 0.85);
  } else if (id === 'dawn') {
    // The first morning: pale and cold. A pedal on A instead of D, Am9 and Fmaj7 with a thin high shimmer, breath, and the theme falling.
    size = 2.4; feedback = 0.955;
    drone(b, hz(D('A1')), 0.2, 2, 0, 0.3);
    drone(b, hz(D('D1')), 0.1, 1, 0.1, 0.3, 0.4);
    chords(b, [['A2', 'E3', 'B3', 'C4'], ['F2', 'C3', 'E3', 'A3'], ['A2', 'E3', 'B3', 'C4'], ['G2', 'D3', 'A3', 'D4']], { gain: 0.18, lo: 360, hi: 1150, k: 4, wet: 0.6, attack: 8, release: 8 });
    pad(b, ['E5', 'B5'].map(D), { gain: 0.045, lo: 1100, hi: 3200, k: 5, wet: 0.85, pan: 0.85 });
    phrase(b, 9, THEME_FALLING, { beat: 1.6, vel: 0.05, pan: 0.3, echo: true });
    phrase(b, 41, THEME_FALLING, { beat: 1.6, vel: 0.05, pan: -0.3, echo: true });
    for (const t of [5, 29, 53]) lowNote(b, t, D(['A3', 'E3', 'C4'][Math.floor(t / 24) % 3]), 0.24, at(-0.5, 0.5), 0.85, 5);
    wind(b, 0.2, 1200, 4600, 3, 41, 0.85);
  } else if (id === 'wait2') {
    // Decisions three and four: heavier. Bb, Gm, Dm, and A major (its C-sharp pulling back toward D), a slow heart every three seconds, far
    // metal, a quiet tick. The theme is lower still and does not rise.
    size = 2.1; feedback = 0.95; damp = 0.5;
    drone(b, hz(D('D1')), 0.28, 2, 0, 0.2);
    drone(b, hz(D('Bb1')), 0.1, 3, -0.15, 0.3, 0.2);
    drone(b, hz(D('A1')), 0.09, 4, 0.15, 0.3, 0.6);
    chords(b, [['Bb2', 'F3', 'Bb3', 'D4'], ['G2', 'D3', 'G3', 'Bb3'], ['D3', 'A3', 'D4', 'F4'], ['A2', 'E3', 'A3', 'C#4']], { gain: 0.2, lo: 240, hi: 820, k: 3, wet: 0.5, attack: 9, release: 9 });
    for (let t = 1; t < seconds; t += 3) { thump(b, t, 0.16, 90, 38, 0.5); thump(b, t + 0.42, 0.08, 80, 40, 0.4); }
    for (let t = 0.5; t < seconds; t += 1) tick(b, t, 0.03, Math.round(t) % 2 ? -0.4 : 0.4, 900 + Math.round(t));
    for (const t of [20, 53, 80]) metal(b, t, 300 + rand() * 200, 0.055, at(-0.7, 0.7), 0.6, 0.9);
    for (const t of [14, 46, 78]) for (const [j, n] of ['D3', 'F3', 'D3'].entries()) lowNote(b, t + j * 2.6, D(n), 0.3, -0.3 + j * 0.3, 0.85, 5);
    wind(b, 0.13, 800, 2600, 3, 51, 0.85);
  } else if (id === 'wait3') {
    // Decision five, who is in the room: warmer, because it is about people. Bb, F, Gm7, C (left open), a soft tick, and the theme back in
    // the bells, the first time since the lamp that it is played whole, still not home: it ends on the ninth.
    size = 2.3; feedback = 0.957;
    drone(b, hz(D('D1')), 0.22, 2, 0, 0.3);
    drone(b, hz(D('D2')), 0.12, 3, 0.1, 0.4, 0.5);
    chords(b, [['Bb2', 'F3', 'A3', 'D4'], ['F3', 'C4', 'F4', 'A4'], ['G2', 'D3', 'F3', 'Bb3'], ['C3', 'G3', 'C4', 'E4']], { gain: 0.22, lo: 320, hi: 950, k: 4, wet: 0.6, attack: 9, release: 9 });
    for (let t = 0.5; t < seconds; t += 1) tick(b, t, 0.026, Math.round(t) % 2 ? -0.4 : 0.4, 1100 + Math.round(t));
    phrase(b, 10, [...THEME.slice(0, 5), ['E5', 3]], { beat: 1.5, vel: 0.06, pan: -0.2, echo: true });
    phrase(b, 62, [...THEME.slice(0, 5), ['E5', 3]], { beat: 1.5, vel: 0.06, pan: 0.2, echo: true });
    lows(b, rand, 6, seconds - 8, 10, ['D3', 'F3', 'A3', 'C4'], 0.24);
    wind(b, 0.1, 1000, 3400, 3, 61, 0.9);
  } else if (id === 'resolve') {
    // The hot wash: the lights come back. Dm, Bb, F, and then D major with the open fifth (F sharp at last); far bells come on one by one, then
    // more of them, rising; the theme is played to its end in the major at the half minute; and the last chord stays while the end card is up.
    size = 2.4; feedback = 0.96;
    drone(b, hz(D('D1')), 0.26, 1, 0, 0.3);
    drone(b, hz(D('D2')), 0.14, 2, 0.1, 0.4, 0.5);
    const seq: [number, number, string[]][] = [
      [0, 22, ['D3', 'A3', 'D4', 'F4']],
      [18, 42, ['Bb2', 'F3', 'Bb3', 'D4']],
      [38, 62, ['F3', 'C4', 'F4', 'A4']],
      [58, 84, ['D3', 'A3', 'D4', 'F#4', 'A4']],
    ];
    seq.forEach(([t0, t1, ns], ci) => pad(b, ns.map(D), { gain: 0.19 + 0.02 * ci, lo: 340 + 60 * ci, hi: 1000 + 250 * ci, k: 3, wet: 0.6, gate: win(t0, t1, 7, 9) }));
    const lights = ['D5', 'A5', 'F5', 'C6', 'A5', 'D6', 'F5', 'G5', 'A5', 'C6', 'D6', 'F6'].map(D);
    for (let t = 6, gap = 5.4, k = 0; t < 54; k++) {
      bell(b, t, lights[k % lights.length] + (rand() > 0.85 ? -12 : 0), 0.04 + 0.02 * ease((t - 6) / 40), at(-0.8, 0.8), 0.95, 3.2);
      t += gap * (0.8 + rand() * 0.5); gap = Math.max(1.3, gap * 0.9);
    }
    phrase(b, 52, THEME_MAJOR, { beat: 1.4, vel: 0.075, pan: 0, echo: true, decay: 3.5 });
    pad(b, ['D5', 'A5'].map(D), { gain: 0.045, lo: 900, hi: 2600, k: 4, wet: 0.85, pan: 0.8, gate: win(52, 84, 10, 12) });
    lows(b, rand, 8, 48, 11, ['D3', 'F3', 'A3', 'C4', 'D4'], 0.22);
    bell(b, 71, D('D6'), 0.06, 0.2, 0.95, 6); bell(b, 71.6, D('A5'), 0.045, -0.2, 0.95, 6);
    wind(b, 0.1, 900, 3000, 3, 71, 0.9);
  }

  const mixed = finish(b, { size, feedback, damp, wetGain, fold: def.loop });
  return mixed;
}

/** The ends of a bed that does not loop: it fades in from silence (the lamp's first second is silent) and out through its tail. */
function shape(s: Stereo, id: Mood, seconds: number): Stereo {
  const n = s.l.length;
  const inAt = id === 'lamp' ? 1.2 : 0, inFor = id === 'lamp' ? 5 : 4, outFor = 10;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const g = (inFor > 0 ? ease((t - inAt) / inFor) : 1) * ease((n / SR - t) / outFor);
    s.l[i] *= g; s.r[i] *= g;
  }
  void seconds;
  return s;
}

/**
 * How a bed swells or settles over its length, in dB against its mastered level (the master evens everything out, so an arc has to be
 * drawn on afterwards). Only the beds under parts of the film nobody can linger in have one: the loops, which the film may stay in for as
 * long as a viewer takes to choose, are level.
 */
const ARC: Partial<Record<Mood, [number, number][]>> = {
  unease: [[0, -6], [45, -3], [90, 0]],
  dawn: [[0, -3], [30, 0], [64, 0]],
  resolve: [[0, -5], [40, -2], [58, 0], [84, 0]],
};
function arc(s: Stereo, points: [number, number][]): Stereo {
  const n = s.l.length;
  let k = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    while (k < points.length - 2 && t > points[k + 1][0]) k++;
    const [t0, d0] = points[k], [t1, d1] = points[k + 1];
    const f = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
    const g = 10 ** ((d0 + (d1 - d0) * ease(f)) / 20);
    s.l[i] *= g; s.r[i] *= g;
  }
  return s;
}

/** The lamp's click and the low pulse under it, laid on at 1.4 s after the fade-in so that the fade cannot swallow them. */
function lampClick(s: Stereo): Stereo {
  const c = new Bed(3, 0);
  tick(c, 1.4, 0.9, 0, 7); thump(c, 1.42, 0.5, 90, 40, 0.5);
  for (let i = 0; i < c.n && i < s.l.length; i++) { s.l[i] += c.dry.l[i] * 0.16; s.r[i] += c.dry.r[i] * 0.16; }
  return s;
}

/** A loop is closed with a few milliseconds of fade through the seam, so nothing can click if it is ever looped as it is. */
function closeLoop(s: Stereo): Stereo {
  const n = s.l.length, m = 1500;
  for (let i = 0; i < m; i++) { const g = ease(i / m); s.l[i] *= g; s.r[i] *= g; s.l[n - 1 - i] *= g; s.r[n - 1 - i] *= g; }
  return s;
}

/** How loud each ten seconds are (dBFS RMS): the shape of the bed in time. */
function profile(s: Stereo): string {
  const seg = 10 * SR, out: string[] = [];
  for (let a = 0; a < s.l.length; a += seg) {
    let sum = 0, c = 0; for (let i = a; i < Math.min(s.l.length, a + seg); i++) { sum += s.l[i] * s.l[i] + s.r[i] * s.r[i]; c += 2; }
    out.push((10 * Math.log10(sum / c + 1e-12)).toFixed(0));
  }
  return out.join(' ');
}

const args = process.argv.slice(2);
const opt = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const wanted = (opt('moods')?.split(',') ?? MOODS.map(m => m.id)) as Mood[];
const report = args.includes('--report');

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest: MusicManifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { version: 1, beds: {} };
  for (const id of wanted) {
    const def = MOOD_BY_ID[id];
    if (!def) throw new Error(`no mood ${id}`);
    const started = Date.now();
    let bed = master(renderMood(id));
    if (ARC[id]) bed = arc(bed, ARC[id]!);
    if (!def.loop) bed = shape(bed, id, def.seconds); else bed = closeLoop(bed);
    if (id === 'lamp') bed = lampClick(bed);
    const tmp = path.join(OUT, `.tmp-${id}.wav`);
    writeWav(tmp, bed);
    const identity = fingerprint(['day-before-score-v1', id, def.seconds, fs.readFileSync(__filename, 'utf8')]);
    const file = `${id}.${identity.slice(0, 10)}.mp3`;
    const mp3 = path.join(OUT, file);
    // How a loop's seam sounds: the jump between the last sample and the first, against the typical jump between neighbours.
    let seam = '';
    if (def.loop) {
      const n = bed.l.length; let typ = 0; for (let i = 1; i < 44100; i++) typ += Math.abs(bed.l[i] - bed.l[i - 1]); typ /= 44100;
      seam = `, seam jump ${(Math.abs(bed.l[0] - bed.l[n - 1]) / Math.max(1e-9, typ)).toFixed(2)}× the usual step`;
    }
    if (!report) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-codec:a', 'libmp3lame', '-b:a', BITRATE, mp3]);
    const info = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', report ? tmp : mp3, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
    fs.rmSync(tmp, { force: true });
    const summary = info.slice(info.lastIndexOf('Summary:'));
    const pick = (re: RegExp) => /(-?\d+\.\d+)/.exec(re.exec(summary)?.[0] ?? '')?.[1] ?? '?';
    const band = (hi: string, lo: string) => { const out = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', report ? path.join(OUT, `.tmp-${id}.wav`) : mp3, '-af', `highpass=f=${lo},lowpass=f=${hi},volumedetect`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr; return /mean_volume:\s+(-?\d+\.\d+)/.exec(out)?.[1] ?? '?'; };
    const spread = report ? '' : `sub ${band('120', '20')} | low ${band('500', '120')} | mid ${band('2000', '500')} | high ${band('8000', '2000')} dB`;
    console.log(`${id.padEnd(9)} ${def.seconds} s${def.loop ? ' loop' : ''}, rendered in ${((Date.now() - started) / 1000).toFixed(1)} s: ${pick(/I:\s+-?\d+\.\d+ LUFS/)} LUFS, true peak ${pick(/Peak:\s+-?\d+\.\d+ dBFS/)} dBFS, range ${pick(/LRA:\s+-?\d+\.\d+ LU/)} LU${seam}`);
    if (spread) console.log(`          ${spread}`);
    console.log(`          every 10 s (dB): ${profile(bed)}`);
    if (!report) {
      manifest.beds[id] = { file, seconds: def.seconds, length: Math.round(mp3Seconds(new Uint8Array(fs.readFileSync(mp3))) * 100) / 100, loop: def.loop, loudness: Number(pick(/I:\s+-?\d+\.\d+ LUFS/)) || undefined };
      manifest.generated = new Date().toISOString();
      fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
    }
  }
  if (!report) {
    const used = new Set(Object.values(manifest.beds).map(t => t.file));
    for (const f of fs.readdirSync(OUT)) if (f.endsWith('.mp3') && !used.has(f)) fs.rmSync(path.join(OUT, f));
  }
}
main();
