import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb } from '@/lib/db/client';
import { currentContributor } from '@/lib/viewer';
import { contributorStats, displayName, earnedBadges } from '@/lib/store/contributors';
import { listRuns } from '@/lib/store/runs';
import { RunCard } from '@/components/RunCard';
import { MeClient } from './MeClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Your contributions', robots: { index: false } };

export default async function MePage() {
  const contributor = await currentContributor();
  if (!contributor) {
    return (
      <section className="test-hero">
        <div className="shell split">
          <div>
            <span className="eyebrow"><span className="dot" /> Your contributions</span>
            <h1 className="title">You haven’t contributed from this browser yet.</h1>
            <p className="lede">There’s no sign-up. The first time you add a run or a check, this browser gets a private key and a contributor number.</p>
            <div className="actions mt-24"><Link href="/tests" className="btn btn-primary">Run a test</Link><Link href="/verify" className="btn btn-ghost">Verify a run</Link></div>
          </div>
          <MeClient mode="restore" />
        </div>
      </section>
    );
  }
  const db = await getDb();
  const [stats, runs] = await Promise.all([contributorStats(db, contributor.id), listRuns(db, { contributorId: contributor.id, limit: 30 })]);
  const badges = earnedBadges(contributor, stats);
  const agreement = stats.settledChecks ? Math.round((stats.agreedChecks / stats.settledChecks) * 100) : null;
  return (
    <>
      <section className="test-hero">
        <div className="shell">
          <span className="eyebrow"><span className="dot" /> Contributor #{contributor.seq}</span>
          <h1 className="title">{displayName(contributor)}</h1>
          {badges.length ? <div className="badge-row mt-16">{badges.map(badge => <span key={badge} className="chip tone-hoped">{badge}</span>)}</div> : null}
          <div className="stats mt-32">
            <div className="stat"><div className="value num">{stats.runs}</div><div className="label">runs added</div></div>
            <div className="stat"><div className="value num">{stats.verifiedRuns}</div><div className="label">of them verified</div></div>
            <div className="stat"><div className="value num">{stats.checks}</div><div className="label">checks given</div></div>
            <div className="stat"><div className="value num">{agreement === null ? '—' : `${agreement}%`}</div><div className="label">checks agreeing with the final outcome</div></div>
          </div>
        </div>
      </section>
      <section className="section-tight">
        <div className="shell split-wide">
          <div>
            <h2 className="h3">Your runs</h2>
            {runs.length ? <div className="grid grid-2 mt-16">{runs.map(run => <RunCard key={run.id} run={run} showTest />)}</div>
              : <p className="muted mt-12">No runs yet. <Link href="/tests">Run a test</Link>.</p>}
          </div>
          <MeClient mode="profile" handle={contributor.handle ?? ''} />
        </div>
      </section>
    </>
  );
}
