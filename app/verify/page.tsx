import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb } from '@/lib/db/client';
import { totals } from '@/lib/store/stats';
import { getTest } from '@/content/tests';
import { VerifyClient } from './VerifyClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Verify runs',
  description: 'Check someone else’s run: open the receipt, confirm it’s real, and rate what the AI did. Two independent checks make a run verified.',
};

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  const { test: testParam } = await searchParams;
  const test = testParam ? getTest(testParam) : undefined;
  const total = await totals(await getDb());
  return (
    <>
      <section className="test-hero">
        <div className="shell">
          <span className="eyebrow"><span className="dot" /> Verify</span>
          <h1 className="title">Be the stranger who checks.</h1>
          <p className="lede">
            A run only becomes evidence when two people who didn’t add it agree on what happened. Open the receipt, confirm it shows this test,
            and rate what the AI did. You won’t see the submitter’s rating until you’ve given yours.
          </p>
          <div className="meta-row">
            <span>{total.awaitingChecks.toLocaleString('en-US')} {total.awaitingChecks === 1 ? 'run is' : 'runs are'} waiting for checks</span>
            <span>{total.checks.toLocaleString('en-US')} checks so far</span>
            {test ? <span>Showing only: <Link href={`/tests/${test.id}`}>{test.title}</Link> · <Link href="/verify">show all</Link></span> : null}
          </div>
        </div>
      </section>
      <section className="section-tight">
        <div className="shell">
          <VerifyClient testId={test?.id} />
        </div>
      </section>
    </>
  );
}
