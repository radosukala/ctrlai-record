import { ImageResponse } from 'next/og';
import { LATEST } from '@/content/issues';
import { IssueImage, OG_SIZE, ogFonts } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Ctrl AI: what was said about AI safety and control this week, each quotation checked against its source';

export default async function Image() {
  return new ImageResponse(<IssueImage issue={LATEST} label="The week in AI safety and control" footer="What was said this week, each quotation checked against its source." />, { ...size, fonts: await ogFonts() });
}
