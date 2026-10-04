/**
 * Fetches public numbers for every pick and writes content/stats.json. No paid APIs:
 * - YouTube: the watch page's own player data (views, likes, comments);
 * - X: the public fxtwitter mirror (views, likes, reposts, replies, bookmarks);
 * - Substack: the publication's public post endpoint (likes, comments);
 * - anything else: Hacker News, through the Algolia search API (points, comments).
 *
 * Run it on the day an issue goes out: `npm run measure`. A source that fails keeps its last numbers.
 * The numbers are snapshots, and the pages always say on which day they were taken.
 *
 * It also collects what we can show of each pick on our own pages (content/media.json): a YouTube frame, an X post's
 * author and opening lines, or an article's share image. Images are resized and saved to public/media, so visitors
 * load them from us, not from YouTube or X. Media is fetched once per link; `npm run measure -- --refresh-media` redoes it.
 */
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ISSUES } from '../content/issues';
import { ENTRIES } from '../content/hall';
import type { Stats, StatsFile } from '../lib/stats';
import type { Media } from '../lib/media';

const FILE = path.join(process.cwd(), 'content', 'stats.json');
const MEDIA_FILE = path.join(process.cwd(), 'content', 'media.json');
const MEDIA_DIR = path.join(process.cwd(), 'public', 'media');
const PAPER_2 = '#eeede5';

/** Whether each YouTube video may play inside another site, read from the same watch page as its numbers. */
const embeddable = new Map<string, boolean>();
/** fxtwitter answers, so a post is fetched once for its numbers and its media. */
const tweets = new Map<string, any>();
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Cookie: 'SOCS=CAI; CONSENT=YES+1',
};

/** "2.1K" → 2100, "3K" → 3000, "1,234" → 1234. YouTube rounds comment counts it shows. */
export function parseCount(text: string): number | undefined {
  const match = text.replace(/,/g, '').match(/([\d.]+)\s*([KMB])?/i);
  if (!match) return undefined;
  const scale = { k: 1e3, m: 1e6, b: 1e9 }[(match[2] ?? '').toLowerCase() as 'k' | 'm' | 'b'] ?? 1;
  return Math.round(parseFloat(match[1]) * scale);
}

async function youtube(id: string): Promise<Stats> {
  const html = await (await fetch(`https://www.youtube.com/watch?v=${id}&hl=en&gl=US`, { headers: HEADERS })).text();
  const player = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});(?:var|<\/script>)/s);
  if (!player) throw new Error('no player data (consent page or rate limit?)');
  const details = JSON.parse(player[1]).videoDetails ?? {};
  const likes = html.match(/"likeCount":"?(\d+)/) ?? html.match(/"accessibilityText":"([\d,.]+[KMB]?) likes?/);
  const comments = html.match(/"commentCount":\{"simpleText":"([^"]+)"/) ?? html.match(/"contextualInfo":\{"runs":\[\{"text":"([^"]+)"/);
  embeddable.set(id, JSON.parse(player[1]).playabilityStatus?.playableInEmbed !== false);
  const stats: Stats = { source: 'youtube', views: Number(details.viewCount) };
  if (likes) stats.likes = parseCount(likes[1]);
  if (comments) stats.comments = parseCount(comments[1]);
  if (!Number.isFinite(stats.views)) throw new Error('no view count');
  return stats;
}

async function x(user: string, id: string): Promise<Stats> {
  const body = await (await fetch(`https://api.fxtwitter.com/${user}/status/${id}`, { headers: { 'User-Agent': HEADERS['User-Agent'] } })).json();
  const tweet = body.tweet;
  if (!tweet) throw new Error(`fxtwitter: ${body.message ?? 'no tweet'}`);
  tweets.set(id, tweet);
  return { source: 'x', views: tweet.views, likes: tweet.likes, reposts: tweet.retweets, replies: tweet.replies, bookmarks: tweet.bookmarks };
}

async function substack(url: URL): Promise<Stats> {
  const slug = url.pathname.split('/')[2];
  const response = await fetch(`${url.origin}/api/v1/posts/${slug}`, { headers: { 'User-Agent': HEADERS['User-Agent'] } });
  if (!response.ok) throw new Error(`substack ${response.status}`);
  const post = await response.json();
  return { source: 'substack', likes: post.reaction_count, comments: post.comment_count };
}

