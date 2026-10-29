import { ANTHROPIC_S1 } from '../filings/anthropic-s1';
import type { Filing } from '../filings/types';

/**
 * The money behind AI: what the companies earn, spend and promise, and what they warn investors about, from their own
 * filings, every passage and figure checked against the filing (content/filings). The same rules for every company:
 * labs first, then the clouds that run the models and the makers of the chips they run on, as their filings are read.
 */
export type Group = 'labs' | 'clouds' | 'chips';
export type Company = { slug: string; name: string; group: Group; about: string; filings: Filing[] };

export const GROUPS: { id: Group; title: string; about: string }[] = [
  { id: 'labs', title: 'AI labs', about: 'The companies that build the frontier models.' },
  { id: 'clouds', title: 'Clouds and hyperscalers', about: 'Where the models are trained and run.' },
  { id: 'chips', title: 'Chips', about: 'What the computing runs on.' },
];

export const COMPANIES: Company[] = [
  { slug: 'anthropic', name: 'Anthropic', group: 'labs', about: 'Maker of Claude, and a public benefit corporation. Filed to list its shares on October 26, 2026.', filings: [ANTHROPIC_S1] },
];

/** Who comes next, and from which documents. Shown as a plan, without numbers, until their filings are read. */
export const NEXT: { group: Group; names: string[]; from: string }[] = [
  { group: 'labs', names: ['OpenAI'], from: 'when its financial statements are public' },
  { group: 'clouds', names: ['Microsoft', 'Alphabet', 'Amazon', 'Meta', 'Oracle', 'CoreWeave'], from: 'from their quarterly and annual reports to the SEC' },
  { group: 'chips', names: ['Nvidia', 'AMD', 'Broadcom', 'TSMC'], from: 'from their quarterly and annual reports' },
];

export const getCompany = (slug: string) => COMPANIES.find(c => c.slug === slug);
export const filingPath = (f: Filing) => `/money/${f.companySlug}/${f.path}`;
/** The newest filing with a financial table: what a company's page draws. */
export const latestFiling = (c: Company) => [...c.filings].sort((a, b) => b.filed.localeCompare(a.filed))[0];
