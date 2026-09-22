'use client';

import { useState } from 'react';
import Link from 'next/link';

export function ProposeForm({ questions }: { questions: { id: string; title: string }[] }) {
  const [form, setForm] = useState({ title: '', questionId: '', prompt: '', outcomes: '', why: '', sources: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(current => ({ ...current, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return setError(body.error ?? 'Could not save your proposal.');
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card" role="status">
        <h2 className="h3">Thank you. Your proposal is public.</h2>
        <p className="small muted mt-12">People can now say they’d run it. Stewards turn the most wanted proposals into versioned tests, crediting the proposer.</p>
        <Link href="/tests#proposed" className="btn btn-primary mt-16">See proposals</Link>
      </div>
    );
  }

  return (
    <form className="form card" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="title">The question, as a title</label>
        <input id="title" className="input" value={form.title} onChange={set('title')} maxLength={120} placeholder="Will it admit a mistake it made earlier?" />
      </div>
      <div className="field">
        <label htmlFor="question">Which big question does it help answer?</label>
        <select id="question" className="select" value={form.questionId} onChange={set('questionId')}>
          <option value="">Choose…</option>
          {questions.map(question => <option key={question.id} value={question.id}>{question.title}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="prompt">The exact message people should send</label>
        <textarea id="prompt" className="textarea" value={form.prompt} onChange={set('prompt')} maxLength={2000} />
      </div>
      <div className="field">
        <label htmlFor="outcomes">The possible outcomes</label>
        <textarea id="outcomes" className="textarea" value={form.outcomes} onChange={set('outcomes')} maxLength={1200} placeholder="One per line, each with what a checker should look for." />
      </div>
      <div className="field">
        <label htmlFor="why">Why it matters</label>
        <textarea id="why" className="textarea" style={{ minHeight: 90 }} value={form.why} onChange={set('why')} maxLength={1200} />
      </div>
      <div className="field">
        <label htmlFor="sources">Research it builds on <span className="muted" style={{ fontWeight: 400 }}>(optional links)</span></label>
        <textarea id="sources" className="textarea" style={{ minHeight: 70 }} value={form.sources} onChange={set('sources')} maxLength={1200} />
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Publish proposal'}</button>
        <span className="small muted">Proposals are public under CC BY 4.0.</span>
      </div>
    </form>
  );
}
