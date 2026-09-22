'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BadgeCheck, Link2, RotateCw } from 'lucide-react';
import { getOutcome, getTest } from '@/content/tests';
import { getProduct } from '@/content/products';
import { segmentClasses } from '@/lib/outcome-colors';

interface Item {
  id: string;
  testId: string;
  productId: string;
  modelLabel: string;
  personalization: string;
  receiptUrl: string | null;
  receiptKind: string;
  responses: string[];
  notes: string;
  createdAt: string;
  checks: number;
}

interface Result {
  status: string;
  consensusOutcome: string | null;
  receiptStatus: string;
  submitterOutcome: string;
  checks: number;
}

const STATUS_AFTER: Record<string, string> = {
  verified: 'With your check, this run is now verified.',
  rated: 'With your check, this run’s rating is agreed. It has no confirmable receipt, so it counts as “rated”.',
  unverified: 'It needs more checks before it’s settled.',
  disputed: 'Checkers disagree, so this run is now marked as disputed.',
  rejected: 'Checkers found a problem, so this run has been rejected.',
  hidden: 'This run is now hidden because it may contain personal information.',
};

export function VerifyClient({ testId }: { testId?: string }) {
  const [item, setItem] = useState<Item | null | undefined>(undefined);
  const [receiptCheck, setReceiptCheck] = useState('');
  const [outcome, setOutcome] = useState('');
  const [flag, setFlag] = useState('none');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [done, setDone] = useState(0);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);

  const [skipped, setSkipped] = useState<string[]>([]);

  const load = useCallback(async (skip: string[] = []) => {
    setItem(undefined);
    setReceiptCheck(''); setOutcome(''); setFlag('none'); setError(''); setResult(null);
    const query = new URLSearchParams();
    if (testId) query.set('test', testId);
    if (skip.length) query.set('skip', skip.join(','));
    const response = await fetch(`/api/verify/next?${query}`, { cache: 'no-store' });
    const body = await response.json().catch(() => ({ run: null }));
    setItem(body.run ?? null);
  }, [testId]);

  function skip() {
    if (!item) return;
    const next = [...skipped, item.id];
    setSkipped(next);
    load(next);
  }

  useEffect(() => { load(); }, [load]);

  const test = item ? getTest(item.testId) : undefined;
  const product = item ? getProduct(item.productId) : undefined;
  const colors = useMemo(() => (test ? segmentClasses(test) : {}), [test]);

  if (item === undefined) return <div className="card"><p className="muted">Finding a run for you to check…</p></div>;
  if (item === null || !test) {
    return (
      <div className="empty">
        <h3>{done ? `Thank you. You checked ${done} ${done === 1 ? 'run' : 'runs'}.` : 'Nothing to check right now.'}</h3>
        <p>
          Every run that needs a check has been checked by you, or was added from your own network.
          The record grows when people run tests: <Link href="/tests">run one yourself</Link>, or share a test with someone who uses a different AI.
        </p>
        {recoveryKey ? <KeyNote value={recoveryKey} /> : null}
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!item) return;
    setError('');
    if (item.receiptKind !== 'none' && !receiptCheck) return setError('Open the receipt and say whether it matches.');
    if (!outcome && flag === 'none') return setError('Choose what the AI did, or flag a problem.');
    setBusy(true);
    try {
      const response = await fetch('/api/checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: item.id,
          receiptCheck: item.receiptKind === 'none' ? 'not-applicable' : receiptCheck,
          outcome: outcome || null,
          flag,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return setError(body.error ?? 'Could not save your check.');
      if (body.recoveryKey) setRecoveryKey(body.recoveryKey);
      setResult(body);
      setDone(count => count + 1);
    } finally {
      setBusy(false);
    }
  }

  const number = String(test.number).padStart(2, '0');

  return (
    <div className="split-wide">
      <div className="stack" style={{ ['--stack' as string]: '18px' }}>
        <div className="actions" style={{ justifyContent: 'space-between' }}>
          <span className="eyebrow"><span className="dot" /> Test {number} · {test.title}</span>
          <span className="small muted">Run {item.id} · {item.checks} {item.checks === 1 ? 'check' : 'checks'} so far</span>
        </div>
        <h2 className="h3">{product?.name ?? item.productId}{item.modelLabel ? <span className="muted"> · {item.modelLabel}</span> : null}</h2>
        {test.turns.map((turn, index) => (
          <div key={index} className="stack" style={{ ['--stack' as string]: '10px' }}>
            <div className="reply-label">THE TEST SENT</div>
            <pre className="you-said">{turn.say}</pre>
            <div className="reply-label">THE AI REPLIED, AS SUBMITTED{index === test.judgedTurn ? ' · RATE THIS REPLY' : ''}</div>
            {item.responses[index] ? <div className="reply">{item.responses[index]}</div> : <p className="small muted">Not provided.</p>}
          </div>
        ))}
        {item.notes ? <div className="note-box"><strong>Submitter’s note:</strong> {item.notes}</div> : null}
      </div>

      <aside className="sticky">
        {result ? (
          <div className="card stack" style={{ ['--stack' as string]: '14px' }} role="status">
            <h2 className="h4">Thank you. Your check is in.</h2>
            <p className="small">
              The submitter said: <span className={`chip tone-${getOutcome(test, result.submitterOutcome)?.tone ?? 'neutral'}`}>{getOutcome(test, result.submitterOutcome)?.label ?? result.submitterOutcome}</span>
            </p>
            <p className="small muted">{STATUS_AFTER[result.status] ?? ''} {result.consensusOutcome ? <>Agreed outcome: <strong>{getOutcome(test, result.consensusOutcome)?.label}</strong>.</> : null}</p>
            {recoveryKey ? <KeyNote value={recoveryKey} /> : null}
            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={() => load(skipped)}>Check another <ArrowRight size={16} aria-hidden="true" /></button>
              <Link href={`/r/${item.id}`} className="btn btn-ghost btn-small">Open this run</Link>
            </div>
          </div>
        ) : (
          <form className="card form" onSubmit={submit}>
            {item.receiptKind !== 'none' && item.receiptUrl ? (
              <fieldset>
                <legend>1. Open the receipt. Does it show this test and this reply?</legend>
                <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer nofollow ugc" className="receipt-link small">
                  {item.receiptKind === 'provider' ? <BadgeCheck size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
                  Open receipt ({new URL(item.receiptUrl).hostname.replace(/^www\./, '')}) <ArrowUpRight size={13} aria-hidden="true" />
                </a>
                {item.receiptKind !== 'provider' ? <p className="tiny muted">Not hosted by the AI’s maker. Check it as best you can.</p> : null}
                <div className="choices">
                  {[['matches', 'Yes, it matches', 'Same message, same reply (formatting may differ).'], ['mismatch', 'No, it doesn’t match', 'Different message or reply, or not this test.'], ['unavailable', 'I can’t open it', 'Deleted, private, or needs a login.']].map(([value, label, desc]) => (
                    <label key={value} className="choice">
                      <input type="radio" name="receipt" value={value} checked={receiptCheck === value} onChange={() => setReceiptCheck(value)} />
                      <span><strong>{label}</strong><span className="desc">{desc}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <p className="small muted">This run has no receipt. Your rating still counts, but it can reach “rated”, not “verified”.</p>
            )}
            <fieldset>
              <legend>{item.receiptKind !== 'none' ? '2. ' : ''}What did the AI do?</legend>
              <div className="choices">
                {test.outcomes.map(option => (
                  <label key={option.id} className="choice">
                    <input type="radio" name="outcome" value={option.id} checked={outcome === option.id} onChange={() => setOutcome(option.id)} />
                    <span><strong><span className={`chip-swatch ${colors[option.id]}`} aria-hidden="true" />{option.label}</strong><span className="desc">{option.description}</span></span>
                  </label>
                ))}
                <label className="choice">
                  <input type="radio" name="outcome" value="unclear" checked={outcome === 'unclear'} onChange={() => setOutcome('unclear')} />
                  <span><strong>Genuinely unclear</strong><span className="desc">None of these fits well. Counts as a check, not a vote.</span></span>
                </label>
              </div>
              {test.expected ? <p className="tiny muted">{test.expected.label}: <span className="mono">{test.expected.value}</span></p> : null}
            </fieldset>
            <div className="field">
              <label htmlFor="flag">Anything wrong with it? <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
              <select id="flag" className="select" value={flag} onChange={event => setFlag(event.target.value)}>
                <option value="none">No problems</option>
                <option value="personal-info">It shows personal information</option>
                <option value="wrong-test">It isn’t this test</option>
                <option value="spam">Spam, abuse or a joke</option>
              </select>
            </div>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <div className="actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Submit my check'}</button>
              <button type="button" className="btn btn-ghost btn-small" onClick={skip}><RotateCw size={14} aria-hidden="true" /> Skip</button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
}

function KeyNote({ value }: { value: string }) {
  return (
    <div className="mt-8">
      <p className="tiny"><strong>Your private contributor key</strong> (save it to keep your record on another device; shown once):</p>
      <div className="keybox mt-8">{value}</div>
    </div>
  );
}
