import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A moment's poster: the video's thumbnail, copied to this site by scripts/radar/posters.ts, so a page view sends
 * nothing to YouTube. Server only (it asks the disk); a video with no copy gets the plain play button.
 */
export function posterFor(videoId: string): string | undefined {
  return existsSync(join(process.cwd(), 'public', 'media', 'yt', `${videoId}.jpg`)) ? `/media/yt/${videoId}.jpg` : undefined;
}
