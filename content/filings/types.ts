/**
 * Filings: what a company must tell investors, set next to what it says in public. Every passage is the source's own
 * words, checked by scripts/filings/check.ts against the copies kept in the private archive (content/filings/verification.json).
 */

/** A company's own public page that a filing is compared with. */
export type PublicSource = { title: string; date: string; url: string; archived: string };

/** Words from the filing (source 'filing') or from one of the company's public pages, as they read there. */
export type Passage = { id: string; text: string; source: 'filing' | string };

/** One risk, as told to investors and as told in public. `public` holds passages from public pages, or the id of a
 *  quotation already in the Base. `note` is ours, kept to what the reader can see on the page. */
export type Theme = { id: string; title: string; filing: string[]; public: ({ passage: string } | { quote: string })[]; note?: string };

/** A row of a table in the filing, as its text reads in the saved filing, so it can be checked like a passage. */
export type TableRow = { label: string; row: string };

/** A headline about the filing, set next to the filing's own words on the same point. */
export type Headline = { entry: string; filing: string[] };

export type Filing = {
  slug: string;
  company: string;
  form: string;
  filed: string;
  /** The SEC's address for the main document, and for the whole filing. */
  url: string;
  index: string;
  pages: number;
  /** The saved text of the main document, relative to the archive. */
  archived: string;
  sources: Record<string, PublicSource>;
  passages: Passage[];
  money: {
    passages: string[];
    /** The filing's summary table: its columns, which are audited, and the rows shown. */
    table: { page: string; unit: string; columns: { label: string; audited: boolean }[]; rows: TableRow[] };
    commitments: string[];
  };
  themes: Theme[];
  press: { quotes: string[]; headlines: Headline[] };
};
