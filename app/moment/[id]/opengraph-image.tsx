import { ImageResponse } from 'next/og';
import { momentIds, momentQuote } from '@/content/base/moments';
import { MomentCard, OG_SIZE, ogFonts } from '@/lib/og';
import { posterDataUri } from '@/lib/posters';
import { momentCard } from '@/lib/social-day';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'A checked quotation with the video it was said in: press play on ctrlai.com';

export function generateStaticParams() {
  return momentIds().map(id => ({ id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = momentQuote(id) ?? momentQuote(momentIds()[0])!;
  const card = momentCard({ e: found.e, q: found.q }, 'x')!;
  return new ImageResponse(<MomentCard {...card} compact poster={await posterDataUri(found.moment.v)} />, { ...size, fonts: await ogFonts() });
}
