import { cookies } from 'next/headers';
import { getDb } from './db/client';
import type { Contributor } from './store/contributors';
import type { Person } from './store/accounts';
import { KEY_COOKIE, resolveActor } from './http';
import { SESSION_COOKIE } from './auth';

export interface Viewer {
  contributor: Contributor | null;
  person: Person | null;
  browserContributor: Contributor | null;
}

/** Who is viewing a server-rendered page: their account (if signed in) and contributor (if any). */
export async function currentViewer(): Promise<Viewer> {
  const store = await cookies();
  return resolveActor(await getDb(), store.get(SESSION_COOKIE)?.value, store.get(KEY_COOKIE)?.value);
}

export async function currentContributor(): Promise<Contributor | null> {
  return (await currentViewer()).contributor;
}
