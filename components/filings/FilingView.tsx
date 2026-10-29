import Link from 'next/link';
import '@/components/filings/filings.css';
import { currentTitle, isPerson, nameOf } from '@/content/base';
import { VERIFICATION, entryOf, passageOf, quoteOf, type PressCheck } from '@/content/filings';
import type { Filing } from '@/content/filings/types';
import type { Company } from '@/content/money';
import { COMMITTED, money } from '@/lib/filings';
import { rowOf } from '@/lib/money';
import { longDate, shortDate } from '@/lib/site';

function FilingWords({ f, id }: { f: Filing; id: string }) {
  const p = passageOf(f, id);
  const check = VERIFICATION.filings[f.slug]?.passages[id];
  return (
    <figure className="fi-q">
      <blockquote>“<span className="hl">{p.text}</span>”</blockquote>
      <figcaption>
        <a href={f.url}>{f.form}, page {check?.page ?? '?'}</a>
        {check?.ok ? ' · found word for word in the filing' : ' · not checked'}
      </figcaption>
    </figure>
  );
}

function PublicWords({ f, id }: { f: Filing; id: string }) {
  const p = passageOf(f, id);
  const s = f.sources[p.source];
  const check = VERIFICATION.filings[f.slug]?.passages[id];
  return (
    <figure className="fi-q">
      <blockquote>“<span className="hl">{p.text}</span>”</blockquote>
      <figcaption>
        {f.company}, <a href={s.url}>{s.title}</a>, {longDate(s.date)}
        {check?.ok ? ' · found word for word on the page' : ' · not checked'}
      </figcaption>
    </figure>
  );
}

/** A quotation already in the Base, with who said it and where we found it. */
function BaseWords({ id }: { id: string }) {
  const found = quoteOf(id);
  if (!found) return null;
  const { e, q } = found;
  const who = isPerson(q.speaker) ? nameOf(q.speaker) : undefined;
  const title = isPerson(q.speaker) ? currentTitle(q.speaker) : undefined;
  return (
    <figure className="fi-q">
      <blockquote>“<span className="hl">{q.text}</span>”</blockquote>
      <figcaption>
        {who ? <>{isPerson(q.speaker) ? <Link href={`/people/${q.speaker}`}>{who}</Link> : who}{title ? `, ${title}` : ''} · </> : null}
        {q.hand === 'reported' ? 'as quoted by ' : ''}<Link href={`/base/${e.slug}#${q.id}`}>{e.outlet}</Link>{who ? '' : <>, “{e.title}”</>}, {longDate(q.said ?? e.published)}
        {' · found word for word in that source'}
      </figcaption>
    </figure>
  );
}

const PRESS: Record<PressCheck['mode'], string> = {
  exact: 'Found word for word in the filing',
  words: 'The same words are in the filing, with other punctuation or capitals',
  spelling: 'The same words are in the filing, spelled differently',
  none: 'Not found in the filing’s text, or in the two exhibits we read. It may be in an image in the filing, or in another document.',
};

