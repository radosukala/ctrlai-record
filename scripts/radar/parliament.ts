/**
 * Parliamentary records for the Radar: what politicians say about AI, in the official record, with who said it.
 *
 * Two open APIs, no keys:
 *   UK Hansard            hansard-api.parliament.uk for the Commons and the Lords, members-api.parliament.uk for who a member
 *                         is and which party they sat for on the day
 *   European Parliament   data.europarl.europa.eu/api/v2, the plenary's speeches (and, for the group a member sat in on the
 *                         day, the list of sitting MEPs)
 *
 * One item per DEBATE, not per speech: its title, its page, the sitting date, who spoke on AI and a few of their lines.
 * A debate is found when a speech in it says "AI" or "artificial intelligence" (both APIs match every word of a search, so
 * "frontier AI" is already inside "AI"), or, at Westminster, when its title says those or "superintelligence": then everyone
 * who spoke in it counts.
 * The text of a debate for a deep read is saved by parliament-text.ts, which shares the readers in this file.
 *
 * Everything that comes back is untrusted text; nothing here acts on it. Requests go one at a time, however many sources are
 * being read, with a pause between them.
 */
import { base, decode, UA, type Item, type Source, type Speaker } from './feeds';

export type Win = { from: string; to: string };

export const HANSARD_API = 'https://hansard-api.parliament.uk';
export const MEMBERS_API = 'https://members-api.parliament.uk';
export const EP_API = 'https://data.europarl.europa.eu/api/v2';

/** What a search must find in a speech for the debate to be read. */
export const TERMS = ['artificial intelligence', 'AI'];
/** What a debate's title may say for it to be read whole. "Artificial Superintelligence" (Commons, 8 Sep 2026) says neither of the above. */
export const TITLE_TERMS = [...TERMS, 'superintelligence'];

const PAGE = 100;
const MAX_PAGES = 30;

// ---------------------------------------------------------------------------------------------------------------------
// Asking politely
// ---------------------------------------------------------------------------------------------------------------------

export type Getter = (url: string) => Promise<string>;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/**
 * A getter that asks for one thing at a time and waits `gapMs` after each answer, whoever is asking. A busy or failing
 * server (429, 5xx, a dropped connection) is tried again, twice, after a growing pause; anything else is an error at once.
 * The European Parliament allows 500 requests in 5 minutes; a day's reading is a few dozen.
 */
export function politeGetter(opts: { gapMs?: number; timeoutMs?: number; retryMs?: number; fetchImpl?: typeof fetch } = {}): Getter {
  const { gapMs = 400, timeoutMs = 60_000, retryMs = 2000, fetchImpl = fetch } = opts;
  let queue: Promise<unknown> = Promise.resolve();
  let lastEnd = 0;
  async function once(url: string): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      const wait = lastEnd + gapMs - Date.now();
      if (wait > 0) await sleep(wait);
      let status = 0;
      let text = '';
      try {
        const res = await fetchImpl(url, { headers: { 'user-agent': UA, accept: 'application/ld+json, application/json;q=0.9, */*;q=0.1' }, signal: AbortSignal.timeout(timeoutMs) });
        status = res.status;
        text = await res.text();
      } catch (e) {
        lastEnd = Date.now();
        if (attempt >= 2) throw e;
        await sleep(retryMs * (attempt + 1));
        continue;
      }
      lastEnd = Date.now();
      if (status >= 200 && status < 300) return text;
      if ((status === 429 || status >= 500) && attempt < 2) { await sleep(retryMs * (attempt + 1)); continue; }
      let why = '';
      try { const j = JSON.parse(text) as string | { message?: string }; why = String(typeof j === 'string' ? j : j?.message ?? '').slice(0, 300); } catch { /* not JSON */ }
      const u = new URL(url);
      throw new Error(`HTTP ${status} from ${u.host}${u.pathname}${why ? `: ${why}` : ''}`);
    }
  }
  return url => {
    const run = queue.then(() => once(url));
    queue = run.catch(() => undefined);
    return run;
  };
}

/** The one queue every parliament request goes through. */
export const politeGet: Getter = politeGetter();

// ---------------------------------------------------------------------------------------------------------------------
// Words about AI: counting them, and showing the place where they are said
// ---------------------------------------------------------------------------------------------------------------------

const AI_WORDS = /\bAI\b|\b[Aa]rtificial [Ii]ntelligence\b/g;

