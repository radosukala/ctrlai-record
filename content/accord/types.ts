/**
 * Types for the accord tracker. The rules these types carry are written out in docs/ACCORD-TRACKER.md and enforced by
 * tests/accord.test.ts.
 */

export type CompanyId = 'anthropic' | 'google' | 'meta' | 'nvidia' | 'openai' | 'xai';

/** The four layers of controls the accord names. */
export type LayerId = 'L1' | 'L2' | 'L3' | 'L4';

/**
 * What the public record shows about one commitment since the accord was published. It says what is public, not what is
 * true inside a company.
 *
 * - nothing: no public statement or action dated on or after the publication date that we could find.
 * - said: the company says it does this, or will, in general terms.
 * - detailed: the company gives specifics anyone could check: who, what, which document.
 * - confirmed: someone other than the company confirms it.
 * - contradicted: public evidence points the other way.
 */
export type Status = 'nothing' | 'said' | 'detailed' | 'confirmed' | 'contradicted';

/**
 * What a source is, so a status can be held to the right standard (see tests/accord.test.ts).
 * 'regulator' is a body that regulates companies (the FTC, the SEC); 'official' is any other government or international body
 * (an executive order, the Federal Register, a UN briefing, a Senate committee page); 'advocacy' is a trade body or campaign
 * organisation speaking for its own interests; 'joint-commitment' is the accord itself, which six companies and the President signed.
 */
export type EvidenceKind = 'company-document' | 'company-statement' | 'filing' | 'news' | 'regulator' | 'official' | 'auditor' | 'analysis' | 'advocacy' | 'joint-commitment';

/** One thing we opened and read. A claim on the page rests on one of these, or on the accord's own text. */
export type Evidence = {
  /** Unique across the tracker. Also the key of this item's record in verification.json. */
  id: string;
  /** What the source shows, in our words, with no more strength than the source has. */
  claim: string;
  publisher: string;
  title: string;
  url: string;
  /** The date the page states: "2026-10-07", or "2026-10" if only the month is stated, or null if none is. */
  published: string | null;
  /** When the date is not a publication date, or there is none: what it is, in a few words, shown beside the date. */
  dateNote?: string;
  /** For an undated item that we can prove existed by this date (an archived copy): the day by which it existed. Only "before" items. */
  notAfter?: string;
  kind: EvidenceKind;
  /** True only if the source itself mentions the accord. */
  mentionsAccord: boolean;
  /** Exact words from the source, one passage, at most 25 words. scripts/verify-accord.ts checks it against the saved text. */
  quote: string;
  /**
   * Where the full text of the source was saved, relative to docs-internal/accord-2026-10/ (not in the repository: the texts
   * are other people's writing). The page ignores it; scripts/verify-accord.ts and the tests use it.
   */
  textFile: string;
};

export type Cell = {
  /** The strongest honest reading of `since`. `nothing` if `since` is empty. */
  status: Status;
  /** One or two plain sentences about what is public since the accord (or that we found nothing), no stronger than the evidence. */
  summary: string;
  /** Dated on or after the accord's publication date. */
  since: Evidence[];
  /** Dated before it: what the company already described publicly. Never counts toward `status`. */
  before: Evidence[];
  /** One plain sentence about `before`, when there is any. */
  beforeSummary?: string;
  /** Anything a reader should know that the evidence does not say. */
  note?: string;
  /** The same sentences in Czech, translated from the English by an AI model and not yet reviewed by a native speaker. */
  cs?: { summary?: string; beforeSummary?: string; note?: string };
};

export type CompanyRecord = {
  id: CompanyId;
  /** The name as the signature page prints it, for the record. */
  printedAs: string;
  name: string;
  /** Who signed for the company, as printed. */
  signedBy: string;
  /** Which legal or operating entity the sources concern, when that is not obvious. */
  entity?: string;
  /** The date we last looked: "2026-10-10". */
  checkedOn: string;
  /** Where we looked, including places that had nothing. Shown on the page. */
  searched: string[];
  /** Pages we could not open, and why. Shown on the page. */
  unreachable: string[];
  cells: Record<LayerId, Cell>;
  /** The company's own public statements about the accord, if any. */
  accordStatements: Evidence[];
  /** The company's primary public safety and governance documents. */
  documents: { title: string; url: string; published: string | null; whatItIs: string }[];
};

export type Commitment = {
  id: LayerId | 'G';
  /** "1", "2", "3", "4" or "meet": the number the accord prints. */
  number: string;
  short: string;
  shortCs: string;
  /** The accord's own words, exactly as printed. */
  text: string;
  /** Our reading, in plain words. Marked as ours on the page. */
  plain: string;
  /** What the text does not say about this commitment. Each claim is checked against the text by the tests. */
  silent: string;
  /** Czech versions of `plain` and `silent` (AI translation, not yet reviewed by a native speaker). */
  plainCs: string;
  silentCs: string;
};

export const STATUS_ORDER: Status[] = ['nothing', 'said', 'detailed', 'confirmed', 'contradicted'];

export const STATUS_LABEL: Record<Status, string> = {
  nothing: 'Nothing new',
  said: 'Said',
  detailed: 'Detailed',
  confirmed: 'Confirmed',
  contradicted: 'Contradicted',
};

export const STATUS_MEANING: Record<Status, string> = {
  nothing: 'No public statement or action since the accord that we could find.',
  said: 'The company says it does this, or will, in general terms.',
  detailed: 'The company gives specifics anyone could check: who, what, which document.',
  confirmed: 'Someone other than the company confirms it.',
  contradicted: 'Public evidence points the other way.',
};

/** Something around the accord that a reader should know: the order signed alongside it, the reactions, the critics and defenders. */
export type ContextItem = {
  id: string;
  title: string;
  /** What this item shows, in our words, no stronger than its evidence. */
  text: string;
  /** Czech version (AI translation, not yet reviewed by a native speaker). */
  cs?: { title?: string; text?: string };
  evidence: Evidence[];
};
