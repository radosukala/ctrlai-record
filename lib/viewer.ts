import { cookies } from 'next/headers';
import { getDb } from './db/client';
import { findContributorByKey, type Contributor } from './store/contributors';
import { KEY_COOKIE } from './http';

/** The contributor viewing a server-rendered page, if they have contributed from this browser. */
export async function currentContributor(): Promise<Contributor | null> {
  const store = await cookies();
  const key = store.get(KEY_COOKIE)?.value;
  if (!key) return null;
  return findContributorByKey(await getDb(), key);
}
