/**
 * The Radar's first stage: read every source in radar/sources.json, keep what was published in the window, drop repeats,
 * and keep the items a wide keyword filter lets through. Writes, into the private run folder:
 *   items.jsonl     every item in the window (kept or not), one JSON object per line, with `kept`
 *   health.json     per source: answered or not, items seen, items in the window, items kept
 *
 *   npx tsx scripts/radar/ingest.ts --from 2026-10-05 --to 2026-10-12 [--run 2026-10-12]
 *
 * YouTube channels are read through YouTube's Data API when YOUTUBE_API_KEY is set (in the environment or .env.local),
 * and through their RSS feeds when it is not, or when the API fails: on Oct 13 2026 every channel feed answered 404 for
 * a morning, and a feed lists only a channel's latest 15 videos, less than a day for CNBC or Bloomberg. The API reads
 * back to the window start, at 2 of the key's 10,000 free daily units for every 50 videos.
 *
 * Run folders hold other people's text and live in docs-internal/radar/ (git-excluded), or wherever RADAR_DOCS points.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseFeed, parseGovUk, parseHn, parseYouTubeVideos, relevant, UA, uploadsPlaylist, type Item, type Source } from './feeds';
import { readParliament } from './parliament';
import { radarDir } from './paths';

const arg = (name: string, dflt?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const FROM = arg('from')!;
const TO = arg('to')!;
if (!FROM || !TO) { console.error('usage: ingest.ts --from YYYY-MM-DD --to YYYY-MM-DD [--run NAME]'); process.exit(2); }
const RUN = arg('run', TO)!;
const from = Date.parse(`${FROM}T00:00:00Z`);
const to = Date.parse(`${TO}T23:59:59Z`);

const { sources } = JSON.parse(readFileSync('radar/sources.json', 'utf8')) as { sources: Source[] };

async function get(url: string, init: RequestInit = {}): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    // A dropped connection is worth another try, like a busy server.
    const res = await fetch(url, { ...init, headers: { 'user-agent': UA, accept: '*/*', ...(init.headers ?? {}) }, signal: AbortSignal.timeout(30_000) })
      .catch(e => { if (attempt === 2) throw e; return undefined; });
    if (!res) { await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); continue; }
    if (res.ok) return res.text();
    if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); continue; }
    throw new Error(`HTTP ${res.status}`);
  }
  throw new Error('gave up after 3 tries');
}

/** A key from the environment or .env.local. Never printed, and sent in a header, not the URL. */
function envKey(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  for (const f of ['.env.local', '../ctrlai-com/.env.local']) {
    const m = existsSync(f) ? readFileSync(f, 'utf8').match(new RegExp(`^${name}=["']?([^"'\\n]+)`, 'm')) : null;
    if (m) return m[1].trim();
  }
}
const YOUTUBE_KEY = envKey('YOUTUBE_API_KEY');

