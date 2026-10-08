import { createHash } from 'node:crypto';

/**
 * What the film's voice pipeline needs that is not specific to the film: talking to ElevenLabs' text-to-speech API, choosing voices
 * from an account's library, reading an MP3's length. Pure functions and an injectable `fetch`, so tests can check the requests that
 * would be sent without sending any. The command that uses it is scripts/film-voices.ts.
 *
 * API reference (checked Oct 2026): POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128, header
 * `xi-api-key`, JSON body { text, model_id, voice_settings, seed }; GET /v2/voices?category=premade&page_size=100; GET /v1/models.
 */

export const ELEVEN_API = 'https://api.elevenlabs.io';
/** Where the API is. Only the real service, or a stand-in on this machine for testing (the key is never sent anywhere else). */
export function apiBase(env: Record<string, string | undefined> = process.env): string {
  const b = env.ELEVENLABS_API_BASE?.trim().replace(/\/$/, '');
  return b && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(b) ? b : ELEVEN_API;
}
export const DEFAULT_MODEL = 'eleven_multilingual_v2';
export const OUTPUT_FORMAT = 'mp3_44100_128';

export type VoiceInfo = {
  voice_id: string;
  name: string;
  category?: string;
  description?: string | null;
  labels?: Record<string, string> | null;
  preview_url?: string | null;
};

export type VoiceSettings = { stability: number; similarity_boost: number; style?: number; use_speaker_boost?: boolean; speed?: number };

export type ModelFamily = 'v2' | 'flash' | 'v3' | 'v4';
/** Which generation a model belongs to: they differ in the voice settings they accept. */
export function modelFamily(model: string): ModelFamily {
  if (model.startsWith('eleven_v4')) return 'v4';
  if (model.startsWith('eleven_v3')) return 'v3';
  if (model.startsWith('eleven_flash') || model.startsWith('eleven_turbo')) return 'flash';
  return 'v2';
}

/**
 * How a line is delivered. Reasoning is an inner voice, so it is allowed to vary (lower stability, some style); a board message is a
 * typed string, so it is steadier and flatter. Only the settings a model accepts are sent: v3 takes stability in three steps, v4 has
 * no style or speed controls.
 */
export function settingsFor(model: string, kind: 'reasoning' | 'message' | 'narration', speed = 1): VoiceSettings {
  const reasoning = kind === 'reasoning';
  // The narrator is steady and plain: a documentary voice, the same from the first caption to the last.
  if (kind === 'narration') {
    switch (modelFamily(model)) {
      case 'v2': return { stability: 0.55, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed };
      case 'flash': return { stability: 0.55, similarity_boost: 0.75, speed };
      default: return { stability: 0.5, similarity_boost: 0.75 };
    }
  }
  switch (modelFamily(model)) {
    case 'v2': return { stability: reasoning ? 0.4 : 0.6, similarity_boost: 0.8, style: reasoning ? 0.2 : 0, use_speaker_boost: true, speed };
    case 'flash': return { stability: reasoning ? 0.4 : 0.6, similarity_boost: 0.8, speed };
    case 'v3': return { stability: 0.5, similarity_boost: 0.8 };
    case 'v4': return { stability: 0.5, similarity_boost: 0.8 };
  }
}
/** Models that let the speed be changed, which is how a line that is a little too long for its card is fitted. */
export const canChangeSpeed = (model: string) => ['v2', 'flash'].includes(modelFamily(model));

/** A short, stable fingerprint: the same inputs always name the same audio file. */
export const fingerprint = (parts: unknown): string => createHash('sha1').update(JSON.stringify(parts)).digest('hex');
/** A seed from a fingerprint, so a line sounds the same when it is made again (best effort on ElevenLabs' side). */
export const seedFrom = (fp: string) => parseInt(fp.slice(0, 8), 16) % 4294967295;

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** The request that makes one line of speech. */
export function speechRequest(o: { voiceId: string; text: string; model: string; settings: VoiceSettings; seed: number; format?: string; previousText?: string; nextText?: string }) {
  return {
    url: `${apiBase()}/v1/text-to-speech/${encodeURIComponent(o.voiceId)}?output_format=${o.format ?? OUTPUT_FORMAT}`,
    // `previous_text` and `next_text` are what is said just before and after, so a voice carries its tone from one line to the next.
    body: { text: o.text, model_id: o.model, voice_settings: o.settings, seed: o.seed, ...(o.previousText ? { previous_text: o.previousText } : {}), ...(o.nextText ? { next_text: o.nextText } : {}) },
  };
}

export class ElevenError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

