import { NextResponse, type NextRequest } from 'next/server';
import { jsonError, readActor, readJson, sameOrigin, setKeyCookie } from '@/lib/http';
import { findContributorByKey } from '@/lib/store/contributors';

/** Restores a contributor identity on a new device from a saved recovery key. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return jsonError(403, 'Restore from this site.');
  const body = await readJson<{ key?: string }>(request);
  const key = String(body?.key ?? '').trim();
  const actor = await readActor(request);
  const contributor = await findContributorByKey(actor.db, key);
  if (!contributor) return jsonError(404, 'That key doesn’t match any contributor.');
  const response = NextResponse.json({ seq: contributor.seq, handle: contributor.handle });
  setKeyCookie(response, key);
  return response;
}
