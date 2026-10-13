'use client';

import { useEffect, useRef } from 'react';
import { createPlayer } from './player';
import { FILM } from '@/content/scenarios/day-before/film';
import '@fontsource-variable/newsreader/standard.css';
import '@fontsource-variable/schibsted-grotesk/wght.css';
import './film.css';

/** The picture behind the Play button: the lit model city in the cold open, without its words. */
const POSTER = 40;

/** "The day before": the web player, mounted. The film itself is plain DOM and canvas (player.ts); React only gives it a place to live. */
export function DayBefore() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // The cards are set in Newsreader and the words in Schibsted Grotesk: ask for both now, so the first card does not flash another face.
    void Promise.all([document.fonts.load("400 1em 'Newsreader Variable'"), document.fonts.load("650 1em 'Schibsted Grotesk Variable'")]).catch(() => {});
    const player = createPlayer(host.current!, FILM, { storageKey: 'day-before:answers:v1', poster: POSTER });
    return () => player.destroy();
  }, []);
  return <div className="dbf-host" ref={host} />;
}
