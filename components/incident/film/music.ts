import { MOOD_OF_SCENE, type Mood } from '@/content/incidents/openai-hf/music';
import type { SceneId } from '@/content/incidents/openai-hf/film';
import type { VoiceManifest } from '@/content/incidents/openai-hf/voices';
import MANIFEST from '@/content/incidents/openai-hf/voices.manifest.json';

/**
 * The music under the film. It is not tied to the film's clock: it is a bed for each mood, played on a loop, and the film changes bed
 * (a slow crossfade) when it enters a part of a different mood. A jump, a step or a scrub never leaves it in the wrong place: it carries on
 * and finds the right bed. It makes way for a voice (and stays out of the way a moment after, so it does not pump up and down between
 * captions), it fades out when the film is paused, and it comes back when it plays.
 *
 * Two <audio> elements stream the beds (a bed is two and a half minutes of stereo: decoding five of them whole would take hundreds of
 * megabytes). To loop, the second element starts the same bed a few seconds before the first ends, and the two crossfade; the beds are made so
 * that their end runs into their beginning, so the seam cannot be heard.
 */

export type Bed = { mood: Mood; src: string; seconds: number };

const manifest = MANIFEST as unknown as VoiceManifest;
export const BEDS: Bed[] = Object.entries(manifest.music?.lines ?? {}).map(([mood, t]) => ({ mood: mood as Mood, src: `/film/music/${t.file}`, seconds: t.seconds }));
export const MUSIC_ON_OFFER = BEDS.length > 0;
/** Who made the music: for the credit line. */
export const MUSIC_PROVIDER = manifest.music?.provider ?? null;
/** The bed that plays under a part of the film, if it has been made. */
export const bedFor = (scene: SceneId): Bed | undefined => BEDS.find(b => b.mood === MOOD_OF_SCENE[scene]);

/** While the title card is up, fetch the bed the film opens on, so the music is there the moment Play is pressed. */
export function warmMusic() {
  const first = bedFor('room');
  if (first) fetch(first.src, { cache: 'force-cache' }).catch(() => undefined);
}

/** How loud the music is under nothing, and how much of that is left under a voice. */
const BASE = 0.5;
const DUCK = 0.5;
/** Seconds to change from one bed to another, and to loop a bed into itself. */
const CHANGE = 4;
const LOOP = 8;
/** Seconds a voice keeps the music down after it stops, so that the gaps between captions do not make it pump. */
const HOLD = 2.2;
/** A part of the film must have lasted this long before the music follows it: a scrub across many parts does not make many crossfades. */
const SETTLE = 0.5;

type Deck = { el: HTMLAudioElement; gain: GainNode; bed: Bed | null; since: number };

export class FilmMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private decks: Deck[] = [];
  private live = -1;
  private wantedSince = 0;
  private wanted: Bed | undefined;
  private quietSince = 0;
  private duckUntil = 0;
  private level = 0;

  /** Call from a click or a key press: browsers only let sound start after one. Safe to call again. */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.ctx.destination);
        this.decks = [0, 1].map(() => {
          const el = new Audio();
          el.preload = 'auto'; el.loop = false; el.crossOrigin = 'anonymous';
          const gain = this.ctx!.createGain();
          gain.gain.value = 0;
          this.ctx!.createMediaElementSource(el).connect(gain).connect(this.master!);
          return { el, gain, bed: null, since: 0 };
        });
      }
      if (this.ctx.state !== 'running') void this.ctx.resume();
    } catch { /* no music is not a broken film */ }
  }

  get running() { return this.ctx?.state === 'running'; }
  /** How many of the two elements are playing, and the level the music is at (for tests). */
  get playingDecks() { return this.decks.filter(d => !d.el.paused).length; }
  get gainNow() { return this.master?.gain.value ?? 0; }
  /** The mood being heard, for tests. */
  get mood(): Mood | null { return this.live >= 0 ? this.decks[this.live].bed?.mood ?? null : null; }

  private fade(d: Deck, to: number, seconds: number) {
    const t = this.ctx!.currentTime;
    d.gain.gain.cancelScheduledValues(t);
    d.gain.gain.setValueAtTime(d.gain.gain.value, t);
    d.gain.gain.linearRampToValueAtTime(to, t + seconds);
  }

  private start(bed: Bed, seconds: number) {
    const next = this.live === 0 ? 1 : 0;
    const d = this.decks[next];
    const old = this.live >= 0 ? this.decks[this.live] : null;
    d.bed = bed; d.since = performance.now();
    d.el.src = bed.src;
    d.el.currentTime = 0;
    d.gain.gain.cancelScheduledValues(this.ctx!.currentTime);
    d.gain.gain.setValueAtTime(0, this.ctx!.currentTime);
    void d.el.play().catch(() => undefined);
    this.fade(d, 1, seconds);
    if (old) { this.fade(old, 0, seconds); const o = old; setTimeout(() => { if (this.decks[this.live] !== o) { o.el.pause(); o.bed = null; } }, (seconds + 0.5) * 1000); }
    this.live = next;
  }

  /**
   * Once a frame. `bed` is the bed for the part of the film now showing (none before it starts and after it ends), `playing` whether the film
   * is playing, `want` whether the viewer wants music, `voice` whether a voice is speaking now, `ended` whether the film has run to its end (the
   * music then dies away over a few seconds, as music does, rather than stopping as it does on a pause).
   */
  update(bed: Bed | undefined, playing: boolean, want: boolean, voice: boolean, ended = false) {
    const ctx = this.ctx, master = this.master;
    if (!ctx || !master) return;
    const now = performance.now() / 1000;
    if (voice) this.duckUntil = now + HOLD;
    const on = playing && want && ctx.state === 'running' && !!bed;
    const level = on ? BASE * (now < this.duckUntil ? DUCK : 1) : 0;
    if (Math.abs(level - this.level) > 0.002) { this.level = level; master.gain.setTargetAtTime(level, ctx.currentTime, on ? 0.35 : ended ? 1.3 : 0.2); }
    if (!on) {
      // Faded out and not wanted: let the elements rest, so that a paused film is silent and costs nothing.
      if (!this.quietSince) this.quietSince = now;
      if (now - this.quietSince > (ended ? 7 : 1.2)) for (const d of this.decks) if (!d.el.paused) d.el.pause();
      return;
    }
    this.quietSince = 0;
    if (bed !== this.wanted) { this.wanted = bed; this.wantedSince = now; }
    const live = this.live >= 0 ? this.decks[this.live] : null;
    if (!live || !live.bed) { this.start(bed!, 1.5); return; }
    if (live.el.paused) void live.el.play().catch(() => undefined);
    if (live.bed.mood !== bed!.mood) { if (now - this.wantedSince > SETTLE) this.start(bed!, CHANGE); return; }
    // Loop: the same bed again, from the start, as this one nears its end.
    const left = (live.el.duration || bed!.seconds) - live.el.currentTime;
    if (left < LOOP && now - live.since / 1000 > LOOP + 1) this.start(bed!, LOOP - 0.5);
  }

  stop() { if (this.ctx && this.master) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1); for (const d of this.decks) d.el.pause(); }
  dispose() { this.stop(); void this.ctx?.close().catch(() => undefined); this.ctx = null; this.decks = []; this.live = -1; }
}
