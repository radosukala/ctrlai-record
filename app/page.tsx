import type { Metadata } from 'next';
import { BaseHome } from '@/components/base/BaseHome';
import { FilmHero } from '@/components/FilmHero';
import { FILM_PUBLIC } from '@/content/incidents/openai-hf/publish';

export const metadata: Metadata = {
  title: { absolute: 'Ctrl AI · What is happening in AI safety and control, checked' },
  description: 'Everything that mattered in AI safety, alignment and control, in one place: what was said, by whom, why it matters to you, and every quotation checked against its source.',
  alternates: { canonical: '/' },
};

export default function Home() {
  return <BaseHome film={FILM_PUBLIC ? <FilmHero /> : null} />;
}
