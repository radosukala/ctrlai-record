import { ImageResponse } from 'next/og';
import { LATEST } from '@/content/issues';
import { IssueImage, OG_SIZE, ogFonts } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Ctrl AI: this week in AI control';

export default async function Image() {
  return new ImageResponse(<IssueImage issue={LATEST} />, { ...size, fonts: await ogFonts() });
}
