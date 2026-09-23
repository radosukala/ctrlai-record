import type { Metadata, Viewport } from 'next';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './globals.css';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { ChromeGate } from '@/components/ChromeGate';
import { Analytics } from '@/components/Analytics';
import { SERIES } from '@/content/tomorrows';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: 'Ctrl AI · Other Tomorrows', template: '%s — Ctrl AI' },
  description: SERIES.description,
  openGraph: { siteName: SITE.name, type: 'website' },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { themeColor: '#f5f4ee' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <ChromeGate><SiteHeader /></ChromeGate>
        <main id="main">{children}</main>
        <ChromeGate><SiteFooter /></ChromeGate>
        <Analytics />
      </body>
    </html>
  );
}
