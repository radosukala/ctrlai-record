'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CHAPTERS, COUNTERS, COUNTER_LABEL, QUOTES, QUOTE_BY_ID, QUOTE_WHEN, TIME_FMT, ZONES, formatWhen, stepsFor, when, zoneStates,
  type Ev, type Zone, type ZoneState,
} from '@/content/incidents/openai-hf';
import { Chip, Cites, KIND_LABEL, QuoteView, RichText, quoteTime } from './parts';

const WALL: Record<Zone, string> = {
  sandbox: '',
  cache: 'Allowed on purpose: software downloads',
  internet: 'Wall: no internet from a sandbox',
  steps: 'Wall: other people’s systems',
  hf: 'Wall: Hugging Face’s own defences',
  oai: 'Separate: OpenAI’s own research cluster',
};

const JUMPS: { id: string; label: string }[] = [
  { id: 'e-0420', label: 'Start' },
  { id: 'e-0512', label: 'First message' },
  { id: 'e-0708c', label: 'The second board' },
  { id: 'e-0711a', label: 'Hugging Face' },
  { id: 'h-0719a', label: 'OpenAI’s alert' },
  { id: 'h-0826', label: 'The reports' },
];

const MARKS: { id: string; label: string; keep?: boolean }[] = [
  { id: 'e-0420', label: 'Apr 20', keep: true },
  { id: 'e-0526', label: 'May 26' },
  { id: 'e-0626b', label: 'Jun 26' },
  { id: 'e-0708c', label: 'Jul 8' },
  { id: 'e-0711a', label: 'Jul 11', keep: true },
  { id: 'h-0719a', label: 'Jul 19' },
  { id: 'h-0826', label: 'Aug 26', keep: true },
];

const STATE_LABEL = { untouched: 'Untouched', touched: 'Touched', breached: 'Breached' } as const;

