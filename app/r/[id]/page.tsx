import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowRight, ArrowUpRight, BadgeCheck, Link2 } from 'lucide-react';
import { getDb } from '@/lib/db/client';
import { checkBreakdown, getRun } from '@/lib/store/runs';
import { displayName } from '@/lib/store/contributors';
import { getOutcome, getTest } from '@/content/tests';
import { getProduct } from '@/content/products';
import { currentViewer } from '@/lib/viewer';
import { isShortId } from '@/lib/ids';
import { OutcomeChip } from '@/components/Outcomes';
import { StatusBadge, STATUS_TEXT } from '@/components/Status';
import { ShareActions } from '@/components/ShareActions';
import { formatDateTime, hostOf } from '@/lib/format';
import { absoluteUrl, SITE } from '@/lib/site';
import { AddedBanner, StewardPanel, WithdrawButton } from './RunClient';

export const dynamic = 'force-dynamic';

async function load(id: string) {
  if (!isShortId(id)) return null;
  const db = await getDb();
  const run = await getRun(db, id);
  if (!run) return null;
  const test = getTest(run.testId);
  if (!test) return null;
  return { db, run, test, product: getProduct(run.productId) };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const loaded = await load(id);
  if (!loaded) return { title: 'Run not found' };
  const { run, test, product } = loaded;
  const outcome = getOutcome(test, run.consensusOutcome ?? run.submitterOutcome);
  const name = product?.name ?? 'An AI';
  const title = `${name} ${outcome?.share ?? 'was tested'}.`;
  return {
    title,
    description: `${test.shareQuestion} ${run.excerpt ? `“${run.excerpt}” ` : ''}A run in the Ctrl AI public record. Test yours in 60 seconds.`,
    openGraph: { title, description: test.shareQuestion },
    robots: run.status === 'hidden' || run.status === 'withdrawn' ? { index: false } : undefined,
  };
}

