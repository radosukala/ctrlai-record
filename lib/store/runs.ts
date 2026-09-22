import { and, asc, desc, eq, inArray, ne, notInArray, sql } from 'drizzle-orm';
import { isUniqueViolation, type Database } from '../db/client';
import { contributors, runs, verifications } from '../db/schema';
import { isShortId, shortId } from '../ids';
import { checkReceipt } from '../receipts';
import { decide, PUBLIC_STATUSES, type FlagVote, type ReceiptCheckVote, type RunStatus } from '../consensus';
import { getTest, getOutcome, type TestDef } from '@/content/tests';
import { getProduct } from '@/content/products';
import { logEvent } from './log';
import type { Contributor } from './contributors';

export const LIMITS = {
  response: 8000,
  excerpt: 280,
  notes: 500,
  model: 80,
  runsPerHour: 30,
  checksPerHour: 120,
};

export type Personalization = 'off' | 'on' | 'unknown';

export interface RunInput {
  testId: string;
  productId: string;
  modelLabel?: string;
  personalization?: Personalization;
  receiptUrl?: string;
  responses: string[];
  excerpt?: string;
  notes?: string;
  outcome: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

const fail = (status: number, error: string) => ({ ok: false as const, status, error });

/** Whitespace-insensitive comparison, so a quote copied from a formatted reply still matches. */
export function normalizeText(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function validateRun(input: RunInput): Result<{ test: TestDef; responses: string[]; receipt: ReturnType<typeof checkReceipt> }> {
  const test = getTest(input.testId);
  if (!test) return fail(400, 'Choose one of the tests.');
  if (!getProduct(input.productId)) return fail(400, 'Choose which AI you tested.');
  if (!getOutcome(test, input.outcome)) return fail(400, 'Choose what the AI did.');
  if (!Array.isArray(input.responses) || input.responses.length !== test.turns.length) return fail(400, 'Paste the AI’s replies.');
  const responses = input.responses.map(text => (typeof text === 'string' ? text.trim() : ''));
  if (responses.some(text => text.length > LIMITS.response)) return fail(400, `Each reply can be at most ${LIMITS.response.toLocaleString('en-US')} characters.`);
  if (responses[test.judgedTurn].length < 2) return fail(400, test.turns.length > 1 ? 'Paste the AI’s reply to your last message.' : 'Paste the AI’s reply.');
  if ((input.modelLabel ?? '').length > LIMITS.model) return fail(400, 'The model name is too long.');
  if ((input.notes ?? '').length > LIMITS.notes) return fail(400, `Notes can be at most ${LIMITS.notes} characters.`);
  const excerpt = (input.excerpt ?? '').trim();
  if (excerpt.length > LIMITS.excerpt) return fail(400, `The highlighted line can be at most ${LIMITS.excerpt} characters.`);
  if (excerpt && !normalizeText(responses[test.judgedTurn]).includes(normalizeText(excerpt))) {
    return fail(400, 'The highlighted line must be copied exactly from the AI’s reply.');
  }
  const personalization = input.personalization ?? 'unknown';
  if (!['off', 'on', 'unknown'].includes(personalization)) return fail(400, 'Say whether memory or personalization was on.');
  const receipt = checkReceipt(input.receiptUrl ?? '', input.productId);
  if (!receipt.ok) return fail(400, receipt.error ?? 'That receipt link cannot be used.');
  return { ok: true, value: { test, responses, receipt } };
}

export async function recentRunCount(db: Database, ipHash: string, minutes = 60): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(runs)
    .where(and(eq(runs.ipHash, ipHash), sql`${runs.createdAt} > now() - make_interval(mins => ${minutes})`));
  return row?.n ?? 0;
}

export async function createRun(db: Database, input: RunInput, contributor: Contributor, ipHash: string): Promise<Result<{ id: string }>> {
  const checked = validateRun(input);
  if (!checked.ok) return checked;
  if (await recentRunCount(db, ipHash) >= LIMITS.runsPerHour) return fail(429, 'That’s a lot of runs in an hour. Please take a break and come back soon.');
  const { test, responses, receipt } = checked.value;
  const expected = test.expected?.value;
  const meta: Record<string, unknown> = {};
  if (expected) meta.containsExpected = normalizeText(responses[test.judgedTurn]).includes(expected.toLowerCase());

  for (let attempt = 0; attempt < 5; attempt++) {
    const id = shortId();
    try {
      await db.transaction(async tx => {
        await tx.insert(runs).values({
          id,
          testId: test.id,
          testVersion: test.version,
          productId: input.productId,
          modelLabel: (input.modelLabel ?? '').trim(),
          surface: 'app',
          personalization: input.personalization ?? 'unknown',
          receiptUrl: receipt.url,
          receiptKind: receipt.kind,
          receiptStatus: receipt.kind === 'none' ? 'none' : 'pending',
          responses,
          excerpt: (input.excerpt ?? '').trim(),
          notes: (input.notes ?? '').trim(),
          submitterOutcome: input.outcome,
          meta,
          contributorId: contributor.id,
          ipHash,
        });
        await logEvent(tx, {
          actorId: contributor.id, action: 'run.added', subject: `run:${id}`,
          detail: { test: test.id, product: input.productId, receipt: receipt.kind },
        });
      });
      return { ok: true, value: { id } };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  return fail(500, 'Could not save the run. Please try again.');
}

export interface PublicRun {
  id: string;
  testId: string;
  testVersion: number;
  productId: string;
  modelLabel: string;
  surface: string;
  personalization: string;
  receiptUrl: string | null;
  receiptKind: string;
  receiptStatus: string;
  responses: string[];
  excerpt: string;
  notes: string;
  submitterOutcome: string;
  consensusOutcome: string | null;
  status: RunStatus;
  createdAt: string;
  verifiedAt: string | null;
  contributor: { seq: number; handle: string | null };
  checks: number;
  meta: Record<string, unknown>;
}

type RunRow = typeof runs.$inferSelect;

// Written out in full: Drizzle drops table names inside select-list subqueries.
const checksCount = () => sql<number>`(select count(*) from verifications vv where vv.run_id = "runs"."id")`.mapWith(Number);

function toPublic(row: RunRow, contributor: { seq: number; handle: string | null }, checks: number): PublicRun {
  const hidden = row.status === 'hidden' || row.status === 'withdrawn' || row.status === 'rejected';
  return {
    id: row.id,
    testId: row.testId,
    testVersion: row.testVersion,
    productId: row.productId,
    modelLabel: row.modelLabel,
    surface: row.surface,
    personalization: row.personalization,
    receiptUrl: hidden ? null : row.receiptUrl,
    receiptKind: row.receiptKind,
    receiptStatus: row.receiptStatus,
    responses: hidden ? [] : row.responses,
    excerpt: hidden ? '' : row.excerpt,
    notes: hidden ? '' : row.notes,
    submitterOutcome: row.submitterOutcome,
    consensusOutcome: row.consensusOutcome,
    status: row.status as RunStatus,
    createdAt: row.createdAt.toISOString(),
    verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
    contributor,
    checks,
    meta: row.meta,
  };
}

export async function getRun(db: Database, id: string): Promise<(PublicRun & { contributorId: string }) | null> {
  const [row] = await db.select({ run: runs, seq: contributors.seq, handle: contributors.handle })
    .from(runs).innerJoin(contributors, eq(contributors.id, runs.contributorId)).where(eq(runs.id, id)).limit(1);
  if (!row) return null;
  const [count] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(verifications).where(eq(verifications.runId, id));
  return { ...toPublic(row.run, { seq: row.seq, handle: row.handle }, count?.n ?? 0), contributorId: row.run.contributorId };
}

export interface RunFilter {
  testId?: string;
  productId?: string;
  statuses?: RunStatus[];
  contributorId?: string;
  limit?: number;
  offset?: number;
}

export async function listRuns(db: Database, filter: RunFilter = {}): Promise<PublicRun[]> {
  const conditions = [inArray(runs.status, filter.statuses ?? PUBLIC_STATUSES)];
  if (filter.testId) conditions.push(eq(runs.testId, filter.testId));
  if (filter.productId) conditions.push(eq(runs.productId, filter.productId));
  if (filter.contributorId) conditions.push(eq(runs.contributorId, filter.contributorId));
  const rows = await db.select({
    run: runs, seq: contributors.seq, handle: contributors.handle,
    checks: checksCount(),
  }).from(runs).innerJoin(contributors, eq(contributors.id, runs.contributorId))
    .where(and(...conditions))
    .orderBy(desc(runs.createdAt))
    .limit(Math.min(filter.limit ?? 30, 500))
    .offset(filter.offset ?? 0);
  return rows.map(row => toPublic(row.run, { seq: row.seq, handle: row.handle }, row.checks));
}

/** Withdrawal keeps a tombstone (the ID, test and AI) so links don't silently change meaning. */
export async function withdrawRun(db: Database, id: string, contributorId: string): Promise<Result<null>> {
  const [row] = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
  if (!row || row.contributorId !== contributorId) return fail(404, 'Only the person who added a run can withdraw it.');
  if (row.status === 'withdrawn') return { ok: true, value: null };
  await db.transaction(async tx => {
    await tx.update(runs).set({
      status: 'withdrawn', responses: [], excerpt: '', notes: '', receiptUrl: null, updatedAt: new Date(),
    }).where(eq(runs.id, id));
    await logEvent(tx, { actorId: contributorId, action: 'run.withdrawn', subject: `run:${id}` });
  });
  return { ok: true, value: null };
}

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Re-applies the consensus rules after a new check. Status changes are logged publicly. */
export async function recompute(tx: Tx | Database, id: string): Promise<{ status: RunStatus; outcome: string | null; receiptStatus: string }> {
  const [row] = await tx.select().from(runs).where(eq(runs.id, id)).limit(1);
  if (!row) throw new Error(`Run ${id} not found`);
  if (row.status === 'withdrawn') return { status: 'withdrawn', outcome: row.consensusOutcome, receiptStatus: row.receiptStatus };
  const votes = await tx.select({
    receiptCheck: verifications.receiptCheck, outcome: verifications.outcome, flag: verifications.flag,
  }).from(verifications).where(eq(verifications.runId, id));
  const stewardHold = row.meta?.stewardHidden === true;
  const result = decide(row.receiptKind as 'provider' | 'other' | 'none' | 'transcript', votes.map(vote => ({
    receiptCheck: vote.receiptCheck as ReceiptCheckVote, outcome: vote.outcome, flag: vote.flag as FlagVote,
  })));
  const status: RunStatus = stewardHold ? 'hidden' : result.status;
  const changed = status !== row.status || result.outcome !== row.consensusOutcome || result.receiptStatus !== row.receiptStatus;
  if (changed) {
    await tx.update(runs).set({
      status,
      consensusOutcome: result.outcome,
      receiptStatus: result.receiptStatus,
      verifiedAt: status === 'verified' ? (row.verifiedAt ?? new Date()) : null,
      updatedAt: new Date(),
    }).where(eq(runs.id, id));
    if (status !== row.status) {
      await logEvent(tx, {
        action: 'run.status', subject: `run:${id}`,
        detail: { from: row.status, to: status, outcome: result.outcome, receipt: result.receiptStatus },
      });
    }
  }
  return { status, outcome: result.outcome, receiptStatus: result.receiptStatus };
}

// ——— Verification ————————————————————————————————————————————————

export interface CheckInput {
  runId: string;
  receiptCheck: ReceiptCheckVote;
  outcome: string | null;
  flag?: FlagVote;
}

export interface VerifyItem {
  id: string;
  testId: string;
  productId: string;
  modelLabel: string;
  personalization: string;
  receiptUrl: string | null;
  receiptKind: string;
  responses: string[];
  notes: string;
  createdAt: string;
  checks: number;
}

/**
 * The next run for someone to check: never their own, never one they already checked,
 * never one submitted from the same connection. Runs with provider receipts come first, then the runs
 * closest to being settled, then the oldest.
 */
export async function nextRunToVerify(db: Database, viewer: { contributorId: string | null; ipHash: string }, testId?: string, skip: string[] = []): Promise<VerifyItem | null> {
  const allowSameNetwork = process.env.CTRL_ALLOW_SAME_NETWORK === '1';
  const conditions = [inArray(runs.status, ['unverified', 'disputed'])];
  if (testId) conditions.push(eq(runs.testId, testId));
  const skipped = skip.filter(isShortId).slice(0, 50);
  if (skipped.length) conditions.push(notInArray(runs.id, skipped));
  if (viewer.contributorId) {
    conditions.push(ne(runs.contributorId, viewer.contributorId));
    conditions.push(sql`not exists (select 1 from ${verifications} v where v.run_id = ${runs.id} and v.contributor_id = ${viewer.contributorId})`);
  }
  if (!allowSameNetwork) conditions.push(ne(runs.ipHash, viewer.ipHash));
  const [row] = await db.select({
    run: runs,
    checks: checksCount(),
  }).from(runs).where(and(...conditions))
    .orderBy(
      sql`case ${runs.receiptKind} when 'provider' then 0 when 'other' then 1 else 2 end`,
      sql`(select count(*) from verifications vv where vv.run_id = "runs"."id") desc`,
      asc(runs.createdAt),
    ).limit(1);
  if (!row) return null;
  return {
    id: row.run.id, testId: row.run.testId, productId: row.run.productId, modelLabel: row.run.modelLabel,
    personalization: row.run.personalization, receiptUrl: row.run.receiptUrl, receiptKind: row.run.receiptKind,
    responses: row.run.responses, notes: row.run.notes, createdAt: row.run.createdAt.toISOString(), checks: row.checks,
  };
}

export async function recentCheckCount(db: Database, ipHash: string, minutes = 60): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(verifications)
    .where(and(eq(verifications.ipHash, ipHash), sql`${verifications.createdAt} > now() - make_interval(mins => ${minutes})`));
  return row?.n ?? 0;
}

export interface CheckResult {
  status: RunStatus;
  consensusOutcome: string | null;
  receiptStatus: string;
  submitterOutcome: string;
  checks: number;
}

export async function addCheck(db: Database, input: CheckInput, contributor: Contributor, ipHash: string): Promise<Result<CheckResult>> {
  const [run] = await db.select().from(runs).where(eq(runs.id, input.runId)).limit(1);
  if (!run || !['unverified', 'disputed'].includes(run.status)) return fail(404, 'This run is not open for checking.');
  if (run.contributorId === contributor.id) return fail(403, 'You can’t check your own run. That’s the point!');
  if (run.ipHash === ipHash && process.env.CTRL_ALLOW_SAME_NETWORK !== '1') return fail(403, 'This run was added from your network, so someone else needs to check it.');
  const test = getTest(run.testId);
  if (!test) return fail(404, 'This run’s test no longer exists.');
  if (!['matches', 'mismatch', 'unavailable', 'not-applicable'].includes(input.receiptCheck)) return fail(400, 'Say whether the receipt matches.');
  if (run.receiptKind !== 'none' && input.receiptCheck === 'not-applicable') return fail(400, 'Open the receipt link and say whether it matches.');
  if (input.outcome !== null && input.outcome !== 'unclear' && !getOutcome(test, input.outcome)) return fail(400, 'Choose what the AI did.');
  const flag = input.flag ?? 'none';
  if (!['none', 'personal-info', 'wrong-test', 'spam'].includes(flag)) return fail(400, 'Unknown flag.');
  if (input.outcome === null && flag === 'none') return fail(400, 'Choose what the AI did, or flag a problem.');
  if (await recentCheckCount(db, ipHash) >= LIMITS.checksPerHour) return fail(429, 'You’ve checked a lot of runs this hour. Thank you! Please take a short break.');

  try {
    const outcome = await db.transaction(async tx => {
      await tx.insert(verifications).values({
        runId: run.id, contributorId: contributor.id, receiptCheck: input.receiptCheck,
        outcome: input.outcome, flag, ipHash,
      });
      await logEvent(tx, { actorId: contributor.id, action: 'run.checked', subject: `run:${run.id}`, detail: flag !== 'none' ? { flag } : {} });
      return recompute(tx, run.id);
    });
    const [count] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(verifications).where(eq(verifications.runId, run.id));
    return { ok: true, value: {
      status: outcome.status, consensusOutcome: outcome.outcome, receiptStatus: outcome.receiptStatus,
      submitterOutcome: run.submitterOutcome, checks: count?.n ?? 0,
    } };
  } catch (error) {
    if (isUniqueViolation(error)) return fail(409, 'You have already checked this run.');
    throw error;
  }
}

/** After a run is settled, its individual votes are public. Before that, they stay hidden to avoid anchoring. */
export async function checkBreakdown(db: Database, runId: string) {
  const rows = await db.select({
    receiptCheck: verifications.receiptCheck, outcome: verifications.outcome, flag: verifications.flag,
    at: verifications.createdAt, seq: contributors.seq, handle: contributors.handle,
  }).from(verifications).innerJoin(contributors, eq(contributors.id, verifications.contributorId))
    .where(eq(verifications.runId, runId)).orderBy(asc(verifications.createdAt));
  return rows.map(row => ({ ...row, at: row.at.toISOString() }));
}

/** Steward actions are logged with the steward's number, and can be reversed the same way. */
export async function stewardSetHidden(db: Database, runId: string, steward: Contributor, hidden: boolean, reason: string): Promise<Result<null>> {
  if (steward.trust !== 'steward') return fail(403, 'Only stewards can do this.');
  const [row] = await db.select().from(runs).where(eq(runs.id, runId)).limit(1);
  if (!row || row.status === 'withdrawn') return fail(404, 'Run not found.');
  await db.transaction(async tx => {
    await tx.update(runs).set({ meta: { ...row.meta, stewardHidden: hidden }, updatedAt: new Date() }).where(eq(runs.id, runId));
    await logEvent(tx, { actorId: steward.id, action: hidden ? 'run.hidden' : 'run.restored', subject: `run:${runId}`, detail: { reason } });
    await recompute(tx, runId);
  });
  return { ok: true, value: null };
}

