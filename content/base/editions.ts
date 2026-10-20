import type { ChangeKind, ClaimType, Entry, Quote, TopicId } from './types';
import type { Group } from '../registry/types';
import { DAILY_RUNS, ENTRIES, LATEST_DAY, STORIES, WEEK, isPerson, linkOnly } from './index';
import { TOPICS } from './taxonomy';
import { groupAt } from '../registry';
import { BRIEFS, visible as briefVisible } from '../decisions';
import type { DecisionBrief } from '../decisions/types';
import { LINES } from './edition-lines';
import { momentFor } from './moments';

/**
 * Editions: the Base read by time. Today (one Radar run), this week (the seven days up to the newest entry) and this
 * month, each in the same sections and the same order, so a reader learns the page once and only the counts change.
 *
 * Everything here is computed from the entries' own fields: what kind of change an entry is, its importance and story,
 * its lens lines, and each quotation's type, hand and speaker. The only words written for an edition are its headline
 * (edition-lines.ts); an edition without one leads with its top change. The rules are short enough to print on the
 * page, and the page prints them.
 */

export type Horizon = 'day' | 'week' | 'month';

/** What counts as a change: something decided, found, corrected or promised. Arguments and familiar ground don't. */
export const CHANGING: ChangeKind[] = ['decision', 'evidence', 'correction', 'commitment'];
const RANK: Record<ChangeKind, number> = { decision: 4, evidence: 3, correction: 3, commitment: 2, argument: 1, repeat: 0 };

/** How much a speaker's words weigh in "Said": the power to act on them, or first-hand knowledge, comes first. */
const WEIGHT: Record<Group, number> = {
  'politician': 5, 'government-official': 5, 'regulator': 5, 'ai-developer-leader': 5, 'international-official': 4,
  'ai-developer-staff': 4, 'former-ai-developer-staff': 4, 'academic': 3, 'public-researcher': 3, 'nonprofit-researcher': 3,
  'think-tank': 3, 'tech-industry': 3, 'advocate': 2, 'business': 2, 'investor': 2, 'civil-society': 2, 'journalist': 1, 'other': 1,
};
const TYPE_WEIGHT: Partial<Record<ClaimType, number>> = { commitment: 6, account: 6, prediction: 4, proposal: 4, finding: 3, position: 2, factual: 2, value: 1 };

/** A quotation an edition can show: the checker found it, the speaker is certain, no warnings, short enough to read. */
export const usable = (q: Quote) => q.speakerCertain && !q.warnings?.length && q.text.length >= 50 && q.text.length <= 260;

/** The group a person spoke as, on the day they said it. Organizations and outlets have none. */
export const speakerGroup = (q: Quote, e: Entry): Group | undefined => (isPerson(q.speaker) ? groupAt(q.speaker, q.said ?? e.published) : undefined);

/** How much a quotation weighs when an edition (or the day's post) picks one: the speaker's power or first-hand
 *  knowledge, the entry's importance, what kind of claim it is, and whether it is the speaker's own text. */
export function quoteWeight(q: Quote, e: Entry) {
  const g = speakerGroup(q, e);
  return (g ? WEIGHT[g] : 1) * 10 + e.importance * 6 + (q.type ? TYPE_WEIGHT[q.type] ?? 0 : 0) + (q.hand === 'first' ? 5 : 0) - (isPerson(q.speaker) ? 0 : 25);
}

/** The quotation that best carries an entry: a person with power or first-hand knowledge, in their own words, first. */
export function bestQuote(e: Entry, skip: Set<string> = new Set()): Quote | undefined {
  return e.quotes.filter(q => usable(q) && !skip.has(q.speaker)).sort((a, b) => quoteWeight(b, e) - quoteWeight(a, e))[0];
}

export type Pick = { e: Entry; q?: Quote };
export type Said = { e: Entry; q: Quote; group?: Group };
export type Thread = { id: string; title: string; first: string; last: string; entries: Entry[] };
export type Deadline = { date: string; text: string; brief: DecisionBrief };

