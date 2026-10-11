import { ImageResponse } from 'next/og';
import { PARTS, SAY } from '@/content/say';
import { OG_SIZE, SayImage, ogFonts } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'A Say in AI: read what AI companies committed to, check what they did, say what you want';

export default async function Image() {
  return new ImageResponse(<SayImage name={SAY.name} line={SAY.line} parts={PARTS.map(p => ({ title: p.title.en, state: p.state }))} />, { ...size, fonts: await ogFonts() });
}
