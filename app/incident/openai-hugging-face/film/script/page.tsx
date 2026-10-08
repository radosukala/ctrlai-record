import type { Metadata } from 'next';
import { Script } from '@/components/incident/film/Script';

export const metadata: Metadata = {
  title: 'The film’s script and timing',
  description: 'Every word of the OpenAI–Hugging Face film, in order, with when it appears and how long it stays.',
  // Kept out of search engines, like the film itself, until it is published.
  robots: { index: false, follow: false },
};

export default function FilmScriptPage() {
  return (
    <div className="shell page">
      <Script />
    </div>
  );
}
