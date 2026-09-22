import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { jsonError, readActor, readJson, sameOrigin } from '@/lib/http';
import { deletePerson } from '@/lib/store/accounts';
import { listRuns, withdrawRun } from '@/lib/store/runs';

/**
 * Deletes the account: the email address and every sign-in link issued to it.
 * Contributions stay in the public record under the contributor number, unless { withdrawRuns: true },
 * in which case every run is withdrawn first (each withdrawal is logged, as always).
 */
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return jsonError(403, 'Do this from this site.');
  const body = await readJson<{ withdrawRuns?: unknown }>(request);
  const actor = await readActor(request);
  if (!actor.person) return jsonError(401, 'Sign in first.');
  if (body?.withdrawRuns === true && actor.contributor && actor.contributor.personId === actor.person.id) {
    const mine = await listRuns(actor.db, { contributorId: actor.contributor.id, limit: 500 });
    for (const run of mine) await withdrawRun(actor.db, run.id, actor.contributor.id);
  }
  await deletePerson(actor.db, actor.person.id);
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  return response;
}
