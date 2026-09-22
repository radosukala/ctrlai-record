import type { Metadata } from 'next';
import { ConfirmClient } from './ConfirmClient';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

/**
 * The emailed link lands here. Opening it signs nobody in: the token sits in the URL fragment,
 * which never reaches the server, and it is spent only when the person presses the button.
 * Link scanners that pre-open emails therefore can't use up the link, and the person sees which
 * address they are about to sign in as before anything happens.
 */
export default function ConfirmPage() {
  return (
    <section className="test-hero">
      <div className="shell" style={{ maxWidth: 640 }}>
        <ConfirmClient />
      </div>
    </section>
  );
}
