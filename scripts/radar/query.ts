/**
 * One read-only question to the record's database (../ctrlai-archive/index/base.sqlite): a single SELECT, tab-separated
 * result, at most 200 rows. It cannot write, and it has no shell or dot-commands, so it is safe to allow without asking.
 *
 *   npx tsx scripts/radar/query.ts "select slug, published, title from entries where title like '%METR%' limit 10"
 */
import { DatabaseSync } from 'node:sqlite';
import { ARCHIVE_DIR } from './paths';

const sql = (process.argv[2] ?? '').trim().replace(/;+\s*$/, '');
if (!/^(select|with)\b/i.test(sql)) { console.error('only a single SELECT (or WITH … SELECT) is allowed'); process.exit(2); }
if (sql.includes(';')) { console.error('one statement only'); process.exit(2); }
const db = new DatabaseSync(`${ARCHIVE_DIR}/index/base.sqlite`, { readOnly: true });
const rows = db.prepare(sql).all() as Record<string, unknown>[];
if (!rows.length) { console.log('(no rows)'); process.exit(0); }
const cols = Object.keys(rows[0]);
console.log(cols.join('\t'));
for (const r of rows.slice(0, 200)) console.log(cols.map(c => String(r[c] ?? '').replace(/\s+/g, ' ').slice(0, 300)).join('\t'));
if (rows.length > 200) console.log(`… ${rows.length - 200} more rows`);
