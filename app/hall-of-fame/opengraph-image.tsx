import { ImageResponse } from 'next/og';
import { CAP, ENTRIES, START_HERE } from '@/content/hall';
import { HallImage, OG_SIZE, ogFonts } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'The Ctrl AI Hall of Fame: what you shouldn’t miss about AI control';

export default async function Image() {
  return new ImageResponse(<HallImage count={ENTRIES.length} cap={CAP} firstTitles={START_HERE.slice(0, 3).map(entry => entry.title)} />, { ...size, fonts: await ogFonts() });
}
