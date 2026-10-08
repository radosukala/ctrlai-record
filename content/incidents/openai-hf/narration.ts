import { CAPTIONS, CAPTION_EDGE, captionId, type Caption } from './film';
import { PRONOUNCE, wordsOf, type ManifestLine, type VoiceManifest } from './voices';

/**
 * The narrator: our own captions, read aloud by one steady English voice, so that it cannot be mistaken for an agent (the agents are
 * never British). The narrator says only what the caption says: the same words, said the way a voice says them. A date is "July the
 * eighth", a number is in words, "METR" is said "meter", a handle is spelled for the ear. Every such change is a rule in this file,
 * and `tests/narration.test.ts` checks that no word of a caption is lost or added by anything else, and shows every spoken line.
 *
 * What the narrator does not read: an organisation's own words on a paper card (they stay on the page to be read), numbers and dates
 * stamped on the picture, the title cards. An agent's words are read by the agents' own voices.
 */

// ——— Numbers, dates, times, in words (British) ——————————————————————————————————————————————————————————————————————————————

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const below100 = (n: number) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ''));

/** A whole number in words, the British way: "eight hundred and ninety-eight", "one thousand two hundred". */
export function numberWords(n: number): string {
  if (n < 100) return below100(n);
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${below100(n % 100)}` : ''}`;
  if (n < 10000) {
    const r = n % 1000;
    return `${ONES[Math.floor(n / 1000)]} thousand${r ? (r < 100 ? ` and ${below100(r)}` : ` ${numberWords(r)}`) : ''}`;
  }
  throw new Error(`narration: no words for ${n}`);
}

const ORD_ONES = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth'];
/** A day of the month as an ordinal: 4 → "fourth", 21 → "twenty-first". */
export function ordinalWords(n: number): string {
  if (n < 20) return ORD_ONES[n];
  if (n % 10 === 0) return `${TENS[n / 10].replace(/y$/, 'ie')}th`;
  return `${TENS[Math.floor(n / 10)]}-${ORD_ONES[n % 10]}`;
}

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
const clock = (h: number, m: number) => (m === 0 ? `${numberWords(h)} o’clock` : m === 30 ? `half past ${numberWords(h)}` : `${numberWords(h)} ${m < 10 ? `oh ${numberWords(m)}` : numberWords(m)}`);

/** How the narrator says what is not an English word as printed. Case counts. Everything else is read as it is written. */
export const SAY: Record<string, string> = {
  ...PRONOUNCE,
  '38148c': 'three eight one four eight C',
  c03220: 'C zero three two two zero',
  MARB051: 'Marb zero five one',
  METR: 'Meter',
  GPT: 'G P T',
  ExploitGym: 'Exploit Gym',
  UTC: 'U T C',
  AI: 'A I',
};

/** The digits after a decimal point, said one by one: "6" is "six", "25" is "two five". */
const digitWords = (d: string) => [...d].map(x => ONES[+x]).join(' ');

/** Is this printed word shouted (two or more capitals, no lower case)? */
const isCaps = (w: string) => /^[A-Z][A-Z0-9]+$/.test(w) && /[A-Z]{2}/.test(w);

/**
 * The text the narrator is given for a caption. In the order a reader would apply them: curly quotes straight, `X[big]` is "X Big",
 * brackets and parentheses become the pauses they stand for, a handle or an initialism is said as `SAY` has it, "Month D" is "Month the
 * Dth" (and "July 8 to 13" is "July the eighth to the thirteenth"), a year, a time, a percentage and every other number are in words,
 * and a shouted word is said normally.
 */
