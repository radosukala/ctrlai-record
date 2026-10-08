'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { AXIS, BEATS, BIGS, CAPTIONS, CAPTION_EDGE, CARD_EDGE, DISCLOSURE, DURATION, FILM_URL, KEY_WINDOWS, QUOTE_CARDS, S, SCENE_TITLES, STAMPS, TITLE, VOICE_KEY_WINDOWS, axisPos, stepTarget, voiceOf, type Day, type QuoteCard, type SceneId, type Voice } from '@/content/incidents/openai-hf/film';
import { QUOTE_BY_ID, SOURCES, type Cite, type Quote } from '@/content/incidents/openai-hf';
import { Cites, QuoteView } from '../parts';
import { clamp, ramp, smoother } from './math';
import { drawFrame } from './render';
import { HERO_STATE, heroCamera } from './direction';
import { OrgChart, orgVisible } from './OrgChart';
import { FILM_DURATION, toFilm, toScreen } from '@/content/incidents/openai-hf/timing';
import { FilmMusic, MUSIC_ON_OFFER, MUSIC_PROVIDER, bedFor, warmMusic } from './music';
import { AGENTS_ON_OFFER, CLIPS, FilmVoices, NARRATOR_ON_OFFER, VOICES_ARE_DRAFT, VOICES_ON_OFFER, warm } from './voices';
import { FILM_SHORT_PATH } from '@/content/incidents/openai-hf/publish';
import { SITE } from '@/lib/site';
import '../incident.css';
import './film.css';

/** The still the film opens on, behind the title: the hall turning red (a screen time). */
const POSTER_T = S('attack', 66);
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fade = (t: number, a: number, b: number, edge = 0.55) => smoother(ramp(t, a, a + edge)) * (1 - smoother(ramp(t, b - edge, b)));

