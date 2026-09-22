'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Copy, Download } from 'lucide-react';

/** Shown once, right after someone adds a run: what happens next, and their recovery key. */
export function AddedBanner({ runId }: { runId: string }) {
  const [key, setKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    try { setKey(sessionStorage.getItem('ctrl.recoveryKey')); } catch { /* storage unavailable */ }
  }, []);
  function forget() {
    try { sessionStorage.removeItem('ctrl.recoveryKey'); } catch { /* ignore */ }
    setKey(null);
  }
  function download() {
    if (!key) return;
    const blob = new Blob([`Ctrl AI contributor key\n\n${key}\n\nPaste it at https://ctrlai.com/me to keep your contributions on another device.\nAnyone with this key can act as you, so keep it private.\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: 'ctrl-ai-contributor-key.txt' });
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="card card-acid mt-24" role="status">
      <p className="h4 inline-icon"><CheckCircle2 size={18} aria-hidden="true" /> Added to the record as run {runId}.</p>
      <p className="small mt-8">
        It now needs two strangers to check it. The fastest way to get checks is to give some: <Link href="/verify"><strong>check two other people’s runs</strong></Link>. It takes about two minutes each.
      </p>
      {key ? (
        <div className="mt-16">
          <p className="small"><strong>Your private contributor key.</strong> This browser remembers you. Save the key to keep your contributions if you switch devices. We can’t show it again.</p>
          <div className="keybox mt-8">{key}</div>
          <div className="actions mt-12">
            <button type="button" className="btn btn-ghost btn-small" onClick={async () => { try { await navigator.clipboard.writeText(key); setCopied(true); } catch { /* ignore */ } }}>
              <Copy size={14} aria-hidden="true" /> {copied ? 'Copied' : 'Copy key'}
            </button>
            <button type="button" className="btn btn-ghost btn-small" onClick={download}><Download size={14} aria-hidden="true" /> Download</button>
            <button type="button" className="btn btn-ghost btn-small" onClick={forget}>I’ve saved it</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function WithdrawButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  async function withdraw() {
    setError('');
    const response = await fetch(`/api/runs/${runId}`, { method: 'DELETE' });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Could not withdraw this run.');
      return;
    }
    router.refresh();
  }
  return (
    <div className="card-flat">
      <h2 className="h4">This is your run</h2>
      <p className="small muted mt-8">You can withdraw it at any time. Its content is removed; its ID stays reserved, and the withdrawal is noted in the public log.</p>
      {confirming ? (
        <div className="actions mt-12">
          <button type="button" className="btn btn-primary btn-small" onClick={withdraw}>Yes, withdraw it</button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirming(false)}>Keep it</button>
        </div>
      ) : (
        <button type="button" className="btn btn-ghost btn-small mt-12" onClick={() => setConfirming(true)}>Withdraw this run</button>
      )}
      {error ? <p className="form-error mt-12" role="alert">{error}</p> : null}
    </div>
  );
}

/** Visible only to stewards. Every action requires a reason and is published in the log. */
export function StewardPanel({ runId, hidden }: { runId: string; hidden: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  async function act() {
    setError('');
    const response = await fetch(`/api/steward/runs/${runId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hidden: !hidden, reason }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.error ?? 'Could not do that.');
    setReason('');
    router.refresh();
  }
  return (
    <div className="card-flat">
      <h2 className="h4">Steward</h2>
      <p className="small muted mt-8">{hidden ? 'Restore this run to the public record.' : 'Hide this run, for example if it shows personal information.'} Your reason is published in the log.</p>
      <textarea className="textarea mt-12" style={{ minHeight: 70 }} value={reason} onChange={event => setReason(event.target.value)} maxLength={300} placeholder="Reason (published)" />
      <button type="button" className="btn btn-ghost btn-small mt-12" onClick={act} disabled={reason.trim().length < 5}>{hidden ? 'Restore run' : 'Hide run'}</button>
      {error ? <p className="form-error mt-12" role="alert">{error}</p> : null}
    </div>
  );
}
