import type { Entry, Person, PropositionId, Stance, TopicId } from './types';
import entriesJson from './entries.json';
import peopleJson from './people.json';
import namesJson from './names.json';
import runsJson from './runs.json';

export const ENTRIES = entriesJson as Entry[];
export const PEOPLE = peopleJson as Person[];
export const RUNS = runsJson as { run: string; from: string; to: string; ranAt: string; sources: number; answered: number; items: number; kept: number; entries: number; quotes: number }[];
const NAMES = namesJson as Record<string, string>;
const PERSON = new Map(PEOPLE.map(p => [p.id, p]));

export const getEntry = (slug: string) => ENTRIES.find(e => e.slug === slug);
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

/** Machine-proposed positions from a person's checked quotations, per proposition. Never shown as a verdict. */
export function positionsOf(personId: string) {
  const out = new Map<PropositionId, { stance: Stance; quote: string; entry: Entry; on: string }[]>();
  for (const q of quotesBy(personId)) {
    for (const p of q.positions ?? []) {
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
