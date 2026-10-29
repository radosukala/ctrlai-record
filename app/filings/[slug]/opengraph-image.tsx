import { ImageResponse } from 'next/og';
import { FILINGS, VERIFICATION, getFiling, passageOf } from '@/content/filings';
import { FilingImage, OG_SIZE, ogFonts } from '@/lib/og';
import { shortDate } from '@/lib/site';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'What an AI company told investors, word for word, checked against its filing';

export function generateStaticParams() {
  return FILINGS.map(f => ({ slug: f.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = getFiling(slug) ?? FILINGS[0];
  const page = VERIFICATION.filings[f.slug]?.passages.card?.page;
  return new ImageResponse(
    <FilingImage
      label={`${f.form} · filed ${shortDate(f.filed)}, ${f.filed.slice(0, 4)}`}
      title={`What ${f.company} told investors`}
      quote={passageOf(f, 'card').text}
      source={`${f.company}, PBC, ${f.form}${page ? `, page ${page}` : ''}`}
      disclosure="Ctrl AI is written with Claude, made by Anthropic; same rules for every company."
    />,
    { ...size, fonts: await ogFonts() },
  );
}
