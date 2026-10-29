import type { Metadata } from 'next';
import { MoneyHub } from '@/components/money/MoneyHub';

const title = 'The money behind AI';
const description = 'What the companies building AI earn, spend and promise to spend, from their own filings: AI labs first, then the clouds and the chipmakers. Every figure checked against the filing.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/money' },
  openGraph: { type: 'website', title, description },
  twitter: { card: 'summary_large_image', title, description },
};

export default function MoneyPage() {
  return <MoneyHub />;
}