async function hackerNews(url: string): Promise<Stats> {
  const bare = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  const response = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(bare)}&restrictSearchableAttributes=url&tags=story`);
  const { hits = [] } = await response.json();
  const same = hits.filter((hit: { url?: string }) => hit.url && hit.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') === bare);
  if (!same.length) throw new Error('not on Hacker News');
  const top = same.reduce((a: { points: number }, b: { points: number }) => (b.points > a.points ? b : a));
  return { source: 'hn', hnPoints: top.points, hnComments: top.num_comments };
}

async function measure(rawUrl: string): Promise<Stats> {
  const url = new URL(rawUrl);
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtube.com' && url.searchParams.get('v')) return youtube(url.searchParams.get('v')!);
  const status = url.pathname.match(/^\/([^/]+)\/status\/(\d+)/);
  if ((host === 'x.com' || host === 'twitter.com') && status) return x(status[1], status[2]);
  if (url.pathname.startsWith('/p/')) {
    try { return await substack(url); } catch { /* not Substack after all; try Hacker News */ }
  }
  return hackerNews(rawUrl);
}

const fileKey = (url: string) => createHash('sha1').update(url).digest('hex').slice(0, 12);

/** Saves a 960×540 JPEG (or a 96×96 avatar) to public/media and returns its public path. */
async function saveImage(source: string, name: string, kind: 'wide' | 'avatar' = 'wide'): Promise<string> {
  const response = await fetch(source, { headers: HEADERS });
  if (!response.ok) throw new Error(`image ${response.status}`);
  const input = Buffer.from(await response.arrayBuffer());
  let image = sharp(input).rotate();
  if (kind === 'avatar') image = image.resize(96, 96, { fit: 'cover' });
  else {
    const { width = 16, height = 9 } = await sharp(input).metadata();
    // Book covers and square logos are letterboxed rather than cropped beyond recognition.
    image = width / height < 1.25
      ? image.resize(960, 540, { fit: 'contain', background: PAPER_2 })
      : image.resize(960, 540, { fit: 'cover' });
  }
  await image.flatten({ background: PAPER_2 }).jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(MEDIA_DIR, `${name}.jpg`));
  return `/media/${name}.jpg`;
}

function excerpt(text: string, max = 320): string {
  const clean = text.replace(/https:\/\/t\.co\/\S+/g, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

function ogImage(html: string, base: string): string | undefined {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const wanted of ['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']) {
    for (const tag of tags) {
      const name = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
      const content = tag.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
      if (name === wanted && content) return new URL(content.replace(/&amp;/g, '&'), base).toString();
    }
  }
  return undefined;
}

async function collectMedia(rawUrl: string): Promise<Media | undefined> {
  const url = new URL(rawUrl);
  const host = url.hostname.replace(/^www\./, '');
  const name = fileKey(rawUrl);
  const videoId = host === 'youtube.com' ? url.searchParams.get('v') : null;
  if (videoId) {
    let image: string;
    try { image = await saveImage(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, name); }
    catch { image = await saveImage(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, name); }
    return { type: 'youtube', videoId, image, embeddable: embeddable.get(videoId) ?? true };
  }
  const status = url.pathname.match(/^\/([^/]+)\/status\/(\d+)/);
  if ((host === 'x.com' || host === 'twitter.com') && status) {
    const tweet = tweets.get(status[2]);
    if (!tweet) return undefined;
    const video = tweet.media?.videos?.[0];
    const photo = tweet.media?.photos?.[0];
    const media: Media = {
      type: 'x',
      name: tweet.author.name,
      handle: tweet.author.screen_name,
      text: excerpt(tweet.article?.preview_text ?? tweet.text ?? ''),
      createdAt: new Date(tweet.created_timestamp * 1000).toISOString().slice(0, 10),
    };
    if (tweet.article?.title) media.article = tweet.article.title;
    if (tweet.author.avatar_url) media.avatar = await saveImage(tweet.author.avatar_url, `${name}-avatar`, 'avatar').catch(() => undefined);
    if (video?.thumbnail_url) media.image = await saveImage(video.thumbnail_url, name);
    else if (photo?.url) media.image = await saveImage(photo.url, name);
    if (video?.url) media.video = video.url;
    return media;
  }
  const response = await fetch(rawUrl, { headers: HEADERS });
  if (!response.ok) throw new Error(`page ${response.status}`);
  const source = ogImage(await response.text(), response.url);
  if (!source) throw new Error('no share image');
  return { type: 'link', image: await saveImage(source, name) };
}

async function exists(file: string): Promise<boolean> {
  return access(file).then(() => true, () => false);
}

async function main() {
  const previous: StatsFile = JSON.parse(await readFile(FILE, 'utf8').catch(() => '{"measuredOn":"","items":{}}'));
  const urls = [...new Set([...ISSUES.flatMap(issue => issue.picks), ...ENTRIES].map(pick => pick.url))];
  const items: StatsFile['items'] = {};
  let failed = 0;
  for (const url of urls) {
    try {
      items[url] = await measure(url);
      console.log('ok  ', url);
    } catch (error) {
      failed++;
      if (previous.items[url]) items[url] = previous.items[url];
      console.log('kept', url, '·', (error as Error).message);
    }
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  const measuredOn = process.env.MEASURED_ON ?? new Date().toISOString().slice(0, 10);
  await writeFile(FILE, `${JSON.stringify({ measuredOn, items }, null, 2)}\n`);
  console.log(`\n${urls.length - failed} measured, ${failed} without fresh numbers. Wrote content/stats.json (${measuredOn}).\n`);

  const refresh = process.argv.includes('--refresh-media');
  const media: Record<string, Media> = JSON.parse(await readFile(MEDIA_FILE, 'utf8').catch(() => '{}'));
  await mkdir(MEDIA_DIR, { recursive: true });
  const kept: Record<string, Media> = {};
  for (const url of urls) {
    const known = media[url];
    const image = known && 'image' in known ? known.image : undefined;
    if (known && !refresh && (!image || await exists(path.join(process.cwd(), 'public', image)))) {
      kept[url] = known;
      continue;
    }
    try {
      const found = await collectMedia(url);
      if (found) kept[url] = found;
      console.log('media', url);
    } catch (error) {
      console.log('no media', url, '·', (error as Error).message);
    }
  }
  await writeFile(MEDIA_FILE, `${JSON.stringify(kept, null, 2)}\n`);
  console.log(`Wrote content/media.json: ${Object.keys(kept).length} of ${urls.length} picks have something to show.`);
}

if (process.argv[1]?.endsWith('measure.ts')) main();
