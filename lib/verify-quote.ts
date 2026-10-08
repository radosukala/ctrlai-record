/**
 * verifyQuote: the gate between "a model proposed this" and "we may publish this".
 *
 * Pure function, no network, no model. A quote passes only if its words appear in the source text contiguously and in
 * order (segments joined by "…" must each appear in order, close together). Case, punctuation, quote marks and dashes
 * are ignored for the match; "mode" says whether the characters also matched after normalizing.
 *
 * What passing proves: the page we fetched contains these words, in one speaker's turn, without a negation quietly
 * dropped. What it does not prove: that the person said them, meant them, or that the omitted context leaves the meaning
 * intact. Source tiers and the human review (ledger-schema.ts) carry that. Everything the code could not settle comes back
 * in `warnings`, `leadIn` and `leadOut`, so the reviewer sees the words around the quote without opening the source.
 *
 * Hardened Oct 7 2026 after the Oct 6 stress test (research-2026-10-06/pilot/stress_tests.txt). The first version
 * passed a quote that dropped "not" through an ellipsis, a quote cut off after "I don't think", and a quote spliced
 * across the host's question and the guest's answer. It now refuses all three, and tolerates the two things that made
 * 10 of 16 honest first-pass quotes fail on YouTube captions: "uh"/"um" and a word said twice in a row.
 *
 * Used by scripts/verify-incident.ts to check every quote on a reconstruction page against the saved source text.
 */

export const MAX_GAP_WORDS = 40; // what a "…" may leave out between two segments
export const MIN_SEGMENT_WORDS = 3;
export const MAX_QUOTE_WORDS = 80; // above this we warn; the ledger's own rule is stricter (60)
export const CONTEXT_WORDS = 12; // words of the same sentence returned before and after the quote
const LOOKBACK_WORDS = 8; // how far back from the start of a quote we look for a negation

