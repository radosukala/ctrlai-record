import { currentNarration } from '@/content/incidents/openai-hf/narration';
import { toFilm } from '@/content/incidents/openai-hf/timing';
import { currentClips, type VoiceManifest } from '@/content/incidents/openai-hf/voices';
import MANIFEST from '@/content/incidents/openai-hf/voices.manifest.json';

/**
 * The voices, played in step with the film. The film is a pure function of time, so the sound is too: each frame is told the time, whether
 * the film is playing and which voices are wanted, and makes the right clip play from the right second (starting it, moving it if it has
 * drifted, stopping it on pause, on a jump, or when the clip ends). Two voices speak in the film, the narrator (our captions) and the
 * agents, and they never speak at once. Times here are film time, the clock the sound runs on (see timing.ts).
 *
 * Web Audio, not <audio> elements: one context is unlocked by the first click or key press (Safari and phones need that for every
 * element otherwise), clips are decoded ahead of time, and a start is exact.
 */

export type Channel = 'agent' | 'narrator';
export type Clip = { id: string; channel: Channel; start: number; seconds: number; src: string };

const manifest = MANIFEST as unknown as VoiceManifest;
/** The recorded lines that still match the script, as clips (in film time) with where to fetch them. Empty when none have been made. */
export const CLIPS: Clip[] = [
  ...currentClips(manifest).map(c => ({ id: c.id, channel: 'agent' as const, start: toFilm(c.start), seconds: c.seconds, src: `/film/voices/${c.file}` })),
  ...currentNarration(manifest).map(c => ({ id: c.id, channel: 'narrator' as const, start: toFilm(c.start), seconds: c.seconds, src: `/film/voices/${c.file}` })),
].sort((a, b) => a.start - b.start);
export const AGENTS_ON_OFFER = CLIPS.some(c => c.channel === 'agent');
export const NARRATOR_ON_OFFER = CLIPS.some(c => c.channel === 'narrator');
export const VOICES_ON_OFFER = CLIPS.length > 0;
/** The audio is a placeholder (macOS voices) for checking timing, not the film's voices. */
export const AGENTS_ARE_DRAFT = manifest.draft;
export const NARRATOR_IS_DRAFT = !!manifest.narration?.draft;
export const VOICES_ARE_DRAFT = (AGENTS_ON_OFFER && AGENTS_ARE_DRAFT) || (NARRATOR_ON_OFFER && NARRATOR_IS_DRAFT);

/** Which voices the viewer wants. */
export type Want = { narrator: boolean; agents: boolean };

/** While the title card is up, fetch the first lines, so the first caption's narration is ready the moment Play is pressed. */
export function warm(n = 4) {
  for (const c of CLIPS.slice(0, n)) fetch(c.src, { cache: 'force-cache' }).catch(() => undefined);
}

type Playing = { clip: Clip; node: AudioBufferSourceNode; gain: GainNode; at: number; from: number };

export class FilmVoices {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Set<string>();
  private failed = new Set<string>();
  private now: Playing | null = null;

  constructor(private clips: Clip[]) {}

  /** Call from a click or a key press: browsers only let sound start after one. Safe to call again. */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
      }
      if (this.ctx.state !== 'running') void this.ctx.resume();
    } catch { /* no sound is not a broken film */ }
  }

  get running() { return this.ctx?.state === 'running'; }
  /** The agent line being heard now. */
  get speaking(): string | null { return this.now?.clip.channel === 'agent' ? this.now.clip.id : null; }
  /** The caption being narrated now. */
  get narrating(): string | null { return this.now?.clip.channel === 'narrator' ? this.now.clip.id : null; }
  /** Whether any voice is heard now (the music makes way for it). */
  get heard(): boolean { return this.now !== null; }

  private load(c: Clip) {
    const ctx = this.ctx;
    if (!ctx || this.buffers.has(c.id) || this.loading.has(c.id) || this.failed.has(c.id)) return;
    this.loading.add(c.id);
    fetch(c.src, { cache: 'force-cache' })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); })
      .then(b => ctx.decodeAudioData(b))
      .then(buf => { this.buffers.set(c.id, buf); })
      .catch(() => { this.failed.add(c.id); })
      .finally(() => { this.loading.delete(c.id); });
  }

  private halt() {
    const n = this.now, ctx = this.ctx;
    this.now = null;
    if (!n || !ctx) return;
    try {
      n.node.onended = null;
      const t = ctx.currentTime;
      n.gain.gain.cancelScheduledValues(t);
      n.gain.gain.setTargetAtTime(0, t, 0.02);
      n.node.stop(t + 0.12);
    } catch { /* already stopped */ }
  }

  private begin(c: Clip, buf: AudioBuffer, offset: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const node = ctx.createBufferSource();
    node.buffer = buf;
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 0.025);
    node.connect(gain).connect(ctx.destination);
    const from = Math.max(0, Math.min(offset, buf.duration - 0.02));
    node.onended = () => { if (this.now?.node === node) this.now = null; };
    node.start(0, from);
    this.now = { clip: c, node, gain, at: t, from };
  }

  /** Once a frame: the film's time, whether it is playing, which voices are wanted. */
  update(t: number, playing: boolean, want: Want) {
    const ctx = this.ctx;
    if (!ctx) return;
    // Fetch what is coming (and what a jump has landed in the middle of) before it is needed.
    for (const c of this.clips) if (c.start + c.seconds >= t - 0.1 && c.start < t + 30) this.load(c);
    const wanted = (c: Clip) => (c.channel === 'agent' ? want.agents : want.narrator);
    const active = playing && ctx.state === 'running' ? this.clips.find(c => wanted(c) && t >= c.start && t < c.start + c.seconds) : undefined;
    if (this.now && this.now.clip !== active) this.halt();
    if (!active) return;
    const buf = this.buffers.get(active.id);
    if (!buf) return;
    const at = t - active.start;
    if (this.now) {
      const have = this.now.from + (ctx.currentTime - this.now.at);
      if (Math.abs(have - at) > 0.3) { this.halt(); this.begin(active, buf, at); }
    } else if (at < buf.duration - 0.05) this.begin(active, buf, at);
  }

  stop() { this.halt(); }
  dispose() { this.halt(); void this.ctx?.close().catch(() => undefined); this.ctx = null; }
}
