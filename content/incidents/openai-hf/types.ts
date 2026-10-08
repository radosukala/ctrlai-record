/**
 * The OpenAI–Hugging Face incident, reconstructed. Everything on the page is built from these records, and every
 * record cites where it comes from. The rules this file encodes:
 *   - Our own words are marked as ours; quotations are verbatim and checked by code against the saved source text.
 *   - Reasoning text is "recorded reasoning text", never "what the AI thinks".
 *   - Nothing here reproduces exploit strings, endpoints, hostnames or credentials, even when a source does.
 */

export type SourceId = 'oai-blog' | 'oai-tr' | 'metr' | 'hf' | 'oai-astra' | 'fortune';

export type Source = {
  id: SourceId;
  /** One letter for the "three accounts" table (A and F are not accounts of the incident: they are what the film ends on). */
  badge: 'O' | 'T' | 'M' | 'H' | 'A' | 'F';
  short: string;
  title: string;
  by: string;
  date: string;
  url: string;
  kind: 'affected-party' | 'independent';
  /** What a reader should know about how far to trust it, in one line. */
  note: string;
};

/** Where in a source a statement comes from. `at` is a section name or page, so a reader can find it. */
export type Cite = { s: SourceId; at: string };

/** The stations on the reach ladder, from where the agents started to where they ended up. */
export type Zone = 'sandbox' | 'cache' | 'internet' | 'steps' | 'hf' | 'oai';

export type Chapter = 1 | 2 | 3 | 4;

export type Precision = 'minute' | 'hour' | 'day' | 'range';

export type Ev = {
  id: string;
  /** ISO UTC. For a range, the start. */
  t: string;
  until?: string;
  precision: Precision;
  /** A minute-precise time that a source gives as "around" or "about". */
  approx?: boolean;
  chapter: Chapter;
  /** What agents did, or what people did. */
  lane: 'agents' | 'humans';
  zone?: Zone;
  /** How the event changes the station: tried and failed or only touched, got through, or a control that held. */
  effect?: 'touch' | 'breach' | 'held';
  /** 1 is the main story, 2 is detail, 3 is fine print. */
  tier: 1 | 2 | 3;
  title: string;
  /** Our words. [[term]] marks a glossary word. */
  text: string;
  agents?: string[];
  quotes?: string[];
  cites: Cite[];
  /** Where the accounts differ about this event. */
  differ?: string;
};

export type Quote = {
  id: string;
  /** Exactly as the source prints it, without the quotation marks around it. */
  text: string;
  /** Reasoning is 'raw' only where the source says so; OpenAI's blog labels some excerpts raw and not others. */
  kind: 'message' | 'reasoning-raw' | 'reasoning-quoted' | 'reasoning-paraphrased' | 'statement';
  /** An agent handle, or the organisation speaking. */
  by?: string;
  /** Our plain-language reading, at most 30 words. Always labelled as ours. */
  gloss?: string;
  /** UTC, when the source dates it: a full time ('2026-07-09T23:04:00Z'), or only the day ('2026-07-09') when that is all it gives. */
  at?: string;
  src: Cite;
  tags: Tag[];
  /** Set only when a person has read the words before the quote and found the checker’s warning does not apply. Say why. */
  waive?: { leadIn: string };
};

export type Tag = 'discovery' | 'coordination' | 'belief' | 'ethics' | 'sacrifice' | 'deception' | 'attack' | 'plumbing' | 'humans' | 'oversight' | 'limits';

export type AgentGroup = 'founders' | 'plumbing' | 'hf' | 'tamper' | 'scorer' | 'target' | 'flag';

export type Agent = {
  id: string;
  group: AgentGroup;
  role: string;
  /** Our words, at most 40. */
  summary: string;
  /** The first time a source documents this agent doing something, as precisely as that source says. */
  first?: { t: string; precision: Precision; approx?: boolean };
  cites: Cite[];
  quotes?: string[];
};

export type LinkKind = 'handoff' | 'assigned' | 'recruited' | 'pressured' | 'reproduced' | 'influenced' | 'asked' | 'coordinated';

export type Link = { from: string; to: string; kind: LinkKind; note?: string; cites: Cite[] };

export type Figure = { id: string; value: string; label: string; cite: Cite; caveat?: string };

/** A number the sources give at a point in time. The replay shows only the latest one it has reached. */
export type Counter = { t: string; precision: Precision; key: 'agents' | 'messages' | 'joined' | 'hfWorkers'; value: string; cite: Cite };

export type AccountRow = { topic: string; O?: string; M?: string; H?: string; note?: string; cites: Cite[] };

export type Unknown = { q: string; who: string; cites: Cite[] };

export type Term = { id: string; label: string; def: string };

/** Something that happened after the reports of August 26, which the film ends on. Our words; every claim rests on the quotations and sources cited. */
export type After = { id: string; day: string; title: string; text: string; quotes: string[]; cites: Cite[] };
