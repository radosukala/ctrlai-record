/**
 * Builds the Base from the Radar's run folders: reads every run's entries, checks every quotation again against the saved
 * source text (a quotation that fails is dropped, never published), merges the people, and writes what the site reads:
 *
 *   content/base/entries.json       the entries, newest first
 *   content/base/people.json        everyone who speaks, writes or is a main subject, with the titles sources gave them
 *   content/base/names.json         display names for organizations quoted as speakers
 *   content/base/runs.json          what each run read and kept, so the site can say "in the sources we monitor"
 *   content/base/verification.json  per quotation: how it matched, and hashes, so tests can tell if anything was edited after
 *
 *   npx tsx scripts/radar/compose.ts [--allow-removals "why"]
 *
 * Nothing is written unless the whole build passes, and then all files are replaced together. An entry or a quotation
 * that is on the site and missing from the new build stops it: a removal has to be deliberate, with a reason, and is
 * logged in content/base/removals.json.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { joinTranscript, verifyQuote } from '../../lib/verify-quote';
import type { Entry, Person, Quote } from '../../content/base/types';
import { TOPIC } from '../../content/base/taxonomy';
import { RADAR_DOCS } from './paths';
import { secondOpinion } from './second';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const norm = (s: string) => s.normalize('NFKC').replace(/\s+/g, ' ').trim();
/** A quotation's id comes from its words, not from its place in the list, so a confirmed label can never move to other words. */
const quoteId = (entry: string, text: string, taken: Set<string>) => {
  const base = `${entry}-${sha(norm(text)).slice(0, 8)}`;
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  taken.add(id);
  return id;
};
const KINDS = new Set(['news', 'video', 'podcast', 'essay', 'research', 'official', 'hearing']);
const LENSES = new Set(['public', 'policy', 'research', 'ideas']);
const ROLES = new Set(['speaker', 'author', 'subject', 'mentioned']);
const CHANGES = new Set(['evidence', 'commitment', 'decision', 'correction', 'argument', 'repeat']);
const STANCES = new Set(['agree', 'lean-agree', 'mixed', 'lean-disagree', 'disagree']);
const PROPS = new Set(['loss-of-control', 'labs-self-govern', 'pre-release-testing', 'slow-down', 'race-with-china', 'international-agreement', 'liability', 'speak-up']);

type Draft = Omit<Entry, 'quotes' | 'run' | 'via' | 'review' | 'people'> & {
  people?: { id: string; name: string; role: string; title?: string }[];
  quotes?: { text: string; speaker: string; speakerCertain?: boolean; context?: string; positions?: { q: string; stance: string }[] }[];
  textFile?: string;
};

const entries: Entry[] = [];
const people = new Map<string, Person>();
const names: Record<string, string> = {};
const verification: Record<string, { ok: boolean; mode?: string; reason?: string; quoteSha: string; textSha?: string; second?: { agreement: number; missing: string[] } }> = {};
const runs: Record<string, unknown>[] = [];
// Stance labels a person has confirmed (or corrected), by quotation id. Only these are ever shown.
const CONFIRMED = JSON.parse(readFileSync('content/base/confirmed.json', 'utf8')) as Record<string, { q: string; stance: string }[]>;
const problems: string[] = [];
let dropped = 0;

