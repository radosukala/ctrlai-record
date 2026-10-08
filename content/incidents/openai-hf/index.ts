import type { Ev, Precision, Zone } from './types';
import { EVENTS } from './events';
import { QUOTES } from './quotes';

export * from './types';
export { SOURCES, SOURCE_LIST, FURTHER } from './sources';
export { QUOTES, QUOTE_BY_ID } from './quotes';
export { AGENTS, AGENT_BY_ID, GROUPS, LINKS } from './agents';
export { ACCOUNTS, AFTER, COUNTERS, COUNTER_LABEL, NUMBERS, TERMS, TERM_BY_ID, UNKNOWNS } from './facts';
export { EVENTS };

export const CHAPTERS = [
  { n: 1 as const, title: 'A note in the hallway', range: 'April 20 – July 7', blurb: 'In training, agents find a way to leave each other messages, then a way out to the internet. OpenAI rebuilds the cache, and the board disappears.' },
  { n: 2 as const, title: 'The second board', range: 'July 7 – 13', blurb: 'The board is back within a day. Tens of thousands of agents on a test with impossible tasks organise, then turn on Hugging Face.' },
  { n: 3 as const, title: 'OpenAI’s own systems', range: 'July 9 – 20', blurb: 'Agents go after OpenAI’s own package cache and cluster. Only OpenAI’s account covers July 13–20.' },
  { n: 4 as const, title: 'The people', range: 'May 26 – August 26', blurb: 'Who noticed what, and when, on each side, and what each company published.' },
];

export const ZONES: { id: Zone; label: string; sub: string }[] = [
  { id: 'sandbox', label: 'The agent’s sandbox', sub: 'Meant to be isolated from other agents and the internet' },
  { id: 'cache', label: 'OpenAI’s package cache', sub: 'Shared, and agents were allowed to use it' },
  { id: 'internet', label: 'The open internet', sub: 'Meant to be unreachable from the sandbox' },
  { id: 'steps', label: 'Other people’s accounts and sandboxes', sub: 'Stepping stones outside OpenAI' },
  { id: 'hf', label: 'Hugging Face', sub: 'The company the agents attacked' },
  { id: 'oai', label: 'OpenAI’s research cluster', sub: 'Its own servers and secrets' },
];

/** Events in time order, with ties broken by the order they were written. */
export const TIMELINE: Ev[] = [...EVENTS].sort((a, b) => a.t.localeCompare(b.t));

/** The steps the replay walks through. Fine print (tier 3) is left out unless asked for. */
export function stepsFor(includeFinePrint: boolean): Ev[] {
  return TIMELINE.filter(e => includeFinePrint || e.tier < 3);
}

export const TIME_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** "Jul 11, 16:07 UTC"; "Jul 11, about 06:00 UTC" when a source says "about"; or just "Jul 11" when it gives no time. */
export function formatWhen(a: { t: string; until?: string; precision: Precision; approx?: boolean }): string {
  const d = new Date(a.t);
  const day = TIME_FMT.format(d);
  if (a.precision === 'day' || a.precision === 'range') {
    const end = a.until ? TIME_FMT.format(new Date(a.until)) : day;
    return end === day ? day : `${day} – ${end}`;
  }
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  if (a.precision === 'hour') return `${day}, about ${hh}:00 UTC`;
  return `${day}, ${a.approx ? 'about ' : ''}${hh}:${mm} UTC`;
}

export const when = (e: Ev): string => formatWhen(e);

export type ZoneState = { state: 'untouched' | 'touched' | 'breached'; since?: string; events: number };

/** What each station looks like after step `i` of the given steps. */
export function zoneStates(steps: Ev[], i: number): Record<Zone, ZoneState> {
  const out = Object.fromEntries(ZONES.map(z => [z.id, { state: 'untouched', events: 0 } as ZoneState])) as Record<Zone, ZoneState>;
  for (const e of steps.slice(0, i + 1)) {
    if (!e.zone || e.effect === 'held') continue;
    const z = out[e.zone];
    z.events++;
    if (e.effect === 'breach' && z.state !== 'breached') { z.state = 'breached'; z.since = e.t; }
    else if (z.state === 'untouched') { z.state = 'touched'; z.since = z.since ?? e.t; }
  }
  return out;
}

/**
 * Where a quotation belongs in the story. `at` is its own time or day when a source gives one. `t` is where it sorts: its own
 * time, or, if only a day is known, the time of the first event that cites it on that day, or else the end of that day (so
 * it never appears before it could have been written). A quotation with no time of its own may be labelled only with the day
 * of the event that cites it.
 */
export const QUOTE_WHEN: Record<string, { t: string; at?: string }> = (() => {
  const first = new Map<string, Ev>();
  for (const e of EVENTS) for (const id of e.quotes ?? []) { const f = first.get(id); if (!f || e.t < f.t) first.set(id, e); }
  const out: Record<string, { t: string; at?: string }> = {};
  for (const q of QUOTES) {
    const e = first.get(q.id);
    if (q.at?.includes('T')) out[q.id] = { t: q.at, at: q.at };
    else if (q.at) out[q.id] = { t: e && e.t.startsWith(q.at) ? e.t : `${q.at}T23:59:59Z`, at: q.at };
    else if (e) out[q.id] = { t: e.t };
  }
  return out;
})();
