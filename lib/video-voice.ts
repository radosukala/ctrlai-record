import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_MODEL, OUTPUT_FORMAT, apiBase, fingerprint, seedFrom, settingsFor } from '@/lib/film-voices';

/**
 * The daily video's narration: the film's narrator (Daniel, a licensed ElevenLabs voice, on the paid plan the film's
 * audio was made on), reading only our own lines. Server and scripts only. Each line is made once: the audio and the time
 * of every word are kept by a fingerprint of the voice, the settings and the words, so drawing the video again, or
 * changing its layout, costs nothing. A line is billed by the character, so a run says how many it will send before it
 * sends any, and stops if that is more than it was told to allow.
 */
export const NARRATOR = { name: 'Daniel', voiceId: 'onwK4e9ZLuTAKqWW03F9' };
export const CREDITS_PER_CHAR = 0.505;

/** How some words are said. Spoken word for word in the place of the written one, so the words still line up with the screen. */
const SAY: [RegExp, string][] = [
  [/^METR(?![A-Za-z])/, 'Meter'],
  [/^arXiv(?![A-Za-z])/i, 'archive'],
  [/^US(?![A-Za-z])/, 'U.S.'],
  [/^UN(?![A-Za-z])/, 'U.N.'],
];
export const spoken = (word: string) => {
  for (const [pattern, said] of SAY) if (pattern.test(word)) return word.replace(pattern, said);
  return word;
};

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
/** A number in words, up to 999, so the voice never has to guess how to read a figure. */
export function spell(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ''}`;
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${spell(n % 100)}` : ''}`;
  return String(n);
}

export type Speech = {
  /** The MP3 on disk. */
  file: string;
  /** How long it speaks. */
  seconds: number;
  /** When each word (the line split on spaces) starts and ends, in seconds from the start of the audio. */
  words: { start: number; end: number }[];
  /** What making it cost: the characters, the credits the service said it charged (when it says), the model, and when. */
  chars?: number;
  credits?: number;
  model?: string;
  at?: string;
};

type Alignment = { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };

function envKey(name: string): string | undefined {
  if (process.env[name]) return process.env[name]!.trim();
  for (const f of ['.env.local', '../ctrlai-com/.env.local']) {
    const m = existsSync(f) ? readFileSync(f, 'utf8').match(new RegExp(`^${name}=["']?([^"'\\n]+)`, 'm')) : null;
    if (m) return m[1].trim();
  }
}

/** When each word of `text` starts and ends, from the character times the service returns. Found by walking the aligned
 *  text, so a character the service drops or adds doesn't shift the words after it. */
export function wordTimes(text: string, a: Alignment): { start: number; end: number }[] {
  const aligned = a.characters.join('');
  const out: { start: number; end: number }[] = [];
  let at = 0;
  for (const token of text.split(' ')) {
    let i = aligned.indexOf(token, at);
    if (i < 0) i = at;
    const last = Math.min(i + token.length, aligned.length) - 1;
    out.push({ start: a.character_start_times_seconds[Math.min(i, aligned.length - 1)], end: a.character_end_times_seconds[Math.max(last, 0)] });
    at = i + token.length;
  }
  return out;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class Narrator {
  /** Characters sent to the service in this run, and how many were already made. */
  sent = 0;
  kept = 0;
  private readonly model: string;
  private readonly settings;
  /** A run that waits on the service longer than this gives up (the daily run must not hang on a voice). */
  private readonly until = Date.now() + 4 * 60_000;

  constructor(private readonly dir: string, private readonly allow: number, opts: { model?: string } = {}) {
    mkdirSync(dir, { recursive: true });
    this.model = opts.model ?? DEFAULT_MODEL;
    this.settings = settingsFor(this.model, 'narration');
  }

  /** The key a line is kept under: the voice, the model, the settings and the words, so a change to any of them makes a new line. */
  fingerprintOf(text: string) {
    return fingerprint({ voice: NARRATOR.voiceId, model: this.model, settings: this.settings, text }).slice(0, 14);
  }

  private fingerprint(text: string) {
    return this.fingerprintOf(text);
  }

  /** Credits spent on narration in a month (YYYY-MM), from what each kept line recorded: the service's own figure when it gave one, else characters at the rate seen on this account. */
  spent(month: string): number {
    let total = 0;
    for (const name of readdirSync(this.dir)) {
      if (!name.endsWith('.json')) continue;
      const file = join(this.dir, name);
      const meta = JSON.parse(readFileSync(file, 'utf8')) as Speech;
      if ((meta.at ?? statSync(file).mtime.toISOString()).startsWith(month)) total += meta.credits ?? (meta.chars ?? 0) * CREDITS_PER_CHAR;
    }
    return Math.round(total);
  }

  isMade(text: string) {
    const fp = this.fingerprint(text);
    return existsSync(join(this.dir, `${fp}.mp3`)) && existsSync(join(this.dir, `${fp}.json`));
  }

  /** The characters that would be sent for these lines: only the ones not made yet. */
  cost(lines: string[]) {
    return [...new Set(lines)].filter(t => !this.isMade(t)).reduce((n, t) => n + t.length, 0);
  }

  async say(text: string): Promise<Speech> {
    const fp = this.fingerprint(text);
    const file = join(this.dir, `${fp}.mp3`);
    const meta = join(this.dir, `${fp}.json`);
    if (existsSync(file) && existsSync(meta)) {
      this.kept += text.length;
      return JSON.parse(readFileSync(meta, 'utf8')) as Speech;
    }
    if (this.sent + text.length > this.allow) throw new Error(`Stopped before sending: ${this.sent + text.length} characters would pass the ${this.allow} allowed for this run.`);
    const key = envKey('ELEVENLABS_API_KEY');
    if (!key) throw new Error('There is no ELEVENLABS_API_KEY in the environment or .env.local.');
    const url = `${apiBase()}/v1/text-to-speech/${encodeURIComponent(NARRATOR.voiceId)}/with-timestamps?output_format=${OUTPUT_FORMAT}`;
    const body = JSON.stringify({ text, model_id: this.model, voice_settings: this.settings, seed: seedFrom(fp) });
    for (let attempt = 0; ; attempt++) {
      const left = this.until - Date.now();
      if (left < 5000) throw new Error('ran out of the four minutes allowed for the voice');
      const res = await fetch(url, { method: 'POST', headers: { 'xi-api-key': key, 'content-type': 'application/json' }, body, signal: AbortSignal.timeout(Math.min(60_000, left)) });
      if (res.ok) {
        const json = (await res.json()) as { audio_base64: string; alignment: Alignment };
        writeFileSync(file, Buffer.from(json.audio_base64, 'base64'));
        const words = wordTimes(text, json.alignment);
        const billed = Number(res.headers.get('character-cost'));
        const speech: Speech = {
          file, seconds: Math.max(...json.alignment.character_end_times_seconds), words,
          chars: text.length, ...(Number.isFinite(billed) && billed > 0 ? { credits: billed } : {}), model: this.model, at: new Date().toISOString(),
        };
        writeFileSync(meta, JSON.stringify(speech));
        this.sent += text.length;
        return speech;
      }
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= 1) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
      await wait(1500 * 2 ** attempt);
    }
  }
}