export function narrationText(text: string): string {
  let s = text.normalize('NFKC').replace(/[‘’]/g, '\'').replace(/[“”]/g, '"');
  s = s.replace(/([A-Za-z0-9])\[big\]/g, '$1 Big').replace(/\s*\(([^)]*)\)/g, (_, inner: string) => `, ${inner},`).replace(/[\[\]]/g, '');
  // Dates, before plain numbers: "July 8 to 13", "April 20".
  s = s.replace(new RegExp(`\\b(${MONTHS})\\s+(\\d{1,2})(?:\\s+to\\s+(\\d{1,2}))?\\b`, 'g'), (_, mo: string, d: string, d2?: string) => `${mo} the ${ordinalWords(+d)}${d2 ? ` to the ${ordinalWords(+d2)}` : ''}`);
  // A model's version, before plain numbers: "GPT-5.6" is "GPT five point six", "GPT-6" is "GPT six".
  s = s.replace(/\bGPT-(\d+)(?:\.(\d+))?\b/g, (_, a: string, b?: string) => `GPT ${numberWords(+a)}${b ? ` point ${digitWords(b)}` : ''}`);
  // Times, then percentages (a decimal one first), then years, then every other number.
  s = s.replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h: string, m: string) => clock(+h, +m));
  s = s.replace(/\b(\d+)\s*[–-]\s*(\d+)\s*%/g, (_, a: string, b: string) => `${numberWords(+a)} to ${numberWords(+b)} per cent`);
  s = s.replace(/\b(\d+)\.(\d+)\s*%/g, (_, a: string, b: string) => `${numberWords(+a)} point ${digitWords(b)} per cent`);
  s = s.replace(/\b(\d+)\s*%/g, (_, a: string) => `${numberWords(+a)} per cent`);
  s = s.replace(/\b(20\d\d)\b/g, (_, y: string) => `twenty ${below100(+y.slice(2))}`);
  s = s.replace(/\b\d{1,3}(?:,\d{3})+\b|\b\d+\b/g, n => numberWords(+n.replace(/,/g, '')));
  // Handles and initialisms, and the words that are shouted.
  s = s.replace(/[A-Za-z0-9]+/g, w => SAY[w] ?? (isCaps(w) ? w.toLowerCase() : w));
  s = s.replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').replace(/,\s*,/g, ',').replace(/,\s*([.!?])/g, '$1').trim();
  s = s.replace(/(^|[.!?]\s+)([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
  if (!/[.!?"]$/.test(s)) s += '.';
  return s;
}

/** Words the narrator adds or spells out, and nothing else: a caption's own words are never replaced by others. */
export const ADDED_WORDS = new Set([
  ...Object.values(SAY).flatMap(wordsOf), ...ONES, ...TENS.filter(Boolean), ...ORD_ONES.filter(Boolean),
  ...ONES.concat(TENS.filter(Boolean)).flatMap(wordsOf), 'hundred', 'thousand', 'and', 'the', 'per', 'cent', 'point', 'half', 'past', 'o', 'clock', 'oh', 'big',
  'twentieth', 'thirtieth', ...TENS.filter(Boolean).map(t => `${t.replace(/y$/, 'ie')}th`),
]);

// ——— The lines ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

export { captionId };

export type NarrationLine = {
  id: string;
  caption: Caption;
  /** What is on screen. */
  shown: string;
  /** What the narrator is given. */
  spoken: string;
  /** When the narrator starts: as the caption has faded in. */
  start: number;
  /** The most seconds the narrator can speak while the caption is fully on screen, before the film is slowed for it (see `timing.ts`). */
  room: number;
  /** The sentence before and after, as the narrator will say them, so the voice carries on from one caption to the next. */
  before?: string;
  after?: string;
};

const sentences = (s: string) => s.match(/[^.!?]+[.!?]+["']?/g)?.map(x => x.trim()) ?? [s];

export const NARRATION: NarrationLine[] = CAPTIONS.map((caption, i, all) => {
  const spoken = narrationText(caption.text);
  const start = caption.t0 + CAPTION_EDGE;
  const before = i > 0 ? sentences(narrationText(all[i - 1].text)).slice(-1)[0] : undefined;
  const after = i < all.length - 1 ? sentences(narrationText(all[i + 1].text))[0] : undefined;
  return { id: captionId(caption.text), caption, shown: caption.text, spoken, start, room: caption.t1 - CAPTION_EDGE - start, before, after };
});
export const NARRATION_BY_ID: Record<string, NarrationLine> = Object.fromEntries(NARRATION.map(l => [l.id, l]));

/** The narration that has been recorded for the captions as they are now. */
export function currentNarration(manifest: VoiceManifest): { id: string; start: number; seconds: number; file: string; line: ManifestLine }[] {
  return NARRATION.flatMap(l => {
    const m = manifest.narration?.lines[l.id];
    return m && m.text === l.spoken ? [{ id: l.id, start: l.start, seconds: m.seconds, file: m.file, line: m }] : [];
  });
}
