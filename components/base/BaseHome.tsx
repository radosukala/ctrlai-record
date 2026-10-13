import type { ReactNode } from 'react';
import Link from 'next/link';
import '@/components/base/base.css';
import { BaseBrowser, type Row } from '@/components/base/BaseBrowser';
import { ENTRIES, LATEST_DAY, LATEST_RUN, RUNS, WEEK, WEEK_FROM, nameOf, onRecord, currentTitle, isPerson } from '@/content/base';
import { KIND_LABEL, LENS_HEADING, TOPIC, TOPICS } from '@/content/base/taxonomy';
import type { Entry, LensId, Quote } from '@/content/base/types';
import { LATEST } from '@/content/issues';
import { SITE, dateRange } from '@/lib/site';

const fmt = (n: number) => n.toLocaleString('en-US');
const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const dm = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const newest = (a: Entry, b: Entry) => b.published.localeCompare(a.published) || b.importance - a.importance;
const pad = (n: number) => String(n).padStart(2, '0');

/** A quotation we can put on the front: the checker found it, and the speaker is certain. */
const usable = (q: Quote) => q.speakerCertain && !q.warnings?.length && q.text.length >= 50 && q.text.length <= 240;

/** Where the person stands, as the source gave it: "Brad Smith, President, Microsoft". */
const who = (id: string) => (isPerson(id) && currentTitle(id) ? currentTitle(id) : undefined);

/** One line of provenance under a quotation: whose words, where, when, and how the checker matched them. */
function QuoteFoot({ q, e }: { q: Quote; e: Entry }) {
  return (
    <figcaption className="f-qfoot">
      <span className="f-qwho">{isPerson(q.speaker) ? <Link href={`/people/${q.speaker}`}>{nameOf(q.speaker)}</Link> : nameOf(q.speaker)}{who(q.speaker) ? <small>{who(q.speaker)}</small> : null}</span>
      <span className="f-prov"><Link href={`/base/${e.slug}#${q.id}`}>{e.outlet}, {dm(e.published)}</Link> · <span className="f-found">{q.match === 'exact' ? 'found in the source, exact' : 'found in the source, same words'}</span></span>
    </figcaption>
  );
}

/** A front-page section head: a heavy rule, our title, and a note or link on the right. */
function Head({ id, title, note }: { id: string; title: ReactNode; note?: ReactNode }) {
  return (
    <header className="f-head">
      <h2 id={id}>{title}</h2>
      {note ? <div className="f-head-note">{note}</div> : null}
    </header>
  );
}

/**
 * The Base as the front page. Built like a front page, not a landing page: the week in one line, the lead story with
 * the quotation that carries it, the other top stories, what was said (each quotation checked), the nine questions
 * the record is organized around, then the week's record, who is on it, and how the latest run was made.
 *
 * The Radar adds a run every day, so the page reads the last seven days of the Base (WEEK), never all of it. Older
 * entries keep their permalinks at /base/<slug> and stay on the person pages.
 */
