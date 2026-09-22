import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, SESSION_DAYS, safeNextPath, sessionCookieOptions, sessionValue } from '@/lib/auth';
import { jsonError, readJson, sameOrigin } from '@/lib/http';
import { getDb } from '@/lib/db/client';
import { consumeLoginToken, upsertPerson } from '@/lib/store/accounts';

/**
 * Redeems a sign-in link: the only thing that creates an account or a session.
 * It deliberately does not attach this browser's contributions to the account. That happens on /me,
 * as a separate choice, after the person has seen which address they are signed in as.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return jsonError(403, 'Sign in from this site.');
  const body = await readJson<{ token?: unknown; next?: unknown }>(request);
  try {
    const db = await getDb();
    const email = await consumeLoginToken(db, typeof body?.token === 'string' ? body.token : '');
    if (!email) return jsonError(410, 'This link has expired or was already used. Ask for a new one.');
    const person = await upsertPerson(db, email);
    const response = NextResponse.json({ next: safeNextPath(body?.next) }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(SESSION_COOKIE, sessionValue(person.id, person.sessionVersion), sessionCookieOptions(SESSION_DAYS * 86_400));
    return response;
  } catch (error) {
    console.error(`[auth] verify failed: ${error instanceof Error ? error.constructor.name : typeof error}`);
    return jsonError(500, 'Signing in failed. Please try the link again.');
  }
}
