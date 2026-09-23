import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EPISODES, getEpisode, SERIES } from '@/content/tomorrows';
import { EpisodePlayer } from '@/components/tomorrows/EpisodePlayer';
import { absoluteUrl } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return EPISODES.map(episode => ({ episode: episode.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ episode: string }> }): Promise<Metadata> {
  const { episode: slug } = await params;
  const episode = getEpisode(slug);
  if (!episode) return {};
  return {
    title: `${episode.title} · ${SERIES.title}`,
    description: `${episode.hook} ${episode.description}`,
    alternates: { canonical: `/tomorrows/${episode.slug}` },
    openGraph: { title: episode.title, description: `${episode.hook} Fiction, five minutes, with the facts at the end.`, type: 'article' },
  };
}

export default async function EpisodePage({ params }: { params: Promise<{ episode: string }> }) {
  const { episode: slug } = await params;
  const episode = getEpisode(slug);
  if (!episode) notFound();
  return (
    <>
      <EpisodePlayer episode={episode} shareUrl={absoluteUrl(`/tomorrows/${episode.slug}`)} />
      <noscript>
        <p style={{ padding: '24px var(--gutter)', fontSize: 17 }}>This story turns its pages with JavaScript. Turn it on to read it.</p>
      </noscript>
    </>
  );
}
