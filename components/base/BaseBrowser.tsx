'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { KIND_LABEL, LENSES, TOPICS } from '@/content/base/taxonomy';
import type { EntryKind, LensId, TopicId } from '@/content/base/types';

export type Row = {
  slug: string;
  kind: EntryKind;
  title: string;
  outlet: string;
  published: string;
  summary: string;
  lenses: Partial<Record<LensId, string>>;
  topics: TopicId[];
  people: { id: string; name: string }[];
  quotes: number;
  firstQuote?: { text: string; by: string };
  importance: number;
  access: string;
};

type LensChoice = (typeof LENSES)[number]['id'];
const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function BaseBrowser({ rows }: { rows: Row[] }) {
  const [lens, setLens] = useState<LensChoice>('all');
  const [topic, setTopic] = useState<TopicId | null>(null);
  const [q, setQ] = useState('');

  // A question can be opened from a link: /#q-<topic id> picks it and brings the record into view.
  useEffect(() => {
    const pick = () => {
      const id = window.location.hash.match(/^#q-([a-z-]+)$/)?.[1];
      if (!id || !TOPICS.some(t => t.id === id)) return;
      setTopic(id as TopicId);
      document.getElementById('record')?.scrollIntoView({ block: 'start' });
    };
    pick();
    window.addEventListener('hashchange', pick);
    return () => window.removeEventListener('hashchange', pick);
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = rows.filter(r => {
      if (lens === 'press' && r.quotes === 0) return false;
      if (lens !== 'all' && lens !== 'press' && !r.lenses[lens]) return false;
      if (topic && !r.topics.includes(topic)) return false;
      if (needle) {
        const hay = `${r.title} ${r.summary} ${r.outlet} ${r.people.map(p => p.name).join(' ')} ${Object.values(r.lenses).join(' ')}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    // A lens is a reading order: what matters most to that reader first. "Everything" stays a timeline.
    if (lens !== 'all') list = [...list].sort((a, b) => b.importance - a.importance || b.quotes - a.quotes || b.published.localeCompare(a.published));
    return list;
  }, [rows, lens, topic, q]);

  const counts = useMemo(() => Object.fromEntries(TOPICS.map(t => [t.id, rows.filter(r => r.topics.includes(t.id)).length])), [rows]);
  const who = LENSES.find(l => l.id === lens)?.who;

  return (
    <div className="b-browser">
      <div className="b-controls">
        <div className="b-lenses" role="group" aria-label="Read as">
          <span className="b-lenses-label" aria-hidden="true">Read as</span>
          {LENSES.map(l => (
            <button key={l.id} type="button" className="b-lens" aria-pressed={lens === l.id} onClick={() => setLens(l.id)}>{l.label}</button>
          ))}
        </div>
        <p className="b-lens-who">{who}</p>
        <div className="b-filters" role="group" aria-label="Question">
          <span className="b-filters-label" aria-hidden="true">Question</span>
          {TOPICS.filter(t => counts[t.id]).map(t => (
            <button key={t.id} type="button" className="b-chip" title={t.question} aria-pressed={topic === t.id} onClick={() => setTopic(topic === t.id ? null : t.id)}>
              {t.label}<small>{counts[t.id]}</small>
            </button>
          ))}
        </div>
        <div className="b-filters">
          <input className="b-search" type="search" placeholder="Search people, outlets, words" value={q} onChange={e => setQ(e.target.value)} aria-label="Search the Base" />
          <span className="b-count" aria-live="polite">{shown.length} of {rows.length}</span>
        </div>
      </div>

      {topic ? <p className="b-lens-who"><b>{TOPICS.find(t => t.id === topic)?.question}</b></p> : null}

      <ol className="b-list">
        {shown.map(r => {
          const lensText = lens !== 'all' && lens !== 'press' ? r.lenses[lens] : undefined;
          return (
            <li key={r.slug} className="b-row">
              <time dateTime={r.published}>{day(r.published)}</time>
              <div className="b-row-main">
                <div className="b-meta">
                  <span className="b-kind">{KIND_LABEL[r.kind]}</span>
                  <span>{r.outlet}</span>
                  {r.importance === 3 ? <span className="b-top">Top story</span> : null}
                  {r.access === 'excerpt' ? <span className="b-machine" title="We have only read the feed’s description of this item so far">From the description</span> : null}
                </div>
                <h3><Link href={`/base/${r.slug}`}>{r.title}</Link></h3>
                {lensText ? <p><b>{LENSES.find(l => l.id === lens)?.label}:</b> {lensText}</p> : null}
                {lens === 'press' && r.firstQuote ? (
                  <blockquote>“{r.firstQuote.text}”<cite>{r.firstQuote.by}</cite></blockquote>
                ) : null}
                {!lensText && lens !== 'press' ? <p>{r.summary}</p> : null}
                <div className="b-foot">
                  {r.people.slice(0, 4).map(p => <Link key={p.id} href={`/people/${p.id}`}>{p.name}</Link>)}
                  {r.people.length > 4 ? <span>+{r.people.length - 4}</span> : null}
                  {r.quotes ? <span className="b-checked">{r.quotes} {r.quotes === 1 ? 'quotation' : 'quotations'} checked</span> : null}
                </div>
              </div>
            </li>
          );
        })}
        {!shown.length ? <li className="b-empty">Nothing matches. Try another lens or question.</li> : null}
      </ol>
    </div>
  );
}
