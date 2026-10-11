import type { CompanyRecord, LayerId, Status } from './types';
import { STATUS_ORDER } from './types';
import { ACCORD } from './facts';
import { COMPANIES, CONTEXT, MEETINGS } from './companies';

export * from './types';
export * from './facts';
export { COMPANIES, MEETINGS, CONTEXT, company } from './companies';

export const LAYERS: LayerId[] = ['L1', 'L2', 'L3', 'L4'];

const DAY = 864e5;
const at = (date: string) => Date.parse(`${date}T12:00:00Z`);

/** Whole days from one date to another: "2026-09-29" to "2026-10-10" is 11. */
export const daysBetween = (from: string, to: string) => Math.round((at(to) - at(from)) / DAY);

/** The most recent date any record was checked. The page counts days to this date, never to the date it is read. */
export const CHECKED_ON = [...COMPANIES.map(c => c.checkedOn), MEETINGS.checkedOn, CONTEXT.checkedOn].sort().at(-1)!;

export const DAYS_SINCE = daysBetween(ACCORD.published, CHECKED_ON);

/** Company-level cells: four layers for each company. The meeting commitment is counted separately. */
export const CELLS = COMPANIES.flatMap(c => LAYERS.map(layer => ({ company: c, layer, cell: c.cells[layer] })));

export function tally(): Record<Status, number> {
  const counts = Object.fromEntries(STATUS_ORDER.map(s => [s, 0])) as Record<Status, number>;
  for (const { cell } of CELLS) counts[cell.status] += 1;
  return counts;
}

/** Cells with any new public evidence since the accord. */
export const CELLS_WITH_NEWS = () => CELLS.filter(({ cell }) => cell.status !== 'nothing').length;

const OWN_KINDS = new Set(['company-document', 'company-statement', 'filing']);
const ownWordsRefer = (cell: { since: { mentionsAccord: boolean; kind: string }[] }) => cell.since.some(e => e.mentionsAccord && OWN_KINDS.has(e.kind));
const anyoneRefers = (cell: { since: { mentionsAccord: boolean }[] }) => cell.since.some(e => e.mentionsAccord);

/** Cells where something dated since the accord that is the company's own (its page, filing or leader's words) refers to the accord. */
export const CELLS_OWN_WORDS_REFER = () => CELLS.filter(({ cell }) => ownWordsRefer(cell)).length;

/** Cells where only an outside source (news, analysis, an official body) dated since the accord refers to it. */
export const CELLS_ONLY_OTHERS_REFER = () => CELLS.filter(({ cell }) => anyoneRefers(cell) && !ownWordsRefer(cell)).length;

/** Cells where we list something the company published before the accord on the same subject. */
export const CELLS_WITH_BEFORE = () => CELLS.filter(({ cell }) => cell.before.length > 0).length;

export const recordFor = (c: CompanyRecord, layer: LayerId) => c.cells[layer];

/** "1 source", "3 sources". */
export const sources = (n: number) => `${n} ${n === 1 ? 'source' : 'sources'}`;

/** What happened on the page, in order, newest first. A dated, honest record of every change to the tracker. */
export const CHANGELOG: { date: string; text: string; cs: string }[] = [
  { date: '2026-10-10', text: 'First version: the accord’s text, its four controls and its commitment to meet, and what the six companies have shown publicly.', cs: 'První verze: text dohody, čtyři opatření a závazek scházet se a to, co šest firem od dohody veřejně ukázalo.' },
];
