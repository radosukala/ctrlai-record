'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

interface PendingWork {
  id: string;
  url: string;
  title: string;
  creators: string;
  publisher: string;
  published: string;
  type: string;
  questions: string[];
  level: string;
  summary: string;
  yours: boolean;
}

export function ReviewClient() {
  const [work, setWork] = useState<PendingWork | null | undefined>(undefined);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setWork(undefined); setReason(''); setError('');
    const response = await fetch('/api/works/review', { cache: 'no-store' });
    const body = await response.json().catch(() => ({ work: null }));
    setWork(body.work ?? null);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function decide(decision: 'list' | 'reject') {
    if (!work) return;
    if (decision === 'reject' && reason.trim().length < 5) return setError('Say briefly why it should be declined. Reasons are shown to other reviewers.');
    const response = await fetch('/api/works/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workId: work.id, decision, reason }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.error ?? 'Could not save your review.');
    setMessage(body.status === 'listed' ? `“${work.title}” is now listed.` : body.status === 'rejected' ? `“${work.title}” was declined.` : 'Thanks. One more review is needed.');
    load();
  }

  if (work === undefined) return <div className="card"><p className="muted">Loading…</p></div>;
  if (work === null) {
    return (
      <div className="empty">
        {message ? <p className="form-ok" style={{ marginBottom: 12 }}>{message}</p> : null}
        <h3>Nothing waiting for review.</h3>
        <p>Every new addition has been reviewed, or was added by you. <Link href="/library/add">Add something</Link> or <Link href="/verify">verify a run</Link>.</p>
      </div>
    );
  }
  return (
    <div className="split-wide">
      <article className="card stack" style={{ ['--stack' as string]: '12px' }}>
        {message ? <p className="form-ok">{message}</p> : null}
        <span className="kind">{work.type}{work.published ? ` · ${work.published}` : ''} · {work.level}</span>
        <h2 className="h3">{work.title}</h2>
        <p className="small muted">{[work.creators, work.publisher].filter(Boolean).join(' · ')}</p>
        <a href={work.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="receipt-link">{work.url} <ArrowUpRight size={14} aria-hidden="true" /></a>
        <p className="big-quote" style={{ fontSize: 22 }}>{work.summary}</p>
        <p className="tiny muted">Questions: {work.questions.join(', ')}</p>
      </article>
      <aside className="card form sticky">
        <p className="small">Open the link first. List it if the link works, the details match and the summary is fair.</p>
        <div className="field">
          <label htmlFor="reason">Reason <span className="muted" style={{ fontWeight: 400 }}>(needed to decline)</span></label>
          <textarea id="reason" className="textarea" style={{ minHeight: 80 }} value={reason} onChange={event => setReason(event.target.value)} maxLength={300} />
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => decide('list')}>List it</button>
          <button type="button" className="btn btn-ghost" onClick={() => decide('reject')}>Decline</button>
        </div>
      </aside>
    </div>
  );
}
