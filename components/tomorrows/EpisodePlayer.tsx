'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Episode, Fact, FactStatus, Line, LineStyle } from '@/content/tomorrows';
import {
  clockAt, factsById, fromMinutes, initialState, reducerFor, screensFor, toMinutes, type PlayerState,
} from '@/lib/tomorrows';
import { track } from '@/lib/analytics';
import { Wordmark } from '@/components/Brand';
import { AnalyticsSettingsButton } from '@/components/Analytics';
import styles from './tomorrows.module.css';

const FACT_LABEL: Record<FactStatus, string> = { real: 'Real', 'not-yet': 'Not yet', imagined: 'Imagined' };
const LINE_CLASS: Record<LineStyle, string> = {
  big: styles.big, said: styles.said, quiet: styles.quiet, meta: styles.meta, kicker: styles.kicker, title: styles.title,
};
const NEXT_KEYS = new Set([' ', 'Enter', 'ArrowRight', 'ArrowDown', 'PageDown']);
const MOVE_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const BACK_KEYS = new Set(['ArrowUp', 'ArrowLeft']);

/** The buttons the arrow keys move between: a choice, the owners, or the actions at the end. */
function navItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-nav]'));
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Clicking a small control shouldn't keep keyboard focus on it, or space would press it again instead of turning the page. */
const keepFocus = (event: React.MouseEvent) => event.preventDefault();

function Keys({ children }: { children: React.ReactNode }) {
  return <span className={styles.keys}>{children}</span>;
}

