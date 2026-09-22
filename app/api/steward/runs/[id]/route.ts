import { NextResponse, type NextRequest } from 'next/server';
import { jsonError, readActor, readJson, sameOrigin } from '@/lib/http';
import { stewardSetHidden } from '@/lib/store/runs';

/** Stewards can hide a run (e.g. personal information) or restore it. Both are logged publicly with a reason. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, 'Moderate from this site.');
  const { id } = await params;
  const body = await readJson<{ hidden?: boolean; reason?: string }>(request);
  const reason = String(body?.reason ?? '').trim();
  if (!body || typeof body.hidden !== 'boolean' || reason.length < 5) return jsonError(400, 'Give a reason; it is published in the log.');
  const actor = await readActor(request);
  // Steward powers need a signed-in account, not only a browser key.
  if (!actor.person || !actor.contributor || actor.contributor.personId !== actor.person.id) return jsonError(403, 'Stewards need to be signed in to do this.');
  const result = await stewardSetHidden(actor.db, id, actor.contributor, body.hidden, reason.slice(0, 300));
  if (!result.ok) return jsonError(result.status, result.error);
  return NextResponse.json({ ok: true });
}
