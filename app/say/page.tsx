import type { Metadata } from 'next';
import { HubView } from '@/components/say/HubView';
import { HUB, SAY } from '@/content/say';

export const metadata: Metadata = {
  title: SAY.name,
  description: HUB.en.metaDescription,
  alternates: { canonical: HUB.en.path, languages: { en: HUB.en.path, cs: HUB.cs.path } },
};

export default function SayPage() {
  return <HubView lang="en" />;
}
