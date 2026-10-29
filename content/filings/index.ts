import { ENTRIES } from '../base';
import type { Entry, Quote } from '../base/types';
import { ANTHROPIC_S1 } from './anthropic-s1';
import type { Filing, Passage } from './types';
import verificationJson from './verification.json';

/** Filings with a page, newest first. Every company's filing is treated the same way. */
export const FILINGS: Filing[] = [ANTHROPIC_S1];
export const getFiling = (slug: string) => FILINGS.find(f => f.slug === slug);

export type PassageCheck = { ok: boolean; page?: string; sha: string };
export type PressCheck = { mode: 'exact' | 'words' | 'spelling' | 'none'; page?: string; filing?: string; differences?: string[] };
export type Verification = { checkedOn: string; filings: Record<string, { sha: string; passages: Record<string, PassageCheck>; rows: Record<string, boolean>; press: Record<string, PressCheck> }> };
export const VERIFICATION = verificationJson as Verification;

export const passageOf = (f: Filing, id: string): Passage => {
  const p = f.passages.find(x => x.id === id);
  if (!p) throw new Error(`${f.slug}: no passage ${id}`);
  return p;
};

const BY_QUOTE = new Map<string, { e: Entry; q: Quote }>(ENTRIES.flatMap(e => e.quotes.map(q => [q.id, { e, q }] as const)));
export const quoteOf = (id: string) => BY_QUOTE.get(id);
export const entryOf = (id: string) => ENTRIES.find(e => e.id === id);
