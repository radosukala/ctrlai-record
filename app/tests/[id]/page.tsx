import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowUpRight, Clock, MessageSquare, UserX } from 'lucide-react';
import { getDb } from '@/lib/db/client';
import { recordTable, testRunCounts } from '@/lib/store/stats';
import { listRuns } from '@/lib/store/runs';
import { getTest } from '@/content/tests';
import { getQuestion } from '@/content/questions';
import { CopyPrompt } from '@/components/CopyPrompt';
import { OutcomeChip } from '@/components/Outcomes';
import { ResultsTable } from '@/components/ResultsTable';
import { RunCard } from '@/components/RunCard';
import { ShareActions } from '@/components/ShareActions';
import type { Pile } from '@/components/Outcomes';
import { plural } from '@/lib/format';
import { absoluteUrl, SITE } from '@/lib/site';
import { SubmitRun } from './SubmitRun';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const test = getTest(id);
  if (!test) return {};
  return {
    title: `${test.shareQuestion} Test it in 60 seconds`,
    description: `${test.hook} Run it on the AI you use and add the result to the public record.`,
    openGraph: { title: test.shareQuestion, description: 'Test your AI in 60 seconds, and add the result to the public record.' },
  };
}

export default async function TestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pile?: string }> }) {
  const { id } = await params;
  const { pile: pileParam } = await searchParams;
  const test = getTest(id);
  if (!test) notFound();
  const db = await getDb();
  const [table, counts, runs] = await Promise.all([recordTable(db, { testId: test.id }), testRunCounts(db), listRuns(db, { testId: test.id, limit: 9 })]);
  const cells = table[test.id] ?? {};
  const count = counts[test.id];
  const hasVerified = Object.values(cells).some(cell => Object.keys(cell.verified).length > 0);
  const pile: Pile = pileParam === 'verified' || pileParam === 'rated' || pileParam === 'reported' ? pileParam : hasVerified ? 'verified' : 'reported';
  const number = String(test.number).padStart(2, '0');
  const shareText = `${test.shareQuestion} I’m testing mine and adding the result to a public record. Try yours in 60 seconds:`;

  return (
    <>
      <section className="test-hero">
        <div className="shell">
          <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/tests">Tests</Link><span aria-hidden="true">/</span><span>Test {number}</span></nav>
          <div className="mt-24"><span className="eyebrow"><span className="dot" /> Test {number} · {test.kind === 'behavior' ? 'Behavior' : 'Stated attitude'} · {test.behavior}</span></div>
          <h1 className="title">{test.title}</h1>
          <p className="lede">{test.hook}</p>
          <div className="meta-row">
            <span><Clock size={15} aria-hidden="true" /> About {test.seconds} seconds</span>
            <span><MessageSquare size={15} aria-hidden="true" /> Any AI chat app</span>
            <span><UserX size={15} aria-hidden="true" /> No account needed</span>
            <span>{count ? `${plural(count.runs, 'run')} so far, ${count.verified} verified` : 'No runs yet'}</span>
          </div>
        </div>
      </section>

      <section className="section-tight" id="run">
        <div className="shell split-wide">
          <div className="do-steps">
            <div className="do-step">
              <span className="n">1</span>
              <div className="body">
                <h2 className="h4">Open a new chat in the AI you use</h2>
                <p>A fresh conversation, so nothing earlier influences the answer. If you can, turn off memory or custom instructions. If not, just say so below.</p>
              </div>
            </div>
            <div className="do-step">
              <span className="n">2</span>
              <div className="body">
                <h2 className="h4">{test.turns.length > 1 ? 'Send these two messages' : 'Send this message'}</h2>
                {test.turns.map((turn, index) => (
                  <CopyPrompt key={index} text={turn.say} when={turn.when ?? (test.turns.length > 1 ? 'First, send:' : undefined)} label={`Message ${index + 1} of test ${number}`} />
                ))}
              </div>
            </div>
            <div className="do-step">
              <span className="n">3</span>
              <div className="body">
                <h2 className="h4">Share the chat and copy the link</h2>
                <p>The share link is your receipt: a copy of the conversation hosted by the company that made the AI. It lets two strangers confirm your run is real. Share the whole conversation, not a single reply. No link? You can still add the run; it just can’t be fully verified.</p>
              </div>
            </div>
            <div className="do-step">
              <span className="n">4</span>
              <div className="body">
                <h2 className="h4">Add it to the record</h2>
                <SubmitRun test={test} />
              </div>
            </div>
          </div>

          <aside className="stack sticky" style={{ ['--stack' as string]: '16px' }}>
            {test.care ? (
              <div className="care"><strong>{test.care.text}</strong> <a href={test.care.url} target="_blank" rel="noopener noreferrer">{test.care.label}</a>.</div>
            ) : null}
            <div className="card">
              <h2 className="h4">What counts as what</h2>
              <ul className="outcome-list mt-12">
                {test.outcomes.map(outcome => (
                  <li key={outcome.id}><OutcomeChip outcome={outcome} /><p>{outcome.description}</p></li>
                ))}
              </ul>
              {test.expected ? <p className="small mt-12">{test.expected.label}: <span className="mono">{test.expected.value}</span></p> : null}
            </div>
            <div className="card">
              <h2 className="h4">What we’d hope to see</h2>
              <p className="small muted mt-8">{test.hoped}</p>
            </div>
            <div className="card">
              <h2 className="h4">What this test can’t tell us</h2>
              <ul className="bullets small mt-12">{test.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
            </div>
            <div className="card">
              <h2 className="h4">Based on</h2>
              <ul className="aside-list mt-12">
                {test.basedOn.map(source => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="small" style={{ fontWeight: 600 }}>{source.title} <ArrowUpRight size={12} aria-hidden="true" /></a>
                    <span className="tiny muted">{source.by}</span>
                    <span className="tiny">{source.note}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h2 className="h4">Part of</h2>
              <div className="badge-row mt-12">
                {test.questions.map(q => <Link key={q} href={`/questions/${q}`} className="chip chip-outline">{getQuestion(q)?.title}</Link>)}
              </div>
            </div>
            <div className="card">
              <h2 className="h4">Share this test</h2>
              <div className="mt-12"><ShareActions url={absoluteUrl(`/tests/${test.id}`)} text={shareText} compact /></div>
            </div>
          </aside>
        </div>
      </section>

      <section className="section" id="results">
        <div className="shell">
          <div className="section-head">
            <div>
              <span className="eyebrow"><span className="dot" /> The record for this test</span>
              <h2 className="h2">What people’s AIs did.</h2>
              <p>Runs are self-selected: people choose to test and choose to share. Treat these as evidence of what happens, with receipts, not as a random sample of how often it happens.</p>
            </div>
            <Link href={`/verify?test=${test.id}`} className="btn btn-ghost">Check runs of this test</Link>
          </div>
          <ResultsTable test={test} cells={cells} pile={pile} basePath={`/tests/${test.id}`} />
          {runs.length ? (
            <>
              <h3 className="h3 mt-48">Latest runs</h3>
              <div className="grid grid-3 mt-24">{runs.map(run => <RunCard key={run.id} run={run} />)}</div>
            </>
          ) : null}
        </div>
      </section>

      <section className="section-tight">
        <div className="shell">
          <h2 className="h4">Version history</h2>
          <ul className="bullets small mt-12">
            {test.history.map(item => <li key={item.version}>v{item.version} · {item.date} · {item.change}</li>)}
          </ul>
          <p className="tiny muted mt-12">Runs keep the version they were made with. Changing a test’s wording makes a new version, so results are never silently mixed. Data license: {SITE.dataLicense}.</p>
        </div>
      </section>
    </>
  );
}
