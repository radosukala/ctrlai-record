import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import '@/components/base/base.css';
import { Section } from '@/components/Section';
import { PEOPLE, entriesFor, getPerson, positionsOf, quotesBy } from '@/content/base';
import { KIND_LABEL, PROPOSITION, STANCE_LABEL } from '@/content/base/taxonomy';
import type { PropositionId } from '@/content/base/types';
import { longDate, shortDate } from '@/lib/site';

export const dynamicParams = false;
export function generateStaticParams() {
  return PEOPLE.map(p => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = getPerson((await params).id);
  if (!p) return {};
  return { title: `${p.name} on AI`, description: `What ${p.name} said about AI safety and control, with each quotation checked against its source.` };
}

const ROLE: Record<string, string> = { speaker: 'Speaks', author: 'Wrote it', subject: 'About them', mentioned: 'Mentioned' };

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const p = getPerson((await params).id);
  if (!p) notFound();
  const entries = entriesFor(p.id);
  const quotes = quotesBy(p.id).sort((a, b) => b.entry.published.localeCompare(a.entry.published));
  const positions = positionsOf(p.id);

  return (
    <div className="shell page b-page">
      <header className="b-hero">
        <p className="dateline"><Link href="/base"><b>The Base</b></Link><Link href="/people">People</Link></p>
        <h1 className="headline">{p.name}</h1>
        {p.titles.length ? <p className="lede">{p.titles.map(t => t.title).filter((t, i, a) => a.indexOf(t) === i).join(' · ')}</p> : null}
        <p className="small muted">Titles as the sources gave them. In {entries.length} {entries.length === 1 ? 'entry' : 'entries'}, with {quotes.length} checked {quotes.length === 1 ? 'quotation' : 'quotations'}.</p>
      </header>

      {quotes.length ? (
        <Section id="said" title={<>What they <em>said</em></>} blurb="Newest first. Each quotation was found word for word in the source.">
          <div className="b-quotes">
            {quotes.map(q => (
              <figure key={q.id} className="b-quote">
                <blockquote>“<span className="hl">{q.text}</span>”</blockquote>
                <figcaption>
                  <span><Link href={`/base/${q.entry.slug}#${q.id}`}>{q.entry.title}</Link></span>
                  <span className="muted">{q.entry.outlet}, {longDate(q.entry.published)}{q.context ? `. ${q.context}` : ''}</span>
                </figcaption>
                {!q.speakerCertain ? <div className="b-check"><span className="b-warn">Speaker known from context, not confirmed by listening</span></div> : null}
              </figure>
            ))}
          </div>
        </Section>
      ) : null}

      {positions.size ? (
        <Section id="positions" title={<>Where they <em>stand</em></>} blurb="Where each quotation above stands, as a person confirmed it, one line per statement. As weeks accumulate, this is where a change of view shows up, with both quotations side by side." rail={<p className="sec-note">A label describes one quotation, never the person.</p>}>
          <div className="b-positions">
            {[...positions.entries()].map(([prop, list]) => (
              <div key={prop} className="b-position">
                <h3>{PROPOSITION[prop as PropositionId].text}</h3>
                <span className="b-stance">{STANCE_LABEL[list[list.length - 1].stance]}<small>latest, confirmed</small></span>
                <ol>
                  {list.map((s, i) => (
                    <li key={i}><time>{shortDate(s.on)}</time><span>{STANCE_LABEL[s.stance]}: “{s.quote.length > 160 ? `${s.quote.slice(0, 157)}…` : s.quote}”</span></li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <Section id="entries" title={<>In the Base</>} blurb="Every entry they appear in.">
        <ol className="b-list">
          {entries.map(e => {
            const role = e.people.find(x => x.id === p.id)?.role ?? 'mentioned';
            return (
              <li key={e.slug} className="b-row">
                <time dateTime={e.published}>{shortDate(e.published)}</time>
                <div className="b-row-main">
                  <div className="b-meta"><span className="b-kind">{KIND_LABEL[e.kind]}</span><span>{e.outlet}</span><span>{ROLE[role]}</span></div>
                  <h3><Link href={`/base/${e.slug}`}>{e.title}</Link></h3>
                  <p>{e.summary}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>
    </div>
  );
}
