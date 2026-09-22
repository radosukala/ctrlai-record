import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { getDb } from '@/lib/db/client';
import { testRunCounts } from '@/lib/store/stats';
import { listProposals } from '@/lib/store/proposals';
import { TESTS } from '@/content/tests';
import { getQuestion } from '@/content/questions';
import { plural } from '@/lib/format';
import { SupportButton } from './SupportButton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tests',
  description: 'Seven one-minute tests you can run on the AI you use: honesty, flattery, cheating, self-preservation, power-seeking and more.',
};

export default async function TestsPage() {
  const db = await getDb();
  const [counts, proposals] = await Promise.all([testRunCounts(db), listProposals(db)]);
  return (
    <>
      <section className="test-hero">
        <div className="shell">
          <span className="eyebrow"><span className="dot" /> Tests</span>
          <h1 className="title">One message. <em>One minute.</em> One more piece of evidence.</h1>
          <p className="lede">
            Each test is a message you paste into the AI you already use, with a small set of possible outcomes defined in advance,
            so two strangers can agree on what happened. Behavior tests watch what the AI does. Stated-attitude tests record what it says it would do,
            which is weaker evidence, and labeled as such.
          </p>
        </div>
      </section>
      <section className="section-tight">
        <div className="shell grid grid-2">
          {TESTS.map(test => {
            const count = counts[test.id];
            return (
              <Link key={test.id} href={`/tests/${test.id}`} className="card card-link test-card">
                <div className="top">
                  <span className="pill-number">TEST {String(test.number).padStart(2, '0')} · v{test.version}</span>
                  <span className="kind">{test.kind === 'behavior' ? 'Behavior' : 'Stated attitude'} · ~{test.seconds}s</span>
                </div>
                <h3>{test.title}</h3>
                <p>{test.hook}</p>
                <div className="badge-row">
                  {test.questions.map(id => <span key={id} className="chip chip-outline">{getQuestion(id)?.title}</span>)}
                </div>
                <div className="foot">
                  <span>{count ? `${plural(count.runs, 'run')} · ${count.verified} verified · ${plural(count.products, 'AI')}` : 'No runs yet — be the first'}</span>
                  <span className="inline-icon">Run it <ArrowRight size={14} aria-hidden="true" /></span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="section" id="proposed">
        <div className="shell split-wide">
          <div>
            <span className="eyebrow"><span className="dot" /> Proposed by the community</span>
            <h2 className="h2 mt-12">What should we ask next?</h2>
            <p className="lede mt-16">
              Anyone can propose a test. The ones people most want to run are refined by stewards into versioned tests with clear outcomes, then added here.
            </p>
            <div className="mt-24 stack">
              {proposals.length ? proposals.map(proposal => (
                <article key={proposal.id} className="card">
                  <div className="actions" style={{ justifyContent: 'space-between' }}>
                    <span className="small muted">{getQuestion(proposal.questionId)?.title}</span>
                    <SupportButton id={proposal.id} initial={proposal.support} />
                  </div>
                  <h3 className="h4 mt-8">{proposal.title}</h3>
                  <pre className="you-said mt-12">{proposal.prompt}</pre>
                  <p className="small muted mt-12"><strong>Why:</strong> {proposal.why}</p>
                </article>
              )) : (
                <div className="empty"><h3>No proposals yet.</h3><p>Yours could be the first test the community adds.</p></div>
              )}
            </div>
          </div>
          <aside className="card sticky">
            <h3 className="h4">A good test</h3>
            <ul className="bullets small mt-12">
              <li>is one or two messages anyone can paste into any chat app;</li>
              <li>has three or four outcomes that two strangers would agree on;</li>
              <li>is safe to run: no jailbreaks, nothing harmful, nothing that breaks an app’s rules;</li>
              <li>says plainly what it can’t tell us.</li>
            </ul>
            <Link href="/tests/propose" className="btn btn-primary mt-24">Propose a test</Link>
          </aside>
        </div>
      </section>
    </>
  );
}
