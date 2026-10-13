/**
 * The registry: who the people and organizations in the Base are, so their words can be compared across groups and over
 * time. Curated, not generated: an agent proposes, a check against Wikidata or the source confirms, and a person
 * spot-checks. Public facts about public figures only (roles, employers, parties), each with where it came from.
 *
 * A person's group is never stored: it is worked out from their memberships at the date of each statement, so a
 * researcher who leaves a lab counts as a former lab employee from the day they left, not before.
 */

/** What kind of organization. A person's group comes from the kinds of the organizations they belonged to at the time. */
export type OrgKind =
  | 'ai-developer'        // builds frontier or widely used AI models: OpenAI, Anthropic, Google DeepMind, Meta, xAI, Microsoft, DeepSeek…
  | 'tech-company'        // other technology companies: chips, cloud, security, apps
  | 'company'             // companies outside technology
  | 'investor'            // venture capital, funds, banks, asset managers
  | 'university'
  | 'research-nonprofit'  // safety and evaluation research outside companies: METR, MIRI, Redwood, Apollo, Epoch, FAR.AI…
  | 'think-tank'          // policy research: CSET, CSIS, RAND, Brookings…
  | 'advocacy'            // campaigns for a policy outcome: PauseAI, ControlAI, Future of Life Institute…
  | 'civil-society'       // unions, charities, religious bodies, professional associations
  | 'government'          // executive branch: heads of government, ministries, agencies, AI security institutes
  | 'legislature'         // parliaments, congresses, councils, and their committees
  | 'regulator'           // independent regulators and enforcement bodies: FTC, EU AI Office, Ofcom…
  | 'court'
  | 'international'       // UN, OECD, IMF, World Bank…
  | 'media'               // outlets, podcasts and channels, as employers of journalists and hosts
  | 'other';

export type Org = {
  id: string;
  name: string;
  kind: OrgKind;
  /** ISO 3166-1 alpha-2, or 'EU' / 'INT' for European and international bodies. */
  country?: string;
  wikidata?: string;
  /** For committees, labs inside companies and the like: the organization it belongs to. */
  parent?: string;
  /** Other ids the Base has used for the same organization (agents slug names differently). */
  aliases?: string[];
};

export type Party = {
  id: string;
  name: string;
  country: string;
  wikidata?: string;
};

/** Where a fact in the registry came from. `agent` facts are proposals until checked. */
export type Provenance = { by: 'wikidata' | 'source' | 'agent' | 'editor'; ref?: string; on: string };

/** Dates as precise as the source gives them: YYYY, YYYY-MM or YYYY-MM-DD. */
export type Membership = {
  org: string;
  /** As the source or Wikidata gives it: "Chief executive", "Senator for Missouri", "Member of technical staff". */
  role: string;
  /** Founder, chief executive, president, chair, board member, or the head of a government body. */
  leadership?: boolean;
  /** For elected office: the party they sat for. */
  party?: string;
  from?: string;
  /** Absent while current. */
  to?: string;
  /** The membership has ended but the source gives no date ("former OpenAI researcher"). */
  ended?: boolean;
  source: Provenance;
};

export type PersonRecord = {
  id: string;
  name: string;
  aliases?: string[];
  /** A Wikidata id, only when the match is certain from what the sources say about the person. */
  wikidata?: string;
  /** Where they mainly act, ISO 3166-1 alpha-2. */
  country?: string;
  memberships: Membership[];
  /** Kept in the list of people we follow: their public statements are looked for actively, not only when quoted. */
  followed?: boolean;
  notes?: string;
};

/**
 * The groups the Base compares, worked out from memberships at a date (see groupAt in index.ts). The order below is
 * the order of precedence when someone belongs to several: an elected official who once worked at a lab counts as an
 * elected official.
 */
export type Group =
  | 'elected-official' | 'government-official' | 'regulator' | 'international-official'
  | 'ai-developer-leader' | 'ai-developer-staff' | 'former-ai-developer-staff'
  | 'academic' | 'nonprofit-researcher' | 'think-tank' | 'advocate'
  | 'tech-industry' | 'business' | 'investor' | 'civil-society' | 'journalist' | 'other';