/** What went wrong, in words, from an ElevenLabs error response. Never includes the key. */
async function describe(res: Response): Promise<string> {
  const raw = await res.text().catch(() => '');
  try {
    const j = JSON.parse(raw) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object' && 'message' in d) return `${(d as { status?: string }).status ?? ''} ${(d as { message: string }).message}`.trim();
    if (Array.isArray(d)) return d.map(x => `${(x as { loc?: unknown[] }).loc?.join('.')}: ${(x as { msg?: string }).msg}`).join('; ');
  } catch { /* not JSON */ }
  return raw.slice(0, 300) || res.statusText;
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

/** POST a JSON body and get audio back. Retries when ElevenLabs says to slow down or has a hiccup; stops at once on a wrong key or a bad request. */
async function postForAudio(fetchFn: Fetch, key: string, url: string, body: unknown, opts: { retries?: number; sleep?: (ms: number) => Promise<void> } = {}): Promise<Uint8Array> {
  const sleep = opts.sleep ?? wait;
  const retries = opts.retries ?? 4;
  for (let attempt = 0; ; attempt++) {
    const res = await fetchFn(url, { method: 'POST', headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' }, body: JSON.stringify(body) });
    if (res.ok) return new Uint8Array(await res.arrayBuffer());
    const why = await describe(res);
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= retries) throw new ElevenError(res.status, `ElevenLabs ${res.status}: ${why}`);
    await sleep(1000 * 2 ** attempt);
  }
}

/** Make one line of speech: the MP3's bytes. */
export async function synthesize(
  fetchFn: Fetch,
  key: string,
  o: { voiceId: string; text: string; model: string; settings: VoiceSettings; seed: number; previousText?: string; nextText?: string },
  opts: { retries?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<Uint8Array> {
  const { url, body } = speechRequest(o);
  return postForAudio(fetchFn, key, url, body, opts);
}

export const MUSIC_MODEL = 'music_v2_5';
/** The request that composes a piece of instrumental music from a prompt (3 seconds to 10 minutes; Eleven Music, paid plans). */
export function musicRequest(o: { prompt: string; seconds: number; model?: string; format?: string }) {
  return {
    url: `${apiBase()}/v1/music?output_format=${o.format ?? OUTPUT_FORMAT}`,
    body: { prompt: o.prompt, music_length_ms: Math.round(o.seconds * 1000), model_id: o.model ?? MUSIC_MODEL, force_instrumental: true },
  };
}
/** Compose a piece of music: the MP3's bytes. */
export async function composeMusic(fetchFn: Fetch, key: string, o: { prompt: string; seconds: number; model?: string }, opts: { retries?: number; sleep?: (ms: number) => Promise<void> } = {}): Promise<Uint8Array> {
  const { url, body } = musicRequest(o);
  return postForAudio(fetchFn, key, url, body, opts);
}

/** Every voice the account can use (premade ones by default), following the pages. */
export async function listVoices(fetchFn: Fetch, key: string, o: { category?: string } = {}): Promise<VoiceInfo[]> {
  const out: VoiceInfo[] = [];
  let token: string | undefined;
  for (let page = 0; page < 20; page++) {
    const q = new URLSearchParams({ page_size: '100', sort: 'name', sort_direction: 'asc' });
    if (o.category) q.set('category', o.category);
    if (token) q.set('next_page_token', token);
    const res = await fetchFn(`${apiBase()}/v2/voices?${q}`, { headers: { 'xi-api-key': key } });
    if (!res.ok) throw new ElevenError(res.status, `ElevenLabs ${res.status}: ${await describe(res)}`);
    const j = (await res.json()) as { voices: VoiceInfo[]; has_more?: boolean; next_page_token?: string | null };
    out.push(...j.voices);
    if (!j.has_more || !j.next_page_token) break;
    token = j.next_page_token;
  }
  return out;
}

export type ModelInfo = { model_id: string; name?: string; can_do_text_to_speech?: boolean; maximum_text_length_per_request?: number };
export async function listModels(fetchFn: Fetch, key: string): Promise<ModelInfo[]> {
  const res = await fetchFn(`${apiBase()}/v1/models`, { headers: { 'xi-api-key': key } });
  if (!res.ok) throw new ElevenError(res.status, `ElevenLabs ${res.status}: ${await describe(res)}`);
  return (await res.json()) as ModelInfo[];
}

/** What the account has used and may use this period (not an error if it cannot be read). */
export async function usage(fetchFn: Fetch, key: string): Promise<{ used: number; limit: number; tier?: string } | null> {
  try {
    const res = await fetchFn(`${apiBase()}/v1/user/subscription`, { headers: { 'xi-api-key': key } });
    if (!res.ok) return null;
    const j = (await res.json()) as { character_count?: number; character_limit?: number; tier?: string };
    return typeof j.character_count === 'number' && typeof j.character_limit === 'number' ? { used: j.character_count, limit: j.character_limit, tier: j.tier } : null;
  } catch { return null; }
}

// ——— Choosing voices —————————————————————————————————————————————————————————————————————————————————————————————————————————

export type Want = { gender: 'male' | 'female'; age: 'young' | 'middle_aged' | 'old'; accent?: string; tones?: string[] };

const label = (v: VoiceInfo, ...keys: string[]) => keys.map(k => String(v.labels?.[k] ?? '')).join(' ').toLowerCase();
const AGES = ['young', 'middle_aged', 'old'];
/** Voices that would break the film's tone: children, cartoons, whispers, villains, characters. */
const NOT_CAPABLE = /child|cartoon|anime|whisper|asmr|seduct|villain|witch|pirate|sailor|robot|monster|goblin|grandm|grandp|cute|sassy|quirk|playful|trickster|warrior|cowboy|southern|husky|raspy|shout|yell|dominant/i;

/** How well a voice fits a brief: its labels against what was asked for. Higher is better; a wrong gender is never chosen over a right one. */
export function fit(v: VoiceInfo, want: Want): number {
  const text = `${label(v, 'descriptive', 'description', 'descriptions', 'use_case', 'usecase')} ${v.description ?? ''} ${v.name}`.toLowerCase();
  let score = 0;
  score += label(v, 'gender') === want.gender ? 10 : -10;
  const age = label(v, 'age');
  score += age === want.age ? 4 : Math.abs(AGES.indexOf(age) - AGES.indexOf(want.age)) === 1 ? 1 : -2;
  if (want.accent) score += label(v, 'accent').includes(want.accent) ? 3 : 0;
  for (const t of want.tones ?? []) if (text.includes(t)) score += 1;
  if (/narrat|conversation|character/.test(label(v, 'use_case', 'usecase'))) score += 0.5;
  if (NOT_CAPABLE.test(text)) score -= 8;
  return score;
}

/**
 * One voice for each slot, none used twice: the named slots choose first (they matter most), then the pool, each taking the best
 * remaining fit. Ties go to the alphabetically first name, so the same account always gives the same cast.
 */
export function autoCast<S extends string>(voices: VoiceInfo[], slots: { slot: S; want: Want }[]): Record<S, VoiceInfo> {
  const free = [...voices].sort((a, b) => a.name.localeCompare(b.name));
  const out = {} as Record<S, VoiceInfo>;
  for (const s of slots) {
    let best = -1, bestScore = -Infinity;
    free.forEach((v, i) => { const sc = fit(v, s.want); if (sc > bestScore) { best = i; bestScore = sc; } });
    if (best < 0) throw new Error(`not enough voices to cast ${s.slot}: the account has ${voices.length}`);
    out[s.slot] = free.splice(best, 1)[0];
  }
  return out;
}

/** A voice by what was pinned: its id, or its name (any case). */
export function findVoice(voices: VoiceInfo[], pin: string): VoiceInfo | undefined {
  const p = pin.trim().toLowerCase();
  return voices.find(v => v.voice_id === pin.trim()) ?? voices.find(v => v.name.toLowerCase() === p) ?? voices.find(v => v.name.toLowerCase().startsWith(`${p} `) || v.name.toLowerCase().startsWith(`${p} -`));
}

// ——— MP3 ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const BITRATE_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const BITRATE_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const RATES: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

/** How long an MP3 plays, in seconds, by walking its frames (so constant and variable bit rates are both right). */
export function mp3Seconds(buf: Uint8Array): number {
  let i = 0;
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) i = 10 + (((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f));
  let samples = 0, rate = 44100;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) { i++; continue; }
    const version = (buf[i + 1] >> 3) & 3, layer = (buf[i + 1] >> 1) & 3;
    const bi = buf[i + 2] >> 4, si = (buf[i + 2] >> 2) & 3, pad = (buf[i + 2] >> 1) & 1;
    if (version === 1 || layer !== 1 || bi === 0 || bi === 15 || si === 3) { i++; continue; }
    const v1 = version === 3;
    const bitrate = (v1 ? BITRATE_V1 : BITRATE_V2)[bi] * 1000;
    const sr = RATES[version][si];
    const size = Math.floor(((v1 ? 144 : 72) * bitrate) / sr) + pad;
    if (size < 4) { i++; continue; }
    // The first frame of many files is a Xing/Info header that carries no sound.
    const mono = (buf[i + 3] >> 6) === 3;
    const tagAt = i + 4 + (v1 ? (mono ? 17 : 32) : (mono ? 9 : 17)) + ((buf[i + 1] & 1) === 0 ? 2 : 0);
    const tag = String.fromCharCode(buf[tagAt] ?? 0, buf[tagAt + 1] ?? 0, buf[tagAt + 2] ?? 0, buf[tagAt + 3] ?? 0);
    if (tag !== 'Xing' && tag !== 'Info') { samples += v1 ? 1152 : 576; rate = sr; }
    i += size;
  }
  return samples / rate;
}
