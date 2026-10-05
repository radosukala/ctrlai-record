'use client';

import { usePathname } from 'next/navigation';
import { SubscribeForm } from './SubscribeForm';

/** The signup in the footer of every page, except the pages that are already about subscribing. */
export function FooterSubscribe() {
  if (usePathname().startsWith('/subscribe')) return null;
  return (
    <div className="footer-subscribe">
      <div>
        <p className="footer-subscribe-title">Get the week in your inbox.</p>
        <p>One email a week. Unsubscribe in one click.</p>
      </div>
      <SubscribeForm source="footer" />
    </div>
  );
}
