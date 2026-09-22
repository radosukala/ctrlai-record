import { NextResponse, type NextRequest } from 'next/server';
import { ensureContributor, jsonError, readActor, readJson, sameOrigin, withKey } from '@/lib/http';
import { listWorks, submitWork, type WorkInput } from '@/lib/store/works';

export async function GET(request: NextRequest) {
  const actor = await readActor(request);
  const params = request.nextUrl.searchParams;
  const works = await listWorks(actor.db, {
    question: params.get('question') ?? undefined,
    type: params.get('type') ?? undefined,
    q: params.get('q') ?? undefined,
  });
  return NextResponse.json(works.map(({ ipHash: _ip, submittedBy: _by, ...work }) => work), { headers: { 'Access-Control-Allow-Origin': '*' } });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return jsonError(403, 'Add works from this site.');
  const body = await readJson<Partial<WorkInput>>(request);
  if (!body) return jsonError(400, 'Send the work as JSON.');
  const actor = await readActor(request);
  const { contributor, newKey } = await ensureContributor(actor);
  const result = await submitWork(actor.db, {
    url: String(body.url ?? ''),
    title: String(body.title ?? ''),
    creators: typeof body.creators === 'string' ? body.creators : '',
    publisher: typeof body.publisher === 'string' ? body.publisher : '',
    published: typeof body.published === 'string' ? body.published.trim() : '',
    type: String(body.type ?? ''),
    questions: Array.isArray(body.questions) ? body.questions.map(String) : [],
    level: typeof body.level === 'string' ? body.level : 'curious',
    summary: String(body.summary ?? ''),
  }, contributor, actor.ipHash);
  if (!result.ok) return withKey({ error: result.error }, newKey, result.status);
  return withKey(result.value, newKey, result.value.existing ? 200 : 201);
}
