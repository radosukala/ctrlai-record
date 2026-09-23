/**
 * Google Analytics, only with consent. Nothing loads, and no cookie is set, until a visitor says yes in the
 * consent card (components/Analytics.tsx). Advertising features stay off either way.
 */

export const GA_ID = 'G-HLL3PPJ7W1';
const STORAGE_KEY = 'ctrl-analytics';
const SETTINGS_EVENT = 'ctrl:analytics-settings';

export type AnalyticsChoice = 'granted' | 'denied';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function readChoice(): AnalyticsChoice | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

export function saveChoice(choice: AnalyticsChoice) {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Storage is blocked. The choice holds for this visit only.
  }
}

function setDisabled(disabled: boolean) {
  (window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`] = disabled;
}

export function startAnalytics() {
  setDisabled(false);
  if (window.gtag) {
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    return;
  }
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag.js expects the arguments object itself, exactly as in Google's snippet.
    window.dataLayer!.push(arguments);
  };
  window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

export function stopAnalytics() {
  setDisabled(true);
  window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  const names = document.cookie.split(';').map(cookie => cookie.split('=')[0].trim()).filter(name => name === '_ga' || name.startsWith('_ga_'));
  const host = window.location.hostname.replace(/^www\./, '');
  for (const name of names) {
    for (const domain of ['', `; domain=${host}`, `; domain=.${host}`]) document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
  }
}

/** Counts a moment in a story. Does nothing unless the visitor agreed. */
export function track(event: string, params: Record<string, string | number> = {}) {
  if (readChoice() !== 'granted') return;
  window.gtag?.('event', event, params);
}

export function openAnalyticsSettings() {
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function onAnalyticsSettings(listener: () => void): () => void {
  window.addEventListener(SETTINGS_EVENT, listener);
  return () => window.removeEventListener(SETTINGS_EVENT, listener);
}
