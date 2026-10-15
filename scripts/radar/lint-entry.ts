/**
 * The checks an entry must pass beyond its quotations, so the reading agent can fix them at once instead of the finish
 * step stopping hours later: our own words use no gendered pronouns, stay within their length limits, and a
 * description-only entry has no quotations.
 *
 *   npx tsx scripts/radar/lint-entry.ts RUN_DIR/entries/abc123.json [more files…]
 *
 * Prints one line per problem and exits non-zero if there is any. (compose.ts remains the full check.)
 */
import { readFileSync } from 'node:fs';

const PRONOUN = /\b(he|she|him|his|her|hers|herself|himself)\b/i;
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

type Entry = {
  id?: string; slug?: string; summary?: string; notes?: string; access?: string; importance?: number; published?: string;
  change?: { note?: string }; lenses?: Record<string, string>;
  quotes?: { text?: string; context?: string }[];
};

export function lint(e: Entry): string[] {
  const out: string[] = [];
  const ours: [string, string | undefined, number?][] = [
    ['summary', e.summary, 60], ['change.note', e.change?.note, 25], ['notes', e.notes],
    ...Object.entries(e.lenses ?? {}).map(([k, v]) => [`lenses.${k}`, v, 30] as [string, string, number]),
    ...(e.quotes ?? []).map((q, i) => [`quotes[${i}].context`, q.context, 30] as [string, string | undefined, number]),
  ];
  for (const [where, text, max] of ours) {
    if (!text) continue;
    const m = text.match(PRONOUN);
    if (m) out.push(`${where}: gendered pronoun "${m[0]}" in "${text.slice(Math.max(0, m.index! - 30), m.index! + 30).replace(/\s+/g, ' ')}": repeat the name or restructure`);
    if (max && words(text) > max) out.push(`${where}: ${words(text)} words; at most ${max}`);
  }
  if (e.access === 'excerpt' && (e.quotes ?? []).length) out.push('access is "excerpt" (only the description was read) but the entry has quotations: remove them');
  if (e.access === 'excerpt' && (e.importance ?? 1) > 2) out.push('a description-only entry cannot be importance 3');
  if (!e.slug || !/^[a-z0-9][a-z0-9-]*$/.test(e.slug)) out.push(`slug "${e.slug}" must be lowercase letters, digits and hyphens`);
  if (!e.published || !/^\d{4}-\d{2}(-\d{2})?$/.test(e.published)) out.push(`published "${e.published}" must be YYYY-MM-DD (YYYY-MM only if the source gives just a month)`);
  for (const [i, q] of (e.quotes ?? []).entries()) {
    const n = words(q.text ?? '');
    if (n < 8 || n > 60) out.push(`quotes[${i}]: ${n} words; a quotation is 8–60 words`);
  }
  return out;
}

if (process.argv[1]?.endsWith('lint-entry.ts')) {
  let bad = 0;
  for (const file of process.argv.slice(2)) {
    let e: Entry;
    try { e = JSON.parse(readFileSync(file, 'utf8')) as Entry; } catch (err) { console.log(`${file}: not valid JSON (${(err as Error).message})`); bad++; continue; }
    const problems = lint(e);
    for (const p of problems) console.log(`${file.split('/').pop()}: ${p}`);
    bad += problems.length;
  }
  console.log(bad ? `${bad} problem(s)` : 'clean');
  process.exit(bad ? 1 : 0);
}
