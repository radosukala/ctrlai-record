/**
 * The second opinion: is a quotation, already found word for word in one transcript of some audio, also in a second,
 * independent transcript of the same audio?
 *
 * Two speech-to-text tools never agree exactly: one keeps "like" and "right?", the other tidies them away; one hears a
 * name right, the other doesn't. So the test is not "the same characters" but "the same words, in order, almost all of
 * them", and it is strict exactly where a mishearing would change the meaning: a negation or a number the two
 * transcripts disagree on fails the quotation outright. Every disagreement is returned, so a person can look.
 */
const WORD = /[a-z0-9]+(?:'[a-z]+)?/g;
const words = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").match(WORD) ?? [];
const NEGATION = /^(not|no|never|none|nobody|nothing|neither|nor|cannot|can't|won't|don't|doesn't|didn't|isn't|aren't|wasn't|weren't|shouldn't|wouldn't|couldn't|without)$/;
const NUMBER = /^(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|million|billion|trillion|percent)$/;

export const AGREEMENT = 0.85;

export type SecondOpinion = { ok: boolean; agreement: number; missing: string[]; reason?: string };

/** Longest common subsequence of the quotation's words inside the best-matching stretch of the second transcript. */
export function secondOpinion(quote: string, secondText: string): SecondOpinion {
  const q = words(quote);
  const s = words(secondText);
  if (!q.length) return { ok: false, agreement: 0, missing: [], reason: 'empty quotation' };
  // Anchor on the rarest run of three quotation words that the second transcript contains, then look around it.
  const at = new Map<string, number[]>();
  s.forEach((w, i) => { const k = `${w} ${s[i + 1]} ${s[i + 2]}`; (at.get(k) ?? at.set(k, []).get(k)!).push(i); });
  const starts = new Set<number>();
  for (let i = 0; i + 2 < q.length; i++) for (const j of at.get(`${q[i]} ${q[i + 1]} ${q[i + 2]}`) ?? []) starts.add(Math.max(0, j - i - 5));
  let best: { lcs: number; missing: string[] } = { lcs: 0, missing: q };
  for (const start of starts) {
    const win = s.slice(start, start + q.length * 2 + 10);
    // LCS by dynamic programming: quotations are short, windows small.
    const dp = Array.from({ length: q.length + 1 }, () => new Array<number>(win.length + 1).fill(0));
    for (let i = 1; i <= q.length; i++) for (let j = 1; j <= win.length; j++)
      dp[i][j] = q[i - 1] === win[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    if (dp[q.length][win.length] <= best.lcs) continue;
    const missing: string[] = [];
    for (let i = q.length, j = win.length; i > 0;) {
      if (j > 0 && q[i - 1] === win[j - 1]) { i--; j--; }
      else if (j > 0 && dp[i][j - 1] >= dp[i - 1][j]) j--;
      else { missing.unshift(q[i - 1]); i--; }
    }
    best = { lcs: dp[q.length][win.length], missing };
  }
  const agreement = best.lcs / q.length;
  const critical = best.missing.filter(w => NEGATION.test(w) || NUMBER.test(w));
  if (critical.length) return { ok: false, agreement, missing: best.missing, reason: `the second transcript disagrees on ${critical.map(w => `"${w}"`).join(', ')}` };
  if (agreement < AGREEMENT) return { ok: false, agreement, missing: best.missing, reason: `only ${Math.round(agreement * 100)}% of the words are in the second transcript` };
  return { ok: true, agreement, missing: best.missing };
}
