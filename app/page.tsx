import type { Metadata } from 'next';
import { LATEST } from '@/content/issues';
import { FilmHero } from '@/components/FilmHero';
import { IssueView } from '@/components/IssueView';
import { FILM_PUBLIC } from '@/content/incidents/openai-hf/publish';
import { SITE, dateRange } from '@/lib/site';

export const metadata: Metadata = {
  title: { absolute: 'Ctrl AI · This week in AI control' },
  description: SITE.description,
  alternates: { canonical: '/' },
  openGraph: { title: `This week in AI control · Issue ${LATEST.number}, ${dateRange(LATEST.from, LATEST.to)}`, description: LATEST.summary },
};

export default function Home() {
  return (
    <>
      {FILM_PUBLIC ? <FilmHero /> : null}
      <IssueView issue={LATEST} isLatest />
    </>
  );
}