export function BaseHome({ film }: { film?: ReactNode }) {
  const run = LATEST_RUN;
  // The latest run on its own, so every number in its funnel counts the same thing.
  const ran = run ? ENTRIES.filter(e => e.run === run.run) : [];
  // A run can be re-read later, so "updated" is the newest read of any run, not the last run's date.
  const updated = RUNS.reduce((d, r) => (r.ranAt > d ? r.ranAt : d), '').slice(0, 10);
  const weekQuotes = WEEK.reduce((n, e) => n + e.quotes.length, 0);
  const rows: Row[] = WEEK.map(e => ({
    slug: e.slug, kind: e.kind, title: e.title, outlet: e.outlet, published: e.published, summary: e.summary,
    lenses: e.lenses, topics: e.topics, people: e.people.filter(p => p.role !== 'mentioned').map(p => ({ id: p.id, name: nameOf(p.id) })),
    quotes: e.quotes.length, importance: e.importance, access: e.access,
    ...(e.quotes[0] ? { firstQuote: { text: e.quotes[0].text, by: `${nameOf(e.quotes[0].speaker)}, ${e.outlet}, ${day(e.published)}` } } : {}),
  }));

  // The lead: the newest top story that carries a checked quotation from a named speaker.
  const top = WEEK.filter(e => e.importance === 3).sort(newest);
  const lead = top.find(e => e.quotes.some(usable)) ?? top[0];
  const leadQuote = lead?.quotes.find(usable);
  const rest = top.filter(e => e !== lead);

  // Said this week: one checked quotation per person, from the most important entries first, newest first.
  const seen = new Set<string>(leadQuote ? [leadQuote.speaker] : []);
  const said: { q: Quote; e: Entry }[] = [];
  for (const e of [...WEEK].sort((a, b) => b.importance - a.importance || newest(a, b))) {
    if (e.importance < 2) continue;
    const q = e.quotes.find(x => usable(x) && !seen.has(x.speaker) && isPerson(x.speaker));
    if (!q) continue;
    seen.add(q.speaker);
    said.push({ q, e });
    if (said.length === 4) break;
  }

  // Each question shows its two most important entries, without repeating one another's where it can.
  const shown = new Set<string>();
  const questions = TOPICS.map((tp, i) => {
    const list = WEEK.filter(e => e.topics.includes(tp.id)).sort((a, b) => b.importance - a.importance || newest(a, b));
    const fresh = list.filter(e => !shown.has(e.slug));
    const latest = [...fresh, ...list.filter(e => shown.has(e.slug))].slice(0, 2);
    latest.forEach(e => shown.add(e.slug));
    return { ...tp, n: i + 1, count: list.length, latest };
  }).filter(q => q.count);
  const leadLenses = lead ? (['policy', 'research', 'ideas'] as LensId[]).filter(l => lead.lenses[l]) : [];
  const people = onRecord(WEEK).slice(0, 12);

  return (
    <>
    <div className="shell f-page">
      <section className="f-mast" aria-labelledby="week-line">
        <p className="dateline">
          <b>The Base</b>
          {WEEK_FROM ? <span>{dateRange(WEEK_FROM, LATEST_DAY)}</span> : null}
          {updated ? <span>updated {day(updated)}</span> : null}
          <span>{fmt(WEEK.length)} entries · {fmt(weekQuotes)} quotations checked</span>
        </p>
        <h1 id="week-line" className="f-week">{LATEST.summary}</h1>
        <div className="f-mast-foot">
          <p className="f-week-from"><Link href="/week">The week in one line, from issue {LATEST.number} ({dateRange(LATEST.from, LATEST.to)}) <span aria-hidden="true">→</span></Link></p>
          <p className="f-key" aria-label="How to read this page">
            <span className="f-key-title">How to read this page</span>
            <span><b className="f-l-serif">Serif</b> their words, as the source published them</span>
            <span><b className="f-l-serif"><span className="hl">Marked</span></b> found word for word in the source</span>
            <span><b className="f-l-sans">Sans</b> our words</span>
          </p>
        </div>
      </section>

      <section className="f-front" aria-label="The week’s top stories">
        {lead ? (
          <article className="f-lead">
            <p className="f-meta"><span className="f-kind">{KIND_LABEL[lead.kind]}</span><span>{lead.outlet}</span><time dateTime={lead.published}>{day(lead.published)}</time></p>
            <h2 className="f-lead-title"><Link href={`/base/${lead.slug}`}>{lead.title}</Link></h2>
            <p className="f-lead-dek">{lead.lenses.public ?? lead.summary}</p>
            {leadQuote ? (
              <figure className="f-lead-quote">
                <blockquote><span className="f-qmark" aria-hidden="true">“</span><span className="hl">{leadQuote.text}</span><span aria-hidden="true">”</span></blockquote>
                <QuoteFoot q={leadQuote} e={lead} />
              </figure>
            ) : null}
            {leadLenses.length ? (
              <dl className="f-lenses" aria-label="Why it matters">
                {leadLenses.map(l => <div key={l}><dt>{LENS_HEADING[l]}</dt><dd>{lead.lenses[l]}</dd></div>)}
              </dl>
            ) : null}
            <p className="f-lead-more"><Link href={`/base/${lead.slug}`}>The whole entry, with {lead.quotes.length} {lead.quotes.length === 1 ? 'quotation' : 'quotations'} checked <span aria-hidden="true">→</span></Link></p>
          </article>
        ) : null}

        <div className="f-top">
          <h2 className="f-col-title">Also at the top</h2>
          <ol>
            {rest.map((e, i) => (
              <li key={e.slug}>
                <span className="f-num">{pad(i + 2)}</span>
                <div>
                  <h3><Link href={`/base/${e.slug}`}>{e.title}</Link></h3>
                  <p className="f-meta"><span className="f-kind">{KIND_LABEL[e.kind]}</span><span>{e.outlet}</span><time dateTime={e.published}>{dm(e.published)}</time>{e.quotes.length ? <span className="f-n">{e.quotes.length} checked</span> : null}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {said.length ? (
          <div className="f-said">
            <h2 className="f-col-title">Said this week</h2>
            {said.map(({ q, e }) => (
              <figure key={q.id} className="f-said-q">
                <blockquote>“<span className="hl">{q.text}</span>”</blockquote>
                <QuoteFoot q={q} e={e} />
              </figure>
            ))}
          </div>
        ) : null}
      </section>

      <section className="f-sec" aria-labelledby="questions">
        <Head id="questions" title="Nine questions" note={<>The record is filed under the questions it bears on. Pick one to read everything on it.</>} />
        <ol className="f-qs">
          {questions.map(q => (
            <li key={q.id} className="f-q">
              <p className="f-q-n"><span>Q{q.n}</span><span>{q.count} {q.count === 1 ? 'entry' : 'entries'}</span></p>
              <h3><a href={`#q-${q.id}`}>{q.question}</a></h3>
              <ul>
                {q.latest.map(e => <li key={e.slug}><Link href={`/base/${e.slug}`}>{e.title}</Link></li>)}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </div>

    {film}

    <div className="shell f-page f-page-rest">
      <section className="f-sec" id="record" aria-labelledby="record-title">
        <Head id="record-title" title="The record" note={<>Every entry this week. Pick who you are reading as: the same record, ordered by what that reader needs first.</>} />
        <BaseBrowser rows={rows} />
      </section>

      <section className="f-sec" aria-labelledby="on-record">
        <Head id="on-record" title="On the record" note={<>Who spoke or wrote in the sources this week, by how often. Presence, not a verdict. <Link href="/people">Everyone →</Link></>} />
        <table className="b-people">
          <thead><tr><th className="b-rank">#</th><th>Person</th><th className="hide-sm">Questions</th><th className="n">Entries</th><th className="n">Quotes</th></tr></thead>
          <tbody>
            {people.map((r, i) => (
              <tr key={r.person.id}>
                <td className="b-rank">{pad(i + 1)}</td>
                <td><Link href={`/people/${r.person.id}`}>{r.person.name}</Link>{currentTitle(r.person.id) ? <small>{currentTitle(r.person.id)}</small> : null}</td>
                <td className="hide-sm"><small>{r.topics.slice(0, 3).map(id => TOPIC[id].label).join(' · ')}</small></td>
                <td className="n">{r.spoke}</td>
                <td className="n">{r.quotes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {run ? (
        <section className="f-sec" aria-labelledby="how">
          <Head id="how" title="How this was made" note="So you can judge how far to trust it." />
          <p className="f-funnel-title">The latest run, {day(run.ranAt.slice(0, 10))}</p>
          <ol className="f-funnel" aria-label="The latest run, step by step">
            <li><b>{fmt(run.answered)}</b><span>of the {fmt(run.sources)} sources in <a href={`${SITE.repoUrl}/blob/main/radar/sources.json`}>the public list</a> answered</span></li>
            <li><b>{fmt(run.items)}</b><span>items they published, {dateRange(run.from, run.to)}</span></li>
            <li><b>{fmt(run.kept)}</b><span>kept by a wide keyword filter</span></li>
            <li><b>{fmt(ran.length)}</b><span>picked for an entry by Claude, {fmt(ran.filter(e => e.access !== 'excerpt').length)} read in full</span></li>
            <li><b>{fmt(ran.reduce((n, e) => n + e.quotes.length, 0))}</b><span>quotations found word for word in the saved text</span></li>
          </ol>
          <div className="prose f-how">
            <p>Claude picked the items worth an entry by their title and description. The most important were read in full, with captions for videos; the rest are written from the publisher’s own description, and marked as such. Agents wrote the summaries and the four “why it matters” lines. Code then checked every quotation against the text we saved: the words must be there, in order, without a dropped “not”. That proves the words are in the source. It does not prove the person meant them as quoted, and automatic captions carry no speaker names, so a quotation whose speaker we could only tell from context says so.</p>
            <p><strong>What we keep.</strong> The full text of every source we read is kept privately, so later research can go back to exactly what was said. Here we publish only short quotations and our own words.</p>
            <p><strong>What this run misses.</strong> English sources only. Some feeds only reach back a few days (big news channels, the Guardian, LessWrong), and the research feed stops at 300 papers, so this week’s list is not complete. X is not read yet. Paywalled articles were read through other coverage or left as descriptions.</p>
          </div>
        </section>
      ) : null}
    </div>
    </>
  );
}
