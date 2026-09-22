import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Download } from 'lucide-react';
import { getDb } from '@/lib/db/client';
import { recordTable, totals, sum } from '@/lib/store/stats';
import { TESTS } from '@/content/tests';
import { PRODUCTS } from '@/content/products';
import { ResultsTable, PILE_TEXT } from '@/components/ResultsTable';
import type { Pile } from '@/components/Outcomes';
import { plural } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The record',
  description: 'Every verified run of every test, per AI product. Verified, rated and unchecked runs are always kept apart.',
};

export default async function RecordPage({ searchParams }: { searchParams: Promise<{ pile?: string }> }) {
  const { pile: pileParam } = await searchParams;
  const db = await getDb();
  const [table, total] = await Promise.all([recordTable(db), totals(db)]);
  const anyVerified = Object.values(table).some(byProduct => Object.values(byProduct).some(cell => sum(cell.verified) > 0));
  const pile: Pile = pileParam === 'verified' || pileParam === 'rated' || pileParam === 'reported' ? pileParam : anyVerified ? 'verified' : 'reported';
  const productTotals = PRODUCTS.map(product => ({
    product,
    runs: Object.values(table).reduce((acc, byProduct) => acc + (byProduct[product.id]?.total ?? 0), 0),
    verified: Object.values(table).reduce((acc, byProduct) => acc + sum(byProduct[product.id]?.verified ?? {}), 0),
  })).filter(row => row.runs > 0).sort((a, b) => b.runs - a.runs);

  return (
    <>
      <section className="test-hero">
        <div className="shell">
          <span className="eyebrow"><span className="dot" /> The record</span>
          <h1 className="title">How AI behaved, <em>with receipts.</em></h1>
          <p className="lede">
            Every run of every test, per AI product. Verified runs have a share link from the AI’s maker, confirmed by two people who
            didn’t add them, and an outcome those people agreed on. Rated and unchecked runs are shown separately and never added together.
          </p>
          <div className="meta-row">
            <span>{total.runs.toLocaleString('en-US')} runs</span>
            <span>{total.verified.toLocaleString('en-US')} verified</span>
            <span>{total.products} AI products</span>
            <span>{total.contributors.toLocaleString('en-US')} contributors</span>
            <Link href="/data" className="inline-icon"><Download size={14} aria-hidden="true" /> Download everything</Link>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="shell split-wide">
          <div className="card">
            <h2 className="h4">How to read this</h2>
            <ul className="bullets small mt-12">
              <li><strong>Showing: {PILE_TEXT[pile].label.toLowerCase()}.</strong> {PILE_TEXT[pile].explain} Switch groups on any test below.</li>
              <li>People choose which AI to test and whether to share, so these are documented cases, not a random sample. A share of 30% means “30% of these runs”, not “30% of the time”.</li>
              <li>Each run records the app, the model it showed, and whether memory was on. Products change without notice; the date of every run is kept.</li>
              <li>Stated-attitude tests record what an AI says it would do. That is weaker evidence than behavior, and is labeled as such.</li>
            </ul>
          </div>
          <div className="card">
            <h2 className="h4">By AI</h2>
            {productTotals.length ? (
              <ul className="aside-list mt-12">
                {productTotals.map(({ product, runs, verified }) => (
                  <li key={product.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <Link href={`/ai/${product.id}`}>{product.name}</Link>
                    <span className="small muted">{plural(runs, 'run')} · {verified} verified</span>
                  </li>
                ))}
              </ul>
            ) : <p className="small muted mt-8">No AI has been tested yet.</p>}
          </div>
        </div>
      </section>

      {TESTS.map(test => (
        <section key={test.id} className="section-tight" id={test.id}>
          <div className="shell">
            <div className="section-head" style={{ marginBottom: 20 }}>
              <div>
                <span className="eyebrow"><span className="dot" /> Test {String(test.number).padStart(2, '0')} · {test.kind === 'behavior' ? 'Behavior' : 'Stated attitude'}</span>
                <h2 className="h3 mt-12">{test.title}</h2>
              </div>
              <Link href={`/tests/${test.id}`} className="link-arrow">Run this test <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
            {Object.keys(table[test.id] ?? {}).length ? (
              <ResultsTable test={test} cells={table[test.id] ?? {}} pile={pile} basePath="/record" anchor={test.id} />
            ) : (
              <div className="card-flat small muted">No runs of this test yet. <Link href={`/tests/${test.id}#run`}>Be the first</Link>; it takes about {test.seconds} seconds.</div>
            )}
          </div>
        </section>
      ))}
    </>
  );
}
