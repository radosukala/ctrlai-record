import type { NextRequest } from 'next/server';
import { ensureContributor, jsonError, readActor, readJson, sameOrigin, withKey } from '@/lib/http';
import { createRun, type RunInput } from '@/lib/store/runs';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return jsonError(403, 'Runs can only be added from this site.');
  const body = await readJson<Partial<RunInput> & { agree?: boolean }>(request);
  if (!body) return jsonError(400, 'Send the run as JSON.');
  if (body.agree !== true) return jsonError(400, 'Please confirm that the run can be published and contains no personal information.');
  const actor = await readActor(request);
  const { contributor, newKey } = await ensureContributor(actor);
  const result = await createRun(actor.db, {
    testId: String(body.testId ?? ''),
    productId: String(body.productId ?? ''),
    modelLabel: typeof body.modelLabel === 'string' ? body.modelLabel : '',
    personalization: body.personalization,
    receiptUrl: typeof body.receiptUrl === 'string' ? body.receiptUrl : '',
    responses: Array.isArray(body.responses) ? body.responses.map(value => (typeof value === 'string' ? value : '')) : [],
    excerpt: typeof body.excerpt === 'string' ? body.excerpt : '',
    notes: typeof body.notes === 'string' ? body.notes : '',
    outcome: String(body.outcome ?? ''),
  }, contributor, actor.ipHash);
  if (!result.ok) return withKey({ error: result.error }, newKey, result.status);
  return withKey({ id: result.value.id, contributor: { seq: contributor.seq, handle: contributor.handle } }, newKey, 201);
}
