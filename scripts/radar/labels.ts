/**
 * Stance labels waiting for a person. A machine proposes where each quotation stands on a few propositions; nothing is
 * shown until a person confirms (or corrects) it here.
 *
 *   npx tsx scripts/radar/labels.ts                                   list every label still waiting, with its quotation
 *   npx tsx scripts/radar/labels.ts confirm <quote id>                confirm the machine's labels for that quotation as they are
 *   npx tsx scripts/radar/labels.ts set <quote id> <q>=<stance> …     confirm with your own labels instead
 *   npx tsx scripts/radar/labels.ts drop <quote id>                   withdraw a confirmation
 *
 * Confirmations live in content/base/confirmed.json. Run compose.ts afterwards.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import type { Entry } from '../../content/base/types';
import { PROPOSITION, STANCE_LABEL } from '../../content/base/taxonomy';

const FILE = 'content/base/confirmed.json';
const confirmed = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, { q: string; stance: string }[]>;
const entries = JSON.parse(readFileSync('content/base/entries.json', 'utf8')) as Entry[];
const people = new Map((JSON.parse(readFileSync('content/base/people.json', 'utf8')) as { id: string; name: string }[]).map(p => [p.id, p.name]));
const quotes = new Map(entries.flatMap(e => e.quotes.map(q => [q.id, { q, e }] as const)));
const [cmd, id, ...rest] = process.argv.slice(2);
const save = () => writeFileSync(FILE, JSON.stringify(confirmed, null, 1) + '\n');

if (!cmd) {
  let n = 0;
  for (const { q, e } of quotes.values()) {
    const machine = (q.positions ?? []).filter(p => p.by === 'machine');
    if (!machine.length || confirmed[q.id]) continue;
    n++;
    console.log(`${q.id}  ${people.get(q.speaker) ?? q.speaker}, ${e.outlet}, ${e.published}`);
    console.log(`  “${q.text}”`);
    for (const p of machine) console.log(`  → ${STANCE_LABEL[p.stance]}: ${PROPOSITION[p.q].text}   (${p.q}=${p.stance})`);
    console.log();
  }
  console.log(`${n} quotations have labels waiting; ${Object.keys(confirmed).length} confirmed.`);
} else if (cmd === 'confirm') {
  const found = quotes.get(id);
  if (!found) { console.error(`no quotation ${id}`); process.exit(1); }
  confirmed[id] = (found.q.positions ?? []).map(({ q, stance }) => ({ q, stance }));
  save(); console.log(`confirmed ${id}: ${confirmed[id].map(p => `${p.q}=${p.stance}`).join(', ')}`);
} else if (cmd === 'set') {
  if (!quotes.has(id)) { console.error(`no quotation ${id}`); process.exit(1); }
  confirmed[id] = rest.map(r => { const [q, stance] = r.split('='); if (!(q in PROPOSITION) || !(stance in STANCE_LABEL)) throw new Error(`bad label ${r}`); return { q, stance }; });
  save(); console.log(`set ${id}: ${rest.join(', ')}`);
} else if (cmd === 'drop') {
  delete confirmed[id]; save(); console.log(`dropped ${id}`);
} else { console.error('usage: labels.ts [confirm|set|drop] <quote id> …'); process.exit(2); }
