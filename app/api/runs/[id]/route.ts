import { NextResponse, type NextRequest } from 'next/server';
import { jsonError, readActor, sameOrigin } from '@/lib/http';
import { getRun, withdrawRun } from '@/lib/store/runs';
import { isShortId } from '@/lib/ids';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isShortId(id)) return jsonError(404, 'Run not found.');
  const actor = await readActor(request);
  const run = await getRun(actor.db, id);
  if (!run) return jsonError(404, 'Run not found.');
  const { contributorId: _hidden, ...publicRun } = run;
  return NextResponse.json(publicRun, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=30' } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, 'Withdraw runs from this site.');
  const { id } = await params;
  const actor = await readActor(request);
  if (!actor.contributor) return jsonError(403, 'Only the person who added a run can withdraw it, from the browser they used.');
  const result = await withdrawRun(actor.db, id, actor.contributor.id);
  if (!result.ok) return jsonError(result.status, result.error);
  return NextResponse.json({ status: 'withdrawn' });
}
