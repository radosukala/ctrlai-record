'use server';

import { redirect } from 'next/navigation';
import { LATEST } from '@/content/issues';
import type { SubscribeState } from '@/components/subscribe-state';
import { newsletterConfig } from '@/lib/newsletter/config';
import { finishSubscription, startSubscription } from '@/lib/newsletter/flow';
import { SITE } from '@/lib/site';

const deps = () => ({ config: newsletterConfig(), origin: SITE.url, latest: { slug: LATEST.slug, number: LATEST.number } });

const MESSAGE = {
  invalid: 'That doesn’t look like an email address.',
  busy: 'We can’t send confirmations right now. Please try again tomorrow.',
  unavailable: 'Something went wrong on our side. Please try again in a few minutes.',
};

/** Step one: email a link. Nobody is on the list until they press the button it leads to. */
export async function subscribe(_previous: SubscribeState, formData: FormData): Promise<SubscribeState> {
  const email = String(formData.get('email') ?? '').slice(0, 254);
  const result = await startSubscription(deps(), { email, website: String(formData.get('website') ?? '') });
  if (result.ok) return { status: 'sent', email: result.email };
  return { status: 'error', message: MESSAGE[result.reason], email };
}

/** Step two: the button on the confirm page. This is the moment someone joins the list. */
export async function confirm(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '');
  const result = await finishSubscription(deps(), token);
  if (!result.ok) redirect(`/subscribe/confirm?token=${encodeURIComponent(token)}&problem=${result.reason}`);
  redirect('/subscribe/confirmed');
}
