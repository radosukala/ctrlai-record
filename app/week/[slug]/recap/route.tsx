import { ImageResponse } from 'next/og';
import { ISSUES, getIssue } from '@/content/issues';
import { ogFonts, RECAP_SIZE, RecapImage } from '@/lib/og';

/** The week's events on one image, for the first post of the weekly thread: /week/<slug>/recap. */

export const dynamicParams = false;

export function generateStaticParams() {
  return ISSUES.map(issue => ({ slug: issue.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const issue = getIssue(slug);
  if (!issue) return new Response('Not found', { status: 404 });
  return new ImageResponse(<RecapImage issue={issue} />, { ...RECAP_SIZE, fonts: await ogFonts() });
}
