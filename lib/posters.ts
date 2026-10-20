import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * A moment's poster: the video's thumbnail, copied to this site by scripts/radar/posters.ts, so a page view sends
 * nothing to YouTube. Server only (it asks the disk); a video with no copy gets the plain play button.
 */
export function posterFor(videoId: string): string | undefined {
  return existsSync(join(process.cwd(), 'public', 'media', 'yt', `${videoId}.jpg`)) ? `/media/yt/${videoId}.jpg` : undefined;
}

/** The same poster as a data URI, for share images, which can't fetch from this site while they are drawn. */
export async function posterDataUri(videoId: string): Promise<string | undefined> {
  try {
    const bytes = await readFile(join(process.cwd(), 'public', 'media', 'yt', `${videoId}.jpg`));
    return `data:image/jpeg;base64,${bytes.toString('base64')}`;
  } catch {
    return undefined;
  }
}
