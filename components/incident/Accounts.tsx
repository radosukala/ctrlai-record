import { ACCOUNTS, SOURCES } from '@/content/incidents/openai-hf';
import { Cites, RichText } from './parts';

const COLS = [
  { key: 'O' as const, label: 'OpenAI', badges: [SOURCES['oai-blog'].badge, SOURCES['oai-tr'].badge] },
  { key: 'M' as const, label: 'METR and Redwood', badges: [SOURCES.metr.badge] },
  { key: 'H' as const, label: 'Hugging Face', badges: [SOURCES.hf.badge] },
];

/** The same moments as three different accounts see them. A blank means that account does not cover it. */
function Row({ r }: { r: (typeof ACCOUNTS)[number] }) {
  return (
        <article className="inc-acct">
          <h4>{r.topic}</h4>
          <div className="inc-acct-cols">
            {COLS.map(c => (
              <div key={c.key} className={r[c.key] ? 'inc-acct-cell' : 'inc-acct-cell is-blank'}>
                <p className="inc-acct-who">{c.badges.map(b => <span key={b} className={`inc-badge inc-badge-${b}`}>{b}</span>)} {c.label}</p>
                <p>{r[c.key] ? <RichText text={r[c.key]!} /> : 'Does not cover this.'}</p>
              </div>
            ))}
          </div>
          {r.note ? <p className="inc-acct-note"><b>Reading it.</b> {r.note}</p> : null}
          <p className="inc-now-cites"><Cites cites={r.cites} /></p>
        </article>
  );
}

export function Accounts() {
  const first = ACCOUNTS.slice(0, 6);
  const rest = ACCOUNTS.slice(6);
  return (
    <div className="inc-accounts">
      {first.map(r => <Row key={r.topic} r={r} />)}
      {rest.length ? (
        <details className="inc-fold">
          <summary>{rest.length} more comparisons</summary>
          {rest.map(r => <Row key={r.topic} r={r} />)}
        </details>
      ) : null}
    </div>
  );
}
