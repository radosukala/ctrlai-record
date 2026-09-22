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
    <aside className="stack sticky" style={{ ['--stack' as string]: '16px' }}>
      {mode === 'profile' ? (
        <form className="card form" onSubmit={saveName}>
          <div className="field">
            <label htmlFor="handle">Public name</label>
            <input id="handle" className="input" value={name} onChange={event => setName(event.target.value)} maxLength={30} placeholder="Leave empty to stay a number" />
            <p className="hint small muted">A pseudonym is fine. Avoid your real name if you’d rather not be identified.</p>
          </div>
          <button className="btn btn-primary btn-small" type="submit">Save name</button>
        </form>
      ) : null}
      <form className="card form" onSubmit={restore}>
        <div className="field">
          <label htmlFor="key">{mode === 'profile' ? 'Switch to another contributor key' : 'Already a contributor? Paste your key'}</label>
          <input id="key" className="input mono" value={key} onChange={event => setKey(event.target.value)} autoComplete="off" spellCheck={false} />
          <p className="hint small muted">The key you saved when you first contributed. It stays on this device only as a cookie.</p>
        </div>
        <button className="btn btn-ghost btn-small" type="submit">Restore</button>
      </form>
      {message ? <p className="form-ok" role="status">{message}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </aside>
  );
}
