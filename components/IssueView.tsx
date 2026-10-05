import Link from 'next/link';
import type { Issue } from '@/content/issues';
import { dateRange } from '@/lib/site';
import { MEASURED_ON } from '@/lib/stats';
import { Events } from './Events';
import { PickItem, SignalLegend } from './Picks';
import { StartHere } from './StartHere';
import { SubscribeForm } from './SubscribeForm';
import { newsletterEnabled } from '@/lib/newsletter/config';

export function IssueView({ issue, isLatest }: { issue: Issue; isLatest: boolean }) {
  const list = `week-${issue.slug}`;
  return (
    <div className="read page">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Issue {issue.number} · {dateRange(issue.from, issue.to)}</span>
          <h1 className="display">This week in <em>AI control</em></h1>
          <p className="lede">{issue.summary}</p>
          {isLatest ? null : <p className="small muted">This is an earlier issue. <Link href="/">The latest is here.</Link></p>}
        </div>
        <aside className="newcomer" aria-label="New here?">
          <span className="eyebrow">New here?</span>
          <Link href="/hall-of-fame#start-here">Start with six videos, one evening.</Link>
          <p>The Hall of Fame: what you shouldn’t miss about AI control, safety and how AI works.</p>
        </aside>
      </section>

      <section className="block" aria-labelledby="happened">
        <div className="sec-head">
          <h2 className="h2" id="happened">What happened</h2>
          <p>Each event is confirmed by at least two independent reports. The links go to them.</p>
        </div>
        <Events main={issue.main} also={issue.also} />
      </section>

      <section className="block" aria-labelledby="worth-your-time">
        <div className="sec-head">
          <h2 className="h2" id="worth-your-time">Seven worth your time</h2>
          <p>Picked from everything published this week, in the order we’d open them. The numbers show how people responded, not whether it’s right.</p>
        </div>
        <SignalLegend mode="week" measuredOn={MEASURED_ON} />
        <ol className="picks">
          {issue.picks.map((pick, i) => <PickItem key={pick.id} pick={pick} list={list} mode="week" rank={i + 1} />)}
        </ol>
      </section>

      {newsletterEnabled() ? (
        <section className="subscribe-block" aria-labelledby="subscribe-title">
          <div>
            <h2 className="h2" id="subscribe-title">One email a week.</h2>
            <p>What happened, and the seven pieces worth your time, the day the issue is out.</p>
          </div>
          <SubscribeForm source={`issue-${issue.number}`} />
        </section>
      ) : null}

      <section className="block" aria-labelledby="start-here">
        <div className="sec-head">
          <h2 className="h2" id="start-here">New to all this? <em>Start here.</em></h2>
          <p>Six videos from the Hall of Fame, in order: how it works, who is worried, why it’s hard, what already happened, where it could go, and the strongest objection.</p>
        </div>
        <StartHere />
      </section>
    </div>
  );
}
