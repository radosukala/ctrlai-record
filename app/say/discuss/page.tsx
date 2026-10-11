import type { Metadata } from 'next';
import { DiscussView } from '@/components/say/DiscussView';
import { COPY } from '@/content/say-discuss';

export const metadata: Metadata = {
  title: 'Discuss: what would you require of them?',
  description: 'Six AI companies signed a White House accord on advanced AI. Read one sentence at a time, agree or disagree, and say what you would require of them.',
  alternates: { canonical: COPY.en.path, languages: { en: COPY.en.path, cs: COPY.cs.path } },
};

export default function DiscussPage() {
  return <DiscussView lang="en" />;
}
