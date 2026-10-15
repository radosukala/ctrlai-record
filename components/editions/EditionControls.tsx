'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/** Who the reader is reading as. The lens reorders the sections and picks the "why it matters" line; the facts stay. */
export type Lens = 'public' | 'policy' | 'research';
const LENSES: { id: Lens; label: string }[] = [
  { id: 'public', label: 'Everyone' },
  { id: 'policy', label: 'Lawmakers and staff' },
  { id: 'research', label: 'Researchers' },
];
const KEY = 'ctrlai-lens';
const LensContext = createContext<{ lens: Lens; setLens: (lens: Lens) => void }>({ lens: 'public', setLens: () => {} });

/** Holds the reader's lens (remembered in this browser only) and sets it on the editions for the CSS to order by. */
export function LensProvider({ children }: { children: ReactNode }) {
  const [lens, setLensState] = useState<Lens>('public');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'policy' || saved === 'research' || saved === 'public') setLensState(saved);
    } catch {}
  }, []);
  const setLens = (next: Lens) => {
    setLensState(next);
    try { localStorage.setItem(KEY, next); } catch {}
  };
  return (
    <LensContext.Provider value={{ lens, setLens }}>
      <div className="ed-root" data-lens={lens}>{children}</div>
    </LensContext.Provider>
  );
}

export function LensBar() {
  const { lens, setLens } = useContext(LensContext);
  return (
    <div className="ed-lensbar" role="group" aria-label="Read as">
      <span className="ed-lensbar-label">Read as</span>
      {LENSES.map(l => (
        <button key={l.id} type="button" className="ed-lens" aria-pressed={lens === l.id} onClick={() => setLens(l.id)}>{l.label}</button>
      ))}
      <span className="ed-lensbar-note">Same facts, in the order each reader needs them.</span>
    </div>
  );
}

export type TabId = 'today' | 'week' | 'month';
const TAB_IDS: TabId[] = ['today', 'week', 'month'];

/**
 * The front page's three horizons as tabs. Every edition is in the page (so it reads without JavaScript, and search
 * engines see it); the tabs show one at a time. /#week and /#month open those tabs directly.
 */
export function EditionTabs({ panels }: { panels: { id: TabId; label: string; note: string; content: ReactNode }[] }) {
  const [tab, setTab] = useState<TabId>('today');
  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1) as TabId;
      if (TAB_IDS.includes(id)) setTab(id);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);
  const choose = (id: TabId) => {
    setTab(id);
    try { history.replaceState(null, '', id === 'today' ? window.location.pathname : `#${id}`); } catch {}
    window.scrollTo({ top: 0 });
  };
  return (
    <LensProvider>
      <nav className="ed-tabs" aria-label="Today, this week, this month">
        <div className="shell ed-tabs-in">
          {panels.map(p => (
            <a key={p.id} href={`#${p.id}`} aria-current={tab === p.id ? 'true' : undefined} onClick={e => { e.preventDefault(); choose(p.id); }}>
              <span>{p.label}</span>
              <small>{p.note}</small>
            </a>
          ))}
        </div>
      </nav>
      {panels.map(p => <div key={p.id} id={`edition-${p.id}`} hidden={tab !== p.id}>{p.content}</div>)}
    </LensProvider>
  );
}
