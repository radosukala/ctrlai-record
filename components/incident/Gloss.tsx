'use client';

import { useId, useState } from 'react';
import { TERM_BY_ID } from '@/content/incidents/openai-hf';

/** A word with a plain-language definition one tap away. */
export function Gloss({ id, children }: { id: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const term = TERM_BY_ID[id];
  if (!term) return <>{children}</>;
  return (
    <span className="inc-gloss">
      <button type="button" className="inc-gloss-btn" aria-expanded={open} aria-controls={uid} onClick={() => setOpen(o => !o)}>
        {children}
      </button>
      {open ? (
        <span id={uid} className="inc-gloss-def" role="note">
          <b>{term.label}.</b> {term.def}
        </span>
      ) : null}
    </span>
  );
}