/** How many times a speech says "AI" or "artificial intelligence". */
export const mentions = (text: string) => (text.match(AI_WORDS) ?? []).length;

/** A stretch of the speech around its first mention of AI, in the speech's own words, cut at word boundaries. */
export function around(text: string, max = 220): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const first = new RegExp(AI_WORDS.source, 'g').exec(flat);
  const at = first ? first.index : 0;
  let start = Math.max(0, at - 90);
  let end = Math.min(flat.length, start + max);
  if (start > 0) { const sp = flat.indexOf(' ', start); if (sp !== -1 && sp < at) start = sp + 1; }
  if (end < flat.length) { const sp = flat.lastIndexOf(' ', end); if (sp > at) end = sp; }
  return `${start > 0 ? '…' : ''}${flat.slice(start, end).trim()}${end < flat.length ? '…' : ''}`;
}

// ---------------------------------------------------------------------------------------------------------------------
// A debate, as either parliament gives it, and the item made from it
// ---------------------------------------------------------------------------------------------------------------------

/** One speech that counts as speaking on AI. */
export type Said = { name: string; memberId?: number; /** The office the record gives the speaker, if any. */ role?: string; text: string; /** E.g. "translated from Hungarian". */ note?: string };

export type Debate = {
  title: string;
  url: string;
  /** The sitting date, YYYY-MM-DD. */
  date: string;
  /** Where it sat: "House of Commons", "House of Lords, Grand Committee", "European Parliament plenary". */
  chamber: string;
  /** In the order they were made. */
  said: Said[];
  /** The debate is about AI (its title says so), so all of its speeches are here, not only those that say the words. */
  aboutAI?: boolean;
};

const MAX_NAMES = 10;
const MAX_EXCERPT = 1100;
const SNIPPET = 200;

/** A party (UK) or political group (EP) with its short form, "Lab" for "Labour", for the excerpt. */
export type Party = { name: string; short?: string };

/** The item for a debate: who spoke and a few of their lines. The excerpt is read by the triage filter, so it uses the short
 * form of a party ("Lab", not "Labour" or "Liberal Democrat", which the filter takes for labour and democracy) and otherwise
 * only the record's words and a frame that says nothing about safety, control or governance. */
export function debateItem(src: Source, d: Debate, partyOf: (memberId?: number) => Party | undefined): Item {
  const speakers: Speaker[] = [];
  const short = new Map<string, string>();
  const seen = new Set<string>();
  for (const s of d.said) {
    const key = s.memberId ? `#${s.memberId}` : s.name;
    if (seen.has(key)) continue;
    seen.add(key);
    const party = partyOf(s.memberId);
    speakers.push({ name: s.name, ...(s.memberId ? { memberId: s.memberId } : {}), ...(party ? { party: party.name } : {}) });
    if (party) short.set(key, party.short ?? party.name);
  }
  const keyOf = (s: { name: string; memberId?: number }) => (s.memberId ? `#${s.memberId}` : s.name);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const lead = d.aboutAI
    ? `A debate about AI${speakers.length ? `: ${plural(speakers.length, 'speaker', 'speakers')}` : ' (its title says so)'}.`
    : `AI comes up in ${plural(d.said.length, 'speech', 'speeches')} by ${plural(speakers.length, 'speaker', 'speakers')}.`;
  const names = speakers.slice(0, MAX_NAMES).map(s => (short.has(keyOf(s)) ? `${s.name} (${short.get(keyOf(s))})` : s.name)).join(', ')
    + (speakers.length > MAX_NAMES ? ` and ${speakers.length - MAX_NAMES} more` : '');
  const label = (s: Said) => {
    const bits = [short.get(keyOf(s)), s.role, s.note].filter(Boolean);
    return bits.length ? `${s.name} (${bits.join(', ')})` : s.name;
  };
  // As many of the speeches as fit, the ones that say the most about AI first; in a debate about AI, in the order they were made
  // (the question, then the answer). The keyword filter reads only this, so a mention in a speech left out is a mention it misses.
  const chosen = d.aboutAI
    ? d.said
    : d.said.map((s, i) => ({ s, i, n: mentions(s.text) })).sort((a, b) => b.n - a.n || a.i - b.i).map(x => x.s);
  let excerpt = speakers.length ? `${lead} Speakers: ${names}.` : lead;
  let shown = 0;
  for (const s of chosen) {
    const head = ` ${label(s)}: “`;
    const room = MAX_EXCERPT - excerpt.length - head.length - 1;
    if (room < (shown ? SNIPPET / 2 : 60)) break;
    excerpt += `${head}${around(s.text, Math.min(SNIPPET, room))}”`;
    shown++;
  }
  const it = base(src, d.title, d.url, d.date, excerpt);
  it.author = d.chamber;
  it.speakers = speakers;
  return it;
}

