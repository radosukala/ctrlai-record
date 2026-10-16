import { currentTitle, isPerson, nameOf } from '@/content/base';
import { DAYS, dayEdition, quoteWeight, speakerGroup, usable, type Edition } from '@/content/base/editions';
import { CHANGE_LABEL, TOPIC } from '@/content/base/taxonomy';
import type { Entry, Quote } from '@/content/base/types';
import { GROUP_LABEL } from '@/content/registry';
import type { Group } from '@/content/registry/types';
import { SITE, longDate, shortDate } from '@/lib/site';
import { LINKEDIN_LIMIT, X_LIMIT, firstSentence, xLength } from '@/lib/social';
import type { QuoteCardProps, TodayItem } from '@/lib/og';

/**
 * The day's posts for X and LinkedIn, drafted from the day's edition (content/base/editions.ts) after the morning run.
 * Nothing here posts anywhere: scripts/social-day.tsx writes the text and the cards to a folder, and a person posts.
 *
 * One checked thing a day: a named person's words, their role, where and when, found word for word in the source, and
 * a link to the record. The rules for choosing the quotation are below, short enough to say in a sentence each.
 */

/** Days a person isn't quoted again, and how many of the last days' quotations may come from one group. */
export const REST_DAYS = 6;
export const PER_GROUP = 2;
export const CARD_MAX = 220;

export const DISCLOSURE = 'About Anthropic. Ctrl AI is written with Claude, made by Anthropic; same rules for every company.';

/** Automatic captions arrive in capitals and without speaker names: those words don't go on a card. */
const shouting = (text: string) => {
  const letters = text.replace(/[^A-Za-z]/g, '');
  return letters.length > 0 && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.5;
};

/** Our notes say the text we saved is another outlet's (a paywall, a 403): then "as quoted in" the entry's outlet is wrong. */
export const readElsewhere = (e: Entry) => /\b(saved text is|read (through|via)|returned 403|via the [A-Z])/i.test(e.notes ?? '');

/** Can this quotation be the day's card? Checked, a named person, their own clear words, short enough to read. Words
 *  quoted second-hand only when we read that outlet's own text in full, so "as quoted in" names the right outlet. */
export function cardable(q: Quote, e: Entry): boolean {
  if (q.hand === 'reported' && (e.access !== 'full' || readElsewhere(e))) return false;
  return usable(q) && isPerson(q.speaker) && q.text.length <= CARD_MAX && e.importance >= 2 && e.transcript !== 'auto' && !shouting(q.text);
}

/** A source we read as text or an official transcript, not a summary of one. */
const sourceBonus = (e: Entry) => (e.access === 'full' && (e.transcript === 'official' || e.transcript === 'none') ? 4 : 0);
/** Our own note says we couldn't verify what the words claim: the day's card shouldn't spread that. */
const unverified = (q: Quote) => /\b(not verified|unverified|could not (be )?(check|verif))/i.test(q.context ?? '');

/* Many people in the Base have no record in the registry yet, so their group is unknown. Until they do, the title the
   source gave them stands in: an office or a company's leadership weighs like one, a researcher's post like one. */
const POWER = /\b(minister|secretary|senator|congress\w*|representative|MP|member of parliament|chair\w*|commissioner|attorney general|governor|president|chancellor|lord|baroness|mayor|ceo|chief executive|regulator|director)\b/i;
const EXPERT = /\b(professor|researcher|scientist|economist|fellow)\b/i;
const PRESS = /\b(reporter|journalist|correspondent|editor|columnist|host|anchor|writer)\b/i;
const titleOf = (q: Quote) => (isPerson(q.speaker) ? currentTitle(q.speaker) ?? '' : '');
function stand(q: Quote, e: Entry, group?: Group) {
  const title = titleOf(q);
  if (group && group !== 'other') return { known: group !== 'journalist' && !PRESS.test(title), boost: 0 };
  if (PRESS.test(title)) return { known: false, boost: 0 };
  if (POWER.test(title)) return { known: true, boost: 40 };
  if (EXPERT.test(title)) return { known: true, boost: 20 };
  return { known: false, boost: 0 };
}

/** `tier` is the rule that let it in (0 = the strictest), so a repeat or a fallback can be seen and tested. */
export type DayQuote = { e: Entry; q: Quote; group?: Group; tier?: number };

