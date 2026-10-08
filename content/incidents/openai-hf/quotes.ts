import type { Quote } from './types';
import { QUOTES_METR } from './quotes-metr';
import { QUOTES_AFTER } from './quotes-after';
import { QUOTES_OTHERS } from './quotes-others';

export const QUOTES: Quote[] = [...QUOTES_METR, ...QUOTES_OTHERS, ...QUOTES_AFTER];
export const QUOTE_BY_ID: Record<string, Quote> = Object.fromEntries(QUOTES.map(q => [q.id, q]));
