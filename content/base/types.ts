/**
 * The Base: Ctrl AI's record of what is happening with AI safety, AI control, and what AI is doing to work and society.
 *
 * One entry per source (an interview, an article, a paper, an official statement, a hearing), with our words around
 * their verified words. Everything else on the site can be a view over it: the weekly issue, the trackers, the questions,
 * person pages, and the lenses for each kind of reader.
 *
 * Entries are written by the Radar (scripts/radar/): agents read the sources, code checks every quotation against the
 * saved source text, and `review` records whether a person has looked at it yet.
 */

export type TopicId =
  | 'beyond-control' | 'safeguards' | 'self-improvement' | 'who-decides' | 'work-and-money'
  | 'minds-and-values' | 'security-and-war' | 'everyday-life' | 'where-it-goes';

export type LensId = 'public' | 'policy' | 'research' | 'ideas';

/** Propositions a quote can take a side on. Machine labels are kept apart and never published as fact. */
export type PropositionId =
  | 'loss-of-control' | 'labs-self-govern' | 'pre-release-testing' | 'slow-down'
  | 'race-with-china' | 'international-agreement' | 'liability' | 'speak-up';

export type Stance = 'agree' | 'lean-agree' | 'mixed' | 'lean-disagree' | 'disagree';

/**
 * What a source adds to what was already known: the reason a question's answer might change. The Radar labels every
 * entry, so a question page can say what changed since the last revision and a returning reader can see it.
 *   evidence    a new finding, incident, measurement or test result
 *   commitment  a new promise or policy someone announces about their own conduct
 *   decision    a law, ruling, regulation or official action actually taken
 *   correction  corrects, retracts or contradicts something reported or claimed before
 *   argument    a new argument, proposal or position, without new evidence
 *   repeat      known facts or arguments again (an explainer, a recap, a familiar view)
 */
export type ChangeKind = 'evidence' | 'commitment' | 'decision' | 'correction' | 'argument' | 'repeat';

export type EntryKind = 'news' | 'video' | 'podcast' | 'essay' | 'research' | 'official' | 'hearing';

export type Quote = {
  /** `<entry id>-<first 8 hex of the sha256 of its words>`: tied to the words, never to their place in the list. */
  id: string;
  text: string;
  /** A Person id, or an organization id when the words are an outlet's or an organization's own. */
  speaker: string;
  /** False for captions with no speaker names where a person still has to listen. */
  speakerCertain: boolean;
  context?: string;
  /** Seconds into the video, from the captions, when the checker found the words there. */
  at?: number;
  /** What the checker found: exact characters, or the same words with different punctuation. */
  match: 'exact' | 'words';
  /** For audio: the words were also found in a second, independent transcript of the same audio. */
  second?: boolean;
  warnings?: string[];
  /** Where this one quotation stands. `machine` labels are proposed by the agent and never shown; `editor` ones a person confirmed. */
  positions?: { q: PropositionId; stance: Stance; by: 'machine' | 'editor' }[];
};

export type Entry = {
  /** The Radar's item id: sha1 of the canonical URL, 12 hex. */
  id: string;
  /** URL slug: outlet-yyyy-mm-dd-words. Permalink: /base/<slug>. */
  slug: string;
  kind: EntryKind;
  title: string;
  url: string;
  outlet: string;
  /** YYYY-MM-DD, the source's own date. */
  published: string;
  minutes?: number;
  views?: number;
  also: { outlet: string; title: string; url: string }[];
  summary: string;
  /** What this source changes, in at most 25 words of our own. */
  change?: { kind: ChangeKind; note: string };
  lenses: Partial<Record<LensId, string>>;
  topics: TopicId[];
  people: { id: string; role: 'speaker' | 'author' | 'subject' | 'mentioned'; title?: string }[];
  orgs: string[];
  quotes: Quote[];
  /** 3 = a top story of the week, 2 = worth knowing, 1 = background. */
  importance: 1 | 2 | 3;
  /** How much of the source we could read. 'excerpt' means only the feed's description. */
  access: 'full' | 'partial' | 'abstract' | 'excerpt';
  /** official: the publisher's; auto: YouTube's automatic captions; stt: our own speech-to-text of the audio, with machine speaker labels. */
  transcript: 'official' | 'auto' | 'stt' | 'none';
  /** About Anthropic or Claude: Claude wrote the entry, and the page says so. */
  conflict: boolean;
  /** The Radar run that found it, and the source it came through. */
  run: string;
  via: { source: string; tier: 1 | 2 | 3 };
  review: { by: 'machine' | 'editor'; on?: string };
  notes?: string;
};

export type Person = {
  id: string;
  name: string;
  /** Titles as sources gave them, newest first, with the entry that gave each. */
  titles: { title: string; entry: string; on: string; role: 'speaker' | 'author' | 'subject' | 'mentioned' }[];
};
