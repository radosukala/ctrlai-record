/**
 * What a question's answer has not taken into account yet: every Base entry on the question published since its last
 * revision, new evidence first, then commitments, decisions and corrections, then arguments, then familiar ground; each
 * marked when the answer already cites it. The input to the weekly revision (radar/QUESTIONS.md).
 *
 *   npx tsx scripts/questions/since.ts beyond-control [--since 2026-10-05]
 */
import { ENTRIES } from '../../content/base';
import { CHANGE_LABEL } from '../../content/base/taxonomy';
import type { ChangeKind } from '../../content/base/types';
import { QUESTIONS } from '../../content/questions';
import type { Cite } from '../../content/questions/types';

const id = process.argv[2];
const q = QUESTIONS.find(x => x.id === id);
if (!q) { console.error(`usage: since.ts <question id>   (one of: ${QUESTIONS.map(x => x.id).join(', ')})`); process.exit(2); }
const sinceArg = process.argv.indexOf('--since');
const since = sinceArg > 0 ? process.argv[sinceArg + 1] : q.asOf;

const cites = (list: { cites: Cite[] }[]) => list.flatMap(c => c.cites).filter((c): c is { base: string } => 'base' in c).map(c => c.base);
const cited = new Set(cites([...q.established, ...q.limits, ...q.changed.items, ...q.unknowns, ...q.values, ...q.decisions, ...q.disagreements.flatMap(d => d.sides)]));

const ORDER: ChangeKind[] = ['evidence', 'correction', 'decision', 'commitment', 'argument', 'repeat'];
const fresh = ENTRIES.filter(e => e.topics.includes(q.id) && e.published >= since);
console.log(`${q.question}\nVersion ${q.version} as of ${q.asOf}. Entries on this question published since ${since}: ${fresh.length}\n`);
for (const kind of ORDER) {
  const list = fresh.filter(e => (e.change?.kind ?? 'argument') === kind).sort((a, b) => b.importance - a.importance || b.published.localeCompare(a.published));
  if (!list.length) continue;
  console.log(`== ${CHANGE_LABEL[kind]} (${list.length})`);
  for (const e of list) {
    const marks = [cited.has(e.slug) ? 'cited' : 'NEW', e.access === 'excerpt' ? 'description only' : `${e.quotes.length} quotations`, `importance ${e.importance}`, e.conflict ? 'conflict' : ''].filter(Boolean).join(', ');
    console.log(`  ${e.published} ${e.slug}  [${marks}]\n     ${e.change?.note ?? e.summary.slice(0, 160)}`);
  }
  console.log('');
}
