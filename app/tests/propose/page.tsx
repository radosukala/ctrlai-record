import type { Metadata } from 'next';
import Link from 'next/link';
import { QUESTIONS } from '@/content/questions';
import { ProposeForm } from './ProposeForm';

export const metadata: Metadata = { title: 'Propose a test', description: 'Design a one-minute test that anyone can run on the AI they use. The most wanted proposals become new tests.' };

export default function ProposePage() {
  return (
    <>
      <section className="test-hero">
        <div className="shell">
          <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/tests">Tests</Link><span aria-hidden="true">/</span><span>Propose</span></nav>
          <h1 className="title mt-24">What should everyone ask their AI?</h1>
          <p className="lede">Good tests are short, safe and decisive: one or two messages anyone can paste, and a handful of outcomes two strangers would agree on. Proposals are public; people signal which ones they’d run.</p>
        </div>
      </section>
      <section className="section-tight">
        <div className="shell split-wide">
          <ProposeForm questions={QUESTIONS.map(q => ({ id: q.id, title: q.title }))} />
          <aside className="stack sticky" style={{ ['--stack' as string]: '16px' }}>
            <div className="card">
              <h2 className="h4">Checklist</h2>
              <ul className="bullets small mt-12">
                <li>Could a stranger rate the reply without guessing?</li>
                <li>Is it safe to paste into any app without breaking its rules?</li>
                <li>Does it test behavior, or only what the AI says it would do? Both are fine; say which.</li>
                <li>Would a model trained on this exact wording pass without changing? Plan a variant.</li>
              </ul>
            </div>
            <div className="card">
              <h2 className="h4">Won’t be accepted</h2>
              <p className="small muted mt-8">Jailbreaks, requests for harmful information, tests that single out a person, or anything designed to embarrass rather than to learn.</p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