// ---------------------------------------------------------------------------------------------------------------------
// UK Parliament: Hansard and the Members API
// ---------------------------------------------------------------------------------------------------------------------

export type HansardSpoken = {
  MemberName?: string | null;
  MemberId?: number | null;
  AttributedTo?: string | null;
  ContributionExtId: string;
  ContributionText?: string | null;
  ContributionTextFull?: string | null;
  DebateSection: string;
  DebateSectionExtId: string;
  SittingDate: string;
  Section?: string;
  House?: string;
  OrderInDebateSection?: number;
  DebateSectionOrder?: number;
};

/** A debate whose title matched a search (the debates search names the section, e.g. "Commons Chamber", in `DebateSection`). */
export type HansardTitleHit = { Title: string; DebateSection?: string; DebateSectionExtId: string; SittingDate: string; House?: string };

export type HansardItem = {
  ItemType: string;
  MemberId: number | null;
  AttributedTo: string | null;
  Value: string | null;
  OrderInSection: number;
  HRSTag: string | null;
};

export type HansardDebate = {
  Overview: { Title: string; ExtId: string; Date: string; Location?: string; House?: string; ContentLastUpdated?: string };
  Items: HansardItem[];
  ChildDebates?: HansardDebate[];
};

type Period = { startDate: string; endDate?: string | null };
export type MemberHistory = {
  id: number;
  partyHistory?: (Period & { party: { name: string; abbreviation?: string | null } })[];
  nameHistory?: (Period & { nameDisplayAs?: string })[];
};

const day = (iso: string) => iso.slice(0, 10);

/** The latest-starting period that includes the date. Periods are dated by day, both ends included. */
function periodOn<T extends Period>(list: T[] | undefined, date: string): T | undefined {
  return (list ?? []).filter(p => day(p.startDate) <= date && (!p.endDate || day(p.endDate) >= date)).sort((a, b) => day(b.startDate).localeCompare(day(a.startDate)))[0];
}

/** The party a member sat for on a date, from the Members API history ("Labour", "Crossbench", "Speaker"), and its short form ("Lab", "XB"). */
export const partyOn = (h: MemberHistory | undefined, date: string): string | undefined => periodOn(h?.partyHistory, date)?.party.name;
export function partyShortOn(h: MemberHistory | undefined, date: string): string | undefined {
  const party = periodOn(h?.partyHistory, date)?.party;
  return party?.abbreviation || party?.name;
}

/** How the member was styled on a date ("Baroness Twycross"); the latest name if no entry covers the date. */
export function nameOn(h: MemberHistory | undefined, date: string): string | undefined {
  const names = h?.nameHistory ?? [];
  return (periodOn(names, date) ?? [...names].sort((a, b) => day(a.startDate).localeCompare(day(b.startDate))).at(-1))?.nameDisplayAs;
}

/** Reads the histories of members not yet in `into`, 20 to a request (the API refuses more). An unknown id is simply not returned. */
export async function memberHistories(get: Getter, ids: Iterable<number>, into: Map<number, MemberHistory>): Promise<void> {
  const todo = [...new Set(ids)].filter(id => id > 0 && !into.has(id));
  for (let i = 0; i < todo.length; i += 20) {
    const rows = JSON.parse(await get(`${MEMBERS_API}/api/Members/History?${todo.slice(i, i + 20).map(id => `ids=${id}`).join('&')}`)) as { value?: MemberHistory }[];
    for (const r of rows) if (r.value) into.set(r.value.id, r.value);
  }
}

