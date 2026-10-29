import Link from 'next/link';
import '@/components/filings/filings.css';
import '@/components/money/money.css';
import { VERIFICATION, passageOf } from '@/content/filings';
import type { Filing } from '@/content/filings/types';
import { filingPath, type Company } from '@/content/money';
import { COMMITTED, cells, money } from '@/lib/filings';
import { brief, periodName, rowOf, type Stat } from '@/lib/money';
import { longDate, shortDate } from '@/lib/site';
import { CostChart, Timeline, Waterfall, type Commitment } from './MoneyCharts';

/** A headline figure: the amount large, its unit and its comparison small. */
export function Tile({ s }: { s: Stat }) {
  const [n, ...unit] = s.value.split(' ');
  return (
    <div className="mo-tile">
      <p className="mo-tile-label">{s.label}</p>
      <p className="mo-tile-value">{n}{unit.length ? <small> {unit.join(' ')}</small> : null}</p>
      <p className="mo-tile-sub">{s.sub}</p>
    </div>
  );
}

function Words({ f, id }: { f: Filing; id: string }) {
  const p = passageOf(f, id);
  const check = VERIFICATION.filings[f.slug]?.passages[id];
  return (
    <figure className="fi-q">
      <blockquote>“<span className="hl">{p.text}</span>”</blockquote>
      <figcaption><a href={f.url}>{f.form}, page {check?.page ?? '?'}</a>{check?.ok ? ' · found word for word in the filing' : ' · not checked'}</figcaption>
    </figure>
  );
}

/** A company's page in the money section: its numbers from its newest filing, drawn, with the filing's own words, and
 *  the documents they come from. */