export type Counts = { changes: number; heard: number; said: number; watch: number; research: number; threads: number; decided: number };
export const COUNTS: Record<Horizon, Counts> = {
  day: { changes: 3, heard: 3, said: 3, watch: 3, research: 5, threads: 5, decided: 6 },
  week: { changes: 5, heard: 6, said: 6, watch: 5, research: 5, threads: 8, decided: 8 },
  month: { changes: 8, heard: 6, said: 8, watch: 6, research: 8, threads: 10, decided: 10 },
};

export type Edition = {
  horizon: Horizon;
  /** Matches a written headline in edition-lines.ts. */
  key: string;
  /** The days the edition covers, as YYYY-MM-DD. */
  from: string;
  to: string;
  /** For a day: the Radar run it comes from. */
  run?: (typeof DAILY_RUNS)[number];
  line: string;
  written: boolean;
  entries: Entry[];
  changes: Pick[];
  heard: Said[];
  said: Said[];
  watch: Pick[];
  watchAll: number;
  watchRead: number;
  research: Entry[];
  researchAll: number;
  decided: Entry[];
  threads: Thread[];
  rest: { topic: TopicId; entries: Entry[] }[];
  numbers: { entries: number; read: number; quotes: number; outlets: number; people: number };
};

const newestFirst = (a: Entry, b: Entry) => b.published.localeCompare(a.published);

/** What changed: decisions, new evidence, corrections and commitments we read in full, most important first, one per story. */
export function changesOf(entries: Entry[], n: number, used = new Set<string>()): Pick[] {
  const pool = entries
    .filter(e => e.change && CHANGING.includes(e.change.kind) && !linkOnly(e))
    .sort((a, b) => b.importance - a.importance || RANK[b.change!.kind] - RANK[a.change!.kind]
      || Number(a.access !== 'full') - Number(b.access !== 'full') || newestFirst(a, b));
  const out: Pick[] = [];
  const stories = new Set<string>();
  for (const e of pool) {
    if (e.story && stories.has(e.story)) continue;
    const q = bestQuote(e, used);
    if (q) used.add(q.speaker);
    if (e.story) stories.add(e.story);
    out.push({ e, q });
    if (out.length === n) break;
  }
  return out;
}

/** Said: one checked quotation per person, from entries that matter, weighted toward power and first-hand knowledge,
 *  and at most two from any one group, so the mix of voices shows. */
export function saidOf(
  entries: Entry[],
  n: number,
  skip = new Set<string>(),
  opts: { only?: (q: Quote) => boolean; perGroup?: number; minImportance?: number; capOther?: boolean } = {},
): Said[] {
  const { only = () => true, perGroup = 2, minImportance = 2, capOther = true } = opts;
  const pool: { s: number; e: Entry; q: Quote; group?: Group }[] = [];
  for (const e of entries) {
    if (e.importance < minImportance) continue;
    for (const q of e.quotes) if (usable(q) && isPerson(q.speaker) && only(q)) pool.push({ s: quoteWeight(q, e), e, q, group: speakerGroup(q, e) });
  }
  pool.sort((a, b) => b.s - a.s || newestFirst(a.e, b.e));
  const out: Said[] = [];
  const people = new Set(skip);
  const groups = new Map<string, number>();
  for (const { e, q, group } of pool) {
    const g = group ?? 'other';
    if (people.has(q.speaker) || ((capOther || g !== 'other') && (groups.get(g) ?? 0) >= perGroup)) continue;
    out.push({ e, q, group });
    people.add(q.speaker);
    groups.set(g, (groups.get(g) ?? 0) + 1);
    if (out.length === n) break;
  }
  return out;
}

/** Words in capitals are an auto-caption's, and look like shouting on a page. */
const shouting = (text: string) => text === text.toUpperCase() && /[A-Z]/.test(text);

/** Heard: the same rule as Said, from the quotations we can play (a moment in a recording's captions), so the page
 *  can show the person saying it. Entries of any importance qualify, because a person on video is rare; the weights
 *  still put the ones that matter first. Unknown speakers aren't capped as a group. Taken before Said, so a person is
 *  quoted once. */
