/**
 * Posters: a copy of each moment's video thumbnail, served from this site (public/media/yt/<video id>.jpg), so the play
 * button has a picture and a page view still sends nothing to YouTube. The same practice, and the same sizes, as the
 * thumbnails of the Hall of Fame (scripts/measure.ts). One request per new video, one at a time; a video that has no
 * thumbnail to fetch just keeps the plain play button.
 *
 *   npx tsx scripts/radar/posters.ts       fetch the posters that are missing
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const DIR = join(process.cwd(), 'public', 'media', 'yt');
const HEADERS = { 'User-Agent': 'CtrlAIBot/0.1 (+https://ctrlai.com/about)' };
const PAPER_2 = '#f2f2ef';

const moments = JSON.parse(readFileSync(join(process.cwd(), 'content/base/moments.json'), 'utf8')) as Record<string, { v: string }>;
const ids = [...new Set(Object.values(moments).map(m => m.v))].filter(id => !existsSync(join(DIR, `${id}.jpg`)));
mkdirSync(DIR, { recursive: true });

async function fetchImage(url: string): Promise<Buffer> {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  let saved = 0;
  const missing: string[] = [];
  for (const id of ids) {
    try {
      let input: Buffer;
      try { input = await fetchImage(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`); } catch { input = await fetchImage(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`); }
      // hqdefault is 4:3 with the picture letterboxed; "cover" at 16:9 crops the bars away.
      await sharp(input).rotate().resize(960, 540, { fit: 'cover' }).flatten({ background: PAPER_2 }).jpeg({ quality: 78, mozjpeg: true }).toFile(join(DIR, `${id}.jpg`));
      saved++;
    } catch (err) {
      missing.push(`${id} (${err instanceof Error ? err.message : err})`);
    }
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  console.log(`Posters: ${saved} saved${missing.length ? `, ${missing.length} without a thumbnail: ${missing.join(', ')}` : ''}.`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
