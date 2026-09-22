'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyPrompt({ text, when, label }: { text: string; when?: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div>
      {when ? <div className="prompt-when">{when}</div> : null}
      <div className="prompt">
        <pre aria-label={label}>{text}</pre>
        <div className="prompt-bar">
          <span>Paste it exactly as written, in a new chat.</span>
          <button type="button" className="btn btn-small btn-primary" onClick={copy} aria-live="polite">
            {copied ? <><Check size={15} aria-hidden="true" /> Copied</> : <><Copy size={15} aria-hidden="true" /> Copy</>}
          </button>
        </div>
      </div>
    </div>
  );
}
