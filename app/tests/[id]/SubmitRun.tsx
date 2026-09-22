'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BadgeCheck, Link2, TriangleAlert } from 'lucide-react';
import type { TestDef } from '@/content/tests';
import { PRODUCTS, getProduct } from '@/content/products';
import { checkReceipt } from '@/lib/receipts';
import { SITE } from '@/lib/site';
import { segmentClasses } from '@/lib/outcome-colors';

const normalize = (text: string) => text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();

export function SubmitRun({ test, communityModels = {} }: { test: TestDef; communityModels?: Record<string, string[]> }) {
  const router = useRouter();
  const [productId, setProductId] = useState('');
  const [modelLabel, setModelLabel] = useState('');
  const [personalization, setPersonalization] = useState<'off' | 'on' | 'unknown'>('unknown');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [responses, setResponses] = useState<string[]>(test.turns.map(() => ''));
  const [outcome, setOutcome] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [notes, setNotes] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const product = getProduct(productId);
  const colors = useMemo(() => segmentClasses(test), [test]);
  const curatedModels = product?.modelHints ?? [];
  const communityExtras = (communityModels[productId] ?? [])
    .filter(label => !curatedModels.some(name => name.toLowerCase() === label.toLowerCase()));
  const receipt = useMemo(() => (receiptUrl.trim() && productId ? checkReceipt(receiptUrl, productId) : null), [receiptUrl, productId]);
  const judged = responses[test.judgedTurn] ?? '';
  const excerptOk = !excerpt.trim() || normalize(judged).includes(normalize(excerpt));
  const expectedHit = test.expected ? normalize(judged).includes(test.expected.value.toLowerCase()) : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!productId) return setError('Choose which AI you tested.');
    if (judged.trim().length < 2) return setError(test.turns.length > 1 ? 'Paste the AI’s reply to your last message.' : 'Paste the AI’s reply.');
    if (!outcome) return setError('Choose what the AI did.');
    if (!excerptOk) return setError('The highlighted line must be copied exactly from the AI’s reply.');
    if (receipt && !receipt.ok) return setError(receipt.error ?? 'That receipt link can’t be used.');
    if (!agree) return setError('Please confirm the run can be published and contains no personal information.');
    setBusy(true);
    try {
      const response = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: test.id, productId, modelLabel, personalization, receiptUrl, responses, outcome, excerpt, notes, agree }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? 'Something went wrong. Please try again.');
        return;
      }
      if (body.recoveryKey) {
        try { sessionStorage.setItem('ctrl.recoveryKey', body.recoveryKey); } catch { /* storage unavailable */ }
      }
      router.push(`/r/${body.id}?added=1`);
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form card" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="product">Which AI did you test?</label>
        <select id="product" className="select" value={productId} onChange={event => setProductId(event.target.value)} required>
          <option value="">Choose…</option>
          {PRODUCTS.map(item => <option key={item.id} value={item.id}>{item.name}{item.id !== 'other' ? ` (${item.maker})` : ''}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="model">Which model did the app show? <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
        <input id="model" className="input" list="model-hints" value={modelLabel} onChange={event => setModelLabel(event.target.value)} maxLength={80} placeholder={product ? 'Tap one below, or type what your app shows' : 'Choose the AI first'} />
        <datalist id="model-hints">{[...curatedModels, ...communityExtras].map(hint => <option key={hint} value={hint} />)}</datalist>
        {curatedModels.length ? (
          <div className="model-chips" role="group" aria-label={`Current ${product?.name} models`}>
            {curatedModels.map(name => (
              <button key={name} type="button" className={`chip chip-outline chip-button${modelLabel === name ? ' is-selected' : ''}`} aria-pressed={modelLabel === name} onClick={() => setModelLabel(name)}>{name}</button>
            ))}
          </div>
        ) : null}
        {communityExtras.length ? (
          <div className="model-chips" role="group" aria-label="Also used in verified runs">
            <span className="tiny muted">Also used in verified runs:</span>
            {communityExtras.map(name => (
              <button key={name} type="button" className={`chip chip-outline chip-button${modelLabel === name ? ' is-selected' : ''}`} aria-pressed={modelLabel === name} onClick={() => setModelLabel(name)}>{name}</button>
            ))}
          </div>
        ) : null}
      </div>

      <fieldset>
        <legend>Was memory or personalization on?</legend>
        <div className="choices-row">
          {([['off', 'Off, or a fresh account'], ['on', 'On'], ['unknown', 'Not sure']] as const).map(([value, label]) => (
            <label key={value} className="choice choice-compact">
              <input type="radio" name="personalization" value={value} checked={personalization === value} onChange={() => setPersonalization(value)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <p className="hint small muted">Memory and custom instructions change answers. It’s fine either way; we just record it.</p>
      </fieldset>

      {test.turns.map((turn, index) => {
        const isJudged = index === test.judgedTurn;
        const label = test.turns.length === 1 ? 'Paste its reply' : index === test.judgedTurn ? 'Paste its reply to your second message' : 'Paste its first reply';
        return (
          <div className="field" key={index}>
            <label htmlFor={`reply-${index}`}>{label}{!isJudged ? <span className="muted" style={{ fontWeight: 400 }}> (optional, but helps checkers)</span> : null}</label>
            <textarea id={`reply-${index}`} className="textarea" value={responses[index]} maxLength={8000}
              onChange={event => setResponses(current => current.map((value, i) => (i === index ? event.target.value : value)))}
              placeholder="Copy the whole reply from the app and paste it here." rows={isJudged ? 6 : 4} />
          </div>
        );
      })}
      {test.expected && judged.trim() ? (
        <p className={expectedHit ? 'form-ok' : 'note-box'}>
          {expectedHit ? <>The reply contains the correct output, <span className="mono">{test.expected.value}</span>.</> : <>The reply does not contain the correct output. The correct output is <span className="mono">{test.expected.value}</span>.</>}
        </p>
      ) : null}

      <fieldset>
        <legend>What did it do?</legend>
        <div className="choices">
          {test.outcomes.map(item => (
            <label key={item.id} className="choice">
              <input type="radio" name="outcome" value={item.id} checked={outcome === item.id} onChange={() => setOutcome(item.id)} />
              <span>
                <strong><span className={`chip-swatch ${colors[item.id]}`} aria-hidden="true" />{item.label}</strong>
                <span className="desc">{item.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="receipt">Share link to the chat <span className="muted" style={{ fontWeight: 400 }}>(your receipt)</span></label>
        <input id="receipt" className="input" inputMode="url" value={receiptUrl} onChange={event => setReceiptUrl(event.target.value)} placeholder="https://…" />
        {product && product.id !== 'other' ? <p className="hint small">How: {product.howToShare}</p> : null}
        {product?.note ? <p className="hint small status-disputed">Note: {product.note}</p> : null}
        {receipt ? (
          receipt.ok ? (
            receipt.kind === 'provider'
              ? <p className="small inline-icon status-verified"><BadgeCheck size={15} aria-hidden="true" /> A share link hosted by {product?.id === 'other' ? 'the AI’s maker' : product?.maker}. This run can become verified.</p>
              : <p className="small inline-icon status-disputed"><Link2 size={15} aria-hidden="true" /> Not a share link from {product?.maker ?? 'the AI’s maker'}. It will be kept, but the run can only be “rated”, not “verified”.</p>
          ) : <p className="small inline-icon status-removed"><TriangleAlert size={15} aria-hidden="true" /> {receipt.error}</p>
        ) : (
          <p className="hint small muted">Without a share link your run still counts, but only as “rated”. Check that the shared page doesn’t show your name or other details you’d rather keep private.</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="excerpt">The line that says it best <span className="muted" style={{ fontWeight: 400 }}>(optional; shown on your share card)</span></label>
        <textarea id="excerpt" className="textarea" style={{ minHeight: 70 }} value={excerpt} onChange={event => setExcerpt(event.target.value)} maxLength={280} placeholder="Copy one sentence exactly from its reply" />
        {!excerptOk ? <p className="small status-removed">This line isn’t in the reply above. Copy it exactly.</p> : null}
      </div>

      <div className="field">
        <label htmlFor="notes">Notes for checkers <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
        <textarea id="notes" className="textarea" style={{ minHeight: 70 }} value={notes} onChange={event => setNotes(event.target.value)} maxLength={500} placeholder="E.g. “it searched the web first” or “I used voice mode”." />
      </div>

      <label className="check">
        <input type="checkbox" checked={agree} onChange={event => setAgree(event.target.checked)} />
        <span>I understand this run, its reply and its receipt link will be public under {SITE.dataLicense}, and that they contain no personal information. I can withdraw it later from this browser.</span>
      </label>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : <>Add to the record <ArrowRight size={17} aria-hidden="true" /></>}</button>
        <span className="small muted">No account needed. Afterwards you can keep your record with an email sign-in link.</span>
      </div>
    </form>
  );
}
