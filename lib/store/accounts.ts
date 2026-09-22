import { and, eq, gt, isNull, ne, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { contributors, loginTokens, people, proposalSupport, proposals, runs, verifications, workReviews, works } from '../db/schema';
import { createLoginToken, hashLoginToken, LOGIN_TOKEN_MINUTES } from '../auth';
import { logEvent } from './log';
import { recompute, type Result } from './runs';
import type { Contributor } from './contributors';
import { REVIEWS_NEEDED } from './works';

export type Person = typeof people.$inferSelect;

export const TOKEN_LIMITS = { perEmailPer15Min: 5, perNetworkPerHour: 20 };

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Issues a sign-in token for an address, within rate limits. Returns the raw token to email, or why not. */
export async function issueLoginToken(db: Database, email: string, ipHash: string): Promise<Result<{ token: string }>> {
  const [byEmail] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(loginTokens)
    .where(and(eq(loginTokens.email, email), sql`${loginTokens.createdAt} > now() - interval '15 minutes'`));
  const [byNetwork] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(loginTokens)
    .where(and(eq(loginTokens.ipHash, ipHash), sql`${loginTokens.createdAt} > now() - interval '1 hour'`));
  if ((byEmail?.n ?? 0) >= TOKEN_LIMITS.perEmailPer15Min || (byNetwork?.n ?? 0) >= TOKEN_LIMITS.perNetworkPerHour) {
    return { ok: false, status: 429, error: 'Too many sign-in links were requested. Please wait a little and try again.' };
  }
  const { token, tokenHash } = createLoginToken();
  await db.insert(loginTokens).values({
    tokenHash, email, ipHash, expiresAt: new Date(Date.now() + LOGIN_TOKEN_MINUTES * 60_000),
  });
  return { ok: true, value: { token } };
}

/** Looks a token up without spending it, for the confirmation page. */
export async function peekLoginToken(db: Database, token: string): Promise<string | null> {
  if (!token || token.length > 100) return null;
  const [row] = await db.select({ email: loginTokens.email }).from(loginTokens)
    .where(and(eq(loginTokens.tokenHash, hashLoginToken(token)), isNull(loginTokens.usedAt), gt(loginTokens.expiresAt, new Date())))
    .limit(1);
  return row?.email ?? null;
}

/** Spends a token exactly once. The WHERE clause is the check, so two redemptions can't both succeed. */
export async function consumeLoginToken(db: Database, token: string): Promise<string | null> {
  if (!token || token.length > 100) return null;
  const [row] = await db.update(loginTokens).set({ usedAt: new Date() })
    .where(and(eq(loginTokens.tokenHash, hashLoginToken(token)), isNull(loginTokens.usedAt), gt(loginTokens.expiresAt, new Date())))
    .returning({ email: loginTokens.email });
  return row?.email ?? null;
}

/** Called only after a token delivered to this address was redeemed. */
export async function upsertPerson(db: Database, email: string): Promise<Person> {
  const [person] = await db.insert(people).values({ email, lastSignInAt: new Date() })
    .onConflictDoUpdate({ target: people.email, set: { lastSignInAt: new Date() } })
    .returning();
  return person;
}

export async function getPerson(db: Database, id: string): Promise<Person | null> {
  const [row] = await db.select().from(people).where(eq(people.id, id)).limit(1);
  return row ?? null;
}

export async function contributorForPerson(db: Database | Tx, personId: string): Promise<Contributor | null> {
  const [row] = await db.select().from(contributors).where(eq(contributors.personId, personId)).limit(1);
  return row ?? null;
}

export async function signOutEverywhere(db: Database, personId: string): Promise<void> {
  await db.update(people).set({ sessionVersion: sql`${people.sessionVersion} + 1` }).where(eq(people.id, personId));
}

/**
 * Attaches the contributor this browser holds to the signed-in account, or merges it into the account's
 * existing contributor. Always an explicit request from /me, never a side effect of signing in.
 */
export async function adoptContributor(db: Database, person: Person, browserContributor: Contributor): Promise<Result<{ seq: number; merged: boolean }>> {
  if (browserContributor.mergedInto) return { ok: false, status: 409, error: 'This contributor was already merged into another record.' };
  if (browserContributor.personId && browserContributor.personId !== person.id) {
    return { ok: false, status: 409, error: 'The contributions in this browser already belong to another account.' };
  }
  if (browserContributor.personId === person.id) return { ok: true, value: { seq: browserContributor.seq, merged: false } };
  const existing = await contributorForPerson(db, person.id);
  if (!existing) {
    await db.transaction(async tx => {
      await tx.update(contributors).set({ personId: person.id }).where(eq(contributors.id, browserContributor.id));
      await logEvent(tx, { actorId: browserContributor.id, action: 'contributor.kept', subject: `contributor:${browserContributor.seq}` });
    });
    return { ok: true, value: { seq: browserContributor.seq, merged: false } };
  }
  await mergeContributors(db, browserContributor, existing);
  return { ok: true, value: { seq: existing.seq, merged: true } };
}

/**
 * Folds one contributor into another: runs, checks, library work, proposals and support move across.
 * Anything that would now be a person checking or reviewing their own contribution is removed, and the
 * affected runs are re-decided under the usual rules. The old contributor stays (marked as merged) so
 * the public log still makes sense.
 */
export async function mergeContributors(db: Database, from: Contributor, into: Contributor): Promise<number> {
  return db.transaction(async tx => {
    await tx.update(runs).set({ contributorId: into.id }).where(eq(runs.contributorId, from.id));

    // Both identities checked the same run: keep one check.
    await tx.execute(sql`delete from verifications v using verifications w
      where v.contributor_id = ${from.id} and w.contributor_id = ${into.id} and v.run_id = w.run_id`);
    await tx.update(verifications).set({ contributorId: into.id }).where(eq(verifications.contributorId, from.id));

    // After the merge, a check on one's own run is not independent. Remove it and re-decide the run.
    const selfChecks = await tx.execute(sql`delete from verifications v using runs r
      where v.run_id = r.id and v.contributor_id = ${into.id} and r.contributor_id = ${into.id}
      returning v.run_id`);
    const affected = [...new Set(rowsOf(selfChecks).map(row => String(row.run_id)))];
    for (const runId of affected) await recompute(tx, runId);

    await tx.update(works).set({ submittedBy: into.id }).where(eq(works.submittedBy, from.id));
    await tx.execute(sql`delete from work_reviews v using work_reviews w
      where v.contributor_id = ${from.id} and w.contributor_id = ${into.id} and v.work_id = w.work_id`);
    await tx.update(workReviews).set({ contributorId: into.id }).where(eq(workReviews.contributorId, from.id));
    const selfReviews = await tx.execute(sql`delete from work_reviews r using works w
      where r.work_id = w.id and r.contributor_id = ${into.id} and w.submitted_by = ${into.id}
      returning r.work_id`);
    for (const workId of new Set(rowsOf(selfReviews).map(row => String(row.work_id)))) await reopenIfUnsupported(tx, workId);

    await tx.update(proposals).set({ contributorId: into.id }).where(eq(proposals.contributorId, from.id));
    await tx.execute(sql`delete from proposal_support v using proposal_support w
      where v.contributor_id = ${from.id} and w.contributor_id = ${into.id} and v.proposal_id = w.proposal_id`);
    await tx.update(proposalSupport).set({ contributorId: into.id }).where(eq(proposalSupport.contributorId, from.id));

    const trust = from.trust === 'steward' || into.trust === 'steward' ? 'steward' : into.trust;
    const handle = into.handle ?? from.handle;
    await tx.update(contributors).set({ handle: null, personId: null, mergedInto: into.id }).where(eq(contributors.id, from.id));
    await tx.update(contributors).set({ trust, handle }).where(eq(contributors.id, into.id));
    await logEvent(tx, {
      actorId: into.id, action: 'contributor.merged', subject: `contributor:${from.seq}`,
      detail: { into: into.seq, ...(affected.length ? { selfChecksRemoved: affected.length } : {}) },
    });
    return affected.length;
  });
}

/** A listed work whose approvals included a now-removed self-review goes back to review if it no longer qualifies. */
async function reopenIfUnsupported(tx: Tx, workId: string): Promise<void> {
  const [work] = await tx.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.status !== 'listed') return;
  const approvals = await tx.select({ trust: contributors.trust }).from(workReviews)
    .innerJoin(contributors, eq(contributors.id, workReviews.contributorId))
    .where(and(eq(workReviews.workId, workId), eq(workReviews.decision, 'list')));
  if (approvals.length >= REVIEWS_NEEDED || approvals.some(row => row.trust === 'steward')) return;
  await tx.update(works).set({ status: 'pending', listedAt: null }).where(eq(works.id, workId));
  await logEvent(tx, { action: 'work.reopened', subject: `work:${workId}`, detail: { title: work.title } });
}

/** Deletes the account (the email address). Contributions stay public and pseudonymous unless withdrawn. */
export async function deletePerson(db: Database, personId: string): Promise<void> {
  const [person] = await db.select().from(people).where(eq(people.id, personId)).limit(1);
  if (!person) return;
  await db.transaction(async tx => {
    await tx.update(contributors).set({ personId: null }).where(eq(contributors.personId, personId));
    await tx.delete(loginTokens).where(eq(loginTokens.email, person.email));
    await tx.delete(people).where(eq(people.id, personId));
  });
}

/** Runs and checks in a browser-held contributor, to show before asking whether to keep them. */
export async function contributionCounts(db: Database, contributorId: string): Promise<{ runs: number; checks: number }> {
  const [r] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(runs).where(and(eq(runs.contributorId, contributorId), ne(runs.status, 'withdrawn')));
  const [c] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(verifications).where(eq(verifications.contributorId, contributorId));
  return { runs: r?.n ?? 0, checks: c?.n ?? 0 };
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const rows = (result as { rows?: unknown })?.rows;
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
}
