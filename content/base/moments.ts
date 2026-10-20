import type { Moment } from '../../lib/moments';
import { ENTRIES } from './index';
import type { Entry, Quote } from './types';
import momentsJson from './moments.json';

/**
 * When each timed, speaker-certain quotation is said in its recording, word by word (scripts/radar/moments.ts builds
 * the file in the daily finish). A quotation with a moment can be played from its source and lit up as it is spoken.
 */
export const MOMENTS = momentsJson as Record<string, Moment>;
export const momentFor = (quoteId: string): Moment | undefined => MOMENTS[quoteId];

const BY_QUOTE = new Map<string, { e: Entry; q: Quote }>(ENTRIES.flatMap(e => e.quotes.map(q => [q.id, { e, q }] as const)));

/** A quotation that has a moment, with its entry: what the page /moment/<quote id> is made from. */
export function momentQuote(id: string): { e: Entry; q: Quote; moment: Moment } | undefined {
  const found = BY_QUOTE.get(id);
  const moment = MOMENTS[id];
  return found && moment ? { ...found, moment } : undefined;
}

/** The quotations that have a page: every moment whose quotation is still in the Base. */
export const momentIds = (): string[] => Object.keys(MOMENTS).filter(id => BY_QUOTE.has(id));
