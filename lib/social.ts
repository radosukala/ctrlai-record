import type { Issue } from '@/content/issues';
import { KIND_LABEL } from '@/content/types';
import { dateRange, shortDate } from '@/lib/site';

/**
 * The weekly posts for X and LinkedIn, composed from the issue so they never say anything the issue doesn't.
 * Nothing here posts anywhere: scripts/social.ts writes the text and images to a folder, and a person posts them.
 */

export type Post = { text: string; /** An image in the kit folder to attach. */ attach?: string };

export const X_LIMIT = 280;
export const LINKEDIN_LIMIT = 3000;

const URL_PATTERN = /https?:\/\/\S+/g;

/**
 * How X counts a post: every link is 23 characters, and most characters are one, but anything outside the common
 * Latin and punctuation ranges (emoji, arrows, bullets, ellipses) is two. 280 is the limit without a paid plan.
 */
export function xLength(text: string): number {
  let total = 0;
  const bare = text.replace(URL_PATTERN, () => { total += 23; return ''; });
  for (const char of bare) {
    const code = char.codePointAt(0)!;
    const single = code <= 0x10ff || (code >= 0x2000 && code <= 0x200d) || (code >= 0x2010 && code <= 0x201f) || (code >= 0x2032 && code <= 0x2037);
    total += single ? 1 : 2;
  }
  return total;
}

const ABBREVIATION = /\b(?:Sen|Rep|Dr|Mr|Mrs|Ms|St|vs|No|Inc|Co|Corp|Jr|Sr|U\.S|U\.K|A\.I)\.$/;

