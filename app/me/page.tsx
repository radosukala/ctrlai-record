import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb } from '@/lib/db/client';
import { currentViewer } from '@/lib/viewer';
import { contributorStats, displayName, earnedBadges } from '@/lib/store/contributors';
import { contributionCounts } from '@/lib/store/accounts';
import { listRuns } from '@/lib/store/runs';
import { maskEmail } from '@/lib/auth';
import { RunCard } from '@/components/RunCard';
import { KeepRecordForm } from '@/components/KeepRecordForm';
import { AccountActions, AdoptCard, MeClient } from './MeClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Your record', robots: { index: false } };

export default async function MePage() {
  const { person, contributor, browserContributor } = await currentViewer();
  const db = await getDb();

  // Contributions this browser holds that the signed-in account doesn't have yet.
  const adoptable = person && browserContributor && browserContributor.personId !== person.id ? browserContributor : null;
  const adoptableCounts = adoptable ? await contributionCounts(db, adoptable.id) : null;
  const belongsElsewhere = Boolean(adoptable?.personId);

  if (!contributor) {
    return (
      <section className="test-hero">
        <div className="shell split">
          <div>
            <span className="eyebrow"><span className="dot" /> Your record</span>
            <h1 className="title">{person ? 'Signed in. Nothing added yet.' : 'You haven’t contributed from this browser yet.'}</h1>
            <p className="lede">
              {person
                ? `Signed in as ${maskEmail(person.email)}. Your first run or check will be kept with this account.`
                : 'There’s no sign-up to contribute. The first time you add a run or a check, you get a contributor number. You can keep it with an optional account.'}
            </p>
            <div className="actions mt-24"><Link href="/tests" className="btn btn-primary">Run a test</Link><Link href="/verify" className="btn btn-ghost">Verify a run</Link></div>
            {person ? <div className="mt-32"><AccountActions /></div> : null}
          </div>
          {person ? null : (
            <div className="stack" style={{ ['--stack' as string]: '16px' }}>
              <div className="card"><h2 className="h4">Already a contributor?</h2><p className="small muted mt-8">Get a sign-in link to your record.</p><div className="mt-16"><KeepRecordForm /></div></div>
              <MeClient mode="restore" />
            </div>
          )}
        </div>
      </section>
    );
  }

  const [stats, runs] = await Promise.all([contributorStats(db, contributor.id), listRuns(db, { contributorId: contributor.id, limit: 30 })]);
  const badges = earnedBadges(contributor, stats);
  const agreement = stats.settledChecks ? Math.round((stats.agreedChecks / stats.settledChecks) * 100) : null;
  const kept = Boolean(person && contributor.personId === person.id);

  return (
    <>
      <section className="test-hero">
        <div className="shell">
          <span className="eyebrow"><span className="dot" /> Contributor #{contributor.seq}</span>
          <h1 className="title">{displayName(contributor)}</h1>
          {badges.length ? <div className="badge-row mt-16">{badges.map(badge => <span key={badge} className="chip tone-hoped">{badge}</span>)}</div> : null}
          <p className="small muted mt-16">
            {kept ? <>Kept with your account, signed in as {maskEmail(person!.email)}.</> : person ? <>Signed in as {maskEmail(person.email)}.</> : <>Held by this browser only.</>}
          </p>
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
            {adoptable && adoptableCounts ? (
              <AdoptCard seq={adoptable.seq} runs={adoptableCounts.runs} checks={adoptableCounts.checks} belongsElsewhere={belongsElsewhere} merge={Boolean(contributor && contributor.id !== adoptable.id)} />
            ) : null}
            <h2 className="h3 mt-8">Your runs</h2>
            {runs.length ? <div className="grid grid-2 mt-16">{runs.map(run => <RunCard key={run.id} run={run} showTest />)}</div>
              : <p className="muted mt-12">No runs yet. <Link href="/tests">Run a test</Link>.</p>}
          </div>
          <aside className="stack sticky" style={{ ['--stack' as string]: '16px' }}>
            {person ? null : (
              <div className="card card-acid">
                <h2 className="h4">Keep your record</h2>
                <p className="small mt-8">Right now this record lives only in this browser. Add an email to keep it across devices and withdraw runs later. No password, never shown.</p>
                <div className="mt-16"><KeepRecordForm /></div>
              </div>
            )}
            <MeClient mode="profile" handle={contributor.handle ?? ''} />
            {person ? <AccountActions /> : null}
          </aside>
        </div>
      </section>
    </>
  );
}
