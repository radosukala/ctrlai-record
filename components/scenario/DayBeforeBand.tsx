import Link from 'next/link';
import '../film-hero.css';
import { DAY_BEFORE_MINUTES, DAY_BEFORE_PATH, DAY_BEFORE_WHY } from '@/content/scenarios/day-before/publish';

/**
 * "The day before" on the homepage: a dark band under the first film's, the lit model city behind, one way in. Like that band it says only what
 * the film says, and it says what is not real as plainly as what is.
 */
export function DayBeforeBand() {
  return (
    <section className="film-hero day-before-band" aria-labelledby="day-before-title">
      <div className="shell film-hero-in">
        <p className="film-hero-eyebrow">A rehearsal · about {DAY_BEFORE_MINUTES} minutes · five decisions · a narrator and music</p>
        <h2 id="day-before-title" className="film-hero-title">The day before.</h2>
        <p className="film-hero-sub">
          A rehearsal for the day after a large AI-enabled cyberattack, on a model city that is not real. You decide. Between decisions, people on
          the record argue the other side, and every quotation is checked against its source.
        </p>
        <div className="film-hero-actions">
          <Link href={DAY_BEFORE_PATH} className="film-hero-play">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7.5 4.8v14.4L19.2 12z" fill="currentColor" /></svg>
            Play the rehearsal
          </Link>
          <Link href={DAY_BEFORE_WHY} className="film-hero-link">Why: Axios on the companies’ own rehearsals <span aria-hidden="true">→</span></Link>
        </div>
        <p className="film-hero-fine">
          The city, the night and the events are imagined; the quotations are real. The voice is synthetic and the music is composed in code.
          Written with Claude, made by Anthropic, which the film names; the same rules apply to every company.
        </p>
      </div>
    </section>
  );
}
