import { ImageResponse } from 'next/og';
import { VERIFICATION, passageOf } from '@/content/filings';
import { COMPANIES, getCompany } from '@/content/money';
import { FilingImage, OG_SIZE, ogFonts } from '@/lib/og';
import { shortDate } from '@/lib/site';

type Params = { company: string; filing: string };

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'What an AI company told investors, word for word, checked against its filing';

export function generateStaticParams(): Params[] {
  return COMPANIES.flatMap(c => c.filings.map(f => ({ company: c.slug, filing: f.path })));
}

export default async function Image({ params }: { params: Promise<Params> }) {
  const p = await params;
  const company = getCompany(p.company) ?? COMPANIES[0];
  const f = company.filings.find(x => x.path === p.filing) ?? company.filings[0];
  const page = VERIFICATION.filings[f.slug]?.passages.card?.page;
  return new ImageResponse(
    <FilingImage
      label={`The money · ${f.form} · filed ${shortDate(f.filed)}, ${f.filed.slice(0, 4)}`}
      title={`What ${f.company} told investors`}
      quote={passageOf(f, 'card').text}
      source={`${f.company}, PBC, ${f.form}${page ? `, page ${page}` : ''}`}
      disclosure="Ctrl AI is written with Claude, made by Anthropic; same rules for every company."
    />,
    { ...size, fonts: await ogFonts() },
  );
}
