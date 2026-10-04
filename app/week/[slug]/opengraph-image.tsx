import { ImageResponse } from 'next/og';
import { ISSUES, getIssue, LATEST } from '@/content/issues';
import { IssueImage, OG_SIZE, ogFonts } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Ctrl AI: this week in AI control';

export function generateStaticParams() {
  return ISSUES.map(issue => ({ slug: issue.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return new ImageResponse(<IssueImage issue={getIssue(slug) ?? LATEST} />, { ...size, fonts: await ogFonts() });
}
