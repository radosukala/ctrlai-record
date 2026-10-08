import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { TITLE } from '@/content/incidents/openai-hf/film';
import { FILM_PATH, INCIDENT_PATH, VOICES_LICENSED } from '@/content/incidents/openai-hf/publish';
import { FILM_DURATION } from '@/content/incidents/openai-hf/timing';
import { HeroVideo } from './HeroVideo';
import './film-hero.css';

const HERO_LOOP = '/film/hero/hero-loop.mp4';
const hasLoop = () => fs.existsSync(path.join(process.cwd(), 'public', HERO_LOOP));

/**
 * The film, as the first thing on the homepage: a dark band with a slow loop of its picture behind the film's own headline, a way in (the film's page, where
 * one more click starts it full screen) and a way to the sources. The loop is the hall of the film seen from above in its widest moment; it is not
 * part of the film, and says nothing the film does not.
 */
export function FilmHero() {
  const minutes = Math.round(FILM_DURATION / 60);
  return (
    <section className="film-hero" aria-labelledby="film-hero-title">
      {hasLoop() ? <HeroVideo src={HERO_LOOP} /> : null}
      <div className="shell film-hero-in">
        {process.env.NODE_ENV !== 'production' && !VOICES_LICENSED ? <p className="film-hero-dev">Preview only: in production this band stays off the homepage until the film’s voices are made on a paid ElevenLabs plan (docs/FILM-VOICES.md).</p> : null}
        <p className="film-hero-eyebrow">A film · {minutes} minutes · best in full screen, with sound</p>
        <h2 id="film-hero-title" className="film-hero-title">{TITLE.headline}</h2>
        <p className="film-hero-sub">Drawn from what OpenAI, METR and Hugging Face published about the July 2026 incident. Every date, number and quotation has its source.</p>
        <div className="film-hero-actions">
          <Link href={FILM_PATH} className="film-hero-play">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7.5 4.8v14.4L19.2 12z" fill="currentColor" /></svg>
            Watch the film
          </Link>
          <Link href={INCIDENT_PATH} className="film-hero-link">Read the reconstruction <span aria-hidden="true">→</span></Link>
        </div>
        <p className="film-hero-fine">Not an official account from OpenAI, METR or Hugging Face. The voices are synthetic; the music is original. The last lines of the film are our view, and are marked as ours.</p>
      </div>
    </section>
  );
}
