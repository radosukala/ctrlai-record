import { ImageResponse } from 'next/og';
import { COMPANIES, latestFiling } from '@/content/money';
import { MoneyImage, OG_SIZE, ogFonts } from '@/lib/og';
import { brief, periodName } from '@/lib/money';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'The money behind AI: what AI companies earn, spend and promise, from their own filings';

/** The section's share image leads with the newest filing read. */
export default async function Image() {
  const company = [...COMPANIES].sort((a, b) => latestFiling(b).filed.localeCompare(latestFiling(a).filed))[0];
  const f = latestFiling(company);
  const { period, stats } = brief(f);
  return new ImageResponse(
    <MoneyImage
      label="The money"
      title="The money behind AI"
      line={`What AI companies earn, spend and promise, from their own filings. Newest: ${company.name}, ${periodName(period)}.`}
      stats={stats.slice(0, 4)}
      disclosure="Ctrl AI is written with Claude, made by Anthropic; same rules for every company."
    />,
    { ...size, fonts: await ogFonts() },
  );
}
