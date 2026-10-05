import Link from 'next/link';
import { START_HERE, ENTRIES } from '@/content/hall';
import { mediaFor } from '@/lib/media';
import { MediaThumb } from './Media';

function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : '', rest ? `${rest} minutes` : ''].filter(Boolean).join(' ');
}

/** "1 hour 48 minutes": how long the six videos take together. */
export function startHereDuration(): string {
  return duration(START_HERE.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0));
}

/** The six videos for one evening, playable where they stand. */
export function StartHere({ withLink = true }: { withLink?: boolean }) {
  return (
    <>
      <ol className="path">
        {START_HERE.map((entry, i) => (
          <li key={entry.id} className="path-card">
            <div className="path-thumb">
              <MediaThumb
                media={mediaFor(entry.url)}
                url={entry.url}
                title={entry.title}
                label={entry.outlet ?? entry.creator}
                minutes={entry.minutes}
                list="start-here"
                pickId={entry.id}
                sizes="(max-width: 520px) 100vw, (max-width: 860px) 50vw, 300px"
              />
              <span className="cap step" aria-hidden="true">{i + 1}</span>
            </div>
            <a href={entry.url} target="_blank" rel="noopener" data-list="start-here" data-pick={entry.id}>{entry.title}</a>
            <small>{entry.outlet && entry.outlet !== entry.creator ? `${entry.creator} · ${entry.outlet}` : entry.creator}</small>
          </li>
        ))}
      </ol>
      <div className="path-foot">
        <span>About {startHereDuration()} in all.</span>
        {withLink ? <Link href="/hall-of-fame">See all {ENTRIES.length} in the Hall of Fame →</Link> : null}
      </div>
    </>
  );
}
