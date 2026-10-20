/**
 * Writes the day's posts for X and LinkedIn to a folder: POSTS.md (the texts, what to attach, where the link goes) and
 * the cards. Nothing is posted; a person reads, attaches and posts. The cards are drawn here, from lib/og.tsx, so the
 * kit doesn't wait for the site to deploy.
 *
 *   npm run social -- day                         the latest run, into kit/day-<run>/
 *   npm run social -- day 2026-10-16              a given run
 *   npm run social -- day 2026-10-16 --out DIR    into DIR (the morning run writes into its run folder)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { LATEST_DAY_RUN, dayEdition } from '@/content/base/editions';
import { MomentCard, POST_LI_SIZE, POST_X_SIZE, QuoteCard, TodayCard, ogFonts } from '@/lib/og';
import { momentFor } from '@/content/base/moments';
import { posterDataUri } from '@/lib/posters';
import { dayKit, momentCard, postsMarkdown, quoteCard, todayDisclosure, todayItems, type DayQuote } from '@/lib/social-day';

async function png(element: React.ReactElement, size: { width: number; height: number }) {
  const response = new ImageResponse(element, { ...size, fonts: await ogFonts() });
  return Buffer.from(await response.arrayBuffer());
}

/** The quotation's card: with the video's thumbnail and a play key when it has a moment, else the words alone. */
async function cardFor(p: DayQuote, size: 'x' | 'linkedin') {
  const card = momentCard(p, size);
  if (!card) return png(<QuoteCard {...quoteCard(p, size)} />, size === 'x' ? POST_X_SIZE : POST_LI_SIZE);
  return png(<MomentCard {...card} poster={await posterDataUri(momentFor(p.q.id)!.v)} />, size === 'x' ? POST_X_SIZE : POST_LI_SIZE);
}

export async function runDay(args: string[]) {
  const run = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--out') ?? LATEST_DAY_RUN;
  const kit = dayKit(run);
  if (!kit) {
    console.error(`No daily run "${run}". The latest is ${LATEST_DAY_RUN}.`);
    process.exit(1);
  }
  const out = args.includes('--out') ? path.resolve(args[args.indexOf('--out') + 1]) : path.join(process.cwd(), 'kit', `day-${run}`);
  await mkdir(out, { recursive: true });
  const written: string[] = [];
  if (kit.quote) {
    await writeFile(path.join(out, 'x-quote.png'), await cardFor(kit.quote, 'x'));
    await writeFile(path.join(out, 'linkedin-quote.png'), await cardFor(kit.quote, 'linkedin'));
    written.push('x-quote.png', 'linkedin-quote.png');
  }
  for (const [i, alt] of kit.alternatives.entries()) {
    await writeFile(path.join(out, `x-quote-${i + 2}.png`), await cardFor(alt, 'x'));
    written.push(`x-quote-${i + 2}.png`);
  }
  const ed = dayEdition(run)!;
  const items = todayItems(ed);
  if (items.length) {
    await writeFile(path.join(out, 'linkedin-today.png'), await png(<TodayCard date={kit.date} items={items} disclosure={todayDisclosure(ed)} />, POST_LI_SIZE));
    written.push('linkedin-today.png');
  }
  await writeFile(path.join(out, 'POSTS.md'), postsMarkdown(kit));
  console.log(`Posts for ${kit.date} are in ${out}`);
  console.log(`  POSTS.md, ${written.join(', ') || 'no cards'}`);
  if (kit.x) console.log(`  X ${kit.x.length}/280${kit.x.length > 280 ? ' OVER' : ''} · quotation: ${kit.quote!.q.id}`);
  else console.log('  X: no quotation met the rules today');
  if (kit.x && kit.x.length > 280) process.exitCode = 1;
}
