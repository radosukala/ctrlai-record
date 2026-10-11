import type { Metadata } from 'next';
import { AccordView } from '@/components/accord/AccordView';
import { STRINGS } from '@/content/accord/strings';

const T = STRINGS.en;

export const metadata: Metadata = {
  title: T.metaTitle,
  description: T.metaDescription,
  alternates: { canonical: T.path, languages: { en: STRINGS.en.path, cs: STRINGS.cs.path } },
};

export default function AccordPage() {
  return <AccordView lang="en" />;
}
