'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The loop behind the film's hero on the homepage: silent, looping, and only started once the page has loaded, and only if the visitor has not asked for less
 * motion or less data. It pauses while it is off screen. Until it plays, the hero's own background (a still of the same picture) is what is seen.
 */
export function HeroVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? '')) return;
    const go = () => setOn(true);
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
    return () => window.removeEventListener('load', go);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v || !on) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { if (!pausedRef.current) v.play().catch(() => undefined); } else v.pause(); });
    io.observe(v);
    return () => io.disconnect();
  }, [on]);

  // A moving background that lasts more than a few seconds can be stopped.
  const [paused, setPaused] = useState(false);
  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { pausedRef.current = false; v.play().catch(() => undefined); setPaused(false); } else { pausedRef.current = true; v.pause(); setPaused(true); }
  };

  return (
    <>
      <video ref={ref} className="film-hero-video" src={on ? src : undefined} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} />
      {on ? (
        <button type="button" className="film-hero-motion" onClick={toggle} aria-label={paused ? 'Play the background motion' : 'Pause the background motion'} title={paused ? 'Play the background motion' : 'Pause the background motion'}>
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor">{paused ? <path d="M7.5 4.8v14.4L19.2 12z" /> : <><rect x="6" y="4.8" width="4" height="14.4" rx="1" /><rect x="14" y="4.8" width="4" height="14.4" rx="1" /></>}</svg>
        </button>
      ) : null}
    </>
  );
}
