/**
 * Saves the official text of one parliamentary debate, for a deep read.
 *
 *   npx tsx scripts/radar/parliament-text.ts <item JSON | a file holding it | the debate's URL> <OUT_BASE>
 *
 * Writes OUT_BASE.txt: the debate's record, every speech in it, each preceded by a line that starts with ">>" and gives the
 * speaker's name, party (UK) or political group (European Parliament) on the day of the sitting, and member id, and also
 * what the record printed for the speaker. The words are the record's own, exactly as published: only markup is removed.
 * A line starting with ">>" is also what the quotation checker reads as a change of speaker, so a quotation cannot run
 * from one speech into the next.
 *
 *   UK Hansard            https://hansard.parliament.uk/<House>/<date>/debates/<id>/<title>     (read through the Hansard API)
 *   European Parliament   https://www.europarl.europa.eu/doceo/document/CRE-10-<date>-ITM-<n>_EN.html  (through the open data API)
 *
 * Those two pages sit behind bot checks, so the record is read from the APIs, never from the pages. Texts are other
 * people's words: they stay in the private run folder.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  EP_API, HANSARD_API, epEventId, epFrom, epLang, epParagraphs, epUrl, flat, hansardBlocks, hansardMemberIds, languageName, memberHistories,
  nameOn, partyOn, politeGet, sittingMeps, translatedFrom, type Getter, type HansardDebate, type Mep, type MemberHistory,
} from './parliament';

const today = () => new Date().toISOString().slice(0, 10);
const noFullStop = (s: string) => s.replace(/\.+$/, '');

/** What comes back from a save. */
export type Saved = { text: string; speeches: number; speakers: number; words: number; what: string; problems: string[] };

/** A speech (or a stretch of record text) under its ">>" line. */
type Block = { head: string; paras: string[] };
const RECORD = '>> [record].';

/** Record text that is no one's speech; consecutive stretches share a line. */
function addRecord(blocks: Block[], paras: string[]) {
  const last = blocks[blocks.length - 1];
  if (last?.head === RECORD) last.paras.push(...paras);
  else blocks.push({ head: RECORD, paras: [...paras] });
}

function layout(preamble: string[], blocks: Block[]): { text: string; words: number } {
  const body = blocks.map(b => [b.head, ...b.paras.flatMap(p => [p, '']).slice(0, -1)].join('\n')).join('\n\n');
  return { text: `${preamble.join('\n')}\n\n${body}\n`, words: blocks.flatMap(b => b.paras).join(' ').split(/\s+/).filter(Boolean).length };
}

// ---------------------------------------------------------------------------------------------------------------------
// UK Hansard
// ---------------------------------------------------------------------------------------------------------------------

/** A Hansard debate as the text file: a short preamble, then a ">>" line and the words for each speech. */
export function renderHansard(deb: HansardDebate, members: Map<number, MemberHistory>, url: string, savedOn: string, notes: string[] = []): Saved {
  const o = deb.Overview;
  const date = o.Date.slice(0, 10);
  const blocks: Block[] = [];
  const speakers = new Set<number>();
  let speeches = 0;
  for (const b of hansardBlocks(deb)) {
    if (b.kind === 'record') { addRecord(blocks, b.paras); continue; }
    if (b.kind === 'voice') { blocks.push({ head: `>> ${noFullStop(b.who)} | not a single member.`, paras: b.paras }); continue; }
    speeches++;
    speakers.add(b.memberId);
    const name = nameOn(members.get(b.memberId), date) ?? (b.attributedTo || `member ${b.memberId}`);
    const party = partyOn(members.get(b.memberId), date);
    blocks.push({ head: `>> ${name} | party: ${party ?? 'unknown'} | member ${b.memberId}${b.attributedTo ? ` | as printed: “${noFullStop(b.attributedTo)}”` : ''}.`, paras: b.paras });
  }
  const house = o.House ?? (/lords/i.test(url) ? 'Lords' : 'Commons');
  const title = o.Title.replace(/\s+/g, ' ').trim();
  const { text, words } = layout([
    title,
    `UK Parliament, House of ${house}, ${o.Location ?? `${house} Chamber`}: sitting of ${date}.`,
    url,
    `Hansard, the official record, read from the Hansard API (hansard-api.parliament.uk) under the Open Parliament Licence v3.0.${o.ContentLastUpdated ? ` Hansard last updated this text on ${o.ContentLastUpdated}.` : ''} Saved ${savedOn}. The record of a sitting is published as it is reported and corrected later, so a debate saved the same day may not be complete.`,
    `${speeches} speeches by ${speakers.size} members. Each speech is preceded by a line beginning ">>" with the speaker's name, party on the day (UK Members API) and member id; "[record]" marks text that is no member's speech (headings, motions, "Sitting adjourned."). The words are Hansard's; only markup is removed.`,
    ...notes.map(n => `NOTE: ${n}.`),
  ], blocks);
  return { text, speeches, speakers: speakers.size, words, what: `source=hansard house=${house} date=${date} title=${JSON.stringify(title)}`, problems: [] };
}

