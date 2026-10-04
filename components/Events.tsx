import type { Event } from '@/content/types';
import { shortDate } from '@/lib/site';

function Sources({ event }: { event: Event }) {
  return (
    <span className="sources">
      {event.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener">{source.label}</a>)}
    </span>
  );
}

export function Events({ main, also }: { main: Event[]; also: Event[] }) {
  return (
    <div className="events">
      {main.map(event => (
        <article key={event.headline} className="event">
          <time dateTime={event.date}>{shortDate(event.date)}</time>
          <div>
            <h3>{event.headline}</h3>
            <p>{event.text}</p>
            <Sources event={event} />
          </div>
        </article>
      ))}
      {also.length ? (
        <>
          <div className="also-head">Also this week</div>
          <ul className="also">
            {also.map(event => (
              <li key={event.headline}>
                <time dateTime={event.date}>{shortDate(event.date)}</time>
                <div>
                  <p><b>{event.headline}.</b> {event.text}</p>
                  <Sources event={event} />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
