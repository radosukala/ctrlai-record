import Link from 'next/link';
import type { Issue } from '@/content/issues';
import { START_HERE } from '@/content/hall';
import { dateRange } from '@/lib/site';
import { MEASURED_ON } from '@/lib/stats';
import { Events } from './Events';
import { PickItem, SignalLegend } from './Picks';
import { Section } from './Section';
import { StartHere, startHereDuration } from './StartHere';
import { SubscribeForm } from './SubscribeForm';
import { newsletterEnabled } from '@/lib/newsletter/config';

export function IssueView({ issue, isLatest }: { issue: Issue; isLatest: boolean }) {
  const list = `week-${issue.slug}`;
  return (
    <div className="page">
      <div className="shell">
        <header className="hero">
          <div className="hero-main">
            <p className="dateline">
              <b>This week in AI control</b>
              <span>Issue {issue.number}</span>
              <span>{dateRange(issue.from, issue.to)}</span>
            </p>
            <h1 className="headline">{issue.summary}</h1>
            {isLatest ? null : <p className="small muted">This is an earlier issue. <Link href="/">The latest is here.</Link></p>}
          </div>
          <nav className="index" aria-label="In this issue">
            <a href="#happened"><span className="cap">1</span><b>What happened</b><small>{issue.main.length} events and {issue.also.length} in brief, each confirmed by two reports</small></a>
            <a href="#worth-your-time"><span className="cap">2</span><b>Seven worth your time</b><small>Picked from everything published this week</small></a>
            <a href="#start-here"><span className="cap">3</span><b>New here? Start here</b><small>{START_HERE.length} videos, one evening, {startHereDuration()}</small></a>
          </nav>
        </header>
      </div>

      <div className="shell">
        <Section id="happened" title="What happened" blurb="Each event is confirmed by at least two independent reports. The links go to them.">
          <Events main={issue.main} also={issue.also} />
        </Section>
      </div>

      <div className="shell">
        <Section
          id="worth-your-time"
          title="Seven worth your time"
          blurb="Picked from everything published this week, in the order we’d open them. The numbers show how people responded, not whether it’s right."
          rail={<SignalLegend mode="week" measuredOn={MEASURED_ON} />}
        >
          <ol className="picks">
            {issue.picks.map((pick, i) => <PickItem key={pick.id} pick={pick} list={list} mode="week" rank={i + 1} />)}
          </ol>
        </Section>
      </div>

      {newsletterEnabled() ? (
        <div className="shell">
          <Section id="subscribe-title" title="One email a week." blurb="What happened, and the seven pieces worth your time, the day the issue is out.">
            <div className="subscribe-body">
              <SubscribeForm source={`issue-${issue.number}`} />
              <p className="subscribe-note">You’ll get one email to confirm. Every issue has a one-click unsubscribe. <Link href="/about#privacy">How we handle your address</Link>.</p>
            </div>
          </Section>
        </div>
      ) : null}

      <div className="band">
        <div className="shell">
          <Section
            id="start-here"
            title={<>New to all this? <em>Start here.</em></>}
            blurb="Six videos from the Hall of Fame, in order: how it works, who is worried, why it’s hard, what already happened, where it could go, and the strongest objection."
          >
            <StartHere />
          </Section>
        </div>
      </div>
    </div>
  );
}
