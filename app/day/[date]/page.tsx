import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LensProvider } from '@/components/editions/EditionControls';
import { EditionView } from '@/components/editions/EditionView';
import { DAYS, LATEST_DAY_RUN, dayEdition, neighbors } from '@/content/base/editions';
import { longDate, shortDate } from '@/lib/site';

export const dynamicParams = false;
export function generateStaticParams() {
  return DAYS.map(date => ({ date }));
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  const ed = dayEdition(date);
  if (!ed) return {};
  return {
    title: `AI safety and control, ${longDate(date)}`,
    description: ed.line,
    alternates: { canonical: `/day/${date}` },
  };
}

/** A day's edition, kept: the Radar run of that morning, read the way the front page read it that day. */
export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const ed = dayEdition(date);
  if (!ed) notFound();
  const { prev, next } = neighbors(date);
  return (
    <LensProvider>
      <EditionView
        ed={ed}
        heading="h1"
        nav={<>
          {prev ? <Link href={`/day/${prev}`}><span aria-hidden="true">←</span> {shortDate(prev)}</Link> : null}
          {next ? <Link href={`/day/${next}`}>{shortDate(next)} <span aria-hidden="true">→</span></Link> : null}
          {date !== LATEST_DAY_RUN ? <Link href="/">Today</Link> : null}
        </>}
      />
    </LensProvider>
  );
}
