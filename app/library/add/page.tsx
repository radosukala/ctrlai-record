import type { Metadata } from 'next';
import Link from 'next/link';
import { QUESTIONS } from '@/content/questions';
import { WORK_TYPES, WORK_TYPE_LABELS } from '@/lib/store/works';
import { AddWorkForm } from './AddWorkForm';

export const metadata: Metadata = { title: 'Add to the library', description: 'Add a paper, article, video or organization about AI safety and control. Two people check it before it is listed.' };

export default function AddWorkPage() {
  return (
    <>
      <section className="test-hero">
        <div className="shell">
          <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/library">Library</Link><span aria-hidden="true">/</span><span>Add</span></nav>
          <h1 className="title mt-24">Add something worth reading.</h1>
          <p className="lede">A paper, an investigation, a clear explainer, a video, a law, an organization. Two other people check that the link works and the summary is fair before it appears.</p>
        </div>
      </section>
      <section className="section-tight">
        <div className="shell split-wide">
          <AddWorkForm questions={QUESTIONS.map(q => ({ id: q.id, title: q.title }))} types={WORK_TYPES.map(type => ({ id: type, label: WORK_TYPE_LABELS[type] }))} />
          <aside className="card sticky">
            <h2 className="h4">What belongs here</h2>
            <ul className="bullets small mt-12">
              <li>Work that helps people understand how AI behaves, what the risks are, or how humans keep control.</li>
              <li>Serious work from every side, including skeptics. The test is quality, not agreement.</li>
              <li>The original source where possible: the paper, the law, the statement, not a post about it.</li>
              <li>A summary in your own words: what it shows, and why it matters. No hype.</li>
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}
