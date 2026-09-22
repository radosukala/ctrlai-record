import { NextResponse, type NextRequest } from 'next/server';
import { getDb, type Database } from './db/client';
import { hashIp } from './ids';
import { createContributor, findContributorByKey, type Contributor } from './store/contributors';

export const KEY_COOKIE = 'ctrl_key';
const TWO_YEARS = 60 * 60 * 24 * 365 * 2;

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Writes must come from this site. Combined with SameSite cookies this blocks cross-site forgery. */
export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return request.headers.get('sec-fetch-site') !== 'cross-site';
  const allowed = new Set<string>();
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (host) {
    allowed.add(`https://${host}`);
    allowed.add(`http://${host}`);
  }
  if (process.env.PUBLIC_ORIGIN) allowed.add(process.env.PUBLIC_ORIGIN.replace(/\/$/, ''));
  return allowed.has(origin);
}

export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'local';
}

export interface Actor {
  db: Database;
  contributor: Contributor | null;
  ipHash: string;
}

export async function readActor(request: NextRequest): Promise<Actor> {
  const db = await getDb();
  const contributor = await findContributorByKey(db, request.cookies.get(KEY_COOKIE)?.value);
  return { db, contributor, ipHash: hashIp(clientIp(request)) };
}

/** Returns the contributor, creating a pseudonymous one on first contribution. */
export async function ensureContributor(actor: Actor): Promise<{ contributor: Contributor; newKey: string | null }> {
  if (actor.contributor) return { contributor: actor.contributor, newKey: null };
  const created = await createContributor(actor.db);
  return { contributor: created.contributor, newKey: created.key };
}

export function withKey<T>(body: T, newKey: string | null, status = 200) {
  const response = NextResponse.json(newKey ? { ...body, recoveryKey: newKey } : body, { status, headers: { 'Cache-Control': 'no-store' } });
  if (newKey) setKeyCookie(response, newKey);
  return response;
}

export function setKeyCookie(response: NextResponse, key: string) {
  response.cookies.set(KEY_COOKIE, key, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TWO_YEARS,
  });
}

export async function readJson<T>(request: NextRequest): Promise<T | null> {
  const type = request.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) return null;
  const text = await request.text();
  if (text.length > 64_000) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : null;
  } catch {
    return null;
  }
}
