import { ImageResponse } from 'next/og';
import { LATEST_DAY_RUN, dayEdition } from '@/content/base/editions';
import { EditionImage, OG_SIZE, ogFonts } from '@/lib/og';
import { longDate } from '@/lib/site';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Ctrl AI: what changed in AI safety and control today, each quotation checked against its source';

/** The front page is today's edition, so its share image is today's headline. */
export default async function Image() {
  const ed = dayEdition(LATEST_DAY_RUN)!;
  return new ImageResponse(<EditionImage right={`Today · ${longDate(LATEST_DAY_RUN)}`} label="What changed in AI safety and control" line={ed.line} footer="Today, this week and this month, every quotation checked." />, { ...size, fonts: await ogFonts() });
}
