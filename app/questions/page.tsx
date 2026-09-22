import Link from 'next/link';
import type { Metadata } from 'next';
import { QUESTIONS } from '@/content/questions';
import { TESTS } from '@/content/tests';

export const metadata: Metadata = {
  title: 'Ten questions about AI',
  description: 'Short, sourced, calm explanations of how AI works, how worried to be, and how humans keep control — each linked to tests you can run and research worth reading.',
};

export default function QuestionsPage() {
  return (
    <>
      <section className="test-hero">
        <div className="shell">
          <span className="eyebrow"><span className="dot" /> The atlas</span>
          <h1 className="title">Ten questions everyone should be able to answer about AI.</h1>
          <p className="lede">
            Each answer is short, written for anyone, and honest about what nobody knows yet. Each links to tests you can run yourself
            and to the research, reporting and debate behind it, including the skeptics.
          </p>
        </div>
      </section>
      <section className="section-tight">
        <div className="shell grid grid-2">
          {QUESTIONS.map(question => {
            const tests = TESTS.filter(test => test.questions.includes(question.id));
            return (
              <Link key={question.id} href={`/questions/${question.id}`} className="card card-link q-card">
                <span className="n">{String(question.number).padStart(2, '0')}</span>
                <h2 className="h3">{question.title}</h2>
                <p>{question.short}</p>
                <span className="tiny muted">{tests.length ? `${tests.length} ${tests.length === 1 ? 'test' : 'tests'} you can run` : 'Reading and research'}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
