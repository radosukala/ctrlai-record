import { CAPTION_EDGE, DURATION, QUOTE_CARDS, SPEECH_TAIL } from './film';
import { NARRATION, currentNarration } from './narration';
import { currentClips, type VoiceManifest } from './voices';
import MANIFEST_JSON from './voices.manifest.json';

/**
 * Screen time and film time. The film is written in *screen time*: when each caption, card, number and camera move happens, counted so
 * that a caption stays long enough to be read. A voice needs longer than that to say the same words, so the film is played in *film
 * time*, which runs a little slower than screen time wherever a voice is speaking and needs it. The picture, the camera, the captions and
 * the stamps all slow together, so everything stays in step; the voice is never rushed and never cut off, and a jump or a pause keeps
 * the sound right because the sound is on film time (the clock) and everything drawn is on screen time.
 *
 * With no voices recorded there is nothing to wait for, and film time is screen time.
 */

export type SpeechItem = {
  id: string;
  channel: 'agent' | 'narrator';
  /** Screen time the words are fully on screen from, and until. */
  a: number;
  b: number;
  /** How long the recording plays, in real seconds. */
  seconds: number;
};

/** Every recorded line, with the stretch of screen time in which its words are on screen. */
export function speechItems(manifest: VoiceManifest): SpeechItem[] {
  const items: SpeechItem[] = [];
  for (const c of currentClips(manifest)) {
    const card = QUOTE_CARDS.find(q => q.id === c.id)!;
    items.push({ id: c.id, channel: 'agent', a: c.start, b: card.t1 - SPEECH_TAIL, seconds: c.seconds });
  }
  for (const n of currentNarration(manifest)) {
    const l = NARRATION.find(x => x.id === n.id)!;
    items.push({ id: n.id, channel: 'narrator', a: n.start, b: l.caption.t1 - CAPTION_EDGE, seconds: n.seconds });
  }
  return items.sort((x, y) => x.a - y.a);
}

/** The pause kept before a voice's words leave the screen: a voice is never still talking as its words fade. */
export const SPEECH_MARGIN = 0.15;
const STEP = 0.02;
/** How far the slowing is eased in before a voice and out after it, in seconds of screen time. */
const EASE = 1.4;

export type Warp = {
  /** Screen time → film time. */
  toFilm: (tau: number) => number;
  /** Film time → screen time. */
  toScreen: (t: number) => number;
  /** The film's length in film time. */
  duration: number;
  /** How much slower than screen time the film runs at a screen time (1 = not slowed). */
  rho: (tau: number) => number;
  /** The most it slows, and how many seconds it adds in all. */
  max: number;
  added: number;
};

/**
 * Builds the slowing from the recordings: over each voice's words the film runs at the pace that gives the recording room to play, eased
 * in and out so the camera does not lurch. Then it checks that every voice fits, and slows a little more where it does not.
 */
export function buildWarp(items: SpeechItem[], total: number = DURATION, margin = SPEECH_MARGIN): Warp {
  const n = Math.ceil(total / STEP) + 2;
  const need = items.map(i => Math.max(1, (i.seconds + margin) / Math.max(0.5, i.b - i.a)));
  const T = new Float64Array(n);
  const build = () => {
    // The pace each voice needs, held a little before and after it, then smoothed so it eases in and out.
    const raw = new Float64Array(n).fill(1);
    items.forEach((it, i) => {
      const from = Math.max(0, Math.floor((it.a - EASE) / STEP)), to = Math.min(n - 1, Math.ceil((it.b + EASE) / STEP));
      for (let k = from; k <= to; k++) if (need[i] > raw[k]) raw[k] = need[i];
    });
    const half = Math.round(EASE / STEP);
    const rho = new Float64Array(n);
    const prefix = new Float64Array(n + 1);
    for (let k = 0; k < n; k++) prefix[k + 1] = prefix[k] + raw[k];
    for (let k = 0; k < n; k++) { const lo = Math.max(0, k - half), hi = Math.min(n - 1, k + half); rho[k] = (prefix[hi + 1] - prefix[lo]) / (hi - lo + 1); }
    T[0] = 0;
    for (let k = 1; k < n; k++) T[k] = T[k - 1] + ((rho[k - 1] + rho[k]) / 2) * STEP;
    return rho;
  };
  const at = (tau: number) => { const x = Math.min(Math.max(tau, 0) / STEP, n - 1); const k = Math.floor(x); return k >= n - 1 ? T[n - 1] : T[k] + (T[k + 1] - T[k]) * (x - k); };
  let rho = build();
  // A voice that still does not fit (two close together share one smoothing) asks for a little more.
  for (let pass = 0; pass < 12; pass++) {
    let bad = false;
    items.forEach((it, i) => { const room = at(it.b) - at(it.a); if (room < it.seconds + margin - 1e-6) { need[i] *= 1 + (it.seconds + margin - room) / Math.max(room, 1) + 0.002; bad = true; } });
    if (!bad) break;
    rho = build();
  }
  const toFilm = (tau: number) => at(tau);
  const toScreen = (t: number) => {
    if (t <= 0) return 0;
    if (t >= T[n - 1]) return Math.min(total, (n - 1) * STEP + (t - T[n - 1]));
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T[mid] <= t) lo = mid; else hi = mid; }
    return (lo + (t - T[lo]) / (T[hi] - T[lo])) * STEP;
  };
  let max = 1;
  for (let k = 0; k < n; k++) if (rho[k] > max) max = rho[k];
  return { toFilm, toScreen, duration: at(total), rho: tau => rho[Math.min(n - 1, Math.max(0, Math.round(tau / STEP)))], max, added: at(total) - total };
}

const MANIFEST = MANIFEST_JSON as unknown as VoiceManifest;
/** The film as it is now: slowed for the voices that have been recorded. */
export const SPEECH = speechItems(MANIFEST);
export const WARP = buildWarp(SPEECH);
export const FILM_DURATION = WARP.duration;
export const toFilm = WARP.toFilm;
export const toScreen = WARP.toScreen;
