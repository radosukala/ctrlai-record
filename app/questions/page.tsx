import type { Metadata } from 'next';
import Link from 'next/link';
import '@/components/editions/editions.css';
import { ENTRIES, LATEST_DAY, WEEK } from '@/content/base';
import { TOPICS } from '@/content/base/taxonomy';
import { BRIEFS, visible as briefVisible } from '@/content/decisions';
import { QUESTIONS, visible } from '@/content/questions';
import { longDate } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Nine questions',
  description: 'The nine questions the Base is organized around. Where the record is deep enough, a dated answer with the evidence, where it stops and who disagrees; and the public decisions those answers bear on.',
  alternates: { canonical: '/questions' },
};

const firstSentences = (text: string, n = 2) => (text.match(/[^.!?]+[.!?]+["”’)]*(\s|$)/g) ?? [text]).slice(0, n).join('').trim();

/** The questions and the decisions, in one place: the way in for anyone who wants answers rather than news. */
export default function QuestionsIndex() {
  const answered = new Map(QUESTIONS.filter(visible).map(q => [q.id as string, q]));
  const briefs = BRIEFS.filter(briefVisible);
  return (
    <div className="shell ed">
      <header className="ed-head">
        <p className="dateline"><b>The Base</b><span>Nine questions</span><span>{answered.size} answered</span></p>
        <h1 className="ed-line">Nine questions about AI safety and control, and what the record says so far</h1>
        <p className="ed-qi-lede">Every entry in the Base is filed under the questions it bears on. Where we have read enough, we answer: with a date, the evidence and where it stops, who disagrees and why, and a public history of every revision.</p>
      </header>
      <section className="ed-sec" aria-labelledby="qi-questions">
        <header className="ed-sec-head"><h2 id="qi-questions">The questions</h2><p>In the order a newcomer tends to ask them. An answer changes when the evidence does, and says why.</p></header>
        <ol className="ed-qi">
          {TOPICS.map((t, i) => {
            const q = answered.get(t.id);
            const all = ENTRIES.filter(e => e.topics.includes(t.id)).length;
            const week = WEEK.filter(e => e.topics.includes(t.id)).length;
            return (
              <li key={t.id}>
                <p className="ed-meta"><b>Q{i + 1}</b>{q ? <span>Answered · version {q.version}, as of {longDate(q.asOf)}</span> : <span>Not answered yet</span>}<span>{all} {all === 1 ? 'entry' : 'entries'} in the Base</span></p>
                <h2 className="ed-qi-q"><Link href={q ? `/questions/${t.id}` : `/base#q-${t.id}`}>{t.question}</Link></h2>
                {q ? (
                  <>
                    <p className="ed-qi-a">{firstSentences(q.answer)}</p>
                    <p className="ed-more"><Link href={`/questions/${t.id}`}>The full answer <span aria-hidden="true">→</span></Link></p>
                  </>
                ) : <p className="ed-note">{week} {week === 1 ? 'entry' : 'entries'} this week. <Link href={`/base#q-${t.id}`}>Read them <span aria-hidden="true">→</span></Link></p>}
              </li>
            );
          })}
        </ol>
      </section>
      {briefs.length ? (
        <section className="ed-sec" id="decisions" aria-labelledby="qi-decisions">
          <header className="ed-sec-head"><h2 id="qi-decisions">Decisions, laid out</h2><p>A public decision still open: who decides, the options with the case for and against each, the evidence, the next date and how to take part. A brief recommends nothing.</p></header>
          <ol className="ed-qi">
            {briefs.map(b => {
              const next = b.deadlines.filter(d => d.date >= LATEST_DAY).sort((x, y) => x.date.localeCompare(y.date))[0];
              return (
                <li key={b.id}>
                  <p className="ed-meta"><b>{b.jurisdiction}</b><span>Version {b.version}, as of {longDate(b.asOf)}</span>{next ? <span>Next date: {longDate(next.date)}</span> : null}</p>
                  <h2 className="ed-qi-q"><Link href={`/decisions/${b.id}`}>{b.title}</Link></h2>
                  <p className="ed-qi-a">{firstSentences(b.summary)}</p>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
