/**
 * Checks every quotation on the accord tracker against the saved text of its source, with the same checker the standards
 * page describes (lib/verify-quote.ts). Run from the repo root:  npx tsx scripts/verify-accord.ts
 *
 * The saved texts are other people's writing and are NOT in the repository. They live in docs-internal/accord-2026-10/sources/.
 * What IS committed is content/accord/verification.json: for every piece of evidence, whether its quotation passed, how, the
 * warnings the checker raised, and hashes of the quotation and of the source text, so the tests can tell whether anything was
 * edited after it was checked.
 *
 * It also checks what the quotation checker cannot: that a piece of evidence flagged as mentioning the accord really does (the
 * saved text names it), that one which does not is not silently about it, and that every date puts the item on the right side
 * of the accord's publication date.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { verifyQuote } from '../lib/verify-quote';
import { allEvidence } from '../content/accord/all';
import { SINCE } from '../content/accord/facts';
import { isProvablyBefore, isProvablyOnOrAfter } from '../content/accord/dates';

// The saved source texts are git-excluded. In a linked worktree they are in the main checkout, so look there too, or set ACCORD_DOCS.
const DIR = [process.env.ACCORD_DOCS, 'docs-internal/accord-2026-10', '../ctrlai-com/docs-internal/accord-2026-10'].find(d => d && existsSync(d)) ?? 'docs-internal/accord-2026-10';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const norm = (s: string) => s.normalize('NFKC').replace(/\s+/g, ' ').trim();
// The accord is named exactly by its title ("strict"), or described in other words ("loose": a voluntary agreement or pledge signed with
// the White House, an accord, "self-police"). A source that only matches loosely needs a person to decide; one that matches neither
// cannot be flagged as mentioning the accord.
const STRICT = /accord on super ?intelligence|joint commitment on frontier responsibilities|white house accord/i;
const LOOSE = /\baccords?\b|joint commitment|frontier responsibilities|voluntary (agreement|pact|pledge|commitment)s?|self-?police|white house[^.]{0,80}(commitment|pledge|agreement)|(commitment|pledge|agreement)s?[^.]{0,80}white house/i;

type Result = { ok: boolean; mode?: string; warnings?: string[]; reason?: string; quoteSha: string; textSha?: string; textNamesAccord?: boolean; textMentionsLoosely?: boolean };
const results: Record<string, Result> = {};
const sources: Record<string, { sha256: string; words: number }> = {};
let failed = 0;
let problems = 0;
const problem = (msg: string) => { problems++; console.log('  PROBLEM ' + msg); };

for (const { where, e, side } of allEvidence()) {
  const quoteSha = sha(e.quote);
  const file = `${DIR}/${e.textFile}`;
  if (!e.textFile || !existsSync(file)) {
    results[e.id] = { ok: false, reason: `saved text not found: ${e.textFile}`, quoteSha };
    failed++; console.log(`  FAIL ${e.id.padEnd(40)} saved text not found: ${e.textFile}`);
    continue;
  }
  const text = readFileSync(file, 'utf8');
  sources[e.textFile] ??= { sha256: sha(norm(text)), words: text.split(/\s+/).length };
  const v = verifyQuote(e.quote, text, undefined, { sourceBrackets: true });
  const textNamesAccord = STRICT.test(text);
  const textMentionsLoosely = textNamesAccord || LOOSE.test(text);
  results[e.id] = v.ok
    ? { ok: true, mode: v.mode, warnings: v.warnings, quoteSha, textSha: sources[e.textFile].sha256, textNamesAccord, textMentionsLoosely }
    : { ok: false, reason: v.reason, quoteSha };
  if (!v.ok) { failed++; console.log(`  FAIL ${e.id.padEnd(40)} ${(v.reason ?? '').slice(0, 120)}`); }
  else if (v.warnings.length) console.log(`  warn ${e.id}: ${v.warnings.join(' | ').slice(0, 160)}`);

  if (e.mentionsAccord && !textMentionsLoosely) problem(`${e.id} (${where}) is flagged as mentioning the accord, but its saved text never names or describes it`);
  if (!e.mentionsAccord && textNamesAccord) problem(`${e.id} (${where}) is not flagged as mentioning the accord, but its saved text names it: set mentionsAccord to true`);
  if (!e.mentionsAccord && !textNamesAccord && textMentionsLoosely) console.log(`  check ${e.id} (${where}): the text describes an accord, agreement or pledge in other words; is it this one? mentionsAccord is false`);
  if (side === 'since') {
    if (!e.published) problem(`${e.id} (${where}) is a "since" item with no date`);
    else if (!isProvablyOnOrAfter(e.published, SINCE)) problem(`${e.id} (${where}) is dated ${e.published}, which is not provably on or after ${SINCE}`);
  }
  if (side === 'before') {
    const day = e.published ?? e.notAfter;
    if (!day) problem(`${e.id} (${where}) is a "before" item with neither a date nor a notAfter date`);
    else if (!isProvablyBefore(day, SINCE)) problem(`${e.id} (${where}) is dated ${day}, which is not provably before ${SINCE}`);
    if (!e.published && !e.dateNote) problem(`${e.id} (${where}) has no date, so it needs a dateNote saying how we know it predates the accord`);
  }
}

writeFileSync('content/accord/verification.json', JSON.stringify({ checkedOn: new Date().toISOString().slice(0, 10), sources, results }, null, 1) + '\n');
const total = Object.keys(results).length;
console.log(`\n${total} pieces of evidence: ${total - failed} quotations verified, ${failed} not. ${problems} other problems.`);
process.exit(failed || problems ? 1 : 0);