/** Feed names are not outlet names: one publication, one name. */
const OUTLET: Record<string, string> = {
  'NYT Technology': 'The New York Times', 'The Guardian: AI': 'The Guardian', 'TechCrunch AI': 'TechCrunch', 'The Verge AI': 'The Verge',
  'Wired AI': 'Wired', 'Hard Fork (YouTube)': 'Hard Fork', 'Future of Life Institute (YouTube)': 'Future of Life Institute',
  'Senator Josh Hawley (YouTube)': 'Senator Josh Hawley', 'The Cognitive Revolution (YouTube)': 'The Cognitive Revolution',
  'Anthropic news': 'Anthropic', 'OpenAI news': 'OpenAI', 'OpenAI alignment blog': 'OpenAI Alignment Research Blog',
  'UN press releases': 'UN Meetings Coverage and Press Releases', 'Redwood Research blog': 'Redwood Research', 'Doom Debates!': 'Doom Debates',
  'CSET Georgetown': 'CSET', '80,000 Hours Podcast': '80,000 Hours', 'Ars Technica AI': 'Ars Technica', 'MIT Technology Review AI': 'MIT Technology Review',
  'The Ezra Klein Show (YT)': 'The Ezra Klein Show', 'BBC Technology': 'BBC News', 'Kurzgesagt – In a Nutshell': 'Kurzgesagt',
};
/** Organizations quoted as speakers whose name is not just their id in title case. */
const DISPLAY: Record<string, string> = {
  openai: 'OpenAI', imf: 'IMF', 'uk-government': 'UK government',
  'lancet-commission-global-threats-to-health': 'Lancet Commission on 21st Century Global Threats to Health',
};
/** The text of `<source>.second.transcript.json` (or `.second.txt`) beside a saved source, if there is one. */
function secondTranscript(textPath: string): string | undefined {
  const json = textPath.replace(/\.txt$/, '.second.transcript.json');
  if (existsSync(json)) return joinTranscript(JSON.parse(readFileSync(json, 'utf8')).segments).text;
  const txt = textPath.replace(/\.txt$/, '.second.txt');
  return existsSync(txt) ? readFileSync(txt, 'utf8') : undefined;
}

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');

