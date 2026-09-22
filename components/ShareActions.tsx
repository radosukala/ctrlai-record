'use client';

import { useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';

/**
 * Sharing is the only growth engine this project has, so it is one tap, pre-written,
 * and always links back to the test, never to an ad or a sign-up wall.
 */
export function ShareActions({ url, text, compact = false }: { url: string; text: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const targets = [
    { name: 'X', href: `https://x.com/intent/post?text=${encodedText}&url=${encodedUrl}` },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { name: 'Bluesky', href: `https://bsky.app/intent/compose?text=${encodeURIComponent(`${text} ${url}`)}` },
    { name: 'Threads', href: `https://www.threads.net/intent/post?text=${encodeURIComponent(`${text} ${url}`)}` },
  ];
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }
  async function nativeShare() {
    if (navigator.share) {
      try { await navigator.share({ text, url }); } catch { /* dismissed */ }
    } else {
      copy();
    }
  }
  return (
    <div className="share-buttons">
      {targets.map(target => (
        <a key={target.name} className={`btn btn-ghost ${compact ? 'btn-small' : 'btn-small'}`} href={target.href} target="_blank" rel="noopener noreferrer">
          {target.name}
        </a>
      ))}
      <button type="button" className="btn btn-ghost btn-small" onClick={copy}>
        {copied ? <><Check size={15} aria-hidden="true" /> Copied</> : <><Link2 size={15} aria-hidden="true" /> Copy text and link</>}
      </button>
      <button type="button" className="btn btn-ghost btn-small" onClick={nativeShare} aria-label="Share with another app">
        <Share2 size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
