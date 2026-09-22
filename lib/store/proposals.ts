import { and, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { contributors, proposalSupport, proposals } from '../db/schema';
import { shortId } from '../ids';
import { QUESTION_IDS } from '@/content/questions';
import { logEvent } from './log';
import type { Contributor } from './contributors';
import type { Result } from './runs';

export interface ProposalInput {
  title: string;
  questionId: string;
  prompt: string;
  outcomes: string;
  why: string;
  sources?: string;
}

export interface PublicProposal {
  id: string;
  title: string;
  questionId: string;
  prompt: string;
  outcomes: string;
  why: string;
  sources: string;
  status: string;
  createdAt: string;
  author: { seq: number; handle: string | null };
  support: number;
}

export async function createProposal(db: Database, input: ProposalInput, contributor: Contributor, ipHash: string): Promise<Result<{ id: string }>> {
  const title = (input.title ?? '').trim();
  const prompt = (input.prompt ?? '').trim();
  const outcomes = (input.outcomes ?? '').trim();
  const why = (input.why ?? '').trim();
  if (title.length < 8 || title.length > 120) return { ok: false, status: 400, error: 'Give the test a question-style title (8–120 characters).' };
  if (!(QUESTION_IDS as string[]).includes(input.questionId)) return { ok: false, status: 400, error: 'Choose the big question it helps answer.' };
  if (prompt.length < 20 || prompt.length > 2000) return { ok: false, status: 400, error: 'Write the exact message people should send (20–2,000 characters).' };
  if (outcomes.length < 20 || outcomes.length > 1200) return { ok: false, status: 400, error: 'Describe the possible outcomes clearly enough for two strangers to agree (20–1,200 characters).' };
  if (why.length < 20 || why.length > 1200) return { ok: false, status: 400, error: 'Say why this behavior matters (20–1,200 characters).' };
  const [recent] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(proposals)
    .where(and(eq(proposals.ipHash, ipHash), sql`${proposals.createdAt} > now() - interval '1 day'`));
  if ((recent?.n ?? 0) >= 5) return { ok: false, status: 429, error: 'You can propose up to five tests a day.' };
  const id = shortId(6);
  await db.transaction(async tx => {
    await tx.insert(proposals).values({
      id, title, questionId: input.questionId, prompt, outcomes, why,
      sources: (input.sources ?? '').trim().slice(0, 1200), contributorId: contributor.id, ipHash,
    });
    await tx.insert(proposalSupport).values({ proposalId: id, contributorId: contributor.id });
    await logEvent(tx, { actorId: contributor.id, action: 'proposal.added', subject: `proposal:${id}`, detail: { title } });
  });
  return { ok: true, value: { id } };
}

export async function listProposals(db: Database, status = 'open'): Promise<PublicProposal[]> {
  const rows = await db.select({
    proposal: proposals, seq: contributors.seq, handle: contributors.handle,
    support: sql<number>`(select count(*) from proposal_support ps where ps.proposal_id = "proposals"."id")`.mapWith(Number),
  }).from(proposals).innerJoin(contributors, eq(contributors.id, proposals.contributorId))
    .where(eq(proposals.status, status))
    .orderBy(desc(sql`(select count(*) from proposal_support ps where ps.proposal_id = "proposals"."id")`), desc(proposals.createdAt))
    .limit(100);
  return rows.map(row => ({
    id: row.proposal.id, title: row.proposal.title, questionId: row.proposal.questionId,
    prompt: row.proposal.prompt, outcomes: row.proposal.outcomes, why: row.proposal.why,
    sources: row.proposal.sources, status: row.proposal.status, createdAt: row.proposal.createdAt.toISOString(),
    author: { seq: row.seq, handle: row.handle }, support: row.support,
  }));
}

export async function supportProposal(db: Database, id: string, contributor: Contributor): Promise<Result<{ support: number }>> {
  const [proposal] = await db.select({ id: proposals.id, status: proposals.status }).from(proposals).where(eq(proposals.id, id)).limit(1);
  if (!proposal || proposal.status !== 'open') return { ok: false, status: 404, error: 'This proposal is not open.' };
  await db.insert(proposalSupport).values({ proposalId: id, contributorId: contributor.id }).onConflictDoNothing();
  const [row] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(proposalSupport).where(eq(proposalSupport.proposalId, id));
  return { ok: true, value: { support: row?.n ?? 0 } };
}
