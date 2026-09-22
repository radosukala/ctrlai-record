'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MeClient({ mode, handle = '' }: { mode: 'restore' | 'profile'; handle?: string }) {
  const router = useRouter();
  const [name, setName] = useState(handle);
  const [key, setKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    setError(''); setMessage('');
    const response = await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle: name }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.error ?? 'Could not save.');
    setMessage(name.trim() ? 'Saved. Your contributions now show this name.' : 'Saved. You’re shown by your contributor number.');
    router.refresh();
  }

  async function restore(event: React.FormEvent) {
    event.preventDefault();
    setError(''); setMessage('');
    const response = await fetch('/api/me/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.error ?? 'Could not restore.');
    router.refresh();
  }

  return (
    <div className="stack" style={{ ['--stack' as string]: '16px' }}>
      {mode === 'profile' ? (
        <form className="card form" onSubmit={saveName}>
          <div className="field">
            <label htmlFor="handle">Public name</label>
            <input id="handle" className="input" value={name} onChange={event => setName(event.target.value)} maxLength={30} placeholder="Leave empty to stay a number" />
            <p className="hint small muted">A pseudonym is fine. Avoid your real name if you’d rather not be identified.</p>
          </div>
          <button className="btn btn-primary btn-small" type="submit">Save name</button>
        </form>
      ) : (
        <form className="card form" onSubmit={restore}>
          <div className="field">
            <label htmlFor="key">Or paste a contributor key</label>
            <input id="key" className="input mono" value={key} onChange={event => setKey(event.target.value)} autoComplete="off" spellCheck={false} />
            <p className="hint small muted">The key shown when you first contributed, if you saved it.</p>
          </div>
          <button className="btn btn-ghost btn-small" type="submit">Restore</button>
        </form>
      )}
      {message ? <p className="form-ok" role="status">{message}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}

/** Offered only after sign-in, on this page, where the person can see which account they're in. */
export function AdoptCard({ seq, runs, checks, belongsElsewhere, merge }: { seq: number; runs: number; checks: number; belongsElsewhere: boolean; merge: boolean }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function adopt() {
    setError(''); setBusy(true);
    const response = await fetch('/api/me/adopt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setError(body.error ?? 'Could not keep them.');
    router.refresh();
  }
  if (belongsElsewhere) {
    return <div className="note-box" style={{ marginBottom: 24 }}>This browser also holds contributor #{seq}, which belongs to a different account. It stays with that account.</div>;
  }
  return (
    <div className="card card-acid" style={{ marginBottom: 24 }}>
      <h2 className="h4">Keep what this browser holds?</h2>
      <p className="small mt-8">
        This browser holds contributor #{seq}: {runs} {runs === 1 ? 'run' : 'runs'} and {checks} {checks === 1 ? 'check' : 'checks'}.
        {merge ? ' Keeping them merges them into your record. If you had checked your own run from another device, that check is removed, because checks must be independent.' : ' Keeping them adds them to your account, under the same contributor number.'}
      </p>
      <div className="actions mt-16">
        <button type="button" className="btn btn-primary btn-small" onClick={adopt} disabled={busy}>{busy ? 'Keeping…' : 'Keep them with my account'}</button>
      </div>
      {error ? <p className="form-error mt-12" role="alert">{error}</p> : null}
    </div>
  );
}

export function AccountActions() {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [withdrawRuns, setWithdrawRuns] = useState(false);
  const [error, setError] = useState('');
  async function signOut(everywhere: boolean) {
    await fetch(`/api/auth/signout${everywhere ? '?everywhere=1' : ''}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    router.push('/');
    router.refresh();
  }
  async function deleteAccount() {
    setError('');
    const response = await fetch('/api/me/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ withdrawRuns }) });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return setError(body.error ?? 'Could not delete the account.');
    }
    router.push('/');
    router.refresh();
  }
  return (
    <div className="card-flat">
      <h2 className="h4">Account</h2>
      <div className="actions mt-12">
        <button type="button" className="btn btn-ghost btn-small" onClick={() => signOut(false)}>Sign out</button>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => signOut(true)}>Sign out everywhere</button>
      </div>
      {confirmDelete ? (
        <div className="mt-16 stack" style={{ ['--stack' as string]: '10px' }}>
          <p className="small">Deleting the account removes your email address. Your runs and checks stay in the public record under your contributor number, unless you also withdraw them.</p>
          <label className="check"><input type="checkbox" checked={withdrawRuns} onChange={event => setWithdrawRuns(event.target.checked)} /><span>Also withdraw all my runs</span></label>
          <div className="actions">
            <button type="button" className="btn btn-primary btn-small" onClick={deleteAccount}>Delete my account</button>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-ghost btn-small mt-12" onClick={() => setConfirmDelete(true)}>Delete account…</button>
      )}
      {error ? <p className="form-error mt-12" role="alert">{error}</p> : null}
    </div>
  );
}
