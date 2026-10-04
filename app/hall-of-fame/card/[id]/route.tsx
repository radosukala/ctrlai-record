import { ImageResponse } from 'next/og';
import { ENTRIES, SECTIONS, reviewDate } from '@/content/hall';
import { OG_SIZE, ogFonts, PickCard } from '@/lib/og';

/** A card for each Hall of Fame entry, for its maker to post: /hall-of-fame/card/<entry id>. */

export const dynamicParams = false;

export function generateStaticParams() {
  return ENTRIES.map(entry => ({ id: entry.id }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = ENTRIES.find(item => item.id === id);
  if (!entry) return new Response('Not found', { status: 404 });
  const section = SECTIONS.find(item => item.id === entry.section)!;
  const nominee = reviewDate(entry) !== null;
  return new ImageResponse(
    <PickCard
      pick={entry}
      label={nominee ? 'NOMINATED TO THE HALL OF FAME' : 'IN THE HALL OF FAME'}
      right={section.title.toUpperCase()}
      footer={`One of ${ENTRIES.length} things you shouldn’t miss about AI control`}
      url="ctrlai.com/hall-of-fame"
    />,
    { ...OG_SIZE, fonts: await ogFonts() },
  );
}
