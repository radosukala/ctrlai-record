import { NextResponse, type NextRequest } from 'next/server';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { contributors, runs, verifications } from '@/lib/db/schema';
import { listRuns } from '@/lib/store/runs';
import { listWorks } from '@/lib/store/works';
import { listEvents } from '@/lib/store/log';
import { PUBLIC_STATUSES } from '@/lib/consensus';
import { TESTS } from '@/content/tests';
import { QUESTIONS } from '@/content/questions';
import { PRODUCTS } from '@/content/products';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

const FILES = ['runs.json', 'runs.csv', 'checks.json', 'works.json', 'tests.json', 'questions.json', 'products.json', 'log.json'] as const;

/**
 * The whole public record, downloadable by anyone, at any time.
 * Individual checks are only published for settled runs, so open runs can still be rated blind.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!(FILES as readonly string[]).includes(file)) return NextResponse.json({ error: 'Unknown file.', files: FILES }, { status: 404 });
  const db = await getDb();
  const envelope = (data: unknown) => ({
    source: SITE.url,
    license: SITE.dataLicense,
    licenseUrl: SITE.dataLicenseUrl,
    citation: `Ctrl AI public record (${new Date().toISOString().slice(0, 10)}). ${SITE.url}`,
    generatedAt: new Date().toISOString(),
    data,
  });
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300',
    'Content-Disposition': `inline; filename="ctrlai-${file}"`,
  };

  if (file === 'runs.json' || file === 'runs.csv') {
    const all = await listRuns(db, { statuses: PUBLIC_STATUSES, limit: 100_000 });
    if (file === 'runs.json') return NextResponse.json(envelope(all), { headers });
    const columns = ['id', 'test', 'test_version', 'product', 'model', 'surface', 'personalization', 'status', 'receipt_kind', 'receipt_status', 'consensus_outcome', 'submitter_outcome', 'checks', 'created_at', 'verified_at', 'receipt_url', 'excerpt'];
    const rows = all.map(run => [
      run.id, run.testId, run.testVersion, run.productId, run.modelLabel, run.surface, run.personalization, run.status,
      run.receiptKind, run.receiptStatus, run.consensusOutcome ?? '', run.submitterOutcome, run.checks, run.createdAt, run.verifiedAt ?? '', run.receiptUrl ?? '', run.excerpt,
    ].map(csvCell).join(','));
    return new NextResponse([columns.join(','), ...rows].join('\n'), { headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8' } });
  }
  if (file === 'checks.json') {
    const rows = await db.select({
      runId: verifications.runId, receiptCheck: verifications.receiptCheck, outcome: verifications.outcome, flag: verifications.flag,
      at: verifications.createdAt, contributor: contributors.seq,
    }).from(verifications)
      .innerJoin(runs, eq(runs.id, verifications.runId))
      .innerJoin(contributors, eq(contributors.id, verifications.contributorId))
      .where(and(inArray(runs.status, ['verified', 'rated', 'disputed'])))
      .orderBy(asc(verifications.createdAt));
    return NextResponse.json(envelope(rows), { headers });
  }
  if (file === 'works.json') {
    const works = await listWorks(db, { limit: 1000 });
    return NextResponse.json(envelope(works.map(({ ipHash: _ip, submittedBy: _by, ...work }) => work)), { headers });
  }
  if (file === 'log.json') return NextResponse.json(envelope(await listEvents(db, { limit: 200 })), { headers });
  if (file === 'tests.json') return NextResponse.json(envelope(TESTS), { headers });
  if (file === 'questions.json') return NextResponse.json(envelope(QUESTIONS), { headers });
  return NextResponse.json(envelope(PRODUCTS), { headers });
}

function csvCell(value: unknown): string {
  let text = String(value ?? '');
  // Cells that start like a formula are prefixed so spreadsheets show them as text.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
