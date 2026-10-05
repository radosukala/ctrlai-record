import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LATEST } from '@/content/issues';
import { Section } from '@/components/Section';
import { SubscribeForm } from '@/components/SubscribeForm';
import { newsletterEnabled } from '@/lib/newsletter/config';

export const metadata: Metadata = {
  title: 'Subscribe',
  description: 'One email a week: what happened in AI control, each item confirmed by two independent reports, and the seven pieces worth your time.',
  alternates: { canonical: '/subscribe' },
};

export default function SubscribePage() {
  if (!newsletterEnabled()) notFound();
  return (
    <div className="page">
      <div className="shell">
        <header className="hero">
          <div className="hero-main">
            <p className="dateline"><b>The weekly email</b></p>
            <h1 className="headline">Get the week <em>in your inbox.</em></h1>
            <p className="lede">The same as the front page, once a week, without having to remember to look.</p>
            <SubscribeForm source="page" />
            <p className="subscribe-note">You’ll get one email to confirm. Every issue has a one-click unsubscribe. <Link href="/about#privacy">How we handle your address</Link>.</p>
          </div>
        </header>
      </div>

      <div className="shell">
        <Section id="inside" title="What’s in it">
          <div className="prose">
            <ul>
              <li><strong>What happened.</strong> The events that mattered that week, each confirmed by two independent reports, with the links.</li>
              <li><strong>Seven worth your time.</strong> Videos, posts, articles and papers, in the order we’d open them, with why and how people responded.</li>
              <li><strong>Where to start.</strong> A link to the Hall of Fame, for the people you forward it to.</li>
            </ul>
            <p>See what it looks like: <Link href="/">the latest issue, issue {LATEST.number}</Link>.</p>
          </div>
        </Section>
      </div>
    </div>
  );
}
