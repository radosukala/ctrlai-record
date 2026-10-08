/**
 * Checks every quotation on the OpenAI–Hugging Face reconstruction against the saved source text, with the same
 * checker the standards page describes (lib/verify-quote.ts). Run from the repo root:  npx tsx scripts/verify-incident.ts
 *
 * The source texts are copyrighted and are NOT in the repository. They live in docs-internal/research-2026-10-07-incident/verify/.
 * What IS committed is content/incidents/openai-hf/verification.json: for every quote, whether it passed, how (exact
 * characters or the same words), the warnings the checker raised, and a hash of the quote text and of the source text, so
 * tests can tell whether a quote was edited after it was checked.
 *
 * OpenAI's blog cannot be fetched by code (it refuses non-browser requests), so its quotes are checked inside the page, in a
 * browser, against the page's own text. That run is saved as verify/oai-blog-inpage.json and merged here.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { verifyQuote } from '../lib/verify-quote';
import { QUOTES } from '../content/incidents/openai-hf/quotes';
import { EVENTS } from '../content/incidents/openai-hf/events';
import { AGENTS, LINKS } from '../content/incidents/openai-hf/agents';
import { SOURCES } from '../content/incidents/openai-hf/sources';
import { tokenize } from '../lib/verify-quote';
import { ourPhrases } from './incident-copy';

const DIR = 'docs-internal/research-2026-10-07-incident/verify';
const FILES: Record<string, string> = { metr: 'metr.txt', 'oai-tr': 'oai-tr.txt', hf: 'hf.txt', 'oai-astra': 'oai-astra.txt', fortune: 'fortune.txt' };
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const norm = (s: string) => s.normalize('NFKC').replace(/\s+/g, ' ').trim();

const texts: Record<string, string> = {};
const sources: Record<string, { sha256: string; chars: number; how: string }> = {};
for (const [id, file] of Object.entries(FILES)) {
  const text = readFileSync(`${DIR}/${file}`, 'utf8');
  texts[id] = text;
  sources[id] = { sha256: sha(norm(text)), chars: norm(text).length, how: 'file' };
}
const blogPath = `${DIR}/oai-blog-inpage.json`;
const blog: { sha256: string; chars: number; results: Record<string, { ok: boolean; mode?: string }>; phrases?: Record<string, boolean> } | null = existsSync(blogPath) ? JSON.parse(readFileSync(blogPath, 'utf8')) : null;
if (blog) sources['oai-blog'] = { sha256: blog.sha256, chars: blog.chars, how: 'in the page, in a browser' };

type Result = { ok: boolean; mode?: string; warnings?: string[]; reason?: string; waived?: string; quoteSha: string };
const results: Record<string, Result> = {};
let failed = 0;
for (const q of QUOTES) {
  const quoteSha = sha(q.text);
  if (q.src.s === 'oai-blog') {
    const r = blog?.results[q.id];
    results[q.id] = r ? { ok: r.ok, mode: r.mode, quoteSha } : { ok: false, reason: 'not yet checked in the page', quoteSha };
  } else {
    const v = verifyQuote(q.text, texts[q.src.s], undefined, { sourceBrackets: true, waiveLeadIn: Boolean(q.waive?.leadIn) });
    results[q.id] = v.ok ? { ok: true, mode: v.mode, warnings: v.warnings, ...(q.waive ? { waived: q.waive.leadIn } : {}), quoteSha } : { ok: false, reason: v.reason, quoteSha };
  }
  if (!results[q.id].ok) {
    failed++;
    console.log(`  FAIL ${q.id.padEnd(26)} ${(results[q.id].reason ?? '').slice(0, 110)}`);
  }
}
// Every phrase in curly quotes inside OUR OWN words must be found, word for word, in a source. (Scare-quote words such as
// "poisoned" count too: if we put it in quotes, a source used it.) Our words are the page, its components and the data
// files, plus the one-line readings under the quotations; scripts/incident-copy.ts says which files, and the test uses the
// same list to be sure nothing was missed.
const phrases = ourPhrases(QUOTES.map(q => q.gloss ?? ''));
const words = (x: string) => tokenize(x.normalize('NFKC')).map(w => w.tok);
const hay = Object.fromEntries(Object.entries(texts).map(([id, t]) => [id, ' ' + words(t).join(' ') + ' ']));
const inline: Record<string, string[]> = {};
let inlineMissing = 0;
for (const ph of phrases) {
  const needle = ' ' + words(ph).join(' ') + ' ';
  const where = Object.keys(hay).filter(id => hay[id].includes(needle));
  if (!where.length && blog?.phrases?.[ph]) where.push('oai-blog');
  inline[ph] = where;
  if (!where.length) { inlineMissing++; console.log(`  PHRASE not in any source: “${ph}”`); }
}

// Times of day. A clock time on the page must be one a source states: a minute-precise time must appear in a cited source
// (or, for a quotation, in the quotation or any source), not be worked out from something else, such as a tag inside an agent's
// own message name. "About HH:00" times may be sums the sources imply ("three hours after 23:00"), so they are listed for a
// person to read, not failed.
const flat: Record<string, string> = Object.fromEntries(Object.entries(texts).map(([id, t]) => [id, t.replace(/\s+/g, ' ')]));
const clock = (iso: string) => { const d = new Date(iso); return { h: d.getUTCHours(), m: d.getUTCMinutes() }; };
const stated = (txt: string, h: number, m: number) => {
  if (new RegExp(`(?<![\\d:])0?${h}:${String(m).padStart(2, '0')}(?![\\d])`).test(txt)) return true;
  // "around 2am" states the hour for an "about" time.
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 && new RegExp(`(?<![\\d:])${h12}\\s?${h < 12 ? 'a' : 'p'}\\.?m\\b`, 'i').test(txt);
};
let timeErrors = 0;
const timeFail = (msg: string) => { timeErrors++; console.log('  TIME ' + msg); };
for (const e of EVENTS) {
  if (e.precision !== 'minute' && e.precision !== 'hour') continue;
  const { h, m } = clock(e.t);
  const srcs = [...new Set(e.cites.map(c => c.s))].filter(s => flat[s]);
  if (!srcs.length) continue; // the blog gives dates only; its events rest on the other reports' times
  if (srcs.some(s => stated(flat[s], h, e.precision === 'hour' ? 0 : m))) continue;
  if (e.precision === 'minute') timeFail(`${e.id} says ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} UTC, which no cited source states`);
  else console.log(`  note ${e.id}: "about ${String(h).padStart(2, '0')}:00" is not stated in a cited source; check that it follows from what is`);
}
for (const q of QUOTES) {
  if (!q.at?.includes('T')) continue;
  const { h, m } = clock(q.at);
  if (Object.values(flat).some(t => stated(t, h, m)) || stated(q.text, h, m)) continue;
  timeFail(`${q.id} says ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} UTC, which no source states`);
}
for (const a of AGENTS) {
  if (!a.first || (a.first.precision !== 'minute' && a.first.precision !== 'hour')) continue;
  const { h, m } = clock(a.first.t);
  const srcs = [...new Set(a.cites.map(c => c.s))].filter(s => flat[s]);
  if (!srcs.length || srcs.some(s => stated(flat[s], h, a.first!.precision === 'hour' ? 0 : m))) continue;
  if (a.first.precision === 'minute') timeFail(`agent ${a.id} first documented at ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} UTC, which no cited source states`);
  else console.log(`  note agent ${a.id}: "about ${String(h).padStart(2, '0')}:00" is not stated in a cited source; check that it follows from what is`);
}

// Cross-references: every id used must exist.
const agentIds = new Set(AGENTS.map(a => a.id));
const quoteIds = new Set(QUOTES.map(q => q.id));
let refErrors = 0;
const bad = (msg: string) => { refErrors++; console.log('  REF ' + msg); };
for (const e of EVENTS) {
  if (!e.cites.length) bad(`${e.id} has no citation`);
  for (const c of e.cites) if (!SOURCES[c.s]) bad(`${e.id} cites unknown source ${c.s}`);
  for (const id of e.quotes ?? []) if (!quoteIds.has(id)) bad(`${e.id} uses unknown quote ${id}`);
  for (const id of e.agents ?? []) if (!agentIds.has(id)) bad(`${e.id} names unknown agent ${id}`);
}
for (const a of AGENTS) {
  if (!a.cites.length) bad(`agent ${a.id} has no citation`);
  for (const id of a.quotes ?? []) if (!quoteIds.has(id)) bad(`agent ${a.id} uses unknown quote ${id}`);
}
for (const l of LINKS) {
  if (!agentIds.has(l.from) || !agentIds.has(l.to)) bad(`link ${l.from} → ${l.to} names an unknown agent`);
  if (!l.cites.length) bad(`link ${l.from} → ${l.to} has no citation`);
}

const modes: Record<string, number> = {};
for (const r of Object.values(results)) if (r.ok) modes[r.mode ?? '?'] = (modes[r.mode ?? '?'] ?? 0) + 1;
writeFileSync('content/incidents/openai-hf/verification.json', JSON.stringify({ checkedOn: new Date().toISOString().slice(0, 10), sources, results, inlinePhrases: inline }, null, 1) + '\n');
console.log(`\n${QUOTES.length} quotes: ${QUOTES.length - failed} verified (${JSON.stringify(modes)}), ${failed} not.`);
console.log(`${phrases.size} quoted phrases in our own words: ${phrases.size - inlineMissing} found in a source, ${inlineMissing} not. ${refErrors} broken references.`);
console.log(`${timeErrors} clock times that no source states.`);
process.exit(failed || inlineMissing || refErrors || timeErrors ? 1 : 0);
