import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CompanyView } from '@/components/money/CompanyView';
import { COMPANIES, getCompany, latestFiling } from '@/content/money';
import { brief, periodName } from '@/lib/money';

export const dynamicParams = false;
export function generateStaticParams() {
  return COMPANIES.map(c => ({ company: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ company: string }> }): Promise<Metadata> {
  const company = getCompany((await params).company);
  if (!company) return {};
  const f = latestFiling(company);
  const { period, stats } = brief(f);
  const title = `${company.name}: the numbers`;
  const description = `${company.name}’s revenue, costs, losses and computing commitments from its ${f.form}, drawn. ${periodName(period)}: revenue ${stats[0].value}, operating loss ${stats[1].value}, net loss ${stats[2].value}. Every figure checked against the filing.`;
  return {
    title,
    description,
    alternates: { canonical: `/money/${company.slug}` },
    openGraph: { type: 'article', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

/** A company in the money section: its figures from its newest filing, drawn, and the documents they come from. */
export default async function CompanyPage({ params }: { params: Promise<{ company: string }> }) {
  const company = getCompany((await params).company);
  if (!company) notFound();
  return <CompanyView company={company} f={latestFiling(company)} />;
}
