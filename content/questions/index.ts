import { BEYOND_CONTROL } from './beyond-control';
import type { Question } from './types';

export const QUESTIONS: Question[] = [BEYOND_CONTROL];

/** A question page is live only once it is published; in development, and with QUESTIONS_FORCE_PUBLIC=1, all show. */
export const visible = (q: Question) => q.published || process.env.NODE_ENV !== 'production' || process.env.QUESTIONS_FORCE_PUBLIC === '1';
export const getQuestion = (id: string) => QUESTIONS.find(q => q.id === id && visible(q));
