import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { and, asc, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import { isUniqueViolation, type Database } from '../db/client';
import { contributors, workReviews, works } from '../db/schema';
import { shortId } from '../ids';
import { QUESTION_IDS } from '@/content/questions';
import { logEvent } from './log';
import type { Contributor } from './contributors';
import type { Result } from './runs';

export const WORK_TYPES = [
  'paper', 'report', 'article', 'essay', 'video', 'podcast', 'book', 'course',
  'newsletter', 'organization', 'tool', 'incident', 'policy', 'statement',
] as const;
export type WorkType = typeof WORK_TYPES[number];

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  paper: 'Research paper', report: 'Report', article: 'Article', essay: 'Essay', video: 'Video',
  podcast: 'Podcast', book: 'Book', course: 'Course', newsletter: 'Newsletter', organization: 'Organization',
  tool: 'Tool or dataset', incident: 'Incident', policy: 'Law or policy', statement: 'Statement or letter',
};

export const LEVELS = ['everyone', 'curious', 'technical'] as const;
export const LEVEL_LABELS: Record<typeof LEVELS[number], string> = {
  everyone: 'For everyone', curious: 'For the curious', technical: 'Technical',
};

export interface SeedWork {
  id: string;
  url: string;
  title: string;
  creators?: string;
  publisher?: string;
  date?: string;
  type: string;
  questions: string[];
  level?: string;
  summary: string;
  caveat?: string;
  key?: boolean;
  verified?: string;
}

export type Work = typeof works.$inferSelect;

/** Removes tracking parameters, fragments and trailing slashes so one work has one URL. */
export function normalizeUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password) return null;
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|mc_|ref$|ref_src|s$|si$)/i.test(key)) url.searchParams.delete(key);
  }
  url.hostname = url.hostname.toLowerCase();
  let out = url.toString();
  if (out.endsWith('/') && url.pathname !== '/') out = out.slice(0, -1);
  return out;
}

let seeding: Promise<void> | null = null;

/** Loads content/library.json. Seed entries are updated in place when the file changes. */
export function seedLibrary(db: Database): Promise<void> {
  seeding ??= (async () => {
    const file = path.join(process.cwd(), 'content', 'library.json');
    let items: SeedWork[] = [];
    try {
      items = JSON.parse(await readFile(file, 'utf8')) as SeedWork[];
    } catch {
      return;
    }
    for (const item of items) {
      const url = normalizeUrl(item.url);
      if (!url || !item.id || !item.title || !item.summary) continue;
      const values = {
        url,
        title: item.title,
        creators: item.creators ?? '',
        publisher: item.publisher ?? '',
        published: item.date ?? '',
        type: (WORK_TYPES as readonly string[]).includes(item.type) ? item.type : 'article',
        questions: item.questions.filter(q => (QUESTION_IDS as string[]).includes(q)),
        level: (LEVELS as readonly string[]).includes(item.level ?? '') ? item.level! : 'curious',
        summary: item.summary,
        caveat: item.caveat ?? '',
        key: Boolean(item.key),
        checkedOn: item.verified ?? '',
      };
      try {
        await db.insert(works).values({ id: item.id, ...values, status: 'listed', source: 'seed', listedAt: new Date() })
          .onConflictDoUpdate({ target: works.id, set: values, setWhere: sql`${works.source} = 'seed'` });
      } catch {
        // A community submission already holds this URL; keep theirs.
      }
    }
  })().finally(() => { seeding = null; });
  return seeding;
}

export interface WorkFilter {
  question?: string;
  type?: string;
  level?: string;
  q?: string;
  keyOnly?: boolean;
  limit?: number;
}

export async function listWorks(db: Database, filter: WorkFilter = {}): Promise<Work[]> {
  const conditions = [eq(works.status, 'listed')];
  if (filter.question) conditions.push(sql`${works.questions} @> ${JSON.stringify([filter.question])}::jsonb`);
  if (filter.type) conditions.push(eq(works.type, filter.type));
  if (filter.level) conditions.push(eq(works.level, filter.level));
  if (filter.keyOnly) conditions.push(eq(works.key, true));
  if (filter.q) {
    const term = `%${filter.q.replace(/[%_\\]/g, '')}%`;
    conditions.push(or(ilike(works.title, term), ilike(works.summary, term), ilike(works.creators, term), ilike(works.publisher, term))!);
  }
  return db.select().from(works).where(and(...conditions))
    .orderBy(desc(works.key), desc(works.published), asc(works.title))
    .limit(Math.min(filter.limit ?? 500, 1000));
}

export async function workCounts(db: Database) {
  const rows = await db.select({ type: works.type, n: sql<number>`count(*)`.mapWith(Number) })
    .from(works).where(eq(works.status, 'listed')).groupBy(works.type);
  return Object.fromEntries(rows.map(row => [row.type, row.n])) as Record<string, number>;
}

export interface WorkInput {
  url: string;
  title: string;
  creators?: string;
  publisher?: string;
  published?: string;
  type: string;
  questions: string[];
  level?: string;
  summary: string;
}

