import type { Metadata } from 'next';
import { Film } from '@/components/incident/film/Film';
import { FILM_PATH, FILM_PUBLIC } from '@/content/incidents/openai-hf/publish';
import { FILM_DURATION } from '@/content/incidents/openai-hf/timing';
import { absoluteUrl } from '@/lib/site';

const TITLE = 'The OpenAI–Hugging Face incident, as a film';
const DESCRIPTION = `A ${Math.round(FILM_DURATION / 60)}-minute film, drawn from what OpenAI, METR and Hugging Face published about the July 2026 incident in which hundreds of AI agents took part in an attack on Hugging Face. With sound. Every date, number and quotation has its source.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Not in search engines until the film may be published (its voices made on a paid plan: content/incidents/openai-hf/publish.ts).
  robots: FILM_PUBLIC ? { index: true, follow: true } : { index: false, follow: false },
  alternates: { canonical: FILM_PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'video.other', url: absoluteUrl(FILM_PATH) },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export default function FilmPage() {
  return (
    <div className="film-page">
      <Film />
    </div>
  );
}
