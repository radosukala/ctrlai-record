import Link from 'next/link';
import { START_HERE, ENTRIES } from '@/content/hall';
import { KIND_LABEL } from '@/content/types';

function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : '', rest ? `${rest} minutes` : ''].filter(Boolean).join(' ');
}

export function StartHere({ withLink = true }: { withLink?: boolean }) {
  const minutes = START_HERE.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0);
  return (
    <>
      <ol className="path">
        {START_HERE.map(entry => (
          <li key={entry.id}>
            <div>
              <a href={entry.url} target="_blank" rel="noopener" data-list="start-here" data-pick={entry.id}>{entry.title}</a>
              <small>{entry.outlet && entry.outlet !== entry.creator ? `${entry.creator} · ${entry.outlet}` : entry.creator}</small>
            </div>
            <span className="mins">{entry.minutes ? `${entry.minutes} min` : KIND_LABEL[entry.kind]}</span>
          </li>
        ))}
      </ol>
      <div className="path-foot">
        <span>About {duration(minutes)} in all.</span>
        {withLink ? <Link href="/hall-of-fame">See all {ENTRIES.length} in the Hall of Fame →</Link> : null}
      </div>
    </>
  );
}
