import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { getDb } from '@/lib/db/client';
import { recordTable, sum } from '@/lib/store/stats';
import { listRuns } from '@/lib/store/runs';
import { TESTS } from '@/content/tests';
import { getProduct } from '@/content/products';
import { OutcomeBar, OutcomeLegend, Breakdown } from '@/components/Outcomes';
import { RunCard } from '@/components/RunCard';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ product: string }> }): Promise<Metadata> {
  const { product: id } = await params;
  const product = getProduct(id);
  if (!product) return {};
  return { title: `How ${product.name} behaved`, description: `Every test run on ${product.name} by ${product.maker}, with receipts, in the Ctrl AI public record.` };
}

export default async function ProductPage({ params }: { params: Promise<{ product: string }> }) {
  const { product: id } = await params;
  const product = getProduct(id);
  if (!product) notFound();
  const db = await getDb();
  const [table, runs] = await Promise.all([recordTable(db, { productId: product.id }), listRuns(db, { productId: product.id, limit: 12 })]);
  return (
    <>
      <section className="test-hero">
        <div className="shell">
          <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/record">Record</Link><span aria-hidden="true">/</span><span>{product.name}</span></nav>
          <div className="mt-24"><span className="eyebrow"><span className="dot" /> {product.maker} · {product.country}</span></div>
          <h1 className="title">How {product.name} behaved.</h1>
          <p className="lede">Every test, run by people on their own accounts, checked by strangers. Each row shows verified runs; unchecked reports are listed beneath.</p>
        </div>
      </section>
      <section className="section-tight">
        <div className="shell stack" style={{ ['--stack' as string]: '16px' }}>
          {TESTS.map(test => {
            const cell = table[test.id]?.[product.id];
            const verified = cell?.verified ?? {};
            const reported = cell?.reported ?? {};
            return (
              <div key={test.id} className="card">
                <div className="actions" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <span className="pill-number">TEST {String(test.number).padStart(2, '0')}</span>
                    <h2 className="h4 mt-8"><Link href={`/tests/${test.id}`}>{test.title}</Link></h2>
                  </div>
                  <span className="small muted">{sum(verified)} verified · {sum(cell?.rated ?? {})} rated · {sum(reported)} not yet checked</span>
                </div>
                <div className="mt-16"><OutcomeBar test={test} counts={verified} label={`${product.name}, verified runs of ${test.title}`} /></div>
                <p className="small muted mt-8">
                  {sum(verified) ? <Breakdown test={test} counts={verified} /> : 'No verified runs yet.'}
                  {sum(reported) ? <> · Not yet checked: <Breakdown test={test} counts={reported} /></> : null}
                </p>
                <div className="mt-12"><OutcomeLegend test={test} /></div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="section">
        <div className="shell">
          <div className="section-head">
            <div><h2 className="h2">Latest runs on {product.name}</h2></div>
            <Link href="/tests" className="link-arrow">Test {product.name} yourself <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          {runs.length ? <div className="grid grid-3">{runs.map(run => <RunCard key={run.id} run={run} showTest />)}</div>
            : <div className="empty"><h3>No runs on {product.name} yet.</h3><p>If you use it, <Link href="/tests">run a test</Link>; it takes about a minute.</p></div>}
        </div>
      </section>
    </>
  );
}
