import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import '@/components/base/base.css';
import '@/components/questions/questions.css';
import { Section } from '@/components/Section';
import { ENTRIES, getEntry } from '@/content/base';
import { QUESTIONS, getQuestion, visible } from '@/content/questions';
import type { Cite, Claim, Question } from '@/content/questions/types';
import { longDate, shortDate } from '@/lib/site';

export const dynamicParams = false;
export function generateStaticParams() {
  return QUESTIONS.filter(visible).map(q => ({ id: q.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const q = getQuestion((await params).id);
  if (!q) return {};
  return {
    title: q.question, description: q.answer.slice(0, 200),
    ...(q.published ? {} : { robots: { index: false, follow: false } }),
    alternates: { canonical: `/questions/${q.id}` },
  };
}

const MAIL = 'hello@ctrlai.com';
const mail = (subject: string, body: string) => `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
const challenge = (q: Question, c?: Claim) => mail(
  `Challenge: ${q.question}${c ? ` [${c.id}]` : ''}`,
  `${c ? `About: “${c.text}”\n\n` : ''}What do you think is wrong, missing or out of date, and what is your evidence? Links help.\n\n`,
);

function CiteLink({ c }: { c: Cite }) {
  if ('base' in c) {
    const e = getEntry(c.base);
    return e ? <Link href={`/base/${e.slug}`}>{e.outlet}, {shortDate(e.published)}</Link> : <span>{c.base}</span>;
  }
  if ('page' in c) return <Link href={c.page}>{c.label}</Link>;
  return <a href={c.url}>{c.label}</a>;
}

function Claims({ q, list, kind }: { q: Question; list: Claim[]; kind?: string }) {
  return (
    <ol className="q-claims">
      {list.map(c => (
        <li key={c.id} id={c.id}>
          {kind ? <span className="q-kind">{kind}</span> : null}
          <p>{c.text}</p>
          <div className="q-cites">
            {c.cites.map((x, i) => <CiteLink key={i} c={x} />)}
            <a className="q-challenge" href={challenge(q, c)}>Challenge this</a>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const q = getQuestion((await params).id);
  if (!q) notFound();
  const onTopic = ENTRIES.filter(e => e.topics.includes(q.id));
  const pages = [...new Map(
    [...q.established, ...q.limits, ...q.unknowns, ...q.changed.items, ...q.disagreements.flatMap(d => d.sides)]
      .flatMap(c => c.cites).filter((c): c is Extract<Cite, { page: string }> => 'page' in c).map(c => [c.page, c]),
  ).values()];

  return (
    <div className="shell page b-page q-page">
      <header className="b-entry-head">
        <p className="dateline">
          <Link href="/"><b>The Base</b></Link>
          <span>A question, answered</span>
          <span>Version {q.version}</span>
          <time dateTime={q.asOf}>As of {longDate(q.asOf)}</time>
          {!q.published ? <span className="b-top">Not published yet</span> : null}
        </p>
        <h1 className="headline">{q.question}</h1>
        <div className="q-answer">
          <p className="q-answer-label">Our answer, as of {longDate(q.asOf)}</p>
          <p className="lede">{q.answer}</p>
        </div>
        <div className="b-source-link">
          <a className="key key-sm" href={challenge(q)}>Challenge this reading</a>
          <a className="key key-sm" href={mail(`Missing: ${q.question}`, 'What evidence or view is missing from this answer? Links help.\n\n')}>What is missing?</a>
          <a href="#revisions" className="small">What changed, and why</a>
        </div>
      </header>

      <Section id="established" title={<>What the evidence <em>establishes</em></>} blurb="Facts only, each with what it rests on. Open any source to check it.">
        <Claims q={q} list={q.established} kind="Evidence" />
      </Section>

      <Section id="limits" title={<>Where it <em>stops</em></>} blurb="What the evidence above does not show.">
        <Claims q={q} list={q.limits} />
      </Section>

      <Section id="disagree" title={<>Where informed people <em>disagree</em></>} blurb="Each view in our words, linked to where it was said, and what the disagreement turns on. Views are not evidence: the evidence is above.">
        <div className="q-disagree">
          {q.disagreements.map(d => (
            <div key={d.id} id={d.id} className="q-point">
              <h3>{d.point}</h3>
              <ul>
                {d.sides.map((s, i) => (
                  <li key={i}><p>{s.view}</p><div className="q-cites"><b>{s.who}</b>{s.cites.map((x, j) => <CiteLink key={j} c={x} />)}</div></li>
                ))}
              </ul>
              <p className="q-depends"><b>It depends on:</b> {d.dependsOn}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="changed" title={<>What <em>changed</em></>} blurb={`Since ${longDate(q.changed.since)}.`}>
        <Claims q={q} list={q.changed.items} />
      </Section>

      <Section id="unknown" title={<>What we <em>don’t know</em></>}>
        <Claims q={q} list={q.unknowns} />
      </Section>

      <Section id="would-change" title={<>What would <em>change</em> this answer</>} blurb="The evidence we are watching for, and which way it would move the answer.">
        <Claims q={q} list={q.wouldChange} kind="Forecast" />
      </Section>

      <Section id="values" title={<>Questions of <em>value</em></>} blurb="Evidence can’t settle these. They are yours to weigh; we only lay them out.">
        <Claims q={q} list={q.values} kind="Value" />
      </Section>

      <Section id="deeper" title={<>Go <em>deeper</em></>}>
        <ul className="q-deeper">
          {pages.map(p => <li key={p.page}><Link href={p.page}>{p.label}</Link></li>)}
          <li><Link href={`/#q-${q.id}`}>All {onTopic.length} entries in the Base on this question</Link></li>
        </ul>
      </Section>

      <Section id="revisions" title={<>Revisions</>} blurb="Every change to the answer, dated, with what changed and why.">
        <ol className="q-revisions">
          {[...q.revisions].reverse().map(r => <li key={r.version}><b>Version {r.version}</b><time>{longDate(r.date)}</time><p>{r.note}</p></li>)}
        </ol>
        <div className="q-loop">
          <h3>Your turn</h3>
          <p>Think a claim here is wrong, missing something, or out of date? Write to us with <b>Challenge this</b> beside it, or at <a href={challenge(q)}>{MAIL}</a>. We look into every challenge, then either revise the answer and say so here, with the reason, or keep it and reply to you with why.</p>
        </div>
      </Section>
    </div>
  );
}
