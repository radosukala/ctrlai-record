import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { jsonError, KEY_COOKIE, readActor, sameOrigin } from '@/lib/http';
import { signOutEverywhere } from '@/lib/store/accounts';

/**
 * Signs this browser out, and forgets the contributor key it holds, so a shared computer no longer acts as
 * you. With ?everywhere=1, every device's session ends too.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return jsonError(403, 'Sign out from this site.');
  const everywhere = request.nextUrl.searchParams.get('everywhere') === '1';
  if (everywhere) {
    const actor = await readActor(request);
    if (actor.person) await signOutEverywhere(actor.db, actor.person.id);
  }
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  response.cookies.set(KEY_COOKIE, '', sessionCookieOptions(0));
  return response;
}
