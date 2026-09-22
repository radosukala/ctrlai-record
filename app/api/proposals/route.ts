import type { NextRequest } from 'next/server';
import { ensureContributor, jsonError, readActor, readJson, sameOrigin, withKey } from '@/lib/http';
import { createProposal, type ProposalInput } from '@/lib/store/proposals';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return jsonError(403, 'Propose tests from this site.');
  const body = await readJson<Partial<ProposalInput>>(request);
  if (!body) return jsonError(400, 'Send the proposal as JSON.');
  const actor = await readActor(request);
  const { contributor, newKey } = await ensureContributor(actor);
  const result = await createProposal(actor.db, {
    title: String(body.title ?? ''), questionId: String(body.questionId ?? ''), prompt: String(body.prompt ?? ''),
    outcomes: String(body.outcomes ?? ''), why: String(body.why ?? ''), sources: String(body.sources ?? ''),
  }, contributor, actor.ipHash);
  if (!result.ok) return withKey({ error: result.error }, newKey, result.status);
  return withKey(result.value, newKey, 201);
}
