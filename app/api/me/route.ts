import { NextResponse, type NextRequest } from 'next/server';
import { jsonError, readActor, readJson, sameOrigin } from '@/lib/http';
import { contributorStats, earnedBadges, setHandle } from '@/lib/store/contributors';

export async function GET(request: NextRequest) {
  const actor = await readActor(request);
  if (!actor.contributor) return NextResponse.json({ contributor: null }, { headers: { 'Cache-Control': 'no-store' } });
  const stats = await contributorStats(actor.db, actor.contributor.id);
  const { seq, handle, trust, createdAt } = actor.contributor;
  return NextResponse.json({ contributor: { seq, handle, trust, createdAt, stats, badges: earnedBadges(actor.contributor, stats) } }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) return jsonError(403, 'Change your name from this site.');
  const body = await readJson<{ handle?: string }>(request);
  if (!body) return jsonError(400, 'Send JSON.');
  const actor = await readActor(request);
  if (!actor.contributor) return jsonError(403, 'Contribute something first; your name is attached to your contributions.');
  const result = await setHandle(actor.db, actor.contributor.id, String(body.handle ?? ''));
  if (!result.ok) return jsonError(400, result.error);
  return NextResponse.json({ ok: true });
}
