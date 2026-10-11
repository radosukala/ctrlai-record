import { COMMITMENTS, COMPANIES, MEETINGS, STATUS_ORDER, type LayerId } from '@/content/accord';
import { STRINGS } from '@/content/accord/strings';
import type { Lang } from '@/content/lang';
import { StatusMark } from './StatusMark';

const LAYER_COMMITMENTS = COMMITMENTS.filter(c => c.id !== 'G');

/**
 * The whole tracker on one screen: four commitments by six companies, and the meeting commitment, which belongs to all
 * six together. On a wide screen it is a table; on a narrow one the same cells are stacked by company, because a six-column
 * table does not fit a phone. Every cell links to its evidence.
 */
export function Matrix({ lang = 'en' }: { lang?: Lang }) {
  const T = STRINGS[lang];
  const shortOf = (c: (typeof COMMITMENTS)[number]) => (lang === 'cs' ? c.shortCs : c.short);
  const meet = COMMITMENTS.find(c => c.id === 'G')!;
  return (
    <>
      <div className="acc-matrix-wrap">
        <table className="acc-matrix">
          <caption className="sr-only">{T.glance.caption}</caption>
          <thead>
            <tr>
              <td />
              {COMPANIES.map(c => (
                <th scope="col" key={c.id}><a href={`#${c.id}`}>{c.name}</a></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LAYER_COMMITMENTS.map(l => (
              <tr key={l.id}>
                <th scope="row">
                  <span className="acc-rowhead">
                    <span className="cap">{l.number}</span>
                    <span>{shortOf(l)}</span>
                  </span>
                </th>
                {COMPANIES.map(c => {
                  const cell = c.cells[l.id as LayerId];
                  return (
                    <td key={c.id}>
                      <a href={`#${c.id}-${l.id}`} aria-label={`${c.name}, ${shortOf(l)}: ${T.status[cell.status]}${cell.before.length ? `. ${T.earlier}` : ''}. ${T.openEvidence}`}>
                        <StatusMark status={cell.status} lang={lang} />
                        {cell.before.length ? <small>{T.earlier}</small> : null}
                      </a>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="acc-matrix-group">
              <th scope="row">
                <span className="acc-rowhead">
                  <span className="cap">{T.meet}</span>
                  <span>{shortOf(meet)}</span>
                </span>
              </th>
              <td colSpan={COMPANIES.length}>
                <a href="#meetings" aria-label={`${shortOf(meet)}, ${T.companies.allSix}: ${T.status[MEETINGS.status]}. ${T.openEvidence}`}>
                  <StatusMark status={MEETINGS.status} lang={lang} />
                  <small>{T.glance.one}</small>
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="acc-stack">
        {COMPANIES.map(c => (
          <div className="acc-stack-co" key={c.id}>
            <h3><a href={`#${c.id}`}>{c.name}</a></h3>
            <ul>
              {LAYER_COMMITMENTS.map(l => {
                const cell = c.cells[l.id as LayerId];
                return (
                  <li key={l.id}>
                    <a href={`#${c.id}-${l.id}`}>
                      <span className="cap">{l.number}</span>
                      <span className="acc-stack-name">{shortOf(l)}</span>
                      <StatusMark status={cell.status} lang={lang} />
                      {cell.before.length ? <small>{T.earlier}</small> : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <div className="acc-stack-co">
          <h3><a href="#meetings">{shortOf(meet)}</a></h3>
          <ul>
            <li>
              <a href="#meetings">
                <span className="cap">{T.meet}</span>
                <span className="acc-stack-name">{T.companies.allSix}</span>
                <StatusMark status={MEETINGS.status} lang={lang} />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}

export function Legend({ lang = 'en' }: { lang?: Lang }) {
  const T = STRINGS[lang];
  return (
    <dl className="acc-legend">
      {STATUS_ORDER.map(s => (
        <div key={s}>
          <dt><StatusMark status={s} lang={lang} /></dt>
          <dd>{T.meaning[s]}</dd>
        </div>
      ))}
      <div>
        <dt><span className="acc-earlier">{T.earlier}</span></dt>
        <dd>{T.earlierMeaning}</dd>
      </div>
    </dl>
  );
}
