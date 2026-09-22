import type { NextRequest } from 'next/server';
import { ensureContributor, jsonError, readActor, readJson, sameOrigin, withKey } from '@/lib/http';
import { addCheck, type CheckInput } from '@/lib/store/runs';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return jsonError(403, 'Checks can only be added from this site.');
  const body = await readJson<Partial<CheckInput>>(request);
  if (!body) return jsonError(400, 'Send the check as JSON.');
  const actor = await readActor(request);
  const { contributor, newKey } = await ensureContributor(actor);
  const result = await addCheck(actor.db, {
    runId: String(body.runId ?? ''),
    receiptCheck: body.receiptCheck as CheckInput['receiptCheck'],
    outcome: typeof body.outcome === 'string' ? body.outcome : null,
    flag: body.flag ?? 'none',
  }, contributor, actor.ipHash);
  if (!result.ok) return withKey({ error: result.error }, newKey, result.status);
  return withKey(result.value, newKey, 201);
}