for (const run of readdirSync(RADAR_DOCS).filter(d => existsSync(join(RADAR_DOCS, d, 'entries'))).sort()) {
  const dir = join(RADAR_DOCS, run);
  const items = new Map<string, { source: string; tier: 1 | 2 | 3 }>();
  for (const line of readFileSync(join(dir, 'items.jsonl'), 'utf8').split('\n').filter(Boolean)) {
    const it = JSON.parse(line);
    items.set(it.id, { source: it.source, tier: it.tier });
  }
  const health = JSON.parse(readFileSync(join(dir, 'health.json'), 'utf8'));
  const lines = readFileSync(join(dir, 'items.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  let runEntries = 0;
  let runQuotes = 0;

  for (const file of readdirSync(join(dir, 'entries')).filter(f => f.endsWith('.json')).sort()) {
    const d = JSON.parse(readFileSync(join(dir, 'entries', file), 'utf8')) as Draft;
    const rawOutlet = d.outlet;
    d.outlet = OUTLET[d.outlet] ?? d.outlet;
    const where = `${run}/${file}`;
    if ((d.importance as number) === 0) continue;
    if (!KINDS.has(d.kind)) problems.push(`${where}: unknown kind ${d.kind}`);
    for (const t of d.topics ?? []) if (!TOPIC[t]) problems.push(`${where}: unknown topic ${t}`);
    for (const l of Object.keys(d.lenses ?? {})) if (!LENSES.has(l)) problems.push(`${where}: unknown lens ${l}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.published)) problems.push(`${where}: published must be YYYY-MM-DD, got ${d.published}`);
    if (d.change && !CHANGES.has(d.change.kind)) problems.push(`${where}: unknown change kind ${d.change.kind}`);

    // People: one record per id, with every title a source gave.
    const entryPeople: Entry['people'] = [];
    for (const p of d.people ?? []) {
      const id = slugify(p.id || p.name);
      if (!ROLES.has(p.role)) problems.push(`${where}: unknown role ${p.role} for ${id}`);
      const rec = people.get(id) ?? { id, name: p.name, titles: [] };
      if (p.title && !rec.titles.some(t => t.title === p.title)) rec.titles.push({ title: p.title, entry: d.slug, on: d.published, role: p.role as Person['titles'][number]['role'] });
      people.set(id, rec);
      if (!entryPeople.some(e => e.id === id)) entryPeople.push({ id, role: p.role as Entry['people'][number]['role'], ...(p.title ? { title: p.title } : {}) });
    }

    // Quotations: checked again here; only what passes is kept.
    const quotes: Quote[] = [];
    if (d.quotes?.length) {
      const textPath = d.textFile ? join(dir, d.textFile) : '';
      if (!textPath || !existsSync(textPath)) {
        problems.push(`${where}: has quotations but its saved text is missing (${d.textFile})`);
      } else {
        let text = readFileSync(textPath, 'utf8');
        let offsets: { pos: number; start: number }[] | undefined;
        const tj = textPath.replace(/\.txt$/, '.transcript.json');
        if (existsSync(tj)) ({ text, offsets } = joinTranscript(JSON.parse(readFileSync(tj, 'utf8')).segments));
        // A second, independent transcript of the same audio, when one was made: a quotation must be in both.
        const second = secondTranscript(textPath);
        const textSha = sha(norm(text));
        const taken = new Set<string>();
        d.quotes.forEach(q => {
          const id = quoteId(d.id, q.text, taken);
          const v = verifyQuote(q.text, text, offsets, { sourceBrackets: !offsets });
          verification[id] = v.ok ? { ok: true, mode: v.mode, quoteSha: sha(q.text), textSha } : { ok: false, reason: v.reason, quoteSha: sha(q.text) };
          if (!v.ok) { dropped++; console.log(`  dropped ${id}: ${v.reason}`); return; }
          let agreement: { agreement: number; missing: string[] } | undefined;
          if (second !== undefined) {
            const o = secondOpinion(q.text, second);
            if (!o.ok) {
              verification[id] = { ok: false, reason: `second transcript: ${o.reason}`, quoteSha: sha(q.text) };
              dropped++; console.log(`  dropped ${id}: ${o.reason} (missing: ${o.missing.join(' ')})`); return;
            }
            agreement = { agreement: Math.round(o.agreement * 1000) / 1000, missing: o.missing };
            (verification[id] as Record<string, unknown>).second = agreement;
          }
          const speaker = slugify(q.speaker);
          if (!people.has(speaker) && !names[speaker]) names[speaker] = DISPLAY[speaker] ?? ([d.outlet, rawOutlet].some(o => slugify(o) === speaker) ? d.outlet : speaker.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '));
          quotes.push({
            id, text: q.text, speaker, speakerCertain: q.speakerCertain !== false,
            ...(q.context ? { context: q.context } : {}),
            ...(v.timestamp !== undefined ? { at: Math.floor(v.timestamp) } : {}),
            match: v.mode,
            ...(second !== undefined ? { second: true } : {}),
            ...(v.warnings.length ? { warnings: v.warnings } : {}),
            ...(CONFIRMED[id] ? { positions: CONFIRMED[id].filter(p => PROPS.has(p.q) && STANCES.has(p.stance)).map(p => ({ ...p, by: 'editor' })) as Quote['positions'] }
              : q.positions?.length ? { positions: q.positions.filter(p => PROPS.has(p.q) && STANCES.has(p.stance)).map(p => ({ ...p, by: 'machine' })) as Quote['positions'] } : {}),
          });
        });
      }
    }
    runQuotes += quotes.length;

    const via = items.get(d.id) ?? { source: 'unknown', tier: 3 as const };
    if (via.source === 'unknown') problems.push(`${where}: id ${d.id} is not an item of run ${run}`);
    entries.push({
      id: d.id, slug: d.slug, kind: d.kind, title: d.title, url: d.url, outlet: d.outlet, published: d.published,
      ...(d.minutes ? { minutes: d.minutes } : {}), ...(d.views ? { views: d.views } : {}),
      also: d.also ?? [], summary: d.summary, ...(d.change ? { change: d.change } : {}), lenses: d.lenses ?? {}, topics: d.topics ?? [], people: entryPeople,
      orgs: (d.orgs ?? []).map(slugify), quotes, importance: d.access === 'excerpt' ? (Math.min(d.importance, 2) as Entry['importance']) : d.importance, access: d.access, transcript: d.transcript ?? 'none',
      // Claude wrote the draft, so anything that names Anthropic or Claude is marked, whatever the agent said.
      conflict: !!d.conflict || (d.orgs ?? []).includes('anthropic') || /\banthropic\b|\bclaude\b/i.test(`${d.title} ${d.summary}`), run, via, review: { by: 'machine' }, ...(d.notes ? { notes: d.notes } : {}),
    });
    runEntries++;
  }
  const h = health.sources as Record<string, { ok: boolean }>;
  runs.push({
    run, from: health.from, to: health.to, ranAt: health.ranAt,
    sources: Object.keys(h).length, answered: Object.values(h).filter(s => s.ok).length,
    items: lines.length, kept: lines.filter(l => l.kept).length, entries: runEntries, quotes: runQuotes,
  });
}

// One entry per source across runs: a later run's reading replaces an earlier one, but the first slug stays,
// because a slug is a permalink.
const byId = new Map<string, Entry>();
for (const e of entries) {
  const prev = byId.get(e.id);
  if (prev) { console.log(`  ${e.id}: run ${e.run} replaces run ${prev.run}`); e.slug = prev.slug; }
  byId.set(e.id, e);
}
entries.splice(0, entries.length, ...byId.values());

// Slugs are permalinks: they must be unique.
const seen = new Set<string>();
for (const e of entries) {
  if (seen.has(e.slug)) problems.push(`duplicate slug ${e.slug}`);
  seen.add(e.slug);
}
entries.sort((a, b) => b.published.localeCompare(a.published) || b.importance - a.importance || a.slug.localeCompare(b.slug));
for (const p of people.values()) p.titles.sort((a, b) => b.on.localeCompare(a.on));

// Nothing on the site disappears by accident: compare with what is published now, by entry id and by each quotation's words.
const OUT = 'content/base';
const published = existsSync(`${OUT}/entries.json`) ? JSON.parse(readFileSync(`${OUT}/entries.json`, 'utf8')) as Entry[] : [];
const words = (e: Entry, q: Quote) => `${e.id}:${sha(norm(q.text))}`;
const nowEntries = new Set(entries.map(e => e.id));
const nowQuotes = new Set(entries.flatMap(e => e.quotes.map(q => words(e, q))));
const goneEntries = published.filter(e => !nowEntries.has(e.id)).map(e => e.slug);
const goneQuotes = published.filter(e => nowEntries.has(e.id)).flatMap(e => e.quotes.filter(q => !nowQuotes.has(words(e, q))).map(q => ({ entry: e.slug, text: q.text })));
const allow = process.argv.indexOf('--allow-removals');
const reason = allow > 0 ? process.argv[allow + 1]?.trim() : undefined;
if (allow > 0 && !reason) problems.push('--allow-removals needs a reason: --allow-removals "why these go"');
if ((goneEntries.length || goneQuotes.length) && !reason) {
  for (const slug of goneEntries) problems.push(`entry ${slug} is on the site but missing from this build (its run folder or entry file is gone?)`);
  for (const q of goneQuotes) problems.push(`a quotation in ${q.entry} is on the site but missing from this build: “${q.text.slice(0, 70)}…”`);
}

const q = entries.reduce((n, e) => n + e.quotes.length, 0);
console.log(`\n${entries.length} entries, ${people.size} people, ${q} quotations verified, ${dropped} dropped. ${problems.length} problems.`);
for (const p of problems) console.log('  PROBLEM ' + p);
if (problems.length) { console.log('Nothing written: content/base is unchanged.'); process.exit(1); }

const files: Record<string, unknown> = {
  'entries.json': entries,
  'people.json': [...people.values()].sort((a, b) => a.id.localeCompare(b.id)),
  'names.json': names,
  'runs.json': runs,
  'verification.json': verification,
};
if (goneEntries.length || goneQuotes.length) {
  const log = existsSync(`${OUT}/removals.json`) ? JSON.parse(readFileSync(`${OUT}/removals.json`, 'utf8')) as unknown[] : [];
  files['removals.json'] = [...log, { on: new Date().toISOString().slice(0, 10), reason, entries: goneEntries, quotations: goneQuotes }];
  console.log(`Removed on purpose (${reason}): ${goneEntries.length} entries, ${goneQuotes.length} quotations; logged in ${OUT}/removals.json.`);
}
// Write every file beside its target first, then swap them in, so a failure never leaves half a Base.
for (const [name, data] of Object.entries(files)) writeFileSync(`${OUT}/${name}.tmp`, JSON.stringify(data, null, 1) + '\n');
for (const name of Object.keys(files)) renameSync(`${OUT}/${name}.tmp`, `${OUT}/${name}`);