/**
 * The day's quotations in order, one per person, by tiers and the heaviest first within each (the editions' weight,
 * plus a little for text we read in full):
 *   1. a person's own words, nothing our notes flag as unverified, someone in a known public role, not quoted in the
 *      last REST_DAYS days, from a group with fewer than PER_GROUP of those days' quotations;
 *   2. the same words as quoted by the source we read in full (leaders are mostly quoted, not published);
 *   3. tiers 1 and 2 without the group limit, then even if the person was quoted in the last days;
 *   4. any quotation that can go on a card at all.
 * The first is the card; the next two are offered as alternatives. None means no card that day.
 */
export function rankQuotes(ed: Edition, earlier: DayQuote[] = []): DayQuote[] {
  const recent = earlier.slice(-REST_DAYS);
  const people = new Set(recent.map(p => p.q.speaker));
  const groups = new Map<string, number>();
  for (const p of recent) groups.set(p.group ?? 'other', (groups.get(p.group ?? 'other') ?? 0) + 1);
  const pool = ed.entries
    .flatMap(e => e.quotes.filter(q => cardable(q, e)).map(q => {
      const group = speakerGroup(q, e);
      const s = stand(q, e, group);
      return { e, q, group, known: s.known, w: quoteWeight(q, e) + s.boost + sourceBonus(e) };
    }))
    .sort((a, b) => b.w - a.w || b.e.published.localeCompare(a.e.published) || a.q.id.localeCompare(b.q.id));
  type C = (typeof pool)[number];
  const sound = (c: C) => c.known && !unverified(c.q);
  const own = (c: C) => sound(c) && c.q.hand !== 'reported';
  const quoted = (c: C) => sound(c) && c.q.hand === 'reported' && c.e.access === 'full';
  const fresh = (c: C) => !people.has(c.q.speaker);
  const roomy = (c: C) => (groups.get(c.group ?? 'other') ?? 0) < PER_GROUP;
  const tiers: ((c: C) => boolean)[] = [
    c => own(c) && fresh(c) && roomy(c),
    c => quoted(c) && fresh(c) && roomy(c),
    c => own(c) && fresh(c),
    c => quoted(c) && fresh(c),
    c => own(c) || quoted(c),
    c => fresh(c),
    () => true,
  ];
  const out: DayQuote[] = [];
  const seen = new Set<string>();
  tiers.forEach((tier, i) => {
    for (const c of pool) {
      if (!tier(c) || seen.has(c.q.speaker)) continue;
      seen.add(c.q.speaker);
      out.push({ e: c.e, q: c.q, group: c.group, tier: i });
    }
  });
  return out;
}

export const pickQuote = (ed: Edition, earlier: DayQuote[] = []): DayQuote | undefined => rankQuotes(ed, earlier)[0];

/** The day's quotations for a run (the card first, then the alternatives), with the earlier days' picks worked out the
 *  same way, so the rules hold across days without any stored state. */
export function quotesOfTheDay(run: string): DayQuote[] {
  const i = DAYS.indexOf(run);
  if (i < 0) return [];
  const chain: DayQuote[] = [];
  for (const day of DAYS.slice(Math.max(0, i - REST_DAYS), i)) {
    const pick = pickQuote(dayEdition(day)!, chain);
    if (pick) chain.push(pick);
  }
  return rankQuotes(dayEdition(run)!, chain);
}
export const quoteOfTheDay = (run: string): DayQuote | undefined => quotesOfTheDay(run)[0];

/** A link back to the site that says where the visit came from, as the weekly kit does. */
export function link(path: string, source: 'x' | 'linkedin', run: string, hash = ''): string {
  const url = new URL(path, SITE.url);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set('utm_campaign', `day-${run}`);
  if (hash) url.hash = hash;
  return url.toString();
}

/** A role as the sources gave it, without our own provenance notes ("…, per ControlAI"). */
const role = (id: string) => currentTitle(id)?.replace(/,\s*per\s+[^,]+$/i, '');
const weekday = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
const said = (p: DayQuote) => p.q.said ?? p.e.published;
/** First-hand words were said there; a reporter's quotation was printed there. */
const reported = (p: DayQuote) => p.q.hand === 'reported' || (p.q.said !== undefined && p.q.said !== p.e.published);

