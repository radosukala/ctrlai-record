import Link from 'next/link';
import '@/components/filings/filings.css';
import '@/components/money/money.css';
import { COMPANIES, GROUPS, NEXT, filingPath, latestFiling } from '@/content/money';
import { brief, periodName } from '@/lib/money';
import { shortDate } from '@/lib/site';
import { Tile } from './CompanyView';

/** The money section's front page: every company read so far, by what it does for AI, and who comes next. */
export function MoneyHub() {
  return (
    <article className="shell fi mo">
      <header className="fi-head">
        <p className="dateline"><b>The money</b><span>from the companies’ own filings</span></p>
        <h1 className="headline">The money behind AI</h1>
        <p className="lede">
          What the companies building AI earn, spend and promise to spend, from what they must tell investors. Does it pay for itself? Their own filings are where
          the answer starts, so we read them: every figure here is checked against the filing it comes from, and every company gets the same treatment.
        </p>
        <p className="fi-disclosure">Ctrl AI is written with Claude, made by Anthropic, the first company in this section. Every company gets the same treatment, from its own filings. Nothing here is investment advice.</p>
      </header>

      <div className="mo-groups">
        {GROUPS.map(g => {
          const companies = COMPANIES.filter(c => c.group === g.id);
          const next = NEXT.find(n => n.group === g.id);
          return (
            <section key={g.id} className="fi-sec mo-group" aria-labelledby={`g-${g.id}`}>
              <h2 id={`g-${g.id}`}>{g.title}</h2>
              <p className="mo-group-about">{g.about}</p>
              {companies.map(c => {
                const f = latestFiling(c);
                const { period, stats } = brief(f);
                return (
                  <div key={c.slug} className="mo-card">
                    <div className="mo-card-head">
                      <h3><Link href={`/money/${c.slug}`}>{c.name}</Link></h3>
                      <p className="mo-card-about">{c.about}</p>
                      <p className="mo-doc-meta">{periodName(period)}, from its {f.form} filed {shortDate(f.filed)}, {f.filed.slice(0, 4)}</p>
                      <p className="mo-card-links"><Link href={`/money/${c.slug}`}>The numbers, drawn →</Link><Link href={filingPath(f)}>What it told investors →</Link></p>
                    </div>
                    <div className="mo-tiles">{stats.slice(0, 4).map(st => <Tile key={st.label} s={st} />)}</div>
                  </div>
                );
              })}
              {next ? (
                <div className="mo-soon">
                  <p className="mo-soon-label">{companies.length ? 'Next' : 'To come'} · {next.from}</p>
                  <ul>{next.names.map(n => <li key={n}>{n}</li>)}</ul>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <section className="fi-sec fi-method" aria-labelledby="method-h">
        <h2 id="method-h">How this section is made</h2>
        <ul>
          <li>We read each company’s own filings with the US Securities and Exchange Commission (or its home regulator) and save a copy in our archive. A program checks every figure and passage against that copy, and the page gives the printed page number.</li>
          <li>Audited figures and unaudited ones are labeled as the filing labels them. Where a sum or a difference is ours, the page says so.</li>
          <li>We do not forecast, and we do not say whether a company is worth what investors pay for it. Nothing here is investment advice.</li>
        </ul>
      </section>
    </article>
  );
}
