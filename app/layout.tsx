import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/newsreader/standard.css';
import '@fontsource-variable/newsreader/standard-italic.css';
import '@fontsource-variable/schibsted-grotesk/wght.css';
import './globals.css';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import { Analytics } from '@/components/Analytics';
import { TrackOutbound } from '@/components/TrackOutbound';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: 'Ctrl AI · This week in AI control', template: '%s · Ctrl AI' },
  description: SITE.description,
  openGraph: { siteName: SITE.name, type: 'website' },
  twitter: { card: 'summary_large_image' },
  alternates: { types: { 'application/rss+xml': [{ url: '/feed.xml', title: 'Ctrl AI · This week in AI control' }] } },
};

export const viewport: Viewport = { themeColor: '#f4f1ea' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <Analytics />
        <VercelAnalytics />
        <TrackOutbound />
      </body>
    </html>
  );
}