export function hansardDebateId(url: string): string {
  const id = url.match(/\/debates\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1];
  if (!id) throw new Error(`no Hansard debate id in ${url}`);
  return id.toUpperCase();
}

export async function fetchHansardText(url: string, get: Getter = politeGet, savedOn = today()): Promise<Saved> {
  const deb = JSON.parse(await get(`${HANSARD_API}/debates/debate/${hansardDebateId(url)}.json`)) as HansardDebate;
  const members = new Map<number, MemberHistory>();
  const problems: string[] = [];
  try { await memberHistories(get, hansardMemberIds(deb), members); } catch (e) { problems.push(`the Members API failed (${(e as Error).message}): parties are marked unknown`); }
  return { ...renderHansard(deb, members, url, savedOn, problems), problems };
}

// ---------------------------------------------------------------------------------------------------------------------
// European Parliament
// ---------------------------------------------------------------------------------------------------------------------

export type EpActivity = {
  id: string;
  /** Position in the day's record. */
  order: number;
  /** The record's text for it, as XML. */
  xml: string;
};

type EpFull = {
  activity_id: string;
  activity_label?: Record<string, string>;
  activity_date?: string;
  consists_of?: string[];
  recorded_in_a_realization_of?: { numbering?: number; 'api:xmlFragment'?: Record<string, string> }[];
};

const rowsOf = (json: string) => (JSON.parse(json) as { data?: EpFull[] }).data ?? [];

/** The agenda item's title without its number ("16. "), as the Parliament's lists give it. */
const unnumbered = (label: string) => label.replace(/^\d+(?:\.\d+)*\.\s*/, '').trim();
/** ...and without the "(debate)" tag the Parliament adds, to search the speeches by. */
const searchTitle = (label: string) => unnumbered(label).replace(/\s*\([^)]*\)\s*$/, '').trim();

/** Which text to read for an activity: English if there is any (the Parliament's translation when the speech was not given in
 * English), else what was said, in the language it was said in. */
function pickXml(row: EpFull): { xml: string; order: number } | undefined {
  const r = row.recorded_in_a_realization_of?.[0];
  const frags = r?.['api:xmlFragment'] ?? {};
  const xml = frags.en ?? Object.values(frags).find(x => !/xml:lang="[^"]*-t-/.test(x)) ?? Object.values(frags)[0];
  return xml ? { xml, order: r?.numbering ?? 0 } : undefined;
}

