/**
 * Moments: when a checked quotation is said in a recording, word by word, so a page can light the words up as the
 * recording plays. Pure functions, shared by the build script (scripts/radar/moments.ts, which reads the private
 * archive) and the clip maker (scripts/social-clip.tsx, which times whisper's words).
 */

/** A word and when it starts and ends, in seconds from the start of the recording (or of the stretch that was heard). */
export type Heard = { start: number; end: number; text: string };

/** A caption cue: when it starts, and its text. Captions carry no word times, so words are spread across the cue. */
export type Caption = { start: number; text: string };

/** One quotation's moment, as published in content/base/moments.json. Times are seconds into the video, 0.1 s apart at best. */
export type Moment = {
  /** The YouTube video id. */
  v: string;
  /** Where the moment begins and ends: a little before the first word, a little after the last. */
  from: number;
  to: number;
  /** When each word of the quotation starts, one per word of the quotation split on whitespace. */
  t: number[];
};

export const norm = (w: string) => w.toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9']/g, '');

/**
 * Captions to words. A cue runs until the next one starts, and its words share that time by length, but never more
 * than half a second a word: a cue before a silence doesn't stretch its last words across the pause.
 */
export function captionWords(segments: Caption[]): Heard[] {
  const out: Heard[] = [];
  segments.forEach((s, i) => {
    const words = s.text.replace(/^>>\s*/, '').split(/\s+/).filter(Boolean);
    if (!words.length) return;
    const next = segments[i + 1]?.start ?? s.start + words.length * 0.45;
    const span = Math.max(0.2, Math.min(next - s.start, words.length * 0.55));
    const total = words.reduce((n, w) => n + w.length + 1, 0);
    let at = s.start;
    for (const text of words) {
      const d = (span * (text.length + 1)) / total;
      out.push({ text, start: at, end: at + d });
      at += d;
    }
  });
  return out;
}

/**
 * When each word of a quotation is said: matched in order to the heard words, in the stretch that matches the most
 * (the latest one on a tie, so a repeated "I" before the quotation doesn't pull its start early). A word the
 * transcript didn't catch gets a time between its neighbours. `near` limits the search to words starting within 40
 * seconds of it, for a long recording where the quotation's first words may be said again elsewhere.
 */
export function alignWords(quote: string[], heard: Heard[], near?: number): { starts: number[]; end: number; matched: number } {
  const q = quote.map(norm);
  const h = heard.map(w => norm(w.text));
  const span = Math.ceil(q.length * 1.5) + 5;
  let best = { n: -1, pairs: [] as [number, number][] };
  for (let s = 0; s < h.length; s++) {
    if (near !== undefined && Math.abs(heard[s].start - near) > 40) continue;
    if (!q.slice(0, 3).includes(h[s])) continue;
    const win = h.slice(s, s + span);
    // dp[i][j]: the words that q[i..] and win[j..] share, in order. Traced forward, each word takes the earliest
    // place it can, so a last word like "AI" isn't matched to a later "AI" in the window.
    const dp = Array.from({ length: q.length + 2 }, () => new Array<number>(win.length + 2).fill(0));
    for (let i = q.length - 1; i >= 0; i--)
      for (let j = win.length - 1; j >= 0; j--) dp[i][j] = q[i] === win[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const n = dp[0][0];
    if (n < best.n) continue;
    const pairs: [number, number][] = [];
    for (let i = 0, j = 0; i < q.length && j < win.length; ) {
      if (q[i] === win[j] && dp[i][j] === dp[i + 1][j + 1] + 1) { pairs.push([i, s + j]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
      else j++;
    }
    // Words more than five seconds from their neighbour at either end are another place in the recording that
    // happens to share a word, not part of the quotation.
    while (pairs.length > 2 && heard[pairs[pairs.length - 1][1]].start - heard[pairs[pairs.length - 2][1]].end > 5) pairs.pop();
    while (pairs.length > 2 && heard[pairs[1][1]].start - heard[pairs[0][1]].end > 5) pairs.shift();
    best = { n: pairs.length, pairs };
  }
  if (best.pairs.length < 2) throw new Error('The quotation could not be found in what was heard.');
  const at = new Map(best.pairs.map(([i, j]) => [i, heard[j]]));
  const known = best.pairs.map(([i]) => i);
  const starts = quote.map((_, i) => {
    if (at.has(i)) return at.get(i)!.start;
    const before = known.filter(k => k < i).pop();
    const after = known.find(k => k > i);
    if (before === undefined) return at.get(after!)!.start - 0.3 * (after! - i);
    if (after === undefined) return at.get(before)!.end + 0.3 * (i - before - 1);
    const a = at.get(before)!.start, b = at.get(after)!.start;
    return a + ((b - a) * (i - before)) / (after - before);
  });
  const last = best.pairs[best.pairs.length - 1];
  const end = last[0] === quote.length - 1 ? heard[last[1]].end : starts[starts.length - 1] + 0.4;
  return { starts, end, matched: best.n };
}

/** Silence kept before the first word and after the last in a moment. */
export const LEAD = 0.8;
export const TAIL = 0.6;

/**
 * The moment of a quotation in a recording's captions, or undefined when the captions don't carry it. `at` is the
 * second the Base recorded for the quotation; the words must start within 40 seconds of it. A word is never said
 * before the one ahead of it, and no word starts after the moment ends.
 */
export function momentOf(videoId: string, text: string, at: number, segments: Caption[]): Moment | undefined {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  let timed: ReturnType<typeof alignWords>;
  try {
    timed = alignWords(words, captionWords(segments), at);
  } catch {
    return undefined;
  }
  if (timed.matched < Math.ceil(words.length * 0.8)) return undefined;
  const round = (n: number) => Math.round(n * 10) / 10;
  const t: number[] = [];
  for (const s of timed.starts) t.push(round(Math.max(t[t.length - 1] ?? 0, s)));
  return { v: videoId, from: round(Math.max(0, t[0] - LEAD)), to: round(Math.max(timed.end, t[t.length - 1]) + TAIL), t };
}

/** How many words of a quotation have been said by `now` seconds, with a little lead so a late caption isn't seen to lag. */
export function wordsSaid(m: Pick<Moment, 't'>, now: number, lead = 0.15): number {
  let n = 0;
  while (n < m.t.length && m.t[n] - lead <= now) n++;
  return n;
}
