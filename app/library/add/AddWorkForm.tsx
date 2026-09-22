'use client';

import { useState } from 'react';
import Link from 'next/link';

export function AddWorkForm({ questions, types }: { questions: { id: string; title: string }[]; types: { id: string; label: string }[] }) {
  const [form, setForm] = useState({ url: '', title: '', creators: '', publisher: '', published: '', type: '', level: 'curious', summary: '' });
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ id: string; existing: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(current => ({ ...current, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/works', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, questions: picked }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return setError(body.error ?? 'Could not add this work.');
      setDone({ id: body.id, existing: body.existing });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card" role="status">
        <h2 className="h3">{done.existing ? 'Already in the library.' : 'Thank you. It’s waiting for review.'}</h2>
        <p className="small muted mt-12">
          {done.existing ? 'Someone added this link before, so we kept a single entry.' : 'Two other people will check the link and your summary. You can review other people’s additions while you wait.'}
        </p>
        <div className="actions mt-16">
          <Link href="/library/review" className="btn btn-primary">Review other additions</Link>
          <button type="button" className="btn btn-ghost" onClick={() => { setDone(null); setForm({ url: '', title: '', creators: '', publisher: '', published: '', type: '', level: 'curious', summary: '' }); setPicked([]); }}>Add another</button>
        </div>
      </div>
    );
  }

  return (
    <form className="form card" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="url">Link</label>
        <input id="url" className="input" inputMode="url" value={form.url} onChange={set('url')} placeholder="https://…" required />
      </div>
      <div className="field">
        <label htmlFor="title">Title, as published</label>
        <input id="title" className="input" value={form.title} onChange={set('title')} maxLength={200} required />
      </div>
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="creators">By <span className="muted" style={{ fontWeight: 400 }}>(authors or organization)</span></label>
          <input id="creators" className="input" value={form.creators} onChange={set('creators')} maxLength={160} />
        </div>
        <div className="field">
          <label htmlFor="publisher">Published by <span className="muted" style={{ fontWeight: 400 }}>(outlet or site)</span></label>
          <input id="publisher" className="input" value={form.publisher} onChange={set('publisher')} maxLength={120} />
        </div>
      </div>
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="type">Kind</label>
          <select id="type" className="select" value={form.type} onChange={set('type')} required>
            <option value="">Choose…</option>
            {types.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="published">Date <span className="muted" style={{ fontWeight: 400 }}>(2026, 2026-07 or 2026-07-21)</span></label>
          <input id="published" className="input" value={form.published} onChange={set('published')} placeholder="2026-07-21" />
        </div>
      </div>
      <fieldset>
        <legend>Which questions does it help answer?</legend>
        <div className="choices-row">
          {questions.map(question => (
            <label key={question.id} className="choice choice-compact">
              <input type="checkbox" checked={picked.includes(question.id)} onChange={event => setPicked(current => event.target.checked ? [...current, question.id] : current.filter(id => id !== question.id))} />
              <span className="small">{question.title}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Who is it for?</legend>
        <div className="choices-row">
          {[['everyone', 'Everyone'], ['curious', 'The curious'], ['technical', 'Specialists']].map(([value, label]) => (
            <label key={value} className="choice choice-compact">
              <input type="radio" name="level" checked={form.level === value} onChange={() => setForm(current => ({ ...current, level: value }))} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="summary">In one sentence: what does it show, and why does it matter?</label>
        <textarea id="summary" className="textarea" style={{ minHeight: 90 }} value={form.summary} onChange={set('summary')} maxLength={240} required />
        <div className="counter">{form.summary.length}/240</div>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add for review'}</button>
        <span className="small muted">Entries are public under CC BY 4.0.</span>
      </div>
    </form>
  );
}
