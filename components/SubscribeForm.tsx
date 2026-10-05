'use client';

import { useActionState, useEffect, useId } from 'react';
import { subscribe } from '@/app/subscribe/actions';
import { track } from '@/lib/analytics';
import type { SubscribeState } from './subscribe-state';

const initial: SubscribeState = { status: 'idle' };

/**
 * An email box that asks for confirmation before it adds anyone. It works without JavaScript, because it is a
 * plain form posting to a server action; with JavaScript it answers in place.
 */
export function SubscribeForm({ source }: { /** Where the form sits, for counting which one works. */ source: string }) {
  const [state, action, pending] = useActionState(subscribe, initial);
  const id = useId();

  useEffect(() => {
    if (state.status === 'sent') track('subscribe_requested', { source });
  }, [state.status, source]);

  if (state.status === 'sent') {
    return (
      <div className="subscribe-done" role="status">
        <strong>Check your inbox.</strong>
        <span>We sent a link to {state.email}. Press the button in that email to finish; nothing arrives until you do.</span>
        <span className="subscribe-small">Not there after a minute? Look in spam, or try again tomorrow.</span>
      </div>
    );
  }

  return (
    <form action={action} className="subscribe-form">
      <label htmlFor={`${id}-email`} className="sr-only">Email address</label>
      <input
        id={`${id}-email`}
        name="email"
        type="email"
        required
        maxLength={254}
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        defaultValue={state.email ?? ''}
      />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp" defaultValue="" />
      <button type="submit" disabled={pending}>{pending ? 'Sending…' : 'Subscribe'}</button>
      {state.status === 'error' ? <p className="subscribe-error" role="alert">{state.message}</p> : null}
    </form>
  );
}
