import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Where the Radar keeps its private working files: everything it saw, its triage, the agents' entries and the texts
 * their quotations were checked against. They live in the private archive repository (github.com/radosukala/ctrlai-archive,
 * cloned next to this one), under runs/, and are pushed on every run, so the public Base can always be rebuilt from a
 * fresh clone. Set ARCHIVE_DIR or RADAR_DOCS to use another copy.
 */
export const ARCHIVE_DIR = resolve(process.env.ARCHIVE_DIR ?? [join(process.cwd(), '../ctrlai-archive'), '/Users/rado/code/ctrlai-archive'].find(existsSync) ?? '../ctrlai-archive');
export const RADAR_DOCS = resolve(process.env.RADAR_DOCS ?? join(ARCHIVE_DIR, 'runs'));
if (!existsSync(RADAR_DOCS)) {
  throw new Error(`The Radar's run folders are not at ${RADAR_DOCS}. Clone the private archive next to this repository (git clone https://github.com/radosukala/ctrlai-archive ../ctrlai-archive), or set ARCHIVE_DIR.`);
}
export const radarDir = (run: string) => `${RADAR_DOCS}/${run}`;
