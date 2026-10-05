import Link from 'next/link';
import { Wordmark } from './Brand';
import { NavLinks } from './NavLinks';
import { AnalyticsSettingsButton } from './Analytics';
import { FooterSubscribe } from './FooterSubscribe';
import { newsletterEnabled } from '@/lib/newsletter/config';
import { SITE } from '@/lib/site';

export const NAV = [
  { href: '/', label: 'This week', also: '/week/' },
  { href: '/hall-of-fame', label: 'Hall of Fame' },
  { href: '/about', label: 'About' },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell">
        <Wordmark />
        <NavLinks items={newsletterEnabled() ? [...NAV, { href: '/subscribe', label: 'Subscribe', key: true }] : NAV} />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-top">
          <div>
            <Wordmark />
            <p className="footer-line">The feed forgets. This page doesn’t.</p>
          </div>
          <nav className="footer-links" aria-label="Footer">
            <Link href="/">This week</Link>
            <a href="/feed.xml">RSS</a>
            <Link href="/hall-of-fame">Hall of Fame</Link>
            <a href={SITE.suggestUrl}>Suggest something</a>
            <Link href="/about">How we pick</Link>
            <a href={SITE.repoUrl}>Source code</a>
          </nav>
        </div>
        {newsletterEnabled() ? <FooterSubscribe /> : null}
        <div className="footer-note">
          <span>Visits are counted without cookies; Google Analytics only if you agree. <AnalyticsSettingsButton className="footer-button" /></span>
          <span>Our words: <a href={SITE.contentLicenseUrl}>{SITE.contentLicense}</a>. Code: <a href={SITE.codeLicenseUrl}>{SITE.codeLicense}</a>.</span>
        </div>
      </div>
    </footer>
  );
}