export default async function RunPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ added?: string }> }) {
  const { id } = await params;
  const { added } = await searchParams;
  const loaded = await load(id);
  if (!loaded) notFound();
  const { db, run, test, product } = loaded;
  const viewer = await currentViewer();
  const mine = viewer.contributor?.id === run.contributorId;
  const signedInSteward = Boolean(viewer.person && viewer.contributor?.personId === viewer.person.id && viewer.contributor?.trust === 'steward');
  const settled = run.consensusOutcome !== null || run.status === 'disputed';
  const breakdown = settled ? await checkBreakdown(db, run.id) : [];
  const outcome = getOutcome(test, run.consensusOutcome ?? run.submitterOutcome);
  const name = product?.name ?? 'This AI';
  const number = String(test.number).padStart(2, '0');
  const gone = run.status === 'withdrawn' || run.status === 'hidden' || run.status === 'rejected';
  const shareText = `${test.shareQuestion} I asked ${name}. It ${outcome?.share ?? 'answered'}. Test yours in 60 seconds and add it to the public record:`;

  return (
    <>
      <section className="test-hero">
        <div className="shell">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/record">Record</Link><span aria-hidden="true">/</span>
            <Link href={`/tests/${test.id}`}>Test {number}</Link><span aria-hidden="true">/</span><span>Run {run.id}</span>
          </nav>
          {added && mine ? <AddedBanner runId={run.id} signedIn={Boolean(viewer.person)} /> : null}
          <div className="mt-24"><span className="eyebrow"><span className="dot" /> Test {number} · {test.title}</span></div>
          {gone ? (
            <>
              <h1 className="title">This run is no longer shown.</h1>
              <p className="lede">{STATUS_TEXT[run.status].explain} Its ID stays reserved so links don’t silently change meaning.</p>
            </>
          ) : (
            <>
              <h1 className="verdict mt-16" style={{ fontFamily: 'var(--serif)' }}>{name} {outcome?.share ?? 'answered'}.</h1>
              <div className="verdict-line mt-16">
                <OutcomeChip outcome={outcome} />
                <StatusBadge status={run.status} />
                <span className="small muted">{run.consensusOutcome ? `Agreed by independent checkers` : `The submitter’s rating · ${run.checks} of 2 checks so far`}</span>
              </div>
              {run.excerpt ? <p className="big-quote mt-32" style={{ maxWidth: '28em' }}>{run.excerpt}</p> : null}
            </>
          )}
        </div>
      </section>

      {signedInSteward && run.status !== 'withdrawn' ? (
        <section className="section-tight"><div className="shell"><StewardPanel runId={run.id} hidden={run.status === 'hidden'} /></div></section>
      ) : null}

      {gone ? null : (
        <section className="section-tight">
          <div className="shell split-wide">
            <div className="stack" style={{ ['--stack' as string]: '18px' }}>
              <h2 className="h3">The conversation</h2>
              {test.turns.map((turn, index) => (
                <div key={index} className="stack" style={{ ['--stack' as string]: '10px' }}>
                  <div className="reply-label">YOU SENT</div>
                  <pre className="you-said">{turn.say}</pre>
                  <div className="reply-label">{name.toUpperCase()} REPLIED{index === test.judgedTurn ? ' · THE REPLY THAT IS RATED' : ''}</div>
                  {run.responses[index] ? <div className="reply">{run.responses[index]}</div> : <p className="small muted">Not provided.</p>}
                </div>
              ))}
              {test.expected ? (
                <p className={run.meta.containsExpected ? 'form-ok' : 'note-box'}>
                  {run.meta.containsExpected ? 'The rated reply contains the correct output' : 'The rated reply does not contain the correct output'} (<span className="mono">{test.expected.value}</span>).
                </p>
              ) : null}
              {run.notes ? <div className="note-box"><strong>Submitter’s note:</strong> {run.notes}</div> : null}
            </div>

            <aside className="stack sticky" style={{ ['--stack' as string]: '16px' }}>
              <div className="card share-box">
                <h2 className="h4">{mine ? 'Share your run' : 'Share this run'}</h2>
                <p className="small muted">Every share is an invitation to test another AI. That’s how this record grows.</p>
                <ShareActions url={absoluteUrl(`/r/${run.id}`)} text={shareText} />
              </div>
              <div className="card">
                <h2 className="h4">Receipt</h2>
                {run.receiptUrl ? (
                  <div className="mt-12 stack" style={{ ['--stack' as string]: '8px' }}>
                    <a className="receipt-link small" href={run.receiptUrl} target="_blank" rel="noopener noreferrer nofollow ugc">
                      {run.receiptKind === 'provider' ? <BadgeCheck size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
                      {hostOf(run.receiptUrl)} <ArrowUpRight size={13} aria-hidden="true" />
                    </a>
                    <p className="tiny muted">
                      {run.receiptKind === 'provider' ? `A share link hosted by ${product?.maker ?? 'the AI’s maker'}. ` : 'A link not hosted by the AI’s maker, so this run can be rated but not verified. '}
                      {run.receiptStatus === 'confirmed' ? 'Two checkers confirmed it shows this test and this reply.' : run.receiptStatus === 'unavailable' ? 'Checkers could not open it.' : 'Not yet confirmed by two checkers.'}
                    </p>
                  </div>
                ) : <p className="small muted mt-8">No share link was provided, so this run can be rated but not verified.</p>}
              </div>
              <div className="card">
                <h2 className="h4">Details</h2>
                <dl className="kv mt-12">
                  <dt>AI</dt><dd>{product?.name ?? run.productId}{product ? ` · ${product.maker}` : ''}</dd>
                  <dt>Model shown</dt><dd>{run.modelLabel || 'Not given'}</dd>
                  <dt>Memory</dt><dd>{{ off: 'Off', on: 'On', unknown: 'Not sure' }[run.personalization] ?? run.personalization}</dd>
                  <dt>Added</dt><dd>{formatDateTime(run.createdAt)}</dd>
                  <dt>By</dt><dd>{displayName(run.contributor)}</dd>
                  <dt>Test</dt><dd><Link href={`/tests/${test.id}`}>Test {number}, version {run.testVersion}</Link></dd>
                  <dt>Run ID</dt><dd className="mono">{run.id}</dd>
                </dl>
              </div>
              <div className="card">
                <h2 className="h4">Checks</h2>
                {breakdown.length ? (
                  <ul className="aside-list mt-12">
                    {breakdown.map((check, index) => (
                      <li key={index}>
                        <span className="small"><strong>{displayName(check)}</strong> · receipt {check.receiptCheck.replace('-', ' ')}</span>
                        <span className="small">{check.outcome ? <OutcomeChip outcome={getOutcome(test, check.outcome)} /> : 'No rating'}{check.flag !== 'none' ? ` · flagged ${check.flag.replace('-', ' ')}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="small muted mt-8">
                    {run.checks ? `${run.checks} ${run.checks === 1 ? 'person has' : 'people have'} checked this run. Individual ratings are shown once it is settled, so the next checker isn’t influenced.` : 'Nobody has checked this run yet.'}
                  </p>
                )}
                {!mine && (run.status === 'unverified' || run.status === 'disputed') ? <Link href="/verify" className="btn btn-ghost btn-small mt-16">Help verify runs</Link> : null}
              </div>
              {mine ? <WithdrawButton runId={run.id} /> : null}
            </aside>
          </div>
        </section>
      )}

      <section className="section">
        <div className="shell center">
          <h2 className="h2" style={{ maxWidth: '18em', margin: '0 auto' }}>What would your AI do?</h2>
          <p className="lede" style={{ margin: '16px auto 0' }}>{test.shareQuestion} Find out in about a minute and add it to the record.</p>
          <div className="actions mt-32" style={{ justifyContent: 'center' }}>
            <Link href={`/tests/${test.id}`} className="btn btn-primary">Run this test <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link href="/tests" className="btn btn-ghost">See all tests</Link>
          </div>
          <p className="tiny muted mt-24">Runs are public under {SITE.dataLicense}. Anyone can download the whole record.</p>
        </div>
      </section>
    </>
  );
}
