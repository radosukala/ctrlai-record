'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export function ConfirmClient() {
  // Read the link once. The fragment is cleared right after, so a second read (React runs effects twice
  // in development) must not overwrite the token with an empty one.
  const link = useRef<{ token: string; next: string } | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [state, setState] = useState<'checking' | 'ready' | 'invalid' | 'signing'>('checking');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!link.current) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      link.current = { token: params.get('token') ?? '', next: params.get('next') ?? '/me' };
      // Keep the token out of the address bar and history once read.
      window.history.replaceState(null, '', window.location.pathname);
    }
    const found = link.current.token;
    if (!found) {
      setState('invalid');
      return;
    }
    fetch('/api/auth/peek', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: found }) })
      .then(async response => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) { setState('invalid'); return; }
        setEmail(body.email);
        setState('ready');
      })
      .catch(() => setState('invalid'));
  }, []);

  async function signIn() {
    setError('');
    setState('signing');
    const { token, next } = link.current ?? { token: '', next: '/me' };
    const response = await fetch('/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, next }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error ?? 'Signing in failed.');
      setState('invalid');
      return;
    }
    window.location.assign(`${body.next ?? '/me'}${(body.next ?? '/me').includes('?') ? '&' : '?'}signedin=1`);
  }

  if (state === 'checking') return <p className="lede">Checking your link…</p>;
  if (state === 'invalid') {
    return (
      <div className="stack" style={{ ['--stack' as string]: '16px' }}>
        <span className="eyebrow"><span className="dot" /> Sign in</span>
        <h1 className="title">This link has expired or was already used.</h1>
        {error ? <p className="form-error">{error}</p> : null}
        <p className="lede">Links work once, for 30 minutes. Ask for a new one; it takes a few seconds.</p>
        <div className="actions"><Link href="/signin" className="btn btn-primary">Send a new link</Link></div>
      </div>
    );
  }
  return (
    <div className="stack" style={{ ['--stack' as string]: '16px' }}>
      <span className="eyebrow"><span className="dot" /> Sign in</span>
      <h1 className="title">Sign in as {email}?</h1>
      <p className="lede">If that isn’t your address, close this page. Someone may have sent you a link to their own account.</p>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={signIn} disabled={state === 'signing'}>{state === 'signing' ? 'Signing in…' : 'Yes, sign me in'}</button>
        <Link href="/" className="btn btn-ghost">Not me</Link>
      </div>
    </div>
  );
}
