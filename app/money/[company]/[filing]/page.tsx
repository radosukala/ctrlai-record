import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FilingView } from '@/components/filings/FilingView';
import { COMPANIES, filingPath, getCompany } from '@/content/money';
import { longDate } from '@/lib/site';

type Params = { company: string; filing: string };

export const dynamicParams = false;
export function generateStaticParams(): Params[] {
  return COMPANIES.flatMap(c => c.filings.map(f => ({ company: c.slug, filing: f.path })));
}

const find = (p: Params) => {
  const company = getCompany(p.company);
  const f = company?.filings.find(x => x.path === p.filing);
  return company && f ? { company, f } : undefined;
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const found = find(await params);
  if (!found) return {};
  const { f } = found;
  const title = `What ${f.company} told investors`;
  const description = `${f.company}’s ${f.form}, filed ${longDate(f.filed)}: its warnings about AI, word for word, next to what it says in public, and how the press quoted it. Every passage checked against the filing.`;
  return {
    title,
    description,
    alternates: { canonical: filingPath(f) },
    openGraph: { type: 'article', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

/** A company's filing, in its own words, next to what it says in public (content/filings); its numbers are drawn on the
 *  company's page, one level up. */
export default async function FilingPage({ params }: { params: Promise<Params> }) {
  const found = find(await params);
  if (!found) notFound();
  return <FilingView company={found.company} f={found.f} />;
}
