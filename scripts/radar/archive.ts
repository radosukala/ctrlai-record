/**
 * The archive: every source text we obtain, kept whole, in a PRIVATE repository (github.com/radosukala/ctrlai-archive).
 * The Base shows short quotations and our own words; the archive keeps the full texts so later research (and later,
 * more capable agents) can go back to what people actually said. Originals are kept forever; everything else can be
 * derived again from them.
 *
 *   npx tsx scripts/radar/archive.ts LIST.jsonl        add the documents listed (one JSON object per line, see Add)
 *   npx tsx scripts/radar/archive.ts --run 2026-10-12  add everything a Radar run saved
 *
 * Layout: docs/<id[0:2]>/<id>/meta.json plus one file per version of the text (page-text.txt, captions-auto.txt,
 * stt-elevenlabs.txt + .json, …). catalog.jsonl at the root has one line per document, rebuilt on every run.
 * The id is the Radar's item id (sha1 of the canonical URL, 12 hex), so a Base entry and its archive folder share it.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { canonical, itemId } from './feeds';
import { RADAR_DOCS } from './paths';

export const ARCHIVE = process.env.ARCHIVE_DIR ?? [join(process.cwd(), '../ctrlai-archive'), '/Users/rado/code/ctrlai-archive'].find(existsSync) ?? '../ctrlai-archive';

/** How a text was obtained. The method says how far a reader can trust its words and its speaker names. */
export type Method =
  | 'page-text' | 'pdf-text' | 'official-transcript' | 'feed-transcript'
  | 'captions-uploaded' | 'captions-auto' | 'stt-elevenlabs' | 'stt-whisper' | 'stt-nemotron' | 'manual-tactiq' | 'abstract';

export type Add = {
  url?: string;
  title?: string;
  outlet?: string;
  /** YYYY-MM-DD when known. */
  published?: string;
  kind?: string;
  method: Method;
  /** The text file to copy in. */
  file: string;
  /** Optional timed segments: [{ start, end?, text, speaker? }]. */
  segmentsFile?: string;
  /** The URL the text actually came from, when it differs from `url` (a mirror, an archive copy). */
  via?: string;
  obtainedOn?: string;
  collection: string;
  baseEntry?: string;
  note?: string;
};

type Version = { method: Method; file: string; segments?: string; sha256: string; words: number; obtainedOn: string; via?: string; speakerLabels: boolean };
type Meta = {
  id: string; url?: string; title?: string; outlet?: string; published?: string; kind?: string;
  collections: string[]; baseEntries: string[]; versions: Version[];
  rights: { tdm: 'unknown' | 'reserved' | 'not-reserved'; note?: string };
  notes?: string[];
};

const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const today = () => new Date().toISOString().slice(0, 10);

export function add(a: Add): { id: string; added: boolean } {
  const text = readFileSync(a.file, 'utf8');
  if (!text.trim()) throw new Error(`${a.file} is empty`);
  // Without a URL the id comes from the text itself, marked with an x so it can't collide with a URL id.
  const id = a.url ? itemId(a.url) : `x${sha(text).slice(0, 11)}`;
  const dir = join(ARCHIVE, 'docs', id.slice(0, 2), id);
  mkdirSync(dir, { recursive: true });
  const metaPath = join(dir, 'meta.json');
  const meta: Meta = existsSync(metaPath)
    ? JSON.parse(readFileSync(metaPath, 'utf8'))
    : { id, collections: [], baseEntries: [], versions: [], rights: { tdm: 'unknown' } };
  if (a.url && !meta.url) meta.url = canonical(a.url);
  for (const k of ['title', 'outlet', 'published', 'kind'] as const) if (a[k] && !meta[k]) meta[k] = a[k];
  if (!meta.collections.includes(a.collection)) meta.collections.push(a.collection);
  if (a.baseEntry && !meta.baseEntries.includes(a.baseEntry)) meta.baseEntries.push(a.baseEntry);
  if (a.note) (meta.notes ??= []).includes(a.note) || meta.notes!.push(a.note);

  const hash = sha(text);
  if (meta.versions.some(v => v.sha256 === hash)) { writeFileSync(metaPath, JSON.stringify(meta, null, 1) + '\n'); return { id, added: false }; }
  // Same method, different text (a re-fetch after the page changed): keep both, the newer one numbered.
  const n = meta.versions.filter(v => v.method === a.method).length;
  const name = n ? `${a.method}.${n + 1}` : a.method;
  writeFileSync(join(dir, `${name}.txt`), text.endsWith('\n') ? text : text + '\n');
  let segments: string | undefined;
  let speakerLabels = false;
  if (a.segmentsFile && existsSync(a.segmentsFile)) {
    const seg = readFileSync(a.segmentsFile, 'utf8');
    segments = `${name}.json`;
    writeFileSync(join(dir, segments), seg);
    speakerLabels = /"speaker"\s*:/.test(seg);
  }
  meta.versions.push({
    method: a.method, file: `${name}.txt`, ...(segments ? { segments } : {}), sha256: hash, words: text.split(/\s+/).filter(Boolean).length,
    obtainedOn: a.obtainedOn ?? today(), ...(a.via && a.via !== a.url ? { via: a.via } : {}), speakerLabels,
  });
  writeFileSync(metaPath, JSON.stringify(meta, null, 1) + '\n');
  return { id, added: true };
}

