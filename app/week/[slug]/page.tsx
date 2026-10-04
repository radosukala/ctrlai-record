import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ISSUES, LATEST, getIssue } from '@/content/issues';
import { IssueView } from '@/components/IssueView';
import { dateRange } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return ISSUES.map(issue => ({ slug: issue.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const issue = getIssue(slug);
  if (!issue) return {};
  const title = `This week in AI control · Issue ${issue.number}, ${dateRange(issue.from, issue.to)}`;
  return {
    title: { absolute: `${title} · Ctrl AI` },
    description: issue.summary,
    alternates: { canonical: `/week/${issue.slug}` },
    openGraph: { title, description: issue.summary, type: 'article' },
  };
}

export default async function IssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const issue = getIssue(slug);
  if (!issue) notFound();
  return <IssueView issue={issue} isLatest={issue.slug === LATEST.slug} />;
}