export const heardOf = (entries: Entry[], n: number, skip = new Set<string>()): Said[] =>
  saidOf(entries, n, skip, { only: q => Boolean(momentFor(q.id)) && !shouting(q.text), perGroup: 3, minImportance: 1, capOther: false });

/** Watch and listen: interviews and talks we read in full (captions or a transcript), by importance, then by reach.
 *  A quotation already shown higher up the edition isn't shown again; the interview then goes without one. */
export function watchOf(entries: Entry[], n: number, shownQuotes = new Set<string>()) {
  const all = entries.filter(e => e.kind === 'video' || e.kind === 'podcast');
  const read = all.filter(e => !linkOnly(e)).sort((a, b) => b.importance - a.importance || (b.views ?? 0) - (a.views ?? 0));
  const pick = (e: Entry) => e.quotes.filter(q => usable(q) && !shownQuotes.has(q.id)).sort((a, b) => quoteWeight(b, e) - quoteWeight(a, e))[0];
  return { picks: read.slice(0, n).map(e => ({ e, q: pick(e) })), all: all.length, read: read.length };
}

/** New research: papers and reports, the ones we read in full first. */
export function researchOf(entries: Entry[], n: number) {
  const all = entries.filter(e => e.kind === 'research');
  const sorted = [...all].sort((a, b) => b.importance - a.importance || Number(linkOnly(a)) - Number(linkOnly(b)) || b.quotes.length - a.quotes.length || newestFirst(a, b));
  return { picks: sorted.slice(0, n), all: all.length };
}

/** Decided and promised: what someone with the power to act did or committed to, and what was corrected. */
export function decidedOf(entries: Entry[]): Entry[] {
  return entries
    .filter(e => e.change && ['decision', 'commitment', 'correction'].includes(e.change.kind))
    .sort((a, b) => RANK[b.change!.kind] - RANK[a.change!.kind] || b.importance - a.importance || newestFirst(a, b));
}

/** Stories that ran on: events several entries cover, as one thread across days and outlets. */
export function threadsOf(entries: Entry[], n: number): Thread[] {
  const by = new Map<string, Entry[]>();
  for (const e of entries) if (e.story) by.set(e.story, [...(by.get(e.story) ?? []), e]);
  return [...by.entries()]
    .map(([id, list]) => {
      const sorted = [...list].sort((a, b) => a.published.localeCompare(b.published));
      return { id, title: STORIES.find(s => s.id === id)?.title ?? id, first: sorted[0].published, last: sorted[sorted.length - 1].published, entries: sorted, imp: Math.max(...list.map(e => e.importance)) };
    })
    .sort((a, b) => b.imp - a.imp || b.entries.length - a.entries.length || a.first.localeCompare(b.first))
    .slice(0, n)
    .map(({ imp: _imp, ...t }) => t);
}

