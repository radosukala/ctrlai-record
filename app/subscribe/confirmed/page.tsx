import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LATEST } from '@/content/issues';
import { newsletterEnabled } from '@/lib/newsletter/config';

export const metadata: Metadata = { title: 'You’re subscribed', robots: { index: false, follow: false } };

export default function ConfirmedPage() {
  if (!newsletterEnabled()) notFound();
  return (
    <div className="page">
      <div className="shell">
        <header className="hero">
          <div className="hero-main">
            <p className="dateline"><b>Subscribed</b></p>
            <h1 className="headline">You’re <em>in.</em></h1>
            <p className="lede">The next issue will arrive in your inbox. A welcome email with the latest issue is on its way.</p>
            <p>
              <Link href="/" className="key key-primary">Read issue {LATEST.number} now</Link>{' '}
              <Link href="/hall-of-fame#start-here" className="key">Six videos to start with</Link>
            </p>
          </div>
        </header>
      </div>
    </div>
  );
}
