import data from '@/content/media.json';

/**
 * What we can show of a pick on our own page, collected by scripts/measure.ts. Every image here is a copy served
 * from /media on this site, so a page view sends nothing to YouTube or X. Players load only when someone presses play.
 */
export type Media =
  | { type: 'youtube'; videoId: string; image: string; embeddable: boolean }
  | {
      type: 'x';
      name: string;
      handle: string;
      avatar?: string;
      /** The post's text, or for an X article its opening lines. */
      text: string;
      /** Set when the post is an X article. */
      article?: string;
      image?: string;
      /** A video file on X's servers, loaded only when someone presses play. */
      video?: string;
      createdAt: string;
    }
  | { type: 'link'; image: string };

const FILE = data as Record<string, Media>;

export function mediaFor(url: string): Media | undefined {
  return FILE[url];
}

export function youtubeEmbed(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`;
}