/** Dated decisions still ahead, from the published decision briefs. */
export function comingUp(after: string): Deadline[] {
  return BRIEFS.filter(briefVisible)
    .flatMap(brief => brief.deadlines.filter(d => d.date >= after).map(d => ({ date: d.date, text: d.text, brief })))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const NUMBER = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (month: string) => MONTH_NAMES[Number(month.slice(5, 7)) - 1];
/** "Oct 9–15", or "Sep 28 – Oct 4" across two months. */
export function spanLabel(from: string, to: string) {
  const short = (d: string) => `${monthName(d).slice(0, 3)} ${Number(d.slice(8, 10))}`;
  if (from === to) return short(from);
  return from.slice(0, 7) === to.slice(0, 7) ? `${short(from)}–${Number(to.slice(8, 10))}` : `${short(from)} – ${short(to)}`;
}

function lineFor(horizon: Horizon, key: string, changes: Pick[], month?: string): { line: string; written: boolean } {
  if (LINES[key]) return { line: LINES[key], written: true };
  if (horizon === 'day') {
    return { line: changes[0]?.e.change?.note ?? 'No decisions, new evidence or commitments in this run: only arguments and familiar ground.', written: false };
  }
  if (horizon === 'week') return { line: `${NUMBER[changes.length] ?? changes.length} ${changes.length === 1 ? 'thing' : 'things'} that changed in AI safety and control this week`, written: false };
  return { line: `What changed in AI safety and control in ${monthName(month!)}`, written: false };
}

function build(horizon: Horizon, key: string, entries: Entry[], from: string, to: string, extra: { run?: Edition['run']; month?: string } = {}): Edition {
  const c = COUNTS[horizon];
  const used = new Set<string>();
  const changes = changesOf(entries, c.changes, used);
  const heard = heardOf(entries, c.heard, used);
  for (const h of heard) used.add(h.q.speaker);
  const said = saidOf(entries, c.said, used);
  const watch = watchOf(entries, c.watch, new Set([...changes.flatMap(p => (p.q ? [p.q.id] : [])), ...heard.map(h => h.q.id), ...said.map(s => s.q.id)]));
  const research = researchOf(entries, c.research);
  const shown = new Set([...changes.map(p => p.e.slug), ...watch.picks.map(p => p.e.slug), ...research.picks.map(e => e.slug)]);
  const rest = TOPICS.map(t => ({
    topic: t.id,
    entries: entries.filter(e => !shown.has(e.slug) && (e.topics[0] ?? 'where-it-goes') === t.id)
      .sort((a, b) => b.importance - a.importance || Number(linkOnly(a)) - Number(linkOnly(b)) || newestFirst(a, b)),
  })).filter(g => g.entries.length);
  const { line, written } = lineFor(horizon, key, changes, extra.month);
  return {
    horizon, key, from, to, run: extra.run, line, written, entries, changes, heard, said,
    watch: watch.picks, watchAll: watch.all, watchRead: watch.read,
    research: research.picks, researchAll: research.all,
    decided: decidedOf(entries).slice(0, c.decided),
    threads: threadsOf(entries, c.threads),
    rest,
    numbers: {
      entries: entries.length,
      read: entries.filter(e => !linkOnly(e)).length,
      quotes: entries.reduce((n, e) => n + e.quotes.length, 0),
      outlets: new Set(entries.map(e => e.outlet)).size,
      people: new Set(entries.flatMap(e => e.people.filter(p => (p.role === 'speaker' || p.role === 'author') && isPerson(p.id)).map(p => p.id))).size,
    },
  };
}

/** Every daily run, oldest first: each is a day's edition with a permanent address, /day/<run>. */
export const DAYS = DAILY_RUNS.map(r => r.run);
export const LATEST_DAY_RUN = DAYS[DAYS.length - 1];
/** The months the daily Radar has run in: each has a permanent address, /month/<YYYY-MM>. */
export const MONTHS = [...new Set(DAYS.map(d => d.slice(0, 7)))];

export function dayEdition(run: string): Edition | undefined {
  const r = DAILY_RUNS.find(x => x.run === run);
  if (!r) return undefined;
  return build('day', `day:${run}`, ENTRIES.filter(e => e.run === run), r.from, r.to, { run: r });
}

export function weekEdition(): Edition {
  const from = WEEK.reduce((d, e) => (!d || e.published < d ? e.published : d), '');
  return build('week', `week:${LATEST_DAY}`, WEEK, from, LATEST_DAY);
}

export function monthEdition(month: string): Edition {
  const entries = ENTRIES.filter(e => e.published.startsWith(month));
  const last = entries.reduce((d, e) => (e.published > d ? e.published : d), '');
  return build('month', `month:${month}@${last}`, entries, `${month}-01`, last, { month });
}

/** The day before and after a day's edition, for "previous" and "next". */
export function neighbors(run: string) {
  const i = DAYS.indexOf(run);
  return { prev: i > 0 ? DAYS[i - 1] : undefined, next: i >= 0 && i < DAYS.length - 1 ? DAYS[i + 1] : undefined };
}