/** One agenda item of the verbatim report: its title, date and every activity in it, in order. */
export async function fetchEuroparlDebate(get: Getter, cre: string): Promise<{ title: string; date: string; acts: EpActivity[]; missing: string[] }> {
  const event = rowsOf(await get(`${EP_API}/events/${epEventId(cre)}`))[0];
  if (!event) throw new Error(`the Parliament has no agenda item ${epEventId(cre)}`);
  const date = event.activity_date ?? cre.match(/(\d{4}-\d{2}-\d{2})/)![1];
  const label = event.activity_label?.en ?? Object.values(event.activity_label ?? {})[0] ?? cre;
  const wanted = new Set((event.consists_of ?? []).map(id => id.replace(/^eli\/dl\/event\//, '')));
  const got = new Map<string, EpActivity>();
  const keep = (row: EpFull) => {
    if (!wanted.has(row.activity_id) || got.has(row.activity_id)) return;
    const pick = pickXml(row);
    if (pick) got.set(row.activity_id, { id: row.activity_id, ...pick });
  };

  // One search by the title brings the whole debate in a request or two.
  try {
    for (let offset = 0; got.size < wanted.size; ) {
      const q = new URLSearchParams({
        'sitting-date': date, 'sitting-date-end': date, title: searchTitle(label), 'search-language': 'en', language: 'en', 'include-output': 'xml_fragment',
        limit: '100', offset: String(offset), 'sort-by': 'sitting-date:asc',
      });
      const page = JSON.parse(await get(`${EP_API}/speeches?${q}`)) as { data?: EpFull[]; meta?: { total?: number } };
      for (const row of page.data ?? []) keep(row);
      offset += page.data?.length ?? 0;
      if (!page.data?.length || offset >= (page.meta?.total ?? 0)) break;
    }
  } catch (e) { console.error(`  the title search failed (${(e as Error).message}); reading the items one by one`); }

  // Whatever it did not bring (the chair's name, a written statement, a speech without a translation yet): one by one.
  const missing: string[] = [];
  for (const id of wanted) {
    if (got.has(id)) continue;
    try {
      let row = rowsOf(await get(`${EP_API}/speeches/${id}?include-output=xml_fragment&language=en`))[0];
      if (row && !pickXml(row)) row = rowsOf(await get(`${EP_API}/speeches/${id}?include-output=xml_fragment`))[0];
      const pick = row && pickXml(row);
      if (pick) got.set(id, { id, ...pick }); else missing.push(id);
    } catch { missing.push(id); }
  }
  return { title: unnumbered(label), date, acts: [...got.values()].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)), missing };
}

/** A verbatim-report agenda item as the text file. `roster` is who sat that day (undefined if the list could not be read). */
export function renderEuroparl(d: { title: string; date: string; cre: string; acts: EpActivity[]; roster?: Map<number, Mep> }, savedOn: string, notes: string[] = []): Saved {
  const blocks: Block[] = [];
  const speakers = new Set<number>();
  let speeches = 0;
  for (const a of d.acts) {
    const from = epFrom(a.xml);
    const procedural = /^<communication\b/.test(a.xml) || !from.printed;
    const paras = procedural
      ? [...a.xml.matchAll(/<(narrative|heading|subheading)\b[^>]*>([\s\S]*?)<\/\1>/g)].map(m => flat(m[2])).filter(Boolean)
      : epParagraphs(a.xml);
    if (!paras.length) continue;
    if (procedural) { addRecord(blocks, paras); continue; }
    speeches++;
    if (from.personId) speakers.add(from.personId);
    const mep = from.personId ? d.roster?.get(from.personId) : undefined;
    const group = d.roster ? (mep ? (mep.group ?? 'none') : 'not a sitting MEP') : 'unknown';
    const name = mep?.name || from.name || `member ${from.personId ?? '?'}`;
    const lang = epLang(a.xml);
    const translated = translatedFrom(lang);
    const note = translated ? ` | spoke in ${translated}; the English below is the Parliament's machine translation`
      : lang && !/^en(-|$)/i.test(lang) ? ` | no English text yet: this is the original (${languageName(lang.split('-')[0])})` : '';
    blocks.push({ head: `>> ${name} | political group: ${group} | member ${from.personId ?? 'unknown'} | as printed: “${noFullStop(from.printed)}”${note}.`, paras });
  }
  const { text, words } = layout([
    d.title,
    `European Parliament, plenary sitting of ${d.date}.`,
    epUrl(d.cre),
    `Verbatim report of proceedings (${d.cre}), read from the European Parliament's open data API (data.europarl.europa.eu), CC BY 4.0. Saved ${savedOn}. The consolidated report in all languages is issued some days after the sitting; the speeches are read from the API, which is earlier.`,
    `${speeches} speeches by ${speakers.size} speakers. Each speech is preceded by a line beginning ">>" with the speaker's name, political group on the day (the Parliament's list of sitting MEPs) and member id; "[record]" marks procedural text. A speech marked "spoke in X" was not given in English: the English text is the Parliament's machine translation (its xml:lang tag says so, for example hu-t-en-mtec), not the speaker's own words. The words are the record's; only markup is removed.`,
    ...notes.map(n => `NOTE: ${n}.`),
  ], blocks);
  return { text, speeches, speakers: speakers.size, words, what: `source=europarl date=${d.date} title=${JSON.stringify(d.title)}`, problems: [] };
}

export function epCreFromUrl(url: string): string {
  const cre = url.match(/(CRE-\d+-\d{4}-\d{2}-\d{2}-ITM-[\d-]+)/)?.[1];
  if (!cre) throw new Error(`no verbatim-report item (CRE-…-ITM-…) in ${url}`);
  return cre;
}

export async function fetchEuroparlText(url: string, get: Getter = politeGet, savedOn = today()): Promise<Saved> {
  const cre = epCreFromUrl(url);
  const deb = await fetchEuroparlDebate(get, cre);
  const problems: string[] = [];
  let roster: Map<number, Mep> | undefined;
  try { roster = await sittingMeps(get, EP_API, deb.date); } catch (e) { problems.push(`the list of MEPs failed (${(e as Error).message}): groups are marked unknown`); }
  if (deb.missing.length) {
    const n = deb.missing.length;
    problems.push(`${n} ${n === 1 ? 'activity' : 'activities'} of this agenda item could not be read and ${n === 1 ? 'is' : 'are'} missing from the text: ${deb.missing.slice(0, 5).join(', ')}${n > 5 ? ', …' : ''}`);
  }
  return { ...renderEuroparl({ ...deb, cre, roster }, savedOn, problems), problems };
}

// ---------------------------------------------------------------------------------------------------------------------

/** The debate's URL from what the caller gave: the URL itself, an item as JSON (or a file holding one), or a triage group. */
export function urlOf(arg: string): string {
  if (/^https?:\/\//.test(arg)) return arg;
  const t = arg.trim();
  const raw = t.startsWith('{') || t.startsWith('[') ? t : existsSync(arg) ? readFileSync(arg, 'utf8') : '';
  if (!raw) throw new Error(`neither a URL, JSON nor a file: ${arg.slice(0, 80)}`);
  const parsed = JSON.parse(raw) as { url?: string; main?: { url?: string } } | { url?: string }[];
  const item = Array.isArray(parsed) ? parsed[0] : parsed.main ?? parsed;
  if (!item?.url) throw new Error('the item has no url');
  return item.url;
}

export async function saveText(url: string, get: Getter = politeGet, savedOn = today()): Promise<Saved> {
  const host = new URL(url).hostname;
  if (host === 'hansard.parliament.uk') return fetchHansardText(url, get, savedOn);
  if (host === 'www.europarl.europa.eu') return fetchEuroparlText(url, get, savedOn);
  throw new Error(`not a debate page of UK Hansard or the European Parliament: ${url}`);
}

async function main() {
  const [arg, outBase] = process.argv.slice(2);
  if (!arg || !outBase) { console.error('usage: parliament-text.ts <item JSON | file | debate URL> OUT_BASE'); process.exit(2); }
  const saved = await saveText(urlOf(arg));
  mkdirSync(dirname(outBase), { recursive: true });
  writeFileSync(`${outBase}.txt`, saved.text);
  console.log(`ok ${saved.what} speeches=${saved.speeches} speakers=${saved.speakers} words=${saved.words} saved=${outBase}.txt`);
  for (const p of saved.problems) console.log(`WARNING: ${p}`);
  if (saved.words < 120) console.log('WARNING: very little text. The debate may be short, or still going on. Check it before you rely on it.');
}

if (process.argv[1]?.endsWith('parliament-text.ts')) main().catch(e => { console.error(`FAILED ${(e as Error).message}`); process.exit(1); });
