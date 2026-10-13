/**
 * Builds one SQLite database from the record, for questions that cut across days: every quotation by a person, every
 * entry on a question, every text that mentions a phrase, what the Radar saw and what it decided. Derived, never the
 * record itself: it is rebuilt from the files after every run and can be rebuilt anywhere from fresh clones.
 *
 *   npx tsx scripts/radar/build-db.ts            → ../ctrlai-archive/index/base.sqlite (not in git)
 *   sqlite3 ../ctrlai-archive/index/base.sqlite "select name, count(*) from claims group by name order by 2 desc limit 10"
 *
 * Reads: content/base/*.json (the public Base), the archive's runs/ (items, skips) and docs/ (every saved text).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Entry, Person } from '../../content/base/types';
import { ARCHIVE_DIR, RADAR_DOCS } from './paths';

const read = <T>(f: string) => JSON.parse(readFileSync(f, 'utf8')) as T;
const lines = <T>(f: string) => existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as T) : [];
/** SQLite takes NULL, not undefined: older catalog lines and feed items leave some fields out. */
const z = (v: unknown) => (v === undefined ? null : v) as never;
const commit = (dir: string) => { try { return execFileSync('git', ['-C', dir, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return ''; } };

const ENTRIES = read<Entry[]>('content/base/entries.json');
const PEOPLE = read<Person[]>('content/base/people.json');
const RUNS = read<{ run: string; from: string; to: string; ranAt: string; sources: number; answered: number; items: number; kept: number; entries: number; quotes: number }[]>('content/base/runs.json');

const dir = join(ARCHIVE_DIR, 'index');
mkdirSync(dir, { recursive: true });
const tmp = join(dir, 'base.sqlite.tmp');
rmSync(tmp, { force: true });
const db = new DatabaseSync(tmp);

db.exec(`
create table meta (key text primary key, value text);
create table entries (id text primary key, slug text unique, kind text, title text, url text, outlet text, published text,
  minutes int, views int, importance int, access text, transcript text, conflict int, change_kind text, change_note text,
  summary text, lenses text, run text, via_source text, notes text);
create table entry_topics (entry_id text, topic text);
create table entry_orgs (entry_id text, org text);
create table entry_people (entry_id text, person_id text, role text, title text);
create table entry_also (entry_id text, outlet text, title text, url text);
create table people (id text primary key, name text);
create table person_titles (person_id text, title text, entry_slug text, on_date text, role text);
-- said_on: when the words were said (a quotation's own date when the source gives one, else the source's date).
create table quotes (id text primary key, entry_id text, speaker text, text text, context text, speaker_certain int,
  match text, second int, at_seconds int, said_on text, type text, hand text);
create table evidence (entry_id text primary key, design text, finding text, limits text, status text, replication text);
create table relations (entry_id text, rel text, to_slug text, note text);
create table quote_positions (quote_id text, proposition text, stance text, by text);
create table runs (run text primary key, from_date text, to_date text, ran_at text, sources int, answered int, items int,
  kept int, entries int, quotes int);
-- decision: entry (became an entry in this run), skipped (triage said no), untriaged (kept by the filter, never decided),
-- filtered (the keyword filter did not keep it). An item can appear in several runs whose windows overlap.
create table items (run text, id text, source text, source_name text, kind text, tier int, title text, url text,
  published text, author text, excerpt text, kept int, decision text, skip_reason text, duration_sec int, views int,
  primary key (run, id));
create table documents (id text primary key, url text, title text, outlet text, published text, kind text, words int,
  path text, collections text, base_entries text);
create table texts (doc_id text, method text, file text, words int, obtained_on text, sha256 text, text text);
create view claims as
  select q.id, q.said_on, q.speaker, coalesce(p.name, q.speaker) as name, q.type, q.hand, q.text, q.context, q.speaker_certain,
         e.slug, e.outlet, e.kind, e.url, e.published
  from quotes q join entries e on e.id = q.entry_id left join people p on p.id = q.speaker;
`);

const ins = (sql: string) => db.prepare(sql);
db.exec('begin');
const iEntry = ins('insert into entries values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
const iTopic = ins('insert into entry_topics values (?,?)');
const iOrg = ins('insert into entry_orgs values (?,?)');
const iEP = ins('insert into entry_people values (?,?,?,?)');
const iAlso = ins('insert into entry_also values (?,?,?,?)');
const iQuote = ins('insert into quotes values (?,?,?,?,?,?,?,?,?,?,?,?)');
const iEvidence = ins('insert into evidence values (?,?,?,?,?,?)');
const iRelation = ins('insert into relations values (?,?,?,?)');
const iPos = ins('insert into quote_positions values (?,?,?,?)');
for (const e of ENTRIES) {
  iEntry.run(e.id, e.slug, e.kind, e.title, e.url, e.outlet, e.published, e.minutes ?? null, e.views ?? null, e.importance,
    e.access, e.transcript, e.conflict ? 1 : 0, e.change?.kind ?? null, e.change?.note ?? null, e.summary,
    JSON.stringify(e.lenses), e.run, e.via.source, e.notes ?? null);
  for (const t of e.topics) iTopic.run(e.id, t);
  for (const o of e.orgs) iOrg.run(e.id, o);
  for (const p of e.people) iEP.run(e.id, p.id, p.role, p.title ?? null);
  for (const a of e.also) iAlso.run(e.id, a.outlet, a.title, a.url);
  if (e.evidence) iEvidence.run(e.id, e.evidence.design, e.evidence.finding, e.evidence.limits, e.evidence.status, z(e.evidence.replication));
  for (const r of e.relations ?? []) iRelation.run(e.id, r.rel, r.to, r.note);
  for (const q of e.quotes) {
    iQuote.run(q.id, e.id, q.speaker, q.text, q.context ?? null, q.speakerCertain ? 1 : 0, q.match, q.second ? 1 : 0, q.at ?? null, q.said ?? e.published, z(q.type), z(q.hand));
    for (const p of q.positions ?? []) iPos.run(q.id, p.q, p.stance, p.by);
  }
}
const iPerson = ins('insert into people values (?,?)');
const iTitle = ins('insert into person_titles values (?,?,?,?,?)');
for (const p of PEOPLE) {
  iPerson.run(p.id, p.name);
  for (const t of p.titles) iTitle.run(p.id, t.title, t.entry, t.on, t.role);
}
const iRun = ins('insert into runs values (?,?,?,?,?,?,?,?,?,?)');
for (const r of RUNS) iRun.run(r.run, r.from, r.to, r.ranAt, r.sources, r.answered, r.items, r.kept, r.entries, r.quotes);

// What each run saw, and what became of it.
type Item = { id: string; source: string; sourceName: string; kind: string; tier: number; title: string; url: string; published: string; author?: string; excerpt: string; kept: boolean; durationSec?: number; views?: number };
const iItem = ins('insert or replace into items values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
let items = 0;
for (const run of readdirSync(RADAR_DOCS).filter(r => existsSync(join(RADAR_DOCS, r, 'items.jsonl'))).sort()) {
  const runDir = join(RADAR_DOCS, run);
  const made = new Set(existsSync(join(runDir, 'entries')) ? readdirSync(join(runDir, 'entries')).map(f => f.split('.')[0]) : []);
  const skipped = new Map<string, string>();
  if (existsSync(join(runDir, 'skipped.txt'))) {
    for (const line of readFileSync(join(runDir, 'skipped.txt'), 'utf8').split('\n')) {
      const [id, ...why] = line.trim().split(/\s+/);
      if (id) skipped.set(id, why.join(' '));
    }
  }
  for (const it of lines<Item>(join(runDir, 'items.jsonl'))) {
    const decision = made.has(it.id) ? 'entry' : skipped.has(it.id) ? 'skipped' : it.kept ? 'untriaged' : 'filtered';
    iItem.run(run, it.id, z(it.source), z(it.sourceName), z(it.kind), z(it.tier), z(it.title), z(it.url), z(it.published), z(it.author),
      z(it.excerpt), it.kept ? 1 : 0, decision, skipped.get(it.id) || null, z(it.durationSec), z(it.views));
    items++;
  }
}

// Every saved text, every version of it.
type Doc = { id: string; url: string; title: string; outlet: string; published: string; kind: string; words: number; path: string; collections?: string[]; baseEntries?: string[] };
type Meta = { versions: { method: string; file: string; sha256: string; words: number; obtainedOn: string }[] };
const iDoc = ins('insert or replace into documents values (?,?,?,?,?,?,?,?,?,?)');
const iText = ins('insert into texts values (?,?,?,?,?,?,?)');
let docs = 0, texts = 0;
for (const d of lines<Doc>(join(ARCHIVE_DIR, 'catalog.jsonl'))) {
  iDoc.run(d.id, z(d.url), z(d.title), z(d.outlet), z(d.published), z(d.kind), z(d.words), d.path, JSON.stringify(d.collections ?? []), JSON.stringify(d.baseEntries ?? []));
  docs++;
  const metaFile = join(ARCHIVE_DIR, d.path, 'meta.json');
  if (!existsSync(metaFile)) continue;
  for (const v of read<Meta>(metaFile).versions) {
    const f = join(ARCHIVE_DIR, d.path, v.file);
    if (!existsSync(f)) continue;
    iText.run(d.id, z(v.method), v.file, z(v.words), z(v.obtainedOn), z(v.sha256), readFileSync(f, 'utf8'));
    texts++;
  }
}
db.exec('commit');

// Full-text search over the saved texts and the quotations (porter stemming: "regulate" also finds "regulation").
db.exec(`
create virtual table texts_fts using fts5(text, content='texts', tokenize='porter unicode61');
insert into texts_fts(texts_fts) values ('rebuild');
create virtual table quotes_fts using fts5(text, context, content='quotes', tokenize='porter unicode61');
insert into quotes_fts(quotes_fts) values ('rebuild');
create index items_decision on items (decision);
create index quotes_speaker on quotes (speaker);
create index texts_doc on texts (doc_id);
`);
const setMeta = ins('insert into meta values (?,?)');
for (const [k, v] of Object.entries({
  built_at: new Date().toISOString(), site_commit: commit('.'), archive_commit: commit(ARCHIVE_DIR),
  note: 'Derived from the files; rebuild with scripts/radar/build-db.ts. The record itself is the archive repository and content/base.',
})) setMeta.run(k, v);
db.close();
renameSync(tmp, join(dir, 'base.sqlite'));

const quotes = ENTRIES.reduce((n, e) => n + e.quotes.length, 0);
console.log(`${ENTRIES.length} entries, ${quotes} quotations, ${PEOPLE.length} people, ${items} items seen, ${docs} documents with ${texts} texts → ${join(dir, 'base.sqlite')}`);