/** One line per document: what an agent reads first to decide what to open. */
export function rebuildCatalog() {
  const lines: string[] = [];
  const root = join(ARCHIVE, 'docs');
  if (!existsSync(root)) return 0;
  for (const p of readdirSync(root).sort()) for (const id of readdirSync(join(root, p)).sort()) {
    const m = JSON.parse(readFileSync(join(root, p, id, 'meta.json'), 'utf8')) as Meta;
    lines.push(JSON.stringify({
      id: m.id, url: m.url, title: m.title, outlet: m.outlet, published: m.published, kind: m.kind,
      methods: m.versions.map(v => v.method), words: Math.max(...m.versions.map(v => v.words)),
      speakerLabels: m.versions.some(v => v.speakerLabels), collections: m.collections, baseEntries: m.baseEntries,
      path: `docs/${p}/${id}`,
    }));
  }
  writeFileSync(join(ARCHIVE, 'catalog.jsonl'), lines.join('\n') + '\n');
  return lines.length;
}

/** Everything a Radar run saved, with what its entries know about each source. */
function fromRun(run: string): Add[] {
  const dir = join(RADAR_DOCS, run);
  const items = new Map<string, { url: string; title: string; sourceName: string; published: string; kind: string }>();
  for (const l of readFileSync(join(dir, 'items.jsonl'), 'utf8').split('\n').filter(Boolean)) { const it = JSON.parse(l); items.set(it.id, it); }
  const entries = new Map<string, { slug: string; title: string; outlet: string; published: string; kind: string; url: string; textUrl?: string; transcript?: string; textFile?: string; access?: string }>();
  for (const f of readdirSync(join(dir, 'entries')).filter(f => f.endsWith('.json'))) { const e = JSON.parse(readFileSync(join(dir, 'entries', f), 'utf8')); entries.set(e.id, e); }
  const out: Add[] = [];
  for (const f of readdirSync(join(dir, 'sources')).filter(f => f.endsWith('.txt')).sort()) {
    const id = f.split('.')[0];
    const e = entries.get(id);
    const it = items.get(id);
    const tj = join(dir, 'sources', f.replace(/\.txt$/, '.transcript.json'));
    let method: Method = 'page-text';
    if (existsSync(tj)) {
      const t = JSON.parse(readFileSync(tj, 'utf8'));
      method = t.engine === 'whisper' ? 'stt-whisper' : t.engine === 'elevenlabs' ? 'stt-elevenlabs' : t.engine === 'openrouter' ? 'stt-nemotron' : t.generated ? 'captions-auto' : 'captions-uploaded';
    }
    else if (e?.access === 'abstract') method = 'abstract';
    else if (/arxiv\.org/.test(e?.textUrl ?? e?.url ?? '')) method = 'page-text';
    // A second clip's captions saved beside the main one is its own document; a second transcript of the same audio is not.
    const companion = f !== `${id}.txt` && !f.endsWith('.second.txt');
    out.push({
      url: companion ? undefined : (e?.url ?? it?.url), title: companion ? `${e?.title ?? it?.title ?? id} (${basename(f)})` : (e?.title ?? it?.title),
      outlet: e?.outlet ?? it?.sourceName, published: e?.published ?? it?.published?.slice(0, 10), kind: e?.kind ?? it?.kind,
      method, file: join(dir, 'sources', f), ...(existsSync(tj) ? { segmentsFile: tj } : {}), via: e?.textUrl,
      collection: `radar-${run}`, baseEntry: e?.slug, obtainedOn: run,
    });
  }
  return out;
}

if (process.argv[1]?.endsWith('archive.ts')) {
  const i = process.argv.indexOf('--run');
  const list: Add[] = i > 0
    ? fromRun(process.argv[i + 1])
    : readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  let added = 0, same = 0, failed = 0;
  for (const a of list) {
    try { const r = add(a); r.added ? added++ : same++; }
    catch (e) { failed++; console.log(`  FAIL ${a.file}: ${(e as Error).message}`); }
  }
  const n = rebuildCatalog();
  console.log(`${added} new texts, ${same} already kept, ${failed} failed. The catalog lists ${n} documents. → ${ARCHIVE}`);
}
