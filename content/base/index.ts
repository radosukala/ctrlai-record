import type { Entry, Person, PropositionId, Stance, Story, TopicId } from './types';
import entriesJson from './entries.json';
import peopleJson from './people.json';
import namesJson from './names.json';
import runsJson from './runs.json';
import storiesJson from './stories.json';

export const ENTRIES = entriesJson as Entry[];
export const PEOPLE = peopleJson as Person[];
export const RUNS = runsJson as { run: string; from: string; to: string; ranAt: string; sources: number; answered: number; items: number; kept: number; entries: number; quotes: number; kind?: 'research'; label?: string }[];
/** The daily Radar's runs, without research passes (sources gathered for one question), and the newest of them. */
export const DAILY_RUNS = RUNS.filter(r => r.kind !== 'research');
export const LATEST_RUN = DAILY_RUNS[DAILY_RUNS.length - 1];
export const runOf = (run: string) => RUNS.find(r => r.run === run);
const NAMES = namesJson as Record<string, string>;
const PERSON = new Map(PEOPLE.map(p => [p.id, p]));

export const getEntry = (slug: string) => ENTRIES.find(e => e.slug === slug);

/** The newest day any entry carries, and the entries published in the seven days up to it (the front page's week). */
export const LATEST_DAY = ENTRIES.reduce((d, e) => (e.published > d ? e.published : d), '');
const daysBefore = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) - n * 864e5).toISOString().slice(0, 10);
export const recent = (days = 7, from = LATEST_DAY) => ENTRIES.filter(e => e.published > daysBefore(from, days) && e.published <= from);
export const WEEK = recent(7);
export const WEEK_FROM = WEEK.reduce((d, e) => (!d || e.published < d ? e.published : d), '');
/** This week's entries that changed something: new evidence, a decision, a commitment or a correction, most important
 *  first. Arguments and familiar ground are not changes. */
export const CHANGED_THIS_WEEK = WEEK.filter(e => e.change && !['argument', 'repeat'].includes(e.change.kind))
  .sort((a, b) => b.importance - a.importance || (b.access === 'excerpt' ? -1 : 0) - (a.access === 'excerpt' ? -1 : 0) || b.published.localeCompare(a.published));
/** An entry we could only read the description of: shown as a link on its story, not as an entry of its own. */
export const linkOnly = (e: Entry) => e.access === 'excerpt';
export const getPerson = (id: string) => PERSON.get(id);
export const isPerson = (id: string) => PERSON.has(id);
/** A speaker's display name: a person's name, or an organization's. */
export const nameOf = (id: string) => PERSON.get(id)?.name ?? NAMES[id] ?? id;

export const entriesFor = (personId: string) => ENTRIES.filter(e => e.people.some(p => p.id === personId));
export const quotesBy = (personId: string) =>
  ENTRIES.flatMap(e => e.quotes.filter(q => q.speaker === personId).map(q => ({ ...q, entry: e })));

/** The newest title from an entry where the person spoke or wrote; others describe them second-hand. */
export const currentTitle = (id: string) => {
  const titles = PERSON.get(id)?.titles ?? [];
  return (titles.find(t => t.role === 'speaker' || t.role === 'author') ?? titles[0])?.title;
};

export type OnRecord = { person: Person; entries: number; spoke: number; quotes: number; topics: TopicId[]; latest: string };
/**
 * Who is on the record: everyone who spoke or wrote in an entry, ranked by how often, then by checked quotations.
 * This counts presence in the sources we monitor. It says nothing about who is right.
 */
export function onRecord(entries: Entry[] = ENTRIES): OnRecord[] {
  const map = new Map<string, OnRecord>();
  for (const e of entries) {
    for (const p of e.people) {
      const person = PERSON.get(p.id);
      if (!person) continue;
      const r = map.get(p.id) ?? { person, entries: 0, spoke: 0, quotes: 0, topics: [], latest: e.published };
      r.entries++;
      // A reporter writing the news is not a voice in the debate; an author of an essay, a paper or a post is.
      if (p.role === 'speaker' || (p.role === 'author' && e.kind !== 'news')) r.spoke++;
      r.quotes += e.quotes.filter(q => q.speaker === p.id).length;
      for (const t of e.topics) if (!r.topics.includes(t)) r.topics.push(t);
      if (e.published > r.latest) r.latest = e.published;
      map.set(p.id, r);
    }
  }
  return [...map.values()]
    .filter(r => r.spoke > 0)
    .sort((a, b) => b.spoke - a.spoke || b.quotes - a.quotes || b.entries - a.entries || a.person.name.localeCompare(b.person.name));
}

/** Positions a person confirmed for this person's checked quotations, per proposition. Machine proposals stay hidden. */
export function positionsOf(personId: string) {
  const out = new Map<PropositionId, { stance: Stance; quote: string; entry: Entry; on: string }[]>();
  for (const q of quotesBy(personId)) {
    for (const p of (q.positions ?? []).filter(x => x.by === 'editor')) {
      const list = out.get(p.q) ?? [];
      list.push({ stance: p.stance, quote: q.text, entry: q.entry, on: q.entry.published });
      out.set(p.q, list);
    }
  }
  for (const list of out.values()) list.sort((a, b) => a.on.localeCompare(b.on));
  return out;
}

export const totals = () => ({
  entries: ENTRIES.length,
  read: ENTRIES.filter(e => e.access !== 'excerpt').length,
  quotes: ENTRIES.reduce((n, e) => n + e.quotes.length, 0),
  people: onRecord().length,
});

/** Stories: events or threads several entries cover. */
export const STORIES = storiesJson as Story[];
export const getStory = (id: string) => STORIES.find(s => s.id === id);
export const entriesOfStory = (id: string) => ENTRIES.filter(e => e.story === id);
