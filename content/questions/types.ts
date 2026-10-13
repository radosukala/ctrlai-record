import type { TopicId } from '../base/types';

/**
 * A question with a maintained answer: what the evidence in the Base supports, where informed people disagree, what is
 * unknown, and what changed since the last revision. One of the Base's nine questions, answered.
 *
 * Every claim cites what it rests on: a Base entry (by slug), a page of the site (the reconstruction, the accord
 * tracker), or an outside source. Facts, forecasts and value questions are kept apart, because they need different kinds
 * of answers. A revision changes the version and says what changed and why.
 */
export type Cite =
  | { base: string }                       // a Base entry, by slug
  | { page: string; label: string }        // a page of ctrlai.com
  | { url: string; label: string };        // an outside source

export type Claim = { id: string; text: string; cites: Cite[] };

export type Question = {
  id: TopicId;
  question: string;
  version: number;
  /** YYYY-MM-DD: the day the answer was last revised. */
  asOf: string;
  /** Shown on the live site only when true. */
  published: boolean;
  /** The short answer, 100–180 words, our words. */
  answer: string;
  /** What the evidence establishes. Facts only, each cited. */
  established: Claim[];
  /** Where that evidence stops. */
  limits: Claim[];
  /** Where informed people disagree, who, and what the disagreement depends on. */
  disagreements: { id: string; point: string; sides: { view: string; who: string; cites: Cite[] }[]; dependsOn: string }[];
  /** What changed since the previous version (or, for version 1, since the Base began). */
  changed: { since: string; items: Claim[] };
  unknowns: Claim[];
  /** What evidence would move the answer, and which way. */
  wouldChange: Claim[];
  /** Questions of value: not settled by evidence, so not answered here, only laid out. */
  values: Claim[];
  revisions: { version: number; date: string; note: string }[];
};
