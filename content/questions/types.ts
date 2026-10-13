import type { ChangeKind, TopicId } from '../base/types';

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

/**
 * One disagreement is one question. Views that answer different questions (can it be contained? should it slow? should
 * reporting be required?) can coexist, so they are never set against each other. A question of fact could be settled
 * by evidence; a question of policy also turns on values.
 */
export type Disagreement = {
  id: string;
  point: string;
  kind: 'fact' | 'policy';
  /** Exactly what is in dispute, so a view on something narrower or broader isn't counted as a side. */
  scope: string;
  sides: { view: string; who: string; cites: Cite[] }[];
  dependsOn: string;
};

/** A decision someone has the power to make, which the answer bears on. A full decision brief can link from here. */
export type Decision = { id: string; what: string; who: string; status: string; cites: Cite[] };

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
  disagreements: Disagreement[];
  /** What changed since the previous version (or, for version 1, since the week before). Each item says whether it is
   *  new evidence, a commitment, a decision, a correction, or only a new argument. */
  changed: { since: string; items: (Claim & { kind: ChangeKind })[] };
  /** Decisions this bears on: who can make them and where they stand. */
  decisions: Decision[];
  unknowns: Claim[];
  /** What evidence would move the answer, and which way. */
  wouldChange: Claim[];
  /** Questions of value: not settled by evidence, so not answered here, only laid out. */
  values: Claim[];
  revisions: { version: number; date: string; note: string }[];
};
