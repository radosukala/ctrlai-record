import { ImageResponse } from 'next/og';
import { COMPANIES, getCompany, latestFiling } from '@/content/money';
import { MoneyImage, OG_SIZE, ogFonts } from '@/lib/og';
import { brief, periodName } from '@/lib/money';
import { shortDate } from '@/lib/site';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'An AI company’s revenue, losses and cash, from its own filing, every figure checked';

export function generateStaticParams() {
  return COMPANIES.map(c => ({ company: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ company: string }> }) {
  const company = getCompany((await params).company) ?? COMPANIES[0];
  const f = latestFiling(company);
  const { period, stats } = brief(f);
  return new ImageResponse(
    <MoneyImage
      label={`The money · ${f.form} · filed ${shortDate(f.filed)}, ${f.filed.slice(0, 4)}`}
      title={`${company.name}: the numbers`}
      line={`${periodName(period)}, from what it told investors.`}
      stats={stats.slice(0, 4)}
      disclosure="Ctrl AI is written with Claude, made by Anthropic; same rules for every company."
    />,
    { ...size, fonts: await ogFonts() },
  );
}