export function quoteCard(p: DayQuote, size: QuoteCardProps['size']): QuoteCardProps {
  return {
    size,
    label: reported(p) ? `Quoted by ${p.e.outlet} · ${shortDate(p.e.published)}, ${p.e.published.slice(0, 4)}` : `Said · ${shortDate(said(p))}, ${said(p).slice(0, 4)}`,
    quote: p.q.text,
    who: nameOf(p.q.speaker),
    role: role(p.q.speaker),
    source: reported(p) ? `As quoted in ${p.e.outlet}, ${longDate(p.e.published)}` : `${p.e.outlet}, ${longDate(said(p))}`,
    context: p.q.context,
    question: size === 'linkedin' ? TOPIC[p.e.topics[0]]?.question : undefined,
    disclosure: p.e.conflict ? DISCLOSURE : undefined,
  };
}

/** A quotation's whole sentences, not breaking at "Mr." or "U.S.". */
export function sentences(text: string): string[] {
  const out: string[] = [];
  let rest = text.replace(/\s+/g, ' ').trim();
  for (let s = firstSentence(rest); s && s.length < rest.length; s = firstSentence(rest)) {
    out.push(s);
    rest = rest.slice(s.length).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/** The X post for the day's quotation. The words are on the card; the text says who, where and when. The link goes in
 *  the first reply. */
export function xQuotePost(p: DayQuote, run: string): { text: string; reply: string } {
  const who = [nameOf(p.q.speaker), role(p.q.speaker)].filter(Boolean).join(', ');
  const where = reported(p) ? `as quoted by ${p.e.outlet} (${shortDate(p.e.published)})` : `${p.e.outlet}, ${shortDate(said(p))}`;
  const tail = `Checked word for word against the source. Link below.${p.e.conflict ? '\n\nCtrl AI is written with Claude (Anthropic).' : ''}`;
  // The quotation in the text if it fits; else its last whole sentence, then its first (still word for word, and the
  // card carries all of it); else our line of context.
  const parts = sentences(p.q.text);
  const options = [
    `${who}, ${where}:\n\n“${p.q.text}”\n\n${tail}`,
    ...(parts.length > 1 ? [parts[parts.length - 1], parts[0]].map(s => `${who}, ${where}:\n\n“${s}”\n\n${tail}`) : []),
    ...(p.q.context ? [`${who}, ${where}.\n\n${p.q.context}\n\n${tail}`] : []),
    `${who}, ${where}.\n\n${tail}`,
  ];
  const text = options.find(o => xLength(o) <= X_LIMIT) ?? options[options.length - 1];
  return { text, reply: link(`/base/${p.e.slug}`, 'x', run, p.q.id) };
}

/** The LinkedIn version of the quotation post, with the link in the first comment. */
export function linkedinQuotePost(p: DayQuote, run: string): { text: string; comment: string } {
  const who = [nameOf(p.q.speaker), role(p.q.speaker)].filter(Boolean).join(', ');
  const where = reported(p) ? `as quoted by ${p.e.outlet} on ${longDate(p.e.published)}` : `${p.e.outlet}, ${longDate(said(p))}`;
  const lines = [`${who}, ${where}:`, '', `“${p.q.text}”`];
  if (p.q.context) lines.push('', p.q.context);
  lines.push('', 'Every quotation in the record is checked word for word against its source. The entry is in the first comment.');
  if (p.e.conflict) lines.push('', 'Ctrl AI is written with Claude, made by Anthropic. Same rules for every company.');
  return { text: lines.join('\n'), comment: link(`/base/${p.e.slug}`, 'linkedin', run, p.q.id) };
}

/** What changed today: the edition's changes, in our words, for the LinkedIn card and post. */
export function todayItems(ed: Edition): TodayItem[] {
  return ed.changes.slice(0, 3).map(({ e }) => ({ kind: CHANGE_LABEL[e.change!.kind], outlet: e.outlet, note: e.change!.note }));
}

/** When any of the day's changes is about Anthropic or Claude. Not counted: the flag says an entry touches Anthropic,
 *  not that the story is about it. */
export function todayDisclosure(ed: Edition): string | undefined {
  return ed.changes.slice(0, 3).some(p => p.e.conflict) ? 'Ctrl AI is written with Claude, made by Anthropic, which is in today’s news; same rules for every company.' : undefined;
}

export function linkedinTodayPost(ed: Edition, run: string): { text: string; comment: string } | undefined {
  const items = todayItems(ed);
  if (!items.length) return undefined;
  const lines = [`What changed today in AI safety and control, ${weekday(run)}, ${longDate(run)}:`, ''];
  items.forEach((item, i) => lines.push(`${i + 1}. ${item.note}`));
  lines.push('', 'Every quotation in the record is checked word for word against its source. Today’s edition is in the first comment.');
  const disclosure = todayDisclosure(ed);
  if (disclosure) lines.push('', disclosure.replace('; same rules', '. Same rules'));
  return { text: lines.join('\n'), comment: link(`/day/${run}`, 'linkedin', run) };
}

export type DayKit = {
  run: string;
  date: string;
  quote?: DayQuote;
  /** The next two quotations, for the editor to choose instead. */
  alternatives: DayQuote[];
  x?: { text: string; reply: string; length: number };
  linkedinQuote?: { text: string; comment: string; length: number };
  linkedinToday?: { text: string; comment: string; length: number };
};

export function dayKit(run: string): DayKit | undefined {
  const ed = dayEdition(run);
  if (!ed) return undefined;
  const [quote, ...rest] = quotesOfTheDay(run);
  const x = quote ? xQuotePost(quote, run) : undefined;
  const lq = quote ? linkedinQuotePost(quote, run) : undefined;
  const lt = linkedinTodayPost(ed, run);
  return {
    run,
    date: `${weekday(run)}, ${longDate(run)}`,
    quote,
    alternatives: rest.slice(0, 2),
    x: x && { ...x, length: xLength(x.text) },
    linkedinQuote: lq && { ...lq, length: lq.text.length },
    linkedinToday: lt && { ...lt, length: lt.text.length },
  };
}

/** The kit as one Markdown file: what to post, what to attach, and where the link goes. */
export function postsMarkdown(kit: DayKit): string {
  const out = [`# Posts for ${kit.date}`, '', 'Drafts only: nothing is posted. Read each one before posting.', ''];
  if (kit.x && kit.quote) {
    const over = kit.x.length > X_LIMIT ? ` · OVER BY ${kit.x.length - X_LIMIT}` : '';
    out.push(`## X · quote of the day · attach x-quote.png · ${kit.x.length}/${X_LIMIT}${over}`, '', kit.x.text, '', 'First reply:', '', kit.x.reply, '',
      `Why this one: ${nameOf(kit.quote.q.speaker)}, ${kit.quote.group && kit.quote.group !== 'other' ? GROUP_LABEL[kit.quote.group].toLowerCase() : 'no group recorded yet'}, ${kit.quote.q.hand === 'reported' ? 'quoted by the source' : 'own words'}; entry ${kit.quote.e.slug}.`, '');
  } else {
    out.push('## X · quote of the day', '', 'No quotation met the rules today (checked, a named person, own clear words, 220 characters at most). Skip X today, or post the LinkedIn text.', '');
  }
  if (kit.alternatives.length) {
    out.push('## Or one of these instead', '', 'Each has its own card (x-quote-2.png, x-quote-3.png). Swap the card and the words in the X text, and use its link.', '');
    kit.alternatives.forEach((p, i) => {
      out.push(`${i + 2}. ${nameOf(p.q.speaker)}${role(p.q.speaker) ? `, ${role(p.q.speaker)}` : ''} (${p.e.outlet}, ${shortDate(said(p))}): “${p.q.text}”`, `   ${link(`/base/${p.e.slug}`, 'x', kit.run, p.q.id)}`, '');
    });
  }
  if (kit.linkedinToday) {
    out.push(`## LinkedIn · what changed today · attach linkedin-today.png · ${kit.linkedinToday.length}/${LINKEDIN_LIMIT}`, '', kit.linkedinToday.text, '', 'First comment:', '', kit.linkedinToday.comment, '');
  }
  if (kit.linkedinQuote) {
    out.push(`## LinkedIn · alternative: the quotation · attach linkedin-quote.png · ${kit.linkedinQuote.length}/${LINKEDIN_LIMIT}`, '', kit.linkedinQuote.text, '', 'First comment:', '', kit.linkedinQuote.comment, '');
  }
  return out.join('\n');
}
