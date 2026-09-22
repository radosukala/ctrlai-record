import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Wordmark } from './Brand';
import { NavLinks } from './NavLinks';
import { AccountLink } from './AccountLink';
import { SITE } from '@/lib/site';

export const NAV = [
  { href: '/tests', label: 'Tests' },
  { href: '/record', label: 'Record' },
  { href: '/verify', label: 'Verify' },
  { href: '/questions', label: 'Questions' },
  { href: '/library', label: 'Library' },
  { href: '/about', label: 'About' },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell">
        <Wordmark />
        <NavLinks items={NAV} />
        <AccountLink className="account-link" />
        <Link href="/tests/peer-pressure" className="btn btn-primary btn-small header-cta">Test your AI</Link>
        <details className="mobile-nav">
          <summary><Menu size={16} aria-hidden="true" /> Menu</summary>
          <nav className="menu-panel" aria-label="Main">
            {NAV.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            <AccountLink />
            <Link href="/tests/peer-pressure"><strong>Test your AI →</strong></Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-grid">
          <div>
            <Wordmark />
            <p className="mt-16 small" style={{ maxWidth: '26em' }}>
              {SITE.tagline} Kept by the people who use AI, checked by strangers, open to everyone.
            </p>
          </div>
          <div>
            <h2>Take part</h2>
            <ul>
              <li><Link href="/tests">Run a test</Link></li>
              <li><Link href="/verify">Verify runs</Link></li>
              <li><Link href="/library/add">Add to the library</Link></li>
              <li><Link href="/tests/propose">Propose a test</Link></li>
            </ul>
          </div>
          <div>
            <h2>Understand</h2>
            <ul>
              <li><Link href="/questions">Ten questions</Link></li>
              <li><Link href="/library">Library</Link></li>
              <li><Link href="/record">The record</Link></li>
            </ul>
          </div>
          <div>
            <h2>Trust</h2>
            <ul>
              <li><Link href="/about">How it works</Link></li>
              <li><Link href="/about#charter">Charter</Link></li>
              <li><Link href="/log">Public log</Link></li>
              <li><Link href="/data">Open data</Link></li>
              <li><a href={SITE.repoUrl}>Source code</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-note">
          <span>Data: <a href={SITE.dataLicenseUrl}>{SITE.dataLicense}</a></span>
          <span>Code: <a href={SITE.repoUrl}>GitHub</a>, <a href={SITE.codeLicenseUrl}>{SITE.codeLicense}</a></span>
          <span>No ads. No trackers. No money from the companies we test.</span>
        </div>
      </div>
    </footer>
  );
}