export async function submitWork(db: Database, input: WorkInput, contributor: Contributor, ipHash: string): Promise<Result<{ id: string; existing: boolean }>> {
  const url = normalizeUrl(input.url ?? '');
  if (!url) return { ok: false, status: 400, error: 'Enter a valid web address.' };
  const title = (input.title ?? '').trim();
  const summary = (input.summary ?? '').trim();
  if (title.length < 3 || title.length > 200) return { ok: false, status: 400, error: 'Give the title as published (3–200 characters).' };
  if (summary.length < 20 || summary.length > 240) return { ok: false, status: 400, error: 'Write one sentence (20–240 characters) on what it shows and why it matters.' };
  if (!(WORK_TYPES as readonly string[]).includes(input.type)) return { ok: false, status: 400, error: 'Choose what kind of work it is.' };
  const questions = (input.questions ?? []).filter(q => (QUESTION_IDS as string[]).includes(q));
  if (!questions.length) return { ok: false, status: 400, error: 'Choose at least one question it helps answer.' };
  if (input.published && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(input.published)) return { ok: false, status: 400, error: 'Use a date like 2026, 2026-07 or 2026-07-21.' };
  const [existing] = await db.select({ id: works.id, status: works.status }).from(works).where(eq(works.url, url)).limit(1);
  if (existing) return { ok: true, value: { id: existing.id, existing: true } };
  const [recent] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(works)
    .where(and(eq(works.ipHash, ipHash), sql`${works.createdAt} > now() - interval '1 hour'`));
  if ((recent?.n ?? 0) >= 20) return { ok: false, status: 429, error: 'Please come back in a little while to add more.' };
  const slug = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'work';
  const id = `${slug}-${shortId(4).toLowerCase()}`;
  await db.transaction(async tx => {
    await tx.insert(works).values({
      id, url, title, summary, type: input.type, questions,
      creators: (input.creators ?? '').trim().slice(0, 160),
      publisher: (input.publisher ?? '').trim().slice(0, 120),
      published: input.published ?? '',
      level: (LEVELS as readonly string[]).includes(input.level ?? '') ? input.level! : 'curious',
      status: 'pending', source: 'community', submittedBy: contributor.id, ipHash,
    });
    await logEvent(tx, { actorId: contributor.id, action: 'work.added', subject: `work:${id}`, detail: { title } });
  });
  return { ok: true, value: { id, existing: false } };
}

export async function nextWorkToReview(db: Database, contributorId: string | null): Promise<Work | null> {
  const conditions = [eq(works.status, 'pending')];
  if (contributorId) {
    conditions.push(sql`(${works.submittedBy} is null or ${works.submittedBy} <> ${contributorId})`);
    conditions.push(sql`not exists (select 1 from ${workReviews} r where r.work_id = ${works.id} and r.contributor_id = ${contributorId})`);
  }
  const [row] = await db.select().from(works).where(and(...conditions)).orderBy(asc(works.createdAt)).limit(1);
  return row ?? null;
}

export async function pendingWorkCount(db: Database): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(works).where(eq(works.status, 'pending'));
  return row?.n ?? 0;
}

export const REVIEWS_NEEDED = 2;

export async function reviewWork(db: Database, workId: string, reviewer: Contributor, decision: 'list' | 'reject', reason: string): Promise<Result<{ status: string }>> {
  if (decision !== 'list' && decision !== 'reject') return { ok: false, status: 400, error: 'Choose to list or decline.' };
  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.status !== 'pending') return { ok: false, status: 404, error: 'This work is not waiting for review.' };
  if (work.submittedBy === reviewer.id) return { ok: false, status: 403, error: 'Someone else needs to review what you added.' };
  try {
    const status = await db.transaction(async tx => {
      await tx.insert(workReviews).values({ workId, contributorId: reviewer.id, decision, reason: reason.trim().slice(0, 300) });
      await logEvent(tx, { actorId: reviewer.id, action: 'work.reviewed', subject: `work:${workId}`, detail: { decision } });
      const rows = await tx.select({ decision: workReviews.decision, trust: contributors.trust })
        .from(workReviews).innerJoin(contributors, eq(contributors.id, workReviews.contributorId))
        .where(and(eq(workReviews.workId, workId), ne(workReviews.contributorId, work.submittedBy ?? '00000000-0000-0000-0000-000000000000')));
      const steward = reviewer.trust === 'steward';
      const lists = rows.filter(row => row.decision === 'list').length;
      const rejects = rows.filter(row => row.decision === 'reject').length;
      let next = 'pending';
      if ((steward && decision === 'list') || (lists >= REVIEWS_NEEDED && lists > rejects)) next = 'listed';
      else if ((steward && decision === 'reject') || (rejects >= REVIEWS_NEEDED && rejects >= lists)) next = 'rejected';
      if (next !== 'pending') {
        await tx.update(works).set({ status: next, listedAt: next === 'listed' ? new Date() : null }).where(eq(works.id, workId));
        await logEvent(tx, { action: next === 'listed' ? 'work.listed' : 'work.declined', subject: `work:${workId}`, detail: { title: work.title } });
      }
      return next;
    });
    return { ok: true, value: { status } };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, status: 409, error: 'You have already reviewed this.' };
    throw error;
  }
}
