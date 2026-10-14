import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import '@/components/base/base.css';
import '@/components/questions/questions.css';
import { Section } from '@/components/Section';
import { getEntry } from '@/content/base';
import { TOPIC } from '@/content/base/taxonomy';
import { BRIEFS, getBrief, visible } from '@/content/decisions';
import { getQuestion } from '@/content/questions';
import type { Argument, DecisionBrief, Fact } from '@/content/decisions/types';
import type { Cite } from '@/content/questions/types';
import { longDate, shortDate } from '@/lib/site';

export const dynamicParams = false;
export function generateStaticParams() {
  return BRIEFS.filter(visible).map(b => ({ id: b.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const b = getBrief((await params).id);
  if (!b) return {};
  return {
    title: b.title, description: b.summary.slice(0, 200),
    ...(b.published ? {} : { robots: { index: false, follow: false } }),
    alternates: { canonical: `/decisions/${b.id}` },
  };
}

const MAIL = 'hello@ctrlai.com';
const challenge = (b: DecisionBrief, f?: { id: string; text: string }) => `mailto:${MAIL}?subject=${encodeURIComponent(`Challenge: ${b.title}${f ? ` [${f.id}]` : ''}`)}&body=${encodeURIComponent(`${f ? `About: “${f.text}”\n\n` : ''}What do you think is wrong, missing or out of date, and what is your evidence? Links help.\n\n`)}`;

function CiteLink({ c }: { c: Cite }) {
  if ('base' in c) {
    const e = getEntry(c.base);
    return e ? <Link href={`/base/${e.slug}`}>{e.outlet}, {shortDate(e.published)}</Link> : <span>{c.base}</span>;
  }
  if ('page' in c) return <Link href={c.page}>{c.label}</Link>;
  return <a href={c.url}>{c.label}</a>;
}

function Facts({ b, list, kind }: { b: DecisionBrief; list: Fact[]; kind?: (f: Fact) => string | undefined }) {
  return (
    <ol className="q-claims">
      {list.map(f => (
        <li key={f.id} id={f.id}>
          {kind?.(f) ? <span className="q-kind">{kind(f)}</span> : null}
          <p>{f.text}</p>
          <div className="q-cites">
            {f.cites.map((x, i) => <CiteLink key={i} c={x} />)}
            <a className="q-challenge" href={challenge(b, f)}>Challenge this</a>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Args({ title, list }: { title: string; list: Argument[] }) {
  if (!list.length) return null;
  return (
    <div>
      <h4 className="q-kind">{title}</h4>
      <ul>
        {list.map((a, i) => <li key={i}><p>{a.text}</p><div className="q-cites"><b>{a.who}</b>{a.cites.map((x, j) => <CiteLink key={j} c={x} />)}</div></li>)}
      </ul>
    </div>
  );
}

export default async function DecisionPage({ params }: { params: Promise<{ id: string }> }) {
  const b = getBrief((await params).id);
  if (!b) notFound();
  return (
    <div className="shell page b-page q-page">
      <header className="b-entry-head">
        <p className="dateline">
          <Link href="/"><b>The Base</b></Link>
          <span>A decision, laid out</span>
          <span>{b.jurisdiction}</span>
          <span>Version {b.version}</span>
          <time dateTime={b.asOf}>As of {longDate(b.asOf)}</time>
          {!b.published ? <span className="b-top">Not published yet</span> : null}
        </p>
        <h1 className="headline">{b.title}</h1>
        <div className="q-answer">
          <p className="q-answer-label">What is being decided</p>
          <p className="lede">{b.summary}</p>
        </div>
        <div className="b-source-link">
          <a className="key key-sm" href={challenge(b)}>Challenge this brief</a>
          {b.questions.map(q => getQuestion(q) ? <Link key={q} href={`/questions/${q}`} className="small">{TOPIC[q].question}</Link> : <span key={q} className="small muted">{TOPIC[q].question}</span>)}
        </div>
      </header>

      <Section id="who" title={<>Who <em>decides</em></>} blurb="Who has the power, and who can influence it.">
        <Facts b={b} list={b.who} />
      </Section>

      <Section id="status" title={<>Where it <em>stands</em></>}>
        <Facts b={b} list={b.status} />
      </Section>

      <Section id="options" title={<>The <em>options</em></>} blurb="What is on the table, and the case for and against each, attributed to whoever made it. We recommend nothing.">
        <div className="q-disagree">
          {b.options.map(o => (
            <div key={o.id} id={o.id} className="q-point">
              <h3>{o.name}</h3>
              <p className="q-scope">{o.what}</p>
              <Args title="For" list={o.for} />
              <Args title="Against" list={o.against} />
            </div>
          ))}
        </div>
      </Section>

      <Section id="evidence" title={<>What the evidence <em>says</em></>}>
        <Facts b={b} list={b.evidence} />
      </Section>

      <Section id="open" title={<>Open <em>questions</em></>}>
        <Facts b={b} list={b.openQuestions} />
      </Section>

      <Section id="take-part" title={<>Dates and how to <em>take part</em></>} blurb="Only dates and routes we could verify on an official page.">
        {b.deadlines.length ? <Facts b={b} list={b.deadlines} kind={f => longDate((f as Fact & { date: string }).date)} /> : <p className="small muted">No deadline has been announced.</p>}
        {b.participate.length ? <Facts b={b} list={b.participate} kind={f => (f as Fact & { until?: string }).until ? `Open until ${longDate((f as Fact & { until?: string }).until!)}` : 'Open now'} /> : <p className="small muted">No consultation or call for evidence is open. Writing to your representative is always open.</p>}
        {b.ask.length ? (
          <div className="q-loop">
            <h3>Questions you could ask your representative</h3>
            <ul>{b.ask.map((a, i) => <li key={i}><p>{a}</p></li>)}</ul>
          </div>
        ) : null}
      </Section>

      {b.outcome ? (
        <Section id="outcome" title={<>What was <em>decided</em></>}>
          <div className="q-answer"><p className="lede">{b.outcome.decided}</p><div className="q-cites">{longDate(b.outcome.on)} {b.outcome.cites.map((x, i) => <CiteLink key={i} c={x} />)}</div></div>
          <Facts b={b} list={b.outcome.afterwards} />
        </Section>
      ) : null}

      <Section id="revisions" title={<>Revisions</>} blurb="Every change, dated, with what changed and why.">
        <ol className="q-revisions">
          {[...b.revisions].reverse().map(r => <li key={r.version}><b>Version {r.version}</b><time>{longDate(r.date)}</time><p>{r.note}</p></li>)}
        </ol>
      </Section>
    </div>
  );
}
