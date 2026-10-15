import { ImageResponse } from 'next/og';
import { MONTHS, monthEdition } from '@/content/base/editions';
import { EditionImage, OG_SIZE, ogFonts } from '@/lib/og';
import { longDate } from '@/lib/site';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Ctrl AI: what changed in AI safety and control that month, each quotation checked against its source';

export function generateStaticParams() {
  return MONTHS.map(month => ({ month }));
}

export default async function Image({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  const m = MONTHS.includes(month) ? month : MONTHS[MONTHS.length - 1];
  const ed = monthEdition(m);
  return new ImageResponse(<EditionImage right={`${longDate(m)}, through ${longDate(ed.to).replace(/, \d{4}$/, '')}`} label="What changed in AI safety and control" line={ed.line} footer="The month’s edition, every quotation checked." />, { ...size, fonts: await ogFonts() });
}
