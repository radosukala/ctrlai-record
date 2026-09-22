'use client';

import { useState } from 'react';
import { ThumbsUp } from 'lucide-react';

export function SupportButton({ id, initial }: { id: string; initial: number }) {
  const [count, setCount] = useState(initial);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  async function support() {
    setError('');
    const response = await fetch(`/api/proposals/${id}/support`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.error ?? 'Could not record that.');
    setCount(body.support);
    setDone(true);
  }
  return (
    <span className="inline-icon">
      <button type="button" className="btn btn-ghost btn-small" onClick={support} disabled={done} aria-pressed={done}>
        <ThumbsUp size={14} aria-hidden="true" /> {done ? 'You’d run this' : 'I’d run this'} · {count}
      </button>
      {error ? <span className="tiny" role="alert">{error}</span> : null}
    </span>
  );
}
