import type { Metadata } from 'next';
import { BaseHome } from '@/components/base/BaseHome';
import { FilmHero } from '@/components/FilmHero';
import { DayBeforeBand } from '@/components/scenario/DayBeforeBand';
import { FILM_PUBLIC } from '@/content/incidents/openai-hf/publish';
import { DAY_BEFORE_PUBLIC } from '@/content/scenarios/day-before/publish';

export const metadata: Metadata = {
  title: { absolute: 'Ctrl AI · What is happening in AI safety and control, checked' },
  description: 'Everything that mattered in AI safety, alignment and control, in one place: what was said, by whom, why it matters to you, and every quotation checked against its source.',
  alternates: { canonical: '/' },
};

export default function Home() {
  return <BaseHome film={FILM_PUBLIC || DAY_BEFORE_PUBLIC ? <>{FILM_PUBLIC ? <FilmHero /> : null}{DAY_BEFORE_PUBLIC ? <DayBeforeBand /> : null}</> : null} />;
}
