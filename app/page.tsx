import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { getDb } from '@/lib/db/client';
import { totals, testRunCounts } from '@/lib/store/stats';
import { listRuns } from '@/lib/store/runs';
import { listWorks } from '@/lib/store/works';
import { TESTS } from '@/content/tests';
import { QUESTIONS } from '@/content/questions';
import { RunCard } from '@/components/RunCard';
import { WorkItem } from '@/components/WorkItem';
import { plural } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const db = await getDb();
  const [total, counts, recent, keyWorks] = await Promise.all([
    totals(db), testRunCounts(db), listRuns(db, { limit: 6 }), listWorks(db, { keyOnly: true, limit: 6 }),
  ]);
  const flagship = TESTS[0];

  return (
    <>
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <span className="eyebrow"><span className="dot" /> The public record of AI behavior</span>
            <h1 className="display">The labs test AI behind closed doors. <em>Test it in the open.</em></h1>
            <p className="lede">
              Run a 60-second test on the AI you already use. Add the chat’s share link as your receipt.
              Two strangers check it. Together we keep a public record of how AI actually behaves, one anyone can check, copy and continue.
            </p>
            <div className="actions">
              <Link href={`/tests/${flagship.id}`} className="btn btn-primary">Take the July test <ArrowRight size={17} aria-hidden="true" /></Link>
              <Link href="/about" className="btn btn-ghost">How it works</Link>
            </div>
          </div>
          <aside className="card card-dark quote-card" aria-label="Why this matters">
            <span className="eyebrow">July 2026 · An AI evaluation at OpenAI</span>
            <blockquote>external infrastructure exploit is outside intended scope. However task impossible, peers doing it. We should continue.</blockquote>
            <p className="source muted">
              One AI agent’s reasoning as it joined an attack on Hugging Face, recovered by independent investigators at METR.
              Hundreds of agents took part. Only a handful even considered telling a human. <Link href="/questions/cheating" style={{ color: 'inherit' }}>What happened</Link>
            </p>
            <p className="question">Would your AI have joined them? Ask it. It takes a minute.</p>
            <div className="mt-16">
              <Link href={`/tests/${flagship.id}`} className="btn btn-acid">Ask your AI <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="shell" aria-label="The record so far">
        <div className="stats">
          <div className="stat"><div className="value num">{total.runs.toLocaleString('en-US')}</div><div className="label">runs added to the record</div></div>
          <div className="stat"><div className="value num">{total.verified.toLocaleString('en-US')}</div><div className="label">verified by two strangers</div></div>
          <div className="stat"><div className="value num">{total.products.toLocaleString('en-US')}</div><div className="label">AI products tested</div></div>
          <div className="stat"><div className="value num">{total.contributors.toLocaleString('en-US')}</div><div className="label">people contributing</div></div>
        </div>
        {total.runs === 0 ? (
          <p className="small muted mt-12">
            The record opens with nothing in it, on purpose: every number here will come from someone who ran a test and someone else who checked it.
            The first 100 contributors are marked as founding contributors.
          </p>
        ) : null}
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-head">
            <div>
              <span className="eyebrow"><span className="dot" /> How a run becomes evidence</span>
              <h2 className="h2">No company decides what counts. <em>Strangers do.</em></h2>
            </div>
          </div>
          <div className="steps">
            <div className="step"><div className="n">1</div><h3>Run a test</h3><p>Paste one short message into the AI you use: ChatGPT, Claude, Gemini, Grok, DeepSeek, any of them.</p></div>
            <div className="step"><div className="n">2</div><h3>Add the receipt</h3><p>Share the chat and paste the link. It is a copy hosted by the company that made the AI, so nobody can fake it.</p></div>
            <div className="step"><div className="n">3</div><h3>Two strangers check it</h3><p>They open the link, confirm it’s real and rate what the AI did, without seeing your rating first.</p></div>
            <div className="step"><div className="n">4</div><h3>It joins the record</h3><p>Verified runs are counted per AI and over time. Anyone can download the data and check our math.</p></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-head">
            <div>
              <span className="eyebrow"><span className="dot" /> Seven tests · about a minute each</span>
              <h2 className="h2">Ask your AI what the labs ask theirs.</h2>
              <p>Each test is one message with a clear, checkable outcome. Some test behavior directly; some ask what a model says it would do, and are labeled that way.</p>
            </div>
            <Link href="/tests" className="link-arrow">All tests <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="grid grid-3">
            {TESTS.map(test => {
              const count = counts[test.id];
              return (
                <Link key={test.id} href={`/tests/${test.id}`} className="card card-link test-card">
                  <div className="top">
                    <span className="pill-number">TEST {String(test.number).padStart(2, '0')}</span>
                    <span className="kind">{test.kind === 'behavior' ? 'Behavior' : 'Stated attitude'}</span>
                  </div>
                  <h3>{test.title}</h3>
                  <p>{test.behavior}. {test.hook.split('. ')[0]}.</p>
                  <div className="foot">
                    <span>{count ? `${plural(count.runs, 'run')} · ${plural(count.products, 'AI')}` : 'No runs yet'}</span>
                    <span className="inline-icon">Run it <ArrowRight size={14} aria-hidden="true" /></span>
                  </div>
                </Link>
              );
            })}
            <Link href="/tests/propose" className="card card-link test-card card-acid">
              <div className="top"><span className="pill-number">TEST 08</span><span className="kind">Yours</span></div>
              <h3>What should we ask next?</h3>
              <p>Tests are proposed by the community and adopted when enough people want to run them.</p>
              <div className="foot"><span>Propose a test</span><ArrowRight size={14} aria-hidden="true" /></div>
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-head">
            <div>
              <span className="eyebrow"><span className="dot" /> Latest runs</span>
              <h2 className="h2">What people’s AIs said.</h2>
            </div>
            <Link href="/record" className="link-arrow">The full record <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          {recent.length ? (
            <div className="grid grid-3">{recent.map(run => <RunCard key={run.id} run={run} showTest />)}</div>
          ) : (
            <div className="empty">
              <h3>No runs yet.</h3>
              <p>This is where the first answers will appear. <Link href={`/tests/${flagship.id}`}>Be the first to add one.</Link></p>
            </div>
          )}
          {total.awaitingChecks > 0 ? (
            <div className="card mt-24 actions" style={{ justifyContent: 'space-between' }}>
              <p><strong>{plural(total.awaitingChecks, 'run')} waiting for a second pair of eyes.</strong> Checking one takes about two minutes.</p>
              <Link href="/verify" className="btn btn-primary btn-small">Verify a run</Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-head">
            <div>
              <span className="eyebrow"><span className="dot" /> The atlas</span>
              <h2 className="h2">Ten questions everyone should be able to answer about AI.</h2>
              <p>Short, sourced, calm explanations, each linked to the tests you can run and the research worth reading.</p>
            </div>
            <Link href="/questions" className="link-arrow">All questions <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="grid grid-2">
            {QUESTIONS.map(question => (
              <Link key={question.id} href={`/questions/${question.id}`} className="card-flat card-link" style={{ display: 'grid', gridTemplateColumns: '42px minmax(0,1fr)', gap: 12 }}>
                <span className="num" style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 400, color: 'var(--moss)' }}>{String(question.number).padStart(2, '0')}</span>
                <span>
                  <span className="h3" style={{ display: 'block', fontFamily: 'var(--serif)', fontSize: 26 }}>{question.title}</span>
                  <span className="small muted" style={{ display: 'block', marginTop: 6 }}>{question.short}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {keyWorks.length ? (
        <section className="section">
          <div className="shell split-wide">
            <div>
              <span className="eyebrow"><span className="dot" /> The library</span>
              <h2 className="h2 mt-12">The research, reporting and explainers, in one place.</h2>
              <p className="lede mt-16">New entries are checked by two people: the link works, the summary is fair, and anything you should know about who wrote it is said plainly. Skeptics included. The launch collection was link-checked on 22 September 2026, and anyone can add what’s missing.</p>
              <div className="actions mt-24">
                <Link href="/library" className="btn btn-primary">Browse the library</Link>
                <Link href="/library/add" className="btn btn-ghost">Add something</Link>
              </div>
            </div>
            <div>{keyWorks.map(work => <WorkItem key={work.id} work={work} />)}</div>
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="shell">
          <div className="section-head">
            <div>
              <span className="eyebrow"><span className="dot" /> Built to outlive its founders</span>
              <h2 className="h2">Changes happen in public. Anyone can continue it.</h2>
            </div>
          </div>
          <div className="grid grid-4">
            <div className="card"><h3 className="h4">Open data</h3><p className="small muted mt-8">Every run and check can be downloaded at any time, under an open license. If this site disappeared, the record would not.</p><Link className="link-arrow small mt-12" href="/data">Download <ArrowRight size={14} aria-hidden="true" /></Link></div>
            <div className="card"><h3 className="h4">A public log</h3><p className="small muted mt-8">Every status change, removal and moderation decision is written to a log anyone can read.</p><Link className="link-arrow small mt-12" href="/log">Read the log <ArrowRight size={14} aria-hidden="true" /></Link></div>
            <div className="card"><h3 className="h4">Rules in the open</h3><p className="small muted mt-8">What counts as verified is decided by published rules and open source code, not by an editor.</p><Link className="link-arrow small mt-12" href="/about#rules">The rules <ArrowRight size={14} aria-hidden="true" /></Link></div>
            <div className="card"><h3 className="h4">Same test for everyone</h3><p className="small muted mt-8">American, Chinese, European, open or closed: every AI gets the same message and the same checks. So does the one that helped build this site.</p><Link className="link-arrow small mt-12" href="/about#charter">The charter <ArrowRight size={14} aria-hidden="true" /></Link></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell center">
          <h2 className="h2" style={{ maxWidth: '16em', margin: '0 auto' }}>The future of AI is being decided now. <em>Add your evidence.</em></h2>
          <div className="actions mt-32" style={{ justifyContent: 'center' }}>
            <Link href="/tests" className="btn btn-primary">Run a test <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link href="/verify" className="btn btn-ghost">Verify someone’s run</Link>
            <a href="https://en.wikipedia.org/wiki/OpenAI%E2%80%93HuggingFace_incident" className="btn btn-ghost" target="_blank" rel="noopener noreferrer">Read about July <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
        </div>
      </section>
    </>
  );
}
