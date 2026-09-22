import { NextResponse, type NextRequest } from 'next/server';
import { getDb, type Database } from './db/client';
import { hashIp } from './ids';
import { createContributor, findContributorByKey, type Contributor } from './store/contributors';
import { contributorForPerson, getPerson, type Person } from './store/accounts';
import { readSessionValue, SESSION_COOKIE } from './auth';
import { contributors } from './db/schema';
import { eq } from 'drizzle-orm';

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
  /** Who contributions are attributed to. */
  contributor: Contributor | null;
  /** The signed-in account, if any. */
  person: Person | null;
  /** The contributor whose key this browser holds, which may not be the account's. */
  browserContributor: Contributor | null;
  ipHash: string;
}

/** The signed-in person, if the session cookie is valid and hasn't been revoked. */
export async function sessionPerson(db: Database, value: string | undefined): Promise<Person | null> {
  const session = readSessionValue(value);
  if (!session) return null;
  const person = await getPerson(db, session.personId);
  return person && person.sessionVersion === session.version ? person : null;
}

/**
 * Resolves who is asking. A signed-in account uses its own contributor. Until it has one, it keeps
 * using the contributor this browser holds, as long as that contributor doesn't belong to another
 * account. A key for a contributor that was merged away resolves to the one it was merged into.
 */
export async function resolveActor(db: Database, sessionCookie: string | undefined, keyCookie: string | undefined): Promise<Omit<Actor, 'db' | 'ipHash'>> {
  const person = await sessionPerson(db, sessionCookie);
  let browserContributor = await findContributorByKey(db, keyCookie);
  if (browserContributor?.mergedInto) {
    const [target] = await db.select().from(contributors).where(eq(contributors.id, browserContributor.mergedInto)).limit(1);
    browserContributor = target ?? null;
  }
  let contributor = person ? await contributorForPerson(db, person.id) : null;
  if (!contributor && browserContributor && (!person || !browserContributor.personId || browserContributor.personId === person.id)) {
    contributor = browserContributor;
  }
  return { contributor, person, browserContributor };
}

export async function readActor(request: NextRequest): Promise<Actor> {
  const db = await getDb();
  const resolved = await resolveActor(db, request.cookies.get(SESSION_COOKIE)?.value, request.cookies.get(KEY_COOKIE)?.value);
  return { db, ...resolved, ipHash: hashIp(clientIp(request)) };
}

/**
 * Returns the contributor, creating a pseudonymous one on first contribution. A signed-in person's new
 * contributor belongs to their account from the start, so no recovery key is needed or shown.
 */
export async function ensureContributor(actor: Actor): Promise<{ contributor: Contributor; newKey: string | null }> {
  if (actor.contributor) return { contributor: actor.contributor, newKey: null };
  const created = await createContributor(actor.db, actor.person?.id ?? null);
  return { contributor: created.contributor, newKey: actor.person ? null : created.key };
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
