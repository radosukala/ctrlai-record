/**
 * Checks every real quotation in the scenario film "The day before" against where its card says it came from, with the same
 * checker the standards page describes (lib/verify-quote.ts). Run from the repo root:  npx tsx scripts/verify-day-before.ts
 *
 * A card names its check in content/scenarios/day-before/cards.ts:
 *   { base: slug }      a quotation the Base already verified: the card's words must lie inside one of that entry's quotes, and
 *                       that quote must have passed, exactly, and not been edited since;
 *   { incident: id }    the same for the first film's verified quotations;
 *   { file: path }      a saved page text, read from docs-internal/ (or from $DOCS_INTERNAL): the words are looked for there.
 * The saved texts are copyrighted and are NOT in the repository. What IS committed is
 * content/scenarios/day-before/verification.json: for every card, whether it passed, how, the warnings the checker raised, and
 * a hash of the quote and of the text it was found in, so tests can tell whether a card was edited after it was checked.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { verifyQuote } from '../lib/verify-quote';
import { CARDS, type QuoteCard } from '../content/scenarios/day-before/cards';
import entries from '../content/base/entries.json';
import baseVerification from '../content/base/verification.json';
import incidentVerification from '../content/incidents/openai-hf/verification.json';
import { QUOTES as INCIDENT_QUOTES } from '../content/incidents/openai-hf';

const DOCS = process.env.DOCS_INTERNAL ?? 'docs-internal';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const norm = (s: string) => s.normalize('NFKC').replace(/\s+/g, ' ').trim();

type Result = { ok: boolean; via: 'base' | 'incident' | 'file'; where: string; mode?: string; warnings?: string[]; reason?: string; quoteSha: string; sourceSha?: string };
const results: Record<string, Result> = {};
let failed = 0;

const baseBySlug = new Map((entries as { slug: string; quotes: { id: string; text: string }[] }[]).map(e => [e.slug, e]));
const baseV = baseVerification as unknown as Record<string, { ok: boolean; mode?: string; quoteSha: string }>;
const incV = incidentVerification.results as unknown as Record<string, { ok: boolean; mode?: string; quoteSha: string }>;

for (const card of Object.values(CARDS)) {
  if (card.placeholder) continue;
  const c: QuoteCard = card;
  const quoteSha = sha(c.quote);
  let r: Result;
  if ('base' in c.check) {
    const entry = baseBySlug.get(c.check.base);
    const q = entry?.quotes.find(x => norm(x.text).includes(norm(c.quote)));
    const v = q ? baseV[q.id] : undefined;
    r = !entry ? { ok: false, via: 'base', where: c.check.base, reason: 'no such Base entry', quoteSha }
      : !q ? { ok: false, via: 'base', where: c.check.base, reason: 'the card’s words are not inside any quotation of that entry', quoteSha }
      : !v?.ok || v.mode !== 'exact' || v.quoteSha !== sha(q.text) ? { ok: false, via: 'base', where: `${c.check.base} ${q.id}`, reason: 'the Base quotation did not verify exactly, or was edited after it did', quoteSha }
      : { ok: true, via: 'base', where: `${c.check.base} ${q.id}`, mode: 'exact', quoteSha, sourceSha: v.quoteSha };
  } else if ('incident' in c.check) {
    const q = INCIDENT_QUOTES.find(x => x.id === (c.check as { incident: string }).incident);
    const v = q ? incV[q.id] : undefined;
    r = !q ? { ok: false, via: 'incident', where: c.check.incident, reason: 'no such quotation in the first film', quoteSha }
      : !norm(q.text).includes(norm(c.quote)) ? { ok: false, via: 'incident', where: q.id, reason: 'the card’s words are not inside that quotation', quoteSha }
      : !v?.ok || v.mode !== 'exact' || v.quoteSha !== sha(q.text) ? { ok: false, via: 'incident', where: q.id, reason: 'the quotation did not verify exactly, or was edited after it did', quoteSha }
      : { ok: true, via: 'incident', where: q.id, mode: 'exact', quoteSha, sourceSha: v.quoteSha };
  } else {
    const path = `${DOCS}/${c.check.file}`;
    if (!existsSync(path)) r = { ok: false, via: 'file', where: c.check.file, reason: `saved text not found at ${path}`, quoteSha };
    else {
      const text = readFileSync(path, 'utf8');
      const v = verifyQuote(c.quote, text, undefined, { sourceBrackets: true });
      r = v.ok ? { ok: v.mode === 'exact', via: 'file', where: c.check.file, mode: v.mode, warnings: v.warnings, ...(v.mode === 'exact' ? {} : { reason: 'matched only as the same words, not exactly' }), quoteSha, sourceSha: sha(norm(text)) }
        : { ok: false, via: 'file', where: c.check.file, reason: v.reason, quoteSha };
    }
  }
  results[c.id] = r;
  if (!r.ok) { failed++; console.log(`  FAIL ${c.id.padEnd(26)} ${(r.reason ?? '').slice(0, 120)}`); }
  else if (r.warnings?.length) console.log(`  warn ${c.id.padEnd(26)} ${r.warnings.join(' | ').slice(0, 140)}`);
}

writeFileSync('content/scenarios/day-before/verification.json', JSON.stringify({ checkedOn: new Date().toISOString().slice(0, 10), results }, null, 1) + '\n');
console.log(`${Object.keys(results).length} cards, ${failed} failed. Wrote content/scenarios/day-before/verification.json`);
process.exit(failed ? 1 : 0);
