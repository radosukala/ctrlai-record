import type { Metadata } from 'next';
import Link from 'next/link';
import { EditionTabs } from '@/components/editions/EditionControls';
import { EditionView } from '@/components/editions/EditionView';
import { FilmHero } from '@/components/FilmHero';
import { DayBeforeBand } from '@/components/scenario/DayBeforeBand';
import { LATEST_DAY } from '@/content/base';
import { LATEST_DAY_RUN, dayEdition, monthEdition, monthName, neighbors, spanLabel, weekEdition } from '@/content/base/editions';
import { FILM_PUBLIC } from '@/content/incidents/openai-hf/publish';
import { DAY_BEFORE_PUBLIC } from '@/content/scenarios/day-before/publish';
import { shortDate } from '@/lib/site';

export const metadata: Metadata = {
  title: { absolute: 'Ctrl AI · AI safety and control today, this week and this month, checked' },
  description: 'What changed in AI safety, alignment and control today, this week and this month: decisions, new evidence and commitments, who said what, the interviews worth your time, and every quotation checked against its source.',
  alternates: { canonical: '/' },
};

/**
 * The front page is today's edition of the Base, with this week and this month one tab away: the same sections at
 * every horizon (content/base/editions.ts). Each edition also has a permanent page, /day/<run> and /month/<YYYY-MM>.
 */
export default function Home() {
  const today = dayEdition(LATEST_DAY_RUN)!;
  const week = weekEdition();
  const month = monthEdition(LATEST_DAY.slice(0, 7));
  const { prev } = neighbors(LATEST_DAY_RUN);
  return (
    <>
      <h1 className="sr-only">Ctrl AI: what changed in AI safety and control today, this week and this month</h1>
      <EditionTabs
        panels={[
          {
            id: 'today', label: 'Today', note: shortDate(LATEST_DAY_RUN),
            content: <EditionView ed={today} front nav={<><Link href={`/day/${LATEST_DAY_RUN}`}>This day’s page</Link>{prev ? <Link href={`/day/${prev}`}>Previous day, {shortDate(prev)}</Link> : null}</>} />,
          },
          {
            id: 'week', label: 'This week', note: spanLabel(week.from, week.to),
            content: <EditionView ed={week} front nav={<Link href="/week">The weekly issue <span aria-hidden="true">→</span></Link>} />,
          },
          {
            id: 'month', label: 'This month', note: monthName(month.from),
            content: <EditionView ed={month} front nav={<Link href={`/month/${month.from.slice(0, 7)}`}>This month’s page</Link>} />,
          },
        ]}
      />
      {FILM_PUBLIC ? <FilmHero /> : null}
      {DAY_BEFORE_PUBLIC ? <DayBeforeBand /> : null}
    </>
  );
}
