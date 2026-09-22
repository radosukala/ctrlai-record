import { NextResponse, type NextRequest } from 'next/server';
import { maskEmail } from '@/lib/auth';
import { jsonError, readJson, sameOrigin } from '@/lib/http';
import { getDb } from '@/lib/db/client';
import { peekLoginToken } from '@/lib/store/accounts';

/** Shows which (masked) address a link signs in to, without spending it. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return jsonError(403, 'Sign in from this site.');
  const body = await readJson<{ token?: unknown }>(request);
  const email = await peekLoginToken(await getDb(), typeof body?.token === 'string' ? body.token : '');
  if (!email) return jsonError(410, 'This link has expired or was already used.');
  return NextResponse.json({ email: maskEmail(email) }, { headers: { 'Cache-Control': 'no-store' } });
}
