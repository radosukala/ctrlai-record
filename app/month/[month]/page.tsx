import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LensProvider } from '@/components/editions/EditionControls';
import { EditionView } from '@/components/editions/EditionView';
import { MONTHS, monthEdition } from '@/content/base/editions';
import { longDate } from '@/lib/site';

export const dynamicParams = false;
export function generateStaticParams() {
  return MONTHS.map(month => ({ month }));
}

export async function generateMetadata({ params }: { params: Promise<{ month: string }> }): Promise<Metadata> {
  const { month } = await params;
  if (!MONTHS.includes(month)) return {};
  return {
    title: `AI safety and control in ${longDate(month)}`,
    description: monthEdition(month).line,
    alternates: { canonical: `/month/${month}` },
  };
}

/** A month's edition: everything the Base recorded that month, read in the edition's sections. */
export default async function MonthPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  if (!MONTHS.includes(month)) notFound();
  const i = MONTHS.indexOf(month);
  return (
    <LensProvider>
      <EditionView
        ed={monthEdition(month)}
        heading="h1"
        nav={<>
          {i > 0 ? <Link href={`/month/${MONTHS[i - 1]}`}><span aria-hidden="true">←</span> {longDate(MONTHS[i - 1])}</Link> : null}
          {i < MONTHS.length - 1 ? <Link href={`/month/${MONTHS[i + 1]}`}>{longDate(MONTHS[i + 1])} <span aria-hidden="true">→</span></Link> : null}
          <Link href="/">Today</Link>
        </>}
      />
    </LensProvider>
  );
}
