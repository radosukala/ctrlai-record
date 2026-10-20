/**
 * Moments: for every checked quotation that was said in a recording with captions, when each of its words is said, so
 * the site can play the recording from the source and light the words up as they are spoken (content/base/moments.json).
 *
 *   npx tsx scripts/radar/moments.ts            add the moments that are missing
 *   npx tsx scripts/radar/moments.ts --all      time every quotation again
 *
 * The captions are in the private archive (the run's sources, or docs/), so this runs on the machine that has it, in
 * the daily finish, before the tests and the commit. The file it writes holds only video ids and times: the quotation's
 * own text is already public in entries.json. Captions give a time per cue, not per word, so the words are spread across
 * their cue (lib/moments.ts); against a speech-to-text pass on two moments the error was typically 0.1 to 0.5 seconds.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Entry } from '../../content/base/types';
import { momentOf, type Caption, type Moment } from '../../lib/moments';
import { ARCHIVE_DIR, RADAR_DOCS } from './paths';

const FILE = join(process.cwd(), 'content/base/moments.json');
const entries = JSON.parse(readFileSync(join(process.cwd(), 'content/base/entries.json'), 'utf8')) as Entry[];
const previous: Record<string, Moment> = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {};
const redo = process.argv.includes('--all');

type Captions = { videoId?: string; segments?: Caption[] };

/** The captions the quotation was checked against: the run's own sources first, then the archive's permanent copy. */
function captionsOf(e: Entry): Captions | undefined {
  const dir = `${ARCHIVE_DIR}/docs/${e.id.slice(0, 2)}/${e.id}`;
  const files = [join(RADAR_DOCS, e.run, 'sources', `${e.id}.transcript.json`), join(dir, 'captions-uploaded.json'), join(dir, 'captions-auto.json')];
  const file = files.find(existsSync);
  return file ? (JSON.parse(readFileSync(file, 'utf8')) as Captions) : undefined;
}

const kept: Record<string, Moment> = {};
const lost: string[] = [];
let added = 0, withoutCaptions = 0, quotes = 0;
for (const e of entries) {
  const timed = e.quotes.filter(q => q.at !== undefined && q.speakerCertain);
  if (!timed.length) continue;
  const pending = timed.filter(q => redo || !previous[q.id]);
  for (const q of timed) if (previous[q.id] && !pending.includes(q)) kept[q.id] = previous[q.id];
  if (!pending.length) continue;
  const captions = captionsOf(e);
  if (!captions?.videoId || !captions.segments?.length) { withoutCaptions += pending.length; continue; }
  for (const q of pending) {
    quotes++;
    const m = momentOf(captions.videoId, q.text, q.at!, captions.segments);
    if (m) { kept[q.id] = m; added++; } else lost.push(`${e.id} ${q.id} at ${q.at}: ${q.text.slice(0, 60)}`);
  }
}

const sorted = Object.fromEntries(Object.entries(kept).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(FILE, `{\n${Object.entries(sorted).map(([id, m]) => `  ${JSON.stringify(id)}: ${JSON.stringify(m)}`).join(',\n')}\n}\n`);
console.log(`Moments: ${Object.keys(sorted).length} in the file; ${added} new of ${quotes} timed${withoutCaptions ? `; ${withoutCaptions} in recordings with no caption times` : ''}${lost.length ? `; ${lost.length} not found in the captions` : ''}.`);
for (const l of lost) console.log(`  not found: ${l}`);
