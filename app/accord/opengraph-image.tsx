import { ImageResponse } from 'next/og';
import { CELLS, CELLS_OWN_WORDS_REFER, CELLS_WITH_NEWS, CHECKED_ON, COMMITMENTS, COMPANIES, DAYS_SINCE, type LayerId } from '@/content/accord';
import { AccordImage, OG_SIZE, ogFonts } from '@/lib/og';
import { shortDate } from '@/lib/site';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'The accord tracker: what six companies have shown since signing a White House accord committing to four safety controls for advanced AI';

export default async function Image() {
  const rows = COMMITMENTS.filter(c => c.id !== 'G').map(c => ({ number: c.number, cells: COMPANIES.map(co => co.cells[c.id as LayerId].status) }));
  return new ImageResponse(
    <AccordImage days={DAYS_SINCE} companies={COMPANIES.map(c => c.name)} rows={rows} withNews={CELLS_WITH_NEWS()} tied={CELLS_OWN_WORDS_REFER()} total={CELLS.length} checked={shortDate(CHECKED_ON)} />,
    { ...size, fonts: await ogFonts() },
  );
}
