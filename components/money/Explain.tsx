import type { Filing, Explain as Block } from '@/content/filings/types';
import { FilingWords, PublicWords } from '@/components/filings/Words';

/**
 * Their words at left, what they mean at right. Each block pairs the passages (the filing's, and what was said in public)
 * with an explanation in our words, so a reader never has to take the explanation on trust: the words it explains are
 * beside it, and every figure in it is one of theirs (tests hold this).
 */
export function Explain({ f, blocks }: { f: Filing; blocks: Block[] }) {
  return (
    <div className="mo-ex-list">
      {blocks.map(b => (
        <section key={b.id} className="mo-ex" aria-labelledby={`ex-${b.id}`}>
          <h3 id={`ex-${b.id}`} className="fi-theme-title">{b.title}</h3>
          <div className="fi-pair">
            <div className="fi-side">
              <p className="fi-side-label">In their words</p>
              {b.filing.map(id => <FilingWords key={id} f={f} id={id} />)}
              {b.public?.map(id => <PublicWords key={id} f={f} id={id} />)}
            </div>
            <div className="fi-side mo-says">
              <p className="fi-side-label">What it means · in our words</p>
              {b.says.map((t, i) => <p key={i}>{t}</p>)}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
