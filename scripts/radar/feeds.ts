/**
 * Reading the feeds the Radar polls: RSS, Atom (YouTube, arXiv, GOV.UK, forums), and three JSON APIs (Hacker News, GOV.UK
 * search, YouTube's Data API). No dependencies: feeds are small and regular, so a few patterns read them. What comes back is untrusted text;
 * nothing here acts on it. Parliaments (UK Hansard, the European Parliament) are read in parliament.ts.
 */
import { createHash } from 'node:crypto';

/** What the Radar calls itself when it asks a server for something. */
export const UA = 'CtrlAIBot/0.1 (+https://ctrlai.com/about; reads public feeds once a day)';

export type Source = {
  id: string;
  name: string;
  kind: 'youtube' | 'podcast' | 'blog' | 'gov' | 'gov-api' | 'forum' | 'arxiv' | 'hn' | 'parliament';
  url: string;
  tier: 1 | 2 | 3;
  filter: 'on-topic' | 'ai' | 'general';
  capped?: boolean;
  lab?: boolean;
  /** parliament: which house of the UK Parliament (the European Parliament has one plenary, so none). */
  house?: 'Commons' | 'Lords';
};

/** Someone who spoke in a parliamentary debate: the name as the record gives it, their id in that parliament's own database
 * (UK Members API id, European Parliament person id), and their party (UK) or political group (EP) on the day of the sitting. */
export type Speaker = { name: string; memberId?: number; party?: string };