export function FilingView({ company, f }: { company: Company; f: Filing }) {
  const v = VERIFICATION.filings[f.slug];
  const [revenue, opLoss, fairValue, netLoss, cash] = ['revenue', 'operating-loss', 'fair-value', 'net-loss', 'operating-cash'].map(k => rowOf(f, k));
  const last = f.money.table.columns.length - 1;
  // The three agreements' minimums, as the passages below state them: Microsoft, Google, Amazon (a test checks they are there).
  const commitments = COMMITTED.reduce((a, b) => a + b, 0);
  return (
    <article className="shell fi">
      <header className="fi-head">
        <p className="dateline"><b><Link href="/money">The money</Link> · <Link href={`/money/${company.slug}`}>{company.name}</Link> · {f.form}</b><span>filed with the SEC on {longDate(f.filed)}</span><span>{f.pages} pages</span></p>
        <h1 className="headline">What {f.company} told investors</h1>
        <p className="lede">
          To sell shares to the public, a company must file a prospectus with the US Securities and Exchange Commission: what it does, what it earns
          and spends, and what could go wrong. {f.company} filed its {f.form} on {longDate(f.filed)}. Here are its numbers and its warnings about AI, in its own words, next to what it has said in public.
        </p>
        <p className="fi-disclosure">
          Ctrl AI is written with Claude, made by {f.company}, the company in this filing. The same rules apply to every company: when another AI company files, its filing gets the same page. Nothing here is investment advice.
        </p>
        <p className="fi-key" aria-label="How to read this page">
          <span><b className="fi-k-serif">Serif</b> their words</span>
          <span><b className="fi-k-serif"><span className="hl">Marked</span></b> found word for word in the source</span>
          <span><b className="fi-k-sans">Sans</b> our words</span>
        </p>
        <nav className="fi-toc" aria-label="On this page">
          <a href="#money">The numbers</a><a href="#warnings">The warnings</a><a href="#press">How the press quoted it</a><a href="#method">How this page was made</a>
        </nav>
      </header>

      <section className="fi-sec" id="money" aria-labelledby="money-h">
        <h2 id="money-h">The money, as the filing states it</h2>
        <p className="fi-short">
          Revenue grew from {money(revenue[0])} in 2023 to {money(revenue[last])} in the first half of 2026, and operating expenses grew with it: the operating loss in that half year was
          {' '}{money(opLoss[last])}. Most of the {money(netLoss[last])} net loss, {money(fairValue[last])}, is a change in the fair value of convertible notes and similar
          instruments, which the filing attributes mainly to the rise in its own valuation. Cash from operating activities in that half year was {money(cash[last])}{cash[last] > 0 ? ', coming in rather than going out' : ''}.
        </p>
        <div className="fi-words">
          {f.money.passages.map(id => <FilingWords key={id} f={f} id={id} />)}
        </div>

        <p className="fi-more"><Link href={`/money/${company.slug}`}>{company.name}’s numbers, drawn: revenue against costs, the net loss taken apart, and the computing commitments by year →</Link></p>

        <h3 className="fi-h3">What it has promised to spend on computing</h3>
        <div className="fi-words">
          {f.money.commitments.map(id => <FilingWords key={id} f={f} id={id} />)}
        </div>
        <p className="fi-note">Our sum of the three agreements’ minimums: about ${Math.round(commitments)} billion, before the estimated $125 to $150 billion for more TPU compute. The filing says it has other compute arrangements it does not describe.</p>
      </section>

      <section className="fi-sec" id="warnings" aria-labelledby="warnings-h">
        <h2 id="warnings-h">The warnings: to investors, and in public</h2>
        <p className="fi-short">A prospectus must list what could go wrong. These are the filing’s warnings about AI itself, each next to what {f.company} has said in public on the same point.</p>
        {f.themes.map(theme => (
          <section key={theme.id} className="fi-theme" aria-labelledby={`t-${theme.id}`}>
            <h3 id={`t-${theme.id}`} className="fi-theme-title">{theme.title}</h3>
            <div className="fi-pair">
              <div className="fi-side">
                <p className="fi-side-label">To investors</p>
                {theme.filing.map(id => <FilingWords key={id} f={f} id={id} />)}
              </div>
              <div className="fi-side">
                <p className="fi-side-label">In public</p>
                {theme.public.length
                  ? theme.public.map(p => ('passage' in p ? <PublicWords key={p.passage} f={f} id={p.passage} /> : <BaseWords key={p.quote} id={p.quote} />))
                  : <p className="fi-none">No public statement checked yet.</p>}
              </div>
            </div>
            {theme.note ? <p className="fi-note">{theme.note}</p> : null}
          </section>
        ))}
      </section>

      <section className="fi-sec" id="press" aria-labelledby="press-h">
        <h2 id="press-h">How the press quoted the filing</h2>
        <p className="fi-short">The quotations of the filing in the coverage we recorded, each checked against the filing itself.</p>
        <ol className="fi-press">
          {f.press.quotes.map(id => {
            const found = quoteOf(id);
            const check = v?.press[id];
            if (!found || !check) return null;
            return (
              <li key={id} className={`fi-press-${check.mode}`}>
                <p className="fi-press-who"><Link href={`/base/${found.e.slug}#${id}`}>{found.e.outlet}</Link>, {shortDate(found.e.published)}</p>
                <blockquote>“{found.q.text}”</blockquote>
                <p className="fi-press-check">
                  <b>{PRESS[check.mode]}</b>
                  {check.page ? `, page ${check.page}` : ''}
                  {check.differences?.length ? `: ${check.differences.join('; ')}` : ''}
                  {check.mode === 'words' && check.filing ? <>. The filing: <span className="fi-press-filing">“{check.filing}”</span></> : null}
                </p>
              </li>
            );
          })}
        </ol>
        <h3 className="fi-h3">Headlines, next to the filing’s words</h3>
        <div className="fi-headlines">
          {f.press.headlines.map(h => {
            const e = entryOf(h.entry);
            if (!e) return null;
            return (
              <div key={h.entry} className="fi-headline">
                <p className="fi-press-who"><Link href={`/base/${e.slug}`}>{e.outlet}</Link>, {shortDate(e.published)}</p>
                <p className="fi-headline-text">{e.title}</p>
                <p className="fi-side-label">The filing</p>
                <ul>{h.filing.map(id => <li key={id}>“<span className="hl">{passageOf(f, id).text}</span>” <small>page {v?.passages[id]?.page}</small></li>)}</ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="fi-sec fi-method" id="method" aria-labelledby="method-h">
        <h2 id="method-h">How this page was made</h2>
        <ul>
          <li>We downloaded the <a href={f.url}>{f.form}</a> from the SEC’s EDGAR system (<a href={f.index}>the whole filing</a>) and saved it, with {f.company}’s public pages quoted here, in our archive. A program checks that every passage on this page is in them word for word{VERIFICATION.checkedOn ? `; it last ran on ${longDate(VERIFICATION.checkedOn)}` : ''}. Page numbers are the ones printed in the filing.</li>
          <li>We chose the passages: the filing’s warnings about AI itself, its main figures, and what it has promised to spend on computing. The filing has {f.pages} pages; this page does not summarize it.</li>
          <li>The full-year figures come from audited statements and the half-year figures do not, as the filing says. Where a sum or a difference is ours, the page says so.</li>
          <li>The quotations of {f.company}’s people come from the Base, where each was checked against the source that published it.</li>
          <li>Ctrl AI is written with Claude, made by {f.company}. Every AI company’s filing gets the same page, with the same rules. Nothing here is investment advice.</li>
        </ul>
      </section>
    </article>
  );
}