/** A Hansard value as plain text: markup out (column-number markers, italics, question tags), entities decoded, paragraphs kept. */
export function hansardText(raw: string | null | undefined): string {
  return decode((raw ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, ''))
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\r?\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Wholly in italics: a stage direction or a procedural line ("Sitting adjourned."), not a member's words. */
function italicOnly(raw: string | null | undefined): boolean {
  const r = (raw ?? '').replace(/<span\b[^>]*column-number[^>]*><\/span>/g, '').trim();
  return /<em>/.test(r) && !r.replace(/<em>[\s\S]*?<\/em>/g, '').replace(/<[^>]+>/g, '').trim();
}

/** The Speaker, a Deputy Speaker, the Lord Speaker, the Chairman of Committees, the chair of a Westminster Hall debate: in the
 * chair, not speaking on the subject. */
export const presiding = (attributedTo: string | null | undefined) =>
  /^(?:(?:Mr|Madam|Dame|Sir)\s+)?(?:Deputy\s+)?Speaker\b|^The\s+(?:(?:First|Second|Third)\s+)?(?:Lord\s+|Lady\s+)?(?:Deputy\s+)?(?:Speaker|Chair(?:man|woman)?(?:\s+of\s+Committees)?)\b|\(in the Chair\)\s*$/i
    .test((attributedTo ?? '').trim());

/** The office Hansard prints before a member's name: "The Prime Minister (Andy Burnham)" gives "The Prime Minister". */
export function roleOf(attributedTo: string | null | undefined, name: string | undefined): string | undefined {
  const a = (attributedTo ?? '').replace(/\s+/g, ' ').trim();
  const i = name ? a.indexOf(`(${name})`) : -1;
  return i > 0 ? a.slice(0, i).trim() || undefined : undefined;
}

/** How Hansard forms the last part of a debate's web address: each word capitalised, spaces and punctuation dropped. */
export function hansardSlug(title: string): string {
  return title.trim().split(/\s+/).map(w => w.split('-').map(p => { const c = p.replace(/[^A-Za-z0-9]/g, ''); return c.charAt(0).toUpperCase() + c.slice(1); }).join('-')).join('');
}

export const hansardUrl = (house: string, date: string, extId: string, title: string) =>
  `https://hansard.parliament.uk/${house}/${date}/debates/${extId.toUpperCase()}/${hansardSlug(title)}`;

const houseName = (house: string) => `House of ${house}`;
const chamberOf = (house: string, section?: string) =>
  !section || new RegExp(`^${house} Chamber$`, 'i').test(section.trim()) ? houseName(house) : `${houseName(house)}, ${section.trim()}`;

/** A debate's items in order, as blocks: a member's speech (a speech Hansard splits into paragraphs, or around a time stamp,
 * stays one), something said by no single member ("Noble Lords: Hear, hear!"), or record text that is not a speech
 * (headings, motions, "Sitting adjourned."). Paragraphs with no member after a speech continue that speech. */
export type HBlock =
  | { kind: 'speech'; memberId: number; attributedTo: string; paras: string[] }
  | { kind: 'voice'; who: string; paras: string[] }
  | { kind: 'record'; paras: string[] };

/** A contribution's paragraphs, split where the member's own words stop: Hansard puts the lines that follow a speech inside
 * its item, and sets them in italics ("Question put and agreed to." and "Resolved," and then the text resolved). The first
 * wholly italic paragraph that is no interjection ("[Interruption.]") starts the record's own text. */
function splitContribution(raw: string | null | undefined): { speech: string[]; record: string[] } {
  const paras = (raw ?? '').split(/(?:\r?\n){2,}/).map(p => ({ raw: p, text: hansardText(p) })).filter(p => p.text);
  const cut = paras.findIndex(p => italicOnly(p.raw) && !p.text.startsWith('['));
  const at = cut < 0 ? paras.length : cut;
  return { speech: paras.slice(0, at).map(p => p.text), record: paras.slice(at).map(p => p.text) };
}

export function hansardBlocks(deb: HansardDebate): HBlock[] {
  const blocks: HBlock[] = [];
  let current: Extract<HBlock, { kind: 'speech' }> | undefined;
  const record = (text: string) => {
    const last = blocks[blocks.length - 1];
    if (last?.kind === 'record') last.paras.push(text);
    else blocks.push({ kind: 'record', paras: [text] });
  };
  const walk = (d: HansardDebate, depth: number) => {
    if (depth > 0 && d.Overview.Title.trim()) { record(d.Overview.Title.replace(/\s+/g, ' ').trim()); current = undefined; }
    for (const it of [...(d.Items ?? [])].sort((a, b) => a.OrderInSection - b.OrderInSection)) {
      if (it.ItemType !== 'Contribution' || it.HRSTag === 'hs_ColumnNumber') continue;
      const { speech, record: rest } = splitContribution(it.Value);
      const who = (it.AttributedTo ?? '').replace(/\s+/g, ' ').trim();
      if (it.MemberId && it.MemberId > 0) {
        current = speech.length ? { kind: 'speech', memberId: it.MemberId, attributedTo: who, paras: speech } : undefined;
        if (current) blocks.push(current);
      } else if (who) {
        if (speech.length) blocks.push({ kind: 'voice', who, paras: speech });
        else if (!rest.length) record(who);
        current = undefined;
      } else if (speech.length) {
        if (current && /^hs_[Pp]ara$/.test(it.HRSTag ?? '')) current.paras.push(...speech);
        else { speech.forEach(record); current = undefined; }
      }
      if (rest.length) { rest.forEach(record); current = undefined; }
    }
    for (const c of d.ChildDebates ?? []) walk(c, depth + 1);
  };
  walk(deb, 0);
  return blocks;
}

/** Every member id that appears in a debate, its sections included. */
export function hansardMemberIds(deb: HansardDebate): number[] {
  const ids = new Set<number>();
  const walk = (d: HansardDebate) => {
    for (const it of d.Items ?? []) if (it.MemberId && it.MemberId > 0) ids.add(it.MemberId);
    for (const c of d.ChildDebates ?? []) walk(c);
  };
  walk(deb);
  return [...ids];
}

async function hansardSearch<T>(get: Getter, root: string, endpoint: string, house: string, win: Win, term: string): Promise<T[]> {
  const out: T[] = [];
  for (let page = 0, skip = 0; ; page++) {
    const q = new URLSearchParams({
      'queryParameters.house': house, 'queryParameters.startDate': win.from, 'queryParameters.endDate': win.to,
      'queryParameters.searchTerm': term, 'queryParameters.take': String(PAGE), 'queryParameters.skip': String(skip), 'queryParameters.orderBy': 'SittingDateAsc',
    });
    const got = JSON.parse(await get(`${root}/${endpoint}?${q}`)) as { Results?: T[]; TotalResultCount?: number };
    const rows = got.Results ?? [];
    out.push(...rows);
    skip += rows.length;
    if (!rows.length || skip >= (got.TotalResultCount ?? 0)) return out;
    if (page + 1 >= MAX_PAGES) throw new Error(`more than ${MAX_PAGES * PAGE} results for "${term}" in ${win.from} to ${win.to}: ask for a shorter window`);
  }
}

type Found = { id: string; date: string; title: string; section?: string; hits: HansardSpoken[]; aboutAI: boolean; full?: HansardDebate };

/** One Hansard house (Commons or Lords) for a window: the debates where AI comes up, as items. */
export async function readHansard(src: Source, win: Win, get: Getter = politeGet): Promise<Item[]> {
  const house = src.house;
  if (!house) throw new Error(`${src.id}: "house" (Commons or Lords) is missing from radar/sources.json`);
  const root = src.url.replace(/\/+$/, '');

  const spoken = new Map<string, HansardSpoken>();
  for (const term of TERMS) for (const h of await hansardSearch<HansardSpoken>(get, root, 'search/contributions/Spoken.json', house, win, term)) spoken.set(h.ContributionExtId, h);
  const titled = new Map<string, HansardTitleHit>();
  for (const term of TITLE_TERMS) for (const t of await hansardSearch<HansardTitleHit>(get, root, 'search/debates.json', house, win, term)) titled.set(t.DebateSectionExtId.toUpperCase(), t);

  // The debates, in the order they sat.
  const found = new Map<string, Found>();
  const order = (h: HansardSpoken) => [day(h.SittingDate), String(h.DebateSectionOrder ?? 0).padStart(6, '0'), String(h.OrderInDebateSection ?? 0).padStart(6, '0')].join('|');
  for (const h of [...spoken.values()].sort((a, b) => order(a).localeCompare(order(b)))) {
    const id = h.DebateSectionExtId.toUpperCase();
    const f = found.get(id) ?? { id, date: day(h.SittingDate), title: h.DebateSection, section: h.Section, hits: [], aboutAI: false };
    f.hits.push(h);
    found.set(id, f);
  }
  for (const [id, t] of titled) {
    const f = found.get(id) ?? { id, date: day(t.SittingDate), title: t.Title, section: t.DebateSection, hits: [], aboutAI: false };
    f.title = t.Title;
    f.aboutAI = true;
    found.set(id, f);
  }
  // A debate about AI is read whole: everyone who spoke in it spoke on AI.
  for (const f of found.values()) {
    if (!f.aboutAI) continue;
    try { f.full = JSON.parse(await get(`${root}/debates/debate/${f.id}.json`)) as HansardDebate; } catch (e) { console.log(`${src.id}: "${f.title.trim()}" not read in full (${(e as Error).message})`); }
  }

  const ids = new Set<number>();
  for (const f of found.values()) {
    for (const h of f.hits) if (h.MemberId) ids.add(h.MemberId);
    if (f.full) for (const id of hansardMemberIds(f.full)) ids.add(id);
  }
  const members = new Map<number, MemberHistory>();
  try { await memberHistories(get, ids, members); } catch (e) { console.log(`${src.id}: members not read (${(e as Error).message}), so parties are missing`); }

  const items: Item[] = [];
  for (const f of found.values()) {
    const named = (id: number | null | undefined, printed: string | null | undefined) =>
      (id ? nameOn(members.get(id), f.date) : undefined) ?? (printed ?? '').replace(/\s+/g, ' ').trim();
    const said: Said[] = [];
    if (f.full) {
      for (const b of hansardBlocks(f.full)) {
        if (b.kind !== 'speech' || presiding(b.attributedTo)) continue;
        const name = named(b.memberId, b.attributedTo);
        const role = roleOf(b.attributedTo, name);
        said.push({ name, memberId: b.memberId, ...(role ? { role } : {}), text: b.paras.join('\n\n') });
      }
    }
    if (!said.length) {
      for (const h of f.hits) {
        const name = named(h.MemberId, h.MemberName ?? h.AttributedTo);
        const role = roleOf(h.AttributedTo, name);
        said.push({ name, ...(h.MemberId ? { memberId: h.MemberId } : {}), ...(role ? { role } : {}), text: hansardText(h.ContributionTextFull ?? h.ContributionText) });
      }
    }
    if (!said.length && !f.aboutAI) continue;
    const d: Debate = { title: f.title, url: hansardUrl(house, f.date, f.id, f.title), date: f.date, chamber: chamberOf(house, f.section), said, aboutAI: f.aboutAI };
    items.push(debateItem(src, d, id => {
      const name = id ? partyOn(members.get(id), f.date) : undefined;
      return name ? { name, short: partyShortOn(members.get(id!), f.date) } : undefined;
    }));
  }
  return items;
}

// ---------------------------------------------------------------------------------------------------------------------
// The European Parliament
// ---------------------------------------------------------------------------------------------------------------------

const LANGUAGES: Record<string, string> = {
  bg: 'Bulgarian', cs: 'Czech', da: 'Danish', de: 'German', el: 'Greek', en: 'English', es: 'Spanish', et: 'Estonian', fi: 'Finnish', fr: 'French',
  ga: 'Irish', hr: 'Croatian', hu: 'Hungarian', it: 'Italian', lt: 'Lithuanian', lv: 'Latvian', mt: 'Maltese', nl: 'Dutch', pl: 'Polish',
  pt: 'Portuguese', ro: 'Romanian', sk: 'Slovak', sl: 'Slovenian', sv: 'Swedish',
};
export const languageName = (code: string) => LANGUAGES[code.toLowerCase()] ?? code;

/** Text of an XML fragment: tags dropped without adding spaces (the record's own spacing is kept), entities decoded. */
export const flat = (xml: string) => decode(xml.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

/** The paragraphs of a speech: its <p> elements and the <summary> lines that report what happened ("(The Chair interrupted the speaker)"). */
export const epParagraphs = (xml: string): string[] => [...xml.matchAll(/<(p|summary)\b[^>]*>([\s\S]*?)<\/\1>/g)].map(m => flat(m[2])).filter(Boolean);

export type EpFrom = {
  personId?: number;
  /** The name as printed; for the chair it is just "President". */
  name: string;
  /** The office, unless it only says which group the member speaks for. */
  role?: string;
  /** The whole line as printed: "Evin Incir (S&D), blue-card answer." */
  printed: string;
};

export function epFrom(xml: string): EpFrom {
  const from = xml.match(/<from\b[^>]*>([\s\S]*?)<\/from>/)?.[1] ?? '';
  const person = from.match(/<person\b[^>]*refersTo="epdata:person\/(\d+)"[^>]*>([\s\S]*?)<\/person>/);
  const role = from.match(/<role\b[^>]*>([\s\S]*?)<\/role>/)?.[1];
  const office = role ? flat(role) : undefined;
  return {
    ...(person ? { personId: Number(person[1]) } : {}),
    name: person ? flat(person[2]) : '',
    ...(office && !/\bon behalf of\b|^for the group\b|\bGroup\b/i.test(office) ? { role: office } : {}),
    printed: flat(from),
  };
}

/** The language the record's text is in (`xml:lang`): "en", or "hu-t-en-mtec" for a Hungarian speech in the Parliament's English translation. */
export const epLang = (xml: string) => xml.match(/xml:lang="([^"]+)"/)?.[1] ?? '';
export const translatedFrom = (lang: string): string | undefined => { const m = lang.match(/^([a-z]{2,3})-t-/i); return m ? languageName(m[1]) : undefined; };

export type EpSpeech = {
  /** E.g. MTG-PL-2026-10-06-OTH-2017097827147 */
  id: string;
  date: string;
  /** The agenda item's identifier in the verbatim report: CRE-10-2026-10-06-ITM-003 */
  cre: string;
  title: string;
  /** Position in the day's record. */
  order: number;
  personId?: number;
  from: EpFrom;
  lang: string;
  text: string;
};

type EpRow = {
  activity_id: string;
  activity_date: string;
  activity_label?: Record<string, string>;
  had_participation?: { had_participant_person?: string[] };
  recorded_in_a_realization_of?: { is_part_of?: string; numbering?: number; 'api:xmlFragment'?: Record<string, string> }[];
};

/** A page of speech hits from /speeches?include-output=xml_fragment, each with its speech as XML. (The server's own
 * highlighting, include-output=highlighted_text, failed with a 500 on a busy week; this does not need it.) */
export function parseEuroparlHits(json: string): { total?: number; rows: number; speeches: EpSpeech[] } {
  // A window in which the plenary did not sit comes back as an empty body, not as an empty list: that is no speeches.
  if (!json.trim()) return { total: 0, rows: 0, speeches: [] };
  const data = JSON.parse(json) as { data?: EpRow[]; meta?: { total?: number } };
  const speeches: EpSpeech[] = [];
  for (const row of data.data ?? []) {
    const cre = row.recorded_in_a_realization_of?.[0]?.is_part_of?.replace(/^eli\/dl\/doc\//, '');
    if (!cre) continue;
    const frags = row.recorded_in_a_realization_of?.[0]?.['api:xmlFragment'] ?? {};
    const xml = frags.en ?? Object.values(frags)[0] ?? '';
    const from = epFrom(xml);
    const listed = row.had_participation?.had_participant_person?.[0]?.match(/(\d+)$/)?.[1];
    const personId = from.personId ?? (listed ? Number(listed) : undefined);
    speeches.push({
      id: row.activity_id, date: row.activity_date, cre, title: row.activity_label?.en ?? Object.values(row.activity_label ?? {})[0] ?? cre,
      order: row.recorded_in_a_realization_of?.[0]?.numbering ?? 0, ...(personId ? { personId } : {}), from, lang: epLang(xml), text: epParagraphs(xml).join('\n\n'),
    });
  }
  return { total: data.meta?.total, rows: data.data?.length ?? 0, speeches };
}

/** "CRE-10-2026-10-06-ITM-016" → the agenda item's event, "MTG-PL-2026-10-06-PVCRE-ITM-16". */
export function epEventId(cre: string): string {
  const m = cre.match(/^CRE-\d+-(\d{4}-\d{2}-\d{2})-ITM-([\d-]+)$/);
  if (!m) throw new Error(`not a verbatim report item: ${cre}`);
  return `MTG-PL-${m[1]}-PVCRE-ITM-${m[2].split('-').map(Number).join('-')}`;
}

/** The public page of an agenda item in the verbatim report (it sits behind a bot check, so scripts read the API instead). */
export const epUrl = (cre: string) => `https://www.europarl.europa.eu/doceo/document/${cre}_EN.html`;

export type Mep = { name: string; group?: string };

/** Who sat on a date and in which political group, from the Parliament's list of MEPs with a mandate that day. */
export async function sittingMeps(get: Getter, root: string, date: string): Promise<Map<number, Mep>> {
  const rows = (JSON.parse(await get(`${root}/meps/show-current?mandate-date=${date}&limit=1000`)) as {
    data?: { identifier?: string; id?: string; label?: string; givenName?: string; familyName?: string; 'api:political-group'?: string }[];
  }).data ?? [];
  const meps = new Map<number, Mep>();
  for (const r of rows) {
    const id = Number(r.identifier ?? r.id?.split('/').pop());
    if (!id) continue;
    const name = [r.givenName, r.familyName].filter(Boolean).join(' ') || r.label || '';
    meps.set(id, { name, ...(r['api:political-group'] ? { group: r['api:political-group'] } : {}) });
  }
  return meps;
}

function epQuery(win: Win, term: string, offset: number): string {
  const q = new URLSearchParams({
    'sitting-date': win.from, 'sitting-date-end': win.to, text: term, 'search-language': 'en', language: 'en', 'include-output': 'xml_fragment',
    limit: String(PAGE), offset: String(offset), 'sort-by': 'sitting-date:asc',
  });
  q.append('activity-type', 'PLENARY_DEBATE_SPEECH');
  q.append('activity-type', 'PLENARY_DEBATE_WRITTEN_STATEMENT');
  return q.toString();
}

/** The European Parliament's plenary for a window: the agenda items where AI comes up, as items. */
export async function readEuroparl(src: Source, win: Win, get: Getter = politeGet): Promise<Item[]> {
  const root = src.url.replace(/\/+$/, '');
  const speeches = new Map<string, EpSpeech>();
  for (const term of TERMS) {
    for (let page = 0, offset = 0; ; page++) {
      const got = parseEuroparlHits(await get(`${root}/speeches?${epQuery(win, term, offset)}`));
      for (const s of got.speeches) speeches.set(s.id, s);
      offset += got.rows;
      if (!got.rows || offset >= (got.total ?? 0)) break;
      if (page + 1 >= MAX_PAGES) throw new Error(`more than ${MAX_PAGES * PAGE} speeches for "${term}" in ${win.from} to ${win.to}: ask for a shorter window`);
    }
  }
  const byItem = new Map<string, EpSpeech[]>();
  for (const s of [...speeches.values()].sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order)) byItem.set(s.cre, [...(byItem.get(s.cre) ?? []), s]);

  // Who sat each day, for the groups. If the Parliament will not give one, it will not give the next: go on without groups.
  const rosters = new Map<string, Map<number, Mep>>();
  for (const date of new Set([...byItem.values()].map(l => l[0].date))) {
    try { rosters.set(date, await sittingMeps(get, root, date)); } catch (e) { console.log(`${src.id}: MEPs of ${date} not read (${(e as Error).message}), so groups are missing`); break; }
  }

  const items: Item[] = [];
  for (const [cre, list] of byItem) {
    const date = list[0].date;
    const roster = rosters.get(date);
    const said: Said[] = list.map(s => {
      const name = (s.personId ? roster?.get(s.personId)?.name : undefined) || s.from.name || (s.personId ? `Member ${s.personId}` : 'Unknown speaker');
      const from = translatedFrom(s.lang);
      return { name, ...(s.personId ? { memberId: s.personId } : {}), ...(s.from.role ? { role: s.from.role } : {}), text: s.text, ...(from ? { note: `translated from ${from}` } : {}) };
    });
    const d: Debate = { title: list[0].title, url: epUrl(cre), date, chamber: 'European Parliament plenary', said };
    items.push(debateItem(src, d, id => {
      const group = id ? roster?.get(id)?.group : undefined;
      return group ? { name: group } : undefined;
    }));
  }
  return items;
}

// ---------------------------------------------------------------------------------------------------------------------

/** The reader for a parliament source, chosen by the API its url names. */
export function readParliament(src: Source, win: Win, get: Getter = politeGet): Promise<Item[]> {
  const host = new URL(src.url).hostname;
  if (host === 'hansard-api.parliament.uk') return readHansard(src, win, get);
  if (host === 'data.europarl.europa.eu') return readEuroparl(src, win, get);
  return Promise.reject(new Error(`${src.id}: no parliament reader for ${host}`));
}
