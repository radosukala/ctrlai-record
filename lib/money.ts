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

/** An amount in millions as a chart or card labels it: "$693M", "$72.4B". */
export const short = (millions: number) => (Math.abs(millions) < 1000 ? `$${Math.abs(millions).toLocaleString('en-US')}M` : `$${(Math.abs(millions) / 1000).toFixed(1)}B`);

export type LossStep = { label: string; full: string; value: number; tone: 'other' | 'compute' | 'revenue' | 'total' };

/**
 * The latest period's net loss taken apart, line by line, from the filing's table: each line moves the running total, and
 * the last is where it ends. The company page's chart and the post card draw the same steps.
 */
export function lossSteps(f: Filing): LossStep[] {
  const last = f.money.table.columns.length - 1;
  const [opLoss, interest, fairValue, otherIncome, taxes, netLoss] = ['operating-loss', 'interest', 'fair-value', 'other-income', 'taxes', 'net-loss'].map(k => rowOf(f, k)[last]);
  return [
    { label: 'Operating loss', full: 'Operating loss', value: opLoss, tone: 'other' },
    { label: 'Interest income', full: 'Interest income', value: interest, tone: 'revenue' },
    { label: 'Change in fair value of notes', full: 'Change in fair value of convertible notes, derivative liabilities, and SAFEs', value: fairValue, tone: 'compute' },
    { label: 'Other income (expense)', full: 'Other income (expense), net', value: otherIncome, tone: 'other' },
    { label: 'Income taxes', full: 'Provision for income taxes', value: -taxes, tone: 'other' },
    { label: 'Net loss', full: 'Net loss', value: netLoss, tone: 'total' },
  ];
}
