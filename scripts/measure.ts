/**
 * Fetches public numbers for every pick and writes content/stats.json. No paid APIs:
 * - YouTube: the watch page's own player data (views, likes, comments);
 * - X: the public fxtwitter mirror (views, likes, reposts, replies, bookmarks);
 * - Substack: the publication's public post endpoint (likes, comments);
 * - anything else: Hacker News, through the Algolia search API (points, comments).
 *
 * Run it on the day an issue goes out: `npm run measure`. A source that fails keeps its last numbers.
 * The numbers are snapshots, and the pages always say on which day they were taken.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ISSUES } from '../content/issues';
import { ENTRIES } from '../content/hall';
import type { Stats, StatsFile } from '../lib/stats';

const FILE = path.join(process.cwd(), 'content', 'stats.json');
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
  console.log(`\n${urls.length - failed} measured, ${failed} without fresh numbers. Wrote content/stats.json (${measuredOn}).`);
}

if (process.argv[1]?.endsWith('measure.ts')) main();
