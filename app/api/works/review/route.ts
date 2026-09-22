import { NextResponse, type NextRequest } from 'next/server';
import { ensureContributor, jsonError, readActor, readJson, sameOrigin, withKey } from '@/lib/http';
import { nextWorkToReview, reviewWork } from '@/lib/store/works';

export async function GET(request: NextRequest) {
  const actor = await readActor(request);
  const work = await nextWorkToReview(actor.db, actor.contributor?.id ?? null);
  if (!work) return NextResponse.json({ work: null }, { headers: { 'Cache-Control': 'no-store' } });
  const { ipHash: _ip, submittedBy, ...rest } = work;
  return NextResponse.json({ work: { ...rest, yours: Boolean(actor.contributor && submittedBy === actor.contributor.id) } }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return jsonError(403, 'Review from this site.');
  const body = await readJson<{ workId?: string; decision?: 'list' | 'reject'; reason?: string }>(request);
  if (!body) return jsonError(400, 'Send the review as JSON.');
  const actor = await readActor(request);
  const { contributor, newKey } = await ensureContributor(actor);
  const result = await reviewWork(actor.db, String(body.workId ?? ''), contributor, body.decision as 'list' | 'reject', String(body.reason ?? ''));
  if (!result.ok) return withKey({ error: result.error }, newKey, result.status);
  return withKey(result.value, newKey);
}