const nextDay = (d: Day) => new Date(Date.parse(`${d}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
/** Marks along the timeline: the first of each month before the incident, and every day from July 7. */
const TICKS: Day[] = ['2026-05-01', '2026-06-01', '2026-07-01', ...Array.from({ length: 13 }, (_, i) => `2026-07-${String(7 + i).padStart(2, '0')}`), '2026-08-01', '2026-08-15'];

const SRC_SHORT = { 'oai-blog': 'OpenAI blog', 'oai-tr': 'OpenAI technical report', metr: 'METR', hf: 'Hugging Face', 'oai-astra': 'OpenAI Astra system card', fortune: 'Fortune' } as const;
/** "METR · Core takeaways": where a printed number or quotation comes from, short enough to sit under it. */
const sourceLine = (c: Cite) => {
  const section = c.at.split(/ › |; /)[0];
  const fig = c.at.match(/\(Figure \d+\)/)?.[0];
  return `${SRC_SHORT[c.s]} · ${section}${fig && !section.includes('Figure') ? ` ${fig}` : ''}`;
};
const ORG_NAME: Partial<Record<Voice, string>> = { openai: 'OpenAI', metr: 'METR', hf: 'Hugging Face' };
/** Who each organisation is, in a few words, beside its name on a card. */
const ORG_WHO: Partial<Record<Voice, string>> = { openai: 'ran the test', metr: 'outside researchers', hf: 'the company attacked' };
/** Where an agent's words come from, short. The exact section is in the evidence under the film and in the script. */
const FROM = { 'oai-blog': 'OpenAI’s blog', 'oai-tr': 'OpenAI’s technical report', metr: 'METR’s report', hf: 'Hugging Face’s report', 'oai-astra': 'OpenAI’s Astra system card', fortune: 'Fortune’s report' } as const;
/** The first time a source speaks through an agent's words, say who it is: a stranger is not left to guess. */
const WHO_IS: Partial<Record<Cite['s'], string>> = { metr: 'METR: outside researchers who studied the agents’ logs.' };
const FIRST_OF_SOURCE = (() => {
  const first = new Map<string, QuoteCard>();
  for (const c of [...QUOTE_CARDS].sort((a, b) => a.t0 - b.t0)) { const q = QUOTE_BY_ID[c.id]; if (q && !first.has(q.src.s)) first.set(q.src.s, c); }
  return first;
})();
/** The first agent card that is its reasoning (not a posted message) says what "recorded reasoning" is. */
const FIRST_REASONING = [...QUOTE_CARDS].sort((a, b) => a.t0 - b.t0).find(c => QUOTE_BY_ID[c.id]?.kind.startsWith('reasoning'));
/** A board message is written with underscores for spaces; let a long one break between its words, not inside them. */
const breakable = (s: string) => s.split('_').flatMap((part, i, all) => (i < all.length - 1 ? [part, '_', <wbr key={i} />] : [part]));
const kindLabel = (q: Quote): string => {
  if (q.kind === 'message') return 'A message it posted to the board';
  if (q.kind === 'reasoning-raw') return 'Recorded reasoning';
  if (q.kind === 'reasoning-quoted') return 'Recorded reasoning, as quoted by OpenAI';
  return q.src.s === 'metr' ? 'Recorded reasoning, as paraphrased by METR' : 'Recorded reasoning, paraphrased';
};
const words = (s: string) => s.trim().split(/\s+/).length;
/** The day a report was published, short: "Jul 27". An organisation's card says it, so a quotation is never read as being from the day it describes. */
const published = (s: keyof typeof SOURCES) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(SOURCES[s].date));

type IconName = 'play' | 'pause' | 'prev' | 'next' | 'sound' | 'muted' | 'full' | 'exit';
const ICONS: Record<IconName, ReactNode> = {
  play: <path d="M7.5 4.8v14.4L19.2 12z" />,
  pause: <><rect x="6" y="4.8" width="4.2" height="14.4" rx="1" /><rect x="13.8" y="4.8" width="4.2" height="14.4" rx="1" /></>,
  prev: <><rect x="5" y="5" width="2.6" height="14" rx="1" /><path d="M19 5.4v13.2L9.4 12z" /></>,
  next: <><rect x="16.4" y="5" width="2.6" height="14" rx="1" /><path d="M5 5.4v13.2L14.6 12z" /></>,
  sound: <><path d="M4 9.5h3.6L12.5 5v14l-4.9-4.5H4z" /><path d="M15.5 8.6a4.8 4.8 0 0 1 0 6.8M18.2 6a8.4 8.4 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
  muted: <><path d="M4 9.5h3.6L12.5 5v14l-4.9-4.5H4z" /><path d="M16 9.6l5 4.8m0-4.8l-5 4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
  full: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />,
  exit: <path d="M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />,
};
function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true" fill="currentColor">{ICONS[name]}</svg>;
}

/**
 * A quotation on screen. An agent's own words (its reasoning, or a message it posted) are amber, with its name, on the left. An
 * organisation's (OpenAI, METR, Hugging Face) are on a paper card, with where in its report they are, on the right.
 */
/** The four bars that move while an agent's voice is heard. In a rendered video they are drawn from the film's time (a CSS animation would run on the wall clock, not the frame's). */
function Bars({ T }: { T?: number }) {
  const phase = [0, 0.33, 0.67, 0.17];
  return (
    <i className="film-bars" aria-hidden="true">
      {phase.map((p, i) => <b key={i} style={T === undefined ? undefined : { transform: `scaleY(${(0.3 + 0.7 * Math.abs(Math.sin(Math.PI * (T / 0.9 + p)))).toFixed(3)})` }} />)}
    </i>
  );
}

function VoiceCard({ c, t, speaking, barsT }: { c: QuoteCard; t: number; speaking: boolean; barsT?: number }) {
  const q = QUOTE_BY_ID[c.id];
  if (!q) return null;
  const voice = voiceOf(q);
  const text = c.excerpt ?? q.text;
  const agent = voice === 'agent' || voice === 'message';
  const handle = c.agent ? null : q.by;
  const para = q.kind === 'reasoning-paraphrased';
  const who = agent && FIRST_OF_SOURCE.get(q.src.s) === c ? WHO_IS[q.src.s] : undefined;
  const firstReasoning = q.kind.startsWith('reasoning') && FIRST_REASONING === c;
  return (
    <figure className={`film-card film-card-${agent ? 'agent' : 'org'}${voice === 'message' ? ' is-message' : ''}${para ? ' is-para' : ''}${words(text) <= 6 && voice !== 'message' ? ' is-short' : ''}`} style={{ opacity: fade(t, c.t0, c.t1, CARD_EDGE) }}>
      <header>
        {agent ? (
          <span className={`film-chip film-chip-agent${handle ? ' is-handle' : ''}${para ? ' is-para' : ''}`}>{handle ?? c.agent ?? 'An agent'}</span>
        ) : (
          <span className="film-chip film-chip-org">{ORG_NAME[voice]}</span>
        )}
        {speaking ? <Bars T={barsT} /> : null}
        <span className="film-kind">{agent ? `${kindLabel(q)}${firstReasoning ? ' (what it wrote while working)' : ''}` : ORG_WHO[voice]}</span>
      </header>
      <blockquote>{voice === 'message' ? breakable(text) : text}</blockquote>
      <figcaption>{agent ? `${para ? 'Paraphrased in' : 'Quoted in'} ${FROM[q.src.s]}.` : `${SRC_SHORT[q.src.s]}, ${published(q.src.s)} › ${q.src.at.split(/ › |; /)[0]}`}{who ? <> {who}</> : null}</figcaption>
    </figure>
  );
}

/** Full screen, with the prefix older Safari wants. It can only be asked for from a click or a key press, and may be refused. */
function requestFull(el: HTMLElement | null) {
  if (!el) return;
  const e = el as HTMLElement & { webkitRequestFullscreen?: () => void };
  try {
    const r = el.requestFullscreen?.();
    if (r && typeof r.catch === 'function') r.catch(() => undefined);
    else e.webkitRequestFullscreen?.();
  } catch { /* the browser said no: the film plays where it is */ }
}

type Mix = { narrator: boolean; agents: boolean; music: boolean };
/** Whether anything can be heard at all: voices, or music. */
const SOUND_ON_OFFER = VOICES_ON_OFFER || MUSIC_ON_OFFER;

/** The film: a camera moves through a drawing of the incident, and the documented words and numbers appear when they are true. */
export function Film() {
  const frame = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const grain = useRef<HTMLDivElement>(null);
  const titleEl = useRef<HTMLDivElement>(null);
  const fadeEl = useRef<HTMLDivElement>(null);
  const tRef = useRef(0);
  const playing = useRef(false);
  const started = useRef(false);
  const voices = useRef<FilmVoices | null>(null);
  const music = useRef<FilmMusic | null>(null);
  const captureRef = useRef(false);
  /** ?bare=1 (with capture): the picture alone, no words on it, for a loop behind other words. */
  const bareRef = useRef(false);
  /** ?hero=36 (with capture and bare): the loop behind the homepage's words, one turn of its orbit in this many seconds. Not part of the film. */
  const heroRef = useRef(0);
  /** Every time the picture's screen time moves by more than playing explains, and why (a key, a button, the scrubber, or nothing known): `window.__film.jumps`. */
  const jumps = useRef<{ wall: number; from: number; to: number; why: string }[]>([]);
  const lastTau = useRef(-1);
  // `ui.t` is film time, the clock the sound runs on; the picture and everything on it are drawn at screen time, `toScreen(ui.t)`.
  const [ui, setUi] = useState({ t: toFilm(POSTER_T), playing: false, started: false, ended: false });
  const [captions, setCaptions] = useState(true);
  // Which of the sounds are wanted, when any have been made: all, unless the viewer turned some off (remembered).
  const [mix, setMix] = useState<Mix>({ narrator: true, agents: true, music: true });
  const mixRef = useRef<Mix>({ narrator: true, agents: true, music: true });
  const [panel, setPanel] = useState(false);
  // The picture is full screen (the controls inside it stay, so there is always a play and pause).
  const [full, setFull] = useState(false);
  // ?capture=1 fills the window with the film alone, for rendering stills and video.
  const [capture, setCapture] = useState(false);
  const [bare, setBare] = useState(false);
  const dims = useRef({ W: 960, H: 540, dpr: 1 });
  // What this machine has shown it can afford. Starts at the best; steps down if playback stutters, and stays down.
  const quality = useRef({ level: 0, dpr: 2, lite: false });

  const paint = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const { W, H, dpr } = dims.current;
    const hero = heroRef.current;
    if (hero > 0) {
      // The loop clock is the film clock: u goes round once every `hero` seconds.
      const u = (tRef.current % hero) / hero;
      drawFrame(ctx, HERO_STATE + 0.5 * Math.sin(u * Math.PI * 2), W, H, dpr, { lite: quality.current.lite, bare: true, cam: heroCamera(u) });
      return;
    }
    drawFrame(ctx, toScreen(tRef.current), W, H, dpr, { lite: quality.current.lite, bare: bareRef.current });
  }, []);

  const size = useCallback(() => {
    const el = stage.current, c = canvas.current;
    if (!el || !c) return;
    const r = el.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, quality.current.dpr);
    const W = Math.max(280, Math.round(r.width)), H = Math.max(200, Math.round(r.height));
    dims.current = { W, H, dpr };
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    paint();
  }, [paint]);

  // Playback below about 26 frames a second: draw smaller, then simpler. Four steps; each is skipped if it would change nothing here.
  const stepDown = useCallback(() => {
    const q = quality.current;
    const have = () => Math.min(window.devicePixelRatio || 1, q.dpr);
    const before = have();
    while (q.level < 4) {
      q.level += 1;
      if (q.level === 1 && have() > 1.5) q.dpr = 1.5;
      else if (q.level === 2 && have() > 1) q.dpr = 1;
      else if (q.level === 3) q.lite = true;
      else if (q.level === 4 && have() > 0.75) q.dpr = 0.75;
      else continue;
      break;
    }
    if (have() !== before || q.lite) size();
  }, [size]);

  const sync = useCallback((over: Partial<typeof ui> = {}) => {
    setUi(u => ({ ...u, t: tRef.current, playing: playing.current, started: started.current, ended: tRef.current >= FILM_DURATION - 0.02, ...over }));
  }, []);

  // Size the canvas to the stage.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);
    return () => ro.disconnect();
  }, [size]);

  // The clock.
  useEffect(() => {
    let raf = 0, last = performance.now(), slow = 0;
    const loop = (now: number) => {
      const gap = now - last;
      const dt = Math.min(0.1, gap / 1000);
      last = now;
      voices.current?.update(tRef.current, playing.current, mixRef.current);
      if (music.current) {
        const tau = toScreen(tRef.current);
        const part = BEATS.find(b => tau >= b.t0 && tau < b.t1);
        music.current.update(started.current && tRef.current < FILM_DURATION - 0.02 && part ? bedFor(part.id as SceneId) : undefined, playing.current, mixRef.current.music, voices.current?.heard ?? false, started.current && tRef.current >= FILM_DURATION - 0.02);
      }
      if (playing.current) {
        tRef.current = Math.min(FILM_DURATION, tRef.current + dt);
        // Playing moves screen time by at most the frame's time. More than that was not playing: say so (and where it came from, if we know).
        let tau = toScreen(tRef.current);
        if (lastTau.current >= 0 && Math.abs(tau - lastTau.current) > dt + 0.06) {
          jumps.current.push({ wall: Math.round(performance.now()), from: +lastTau.current.toFixed(2), to: +tau.toFixed(2), why: 'not from a key, a button or the scrubber' });
          if (jumps.current.length > 60) jumps.current.shift();
          if (process.env.NODE_ENV !== 'production') console.info('[film] the picture moved from', lastTau.current.toFixed(1), 'to', tau.toFixed(1), 's of screen time for no reason the player knows (the code or the sound files changed while it played?)');
        }
        // What was drawn is what matters to the viewer: carry on from where the picture was, not from where the clock now says (in development, when the
        // script or the recordings change while it plays, the map from the clock to the picture changes under it).
        if (jumps.current.length && jumps.current[jumps.current.length - 1].why.startsWith('not from') && jumps.current[jumps.current.length - 1].to === +tau.toFixed(2) && lastTau.current >= 0 && Math.abs(tau - lastTau.current) > dt + 0.06) {
          tRef.current = Math.min(FILM_DURATION, toFilm(lastTau.current) + dt);
          tau = toScreen(tRef.current);
        }
        lastTau.current = tau;
        if (tRef.current >= FILM_DURATION) { playing.current = false; sync({ ended: true, playing: false }); }
        paint();
        if (Math.floor(tRef.current * 15) !== Math.floor((tRef.current - dt) * 15)) sync();
        // Frames slower than ~26/s count against the machine; a long gap is a hidden tab, not a slow one.
        if (gap > 38 && gap < 400) slow += 1; else if (gap < 24) slow = Math.max(0, slow - 2);
        if (slow >= 20) { slow = 0; stepDown(); }
      } else slow = 0;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paint, sync, stepDown]);

  // Fonts the picture's labels use, and a still frame to start from (or the frame asked for in the address).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const at = q.get('t');
    if (q.get('capture')) { captureRef.current = true; setCapture(true); if (q.get('bare')) { bareRef.current = true; setBare(true); heroRef.current = parseFloat(q.get('hero') ?? '') || 0; } }
    else { warm(); warmMusic(); }
    try { const saved = JSON.parse(localStorage.getItem('ctrlai-film-mix') ?? 'null') as Partial<Mix> | null; if (saved) { mixRef.current = { narrator: saved.narrator !== false, agents: saved.agents !== false, music: saved.music !== false }; setMix(mixRef.current); } } catch { /* private window: all on */ }
    const go = () => {
      // ?t= is a screen time (the seconds the script and the stills use).
      if (at !== null) { started.current = true; tRef.current = toFilm(clamp(parseFloat(at) || 0, 0, DURATION)); }
      else tRef.current = toFilm(POSTER_T);
      paint(); sync();
    };
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.load) Promise.all([fonts.load('700 11px "Schibsted Grotesk Variable"'), fonts.load('500 12px "Schibsted Grotesk Variable"'), fonts.load('500 20px "Newsreader Variable"')]).then(go, go);
    else go();
    // For stills and video export: seek, and have the page fully drawn (picture, words, grain) before returning.
    // Draw the picture for a film time, completely: picture, words, grain, and how far it has dipped to black.
    const drawAt = (T: number, black: number) => {
      started.current = true; tRef.current = clamp(T, 0, FILM_DURATION); lastTau.current = -1; paint();
      flushSync(() => sync());
      if (fadeEl.current) fadeEl.current.style.opacity = String(black);
      const el = grain.current;
      if (el) {
        const k = Math.floor(tRef.current * 24);
        const h = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
        el.style.transform = `translate(${(h(k) - 0.5) * 16}%, ${(h(k + 91) - 0.5) * 16}%)`;
      }
    };
    (window as unknown as { __film?: unknown }).__film = {
      // `s` is a screen time, as in the script and the stills.
      seek: (s: number) => drawAt(toFilm(clamp(s, 0, DURATION)), 0),
      // `T` is a film time, the clock the sound runs on: how a video is drawn (frame k of a 30 fps video is T = k / 30), with an optional dip to black.
      seekFilm: (T: number, black = 0) => drawAt(T, black),
      // The title card (before the film) and the closing card (after it), with how visible each is and how far the picture has faded to black.
      card: (kind: 'title' | 'end', visible: number, black = 0) => {
        const end = kind === 'end';
        started.current = end; tRef.current = end ? FILM_DURATION : toFilm(POSTER_T); paint();
        flushSync(() => sync({ started: end, ended: end, playing: false }));
        if (titleEl.current) titleEl.current.style.opacity = String(visible);
        if (fadeEl.current) fadeEl.current.style.opacity = String(black);
      },
      /** Screen time (what the script and stills count in). `T` is film time. */
      get t() { return toScreen(tRef.current); },
      /** Every jump in screen time while playing, and why. Empty means the picture only ever moved with the clock. */
      get jumps() { return jumps.current; },
      get T() { return tRef.current; },
      /** For tests: what is being heard, and whether the browser has let sound start. */
      get voices() { return { speaking: voices.current?.speaking ?? null, narrating: voices.current?.narrating ?? null, running: voices.current?.running ?? false, clips: CLIPS.length, music: music.current?.mood ?? null, musicRunning: music.current?.running ?? false, musicDecks: music.current?.playingDecks ?? 0, musicGain: +(music.current?.gainNow ?? 0).toFixed(3) }; },
    };
  }, [paint, sync]);

  const play = useCallback(() => {
    if (tRef.current >= FILM_DURATION - 0.05 || !started.current) tRef.current = 0;
    lastTau.current = -1;
    started.current = true; playing.current = true; sync();
    // Browsers let sound start only after a click or key press, and this is one.
    if (!captureRef.current) {
      if (VOICES_ON_OFFER) { voices.current ??= new FilmVoices(CLIPS); voices.current.unlock(); }
      if (MUSIC_ON_OFFER) { music.current ??= new FilmMusic(); music.current.unlock(); }
    }
  }, [sync]);
  const pause = useCallback(() => { playing.current = false; voices.current?.stop(); sync(); }, [sync]);
  /** Turn one sound on or off (remembered), or all of them at once: if any is on they all go off, else they all come on. */
  const setMixed = useCallback((next: Mix) => {
    mixRef.current = next; setMix(next);
    try { localStorage.setItem('ctrlai-film-mix', JSON.stringify(next)); } catch { /* not remembered */ }
    if (next.narrator || next.agents) { if (VOICES_ON_OFFER) { voices.current ??= new FilmVoices(CLIPS); voices.current.unlock(); } } else voices.current?.stop();
    if (next.music && MUSIC_ON_OFFER) { music.current ??= new FilmMusic(); music.current.unlock(); }
  }, []);
  const toggleSound = useCallback(() => {
    const any = mixRef.current.narrator || mixRef.current.agents || mixRef.current.music;
    setMixed({ narrator: !any, agents: !any, music: !any });
  }, [setMixed]);
  /** Jump to a film time. */
  const seek = useCallback((t: number, why = 'seek') => {
    const from = toScreen(tRef.current);
    started.current = true; tRef.current = clamp(t, 0, FILM_DURATION);
    const to = toScreen(tRef.current);
    // A jump made on purpose while playing is logged with its reason; the frame loop then does not count it again.
    if (playing.current && Math.abs(to - from) > 0.05) { jumps.current.push({ wall: Math.round(performance.now()), from: +from.toFixed(2), to: +to.toFixed(2), why }); if (jumps.current.length > 60) jumps.current.shift(); }
    lastTau.current = -1;
    paint(); sync();
  }, [paint, sync]);
  const toggle = useCallback(() => (playing.current ? pause() : play()), [pause, play]);
  /** One message back or forward (see `stepTarget`): paused or playing, the frame lands with the message fully on screen. */
  const step = useCallback((dir: 1 | -1) => seek(toFilm(stepTarget(toScreen(tRef.current), dir)), dir === 1 ? 'next message' : 'previous message'), [seek]);
  /** A click with the pointer lets go of the button, so Space and the arrows still drive the film; the keyboard keeps its focus. */
  const act = useCallback((fn: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => { fn(); if (e.detail > 0) e.currentTarget.blur(); }, []);
  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else requestFull(frame.current);
  }, []);
  // Whether this browser can show the picture full screen (an iPhone cannot): the title card then offers it first.
  const [canFull, setCanFull] = useState(false);
  useEffect(() => { setCanFull(!!document.fullscreenEnabled || !!(document as Document & { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled); }, []);
  // Once, a few seconds after the film starts playing in the page, a quiet reminder that full screen is the way to see it.
  const [fullHint, setFullHint] = useState(false);
  const hintShown = useRef(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** One click: start the film, and (where the browser allows it) fill the screen with it. Full screen has to be asked for in the click itself. */
  const start = useCallback((fullscreen: boolean) => {
    if (fullscreen) requestFull(frame.current);
    play();
  }, [play]);

  useEffect(() => {
    const hide = () => { if (document.hidden) { voices.current?.stop(); music.current?.stop(); } };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); voices.current?.dispose(); voices.current = null; music.current?.dispose(); music.current = null; };
  }, []);

  useEffect(() => {
    if (!panel) return;
    const away = (e: PointerEvent) => { if (!(e.target as HTMLElement | null)?.closest?.('.film-soundpanel, .film-sound')) setPanel(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [panel]);

  useEffect(() => {
    if (!ui.playing || full || !canFull || capture || hintShown.current) return;
    hintShown.current = true;
    setFullHint(true);
    hintTimer.current = setTimeout(() => setFullHint(false), 9000);
  }, [ui.playing, full, canFull, capture]);
  useEffect(() => () => clearTimeout(hintTimer.current), []);
  useEffect(() => { if (full) setFullHint(false); }, [full]);

  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === frame.current);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  // Keys work wherever the focus is once the film has started (not only inside it): the button that started it goes away, and in full
  // screen the page behind is out of reach. A button keeps its own Space; a typed-into field keeps every key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || !started.current) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      const type = tag === 'INPUT' ? (el as HTMLInputElement).type : '';
      if ((tag === 'INPUT' && type !== 'range' && type !== 'checkbox') || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === ' ') { if (tag === 'BUTTON' || tag === 'A' || type === 'checkbox') return; e.preventDefault(); toggle(); }
      else if (key === 'k') { e.preventDefault(); toggle(); }
      else if (key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (key === 'f') { e.preventDefault(); toggleFull(); }
      else if (key === 'c') { e.preventDefault(); setCaptions(v => !v); }
      else if (key === 'm' && SOUND_ON_OFFER) { e.preventDefault(); toggleSound(); }
      else if (key === 'Escape') setPanel(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggle, step, toggleFull, toggleSound]);

  const T = ui.t;
  const t = toScreen(T);
  const beat = BEATS.find(b => t >= b.t0 && t < b.t1) ?? BEATS[BEATS.length - 1];
  const cap = useMemo(() => CAPTIONS.find(c => t >= c.t0 && t < c.t1), [t]);
  const cards = QUOTE_CARDS.filter(c => t >= c.t0 && t < c.t1);
  const stamps = STAMPS.filter(s => t >= s.t0 && t < s.t1);
  const bigs = BIGS.filter(b => t >= b.t0 && t < b.t1);
  const keyFade = Math.max(0, ...KEY_WINDOWS.map(k => fade(t, k.t0, k.t1)));
  const voiceFade = Math.max(0, ...VOICE_KEY_WINDOWS.map(k => fade(t, k.t0, k.t1)));
  const beatQuotes = useMemo(() => {
    const ids = QUOTE_CARDS.filter(c => c.t0 >= beat.t0 && c.t0 < beat.t1).map(c => c.id);
    return Array.from(new Set(ids)).map(id => QUOTE_BY_ID[id]).filter(Boolean);
  }, [beat]);
  const span0 = axisPos(beat.span[0]) * 100;
  const span1 = axisPos(nextDay(beat.span[1])) * 100;
  const chart = orgVisible(t);
  const sceneTitle = SCENE_TITLES.find(s => t >= s.t0 && t < s.t1);
  const anySound = (VOICES_ON_OFFER && (mix.narrator || mix.agents)) || (MUSIC_ON_OFFER && mix.music);

  return (
    <section className={`film${capture ? ' film-capture' : ''}${bare ? ' film-bare' : ''}${ui.playing ? ' is-playing' : ''}${chart ? ' has-chart' : ''}${ui.started && !ui.ended && beat.noTimeline ? ' film-notl' : ''}`} aria-label="The incident, in a film">
      <div className={`film-frame${full ? ' is-full' : ''}`} ref={frame}>
      <div className="film-stage" ref={stage}>
        <canvas ref={canvas} className={`film-canvas${ui.started && !ui.ended ? ' is-clickable' : ''}`} aria-hidden="true" onClick={ui.started && !ui.ended ? toggle : undefined} />
        <div className="film-vignette" aria-hidden="true" />
        <div className="film-grain" ref={grain} aria-hidden="true" />

        {ui.started && !ui.ended ? (
          <>
            <div className="film-hud film-hud-top">
              <span className="film-chapter">{beat.title}</span>
              {beat.noTimeline ? null : (
              <div className="film-timeline" role="img" aria-label={`When: ${beat.when}. The timeline is stretched where the story is dense, so it is not to scale.`}>
                <div className="film-tl-track" aria-hidden="true">
                  {TICKS.map(d => <i key={d} className="film-tl-tick" style={{ left: `${axisPos(d) * 100}%` }} />)}
                  {AXIS.knees.map(k => <i key={k.day} className="film-tl-knee" style={{ left: `${k.at * 100}%` }} />)}
                  <i className="film-tl-span" style={{ left: `${span0}%`, width: `${Math.max(1.4, span1 - span0)}%` }} />
                </div>
                <div className="film-tl-labels" aria-hidden="true"><span>Apr 20</span><b>{beat.when.replace('August', 'Aug')}</b><span>Aug 26</span></div>
                {AXIS.knees.map(k => <div key={k.day} className="film-tl-knee-label" aria-hidden="true" style={{ left: `${k.at * 100}%` }}>{k.label}</div>)}
                <div className="film-tl-scale" aria-hidden="true" style={{ left: `${((AXIS.knees[0].at + AXIS.knees[1].at) / 2) * 100}%` }}>not to scale</div>
              </div>
              )}
            </div>
            <div className="film-stamps" aria-live="polite">
              {stamps.map(s => (
                <div key={s.head + s.t0} className={`film-stamp film-stamp-${s.kind}`} style={{ opacity: fade(t, s.t0, s.t1) }}>
                  <b>{s.head}</b>
                  {s.body ? <span>{s.body}</span> : null}
                </div>
              ))}
            </div>
            {sceneTitle ? (
              <div className="film-scene-title" style={{ opacity: fade(t, sceneTitle.t0, sceneTitle.t1, 0.8) }}>
                <small>{sceneTitle.earlier ? 'Earlier · ' : ''}{sceneTitle.when}</small>
                <b>{sceneTitle.title}</b>
              </div>
            ) : null}
            <OrgChart t={t} />
            {bigs.map(b => (
              <div key={b.value + b.t0} className="film-big" style={{ opacity: fade(t, b.t0, b.t1, 0.7) }}>
                <b>{b.value}</b>
                <span>{b.label}</span>
                <small>{sourceLine(b.cite)}</small>
              </div>
            ))}
            {voiceFade > 0.01 ? (
              <div className="film-key film-voicekey" aria-hidden="true" style={{ opacity: voiceFade }}>
                <span><i className="film-sw-agent">Agent</i>its recorded reasoning, or a message it posted (dashed: paraphrased){VOICES_ON_OFFER ? '. Read aloud by a synthetic voice' : ''}</span>
                <span><i className="film-sw-org">Org</i>OpenAI ran the test; METR, outside researchers; Hugging Face, the company attacked</span>
                <span><i className="film-sw-us">Aa</i>our explanation</span>
              </div>
            ) : keyFade > 0.01 ? (
              <div className="film-key" aria-hidden="true" style={{ opacity: keyFade }}>
                <span><i className="film-dot film-dot-amber" />An agent</span>
                <span><i className="film-dot film-dot-red" />In the attack</span>
                <span><i className="film-box" />Reached by the agents</span>
              </div>
            ) : null}
            {cards.map(c => <VoiceCard key={c.id + c.t0} c={c} t={t} speaking={capture ? CLIPS.some(cl => cl.id === c.id && cl.channel === 'agent' && T >= cl.start && T < cl.start + cl.seconds) : voices.current?.speaking === c.id} barsT={capture ? T : undefined} />)}
            {captions && cap ? <p className={`film-caption${cap.view ? ' is-view' : ''}`} style={{ opacity: fade(t, cap.t0, cap.t1, CAPTION_EDGE) }}>{cap.view ? <small className="film-viewlabel">Our view</small> : null}{cap.text}</p> : null}
          </>
        ) : null}

        {ui.started && !ui.ended && !capture ? (
          <>
            <div className={`film-transport${ui.playing ? '' : ' is-paused'}`} role="group" aria-label="Playback">
              <button type="button" className="film-tbtn" onClick={act(() => step(-1))} aria-label="Previous message" title="Previous message (←)"><Icon name="prev" /></button>
              <button type="button" className="film-tbtn film-tbtn-main" onClick={act(toggle)} aria-label={ui.playing ? 'Pause' : 'Play'} title={ui.playing ? 'Pause (space)' : 'Play (space)'}><Icon name={ui.playing ? 'pause' : 'play'} /></button>
              <button type="button" className="film-tbtn" onClick={act(() => step(1))} aria-label="Next message" title="Next message (→)"><Icon name="next" /></button>
              {SOUND_ON_OFFER ? <button type="button" className="film-tbtn film-sound" onClick={act(() => setPanel(p => !p))} aria-expanded={panel} aria-haspopup="true" aria-label="Sound" title="Sound: the narrator, the agents' voices and the music (press m to turn all off or on)"><Icon name={anySound ? 'sound' : 'muted'} /></button> : null}
              {VOICES_ARE_DRAFT && anySound ? <span className="film-tdraft" title="Some voices are placeholders for checking timing, not the final ones">draft voices</span> : null}
              <button type="button" className="film-tbtn" onClick={act(toggleFull)} aria-label={full ? 'Leave full screen' : 'Full screen'} title={full ? 'Leave full screen (f)' : 'Full screen (f)'}><Icon name={full ? 'exit' : 'full'} /></button>
            </div>
            {panel ? (
              <div className="film-soundpanel" role="group" aria-label="Sound">
                {NARRATOR_ON_OFFER ? <label><input type="checkbox" checked={mix.narrator} onChange={e => setMixed({ ...mix, narrator: e.target.checked })} /><span>Narrator<small>An English voice reading our captions</small></span></label> : null}
                {AGENTS_ON_OFFER ? <label><input type="checkbox" checked={mix.agents} onChange={e => setMixed({ ...mix, agents: e.target.checked })} /><span>Agent voices<small>Their own words, each agent in a voice of its own</small></span></label> : null}
                {MUSIC_ON_OFFER ? <label><input type="checkbox" checked={mix.music} onChange={e => setMixed({ ...mix, music: e.target.checked })} /><span>Music<small>{MUSIC_PROVIDER === 'synth' ? 'Original, synthesized for this film' : 'Made for this film'}; it makes way for the voices</small></span></label> : null}
                {VOICES_ON_OFFER ? <p>All the voices are synthetic: nobody recorded the agents, they wrote text.{VOICES_ARE_DRAFT ? ' Some are draft placeholders.' : ''}</p> : null}
              </div>
            ) : ui.playing ? (fullHint ? <p className="film-thint" role="status">Best in full screen: press F</p> : null) : <p className="film-thint" role="status">Paused. ← → move one message at a time. Space plays.</p>}
          </>
        ) : null}

        {!ui.started || ui.ended ? (
          <div className={`film-title${ui.ended ? ' is-end' : ''}`} ref={titleEl}>
            {capture ? <p className="film-brand" aria-hidden="true"><span className="film-keycap">ctrl</span><span className="film-keycap">AI</span></p> : null}
            <p className="film-eyebrow">{ui.ended ? 'Our view: the open question' : capture ? 'A film' : `A film in ${fmt(FILM_DURATION)} · best in full screen, with sound`}</p>
            <h2>{ui.ended ? TITLE.end : TITLE.headline}</h2>
            {ui.ended ? <p className="film-ask">{TITLE.ask}</p> : null}
            <p className="film-sub">{ui.ended ? TITLE.endSub : capture ? TITLE.premiseShort : TITLE.premise}</p>
            {ui.ended ? <p className="film-credit">{TITLE.credit}{VOICES_ON_OFFER ? ' The voices are synthetic.' : ''}{MUSIC_ON_OFFER ? ` The music is ${MUSIC_PROVIDER === 'synth' ? 'original and synthesized' : 'generated'}, made for this film.` : ''}{FILM_URL ? ` The full reconstruction, with every source: ${FILM_URL}` : ''}</p> : null}
            {capture && ui.ended ? <p className="film-url"><span>The full film, with every source</span><b>{SITE.url.replace(/^https?:\/\//, '')}{FILM_SHORT_PATH}</b></p> : null}
            <div className="film-play-row">
              <button type="button" className="key key-primary film-play" onClick={() => start(canFull)}>{ui.ended ? 'Watch again' : canFull ? 'Watch in full screen' : 'Watch the film'}</button>
              {canFull ? <button type="button" className="film-play-alt" onClick={() => start(false)}>{ui.ended ? 'or again here' : 'or watch here'}</button> : null}
            </div>
            {!ui.ended && !capture ? <p className="film-hint">{SOUND_ON_OFFER ? `Sound on: ${[NARRATOR_ON_OFFER ? 'a narrator' : '', AGENTS_ON_OFFER ? 'the agents’ own voices' : '', MUSIC_ON_OFFER ? 'music' : ''].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' and $1')} (the voices are synthetic${VOICES_ARE_DRAFT ? '; some are draft placeholders' : ''}${MUSIC_ON_OFFER ? '; the music is original, made for this film' : ''}). ` : 'No sound. '}Captions on. Space pauses; ← → move one message at a time.</p> : null}
          </div>
        ) : null}

        <p className="film-note">{DISCLOSURE}</p>
        {capture && !bare ? <p className="film-watermark" aria-hidden="true">{SITE.url.replace(/^https?:\/\//, '')}</p> : null}
        <div className="film-fade" ref={fadeEl} aria-hidden="true" />
      </div>
      </div>

      <div className="film-under">
        <p className="film-under-caption" style={{ opacity: captions && cap ? fade(t, cap.t0, cap.t1, CAPTION_EDGE) : 0 }}>{captions && cap ? <>{cap.view ? <b className="film-under-label">Our view</b> : null}{cap.text}</> : ' '}</p>
        <p className="film-under-note">{DISCLOSURE}</p>
        {VOICES_ARE_DRAFT && anySound ? <p className="film-under-note">Draft voices: placeholders for checking timing, not the final ones.</p> : null}
      </div>

      <div className="film-bar">
        <div className="film-keys">
          <button type="button" className="key key-sm key-primary" onClick={act(toggle)} aria-pressed={ui.playing} aria-label={ui.playing ? 'Pause' : 'Play'}>{ui.playing ? 'Pause' : ui.ended ? 'Again' : 'Play'}</button>
          <button type="button" className="key key-sm" onClick={act(() => step(-1))} aria-label="Previous message" title="Previous message (←)">‹</button>
          <button type="button" className="key key-sm" onClick={act(() => step(1))} aria-label="Next message" title="Next message (→)">›</button>
          <button type="button" className="key key-sm" onClick={act(() => seek(0, 'start button'))} aria-label="Back to the start">Start</button>
          {SOUND_ON_OFFER ? <button type="button" className="key key-sm film-voices-key" onClick={act(toggleSound)} aria-pressed={anySound} aria-label={anySound ? 'Turn the sound off' : 'Turn the sound on'} title={`${VOICES_ARE_DRAFT ? 'Sound (some voices are draft placeholders)' : 'Sound: the voices are synthetic'}: ${anySound ? 'on' : 'off'}`}><span className="film-bar-icon"><Icon name={anySound ? 'sound' : 'muted'} /></span></button> : null}
        </div>
        <div className="film-scrub">
          <input type="range" min={0} max={FILM_DURATION} step={0.1} value={T} onChange={e => seek(parseFloat(e.target.value), 'scrubber')} aria-label="Move through the film" aria-valuetext={`${fmt(T)}, ${beat.title}`} />
          <div className="film-ticks" aria-hidden="true">
            {BEATS.map(b => <i key={b.id} style={{ left: `${(toFilm(b.t0) / FILM_DURATION) * 100}%` }} />)}
          </div>
        </div>
        <span className="film-time">{fmt(T)} / {fmt(FILM_DURATION)}</span>
        <label className="film-cc"><input type="checkbox" checked={captions} onChange={e => setCaptions(e.target.checked)} /> Captions</label>
        <button type="button" className="key key-sm" onClick={act(toggleFull)} aria-label="Full screen">Full screen</button>
      </div>

      <ol className="film-chapters" aria-label="Chapters">
        {BEATS.map(b => (
          <li key={b.id}>
            <button type="button" className={`film-chapter-btn${b.id === beat.id ? ' is-now' : ''}`} onClick={() => { seek(toFilm(b.t0 + 0.2), 'chapter'); }}>
              <span>{b.title}</span>
              <small>{fmt(toFilm(b.t0))}</small>
            </button>
          </li>
        ))}
      </ol>

      <div className="film-evidence">
        <p className="film-evidence-head"><b>{beat.title}</b> <span>{beat.when}</span></p>
        <p className="inc-now-cites"><Cites cites={beat.cites} /></p>
        {beatQuotes.length ? <div className="film-evidence-quotes">{beatQuotes.map(q => <QuoteView key={q.id} q={q} compact />)}</div> : null}
        <p className="film-evidence-links">
          {beat.events.length ? beat.events.map(e => <a key={e} href={`/incident/openai-hugging-face#${e}`}>Read the step ({e})</a>) : <a href="/incident/openai-hugging-face">The full reconstruction</a>}
          <a href="/incident/openai-hugging-face/film/script">The script and timing</a>
        </p>
      </div>
    </section>
  );
}
