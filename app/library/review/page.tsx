import type { Metadata } from 'next';
import Link from 'next/link';
import { ReviewClient } from './ReviewClient';

export const metadata: Metadata = { title: 'Review library additions', description: 'Check new library entries: does the link work, is the summary fair, does it belong?' };

export default function ReviewPage() {
  return (
    <>
      <section className="test-hero">
        <div className="shell">
          <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/library">Library</Link><span aria-hidden="true">/</span><span>Review</span></nav>
          <h1 className="title mt-24">Keep the library honest.</h1>
          <p className="lede">Open the link. Is it what it says? Is the summary fair and free of hype? Does it help people understand AI and human control? Two approvals list it; two declines remove it.</p>
        </div>
      </section>
      <section className="section-tight"><div className="shell"><ReviewClient /></div></section>
    </>
  );
}
