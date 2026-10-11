import type { Metadata } from 'next';
import { DiscussView } from '@/components/say/DiscussView';
import { COPY } from '@/content/say-discuss';

export const metadata: Metadata = {
  title: 'Diskuse: co byste od nich požadovali?',
  description: 'Šest firem vyvíjejících umělou inteligenci podepsalo dohodu Bílého domu o pokročilé umělé inteligenci. Čtěte tvrzení jedno po druhém, souhlaste nebo nesouhlaste a řekněte, co byste od nich požadovali.',
  alternates: { canonical: COPY.cs.path, languages: { en: COPY.en.path, cs: COPY.cs.path } },
};

export default function DiscussPageCs() {
  return <DiscussView lang="cs" />;
}
