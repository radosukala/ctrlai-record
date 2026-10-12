import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import '@/components/base/base.css';
import { Section } from '@/components/Section';
import { ENTRIES, currentTitle, getEntry, isPerson, nameOf } from '@/content/base';
import { KIND_LABEL, LENS_HEADING, TOPIC } from '@/content/base/taxonomy';
import type { Entry, LensId } from '@/content/base/types';
import { SITE, longDate } from '@/lib/site';

export const dynamicParams = false;
export function generateStaticParams() {
  return ENTRIES.map(e => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = getEntry((await params).slug);
  if (!e) return {};
  return { title: e.title, description: e.summary, robots: { index: false, follow: false }, alternates: { canonical: `/base/${e.slug}` } };
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const jump = (url: string, at: number) => {
  try { const u = new URL(url); if (/youtube\.com$/.test(u.hostname.replace(/^www\./, '')) || u.hostname === 'youtu.be') { u.searchParams.set('t', `${at}s`); return u.toString(); } } catch { /* not a URL */ }
  return undefined;
};
const ACCESS: Record<string, string> = {
  full: 'We read the whole source.',
  partial: 'We could read only part of the source.',
  abstract: 'We read the abstract.',
  excerpt: 'We have read only the description the publisher gives. No quotations until someone reads the source itself.',
};
/** Where the quoted words come from, by the kind of text we checked them against. */
const WORDS_FROM: Record<Entry['transcript'], string> = {
  auto: 'From YouTube’s automatic captions, which carry no speaker names and can mishear words. Where the speaker is known only from context, the quotation says so.',
  official: 'From the captions uploaded with the video.',
  stt: 'From our own transcript of the episode’s audio, made by machine. Speaker names come from what is said, not from a voice match.',
  none: 'From the source’s own text.',
};
const ROLE: Record<string, string> = { speaker: 'Speaks', author: 'Wrote it', subject: 'About them', mentioned: 'Mentioned' };

export default async function EntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const e = getEntry((await params).slug);
  if (!e) notFound();
  const lenses = (['public', 'policy', 'research', 'ideas'] as LensId[]).filter(l => e.lenses[l]);
  const cite = `${e.outlet}, “${e.title}”, ${longDate(e.published)}. Entry in the Ctrl AI Base, ${SITE.url}/base/${e.slug}`;

  return (
    <div className="shell page b-page">
      <header className="b-entry-head">
        <p className="dateline">
          <Link href="/base"><b>The Base</b></Link>
          <span>{KIND_LABEL[e.kind]}</span>
          <span>{e.outlet}</span>
          <time dateTime={e.published}>{longDate(e.published)}</time>
          {e.minutes ? <span>{e.minutes} min</span> : null}
          {e.views ? <span>{e.views.toLocaleString('en-US')} views</span> : null}
        </p>
        <h1 className="headline">{e.title}</h1>
        <p className="lede">{e.summary}</p>
        <div className="b-source-link">
          <a className="key key-sm" href={e.url}>Open the source ↗</a>
          {e.importance === 3 ? <span className="b-top">Top story of the week</span> : null}
        </div>
        {e.conflict ? (
          <div className="b-draft" role="note"><b>About Anthropic or Claude</b><span>Claude, made by Anthropic, wrote this entry. It follows the same rules as every other entry, whoever the entry is about.</span></div>
        ) : null}
      </header>

      {lenses.length ? (
        <Section id="why" title={<>Why it <em>matters</em></>} blurb="The same thing, for different readers.">
          <div className="b-lensgrid">
            {lenses.map(l => <div key={l}><h3>{LENS_HEADING[l]}</h3><p>{e.lenses[l]}</p></div>)}
          </div>
        </Section>
      ) : null}

      {e.quotes.length ? (
        <Section id="words" title={<>In their <em>own words</em></>} blurb="Every quotation was found, word for word, in the text we saved from the source." rail={<p className="sec-note">{WORDS_FROM[e.transcript]}</p>}>
          <div className="b-quotes">
            {e.quotes.map(q => {
              const link = q.at !== undefined ? jump(e.url, q.at) : undefined;
              return (
                <figure key={q.id} className="b-quote" id={q.id}>
                  <blockquote>“<span className="hl">{q.text}</span>”</blockquote>
                  <figcaption>
                    <span>{isPerson(q.speaker) ? <Link href={`/people/${q.speaker}`}>{nameOf(q.speaker)}</Link> : <b>{nameOf(q.speaker)}</b>}{isPerson(q.speaker) && currentTitle(q.speaker) ? `, ${currentTitle(q.speaker)}` : ''}</span>
                    {q.context ? <span className="muted">{q.context}</span> : null}
                  </figcaption>
                  <div className="b-check">
                    <span className="b-checked">{q.match === 'exact' ? 'Matches the source exactly' : 'Same words as the source; punctuation differs'}</span>
                    {link ? <a className="b-at" href={link}>Hear it at {clock(q.at!)} ↗</a> : null}
                    {q.second ? <span className="b-checked">Also in a second, independent transcript</span> : null}
                    {!q.speakerCertain ? <span className="b-warn">Speaker known from context, not confirmed by listening</span> : null}
                    {q.warnings?.map(w => <span key={w} className="b-warn">{w}</span>)}
                  </div>
                </figure>
              );
            })}
          </div>
        </Section>
      ) : null}

      <Section id="record" title={<>The record</>}>
        <dl className="b-facts">
          <dt>Questions</dt>
          <dd>{e.topics.map(t => TOPIC[t].question).join(' · ')}</dd>
          {e.people.length ? (<><dt>People</dt><dd>{e.people.map((p, i) => <span key={p.id}>{i ? ' · ' : ''}<Link href={`/people/${p.id}`}>{nameOf(p.id)}</Link> <span className="muted">({ROLE[p.role]}{p.title ? `, ${p.title}` : ''})</span></span>)}</dd></>) : null}
          {e.also.length ? (<><dt>Also covered by</dt><dd>{e.also.map((a, i) => <span key={a.url}>{i ? ' · ' : ''}<a href={a.url}>{a.outlet}</a></span>)}</dd></>) : null}
          <dt>What we read</dt>
          <dd>{ACCESS[e.access]}</dd>
          <dt>Found by</dt>
          <dd>The Radar, run of {longDate(e.run)}, via <code>{e.via.source}</code> (tier {e.via.tier}: {e.via.tier === 1 ? 'the source’s own channel or an official record' : e.via.tier === 2 ? 'a major outlet’s own reporting' : 'discovery only'})</dd>
          <dt>Cite this</dt>
          <dd><div className="b-cite">{cite}</div></dd>
        </dl>
        {e.notes ? <div className="b-editor" style={{ marginTop: 24 }}><b>Our notes</b><span>{e.notes}</span></div> : null}
      </Section>
    </div>
  );
}
