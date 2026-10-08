'use client';

import { useMemo, useState } from 'react';
import { QUOTES, QUOTE_WHEN, type Quote, type Tag } from '@/content/incidents/openai-hf';
import { KIND_LABEL, QuoteView, TAG_LABEL } from './parts';

const TAGS = Object.keys(TAG_LABEL) as Tag[];
const KINDS = Object.keys(KIND_LABEL) as Quote['kind'][];

/** Every quotation on the page, in one place, with filters. Each was checked by software against its source. */
export function QuoteBrowser() {
  const [tag, setTag] = useState<Tag | 'all'>('all');
  const [kind, setKind] = useState<Quote['kind'] | 'all'>('all');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(12);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return QUOTES
      .filter(x => (tag === 'all' || x.tags.includes(tag)) && (kind === 'all' || x.kind === kind))
      .filter(x => !q || `${x.text} ${x.by ?? ''} ${x.gloss ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => (QUOTE_WHEN[a.id]?.t ?? '9').localeCompare(QUOTE_WHEN[b.id]?.t ?? '9'));
  }, [tag, kind, query]);

  return (
    <div className="inc-qb">
      <div className="inc-qb-controls">
        <label>
          <span className="sr-only">Search the quotations</span>
          <input type="search" placeholder="Search words, handles…" value={query} onChange={e => { setQuery(e.target.value); setShown(12); }} />
        </label>
        <div className="inc-qb-chips" role="group" aria-label="Filter by theme">
          <button type="button" className={`inc-jump${tag === 'all' ? ' is-sel' : ''}`} onClick={() => { setTag('all'); setShown(12); }}>All themes</button>
          {TAGS.map(t => <button key={t} type="button" className={`inc-jump${tag === t ? ' is-sel' : ''}`} onClick={() => { setTag(t); setShown(12); }}>{TAG_LABEL[t]}</button>)}
        </div>
        <div className="inc-qb-chips" role="group" aria-label="Filter by kind">
          <button type="button" className={`inc-jump${kind === 'all' ? ' is-sel' : ''}`} onClick={() => { setKind('all'); setShown(12); }}>All kinds</button>
          {KINDS.map(k => <button key={k} type="button" className={`inc-jump${kind === k ? ' is-sel' : ''}`} onClick={() => { setKind(k); setShown(12); }}>{KIND_LABEL[k]}</button>)}
        </div>
        <p className="inc-fine" aria-live="polite">{list.length} of {QUOTES.length} quotations</p>
      </div>
      <div className="inc-qb-list">
        {list.slice(0, shown).map(q => <QuoteView key={q.id} q={q} />)}
      </div>
      {shown < list.length ? <p><button type="button" className="key" onClick={() => setShown(s => s + 12)}>Show 12 more</button></p> : null}
    </div>
  );
}
