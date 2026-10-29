import type { Filing } from '@/content/filings/types';
import { COMMITTED, cells, money } from '@/lib/filings';

/** A row of a filing's table by key, as numbers in the table's unit; a dash counts as zero (the table still prints it). */
export function rowOf(f: Filing, key: string): number[] {
  const r = f.money.table.rows.find(x => x.key === key);
  if (!r) throw new Error(`${f.slug}: no table row ${key}`);
  return cells(r.row).map(n => n ?? 0);
}

/** "+$3.9 billion", "−$1.5 billion": an amount whose sign is the point (a word joiner keeps the sign on its line). */
export const signed = (millions: number) => `${millions < 0 ? '−' : '+'}\u2060${money(millions)}`;

export type Stat = { label: string; value: string; sub: string };

/**
 * The figures a company's page leads with: its latest period, each beside the same period a year earlier. The last
 * column of the table is the latest period and the one before it the same period a year earlier (a test holds this).
 */
export function brief(f: Filing): { period: string; stats: Stat[] } {
  const cols = f.money.table.columns, last = cols.length - 1, before = last - 1;
  const [revenue, opLoss, netLoss, fairValue, cash] = ['revenue', 'operating-loss', 'net-loss', 'fair-value', 'operating-cash'].map(k => rowOf(f, k));
  const committed = Math.round(COMMITTED.reduce((a, b) => a + b, 0));
  return {
    period: cols[last].label,
    stats: [
      { label: 'Revenue', value: money(revenue[last]), sub: `a year earlier: ${money(revenue[before])}` },
      { label: 'Operating loss', value: money(opLoss[last]), sub: `a year earlier: ${money(opLoss[before])}` },
      { label: 'Net loss', value: money(netLoss[last]), sub: `${money(fairValue[last])} of it a change in the fair value of notes` },
      { label: 'Cash from operations', value: signed(cash[last]), sub: `a year earlier: ${signed(cash[before])}` },
      { label: 'Promised for computing', value: `$${committed} billion+`, sub: 'three agreements’ minimums, our sum; more estimated' },
    ],
  };
}

/** "Jan–Jun 2026" → "January to June 2026"; a year stays a year. */
export const periodName = (label: string) => label.replace('Jan–Jun', 'January to June');