export function CompanyView({ company, f }: { company: Company; f: Filing }) {
  const t = f.money.table;
  const [revenue, compute, personnel, bartz, sales, admin, opLoss, interest, fairValue, otherIncome, taxes, netLoss] =
    ['revenue', 'compute', 'personnel', 'bartz', 'sales', 'admin', 'operating-loss', 'interest', 'fair-value', 'other-income', 'taxes', 'net-loss'].map(k => rowOf(f, k));
  const last = t.columns.length - 1;
  const { period, stats } = brief(f);
  const periods = t.columns.map((c, i) => ({ label: c.label, audited: c.audited, revenue: revenue[i], compute: compute[i], other: personnel[i] + bartz[i] + sales[i] + admin[i] }));
  const page = (id: string) => VERIFICATION.filings[f.slug]?.passages[id]?.page ?? '?';
  const commitments: Commitment[] = [
    { name: 'Microsoft', from: '2026-11', to: '2033-05', amount: 'at least $44.9B', detail: 'November 2026 to May 2033', page: page('microsoft') },
    { name: 'Google', from: '2026-04', to: '2033-07', amount: 'about $114.5B', detail: 'at least approximately; April 2026 to July 2033', page: page('google') },
    { name: 'Amazon', from: '2026-05', to: '2036-04', amount: 'at least $110.0B', detail: 'May 2026 to April 2036', page: page('amazon') },
    { name: 'More TPU compute', from: '2028-01', to: '2031-12', amount: '$125–150B', detail: 'estimated; to be delivered between 2028 and 2031', page: page('tpu'), estimate: true },
    { name: 'AMD chips', from: '2027-01', to: '2027-12', amount: 'over $20B', detail: 'no fixed dollar commitment; expected to exceed $20.0B over the agreement’s term if the initial capacity, due in 2027, is bought', page: page('amd'), estimate: true },
  ];
  const sum = Math.round(COMMITTED.reduce((a, b) => a + b, 0));
  return (
    <article className="shell fi mo">
      <header className="fi-head">
        <p className="dateline"><b><Link href="/money">The money</Link> · {company.name}</b><span>from its {f.form}, filed {longDate(f.filed)}</span></p>
        <h1 className="headline">{company.name}: the numbers</h1>
        <p className="lede">{company.about} Its {f.form} is the first time its full financial statements are public: what it earns, what it spends, and what it has promised to spend. The full years are audited; the half years are not.</p>
        <p className="fi-disclosure">Ctrl AI is written with Claude, made by Anthropic. Every company in this section gets the same treatment, from its own filings. Nothing here is investment advice.</p>
      </header>

      <section className="fi-sec" aria-label={`${periodName(period)}, in brief`}>
        <h2>{periodName(period)}, in brief</h2>
        <div className="mo-tiles">{stats.map(s => <Tile key={s.label} s={s} />)}</div>
      </section>

      <section className="fi-sec" aria-label="Revenue and costs">
        <h2>Revenue and what it costs to earn it</h2>
        <CostChart periods={periods} labelled={['2025', period]} />
        <div className="fi-words">
          <Words f={f} id="revenue" />
        </div>
      </section>

      <section className="fi-sec" aria-label="The net loss">
        <h2>The {money(netLoss[last])} net loss, taken apart</h2>
        <Waterfall
          title={`${periodName(period)}: from operating loss to net loss`}
          steps={[
            { label: 'Operating loss', full: 'Operating loss', value: opLoss[last], tone: 'other' },
            { label: 'Interest income', full: 'Interest income', value: interest[last], tone: 'revenue' },
            { label: 'Change in fair value of notes', full: 'Change in fair value of convertible notes, derivative liabilities, and SAFEs', value: fairValue[last], tone: 'compute' },
            { label: 'Other income (expense)', full: 'Other income (expense), net', value: otherIncome[last], tone: 'other' },
            { label: 'Income taxes', full: 'Provision for income taxes', value: -taxes[last], tone: 'other' },
            { label: 'Net loss', full: 'Net loss', value: netLoss[last], tone: 'total' },
          ]}
          note="The two largest lines come after the operating loss: both are changes in the fair value of financial instruments, which the filing explains below. The first, it says, was driven mainly by the rise in its own valuation."
        />
        <div className="fi-words">
          <Words f={f} id="losses" />
          <Words f={f} id="other-expense" />
        </div>
      </section>

      <section className="fi-sec" aria-label="Computing commitments">
        <h2>What it has promised to spend on computing</h2>
        <Timeline items={commitments} now={f.filed} note={`The sum of the three agreements’ minimums, about $${sum} billion, is ours. The filing’s own figure for fixed or minimum purchase commitments, about $265.6 billion, is as of June 30, 2026, so the two are not the same count. The filing says it is also party to arrangements it does not describe.`} />
        <div className="fi-words">
          {f.money.commitments.map(id => <Words key={id} f={f} id={id} />)}
        </div>
        <h3 className="fi-h3">More arrangements the filing describes</h3>
        <p className="fi-short">These have other terms, so they are not on the chart, and we do not add them to the figures above: ceilings that fill only as capacity is delivered, and equipment leases. Some can be cancelled; the filing’s words say which.</p>
        <div className="fi-words">
          {f.money.arrangements.map(id => <Words key={id} f={f} id={id} />)}
        </div>
      </section>

      <section className="fi-sec" aria-label="The table">
        <h2>The figures, as the filing’s table gives them</h2>
        <div className="fi-tablewrap">
          <table className="fi-table">
            <caption>From the filing’s summary table, page {t.page}, in {t.unit}. Losses in brackets; a dash where the filing has one.</caption>
            <thead><tr><th>Line</th>{t.columns.map(c => <th key={c.label} className="n">{c.label}<small>{c.audited ? 'audited' : 'not audited'}</small></th>)}</tr></thead>
            <tbody>
              {t.rows.map(r => (
                <tr key={r.key} className={['net-loss', 'operating-loss', 'revenue'].includes(r.key) ? 'mo-row-strong' : undefined}>
                  <th scope="row">{r.label}{VERIFICATION.filings[f.slug]?.rows[r.label] ? null : <small> not checked</small>}</th>
                  {cells(r.row).map((n, i) => <td key={i} className="n">{n === null ? '—' : n < 0 ? `(${Math.abs(n).toLocaleString('en-US')})` : n.toLocaleString('en-US')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="fi-sec" aria-label="Documents">
        <h2>The documents</h2>
        <ul className="mo-docs">
          {company.filings.map(doc => (
            <li key={doc.slug}>
              <p className="mo-doc-meta">{doc.form} · {doc.kind} · filed {shortDate(doc.filed)}, {doc.filed.slice(0, 4)} · {doc.pages} pages</p>
              <p className="mo-doc-title"><Link href={filingPath(doc)}>What {company.name} told investors</Link></p>
              <p className="mo-doc-about">Its warnings about AI, word for word, next to what it has said in public, and how the press quoted the filing. <a href={doc.url}>The filing at the SEC</a>.</p>
            </li>
          ))}
        </ul>
        <p className="fi-note">Every figure and passage on this page is checked against the saved filing by a program; page numbers are the ones printed in the filing. Where a sum or a difference is ours, the page says so.</p>
      </section>
    </article>
  );
}
