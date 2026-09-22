import { NextResponse, type NextRequest } from 'next/server';
import { cleanEmail, safeNextPath } from '@/lib/auth';
import { emailConfigured, sendSignInEmail } from '@/lib/email';
import { clientIp, jsonError, readJson, sameOrigin } from '@/lib/http';
import { getDb } from '@/lib/db/client';
import { hashIp } from '@/lib/ids';
import { issueLoginToken } from '@/lib/store/accounts';
import { SITE } from '@/lib/site';

/**
 * Sends a sign-in link. Anyone may create an account, so any valid address gets one, within rate limits.
 * The response is the same whether or not the address has been here before.
 * The token travels in the URL fragment, so it never reaches server logs, referrers or link scanners.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return jsonError(403, 'Sign in from this site.');
  const body = await readJson<{ email?: unknown; next?: unknown }>(request);
  const email = cleanEmail(body?.email);
  if (!email) return jsonError(400, 'Enter a valid email address.');
  const production = process.env.NODE_ENV === 'production';
  if (production && !emailConfigured()) return jsonError(503, 'Email sign-in isn’t switched on yet. Please try again soon.');
  try {
    const db = await getDb();
    const issued = await issueLoginToken(db, email, hashIp(clientIp(request)));
    if (!issued.ok) return jsonError(issued.status, issued.error);
    const origin = production ? SITE.url : request.nextUrl.origin;
    const next = safeNextPath(body?.next);
    const url = `${origin}/signin/confirm#token=${encodeURIComponent(issued.value.token)}&next=${encodeURIComponent(next)}`;
    if (emailConfigured()) {
      const sent = await sendSignInEmail({ to: email, url });
      if (!sent) return jsonError(502, 'The email could not be sent. Please try again in a minute.');
    } else {
      // Local development without an email provider: print the link instead of sending it.
      console.log(`[auth] development sign-in link: ${url}`);
    }
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // The type, never the error: a driver's message can quote the address.
    console.error(`[auth] request failed: ${error instanceof Error ? error.constructor.name : typeof error}`);
    return jsonError(500, 'The sign-in link could not be sent.');
  }
}