async function youtubeApi(path: string): Promise<string> {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}`, { headers: { 'x-goog-api-key': YOUTUBE_KEY!, 'user-agent': UA }, signal: AbortSignal.timeout(30_000) });
  const text = await res.text();
  if (res.ok) return text;
  let why = '';
  try { const e = JSON.parse(text).error; why = e?.errors?.[0]?.reason ?? e?.message ?? ''; } catch { /* not JSON */ }
  throw new Error(`YouTube API ${res.status}${why ? ` ${why}` : ''}`);
}

/** A channel's uploads back to the window start (at most 250), with their length and views. */
async function readYouTube(src: Source): Promise<Item[]> {
  const playlist = uploadsPlaylist(src.url);
  if (!playlist) throw new Error('no channel id in the feed URL');
  const items: Item[] = [];
  let page = '';
  for (let n = 0; n < 5; n++) {
    const list = JSON.parse(await youtubeApi(`playlistItems?part=contentDetails&maxResults=50&playlistId=${playlist}${page ? `&pageToken=${page}` : ''}`)) as
      { nextPageToken?: string; items?: { contentDetails: { videoId: string; videoPublishedAt?: string } }[] };
    const got = list.items ?? [];
    if (got.length) items.push(...parseYouTubeVideos(src, await youtubeApi(`videos?part=snippet,contentDetails,statistics,liveStreamingDetails&id=${got.map(i => i.contentDetails.videoId).join(',')}`)));
    const oldest = got.map(i => i.contentDetails.videoPublishedAt ?? '').filter(Boolean).sort()[0];
    if (!list.nextPageToken || !oldest || Date.parse(oldest) < from) break;
    page = list.nextPageToken;
  }
  return items;
}

/** Why a channel was read from its RSS feed instead of the API, by source id. */
const apiFailed = new Map<string, string>();

function arxivUrl(): string {
  const cats = '(cat:cs.AI OR cat:cs.CY OR cat:cs.LG OR cat:cs.CL OR cat:cs.CR)';
  const words = ['"AI safety"', 'alignment', '"AI control"', 'misalignment', 'scheming', 'deceptive', 'jailbreak', '"red teaming"', 'oversight', 'interpretability', '"reward hacking"', 'sandbagging', '"dangerous capabilities"', '"AI governance"', '"loss of control"', '"situational awareness"', 'sycophancy'];
  const q = `${cats} AND (${words.map(w => `abs:${w}`).join(' OR ')})`;
  return `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(q)}&sortBy=submittedDate&sortOrder=descending&max_results=300`;
}

async function read(src: Source): Promise<Item[]> {
  if (src.kind === 'hn') {
    const url = `${src.url}&numericFilters=${encodeURIComponent(`points>=50,created_at_i>=${from / 1000},created_at_i<=${to / 1000}`)}`;
    const items: Item[] = [];
    for (let page = 0; page < 5; page++) {
      const json = await get(`${url}&page=${page}`);
      const got = parseHn(src, json);
      items.push(...got);
      if (got.length < 200) break;
    }
    return items;
  }
  if (src.kind === 'gov-api') return parseGovUk(src, await get(src.url));
  if (src.kind === 'parliament') return readParliament(src, { from: new Date(from).toISOString().slice(0, 10), to: new Date(to).toISOString().slice(0, 10) });
  if (src.kind === 'arxiv') return parseFeed(src, await get(arxivUrl()));
  if (src.kind === 'youtube' && YOUTUBE_KEY) {
    try { return await readYouTube(src); } catch (e) { apiFailed.set(src.id, String((e as Error).message ?? e)); }
    try { return parseFeed(src, await get(src.url)); } catch (e) { throw new Error(`${apiFailed.get(src.id)}; RSS ${(e as Error).message}`); }
  }
  return parseFeed(src, await get(src.url));
}

const dir = radarDir(RUN);
mkdirSync(dir, { recursive: true });
const health: Record<string, { ok: boolean; error?: string; seen: number; inWindow: number; kept: number; oldest?: string; via?: 'api' | 'rss'; apiError?: string }> = {};
const all = new Map<string, Item & { kept: boolean }>();

const queue = [...sources];
async function worker() {
  for (let src = queue.shift(); src; src = queue.shift()) {
    try {
      const items = await read(src);
      const inWindow = items.filter(i => { const t = Date.parse(i.published); return t >= from && t <= to; });
      let kept = 0;
      for (const it of inWindow) {
        const k = relevant(src, it);
        const prev = all.get(it.id);
        // One story, several sources: keep the copy from the most trusted tier.
        if (!prev || it.tier < prev.tier) all.set(it.id, { ...it, kept: k || !!prev?.kept });
        else if (k) prev.kept = true;
        if (k) kept++;
      }
      const dates = items.map(i => i.published).filter(Boolean).sort();
      const via = src.kind === 'youtube' && YOUTUBE_KEY ? (apiFailed.has(src.id) ? 'rss' : 'api') : undefined;
      health[src.id] = { ok: true, seen: items.length, inWindow: inWindow.length, kept, oldest: dates[0], ...(via ? { via } : {}), ...(apiFailed.has(src.id) ? { apiError: apiFailed.get(src.id) } : {}) };
      // A feed whose oldest item is newer than the window start may have dropped items: say so. (A parliament is asked for the
      // window itself, so a quiet few days there is not a short feed.)
      const warn = (src.kind !== 'parliament' && items.length && dates[0] && Date.parse(dates[0]) > from ? '  (feed may not reach back to the window start)' : '')
        + (apiFailed.has(src.id) ? `  (read from RSS: ${apiFailed.get(src.id)})` : '');
      console.log(`${src.id.padEnd(42)} ${String(items.length).padStart(4)} seen ${String(inWindow.length).padStart(4)} in window ${String(kept).padStart(4)} kept${warn}`);
    } catch (e) {
      health[src.id] = { ok: false, error: String((e as Error).message ?? e), seen: 0, inWindow: 0, kept: 0 };
      console.log(`${src.id.padEnd(42)} FAILED ${(e as Error).message}`);
    }
  }
}
async function main() {
await Promise.all(Array.from({ length: 6 }, worker));

// A second run into the same folder (the same day) adds to what the first one found; it never drops an item an entry
// may already point to.
if (existsSync(`${dir}/items.jsonl`)) {
  for (const line of readFileSync(`${dir}/items.jsonl`, 'utf8').split('\n').filter(Boolean)) {
    const old = JSON.parse(line) as Item & { kept: boolean };
    const now = all.get(old.id);
    if (!now) all.set(old.id, old); else if (old.kept) now.kept = true;
  }
}
const items = [...all.values()].sort((a, b) => b.published.localeCompare(a.published));
writeFileSync(`${dir}/items.jsonl`, items.map(i => JSON.stringify(i)).join('\n') + '\n');
writeFileSync(`${dir}/health.json`, JSON.stringify({ ranAt: new Date().toISOString(), from: FROM, to: TO, sources: health }, null, 1) + '\n');
const failed = Object.values(health).filter(h => !h.ok).length;
const yt = sources.filter(s => s.kind === 'youtube').length;
console.log(`\n${sources.length} sources, ${failed} failed. ${items.length} items in the window, ${items.filter(i => i.kept).length} kept for triage. → ${dir}`);
console.log(YOUTUBE_KEY ? `YouTube: ${yt - apiFailed.size} of ${yt} channels through the API${apiFailed.size ? `, ${apiFailed.size} tried RSS instead` : ''}.` : `YouTube: ${yt} channels through RSS (no YOUTUBE_API_KEY).`);
}
main();
