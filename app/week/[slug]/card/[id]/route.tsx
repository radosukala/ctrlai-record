import { ImageResponse } from 'next/og';
import { ISSUES, getIssue } from '@/content/issues';
import { capsRange, OG_SIZE, ogFonts, PickCard } from '@/lib/og';

/** A card for each pick, for its maker to post: /week/<slug>/card/<pick id>. */

export const dynamicParams = false;

export function generateStaticParams() {
  return ISSUES.flatMap(issue => issue.picks.map(pick => ({ slug: issue.slug, id: pick.id })));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const issue = getIssue(slug);
  const index = issue?.picks.findIndex(pick => pick.id === id) ?? -1;
  if (!issue || index < 0) return new Response('Not found', { status: 404 });
  return new ImageResponse(
    <PickCard
      pick={issue.picks[index]}
      label="PICKED FOR THIS WEEK IN AI CONTROL"
      right={`ISSUE ${issue.number} · ${capsRange(issue.from, issue.to)}`}
      footer={`Pick ${index + 1} of ${issue.picks.length} worth your time this week`}
      url={`ctrlai.com/week/${issue.slug}`}
    />,
    { ...OG_SIZE, fonts: await ogFonts() },
  );
}
