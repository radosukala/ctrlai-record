import type { Metadata } from 'next';
import { CAP, ENTRIES, RULES, SECTIONS, UPDATED, entriesIn, reviewDate } from '@/content/hall';
import { PickItem, SignalLegend } from '@/components/Picks';
import { Section } from '@/components/Section';
import { MEASURED_ON } from '@/lib/stats';
import { longDate } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Hall of Fame',
  description: `The ${ENTRIES.length} things you shouldn’t miss if you’re new to AI control, safety and alignment, or want to understand how AI actually works. Capped at ${CAP}, with the strongest counter-views included.`,
  alternates: { canonical: '/hall-of-fame' },
};

export default function HallOfFamePage() {
  return (
    <div className="page">
      <div className="shell">
        <header className="hero">
          <div className="hero-main">
            <p className="dateline">
              <b>Hall of Fame</b>
              <span>{ENTRIES.length} of {CAP}</span>
              <span>Updated {longDate(UPDATED)}</span>
            </p>
            <h1 className="headline">The {ENTRIES.length} things you shouldn’t miss if you’re new to AI control, safety and alignment, or want to know how these systems actually work.</h1>
            <p className="lede">It’s short on purpose. Six videos make one evening; the rest is there when you want more.</p>
          </div>
          <nav className="toc" aria-label="Sections">
            {SECTIONS.map((section, i) => (
              <a key={section.id} href={`#${section.id}`}>
                <span className="cap">{i + 1}</span>
                <span>{section.title}</span>
                <small>{entriesIn(section.id).length}</small>
              </a>
            ))}
          </nav>
        </header>
      </div>

      <div className="shell">
        <Section id="rules" title="The rules" blurb="Four, and they don’t bend. The tests in the source code refuse a change that breaks them.">
          <div className="rules">
            {RULES.map(rule => (
              <div key={rule.title} className="rule">
                <h3>{rule.title}</h3>
                <p>{rule.text}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {SECTIONS.map((section, i) => (
        <div className="shell" key={section.id}>
          <Section
            id={section.id}
            className="hall-section"
            title={<><span className="muted">{i + 1}. </span>{section.title}</>}
            blurb={section.blurb}
            rail={section.id === 'start-here' ? <SignalLegend mode="hall" measuredOn={MEASURED_ON} /> : null}
          >
            {section.id === 'start-here' ? (
              <ol className="picks">
                {entriesIn(section.id).map((entry, j) => (
                  <PickItem key={entry.id} pick={entry} list="hall" mode="hall" rank={j + 1} reviewOn={reviewDate(entry)} />
                ))}
              </ol>
            ) : (
              <ul className="picks">
                {entriesIn(section.id).map(entry => (
                  <PickItem key={entry.id} pick={entry} list="hall" mode="hall" reviewOn={reviewDate(entry)} />
                ))}
              </ul>
            )}
          </Section>
        </div>
      ))}
    </div>
  );
}
