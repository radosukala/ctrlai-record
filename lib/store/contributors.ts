import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { contributors, runs, verifications, works } from '../db/schema';
import { newSecret, sha256 } from '../ids';

export type Contributor = typeof contributors.$inferSelect;

export const HANDLE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{1,29}$/;
const RESERVED = new Set(['admin', 'ctrl', 'ctrlai', 'steward', 'stewards', 'moderator', 'system', 'anthropic', 'openai', 'google', 'deepmind', 'xai', 'meta', 'deepseek']);

export function keyHash(key: string): string {
  return sha256(`contributor:${key}`);
}

export async function findContributorByKey(db: Database, key: string | undefined | null): Promise<Contributor | null> {
  if (!key || key.length < 20 || key.length > 100) return null;
  const [row] = await db.select().from(contributors).where(eq(contributors.keyHash, keyHash(key))).limit(1);
  return row ?? null;
}

export async function createContributor(db: Database): Promise<{ contributor: Contributor; key: string }> {
  const key = newSecret();
  const [contributor] = await db.insert(contributors).values({ keyHash: keyHash(key) }).returning();
  return { contributor, key };
}

export function displayName(contributor: { seq: number; handle: string | null }): string {
  return contributor.handle ? contributor.handle : `Contributor #${contributor.seq}`;
}

export type HandleResult = { ok: true } | { ok: false; error: string };

export async function setHandle(db: Database, contributorId: string, raw: string): Promise<HandleResult> {
  const handle = raw.trim();
  if (!handle) {
    await db.update(contributors).set({ handle: null }).where(eq(contributors.id, contributorId));
    return { ok: true };
  }
  if (!HANDLE_PATTERN.test(handle)) return { ok: false, error: 'Use 2–30 letters, numbers, dots, dashes or underscores, starting with a letter or number.' };
  if (RESERVED.has(handle.toLowerCase())) return { ok: false, error: 'That name is reserved. Please choose another.' };
  const [taken] = await db.select({ id: contributors.id }).from(contributors)
    .where(and(sql`lower(${contributors.handle}) = ${handle.toLowerCase()}`, sql`${contributors.id} <> ${contributorId}`)).limit(1);
  if (taken) return { ok: false, error: 'That name is taken.' };
  await db.update(contributors).set({ handle }).where(eq(contributors.id, contributorId));
  return { ok: true };
}

export interface ContributorStats {
  runs: number;
  verifiedRuns: number;
  checks: number;
  settledChecks: number;
  agreedChecks: number;
  worksListed: number;
}

export async function contributorStats(db: Database, contributorId: string): Promise<ContributorStats> {
  const [runRow] = await db.select({
    runs: sql<number>`count(*) filter (where ${runs.status} not in ('withdrawn'))`.mapWith(Number),
    verifiedRuns: sql<number>`count(*) filter (where ${runs.status} = 'verified')`.mapWith(Number),
  }).from(runs).where(eq(runs.contributorId, contributorId));
  const [checkRow] = await db.select({
    checks: sql<number>`count(*)`.mapWith(Number),
    settled: sql<number>`count(*) filter (where ${runs.consensusOutcome} is not null and ${verifications.outcome} is not null)`.mapWith(Number),
    agreed: sql<number>`count(*) filter (where ${runs.consensusOutcome} is not null and ${verifications.outcome} = ${runs.consensusOutcome})`.mapWith(Number),
  }).from(verifications).innerJoin(runs, eq(runs.id, verifications.runId)).where(eq(verifications.contributorId, contributorId));
  const [workRow] = await db.select({ listed: sql<number>`count(*)`.mapWith(Number) })
    .from(works).where(and(eq(works.submittedBy, contributorId), eq(works.status, 'listed')));
  return {
    runs: runRow?.runs ?? 0,
    verifiedRuns: runRow?.verifiedRuns ?? 0,
    checks: checkRow?.checks ?? 0,
    settledChecks: checkRow?.settled ?? 0,
    agreedChecks: checkRow?.agreed ?? 0,
    worksListed: workRow?.listed ?? 0,
  };
}

/** A contributor earns the verifier badge through checks that agree with the eventual consensus. */
export function earnedBadges(contributor: Contributor, stats: ContributorStats): string[] {
  const badges: string[] = [];
  if (contributor.seq <= 100) badges.push('Founding contributor');
  if (stats.settledChecks >= 10 && stats.agreedChecks / stats.settledChecks >= 0.8) badges.push('Trusted verifier');
  if (contributor.trust === 'steward') badges.push('Steward');
  return badges;
}
