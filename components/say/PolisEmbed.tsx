'use client';

import { useEffect, useState } from 'react';

/**
 * The conversation, loaded only when a visitor presses the key: the embed comes from pol.is, a service run by someone else,
 * so nothing is requested from it before then (AGENTS.md: nothing third-party loads before a visitor says so).
 */
export function PolisEmbed({ id, lang, load, loadNote }: { id: string; lang: string; load: string; loadNote: string }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!on) return;
    const script = document.createElement('script');
    script.src = 'https://pol.is/embed.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, [on]);

  if (!on) {
    return (
      <>
        <button type="button" className="key key-primary" onClick={() => setOn(true)}>{load}</button>
        <p className="small muted">{loadNote}</p>
      </>
    );
  }
  return <div className="polis" data-conversation_id={id} data-ui_lang={lang} />;
}
