import type { DecisionBrief } from './types';

export const BRIEFS: DecisionBrief[] = [];

/** A brief is live only once published; in development, and with QUESTIONS_FORCE_PUBLIC=1, all show. */
export const visible = (b: DecisionBrief) => b.published || process.env.NODE_ENV !== 'production' || process.env.QUESTIONS_FORCE_PUBLIC === '1';
export const getBrief = (id: string) => BRIEFS.find(b => b.id === id && visible(b));
