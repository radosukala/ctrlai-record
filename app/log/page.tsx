import Link from 'next/link';
import type { Metadata } from 'next';
import { getDb } from '@/lib/db/client';
import { listEvents, type PublicEvent } from '@/lib/store/log';
import { displayName } from '@/lib/store/contributors';
import { getTest } from '@/content/tests';
import { getProduct } from '@/content/products';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Public log', description: 'Every change to the Ctrl AI record: runs added, checks, status changes, withdrawals and steward actions.' };

const STATUS_WORDS: Record<string, string> = {
  verified: 'verified', rated: 'rated without a receipt', unverified: 'back to waiting for checks', disputed: 'disputed',
  rejected: 'rejected', hidden: 'hidden', withdrawn: 'withdrawn',
};

function describe(event: PublicEvent): React.ReactNode {
  const who = event.actor ? displayName(event.actor) : 'The rules';
  const [kind, id] = event.subject.split(':');
  const link = kind === 'run' ? <Link href={`/r/${id}`} className="mono">{id}</Link> : <span className="mono">{id}</span>;
  const d = event.detail as Record<string, string>;
  switch (event.action) {
    case 'run.added': return <>{who} added run {link}: {getTest(d.test)?.title ?? d.test} on {getProduct(d.product)?.name ?? d.product}{d.receipt === 'provider' ? ', with a share link' : ''}.</>;
    case 'run.checked': return <>{who} checked run {link}{d.flag ? ` and flagged it (${d.flag.replace('-', ' ')})` : ''}.</>;
    case 'run.status': return <>Run {link} is now {STATUS_WORDS[d.to] ?? d.to}{d.outcome ? `, outcome agreed: ${d.outcome}` : ''}.</>;
    case 'run.withdrawn': return <>{who} withdrew run {link}.</>;
    case 'run.hidden': return <>Steward {who} hid run {link}. Reason: {d.reason}</>;
    case 'run.restored': return <>Steward {who} restored run {link}. Reason: {d.reason}</>;
    case 'work.added': return <>{who} added “{d.title}” to the library for review.</>;
    case 'work.reviewed': return <>{who} reviewed a library addition ({d.decision === 'list' ? 'list' : 'decline'}).</>;
    case 'work.listed': return <>“{d.title}” is now listed in the library.</>;
    case 'work.declined': return <>“{d.title}” was declined for the library.</>;
    case 'proposal.added': return <>{who} proposed a test: “{d.title}”.</>;
    case 'contributor.kept': return <>Contributor #{id} kept their record with an account.</>;
    case 'contributor.merged': return <>Contributor #{id} was merged into contributor #{d.into}{d.selfChecksRemoved ? `, and ${d.selfChecksRemoved} check${Number(d.selfChecksRemoved) === 1 ? '' : 's'} on their own runs were removed` : ''}.</>;
    case 'work.reopened': return <>“{d.title}” went back to review after a merge removed an approval.</>;
    case 'steward.appointed': return <>Contributor #{id} was appointed a steward.</>;
    case 'steward.removed': return <>Contributor #{id} is no longer a steward.</>;
    default: return <>{event.action} · {event.subject}</>;
  }
}

export default async function LogPage({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  const { before } = await searchParams;
  const events = await listEvents(await getDb(), { before: before ? Number(before) : undefined, limit: 100 });
  const last = events.at(-1);
  return (
    <>
      <section className="test-hero">
        <div className="shell">
          <span className="eyebrow"><span className="dot" /> Public log</span>
          <h1 className="title">Every change, in public.</h1>
          <p className="lede">Every run added, every check, every status change, withdrawal and steward action made through this site, newest first. Individual ratings are not shown here, so checking stays blind. Daily public snapshots of the data, coming next, will let anyone confirm that nothing changed outside the log.</p>
        </div>
      </section>
      <section className="section-tight">
        <div className="shell">
          {events.length ? (
            <ul className="log-list">
              {events.map(event => (
                <li key={event.id}><time dateTime={event.at}>{formatDateTime(event.at)}</time><span>{describe(event)}</span></li>
              ))}
            </ul>
          ) : <div className="empty"><h3>The log is empty.</h3><p>The first entry will be the first run someone adds.</p></div>}
          {events.length === 100 && last ? <Link href={`/log?before=${last.id}`} className="btn btn-ghost mt-24">Older entries</Link> : null}
        </div>
      </section>
    </>
  );
}
