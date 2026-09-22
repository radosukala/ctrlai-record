import Link from 'next/link';
import type { TestDef } from '@/content/tests';
import { PRODUCTS, getProduct } from '@/content/products';
import type { Cell } from '@/lib/store/stats';
import { sum } from '@/lib/store/stats';
import { OutcomeBar, OutcomeLegend, Breakdown, type Pile } from './Outcomes';

export const PILE_TEXT: Record<Pile, { label: string; explain: string }> = {
  verified: { label: 'Verified', explain: 'Share link confirmed and outcome agreed by two independent people.' },
  rated: { label: 'Rated, no receipt', explain: 'Outcome agreed by two people, without a share link from the AI’s maker.' },
  reported: { label: 'Not yet checked', explain: 'The submitter’s own rating. Not yet checked by anyone else.' },
};

/**
 * One row per AI product, one pile at a time. The piles are never added together:
 * a verified run and an unchecked report are different kinds of evidence.
 */
export function ResultsTable({ test, cells, pile, basePath, anchor = 'results' }: { test: TestDef; cells: Record<string, Cell>; pile: Pile; basePath: string; anchor?: string }) {
  const rows = PRODUCTS
    .map(product => ({ product, cell: cells[product.id] }))
    .filter(row => row.cell && sum(row.cell[pile]) > 0)
    .sort((a, b) => sum(b.cell![pile]) - sum(a.cell![pile]));
  const pileTotals = (['verified', 'rated', 'reported'] as Pile[]).map(key => ({
    key, n: Object.values(cells).reduce((acc, cell) => acc + sum(cell[key]), 0),
  }));
  const disputed = Object.values(cells).reduce((acc, cell) => acc + cell.disputed, 0);
  return (
    <div className="card">
      <div className="actions" style={{ justifyContent: 'space-between' }}>
        <nav className="filters" aria-label="Which runs to show">
          {pileTotals.map(({ key, n }) => (
            <Link key={key} href={`${basePath}?pile=${key}#${anchor}`} className="filter" aria-current={pile === key ? 'true' : undefined} scroll={false}>
              {PILE_TEXT[key].label} <small>{n}</small>
            </Link>
          ))}
        </nav>
        {disputed ? <span className="small muted">{disputed} disputed, shown on the runs themselves</span> : null}
      </div>
      <p className="small muted mt-12">{PILE_TEXT[pile].explain}</p>
      <div className="mt-24">
        {rows.length ? (
          <div className="result-rows">
            {rows.map(({ product, cell }) => {
              const counts = cell![pile];
              return (
                <div className="result-row" key={product.id}>
                  <div className="who">{product.name}<small>{product.maker} · {product.country}</small></div>
                  <OutcomeBar test={test} counts={counts} label={`${product.name}, ${PILE_TEXT[pile].label.toLowerCase()}`} />
                  <div className="counts">{sum(counts)} {sum(counts) === 1 ? 'run' : 'runs'}</div>
                  <div className="breakdown"><Breakdown test={test} counts={counts} /></div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            <h3>Nothing here yet.</h3>
            <p>{pile === 'verified' ? 'No run of this test has been verified yet. Runs need a share link and two independent checks.' : 'No runs in this group yet.'} <Link href={`/tests/${test.id}#run`}>Add yours</Link> or <Link href={`/verify?test=${test.id}`}>check someone else’s</Link>.</p>
          </div>
        )}
      </div>
      <div className="mt-24"><OutcomeLegend test={test} /></div>
    </div>
  );
}

export function productName(id: string): string {
  return getProduct(id)?.name ?? id;
}
