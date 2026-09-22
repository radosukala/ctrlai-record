import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { contributors, runs, verifications, works } from '../db/schema';
import { PUBLIC_STATUSES } from '../consensus';

export interface Cell {
  verified: Record<string, number>;
  rated: Record<string, number>;
  reported: Record<string, number>;
  disputed: number;
  total: number;
}

export type TestTable = Record<string, Record<string, Cell>>; // testId → productId → cell

const emptyCell = (): Cell => ({ verified: {}, rated: {}, reported: {}, disputed: 0, total: 0 });

/**
 * Counts per test and AI, kept in three separate piles so they are never mixed:
 * verified (receipt confirmed + two agreeing checks), rated (agreed rating, no confirmable receipt),
 * and reported (the submitter's own rating, not yet checked).
 */
export async function recordTable(db: Database, options: { testId?: string; productId?: string; surface?: string } = {}): Promise<TestTable> {
  const conditions = [inArray(runs.status, PUBLIC_STATUSES), eq(runs.surface, options.surface ?? 'app')];
  if (options.testId) conditions.push(eq(runs.testId, options.testId));
  if (options.productId) conditions.push(eq(runs.productId, options.productId));
  const rows = await db.select({
    testId: runs.testId, productId: runs.productId, status: runs.status,
    outcome: sql<string>`coalesce(${runs.consensusOutcome}, ${runs.submitterOutcome})`,
    n: sql<number>`count(*)`.mapWith(Number),
  }).from(runs).where(and(...conditions)).groupBy(runs.testId, runs.productId, runs.status, sql`coalesce(${runs.consensusOutcome}, ${runs.submitterOutcome})`);
  const table: TestTable = {};
  for (const row of rows) {
    const cell = (table[row.testId] ??= {})[row.productId] ??= emptyCell();
    cell.total += row.n;
    if (row.status === 'verified') cell.verified[row.outcome] = (cell.verified[row.outcome] ?? 0) + row.n;
    else if (row.status === 'rated') cell.rated[row.outcome] = (cell.rated[row.outcome] ?? 0) + row.n;
    else if (row.status === 'disputed') cell.disputed += row.n;
    else cell.reported[row.outcome] = (cell.reported[row.outcome] ?? 0) + row.n;
  }
  return table;
}

export const sum = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);

export interface Totals {
  runs: number;
  verified: number;
  products: number;
  contributors: number;
  checks: number;
  works: number;
  awaitingChecks: number;
}

export async function totals(db: Database): Promise<Totals> {
  const [runRow] = await db.select({
    runs: sql<number>`count(*)`.mapWith(Number),
    verified: sql<number>`count(*) filter (where ${runs.status} = 'verified')`.mapWith(Number),
    products: sql<number>`count(distinct ${runs.productId})`.mapWith(Number),
    awaiting: sql<number>`count(*) filter (where ${runs.status} in ('unverified','disputed'))`.mapWith(Number),
  }).from(runs).where(inArray(runs.status, PUBLIC_STATUSES));
  const [people] = await db.select({
    n: sql<number>`count(*)`.mapWith(Number),
  }).from(contributors).where(sql`exists (select 1 from ${runs} r where r.contributor_id = ${contributors.id})
    or exists (select 1 from ${verifications} v where v.contributor_id = ${contributors.id})
    or exists (select 1 from ${works} w where w.submitted_by = ${contributors.id})`);
  const [checkRow] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(verifications);
  const [workRow] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(works).where(eq(works.status, 'listed'));
  return {
    runs: runRow?.runs ?? 0,
    verified: runRow?.verified ?? 0,
    products: runRow?.products ?? 0,
    contributors: people?.n ?? 0,
    checks: checkRow?.n ?? 0,
    works: workRow?.n ?? 0,
    awaitingChecks: runRow?.awaiting ?? 0,
  };
}

export async function testRunCounts(db: Database): Promise<Record<string, { runs: number; products: number; verified: number }>> {
  const rows = await db.select({
    testId: runs.testId,
    runs: sql<number>`count(*)`.mapWith(Number),
    products: sql<number>`count(distinct ${runs.productId})`.mapWith(Number),
    verified: sql<number>`count(*) filter (where ${runs.status} = 'verified')`.mapWith(Number),
  }).from(runs).where(inArray(runs.status, PUBLIC_STATUSES)).groupBy(runs.testId);
  return Object.fromEntries(rows.map(row => [row.testId, { runs: row.runs, products: row.products, verified: row.verified }]));
}

/**
 * Model names people actually used, taken only from runs that passed independent checks (verified or rated),
 * and only when at least two different contributors used the same name in the last 90 days. This keeps the
 * form's suggestions current as apps change, without anyone maintaining a list and without letting one person
 * plant a name.
 */
export async function recentModelLabels(
  db: Database,
  options: { days?: number; minPeople?: number; perProduct?: number } = {},
): Promise<Record<string, string[]>> {
  const days = options.days ?? 90;
  const minPeople = options.minPeople ?? 2;
  const perProduct = options.perProduct ?? 6;
  const rows = await db.select({ productId: runs.productId, label: runs.modelLabel })
    .from(runs)
    .where(and(
      inArray(runs.status, ['verified', 'rated']),
      sql`${runs.modelLabel} <> ''`,
      sql`${runs.createdAt} > now() - make_interval(days => ${days})`,
    ))
    .groupBy(runs.productId, runs.modelLabel)
    .having(sql`count(distinct ${runs.contributorId}) >= ${minPeople}`)
    .orderBy(sql`count(distinct ${runs.contributorId}) desc`, sql`max(${runs.createdAt}) desc`);
  const labels: Record<string, string[]> = {};
  for (const row of rows) {
    const list = (labels[row.productId] ??= []);
    if (list.length < perProduct) list.push(row.label);
  }
  return labels;
}
