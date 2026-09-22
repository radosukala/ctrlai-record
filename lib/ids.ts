import { createHash, randomBytes } from 'node:crypto';

// Crockford base32: no I, L, O or U, so IDs are easy to read aloud and type.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function shortId(length = 8): string {
  const bytes = randomBytes(length);
  let id = '';
  for (let i = 0; i < length; i++) id += ALPHABET[bytes[i] % 32];
  return id;
}

export function isShortId(value: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{8}$/.test(value);
}

export function newSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Network fingerprints are only used to stop someone verifying their own runs from the same
 * connection, and for rate limits. They are salted with a server secret and never shown.
 */
export function hashIp(ip: string): string {
  const salt = process.env.CTRL_SECRET ?? (process.env.NODE_ENV === 'production' ? '' : 'local-development');
  if (!salt) throw new Error('CTRL_SECRET must be set in production');
  return sha256(`${salt}:ip:${ip}`).slice(0, 32);
}
