import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SubscribeForm } from '@/components/SubscribeForm';
import { newsletterConfig } from '@/lib/newsletter/config';
import { inspectToken } from '@/lib/newsletter/flow';
import { confirm } from '../actions';

export const metadata: Metadata = {
  title: 'Confirm your subscription',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

const PROBLEM: Record<string, string> = {
  unavailable: 'Something went wrong on our side, and you’re not subscribed yet. Please press the button again in a few minutes.',
};

/**
 * Opening the link changes nothing: it shows a button, and pressing it subscribes. Mail programs that open links to
 * scan them can't press a button, so nobody is added by a scanner or by someone else's typo.
 */
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string; problem?: string }> }) {
  const config = newsletterConfig();
  if (!config) notFound();
  const { token = '', problem } = await searchParams;
  const checked = inspectToken({ config }, token);

  if (!checked.ok) {
    return (
      <div className="read page">
        <section className="hero-text">
          <span className="eyebrow">Confirm your subscription</span>
          <h1 className="display">That link <em>has run out.</em></h1>
          <p className="lede">Confirmation links work for a few days, and each one only for the address it was sent to. Enter your address and we’ll send a fresh one.</p>
          <SubscribeForm source="confirm-expired" />
        </section>
      </div>
    );
  }

  return (
    <div className="read page">
      <section className="hero-text">
        <span className="eyebrow">Confirm your subscription</span>
        <h1 className="display">One last <em>step.</em></h1>
        <p className="lede">Press the button to get Ctrl AI’s weekly issue at <strong>{checked.email}</strong>.</p>
        {problem && PROBLEM[problem] ? <p className="subscribe-error" role="alert">{PROBLEM[problem]}</p> : null}
        <form action={confirm} className="subscribe-confirm">
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="btn btn-primary">Yes, send me the weekly issue</button>
        </form>
        <p className="small muted">If this wasn’t you, just close this page. Nothing happens until you press the button.</p>
      </section>
    </div>
  );
}
