import Link from 'next/link';
import '@/components/base/base.css';
import './film.css';
import { Section } from '@/components/Section';
import { ENTRIES } from '@/content/base';
import { QUOTE_BY_ID, SOURCES } from '@/content/incidents/openai-hf';
import { INCIDENT_PATH } from '@/content/incidents/openai-hf/publish';
import { CARDS, quoteHtml, type QuoteCard } from '@/content/scenarios/day-before/cards';
import { FILM } from '@/content/scenarios/day-before/film';
import verification from '@/content/scenarios/day-before/verification.json';

const BASE = new Map(ENTRIES.map(e => [e.slug, e]));
const DECISION_OF_SCENE: Record<string, number> = { brake: 1, say: 2, powers: 3, pause: 4, rules: 5 };
const TITLE_OF_SCENE: Record<string, string> = { open: 'The cold open' };

/** Where to read a card's words: the link the card carries, or the one its Base entry or the first film's source carries. */
function where(c: QuoteCard): { href: string; base?: string; incident?: boolean } {
  if ('base' in c.check) return { href: BASE.get(c.check.base)?.url ?? `/base/${c.check.base}`, base: c.check.base };
  if ('incident' in c.check) return { href: SOURCES[QUOTE_BY_ID[c.check.incident].src.s].url, incident: true };
  return { href: c.url ?? '' };
}

/** The scenes' cards in the order the film shows them, each card once, under the scene where it first appears. */
function groups() {
  const seen = new Set<string>();
  return FILM.scenes.map(s => {
    const cards: QuoteCard[] = [];
    for (const cue of FILM.cues) {
      if (cue.k !== 'card' || cue.a < s.t0 || cue.a >= s.t1 || seen.has(cue.id)) continue;
      const c = CARDS[cue.id];
      if (c && !c.placeholder) { seen.add(cue.id); cards.push(c); }
    }
    const n = DECISION_OF_SCENE[s.id];
    return { id: s.id, title: n ? `Decision ${n} of 5 · ${s.title}` : TITLE_OF_SCENE[s.id] ?? s.title, cards };
  }).filter(g => g.cards.length);
}

/**
 * Every quotation in the film, with where it comes from and what it cannot show. The film promises that each card is a real quotation found
 * word for word in its source; this is the page where a reader can go and check that.
 */
export function Evidence() {
  const total = groups().reduce((n, g) => n + g.cards.length, 0);
  return (
    <Section id="quotations" className="dbf-ev" title={<>Every <em>quotation</em></>}
      blurb={`${total} quotations, each found word for word in the text we saved from its source (checked ${verification.checkedOn}). That shows the words are there. It does not make them true, or prove the speaker meant them as quoted.`}>
      <div className="dbf-ev-groups">
        {groups().map(g => (
          <div key={g.id} className="dbf-ev-group">
            <h3 className="dbf-ev-h">{g.title}</h3>
            <div className="b-quotes">
              {g.cards.map(c => {
                const w = where(c);
                return (
                  <figure key={c.id} className="b-quote" id={c.id}>
                    <blockquote dangerouslySetInnerHTML={{ __html: `“${quoteHtml(c).replace(/dbf-hl/g, 'hl')}”` }} />
                    <figcaption>
                      <span><b>{c.chip}</b> <span className="muted">{c.kind}</span></span>
                      <span>{w.href ? <a href={w.href}>{c.src} ↗</a> : c.src}</span>
                    </figcaption>
                    {c.note ? <p className="dbf-ev-note">{c.note}</p> : null}
                    <div className="b-check">
                      <span className="b-checked">Found word for word in the source</span>
                      {w.base ? <Link className="b-at" href={`/base/${w.base}`}>Also in the Base</Link> : null}
                      {w.incident ? <Link className="b-at" href={INCIDENT_PATH}>From the first film’s record</Link> : null}
                    </div>
                  </figure>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
