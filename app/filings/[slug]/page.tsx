import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FilingView } from '@/components/filings/FilingView';
import { FILINGS, getFiling } from '@/content/filings';
import { longDate } from '@/lib/site';

export const dynamicParams = false;
export function generateStaticParams() {
  return FILINGS.map(f => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = getFiling(slug);
  if (!f) return {};
  const title = `What ${f.company} told investors`;
  const description = `${f.company}’s ${f.form}, filed ${longDate(f.filed)}: its revenue, losses and computing commitments, and its warnings about AI, word for word, next to what it says in public. Every passage checked against the filing.`;
  return {
    title,
    description,
    alternates: { canonical: `/filings/${f.slug}` },
    openGraph: { type: 'article', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

/** A company's filing with the SEC, in its own words, next to what it says in public (content/filings). */
export default async function FilingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = getFiling(slug);
  if (!f) notFound();
  return <FilingView f={f} />;
}