export type Item = {
  id: string;
  source: string;
  sourceName: string;
  kind: Source['kind'];
  tier: Source['tier'];
  title: string;
  url: string;
  /** ISO time as the feed gives it. */
  published: string;
  excerpt: string;
  author?: string;
  durationSec?: number;
  views?: number;
  points?: number;
  comments?: number;
  videoId?: string;
  /** For Hacker News: the discussion page, when the story links elsewhere. */
  discussion?: string;
  /** A podcast episode's audio file, from the feed's enclosure: what speech-to-text reads when no transcript exists. */
  audio?: string;
  /** A transcript the publisher lists in the feed (<podcast:transcript>), best first. */
  transcripts?: { url: string; type: string }[];
  /** Parliament debates (one item per debate): the members who spoke on AI in it, in the order they spoke. */
  speakers?: Speaker[];
};

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
export function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
/** Text without markup, on one line. Decodes twice because many feeds escape their HTML. */
export function plain(s: string): string {
  const once = decode(s);
  return decode(once.replace(/<[^>]+>/g, ' ')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function tag(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1] : undefined;
}
function attr(block: string, name: string, a: string, where?: RegExp): string | undefined {
  const re = new RegExp(`<${name}\\b([^>]*)/?>`, 'gi');
  for (const m of block.matchAll(re)) {
    if (where && !where.test(m[1])) continue;
    const v = m[1].match(new RegExp(`\\b${a}="([^"]*)"`, 'i'));
    if (v) return decode(v[1]);
  }
  return undefined;
}

/** Drops tracking parameters, fragments and AMP paths so one story has one id. */
export function canonical(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|ref$|ref_|source$|smid|cmpid|feature$|guccounter|mc_)/i.test(k)) u.searchParams.delete(k);
    u.pathname = u.pathname.replace(/\/amp\/?$/, '/');
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/watch?v=${u.pathname.slice(1)}`;
    u.hostname = u.hostname.replace(/^(m|amp)\./, 'www.');
    return u.toString().replace(/\/$/, '');
  } catch { return url.trim(); }
}
export const itemId = (url: string) => createHash('sha1').update(canonical(url)).digest('hex').slice(0, 12);

function duration(s?: string): number | undefined {
  if (!s) return undefined;
  const t = s.trim();
  if (/^\d+$/.test(t)) return Number(t);
  const parts = t.split(':').map(Number);
  if (parts.some(isNaN)) return undefined;
  return parts.reduce((a, b) => a * 60 + b, 0);
}

export function base(src: Source, title: string, url: string, published: string, excerpt: string): Item {
  return { id: itemId(url), source: src.id, sourceName: src.name, kind: src.kind, tier: src.tier, title: plain(title), url: canonical(url), published, excerpt: plain(excerpt).slice(0, 1200) };
}

export function parseFeed(src: Source, xml: string): Item[] {
  const out: Item[] = [];
  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi);
  if (entries) {
    for (const e of entries) {
      const link = attr(e, 'link', 'href', /rel="alternate"/) ?? attr(e, 'link', 'href') ?? '';
      const videoId = tag(e, 'yt:videoId');
      const url = videoId ? `https://www.youtube.com/watch?v=${videoId}` : link;
      if (!url) continue;
      const published = tag(e, 'published') ?? tag(e, 'updated') ?? '';
      const excerpt = tag(e, 'media:description') ?? tag(e, 'summary') ?? tag(e, 'content') ?? '';
      const it = base(src, tag(e, 'title') ?? '', url, published.trim(), excerpt);
      const author = tag(e, 'author');
      if (author) it.author = plain(tag(author, 'name') ?? author);
      if (src.kind === 'arxiv') {
        const names = [...e.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/gi)].map(m => plain(m[1]));
        if (names.length) it.author = names.length > 4 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} others` : names.join(', ');
      }
      if (videoId) {
        it.videoId = videoId;
        const views = attr(e, 'media:statistics', 'views');
        if (views) it.views = Number(views);
      }
      out.push(it);
    }
    return out;
  }
  for (const e of xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? []) {
    let url = plain(tag(e, 'link') ?? '');
    if (!/^https?:/.test(url)) url = plain(tag(e, 'guid') ?? '');
    if (!/^https?:/.test(url)) url = attr(e, 'enclosure', 'url') ?? '';
    if (!url) continue;
    const published = plain(tag(e, 'pubDate') ?? tag(e, 'dc:date') ?? '');
    const iso = published ? new Date(published).toISOString() : '';
    const excerpt = tag(e, 'description') ?? tag(e, 'itunes:summary') ?? tag(e, 'content:encoded') ?? '';
    const it = base(src, tag(e, 'title') ?? '', url, iso, excerpt);
    const author = tag(e, 'dc:creator') ?? tag(e, 'author') ?? tag(e, 'itunes:author');
    if (author) it.author = plain(author);
    const d = duration(plain(tag(e, 'itunes:duration') ?? ''));
    if (d) it.durationSec = d;
    const audio = attr(e, 'enclosure', 'url', /type="audio/);
    if (audio) it.audio = audio;
    const transcripts = [...e.matchAll(/<podcast:transcript\b([^>]*)\/?>/gi)].map(m => ({
      url: decode(m[1].match(/\burl="([^"]*)"/i)?.[1] ?? ''), type: m[1].match(/\btype="([^"]*)"/i)?.[1] ?? '',
    })).filter(t => t.url);
    // Plain text and WebVTT carry speaker names more often than SRT; JSON has the most structure.
    const rank = (t: string) => ['application/json', 'text/vtt', 'text/plain', 'text/html', 'application/x-subrip', 'application/srt'].indexOf(t) + 1 || 9;
    if (transcripts.length) it.transcripts = transcripts.sort((x, y) => rank(x.type) - rank(y.type));
    out.push(it);
  }
  return out;
}

/** A channel's uploads playlist in YouTube's Data API: the channel id with UU in place of UC. */
export function uploadsPlaylist(feedUrl: string): string | undefined {
  try {
    const id = new URL(feedUrl).searchParams.get('channel_id');
    return id?.startsWith('UC') ? `UU${id.slice(2)}` : undefined;
  } catch { return undefined; }
}

/** An ISO 8601 length (PT1H2M3S, P1DT2H) in seconds. */
export function isoDuration(s?: string): number | undefined {
  const m = s?.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return undefined;
  const [d, h, min, sec] = m.slice(1).map(x => Number(x ?? 0));
  return ((d * 24 + h) * 60 + min) * 60 + sec || undefined;
}

type YouTubeVideo = {
  id: string;
  snippet: { title: string; description?: string; publishedAt: string; channelTitle?: string; liveBroadcastContent?: string };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string };
  liveStreamingDetails?: { actualStartTime?: string };
};

/** YouTube's Data API `videos` answer, as the same items the channel's RSS feed gives, plus each video's length. Streams
 * and premieres that are live or still to come have nothing to read yet, so they wait for a later run; a stream is dated
 * by when it went out, not when it was scheduled, so that later run's window still holds it. */
export function parseYouTubeVideos(src: Source, json: string): Item[] {
  const data = JSON.parse(json) as { items?: YouTubeVideo[] };
  return (data.items ?? []).filter(v => (v.snippet.liveBroadcastContent ?? 'none') === 'none').map(v => {
    const published = v.liveStreamingDetails?.actualStartTime ?? v.snippet.publishedAt;
    const it = base(src, v.snippet.title, `https://www.youtube.com/watch?v=${v.id}`, published, v.snippet.description ?? '');
    it.videoId = v.id;
    if (v.snippet.channelTitle) it.author = v.snippet.channelTitle;
    const d = isoDuration(v.contentDetails?.duration);
    if (d) it.durationSec = d;
    if (v.statistics?.viewCount) it.views = Number(v.statistics.viewCount);
    return it;
  });
}