/** The first sentence of a line of our own copy, not breaking at "Sen." or "A.I.". */
export function firstSentence(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const boundary = /([.!?]["”’)]?)\s+(?=[A-Z“‘"(])/g;
  for (let match = boundary.exec(clean); match; match = boundary.exec(clean)) {
    const head = clean.slice(0, match.index + match[1].length);
    if (!ABBREVIATION.test(head)) return head;
  }
  return clean;
}

type Where = 'x' | 'linkedin';

/** A link back to the site that says where the visit came from. */
function link(origin: string, issue: Issue, source: Where, path = `/week/${issue.slug}`, hash = ''): string {
  const url = new URL(path, origin);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set('utm_campaign', `issue-${issue.number}`);
  if (hash) url.hash = hash;
  return url.toString();
}

const rangeShort = (issue: Issue) => `${shortDate(issue.from)} – ${shortDate(issue.to)}`;

/** A creator's name without the handle that some bylines carry, since the handle is tagged separately. */
const plainName = (creator: string) => creator.replace(/\s*\(@\w+\)$/, '');

/**
 * A post as `head`, a blank line, a blurb, a blank line, `tail`. If the blurb is too long it is cut at a clause or
 * word, never mid-word; if there is no room for a useful cut it is left out, so the head and the link always survive.
 */
export function withBlurb(head: string, blurb: string, tail: string): string {
  const full = `${head}\n\n${blurb}\n\n${tail}`;
  if (xLength(full) <= X_LIMIT) return full;
  const bare = `${head}\n\n${tail}`;
  const room = X_LIMIT - xLength(`${head}\n\n\n\n${tail}`) - 2;
  for (let size = room; size >= 40; size -= 4) {
    const slice = blurb.slice(0, size);
    // Prefer to stop where a clause ends, so the cut reads as a thought and not as a cliff.
    const clause = Math.max(...[', ', ' and ', ' but ', ' after ', ' while ', ' with ', ' that ', ' which '].map(word => slice.lastIndexOf(word)));
    const cut = (clause > size * 0.6 ? slice.slice(0, clause) : slice.slice(0, slice.lastIndexOf(' '))).replace(/[\s,;:—–-]+$/, '');
    const candidate = `${head}\n\n${cut}…\n\n${tail}`;
    if (cut.length >= 30 && xLength(candidate) <= X_LIMIT) return candidate;
  }
  return bare;
}

export type Options = { origin: string; /** Whether /subscribe is live, so posts only advertise what works. */ newsletter: boolean };

/** "What happened": a hook with the recap image, a reply for each main event with its source, and a closing reply. */
export function xRecap(issue: Issue, { origin, newsletter }: Options): Post[] {
  const total = issue.main.length + 2;
  const posts: Post[] = [{
    attach: 'recap.png',
    text: `This week in AI control · issue ${issue.number}\n\n${issue.summary}\n\nWhat happened, and 7 things worth your time:\n${link(origin, issue, 'x')}`,
  }];
  issue.main.forEach((event, index) => {
    const number = `${index + 2}/${total}`;
    const head = `${number} ${shortDate(event.date)} · ${event.headline}`;
    const source = event.sources[0].url;
    posts.push({ text: withBlurb(head, firstSentence(event.text), source) });
  });
  const subscribe = newsletter ? `\n\nGet each week's issue in your inbox:\n${link(origin, issue, 'x', '/subscribe')}` : '';
  posts.push({ text: `${total}/${total} Seven pieces worth your time this week, with the videos playing on the page:\n${link(origin, issue, 'x', undefined, 'worth-your-time')}${subscribe}` });
  return posts;
}

/** "Worth your time": one reply per pick, tagging the people who made it, each with its card. */
export function xPicks(issue: Issue, { origin, newsletter }: Options): Post[] {
  const total = issue.picks.length + 2;
  const posts: Post[] = [{
    attach: 'issue.png',
    text: `Seven worth your time this week in AI control (issue ${issue.number}).\n\nA thread, with the people who made them tagged. It's all on one page, and the videos play there:\n${link(origin, issue, 'x', undefined, 'worth-your-time')}`,
  }];
  issue.picks.forEach((pick, index) => {
    const tags = (pick.x ?? []).map(handle => `@${handle}`).join(' ');
    const who = tags ? `${plainName(pick.creator)} ${tags}` : plainName(pick.creator);
    const head = `${index + 2}/${total} ${pick.title}\n${who}`;
    const url = link(origin, issue, 'x', undefined, pick.id);
    posts.push({ attach: `card-${pick.id}.png`, text: withBlurb(head, firstSentence(pick.why), url) });
  });
  const subscribe = newsletter ? `\n\nGet each week's issue in your inbox:\n${link(origin, issue, 'x', '/subscribe')}` : '';
  posts.push({ text: `${total}/${total} New to all this? Six videos for one evening, from the Hall of Fame:\n${link(origin, issue, 'x', '/hall-of-fame', 'start-here')}${subscribe}` });
  return posts;
}

export type LinkedIn = { text: string; /** Posted as the first comment, because outside links in the post itself tend to reduce reach. */ firstComment: string; attach: string };

export function linkedin(issue: Issue, { origin, newsletter }: Options): LinkedIn {
  const events = issue.main.map(event => `• ${shortDate(event.date)}: ${event.headline}`).join('\n');
  const kind = (pick: Issue['picks'][number]) => `${KIND_LABEL[pick.kind].replace(/^./, letter => letter.toLowerCase())}${pick.minutes ? `, ${pick.minutes} min` : ''}`;
  const picks = issue.picks.slice(0, 3).map(pick => `→ ${pick.title}\n${plainName(pick.creator)} · ${kind(pick)}\n${firstSentence(pick.why)}`).join('\n\n');
  const text = [
    `This week in AI control · Issue ${issue.number} (${dateRange(issue.from, issue.to)})`,
    issue.summary,
    `What happened:\n${events}`,
    `Three of the seven pieces worth your time:\n\n${picks}`,
    'Every event is confirmed by two independent reports, and all seven picks are on one page, where the videos play.',
    `${newsletter ? 'The full issue and the weekly email signup are' : 'The full issue is'} in the first comment.`,
    '#AISafety #AIGovernance #AI',
  ].join('\n\n');
  const firstComment = [`The full issue, with sources and the videos playing on the page:\n${link(origin, issue, 'linkedin')}`, ...(newsletter ? [`The same, by email every week:\n${link(origin, issue, 'linkedin', '/subscribe')}`] : [])].join('\n\n');
  return { text, firstComment, attach: 'recap.png' };
}
