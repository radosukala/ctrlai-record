import data from '@/content/stats.json';
import type { Pick } from '@/content/types';

/** Public numbers for one pick, as fetched by scripts/measure.ts. Absent means we couldn't get it, never zero. */
export type Stats = {
  source: 'youtube' | 'x' | 'substack' | 'hn';
  views?: number;
  likes?: number;
  comments?: number;
  reposts?: number;
  replies?: number;
  bookmarks?: number;
  hnPoints?: number;
  hnComments?: number;
};

export type StatsFile = { measuredOn: string; items: Record<string, Stats> };

const FILE = data as StatsFile;

export const MEASURED_ON = FILE.measuredOn;
export const HN_THRESHOLD = 50;

export function statsFor(url: string): Stats | undefined {
  return FILE.items[url];
}

export type Signal = { key: 'reach' | 'pace' | 'liked' | 'kept' | 'argued' | 'likes' | 'comments' | 'hn'; label: string; value: string; hint: string };

export function compact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (n >= 1e4) return `${Math.round(n / 1e3)}k`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(n));
}

function percent(part: number, whole: number): string {
  const value = (100 * part) / whole;
  return `${value < 1 ? value.toFixed(2) : value.toFixed(1)}%`;
}

function daysBetween(published: string, on: string): number | null {
  if (published.length < 10) return null;
  return Math.max(1, Math.round((Date.parse(`${on}T12:00:00Z`) - Date.parse(`${published}T12:00:00Z`)) / 864e5));
}

/**
 * The few numbers worth reading, as ratios rather than raw counts where we can.
 * `week` shows views per day since publishing; `hall` shows views per year, which rewards lasting.
 */
export function signals(pick: Pick, mode: 'week' | 'hall', on: string = MEASURED_ON): Signal[] {
  const stats = statsFor(pick.url);
  if (!stats) return [];
  const out: Signal[] = [];
  const { views, likes, bookmarks } = stats;
  const comments = stats.source === 'x' ? stats.replies : stats.comments;
  if (views) {
    out.push({ key: 'reach', label: 'views', value: compact(views), hint: `${views.toLocaleString('en-US')} views` });
    const days = daysBetween(pick.published, on);
    if (days && mode === 'week') out.push({ key: 'pace', label: 'a day', value: compact(views / days), hint: 'Views per day since it was published' });
    if (days && mode === 'hall') out.push({ key: 'pace', label: 'a year', value: compact(views / Math.max(days / 365, 0.25)), hint: 'Views per year online. Rewards lasting over a one-week spike.' });
    if (likes) out.push({ key: 'liked', label: 'liked', value: percent(likes, views), hint: 'Likes as a share of views' });
    if (bookmarks) out.push({ key: 'kept', label: 'kept', value: percent(bookmarks, views), hint: 'Bookmarks as a share of views: people saving it for later' });
    if (likes && comments) out.push({ key: 'argued', label: 'argued', value: percent(comments, likes), hint: `${stats.source === 'x' ? 'Replies' : 'Comments'} per like: how much it is argued over` });
  } else {
    if (likes) out.push({ key: 'likes', label: 'likes', value: compact(likes), hint: `${likes.toLocaleString('en-US')} likes` });
    if (comments) out.push({ key: 'comments', label: 'comments', value: compact(comments), hint: `${comments.toLocaleString('en-US')} comments` });
  }
  // A handful of points says nothing about a piece that was discussed somewhere else, so small numbers stay hidden.
  if (stats.hnPoints && stats.hnPoints >= HN_THRESHOLD) {
    out.push({ key: 'hn', label: 'Hacker News', value: `${compact(stats.hnPoints)} pts`, hint: `${stats.hnPoints} points and ${stats.hnComments ?? 0} comments on Hacker News` });
  }
  return out;
}