export function parseHn(src: Source, json: string): Item[] {
  const data = JSON.parse(json) as { hits: { objectID: string; title: string; url?: string; created_at: string; points: number; num_comments: number; author: string; story_text?: string }[] };
  return data.hits.map(h => {
    const discussion = `https://news.ycombinator.com/item?id=${h.objectID}`;
    const it = base(src, h.title, h.url || discussion, h.created_at, h.story_text ?? '');
    it.points = h.points; it.comments = h.num_comments; it.discussion = discussion; it.author = h.author;
    return it;
  });
}

export function parseGovUk(src: Source, json: string): Item[] {
  const data = JSON.parse(json) as { results: { title: string; link: string; public_timestamp?: string; description?: string; format?: string; organisations?: { title?: string }[] }[] };
  return data.results.map(r => {
    const it = base(src, r.title, `https://www.gov.uk${r.link}`, r.public_timestamp ?? '', r.description ?? '');
    const orgs = (r.organisations ?? []).map(o => o.title).filter(Boolean);
    if (orgs.length) it.author = orgs.join(', ');
    return it;
  });
}

/** Words that put an item in front of the triage step. Wide on purpose: triage, not this, decides relevance. */
export const AI_TERMS = /\b(A\.?I\.?|AIs|artificial intelligence|AGI|ASI|super ?intelligen\w*|LLMs?|large language models?|language models?|chatbots?|ChatGPT|GPT-?\d[\w.]*|Claude|Gemini|Grok|Llama|OpenAI|Anthropic|DeepMind|xAI|Hugging ?Face|Mistral|machine learning|neural net\w*|frontier models?|AI agents?|agentic|data ?cent(er|re)s?|Altman|Amodei|Hassabis|Nvidia)\b/i;
export const CONCERN_TERMS = /\b(safety|safe|unsafe|alignment|aligned|misalign\w*|control\w*|risks?|risky|existential|extinction|doom\w*|catastroph\w*|rogue|decept\w*|deceiv\w*|scheming|sabotage|sandbox\w*|red.?team\w*|evals?|evaluations?|audit\w*|oversight|regulat\w*|laws?|legislat\w*|bills?|act|governance|govern\w*|polic(y|ies)|accord|executive order|senate|senators?|congress\w*|hearings?|testif\w*|ban\w*|pause|moratorium|treaty|united nations|UN|jobs?|workers?|employment|unemploy\w*|labou?r|layoffs?|economy|economic|UBI|universal basic income|income|inequality|rights?|ethic\w*|moral\w*|conscious\w*|sentien\w*|welfare|power|democra\w*|surveillance|military|weapons?|bio\w*|cyber\w*|hack\w*|breach\w*|incidents?|whistleblow\w*|resign\w*|warn\w*|recursive|self.?improv\w*|automat\w*|trust|harm\w*|children|kids|teens?|lawsuits?|sued|court|copyright|privacy|deepfakes?|elections?|china|chips?|export controls?)\b/i;

export function relevant(src: Source, it: Item): boolean {
  const text = `${it.title} ${it.excerpt}`;
  if (src.filter === 'on-topic') return true;
  if (src.filter === 'ai') return CONCERN_TERMS.test(text);
  return AI_TERMS.test(text) && CONCERN_TERMS.test(text);
}
