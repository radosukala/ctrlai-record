import { EVENTS, QUOTE_BY_ID, TIME_FMT, when, type Chapter as ChapterNo, type Ev } from '@/content/incidents/openai-hf';
import { Chip, Cites, QuoteView, RichText } from './parts';

function Entry({ e }: { e: Ev }) {
  const quotes = (e.quotes ?? []).map(id => QUOTE_BY_ID[id]).filter(Boolean);
  return (
    <article className={`event inc-event inc-event-${e.lane}`} id={e.id}>
      <time dateTime={e.t}>{when(e)}</time>
      <div>
        <h3>{e.title}</h3>
        <p><RichText text={e.text} /></p>
        {e.differ ? <p className="inc-differ"><b>The sources differ.</b> {e.differ}</p> : null}
        {quotes.length ? (
          <details className="inc-more">
            <summary>What was written ({quotes.length})</summary>
            {quotes.map(q => <QuoteView key={q.id} q={q} compact />)}
          </details>
        ) : null}
        <p className="inc-now-cites"><Cites cites={e.cites} /></p>
      </div>
    </article>
  );
}

/** The steps of one chapter. The main steps show; the detail and the fine print fold away. */
export function Chapter({ n, lane }: { n: ChapterNo; lane?: Ev['lane'] }) {
  const all = EVENTS.filter(e => e.chapter === n && (!lane || e.lane === lane)).sort((a, b) => a.t.localeCompare(b.t));
  const main = all.filter(e => e.tier === 1);
  const rest = all.filter(e => e.tier > 1);
  const [from, to] = rest.length ? [TIME_FMT.format(new Date(rest[0].t)), TIME_FMT.format(new Date(rest[rest.length - 1].t))] : ['', ''];
  const span = from === to ? from : `${from} – ${to}`;
  return (
    <div className="events inc-events">
      {main.map(e => <Entry key={e.id} e={e} />)}
      {rest.length ? (
        <details className="inc-fold">
          <summary>{rest.length} more step{rest.length > 1 ? 's' : ''}, {span} <Chip tone="muted">detail and fine print, in time order</Chip></summary>
          <div className="events">{rest.map(e => <Entry key={e.id} e={e} />)}</div>
        </details>
      ) : null}
    </div>
  );
}

/**
 * The people's side of the whole story, on one list. Steps already told in chapters 1 to 3 appear here as one line that links
 * back to them; steps that belong to this chapter are told in full.
 */
export function HumanTimeline() {
  const humans = EVENTS.filter(e => e.lane === 'humans' && e.tier === 1).sort((a, b) => a.t.localeCompare(b.t));
  return (
    <ol className="inc-human-list">
      {humans.map(e => e.chapter < 4 ? (
        <li key={e.id} className="inc-human-brief">
          <time dateTime={e.t}>{when(e)}</time>
          <div>
            <b>{e.title}</b> <a href={`#${e.id}`} className="inc-human-link">Read the step in chapter {e.chapter}</a>
          </div>
        </li>
      ) : (
        <li key={e.id}>
          <time dateTime={e.t}>{when(e)}</time>
          <div>
            <b>{e.title}</b>
            <p><RichText text={e.text} /></p>
            <p className="inc-now-cites"><Cites cites={e.cites} /></p>
          </div>
        </li>
      ))}
    </ol>
  );
}
