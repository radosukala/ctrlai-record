import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Optional accounts, ported from the sibling ctrlai-audit repository because its security properties
 * are the load-bearing part:
 *
 *   - the emailed token is random, only its SHA-256 hash is stored, it expires in 30 minutes,
 *     and it is redeemed exactly once in a single UPDATE whose WHERE clause is the check;
 *   - typing an address proves nothing: only redeeming a token delivered to it creates an account;
 *   - the session is an HMAC over `personId.version.expiry`, compared in constant time, and
 *     bumping the person's session version signs out every device;
 *   - redeeming a link never hands this browser's contributions to the account. That is a separate,
 *     explicit step on /me, taken after the person has seen which address they are signed in as.
 *     (A link is all an attacker needs to sign a victim into the attacker's account; if sign-in
 *     adopted the victim's runs, one click would transfer them.)
 */

export const SESSION_COOKIE = 'ctrl_session';
export const SESSION_DAYS = 60;
export const LOGIN_TOKEN_MINUTES = 30;

function secret(purpose: string): string {
  const base = process.env.CTRL_SECRET ?? (process.env.NODE_ENV === 'production' ? '' : 'local-development');
  if (!base) throw new Error('CTRL_SECRET must be set in production');
  return createHash('sha256').update(`${base}:${purpose}`).digest('hex');
}

export function cleanEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length < 6 || trimmed.length > 254) return null;
  if (!/^[^\s@,;:<>"]+@[^\s@,;:<>".]+(\.[^\s@,;:<>".]+)*\.[a-z]{2,}$/.test(trimmed)) return null;
  return trimmed;
}

/** "rado@example.com" → "r•••@example.com". Enough to recognize your own address, not to learn someone else's. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}•••@${domain}`;
}

export function createLoginToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashLoginToken(token) };
}

export function hashLoginToken(token: string): string {
  return createHash('sha256').update(`login:${token}`).digest('hex');
}

function sign(payload: string): string {
  return createHmac('sha256', secret('session-v1')).update(payload).digest('base64url');
}

export function sessionValue(personId: string, version: number, now = Date.now()): string {
  const payload = `${personId}.${version}.${now + SESSION_DAYS * 86_400_000}`;
  return `${payload}.${sign(payload)}`;
}

/** Verifies shape, expiry and signature. The caller still checks the version against the database. */
export function readSessionValue(value: string | undefined | null, now = Date.now()): { personId: string; version: number } | null {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  const [personId, version, expiry, signature] = parts;
  if (!/^[0-9a-f-]{36}$/.test(personId) || !/^\d{1,9}$/.test(version) || !/^\d{13}$/.test(expiry)) return null;
  if (Number(expiry) < now) return null;
  const expected = Buffer.from(sign(`${personId}.${version}.${expiry}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return { personId, version: Number(version) };
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

/** Same-origin paths only. Anything else, including `//evil.example`, falls back to /me. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== 'string') return '/me';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || value.length > 200) return '/me';
  return value;
}
