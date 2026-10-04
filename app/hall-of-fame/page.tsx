import type { Metadata } from 'next';
import { CAP, ENTRIES, RULES, SECTIONS, UPDATED, entriesIn, reviewDate } from '@/content/hall';
import { PickItem, SignalLegend } from '@/components/Picks';
import { MEASURED_ON } from '@/lib/stats';
import { longDate } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Hall of Fame',
  description: `The ${ENTRIES.length} things you shouldn’t miss if you’re new to AI control, safety and alignment, or want to understand how AI actually works. Capped at ${CAP}, with the strongest counter-views included.`,
  alternates: { canonical: '/hall-of-fame' },
};

export default function HallOfFamePage() {
  return (
    <div className="read page">
      <section className="hero-text">
        <span className="eyebrow">Capped at {CAP} · updated {longDate(UPDATED)}</span>
        <h1 className="display">Hall of <em>Fame</em></h1>
        <p className="lede">
          What you shouldn’t miss if you’re new to AI control, safety and alignment, or if you want to understand how these systems actually work.
          It’s short on purpose.
        </p>
        <nav className="toc" aria-label="Sections">
          {SECTIONS.map(section => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
        </nav>
      </section>

      <section className="block" aria-labelledby="rules">
        <h2 className="sr-only" id="rules">The rules</h2>
        <div className="rules">
          {RULES.map(rule => (
            <div key={rule.title} className="rule">
              <h3>{rule.title}</h3>
              <p>{rule.text}</p>
            </div>
          ))}
        </div>
      </section>

      {SECTIONS.map(section => (
        <section key={section.id} id={section.id} className="hall-section" aria-labelledby={`${section.id}-title`}>
          <div className="sec-head">
            <h2 className="h2" id={`${section.id}-title`}>{section.title}</h2>
            <p>{section.blurb}</p>
          </div>
          {section.id === 'start-here' ? <SignalLegend mode="hall" measuredOn={MEASURED_ON} /> : null}
          {section.id === 'start-here' ? (
            <ol className="picks">
              {entriesIn(section.id).map((entry, i) => (
                <PickItem key={entry.id} pick={entry} list="hall" mode="hall" rank={i + 1} reviewOn={reviewDate(entry)} />
              ))}
            </ol>
          ) : (
            <ul className="picks">
              {entriesIn(section.id).map(entry => (
                <PickItem key={entry.id} pick={entry} list="hall" mode="hall" reviewOn={reviewDate(entry)} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
