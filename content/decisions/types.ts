import type { TopicId } from '../base/types';
import type { Cite } from '../questions/types';

/**
 * A decision brief: one pending public decision about AI, laid out so a reader can form a view and take part. What is
 * being decided and by whom, the options on the table with the case for and against each, the evidence and the open
 * questions, a verified deadline and how to take part, and later what was decided and what followed.
 *
 * Every fact cites what it rests on. The arguments for and against an option are attributed to whoever made them; the
 * brief recommends nothing.
 */
export type Fact = { id: string; text: string; cites: Cite[] };

export type Argument = { text: string; who: string; cites: Cite[] };

export type Option = {
  id: string;
  name: string;
  /** What it would do, in plain words. */
  what: string;
  for: Argument[];
  against: Argument[];
};

export type DecisionBrief = {
  id: string;
  /** The decision as a question: "Should reporting serious AI incidents become a legal duty in the UK?" */
  title: string;
  jurisdiction: string;
  /** The answered questions this decision bears on. */
  questions: TopicId[];
  version: number;
  asOf: string;
  published: boolean;
  /** What is being decided, in two or three sentences. */
  summary: string;
  /** Who has the power to decide, and who can influence it. */
  who: Fact[];
  /** Where it stands now. */
  status: Fact[];
  options: Option[];
  /** What the evidence says that bears on the choice. */
  evidence: Fact[];
  openQuestions: Fact[];
  /** Only deadlines verified on an official page. */
  deadlines: (Fact & { date: string })[];
  /** Ways to take part that are open now, verified. Empty is a valid answer, and the page says so. */
  participate: (Fact & { until?: string })[];
  /** Questions a reader could put to their representative, in neutral words. */
  ask: string[];
  /** Filled in once decided: what was decided, and what happened afterwards. */
  outcome?: { decided: string; on: string; cites: Cite[]; afterwards: Fact[] };
  revisions: { version: number; date: string; note: string }[];
};
