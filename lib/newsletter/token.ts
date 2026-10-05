import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The link in a confirmation email. It carries the address and the day it was made, signed with a key derived
 * from the Resend API key, so there is no database and no second secret to set. Clicking the link only opens a page
 * with a button; the subscription happens when the person presses it (see app/subscribe/confirm).
 */

const DAY = 864e5;
/** The link works from the day it was made until this many full days later. */
export const CONFIRM_DAYS = 3;

const subkey = (apiKey: string) => createHmac('sha256', apiKey).update('ctrlai/newsletter/confirm/v1').digest();
const mac = (apiKey: string, body: string) => createHmac('sha256', subkey(apiKey)).update(body).digest('base64url');

/** The same address on the same UTC day gives the same token, so asking twice does not send a second email. */
export function signConfirmToken(apiKey: string, email: string, now: number = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ e: email, d: Math.floor(now / DAY) })).toString('base64url');
  return `${body}.${mac(apiKey, body)}`;
}

export type TokenResult = { ok: true; email: string } | { ok: false; reason: 'malformed' | 'invalid' | 'expired' };

export function verifyConfirmToken(apiKey: string, token: string, now: number = Date.now()): TokenResult {
  const [body, signature, ...rest] = token.split('.');
  if (!body || !signature || rest.length > 0) return { ok: false, reason: 'malformed' };
  const expected = Buffer.from(mac(apiKey, body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: 'invalid' };
  let parsed: { e?: unknown; d?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof parsed.e !== 'string' || typeof parsed.d !== 'number') return { ok: false, reason: 'malformed' };
  if (Math.floor(now / DAY) - parsed.d > CONFIRM_DAYS) return { ok: false, reason: 'expired' };
  return { ok: true, email: parsed.e };
}
