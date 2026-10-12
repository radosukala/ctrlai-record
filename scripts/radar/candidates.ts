/**
 * What a run should consider: the items it kept that no earlier run has an entry for. Writes candidates.jsonl in the run
 * folder and prints one numbered line per item, for the triage.
 *
 *   npx tsx scripts/radar/candidates.ts --run 2026-10-13
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RADAR_DOCS } from './paths';

const run = process.argv[process.argv.indexOf('--run') + 1];
if (!run) { console.error('usage: candidates.ts --run NAME'); process.exit(2); }
const dir = join(RADAR_DOCS, run);

// Everything earlier runs already wrote an entry for, or decided to skip.
const done = new Set<string>();
for (const r of readdirSync(RADAR_DOCS).filter(d => d !== run && existsSync(join(RADAR_DOCS, d, 'items.jsonl')))) {
  const entries = join(RADAR_DOCS, r, 'entries');
  if (existsSync(entries)) for (const f of readdirSync(entries)) done.add(f.split('.')[0]);
  const skipped = join(RADAR_DOCS, r, 'skipped.txt');
  if (existsSync(skipped)) for (const id of readFileSync(skipped, 'utf8').split(/\s+/)) if (id) done.add(id);
}

const items = readFileSync(join(dir, 'items.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const fresh = items.filter(i => i.kept && !done.has(i.id)).sort((a, b) => a.published.localeCompare(b.published));
writeFileSync(join(dir, 'candidates.jsonl'), fresh.map(i => JSON.stringify(i)).join('\n') + (fresh.length ? '\n' : ''));

fresh.forEach((i, n) => {
  const extra = [i.views ? `v=${i.views}` : '', i.points ? `p=${i.points}` : '', i.durationSec ? `${Math.round(i.durationSec / 60)}m` : '', i.audio ? 'audio' : '', i.transcripts?.length ? 'transcript' : '']
    .filter(Boolean).join(' ');
  console.log(`${String(n).padStart(3)} ${i.id} ${i.published.slice(0, 10)} ${i.source.slice(0, 24).padEnd(24)} | ${i.title.slice(0, 110)} ${extra}`);
});
console.log(`\n${fresh.length} new candidates (${items.filter(i => i.kept).length} kept, ${done.size} already handled by earlier runs) → ${dir}/candidates.jsonl`);