const WORD = /[A-Za-z0-9À-ɏ]+(?:['’‘′][A-Za-zÀ-ɏ]+)*/g;
const ELLIPSIS = /\s*(?:\[\s*(?:\.\.\.|…)\s*\]|\.\.\.|…)\s*/;
const BRACKET = /\[(?!\s*(?:\.\.\.|…)\s*\])/;
const SOUND_TAG = /\[[^\]\n]{1,40}\]/g; // captions describe sounds in brackets: [Music], [clears throat]
const TURN = />>/g; // YouTube auto-captions mark a change of speaker with ">>"
const SENTENCE_END = /[.!?]+["'”’)\]}]*\s|>>/g;
// A negation before "but" or "because" belongs to the earlier clause, so the look-back for a cut-off "not" stops there.
const CLAUSE_BREAK = /[,;:—–…]|\.\.\.|\s-\s|\b(?:but|however|although|though|because|since|whereas|while|yet)\b/i;
const OPENING_MARK = /[“"‘']\s*$/;
const CLOSING_MARK = /^\s*[”"’']/;

/** Sounds that are not words, and the only wording we let a quote tidy without marking it. */
const FILLERS = new Set(['uh', 'um', 'uhm', 'umm', 'er', 'erm', 'ah', 'hmm', 'mm', 'mhm']);
const NEGATIONS = new Set(['not', 'no', 'never', 'none', 'nobody', 'nothing', 'nowhere', 'neither', 'nor', 'without', 'cannot', 'hardly', 'barely']);
const isNegation = (t: string) => NEGATIONS.has(t) || t.endsWith("n't");
const HEDGES = new Set(['if', 'unless', 'whether', 'might', 'maybe', 'perhaps', 'possibly', 'probably', 'unlikely', 'but', 'however', 'although', 'though', 'except']);
const CONTRAST = new Set([...HEDGES, 'only', 'yet']);
/** A quote that begins right after one of these is the tail of a longer claim ("… because we will have created …"). */
const OPENERS = new Set(['because', 'if', 'unless', 'when', 'whenever', 'although', 'though', 'since', 'that', 'whether', 'but', 'and', 'so', 'while', 'whereas', 'as', 'then', 'which']);
const SENTENCE_BOUNDARY = /[.!?]+["'”’)\]}]*(?:\s|$)/;
const LEADING_BOUNDARY = /^[.!?]+["'”’)\]}]*\s*/;
/** A "…" may shorten a sentence. It may not skip whole sentences, because that joins things said in different places. */
const SHORT_SKIP_WORDS = 6;

export type Verification =
  | {
      ok: true;
      mode: 'exact' | 'words';
      segments: number;
      /** About 100 characters either side of the quote. */
      context: string;
      /** Which speaker turn the quote sits in (count of ">>" before it); lets a reviewer check whose turn it is. */
      turn: number;
      timestamp?: number;
      /** The same sentence before / after the quote, when the quote starts or stops mid-sentence. Always show these to the reviewer. */
      leadIn?: string;
      leadOut?: string;
      /** What each "…" left out of the source, so the reviewer can read it. */
      omitted?: string[];
      /** Things the code could not settle. A reviewer must read each one. */
      warnings: string[];
    }
  | { ok: false; reason: string; coverage?: number; closest?: string };

/** Offsets of each transcript segment in the joined text, for "jump to the moment" links. */
export type Offsets = { pos: number; start: number }[];

export const nfkc = (s: string) => s.normalize('NFKC').replace(/­/g, '');

type Word = { tok: string; start: number; end: number };
type Dropped = { tok: string; start: number; why: 'filler' | 'repeat' };

export function tokenize(text: string): Word[] {
  const out: Word[] = [];
  for (const m of text.matchAll(WORD)) {
    out.push({ tok: m[0].toLowerCase().replace(/[’‘′]/g, "'"), start: m.index!, end: m.index! + m[0].length });
  }
  return out;
}

/**
 * The allowed, unmarked clean-up of speech: "uh" and "um", and a word said twice in a row ("the the"). Applied to the
 * source and to the quote alike. Everything else, "you know" included, has to be marked with "…".
 */
export function tidy(words: Word[]): { kept: Word[]; dropped: Dropped[] } {
  const kept: Word[] = [];
  const dropped: Dropped[] = [];
  for (const w of words) {
    if (FILLERS.has(w.tok)) {
      dropped.push({ tok: w.tok, start: w.start, why: 'filler' });
      continue;
    }
    const prev = kept[kept.length - 1];
    if (prev && prev.tok === w.tok && /^[a-zà-ɏ']+$/.test(w.tok)) {
      dropped.push({ tok: w.tok, start: w.start, why: 'repeat' });
      continue;
    }
    kept.push(w);
  }
  return { kept, dropped };
}

const strictNorm = (s: string) =>
  nfkc(s)
    .replace(/[‘’‛`′]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Longest common subsequence length, for telling a near miss from a miss. Inputs are short (a quote and a window). */
function lcs(a: string[], b: string[]): number {
  const prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let diag = 0;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = a[i - 1] === b[j - 1] ? diag + 1 : Math.max(prev[j], prev[j - 1]);
      diag = up;
    }
  }
  return prev[b.length];
}

function nearest(qTokens: string[], words: Word[], text: string): { coverage: number; closest?: string } {
  if (!qTokens.length || !words.length) return { coverage: 0 };
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w.tok, (freq.get(w.tok) ?? 0) + 1);
  const anchor = qTokens.reduce((best, t) => ((freq.get(t) ?? 1e9) < (freq.get(best) ?? 1e9) ? t : best), qTokens[0]);
  const n = qTokens.length;
  let best = 0;
  let bestAt = -1;
  let seen = 0;
  for (let j = 0; j < words.length && seen < 300; j++) {
    if (words[j].tok !== anchor) continue;
    seen++;
    const lo = Math.max(0, j - n - 6);
    const window = words.slice(lo, j + n + 6).map((w) => w.tok);
    const c = lcs(qTokens, window) / n;
    if (c > best) {
      best = c;
      bestAt = lo;
    }
  }
  if (bestAt < 0 || best < 0.5) return { coverage: Math.round(best * 1000) / 1000 };
  const from = words[bestAt].start;
  const to = words[Math.min(words.length - 1, bestAt + n + 12)].end;
  return { coverage: Math.round(best * 1000) / 1000, closest: text.slice(from, to).replace(/\s+/g, ' ').slice(0, 420) };
}

type Span = { from: number; to: number }; // word indexes, inclusive

/** First start position in [lo, hi] where all of q's words appear in a row, or -1. Positions in the index are ascending. */
function findFrom(q: string[], toks: string[], index: Map<string, number[]>, lo: number, hi = Infinity): number {
  const list = index.get(q[0]);
  if (!list) return -1;
  let a = 0;
  let b = list.length;
  while (a < b) {
    const mid = (a + b) >> 1;
    if (list[mid] < lo) a = mid + 1;
    else b = mid;
  }
  for (let i = a; i < list.length && list[i] <= hi; i++) {
    const p = list[i];
    if (p + q.length > toks.length) break;
    let same = true;
    for (let k = 1; same && k < q.length; k++) if (toks[p + k] !== q[k]) same = false;
    if (same) return p;
  }
  return -1;
}

type Judged<T> = ({ ok: true } & T) | { ok: false; rank: number; reason: string };

/**
 * Tries every place the first segment occurs, builds the chain of later segments close behind it, and asks `judge` whether
 * that chain is acceptable. A phrase that appears twice therefore cannot hide the right match. When nothing passes, the
 * most serious reason wins (rank: 2 too far apart, 3 other speaker, 4 meaning at risk).
 */
function findQuote<T>(
  segs: string[][],
  toks: string[],
  index: Map<string, number[]>,
  judge: (spans: Span[]) => Judged<T>,
): ({ ok: true; spans: Span[] } & T) | { ok: false; reason?: string } {
  let best: { rank: number; reason: string } | null = null;
  const note = (rank: number, reason: string) => {
    if (!best || rank > best.rank) best = { rank, reason };
  };
  for (let p = findFrom(segs[0], toks, index, 0); p >= 0; p = findFrom(segs[0], toks, index, p + 1)) {
    const spans: Span[] = [{ from: p, to: p + segs[0].length - 1 }];
    let complete = true;
    for (let s = 1; s < segs.length; s++) {
      const after = spans[s - 1].to + 1;
      const q = findFrom(segs[s], toks, index, after, after + MAX_GAP_WORDS);
      if (q < 0) {
        if (findFrom(segs[s], toks, index, after) >= 0) note(2, `segments are more than ${MAX_GAP_WORDS} words apart in the source`);
        complete = false;
        break;
      }
      spans.push({ from: q, to: q + segs[s].length - 1 });
    }
    if (!complete) continue;
    const verdict = judge(spans);
    if (verdict.ok) return { ...verdict, spans };
    note(verdict.rank, verdict.reason);
  }
  const b = best as { rank: number; reason: string } | null;
  return b ? { ok: false, reason: b.reason } : { ok: false };
}

function sentenceBefore(text: string, pos: number): string {
  const before = text.slice(0, pos);
  let cut = 0;
  for (const m of before.matchAll(SENTENCE_END)) cut = m.index! + m[0].length;
  return before.slice(cut);
}

function sentenceAfter(text: string, pos: number): string {
  const after = text.slice(pos);
  const end = after.search(/[.!?]+["'”’)\]}]*(?:\s|$)|>>/);
  return end < 0 ? after : after.slice(0, end);
}

const lastWords = (s: string, n: number) => (s.trim().match(/\S+/g) ?? []).slice(-n).join(' ');
const firstWords = (s: string, n: number) => (s.trim().match(/\S+/g) ?? []).slice(0, n).join(' ');

export type VerifyOptions = {
  /**
   * The source is an article whose own text contains [brackets] (handles such as PHASEONE[big], redactions, an author's
   * insertions). Then brackets are kept in the source and allowed in the quote, and every word inside them must still be
   * found in the source in order. Leave it off for captions, where [Music] and [clears throat] describe sounds.
   */
  sourceBrackets?: boolean;
  /**
   * A reviewer has read the words before the quote and confirms a negation there does not govern it (it belongs to an
   * earlier message the source is describing). The check still runs and its finding is kept as a warning.
   */
  waiveLeadIn?: boolean;
};

export function verifyQuote(quoteIn: string, sourceText: string, offsets?: Offsets, opts: VerifyOptions = {}): Verification {
  const quote = nfkc(quoteIn);
  const text = nfkc(sourceText);
  if (!opts.sourceBrackets && BRACKET.test(quote)) return { ok: false, reason: 'editorial [brackets] are not allowed in a verbatim quote' };
  const segTexts = quote.split(ELLIPSIS).map((s) => s.trim()).filter(Boolean);
  if (!segTexts.length) return { ok: false, reason: 'empty quote' };
  const segs = segTexts.map((s) => tidy(tokenize(s)).kept.map((w) => w.tok));
  if (segs.some((q) => q.length < MIN_SEGMENT_WORDS)) return { ok: false, reason: `a quoted segment has fewer than ${MIN_SEGMENT_WORDS} words` };

  // Sound tags are blanked, not removed, so every character offset (and so every timestamp) stays where it was.
  const blanked = opts.sourceBrackets ? text : text.replace(SOUND_TAG, (m) => ' '.repeat(m.length));
  const { kept: words, dropped } = tidy(tokenize(blanked));
  const toks = words.map((w) => w.tok);
  const index = new Map<string, number[]>();
  toks.forEach((t, i) => {
    const list = index.get(t);
    if (list) list.push(i);
    else index.set(t, [i]);
  });

  const marks = [...text.matchAll(TURN)].map((m) => m.index!);
  const turn: number[] = [];
  for (let w = 0, t = 0; w < words.length; w++) {
    while (t < marks.length && marks[t] < words[w].start) t++;
    turn.push(t);
  }

  const judge = (spans: Span[]): Judged<{ warnings: string[]; leadIn?: string; leadOut?: string; omitted: string[] }> => {
    const first = spans[0].from;
    const last = spans[spans.length - 1].to;
    if (turn[first] !== turn[last]) return { ok: false, rank: 3, reason: 'the quote runs across a change of speaker (">>"), so it would put one person’s words in another’s mouth' };

    const warnings: string[] = [];
    const omitted: string[] = [];
    for (let i = 1; i < spans.length; i++) {
      const gap = toks.slice(spans[i - 1].to + 1, spans[i].from);
      const gapText = blanked.slice(words[spans[i - 1].to].end, words[spans[i].from].start).replace(/\s+/g, ' ').trim();
      omitted.push(gapText.slice(0, 160));
      const neg = gap.find(isNegation);
      if (neg) return { ok: false, rank: 4, reason: `the "…" leaves out “${neg}”, which can reverse what was said` };
      if (gap.length > SHORT_SKIP_WORDS && SENTENCE_BOUNDARY.test(gapText.replace(LEADING_BOUNDARY, ''))) {
        return { ok: false, rank: 3, reason: `the "…" skips whole sentences (${gap.length} words), which joins things said in different places` };
      }
      const hedge = gap.find((t) => HEDGES.has(t));
      if (hedge) warnings.push(`the "…" leaves out “${hedge}”`);
    }
    // Auto-captions do not mark every change of speaker. A question followed by more words inside one quote is the usual sign of a miss.
    if (spans.some((s) => /\?["'”’)\]]*\s+\S/.test(blanked.slice(words[s.from].start, words[s.to].end)))) {
      warnings.push('contains a question followed by more words: check that the same person asks and answers');
    }

    const firstChar = words[first].start;
    const lastChar = words[last].end;
    const before = sentenceBefore(blanked, firstChar);
    let leadIn: string | undefined;
    const leadTokens = tidy(tokenize(before)).kept.map((w) => w.tok);
    if (!OPENING_MARK.test(before) && leadTokens.length) {
      const near = tidy(tokenize(before.split(CLAUSE_BREAK).pop() ?? '')).kept.map((w) => w.tok).slice(-LOOKBACK_WORDS);
      const neg = near.find(isNegation);
      if (neg && !opts.waiveLeadIn) return { ok: false, rank: 4, reason: `the quote starts after “${neg}” in the same sentence; begin earlier so the negation is inside the quote` };
      if (neg) warnings.push(`lead-in contains “${neg}”; a reviewer waived it`);
      const opener = leadTokens[leadTokens.length - 1];
      if (OPENERS.has(opener)) warnings.push(`starts inside a longer claim, right after “${opener}”`);
      const hedge = near.find((t) => HEDGES.has(t));
      if (hedge && hedge !== opener) warnings.push(`starts after “${hedge}” in the same sentence`);
      leadIn = lastWords(before, CONTEXT_WORDS);
    }
    const after = sentenceAfter(blanked, lastChar);
    let leadOut: string | undefined;
    if (!CLOSING_MARK.test(after) && tokenize(after).length) {
      const next = tidy(tokenize(after)).kept[0]?.tok;
      if (next && (CONTRAST.has(next) || isNegation(next))) warnings.push(`stops before “${next}”, in the same sentence`);
      leadOut = firstWords(after, CONTEXT_WORDS);
    }

    const tidied = spans.flatMap((s) => dropped.filter((d) => d.start >= words[s.from].start && d.start <= words[s.to].end));
    if (tidied.length) warnings.push(`spoken clean-up: ${[...new Set(tidied.map((d) => (d.why === 'repeat' ? `${d.tok} (said twice)` : d.tok)))].join(', ')}`);
    const n = segs.reduce((sum, q) => sum + q.length, 0);
    if (n > MAX_QUOTE_WORDS) warnings.push(`quote is ${n} words; keep quotes short`);
    return { ok: true, warnings, leadIn, leadOut, omitted };
  };

  const found = findQuote(segs, toks, index, judge);
  if (!found.ok) {
    const near = nearest(segs.flat(), words, text);
    return { ok: false, reason: found.reason ?? 'words not found in the source text', ...near };
  }

  const firstChar = words[found.spans[0].from].start;
  const lastChar = words[found.spans[found.spans.length - 1].to].end;
  const strictText = strictNorm(text);
  let pos = 0;
  let exact = true;
  for (const seg of segTexts) {
    const norm = strictNorm(seg);
    const i = strictText.indexOf(norm, pos);
    if (i < 0) {
      exact = false;
      break;
    }
    pos = i + norm.length;
  }
  const out: Verification = {
    ok: true,
    mode: exact ? 'exact' : 'words',
    segments: segs.length,
    context: text.slice(Math.max(0, firstChar - 100), lastChar + 100).replace(/\s+/g, ' '),
    turn: turn[found.spans[0].from],
    warnings: found.warnings,
  };
  if (found.leadIn) out.leadIn = found.leadIn;
  if (found.leadOut) out.leadOut = found.leadOut;
  if (found.omitted.length) out.omitted = found.omitted;
  if (offsets?.length) {
    let k = 0;
    for (let i = 0; i < offsets.length; i++) if (offsets[i].pos <= firstChar) k = i;
    out.timestamp = offsets[k].start;
  }
  return out;
}

/** Joins transcript segments into one text and records where each starts, so a quote can be mapped to a time. */
export function joinTranscript(segments: { start: number; text: string }[]): { text: string; offsets: Offsets } {
  const parts: string[] = [];
  const offsets: Offsets = [];
  let pos = 0;
  for (const seg of segments) {
    const t = nfkc(seg.text.replace(/\n/g, ' ')).trim();
    offsets.push({ pos, start: seg.start });
    parts.push(t);
    pos += t.length + 1;
  }
  return { text: parts.join(' '), offsets };
}