function Ladder({ states, now }: { states: Record<Zone, ZoneState>; now: Ev }) {
  return (
    <ol className="inc-ladder" aria-label="How far the agents had reached">
      {ZONES.map((z, i) => {
        const s = states[z.id];
        return (
          <li key={z.id} className="inc-rung">
            {i > 0 ? <p className={`inc-wall inc-wall-${s.state}`}>{WALL[z.id]}</p> : null}
            <div className={`inc-station inc-station-${s.state}${now.zone === z.id ? ' inc-station-now' : ''}`}>
              <b>{z.label}</b>
              <small>{z.sub}</small>
              <span className="inc-station-state">
                {z.id === 'sandbox' ? (s.state === 'breached' ? 'Where they started · escaped' : 'Where they started') : STATE_LABEL[s.state]}
                {s.since && (z.id !== 'sandbox' || s.state === 'breached') ? ` · since ${TIME_FMT.format(new Date(s.since))}` : ''}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Replay() {
  const [fine, setFine] = useState(false);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const steps = useMemo(() => stepsFor(fine), [fine]);
  const idx = Math.min(i, steps.length - 1);
  const now = steps[idx];

  useEffect(() => {
    if (!playing) return;
    if (idx >= steps.length - 1) { setPlaying(false); return; }
    const id = window.setTimeout(() => setI(idx + 1), 2600);
    return () => window.clearTimeout(id);
  }, [playing, idx, steps.length]);

  const states = useMemo(() => zoneStates(steps, idx), [steps, idx]);

  // A quotation is labelled with a time only if a source gives one for it; otherwise with the day of the event that cites it.
  const label = (id: string) => {
    const w = QUOTE_WHEN[id];
    return w ? (w.at?.includes('T') ? quoteTime(w.at) : TIME_FMT.format(new Date(w.t))) : null;
  };
  const feed = useMemo(() => QUOTES
    .filter(q => q.kind !== 'statement' && QUOTE_WHEN[q.id] && QUOTE_WHEN[q.id].t <= now.t)
    .sort((a, b) => (QUOTE_WHEN[b.id].t > QUOTE_WHEN[a.id].t ? 1 : -1))
    .slice(0, 4), [now.t]);

  const counters = (['agents', 'messages', 'joined', 'hfWorkers'] as const).map(key => {
    const c = COUNTERS.filter(x => x.key === key && x.t <= now.t).sort((a, b) => b.t.localeCompare(a.t))[0];
    return { key, c };
  });
  const lastHuman = steps.slice(0, idx + 1).filter(e => e.lane === 'humans').pop();
  const chapter = CHAPTERS.find(c => c.n === now.chapter)!;

  const jump = (id: string) => {
    const k = steps.findIndex(e => e.id === id);
    if (k >= 0) { setI(k); setPlaying(false); }
  };
  const nowQuotes = (now.quotes ?? []).map(id => QUOTE_BY_ID[id]).filter(Boolean);

  return (
    <section className="inc-replay" aria-label="Replay of the incident, step by step">
      <div className="inc-replay-bar">
        <div className="inc-replay-keys">
          <button type="button" className="key key-sm" onClick={() => { setI(Math.max(0, idx - 1)); setPlaying(false); }} disabled={idx === 0} aria-label="Previous step">←</button>
          <button type="button" className="key key-sm key-primary" onClick={() => (idx >= steps.length - 1 ? (setI(0), setPlaying(true)) : setPlaying(p => !p))} aria-pressed={playing}>{playing ? 'Pause' : idx >= steps.length - 1 ? 'Replay' : 'Play'}</button>
          <button type="button" className="key key-sm" onClick={() => { setI(Math.min(steps.length - 1, idx + 1)); setPlaying(false); }} disabled={idx >= steps.length - 1} aria-label="Next step">→</button>
          <span className="inc-replay-count" aria-live="polite">Step {idx + 1} of {steps.length}</span>
        </div>
        <div className="inc-replay-jumps" role="group" aria-label="Jump to">
          {JUMPS.map(j => <button key={j.id} type="button" className="inc-jump" onClick={() => jump(j.id)}>{j.label}</button>)}
        </div>
        <label className="inc-replay-fine"><input type="checkbox" checked={fine} onChange={e => { setFine(e.target.checked); setI(0); setPlaying(false); }} /> Include the fine print</label>
      </div>

      <input className="inc-range" type="range" min={0} max={steps.length - 1} value={idx} onChange={e => { setI(Number(e.target.value)); setPlaying(false); }} aria-label="Move through the incident" aria-valuetext={`${when(now)}: ${now.title}`} />
      <div className="inc-strip" aria-hidden="true">
        {steps.map((e, k) => (
          <button key={e.id} type="button" tabIndex={-1} className={`inc-tick inc-tick-${e.lane} inc-tick-t${e.tier}${k === idx ? ' inc-tick-now' : ''}${k < idx ? ' inc-tick-past' : ''}`} onClick={() => { setI(k); setPlaying(false); }} title={`${when(e)}: ${e.title}`} />
        ))}
      </div>
      <div className="inc-strip-labels" aria-hidden="true">
        {MARKS.map(m => {
          const k = steps.findIndex(e => e.id === m.id);
          if (k < 0) return null;
          return <span key={m.id} className={m.keep ? 'mk-key' : undefined} style={{ left: `${steps.length > 1 ? (k / (steps.length - 1)) * 100 : 0}%` }}>{m.label}</span>;
        })}
      </div>
      <p className="inc-fine inc-axis-note">Time is not to scale: each mark is one sourced event, so the busy days get the room.</p>

      <div className="inc-replay-grid">
        <>
          <article className="inc-now" aria-live="polite">
            <p className="inc-now-meta">
              <time dateTime={now.t}>{when(now)}</time>
              <Chip tone={now.lane === 'humans' ? 'signal' : 'ink'}>{now.lane === 'humans' ? 'People' : 'Agents'}</Chip>
              <Chip tone="muted">Chapter {chapter.n}: {chapter.title}</Chip>
            </p>
            <h3 className="inc-now-title">{now.title}</h3>
            <p className="inc-now-text"><RichText text={now.text} /></p>
            {now.differ ? <p className="inc-differ"><b>The sources differ.</b> {now.differ}</p> : null}
            {nowQuotes.length ? (
              <div className="inc-now-quotes">
                {nowQuotes.slice(0, 2).map(q => <QuoteView key={q.id} q={q} compact />)}
                {nowQuotes.length > 2 ? (
                  <details className="inc-more">
                    <summary>{nowQuotes.length - 2} more quotation{nowQuotes.length - 2 > 1 ? 's' : ''}</summary>
                    {nowQuotes.slice(2).map(q => <QuoteView key={q.id} q={q} compact />)}
                  </details>
                ) : null}
              </div>
            ) : null}
            <p className="inc-now-cites"><Cites cites={now.cites} /></p>
          </article>

          <div className="inc-feed">
            <h4 className="inc-feed-title">Written so far <small>board messages and recorded reasoning, latest first; METR’s times are approximate</small></h4>
            {feed.length ? (
              <ul>
                {feed.map(q => (
                  <li key={q.id} className={`inc-feed-item inc-feed-${q.kind}`}>
                    <p className="inc-feed-meta"><b>{q.by ?? 'an agent'}</b> <span>{label(q.id)}</span> <span className="inc-feed-kind">{KIND_LABEL[q.kind]}</span></p>
                    <p className="inc-feed-text">{q.text}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="inc-empty">No messages yet. The first message in the record is on May 12.</p>}
          </div>
        </>

        <aside className="inc-replay-side">
          <h4 className="inc-side-title">How far they had got</h4>
          <Ladder states={states} now={now} />
          <h4 className="inc-side-title">Documented numbers</h4>
          <dl className="inc-counters">
            {counters.map(({ key, c }) => (
              <div key={key}>
                <dt>{COUNTER_LABEL[key]}</dt>
                <dd>{c ? <>{c.value}<small className="inc-asof">as of {formatWhen(c)}</small></> : 'not yet documented'}</dd>
              </div>
            ))}
          </dl>
          <p className="inc-fine">Each figure is the latest one a source gives up to this step, with the time it applies to. We do not estimate between them.</p>
          <h4 className="inc-side-title">What the people knew</h4>
          <p className="inc-humans">{lastHuman ? <><b>{lastHuman.title}.</b> <span>{when(lastHuman)}</span></> : 'No one has noticed anything yet.'}</p>
        </aside>
      </div>
    </section>
  );
}
