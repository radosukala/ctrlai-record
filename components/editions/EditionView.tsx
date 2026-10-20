import type { ReactNode } from 'react';
import Link from 'next/link';
import '@/components/editions/editions.css';
import { LensBar } from '@/components/editions/EditionControls';
import { PlayableQuote } from '@/components/editions/PlayableQuote';
import { currentTitle, isPerson, linkOnly, nameOf, onRecord } from '@/content/base';
import { comingUp, type Edition, type Pick } from '@/content/base/editions';
import { momentFor } from '@/content/base/moments';
import { CHANGE_LABEL, KIND_LABEL, TOPIC } from '@/content/base/taxonomy';
import type { Entry, LensId, Quote } from '@/content/base/types';
import { QUESTIONS, visible } from '@/content/questions';
import { GROUP_LABEL, groupAt } from '@/content/registry';
import type { Group } from '@/content/registry/types';
import { dateRange, longDate, shortDate } from '@/lib/site';

const fmt = (n: number) => n.toLocaleString('en-US');
const weekday = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
const mmss = (s: number) => {
  const t = Math.floor(s);
  return t >= 3600 ? `${Math.floor(t / 3600)}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
const views = (n?: number) => (!n ? null : n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M views` : n >= 1000 ? `${Math.round(n / 1000)}K views` : `${n} views`);
const ACCESS: Record<Entry['access'], string> = { full: 'read in full', partial: 'partly read', abstract: 'abstract only', excerpt: 'from the description only' };
const STATUS: Record<string, string> = { preprint: 'Preprint', 'peer-reviewed': 'Peer reviewed', 'working-paper': 'Working paper', report: 'Report', 'official-statistics': 'Official statistics', 'company-report': 'Company report' };
const LENS_LINES: { id: LensId; label: string }[] = [
  { id: 'public', label: 'What it means for you' },
  { id: 'policy', label: 'For lawmakers' },
  { id: 'research', label: 'For researchers' },
];
/** A group label that says something: unknown people get none rather than "Other". */
const groupLabel = (g?: Group) => (g && g !== 'other' ? GROUP_LABEL[g] : undefined);
const firstSentences = (text: string, n = 2) => (text.match(/[^.!?]+[.!?]+["”’)]*(\s|$)/g) ?? [text]).slice(0, n).join('').trim();

/** The words a horizon uses: "today", "this week", "in October". */
function words(ed: Edition) {
  if (ed.horizon === 'day') return { when: 'today', label: 'Today', minutes: 'about 5 minutes' };
  if (ed.horizon === 'week') return { when: 'this week', label: 'This week', minutes: 'about 10 minutes' };
  return { when: `in ${longDate(ed.from.slice(0, 7)).split(' ')[0]}`, label: 'This month', minutes: 'about 15 minutes' };
}

function SecHead({ id, title, note }: { id: string; title: ReactNode; note?: ReactNode }) {
  return (
    <header className="ed-sec-head">
      <h2 id={id}>{title}</h2>
      {note ? <p>{note}</p> : null}
    </header>
  );
}

/** One "why it matters" line per lens; the lens the reader picked is the one shown. */
function LensLines({ e }: { e: Entry }) {
  return (
    <>
      {LENS_LINES.map(l => {
        const text = e.lenses[l.id] ?? e.lenses.public;
        return text ? <p key={l.id} className={`ed-why ed-lens-${l.id}`}><span>{l.label}</span>{text}</p> : null;
      })}
    </>
  );
}

/** A checked quotation: their words in the serif, marked, then whose words, where and how the checker found them. */
function Quotation({ q, e, group }: { q: Quote; e: Entry; group?: Group }) {
  const title = isPerson(q.speaker) ? currentTitle(q.speaker) : undefined;
  const g = groupLabel(group ?? (isPerson(q.speaker) ? groupAt(q.speaker, q.said ?? e.published) : undefined));
  // A quotation with a moment can be played where it stands, from the source's own player.
  const moment = q.at != null && q.speakerCertain ? momentFor(q.id) : undefined;
  const youtube = moment ? `https://www.youtube.com/watch?v=${moment.v}&t=${Math.floor(q.at!)}s` : /youtube\.com\/watch|youtu\.be\//.test(e.url) && q.at != null ? `${e.url}${e.url.includes('?') ? '&' : '?'}t=${Math.floor(q.at)}s` : undefined;
  return (
    <figure className="ed-q">
      {moment ? <PlayableQuote id={q.id} text={q.text} moment={moment} title={e.title} who={nameOf(q.speaker)} at={q.at!} /> : <blockquote>“<span className="hl">{q.text}</span>”</blockquote>}
      {q.context ? <p className="ed-q-ctx">{q.context}</p> : null}
      <figcaption>
        <span className="ed-q-who">
          {isPerson(q.speaker) ? <Link href={`/people/${q.speaker}`}>{nameOf(q.speaker)}</Link> : nameOf(q.speaker)}
          {title ? <small>{title}</small> : null}
          {g ? <span className="ed-grp">{g}</span> : null}
        </span>
        <span className="ed-prov">
          {q.hand === 'reported' ? 'quoted second-hand · ' : ''}
          <Link href={`/base/${e.slug}#${q.id}`}>{e.outlet}, {shortDate(q.said ?? e.published)}</Link>
          {' · '}{q.match === 'exact' ? 'found word for word' : 'same words, other punctuation'}
          {q.second ? ' · two transcripts agree' : ''}
          {youtube ? <>{' · '}<a className="ed-moment" href={youtube}>▶ at {mmss(q.at!)}</a></> : null}
        </span>
      </figcaption>
    </figure>
  );
}

function Changes({ ed, id }: { ed: Edition; id: string }) {
  const w = words(ed);
  return (
    <section className="ed-sec ed-sec-changed" aria-labelledby={id}>
      <SecHead id={id} title={`What changed ${w.when}`} note="Decisions, new evidence, corrections and commitments we read in full, one per story. Arguments and recaps don’t count." />
      {ed.changes.length ? (
        <div className="ed-changes">
          {ed.changes.map(({ e, q }: Pick, i) => (
            <article key={e.slug} className={i === 0 ? 'ed-change ed-change-lead' : 'ed-change'}>
              <div className="ed-change-text">
                <p className="ed-meta"><b>{CHANGE_LABEL[e.change!.kind]}</b><span>{e.outlet}</span><time dateTime={e.published}>{shortDate(e.published)}</time></p>
                <h3 className="ed-change-title"><Link href={`/base/${e.slug}`}>{e.change!.note}</Link></h3>
                <p className="ed-src">{KIND_LABEL[e.kind]}: <Link href={`/base/${e.slug}`}>{e.title}</Link></p>
                <LensLines e={e} />
              </div>
              {q ? <div className="ed-change-quote"><Quotation q={q} e={e} /></div> : null}
            </article>
          ))}
        </div>
      ) : <p className="ed-empty">Nothing we read {w.when} was a decision, new evidence, a correction or a commitment. Everything is listed under “Everything else”.</p>}
    </section>
  );
}

function Heard({ ed, id }: { ed: Edition; id: string }) {
  if (!ed.heard.length) return null;
  return (
    <section className="ed-sec ed-sec-heard" aria-labelledby={id}>
      <SecHead id={id} title={`Heard ${words(ed).when}`} note="Press play to see and hear the person say it, from the source’s own player. Their words light up as they are spoken, and every one was found word for word in the source. Nothing loads from YouTube until you press play." />
      <div className="ed-heard">
        {ed.heard.map(({ e, q, group }) => (
          <div key={q.id} className="ed-said-card ed-heard-card">
            <p className="ed-said-grp">{groupLabel(group) ?? 'Group not yet recorded'}</p>
            <Quotation q={q} e={e} group={group} />
          </div>
        ))}
      </div>
      <p className="ed-note">The video’s captions give a time for each line, not each word, so a word can light a few tenths of a second early or late. The recording is the evidence; the highlight is a guide.</p>
    </section>
  );
}

function Said({ ed, id }: { ed: Edition; id: string }) {
  if (!ed.said.length) return null;
  const mix = new Map<string, number>();
  for (const s of ed.said) {
    const g = groupLabel(s.group);
    const key = g ? (g.startsWith('AI') ? g : g[0].toLowerCase() + g.slice(1)) : 'with no group recorded yet';
    mix.set(key, (mix.get(key) ?? 0) + 1);
  }
  const plural = (g: string, n: number) => (n === 1 || g.endsWith('staff') || g.endsWith('yet') ? g : g.startsWith('journalist') ? 'journalists or commentators' : `${g}s`);
  return (
    <section className="ed-sec ed-sec-said" aria-labelledby={id}>
      <SecHead id={id} title={`Said ${words(ed).when}`} note="One checked quotation per person, people with the power to act or first-hand knowledge first, at most two from any one group." />
      <p className="ed-mix">Who is quoted here: {[...mix].map(([g, n]) => `${n} ${plural(g, n)}`).join(', ')}.</p>
      <div className="ed-said">
        {ed.said.map(({ e, q, group }) => (
          <div key={q.id} className="ed-said-card">
            <p className="ed-said-grp">{groupLabel(group) ?? 'Group not yet recorded'}</p>
            <Quotation q={q} e={e} group={group} />
          </div>
        ))}
      </div>
    </section>
  );
}

function Watch({ ed, id }: { ed: Edition; id: string }) {
  return (
    <section className="ed-sec ed-sec-watch" aria-labelledby={id}>
      <SecHead id={id} title="Watch and listen" note="Interviews and talks we read in full, by what they add, then by reach. ▶ opens the video at the moment quoted." />
      <p className="ed-note">{ed.watchRead} of {ed.watchAll} videos and podcasts {ed.horizon === 'day' ? 'in this run' : words(ed).when} were read in full, from captions or a transcript. Only those are ranked here; the rest are under “Everything else”, from their descriptions.</p>
      {ed.watch.length ? (
        <div className="ed-watches">
          {ed.watch.map(({ e, q }) => (
            <article key={e.slug} className="ed-watch">
              <p className="ed-len">{e.minutes ? <>{e.minutes}<small>min</small></> : <small>—</small>}</p>
              <div className="ed-watch-body">
                <p className="ed-meta"><b>{KIND_LABEL[e.kind]}</b><span>{e.outlet}</span><time dateTime={e.published}>{shortDate(e.published)}</time>{views(e.views) ? <span>{views(e.views)}</span> : null}</p>
                <h3><a href={e.url}>{e.title}</a></h3>
                <p className="ed-watch-why">{e.change?.note ?? e.summary}</p>
                {q ? <Quotation q={q} e={e} /> : null}
                <p className="ed-more"><Link href={`/base/${e.slug}`}>The entry, with {e.quotes.length} checked {e.quotes.length === 1 ? 'quotation' : 'quotations'} <span aria-hidden="true">→</span></Link></p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Decided({ ed, id }: { ed: Edition; id: string }) {
  if (!ed.decided.length) return null;
  const all = ed.entries.filter(e => e.change && ['decision', 'commitment', 'correction'].includes(e.change.kind)).length;
  return (
    <section className="ed-sec ed-sec-decided" aria-labelledby={id}>
      <SecHead id={id} title="Decided and promised" note="What someone with the power to act did or committed to. A promise is not a deed: commitments are followed until they are kept or broken." />
      <ol className="ed-ledger">
        {ed.decided.map(e => (
          <li key={e.slug}>
            <time dateTime={e.published}>{shortDate(e.published)}</time>
            <span className="ed-ledger-kind">{CHANGE_LABEL[e.change!.kind]}</span>
            <Link className="ed-ledger-note" href={`/base/${e.slug}`}>{e.change!.note}</Link>
            <span className="ed-ledger-src">{e.outlet}</span>
          </li>
        ))}
      </ol>
      {all > ed.decided.length ? <p className="ed-note">And {all - ed.decided.length} more under “Everything else”.</p> : null}
    </section>
  );
}

function Research({ ed, id }: { ed: Edition; id: string }) {
  if (!ed.research.length) return null;
  return (
    <section className="ed-sec ed-sec-research" aria-labelledby={id}>
      <SecHead id={id} title="New research" note="Papers and reports, the ones we read in full first. The finding in our words, how it was reached, and what it cannot show." />
      <p className="ed-note">{ed.research.length} of {ed.researchAll} research items.</p>
      <div className="ed-papers">
        {ed.research.map(e => (
          <article key={e.slug} className="ed-paper">
            <p className="ed-meta"><b>{e.evidence ? STATUS[e.evidence.status] : KIND_LABEL[e.kind]}</b><span>{e.outlet}</span><time dateTime={e.published}>{shortDate(e.published)}</time><span>{ACCESS[e.access]}</span></p>
            <h3><Link href={`/base/${e.slug}`}>{e.title}</Link></h3>
            {e.evidence ? (
              <dl className="ed-ev">
                <div><dt>Found</dt><dd>{e.evidence.finding}</dd></div>
                <div><dt>How</dt><dd>{e.evidence.design}</dd></div>
                <div><dt>Limits</dt><dd>{e.evidence.limits}</dd></div>
              </dl>
            ) : <p className="ed-paper-sum">{e.summary}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function Threads({ ed, id }: { ed: Edition; id: string }) {
  if (!ed.threads.length) return null;
  return (
    <section className="ed-sec ed-sec-threads" aria-labelledby={id}>
      <SecHead id={id} title={ed.horizon === 'day' ? 'Stories that continued' : 'Stories that ran on'} note="Events several sources covered, read as one thread across days." />
      <div className="ed-threads">
        {ed.threads.map(t => (
          <article key={t.id} className="ed-thread">
            <h3>{t.title}</h3>
            <p className="ed-meta"><span>{t.first === t.last ? shortDate(t.first) : `${shortDate(t.first)} – ${shortDate(t.last)}`}</span><span>{t.entries.length} {t.entries.length === 1 ? 'entry' : 'entries'}</span></p>
            <ol>
              {t.entries.slice(0, 4).map(e => (
                <li key={e.slug}><time dateTime={e.published}>{shortDate(e.published)}</time><Link href={`/base/${e.slug}`}>{e.title}</Link><small>{e.outlet}</small></li>
              ))}
              {t.entries.length > 4 ? <li className="ed-thread-more">and {t.entries.length - 4} more</li> : null}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}

function Coming({ ed, id }: { ed: Edition; id: string }) {
  const dates = comingUp(ed.to);
  if (!dates.length) return null;
  const asks = [...new Map(dates.map(d => [d.brief.id, d.brief])).values()].flatMap(b => b.ask.slice(0, 3).map(a => ({ a, b })));
  return (
    <section className="ed-sec ed-sec-coming" aria-labelledby={id}>
      <SecHead id={id} title="Coming up" note="Dates when a decision can still change, from our decision briefs, and how to take part." />
      <ol className="ed-coming">
        {dates.map(d => (
          <li key={`${d.brief.id}-${d.date}`}>
            <p className="ed-cal"><b>{Number(d.date.slice(8, 10))}</b><span>{shortDate(d.date).split(' ')[0]}</span></p>
            <div>
              <p className="ed-meta"><span>{d.brief.jurisdiction}</span><time dateTime={d.date}>{longDate(d.date)}</time></p>
              <p className="ed-cal-what">{d.text}</p>
              <p><Link href={`/decisions/${d.brief.id}`}>{d.brief.title} <span aria-hidden="true">→</span></Link></p>
            </div>
          </li>
        ))}
      </ol>
      {asks.length ? (
        <div className="ed-ask ed-lens-policy">
          <h3>Questions you could put to a minister</h3>
          <ol>{asks.map(({ a }) => <li key={a}>{a}</li>)}</ol>
          <p className="ed-meta"><span>From the decision brief, in neutral words. We recommend no answer.</span></p>
        </div>
      ) : null}
    </section>
  );
}

function Answers({ ed, id }: { ed: Edition; id: string }) {
  const answered = QUESTIONS.filter(visible);
  if (!answered.length) return null;
  return (
    <section className="ed-sec ed-sec-answers" aria-labelledby={id}>
      <SecHead id={id} title="Where the answers stand" note={<>{answered.length} of the nine questions have an answer we keep up to date, with the reason for every change. <Link href="/questions">All nine questions <span aria-hidden="true">→</span></Link></>} />
      <div className="ed-answers">
        {answered.map(q => (
          <article key={q.id} className="ed-answer">
            <p className="ed-meta"><span>Answer, version {q.version}, as of {longDate(q.asOf)}</span>{q.asOf >= ed.from ? <b>Revised {ed.horizon === 'day' ? 'recently' : words(ed).when}</b> : null}</p>
            <h3><Link href={`/questions/${q.id}`}>{q.question}</Link></h3>
            <p>{firstSentences(q.answer)}</p>
            <p className="ed-more"><Link href={`/questions/${q.id}`}>The full answer: what is established, where it stops, who disagrees <span aria-hidden="true">→</span></Link></p>
          </article>
        ))}
      </div>
    </section>
  );
}

function OnRecord({ ed, id }: { ed: Edition; id: string }) {
  if (ed.horizon === 'day') return null;
  const rows = onRecord(ed.entries).map(r => ({ ...r, group: groupAt(r.person.id, r.latest) })).filter(r => r.group !== 'journalist').slice(0, 10);
  if (!rows.length) return null;
  const all = onRecord(ed.entries);
  const unknown = all.filter(r => groupAt(r.person.id, r.latest) === 'other').length;
  return (
    <section className="ed-sec ed-sec-onrecord" aria-labelledby={id}>
      <SecHead id={id} title="On the record" note={<>Who spoke or wrote most. Presence, not a verdict. <Link href="/people">Everyone <span aria-hidden="true">→</span></Link></>} />
      <div className="ed-tablewrap">
        <table className="ed-rec">
          <thead><tr><th>#</th><th>Person</th><th>Group, that day</th><th className="n">Entries</th><th className="n">Quotes</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.person.id}>
                <td className="n">{String(i + 1).padStart(2, '0')}</td>
                <td><Link href={`/people/${r.person.id}`}>{r.person.name}</Link>{currentTitle(r.person.id) ? <small>{currentTitle(r.person.id)}</small> : null}</td>
                <td>{groupLabel(r.group) ?? <span className="ed-faint">not yet recorded</span>}</td>
                <td className="n">{r.spoke}</td>
                <td className="n">{r.quotes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ed-note">Speakers, and authors of essays and papers; reporters writing the news are left out. {unknown} of {all.length} people here have no group yet, because our register of who people are has no record of them.</p>
    </section>
  );
}

function Rest({ ed }: { ed: Edition }) {
  const n = ed.rest.reduce((k, g) => k + g.entries.length, 0);
  if (!n) return null;
  return (
    <section className="ed-sec ed-sec-rest" aria-label="Everything else">
      <details className="ed-rest">
        <summary>Everything else {words(ed).when}: {fmt(n)} more {n === 1 ? 'entry' : 'entries'}, filed under the nine questions</summary>
        <div className="ed-rest-grid">
          {ed.rest.map(g => (
            <div key={g.topic} className="ed-rest-q">
              <h3>{TOPIC[g.topic].question}</h3>
              <ul>
                {g.entries.map(e => (
                  <li key={e.slug}><Link href={`/base/${e.slug}`}>{e.title}</Link><small>{e.outlet} · {shortDate(e.published)}{linkOnly(e) ? ' · from the description' : ''}</small></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="ed-more"><Link href="/base">Search and filter the week’s record <span aria-hidden="true">→</span></Link></p>
      </details>
    </section>
  );
}

function Made({ ed, id }: { ed: Edition; id: string }) {
  const n = ed.numbers;
  const r = ed.run;
  const cells: [string, string][] = r
    ? [[`${fmt(r.answered)} of ${fmt(r.sources)}`, 'sources answered'], [fmt(r.items), `items they published, ${dateRange(r.from, r.to)}`], [fmt(r.kept), 'kept by a wide keyword filter'], [fmt(n.entries), `became entries, ${fmt(n.read)} read in full`], [fmt(n.quotes), 'quotations found word for word in the saved text']]
    : [[fmt(n.entries), 'entries'], [fmt(n.read), 'read in full'], [fmt(n.quotes), 'quotations found word for word'], [fmt(n.outlets), 'outlets and channels'], [fmt(n.people), 'people who spoke or wrote']];
  return (
    <section className="ed-sec ed-sec-made" aria-labelledby={id}>
      <SecHead id={id} title="How this edition was made" note="So you can judge how far to trust it." />
      <ol className="ed-made">{cells.map(([a, b]) => <li key={b}><b>{a}</b><span>{b}</span></li>)}</ol>
      <details className="ed-rules">
        <summary>How this edition chooses</summary>
        <ul>
          <li><b>What changed:</b> entries whose change is a decision, new evidence, a correction or a commitment, that we read in full; most important first; one per story.</li>
          <li><b>Heard:</b> the same rule as Said, from the quotations we can play: the recording’s captions carry them. Any entry qualifies, the weights put the ones that matter first, and a person is quoted once on the page.</li>
          <li><b>Said:</b> one checked quotation per person from the entries that matter, people with the power to act or first-hand knowledge first, at most two from any one group.</li>
          <li><b>Watch and listen:</b> interviews and talks we read in full, by importance, then by views.</li>
          <li><b>Decided and promised:</b> decisions, corrections and commitments, decisions first.</li>
          <li><b>New research:</b> papers and reports, the ones we read in full first.</li>
          <li><b>The headline:</b> written for the edition when we can; otherwise the top change.</li>
        </ul>
        <p>Agents pick the items, write the summaries and the “why it matters” lines, and label what kind of change each one is. Code checks every quotation against the text we saved: the words must be there, in order, without a dropped “not”. That proves the words are in the source; it does not prove the person meant them as quoted. English sources only; X is not read yet.</p>
      </details>
    </section>
  );
}

/**
 * One edition of the Base: today (a Radar run), this week or this month, always in the same sections and order. The
 * reader's lens ("Read as") reorders the sections in CSS and picks the "why it matters" line, never the facts.
 */
export function EditionView({ ed, heading = 'h2', front = false, nav }: { ed: Edition; heading?: 'h1' | 'h2'; front?: boolean; nav?: ReactNode }) {
  const w = words(ed);
  const p = `ed-${ed.horizon}`;
  const Line = heading;
  const date = ed.horizon === 'day'
    ? `${front ? 'Today · ' : ''}${weekday(ed.run!.run)}, ${longDate(ed.run!.run)}`
    : ed.horizon === 'week' ? `${front ? 'This week · ' : ''}${dateRange(ed.from, ed.to)}` : `${front ? 'This month · ' : ''}${longDate(ed.from.slice(0, 7))}, through ${longDate(ed.to).replace(/, \d{4}$/, '')}`;
  const scope = ed.horizon === 'day'
    ? `Radar run of ${shortDate(ed.run!.run)}: ${fmt(ed.numbers.entries)} new entries, ${fmt(ed.numbers.read)} read in full, ${fmt(ed.numbers.quotes)} quotations checked`
    : `${fmt(ed.numbers.entries)} entries${ed.horizon === 'month' ? ' so far' : ''}, ${fmt(ed.numbers.read)} read in full, ${fmt(ed.numbers.quotes)} quotations checked`;
  return (
    <section className={`shell ed ed-${ed.horizon}`} aria-labelledby={`${p}-line`}>
      <header className="ed-head">
        <p className="dateline"><b>{date}</b><span>{scope}</span><span>{w.minutes}</span></p>
        <Line id={`${p}-line`} className="ed-line">{ed.line}</Line>
        <div className="ed-head-foot">
          <p className="ed-key" aria-label="How to read this page">
            <span className="ed-key-title">How to read this page</span>
            <span><b className="ed-k-serif">Serif</b> their words, as the source published them</span>
            <span><b className="ed-k-serif"><span className="hl">Marked</span></b> found word for word in the source</span>
            <span><b className="ed-k-sans">Sans</b> our words</span>
          </p>
          {nav ? <div className="ed-head-nav">{nav}</div> : null}
        </div>
        <LensBar />
      </header>
      <div className="ed-body">
        <Heard ed={ed} id={`${p}-heard`} />
        <Changes ed={ed} id={`${p}-changed`} />
        <Said ed={ed} id={`${p}-said`} />
        <Watch ed={ed} id={`${p}-watch`} />
        <Decided ed={ed} id={`${p}-decided`} />
        <Research ed={ed} id={`${p}-research`} />
        <Threads ed={ed} id={`${p}-threads`} />
        <Coming ed={ed} id={`${p}-coming`} />
        <Answers ed={ed} id={`${p}-answers`} />
        <OnRecord ed={ed} id={`${p}-onrecord`} />
        <Rest ed={ed} />
        <Made ed={ed} id={`${p}-made`} />
      </div>
    </section>
  );
}
