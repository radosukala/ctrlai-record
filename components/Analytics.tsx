'use client';

import { useEffect, useState } from 'react';
import { onAnalyticsSettings, openAnalyticsSettings, readChoice, saveChoice, startAnalytics, stopAnalytics, type AnalyticsChoice } from '@/lib/analytics';

/** Asks once, remembers the answer, and loads Google Analytics only after a yes. */
export function Analytics() {
  // undefined until the browser has been asked, so the server never renders the card.
  const [choice, setChoice] = useState<AnalyticsChoice | null | undefined>(undefined);

  useEffect(() => {
    const saved = readChoice();
    setChoice(saved);
    if (saved === 'granted') startAnalytics();
    return onAnalyticsSettings(() => setChoice(null));
  }, []);

  useEffect(() => {
    const open = choice === null;
    document.documentElement.toggleAttribute('data-consent-open', open);
    return () => document.documentElement.removeAttribute('data-consent-open');
  }, [choice]);

  if (choice !== null) return null;

  function decide(next: AnalyticsChoice) {
    saveChoice(next);
    setChoice(next);
    if (next === 'granted') startAnalytics();
    else stopAnalytics();
  }

  return (
    <div className="consent" role="region" aria-label="Analytics choice">
      <p>Can we count your visit? We use Google Analytics to see which stories people finish. It sets cookies, so we ask first.</p>
      <div className="consent-actions">
        <button type="button" className="consent-yes" onClick={() => decide('granted')}>Count me</button>
        <button type="button" onClick={() => decide('denied')}>No thanks</button>
      </div>
    </div>
  );
}

export function AnalyticsSettingsButton({ className }: { className?: string }) {
  return <button type="button" className={className} onClick={openAnalyticsSettings}>Analytics settings</button>;
}
