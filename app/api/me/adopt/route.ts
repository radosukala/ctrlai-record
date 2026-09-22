import { NextResponse, type NextRequest } from 'next/server';
import { jsonError, readActor, sameOrigin } from '@/lib/http';
import { adoptContributor } from '@/lib/store/accounts';

/** Keeps the contributions this browser holds with the signed-in account. Always an explicit choice. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return jsonError(403, 'Do this from this site.');
  const actor = await readActor(request);
  if (!actor.person) return jsonError(401, 'Sign in first.');
  if (!actor.browserContributor) return jsonError(404, 'This browser holds no contributions to keep.');
  const result = await adoptContributor(actor.db, actor.person, actor.browserContributor);
  if (!result.ok) return jsonError(result.status, result.error);
  return NextResponse.json(result.value, { headers: { 'Cache-Control': 'no-store' } });
}
