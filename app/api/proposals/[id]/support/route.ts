import type { NextRequest } from 'next/server';
import { ensureContributor, jsonError, readActor, sameOrigin, withKey } from '@/lib/http';
import { supportProposal } from '@/lib/store/proposals';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, 'Support proposals from this site.');
  const { id } = await params;
  const actor = await readActor(request);
  const { contributor, newKey } = await ensureContributor(actor);
  const result = await supportProposal(actor.db, id, contributor);
  if (!result.ok) return withKey({ error: result.error }, newKey, result.status);
  return withKey(result.value, newKey);
}
