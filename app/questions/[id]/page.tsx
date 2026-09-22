import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { getDb } from '@/lib/db/client';
import { listWorks } from '@/lib/store/works';
import { testRunCounts } from '@/lib/store/stats';
import { QUESTIONS, getQuestion } from '@/content/questions';
import { TESTS } from '@/content/tests';
import { WorkItem } from '@/components/WorkItem';
import { StopDemo } from '@/components/StopDemo';
import { ShareActions } from '@/components/ShareActions';
import { absoluteUrl } from '@/lib/site';
import { plural } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const question = getQuestion(id);
  if (!question) return {};
  return { title: question.title, description: `${question.short} ${question.primer[0].slice(0, 180)}…` };
}

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const question = getQuestion(id);
  if (!question) notFound();
  const db = await getDb();
  const [works, counts] = await Promise.all([listWorks(db, { question: question.id, limit: 60 }), testRunCounts(db)]);
  const tests = TESTS.filter(test => test.questions.includes(question.id));
  const index = QUESTIONS.findIndex(item => item.id === question.id);
  const next = QUESTIONS[(index + 1) % QUESTIONS.length];
  const shown = works.slice(0, 14);

  return (
    <>
      <section className="test-hero">
        <div className="shell">
          <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/questions">Questions</Link><span aria-hidden="true">/</span><span>{String(question.number).padStart(2, '0')}</span></nav>
          <h1 className="title mt-24">{question.title}</h1>
          <p className="lede">{question.short}</p>
        </div>
      </section>

      <section className="section-tight">
        <div className="shell split-wide">
          <div className="stack" style={{ ['--stack' as string]: '28px' }}>
            <div className="prose">{question.primer.map(paragraph => <p key={paragraph.slice(0, 24)} style={{ fontSize: 18 }}>{paragraph}</p>)}</div>
            <div className="know">
              <div className="card">
                <h2 className="h4">What we know</h2>
                <ul className="bullets small mt-12">{question.known.map(item => <li key={item}>{item}</li>)}</ul>
              </div>
              <div className="card">
                <h2 className="h4">What nobody knows yet</h2>
                <ul className="bullets small mt-12">{question.open.map(item => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
            {question.id === 'stop' ? <StopDemo /> : null}
          </div>
          <aside className="stack sticky" style={{ ['--stack' as string]: '16px' }}>
            {tests.length ? (
              <div className="card">
                <h2 className="h4">Test it yourself</h2>
                <ul className="aside-list mt-12">
                  {tests.map(test => (
                    <li key={test.id}>
                      <Link href={`/tests/${test.id}`} style={{ fontWeight: 600 }}>{test.title}</Link>
                      <span className="tiny muted">{test.kind === 'behavior' ? 'Behavior' : 'Stated attitude'} · about {test.seconds} seconds · {counts[test.id] ? plural(counts[test.id].runs, 'run') : 'no runs yet'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="card">
              <h2 className="h4">Share this question</h2>
              <div className="mt-12"><ShareActions url={absoluteUrl(`/questions/${question.id}`)} text={`${question.title} ${question.short}`} compact /></div>
            </div>
            <div className="card-flat">
              <p className="small muted">Something wrong or missing? These answers are edited in the open. <Link href="/library/add">Add a source</Link>, or see <Link href="/about#corrections">how corrections work</Link>.</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-head">
            <div>
              <span className="eyebrow"><span className="dot" /> Read, watch, listen</span>
              <h2 className="h2">The work behind this answer.</h2>
              <p>Every link was opened and every summary written for this site, with caveats where the source has an interest. New additions are checked by two people.</p>
            </div>
            <Link href={`/library?question=${question.id}`} className="link-arrow">All {works.length} in the library <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          {shown.length ? <div className="grid grid-2" style={{ columnGap: 40 }}>{shown.map(work => <WorkItem key={work.id} work={work} />)}</div>
            : <div className="empty"><h3>Nothing here yet.</h3><p><Link href="/library/add">Add the first work</Link> for this question.</p></div>}
        </div>
      </section>

      <section className="section-tight">
        <div className="shell">
          <Link href={`/questions/${next.id}`} className="card card-link" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <span><span className="small muted">Next question</span><span className="h3" style={{ display: 'block', fontFamily: 'var(--serif)', marginTop: 4 }}>{next.title}</span></span>
            <ArrowRight size={22} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
