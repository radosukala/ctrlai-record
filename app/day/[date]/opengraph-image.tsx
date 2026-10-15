import { ImageResponse } from 'next/og';
import { DAYS, LATEST_DAY_RUN, dayEdition } from '@/content/base/editions';
import { EditionImage, OG_SIZE, ogFonts } from '@/lib/og';
import { longDate } from '@/lib/site';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Ctrl AI: what changed in AI safety and control that day, each quotation checked against its source';

export function generateStaticParams() {
  return DAYS.map(date => ({ date }));
}

export default async function Image({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const ed = dayEdition(date) ?? dayEdition(LATEST_DAY_RUN)!;
  return new ImageResponse(<EditionImage right={longDate(ed.run!.run)} label="What changed in AI safety and control" line={ed.line} footer="The day’s edition, every quotation checked." />, { ...size, fonts: await ogFonts() });
}
