import { NextResponse, type NextRequest } from 'next/server';
import { readActor } from '@/lib/http';
import { nextRunToVerify } from '@/lib/store/runs';
import { TEST_IDS } from '@/content/tests';

export async function GET(request: NextRequest) {
  const actor = await readActor(request);
  const test = request.nextUrl.searchParams.get('test') ?? undefined;
  const skip = (request.nextUrl.searchParams.get('skip') ?? '').split(',').filter(Boolean);
  const item = await nextRunToVerify(actor.db, { contributorId: actor.contributor?.id ?? null, ipHash: actor.ipHash }, test && TEST_IDS.includes(test) ? test : undefined, skip);
  return NextResponse.json({ run: item }, { headers: { 'Cache-Control': 'no-store' } });
}
