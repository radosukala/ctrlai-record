import { KIND_LABEL, STANCE_LABEL, type Pick } from '@/content/types';
import { longDate, shortDate } from '@/lib/site';
import { signals } from '@/lib/stats';
import { mediaFor } from '@/lib/media';
import { MediaThumb } from './Media';

type Props = {
  pick: Pick;
  /** Where the pick sits, for analytics: 'week-2026-10-04' or 'hall'. */
  list: string;
  mode: 'week' | 'hall';
  /** The pick's place in a ranked list. Omitted in the Hall of Fame sections, which aren't ranked. */
  rank?: number;
  /** For Hall of Fame nominees: the day their 90 days are up. */
  reviewOn?: string | null;
};

export function PickItem({ pick, list, mode, rank, reviewOn }: Props) {
  const found = signals(pick, mode);
  const meta = [
    pick.outlet && pick.outlet !== pick.creator ? `${pick.creator} · ${pick.outlet}` : pick.creator,
    pick.minutes ? `${KIND_LABEL[pick.kind]} · ${pick.minutes} min` : KIND_LABEL[pick.kind],
    longDate(pick.published),
  ];
  return (
    <li className={rank ? 'pick' : 'pick no-num'} id={pick.id}>
      {rank ? <span className="pick-num" aria-hidden="true">{rank}</span> : null}
      <div className="pick-media">
        <MediaThumb
          media={mediaFor(pick.url)}
          url={pick.url}
          title={pick.title}
          label={pick.outlet ?? pick.creator}
          minutes={pick.minutes}
          list={list}
          pickId={pick.id}
          sizes="(max-width: 760px) 100vw, 272px"
        />
      </div>
      <div className="pick-main">
        <h3 className="pick-title">
          <a href={pick.url} target="_blank" rel="noopener" data-list={list} data-pick={pick.id}>{pick.title}</a>
        </h3>
        <div className="pick-meta">
          <span>{meta.join(' · ')}</span>
          <span className={`stance ${pick.stance}`}>{STANCE_LABEL[pick.stance]}</span>
          {reviewOn ? <span className="nominee" title={`Stays if people are still watching or citing it on ${longDate(reviewOn)}`}>Nominee until {shortDate(reviewOn)}</span> : null}
        </div>
        <p className="pick-why">{pick.why}</p>
        {found.length ? (
          <div className="signals" aria-label="Public numbers">
            {found.map(signal => (
              <span key={signal.key} title={signal.hint} className={signal.key === 'pace' ? 'lead' : undefined}>
                {signal.value}<i>{signal.label}</i>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function SignalLegend({ mode, measuredOn }: { mode: 'week' | 'hall'; measuredOn: string }) {
  return (
    <p className="sec-note">
      Press a picture to play the video here. Numbers from {longDate(measuredOn)}:{' '}
      {mode === 'week' ? <><b>a day</b> is views per day since it came out</> : <><b>a year</b> is views per year online</>},{' '}
      <b>liked</b> likes per view, <b>kept</b> bookmarks per view, <b>argued</b> comments per like.
    </p>
  );
}