export function EpisodePlayer({ episode, shareUrl }: { episode: Episode; shareUrl: string }) {
  const reduce = useMemo(() => reducerFor(episode), [episode]);
  const [state, dispatch] = useReducer(reduce, episode, initialState);
  const [openFact, setOpenFact] = useState<string | null>(null);
  const [clockOverride, setClockOverride] = useState<string | null>(null);
  const [afterOpen, setAfterOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [readingFacts, setReadingFacts] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const facts = useMemo(() => factsById(episode), [episode]);
  const newest = useRef<HTMLElement | null>(null);
  const afterRef = useRef<HTMLElement | null>(null);

  const inStory = state.mode !== 'picker';
  const screens = inStory ? screensFor(episode, state) : [];
  const screen = inStory ? screens[state.screen] : null;
  const shown = state.mode === 'end' && screen ? screen.lines.length : state.shown;
  const lines = screen ? screen.lines.slice(0, shown) : [];
  const complete = !!screen && shown >= screen.lines.length;
  const pendingChoice = state.mode === 'run' && complete && screen?.choice && !state.branch ? screen.choice : null;
  const atEnd = state.mode === 'end' || (state.mode === 'finale' && complete && state.screen === screens.length - 1);
  const everySeen = state.seen.length + (state.seen.includes(state.arrangement) ? 0 : 1) >= episode.arrangements.length;
  const atClosing = state.mode === 'run' && complete && !!screen?.closing;
  const nextLabel = complete && !pendingChoice && !atEnd && screen?.next && (state.mode === 'run' || state.mode === 'finale')
    ? (screen.closing && everySeen ? 'Continue' : screen.next)
    : null;
  const tone = state.mode === 'picker' ? 'dusk' : screen?.tone ?? 'day';
  const storyClock = state.mode === 'picker'
    ? episode.start
    : state.mode === 'run' || state.mode === 'rewinding' ? clockAt(screens, state.screen, state.shown, episode.start) : null;
  const clock = clockOverride ?? storyClock;

  useEffect(() => {
    setKeyboard(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, []);

  // Keys: arrows, space and return play the whole story; ctrl+Z rewinds it; 1, 2 and 3 still answer directly.
  const live = useRef({ mode: state.mode, choice: pendingChoice, owners: episode.arrangements, cursor });
  live.current = { mode: state.mode, choice: pendingChoice, owners: episode.arrangements, cursor };
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const { key } = event;
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && key.toLowerCase() === 'z') {
        event.preventDefault();
        dispatch({ type: 'rewind' });
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('a, input, textarea, select, summary, .consent')) return;

      // Options: the arrows move a highlight the page draws itself, so it looks the same in every browser.
      const items = navItems();
      if (items.length) {
        const focused = items.indexOf(document.activeElement as HTMLElement);
        const current = focused !== -1 ? focused : live.current.cursor;
        if (MOVE_KEYS.has(key)) {
          event.preventDefault();
          const step = BACK_KEYS.has(key) ? -1 : 1;
          const next = current === null ? (step === 1 ? 0 : items.length - 1) : (current + step + items.length) % items.length;
          setCursor(next);
          if (focused !== -1) items[next].focus();
          return;
        }
        if (key === ' ' || key === 'Enter') {
          // A focused button presses itself. Otherwise return presses the highlighted option;
          // with nothing highlighted, a stray key never chooses for the reader.
          if (focused !== -1) return;
          event.preventDefault();
          if (current !== null) items[current]?.click();
          return;
        }
      }
      if (target?.closest('button') && (key === ' ' || key === 'Enter')) return;

      const { mode, choice, owners } = live.current;
      const number = Number(key);
      if (choice && number >= 1 && number <= choice.length) {
        event.preventDefault();
        dispatch({ type: 'choose', branch: choice[number - 1].id });
      } else if (mode === 'picker' && number >= 1 && number <= owners.length) {
        event.preventDefault();
        dispatch({ type: 'pick', arrangement: owners[number - 1].id });
      } else if ((mode === 'run' || mode === 'finale') && NEXT_KEYS.has(key)) {
        event.preventDefault();
        dispatch({ type: 'advance' });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const optionsKey = state.mode === 'picker' ? 'picker' : pendingChoice ? `choice-${screen?.key}` : atEnd ? 'end' : null;
  useEffect(() => {
    setCursor(null);
  }, [optionsKey]);

  // A new screen starts at the top; a new line comes into view.
  const screenKey = state.mode === 'picker' ? 'picker' : screen?.key;
  useEffect(() => {
    window.scrollTo({ top: 0 });
    setOpenFact(null);
  }, [screenKey]);
  useEffect(() => {
    newest.current?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [state.shown, pendingChoice, nextLabel, atEnd]);

  // The page-turning button steps aside while the reader is down in the facts.
  useEffect(() => {
    const section = afterRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setReadingFacts(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Rewind: the words lift away and the clock runs back to the start of the morning.
  const rewinding = state.mode === 'rewinding';
  const rewindFrom = rewinding ? storyClock : null;
  useEffect(() => {
    if (!rewindFrom) return;
    if (prefersReducedMotion()) {
      dispatch({ type: 'rewound' });
      return;
    }
    const from = toMinutes(rewindFrom);
    const to = toMinutes(episode.start);
    const duration = 1100;
    let frame = 0;
    let started = 0;
    const tick = (now: number) => {
      started ||= now;
      const t = Math.min(1, (now - started) / duration);
      setClockOverride(fromMinutes(from + (to - from) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
      else {
        setClockOverride(null);
        dispatch({ type: 'rewound' });
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [rewindFrom, episode.start]);

  // Count the moments that say whether the story works: begun, chosen, rewound, finished. Only with consent.
  const previous = useRef<PlayerState>(state);
  useEffect(() => {
    const before = previous.current;
    previous.current = state;
    const base = { episode: episode.slug };
    if (before.first && state.first && before.screen === episode.opening.length - 1 && state.screen === episode.opening.length) track('episode_begin', base);
    if (!before.branch && state.branch) track('episode_choice', { ...base, owner: state.arrangement, choice: state.branch });
    if (before.mode !== 'rewinding' && state.mode === 'rewinding') track('episode_rewind', { ...base, owner: state.arrangement });
    if (before.mode === 'picker' && state.mode === 'run') track('episode_owner', { ...base, owner: state.arrangement });
    if (before.mode !== 'end' && state.mode === 'end') track('episode_finish', { ...base, versions: state.seen.length });
  }, [state, episode]);

  function onStageClick(event: React.MouseEvent) {
    if ((event.target as HTMLElement).closest('button, a, summary, details, [data-note]')) return;
    if (window.getSelection()?.toString()) return;
    dispatch({ type: 'advance' });
  }

  async function share() {
    setCopied(null);
    track('episode_share', { episode: episode.slug });
    const data = { title: `${episode.title} · Other Tomorrows`, text: episode.share, url: shareUrl };
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(data);
      } catch {
        // The reader closed the share sheet. Nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${episode.share} ${shareUrl}`);
      setCopied('Link copied. Paste it to someone, and ask them which Monday they’d choose.');
    } catch {
      setCopied(shareUrl);
    }
  }

  function openAfterword() {
    setAfterOpen(true);
    requestAnimationFrame(() => afterRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' }));
  }

  function restart() {
    dispatch({ type: 'restart' });
    setAfterOpen(false);
    setCopied(null);
  }

  function toggleFact(id: string, fact: Fact) {
    const opening = openFact !== id;
    setOpenFact(opening ? id : null);
    if (opening) track('episode_fact', { episode: episode.slug, fact: fact.id });
  }

  const lastIndex = lines.length - 1;

  function renderLine(line: Line, index: number, phone: boolean) {
    const fact = line.fact ? facts.get(line.fact) : undefined;
    const noteId = `${screen?.key}-${index}-note`;
    const open = openFact === noteId;
    const past = !phone && index < lastIndex && lines.length > 3 && line.style !== 'kicker' && line.style !== 'title' && line.style !== 'meta';
    const className = phone
      ? line.style === 'meta' ? styles.phoneMeta : styles.phoneLine
      : [styles.line, line.style ? LINE_CLASS[line.style] : '', past ? styles.past : ''].filter(Boolean).join(' ');
    const rewindDelay = rewinding && !phone ? { animationDelay: `${(lastIndex - index) * 70}ms` } : undefined;
    return (
      <div key={index}>
        <p className={className} style={rewindDelay} ref={index === lastIndex ? element => { newest.current = element; } : undefined}>
          {line.text}
          {fact ? (
            <button
              type="button"
              className={styles.fact}
              aria-expanded={open}
              aria-controls={noteId}
              onMouseDown={keepFocus}
              onClick={() => toggleFact(noteId, fact)}
            >
              {FACT_LABEL[fact.status]}
            </button>
          ) : null}
        </p>
        {fact && open ? (
          <div className={styles.note} id={noteId} data-note>
            <strong>{FACT_LABEL[fact.status]}.</strong> {fact.text}
            {fact.sources[0] ? (
              <span className={styles.noteSource}>
                <a href={fact.sources[0].url} target="_blank" rel="noopener noreferrer">{fact.sources[0].publisher}, {fact.sources[0].date}</a>
                {fact.sources.length > 1 ? `, and ${fact.sources.length - 1} more at the end` : ''} · checked {episode.checked}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  const hint = !keyboard
    ? state.mode === 'run' && state.moves < 3 ? <>Tap anywhere to continue</> : null
    : pendingChoice || state.mode === 'picker'
      ? <><Keys><kbd>↑</kbd><kbd>↓</kbd></Keys> to choose, <Keys><kbd>return</kbd></Keys> to confirm</>
      : atEnd
        ? <><Keys><kbd>←</kbd><kbd>→</kbd></Keys> to choose, <Keys><kbd>return</kbd></Keys> to confirm</>
        : state.mode === 'run' && state.moves < 3
          ? <><Keys><kbd>→</kbd></Keys> or <Keys><kbd>space</kbd></Keys> to continue</>
          : null;

  return (
    <div className={styles.page} data-tone={tone}>
      <div className={styles.screen}>
        <header className={styles.bar}>
          <div className={styles.crumb}>
            <Wordmark />
            <span className={styles.seriesName}>Other Tomorrows</span>
          </div>
          <div className={styles.barRight}>
            {clock ? <span className={styles.clock} aria-label={`Time in the story: ${clock}`}>Mon {clock}</span> : null}
            <span className={styles.label}>Fiction</span>
          </div>
        </header>

        <div className={`${styles.stage}${rewinding ? ` ${styles.rewinding}` : ''}`} onClick={onStageClick} aria-live="polite">
          {state.mode === 'picker' ? (
            <section key="picker" aria-labelledby="picker-question">
              <p className={`${styles.line} ${styles.meta}`}>Same morning. Same machine.</p>
              <h2 id="picker-question" className={styles.pickerTitle}>{episode.picker.question}</h2>
              <div className={styles.owners}>
                {episode.arrangements.map((arrangement, index) => (
                  <button
                    key={arrangement.id}
                    type="button"
                    data-nav
                    data-active={cursor === index || undefined}
                    className={styles.owner}
                    style={{ animationDelay: `${120 + index * 90}ms` }}
                    onClick={() => dispatch({ type: 'pick', arrangement: arrangement.id })}
                  >
                    <span className={styles.ownerText}>{arrangement.owner}</span>
                    {state.seen.includes(arrangement.id)
                      ? <span className={styles.seen}>Seen</span>
                      : <span className={styles.key} aria-hidden="true">{index + 1}</span>}
                  </button>
                ))}
              </div>
              <button type="button" data-nav data-active={cursor === episode.arrangements.length || undefined} className={styles.quietButton} onClick={() => dispatch({ type: 'finale' })}>{episode.picker.end}</button>
            </section>
          ) : screen ? (
            <section key={screen.key}>
              {screen.tone === 'phone' ? (
                <div className={styles.phone} role="group" aria-label={`Message from ${screen.from}`}>
                  <div className={styles.phoneHead}><span>{screen.from}</span><span>{screen.at}</span></div>
                  {lines.map((line, index) => renderLine(line, index, true))}
                </div>
              ) : (
                lines.map((line, index) => renderLine(line, index, false))
              )}

              {pendingChoice ? (
                <div className={styles.choices} role="group" aria-label="What do you do?">
                  {pendingChoice.map((branch, index) => (
                    <button
                      key={branch.id}
                      type="button"
                      data-nav
                      data-active={cursor === index || undefined}
                      className={styles.choice}
                      style={{ animationDelay: `${index * 90}ms` }}
                      onClick={() => dispatch({ type: 'choose', branch: branch.id })}
                      ref={index === pendingChoice.length - 1 ? element => { newest.current = element; } : undefined}
                    >
                      <span className={styles.key} aria-hidden="true">{index + 1}</span>
                      <span className={styles.choiceText}>{branch.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {nextLabel ? (
                <div className={styles.nextRow} ref={element => { newest.current = element; }}>
                  <button type="button" className={styles.next} onMouseDown={keepFocus} onClick={() => dispatch({ type: 'advance' })}>
                    {nextLabel} <ArrowRight size={17} aria-hidden="true" />
                  </button>
                  {atClosing && keyboard ? (
                    <span className={styles.orKeys}>or press <Keys><kbd>ctrl</kbd><kbd>Z</kbd></Keys>{everySeen ? ' to rewind again' : ''}</span>
                  ) : null}
                </div>
              ) : null}

              {atEnd ? (
                <>
                  <div className={styles.actions}>
                    <button type="button" data-nav data-active={cursor === 0 || undefined} className={`${styles.action} ${styles.actionPrimary}`} onClick={share}>Send it to someone</button>
                    <button type="button" data-nav data-active={cursor === 1 || undefined} className={styles.action} onClick={openAfterword}>What’s real here</button>
                    <button type="button" data-nav data-active={cursor === 2 || undefined} className={styles.action} onClick={restart}>Start again</button>
                  </div>
                  {copied ? <p className={styles.copied} role="status">{copied}</p> : null}
                </>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>

      {(state.mode === 'run' || state.mode === 'finale') && !pendingChoice && !atEnd && !readingFacts ? (
        <button type="button" className={styles.go} aria-label="Continue" onMouseDown={keepFocus} onClick={() => dispatch({ type: 'advance' })}>
          <ArrowRight size={22} aria-hidden="true" />
        </button>
      ) : null}
      {hint && !readingFacts ? <p className={styles.hint} aria-hidden="true">{hint}</p> : null}

      <Afterword episode={episode} open={afterOpen} onToggle={setAfterOpen} sectionRef={afterRef} />
    </div>
  );
}

const GROUPS: { status: FactStatus; title: string }[] = [
  { status: 'real', title: 'Real already' },
  { status: 'not-yet', title: 'Not yet' },
  { status: 'imagined', title: 'Imagined' },
];

function Afterword({ episode, open, onToggle, sectionRef }: {
  episode: Episode;
  open: boolean;
  onToggle: (open: boolean) => void;
  sectionRef: React.RefObject<HTMLElement | null>;
}) {
  return (
    <section className={styles.after} id="whats-real" ref={sectionRef} aria-label="What’s real here">
      <div className={styles.afterInner}>
        <details open={open} onToggle={event => onToggle((event.currentTarget as HTMLDetailsElement).open)}>
          <summary>What’s real here, and what’s imagined <span>{open ? 'Close' : 'Open'}</span></summary>
          <p className={styles.afterIntro}>
            This story is fiction. The lines marked in it lean on the real world, and here is where each one stands. When reality
            catches up with a line, it moves to “Real already,” with the date. Checked {episode.checked}.
          </p>
          {GROUPS.map(group => {
            const items = episode.facts.filter(fact => fact.status === group.status);
            if (!items.length) return null;
            return (
              <div className={styles.group} key={group.status}>
                <h3 className={styles.groupTitle}>{group.title}</h3>
                {items.map(fact => (
                  <div className={styles.item} key={fact.id}>
                    <span className={styles.status} data-status={fact.status}>{FACT_LABEL[fact.status]}{fact.since ? ` since ${fact.since}` : ''}</span>
                    <div className={styles.claim}>{fact.claim}</div>
                    <p>{fact.text}</p>
                    {fact.sources.length ? (
                      <ul className={styles.sources}>
                        {fact.sources.map(source => (
                          <li key={source.url}>
                            <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> · {source.publisher}, {source.date}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            );
          })}
          <div className={styles.group}>
            <h3 className={styles.groupTitle}>Nobody knows yet</h3>
            <ul className={styles.unknowns}>
              {episode.unknowns.map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </details>
        <p className={styles.credit}>
          Other Tomorrows is published by Ctrl AI at ctrlai.com. <AnalyticsSettingsButton className={styles.inlineButton} />
        </p>
      </div>
    </section>
  );
}
