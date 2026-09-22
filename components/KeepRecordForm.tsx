'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';

/** Asks for an email address and sends a one-time sign-in link. No password, nothing public. */
export function KeepRecordForm({ next = '/me', compact = false }: { next?: string; compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setState('sending');
    try {
      const response = await fetch('/api/auth/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, next }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? 'The link could not be sent.');
        setState('idle');
        return;
      }
      setState('sent');
    } catch {
      setError('Could not reach the server. Please try again.');
      setState('idle');
    }
  }

  if (state === 'sent') {
    return (
      <div className="form-ok" role="status">
        <strong>Check your inbox.</strong> We sent a sign-in link to {email}. It works once, for 30 minutes. Open it on this device to keep this browser’s contributions with your account.
      </div>
    );
  }
  return (
    <form className={compact ? 'actions' : 'form'} onSubmit={submit} noValidate style={compact ? { alignItems: 'flex-start' } : undefined}>
      <div className="field" style={compact ? { flex: '1 1 240px' } : undefined}>
        {compact ? <label className="sr-only" htmlFor="keep-email">Email address</label> : <label htmlFor="keep-email">Email address</label>}
        <input id="keep-email" className="input" type="email" inputMode="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
        {compact ? null : <p className="hint small muted">We use it only to send sign-in links. It is never shown, shared or published.</p>}
      </div>
      <button type="submit" className="btn btn-primary" disabled={state === 'sending'}>
        <Mail size={16} aria-hidden="true" /> {state === 'sending' ? 'Sending…' : 'Send me a sign-in link'}
      </button>
      {error ? <p className="form-error" role="alert" style={{ flexBasis: '100%' }}>{error}</p> : null}
    </form>
  );
}
