/**
 * Checks every passage on the filing pages against the saved filing and pages, word for word, and checks how the press
 * quoted the filing. Writes content/filings/verification.json, which the pages and the tests read.
 *
 *   npx tsx scripts/filings/check.ts
 *
 * The filing's text (saved by scripts/filings/fetch.py) keeps its pages, so each passage is found on the page the filing
 * prints. A passage that is not found fails the check and the run stops: nothing on a filing page is our paraphrase.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FILINGS, quoteOf, type PassageCheck, type PressCheck, type Verification } from '../../content/filings';
import { ARCHIVE_DIR } from '../radar/paths';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const flat = (s: string) => s.replace(/\s+/g, ' ').trim();

/** The filing as one line of text, and where each printed page starts in it. */
function readFiling(path: string) {
  const raw = readFileSync(join(ARCHIVE_DIR, path), 'utf8');
  const parts = raw.split(/\[\[page (\d+)\]\]/);
  let full = '';
  const starts: { at: number; printed?: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const lines = parts[i + 1].split('\n').map(l => l.trim()).filter(Boolean);
    const printed = lines[0] && /^(\d{1,3}|[ivx]+|F-\d+)$/.test(lines[0]) ? lines.shift() : undefined;
    if (lines[0] === 'Table of Contents') lines.shift();
    starts.push({ at: full.length, printed });
    full += `${flat(lines.join(' '))} `;
  }
  const pageAt = (i: number) => starts.filter(s => s.at <= i).pop()?.printed;
  return { full, pageAt };
}

/** Words for matching a quotation that may differ in case and punctuation, with where each starts in the text. */
function tokens(text: string) {
  const out: { word: string; at: number; raw: string }[] = [];
  for (const m of text.matchAll(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g)) out.push({ word: m[0].toLowerCase().replace(/’/g, "'"), at: m.index!, raw: m[0] });
  return out;
}
/** British spellings the press uses for American ones in a filing: weaponised, behaviour, organisation. */
const american = (w: string) => w.replace(/is(e|ed|es|ing|ation|ations)$/, 'iz$1').replace(/our(s?)$/, 'or$1');

function findWords(quote: string, full: ReturnType<typeof tokens>, spelling: boolean) {
  const q = tokens(quote).map(t => (spelling ? american(t.word) : t.word));
  const f = full.map(t => (spelling ? american(t.word) : t.word));
  for (let i = 0; i + q.length <= f.length; i++) {
    let k = 0;
    while (k < q.length && f[i + k] === q[k]) k++;
    if (k === q.length) return i;
  }
  return -1;
}

const verification: Verification = { checkedOn: new Date().toISOString().slice(0, 10), filings: {} };
let failed = 0;
for (const f of FILINGS) {
  const filing = readFiling(f.archived);
  const pages = new Map<string, string>();
  for (const [id, s] of Object.entries(f.sources)) pages.set(id, flat(readFileSync(join(ARCHIVE_DIR, s.archived), 'utf8')));

  const passages: Record<string, PassageCheck> = {};
  for (const p of f.passages) {
    const text = flat(p.text);
    const source = p.source === 'filing' ? filing.full : pages.get(p.source);
    // Where it appears more than once (the cover repeats the summary), the first place with a printed page number.
    let at = source?.indexOf(text) ?? -1;
    if (p.source === 'filing') for (let i = at; i >= 0 && !filing.pageAt(at); i = filing.full.indexOf(text, i + 1)) if (filing.pageAt(i)) at = i;
    passages[p.id] = { ok: at >= 0, sha: sha(text), ...(p.source === 'filing' && at >= 0 ? { page: filing.pageAt(at) } : {}) };
    if (at < 0) { failed++; console.log(`NOT FOUND in ${p.source}: ${p.id}: ${text.slice(0, 90)}`); }
  }

  const rows: Record<string, boolean> = {};
  for (const r of f.money.table.rows) {
    rows[r.label] = filing.full.includes(flat(r.row));
    if (!rows[r.label]) { failed++; console.log(`ROW NOT FOUND: ${r.label}`); }
  }

  // How the press quoted the filing: word for word, the same words with other punctuation, another spelling, or not in the text.
  const words = tokens(filing.full);
  const press: Record<string, PressCheck> = {};
  for (const id of f.press.quotes) {
    const found = quoteOf(id);
    if (!found) { failed++; console.log(`NO QUOTATION ${id} in the Base`); continue; }
    const text = flat(found.q.text);
    const at = filing.full.indexOf(text);
    if (at >= 0) { press[id] = { mode: 'exact', page: filing.pageAt(at) }; continue; }
    const n = tokens(text).length;
    for (const spelling of [false, true]) {
      const i = findWords(text, words, spelling);
      if (i < 0) continue;
      const span = words.slice(i, i + n);
      const theirs = tokens(text);
      const differences = spelling ? theirs.flatMap((t, k) => (t.word !== span[k].word ? [`${t.raw} → ${span[k].raw}`] : [])) : undefined;
      press[id] = { mode: spelling ? 'spelling' : 'words', page: filing.pageAt(span[0].at), filing: filing.full.slice(span[0].at, span[n - 1].at + span[n - 1].raw.length), ...(differences ? { differences } : {}) };
      break;
    }
    press[id] ??= { mode: 'none' };
  }

  verification.filings[f.slug] = { sha: sha(filing.full), passages, rows, press };
  const modes = Object.values(press).reduce<Record<string, number>>((m, p) => ({ ...m, [p.mode]: (m[p.mode] ?? 0) + 1 }), {});
  console.log(`${f.slug}: ${Object.values(passages).filter(p => p.ok).length} of ${f.passages.length} passages and ${Object.values(rows).filter(Boolean).length} of ${f.money.table.rows.length} table rows found; press quotations: ${JSON.stringify(modes)}`);
}

writeFileSync(join(process.cwd(), 'content/filings/verification.json'), `${JSON.stringify(verification, null, 2)}\n`);
if (failed) {
  console.log(`STOP: ${failed} not found. Copy the words exactly from the saved text, or remove them.`);
  process.exit(1);
}
