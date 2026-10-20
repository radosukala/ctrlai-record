'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { wordsSaid, type Moment } from '@/lib/moments';

/* The YouTube IFrame API, loaded only after someone presses play: a page view sends nothing to YouTube. */
type Player = { getCurrentTime(): number; getPlayerState(): number; seekTo(seconds: number, allowSeekAhead: boolean): void; playVideo(): void; pauseVideo(): void; destroy(): void };
declare global {
  interface Window {
    YT?: { Player: new (frame: HTMLIFrameElement, options: { events: { onReady?: () => void; onError?: () => void } }) => Player };
    onYouTubeIframeAPIReady?: () => void;
  }
}
const PLAYING = 1;
let api: Promise<void> | null = null;
function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  api ??= new Promise<void>(resolve => {
    const earlier = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { earlier?.(); resolve(); };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
  return api;
}

const STARTED = 'ctrl:moment-started';

/**
 * A checked quotation that can be heard and seen: press play, and the person says it, from the source's own player,
 * while their words light up as they are spoken. At rest every word is marked, as everywhere on the site (found word
 * for word); while it plays, only the words said so far are. The times come from the video's captions
 * (content/base/moments.json), so a word can light a few tenths of a second early or late.
 */
export function PlayableQuote({ id, text, moment, title, who, at }: { id: string; text: string; moment: Moment; title: string; who: string; at: number }) {
  const words = useMemo(() => text.replace(/\s+/g, ' ').trim().split(' '), [text]);
  const [mounted, setMounted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [live, setLive] = useState(false);
  const [lit, setLit] = useState(words.length);
  const [ended, setEnded] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const player = useRef<Player | null>(null);
  const finished = useRef(false);
  const seconds = Math.round(moment.to - moment.from);

  function start() {
    window.dispatchEvent(new CustomEvent(STARTED, { detail: id }));
    track('play_moment', { quote: id });
    finished.current = false;
    setFailed(false);
    setEnded(false);
    setLit(0);
    setLive(true);
    setMounted(true);
  }

  function replay() {
    finished.current = false;
    setEnded(false);
    setLive(true);
    setLit(0);
    player.current?.seekTo(moment.from, true);
    player.current?.playVideo();
  }

  // Attach the API to the frame once it is on the page, and follow it.
  useEffect(() => {
    if (!mounted || !frame.current) return;
    let gone = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    loadApi().then(() => {
      if (gone || !frame.current || !window.YT) return;
      player.current = new window.YT.Player(frame.current, {
        events: {
          onReady: () => {
            timer = setInterval(() => {
              const p = player.current;
              if (!p || p.getPlayerState() !== PLAYING) return;
              const now = p.getCurrentTime();
              if (!finished.current && now >= moment.to) {
                finished.current = true;
                p.pauseVideo();
                setEnded(true);
                setLive(false);
                return;
              }
              const inside = now >= moment.from - 1.5 && now <= moment.to + 0.5 && !finished.current;
              setLive(inside);
              if (inside) setLit(wordsSaid(moment, now));
            }, 100);
          },
          onError: () => setFailed(true),
        },
      });
    });
    return () => {
      gone = true;
      if (timer) clearInterval(timer);
      try { player.current?.destroy(); } catch {}
      player.current = null;
    };
  }, [mounted, moment]);

  // Only one moment plays at a time.
  useEffect(() => {
    const other = (event: Event) => {
      if ((event as CustomEvent).detail !== id) try { player.current?.pauseVideo(); } catch {}
    };
    window.addEventListener(STARTED, other);
    return () => window.removeEventListener(STARTED, other);
  }, [id]);

  const src = `https://www.youtube-nocookie.com/embed/${moment.v}?autoplay=1&rel=0&playsinline=1&enablejsapi=1&start=${Math.floor(moment.from)}${typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : ''}`;
  const watch = `https://www.youtube.com/watch?v=${moment.v}&t=${Math.floor(at)}s`;

  return (
    <div className="ed-m">
      <div className="ed-m-stage">
        {!mounted ? (
          <button type="button" className="ed-m-play" onClick={start} aria-label={`Play the moment: ${who} saying this, ${seconds} seconds`}>
            <span className="ed-m-key" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg></span>
            <span className="ed-m-len">{seconds} s</span>
            <span className="ed-m-who">{who}</span>
            <span className="ed-m-note">Plays from YouTube when you press play</span>
          </button>
        ) : failed ? (
          <div className="ed-m-fail">
            <p>This video can’t be played here.</p>
            <a href={watch}>Open it on YouTube at the moment <span aria-hidden="true">↗</span></a>
          </div>
        ) : (
          <iframe ref={frame} src={src} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        )}
      </div>
      {mounted && !failed ? (
        <p className="ed-m-bar">
          {ended ? <button type="button" onClick={replay}>↺ Replay the moment</button> : <span>{live ? 'Playing the moment' : 'Past the moment'}</span>}
          <a href={watch}>On YouTube <span aria-hidden="true">↗</span></a>
        </p>
      ) : null}
      <blockquote className="ed-m-q" data-live={live ? '' : undefined}>
        “{words.map((word, i) => <span key={i} className="w" data-said={!live || i < lit ? '' : undefined}>{word}{i < words.length - 1 ? ' ' : ''}</span>)}”
      </blockquote>
    </div>
  );
}
