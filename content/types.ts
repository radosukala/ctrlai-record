/** What a pick is, wherever it appears: in a weekly issue or in the Hall of Fame. */

export type Kind =
  | 'video' | 'podcast' | 'post' | 'article' | 'essay' | 'newsletter'
  | 'paper' | 'report' | 'statement' | 'book' | 'film';

/** Where the piece stands on the risk. Shown with its label, never as color alone. */
export type Stance = 'alarmed' | 'measured' | 'skeptical' | 'news';

export type Pick = {
  /** Stable within its list; used in URLs for share cards and in analytics events. */
  id: string;
  kind: Kind;
  title: string;
  creator: string;
  /** The channel, publication or show, when it differs from the creator. */
  outlet?: string;
  url: string;
  /** YYYY-MM-DD, or YYYY-MM / YYYY when the day isn't known. */
  published: string;
  /** Running time for videos and podcasts. */
  minutes?: number;
  /** One or two plain sentences: why a newcomer should open it. Written by us, checked against the source. */
  why: string;
  stance: Stance;
  /** X handles to tag when we post this pick, without the @. Only handles we checked exist. */
  x?: string[];
};

export type Source = { label: string; url: string };

/** Something that happened in the world, with the reporting that confirms it. */
export type Event = {
  date: string;
  headline: string;
  text: string;
  sources: Source[];
};

export const KIND_LABEL: Record<Kind, string> = {
  video: 'Video', podcast: 'Podcast', post: 'Post on X', article: 'Article', essay: 'Essay', newsletter: 'Newsletter',
  paper: 'Paper', report: 'Report', statement: 'Statement', book: 'Book', film: 'Film',
};

export const STANCE_LABEL: Record<Stance, string> = {
  alarmed: 'Alarmed', measured: 'Measured', skeptical: 'Skeptical', news: 'Record',
};
