/**
 * The narrator of "The day before": our own captions, the questions and one closing line, read aloud by one steady English voice
 * (the same ElevenLabs voice as the first film's narrator). The narrator says only what the line says: the same words, said the way
 * a voice says them. A time after noon is said on the twelve-hour clock, "AI" is said "A I", "Ctrl" is said "Control". Every such
 * change is a rule here, and tests/day-before.test.ts checks that no word is lost or added by anything else.
 *
 * What the narrator never reads: a paper card (real words stay on the page, in the viewer's own voice), the stamps, the labels.
 * Nothing true is said by the narrator, so the two layers stay apart in sound as well as on screen.
 *
 * Pure and browser-safe: the film imports it, and so does scripts/day-before-voices.ts, which sends `spoken` to ElevenLabs.
 */

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const below100 = (n: number) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ''));

/**
 * A time of day as a British voice says it: "nine forty", "nine fifty-two", "ten past ten", "twenty-five past ten", "half past eight",
 * "seven o’clock". After noon it is the twelve-hour clock. A round number of minutes up to the half hour is "past"; the rest is said as
 * the clock shows it.
 */
export function clockWords(h24: number, m: number): string {
  const h = h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24;
  if (m === 0) return `${ONES[h]} o’clock`;
  if (m === 30) return `half past ${ONES[h]}`;
  if (m === 15) return `quarter past ${ONES[h]}`;
  if (m < 30 && m % 5 === 0) return `${below100(m)} past ${ONES[h]}`;
  return `${ONES[h]} ${m < 10 ? `oh ${ONES[m]}` : below100(m)}`;
}

/** How the narrator says what is not an English word as printed. Case counts. */
export const SAY: Record<string, string> = { AI: 'A I', Ctrl: 'Control' };

/** The words the narrator may add or spell out, and nothing else. */
export const ADDED_WORDS = new Set([
  ...ONES, ...TENS.filter(Boolean), 'oh', 'o', 'clock', 'a', 'i', 'control', 'past', 'quarter', 'half',
  ...ONES.concat(TENS.filter(Boolean)).flatMap(w => w.split('-')),
]);

/** The text the narrator is given for a line. */
export function spokenText(text: string): string {
  let s = text.normalize('NFKC').replace(/[‘’]/g, '\'').replace(/[“”]/g, '"').replace(/<[^>]+>/g, '');
  s = s.replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h: string, m: string) => clockWords(+h, +m));
  s = s.replace(/[A-Za-z]+/g, w => SAY[w] ?? w);
  return s.replace(/\s+/g, ' ').trim();
}

/** A short, stable name for a line's words (FNV-1a), so the same words always name the same recording and a repeated line is made once. */
export function lineId(spoken: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < spoken.length; i++) { h ^= spoken.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `n-${h.toString(16).padStart(8, '0')}`;
}

/** One thing the narrator says, and when the film means it to be said. */
export type NarrationLine = {
  id: string;
  /** What is on screen where it is said (a caption, a question), or what the narrator adds when nothing is. */
  shown: string;
  spoken: string;
  /** Which kind of line: a caption under the picture, a question, or a closing line with no caption. */
  kind: 'caption' | 'question' | 'close';
};

/** What has been recorded: by line id. Written by scripts/day-before-voices.ts. */
export type VoiceManifest = {
  version: 1;
  provider: 'elevenlabs' | null;
  model?: string;
  generated?: string;
  lines: Record<string, { file: string; seconds: number; text: string; voice: string; voiceId?: string; paid?: boolean }>;
};
