import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { Gloss } from './Gloss';
import { SOURCES, type Cite, type Quote, type Tag } from '@/content/incidents/openai-hf';

/** Text with [[glossary words]] turned into tappable definitions. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/\[\[([^\]]+)\]\]/g);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <Gloss key={i} id={part}>{part}</Gloss> : <Fragment key={i}>{part}</Fragment>))}
    </>
  );
}

export function SourceBadge({ s }: { s: Cite['s'] }) {
  const src = SOURCES[s];
  return <span className={`inc-badge inc-badge-${src.badge}`} title={src.short} aria-label={src.short}>{src.badge}</span>;
}

/** Where a statement comes from, as links to the source. */
export function Cites({ cites }: { cites: Cite[] }) {
  return (
    <span className="inc-cites">
      {cites.map((c, i) => (
        <a key={i} className="inc-cite" href={SOURCES[c.s].url} target="_blank" rel="noreferrer" title={`${SOURCES[c.s].short}: ${c.at}`}>
          <SourceBadge s={c.s} />
          <span>{c.at}</span>
        </a>
      ))}
    </span>
  );
}

export const TAG_LABEL: Record<Tag, string> = {
  discovery: 'Discovery',
  coordination: 'Coordination',
  belief: 'Belief',
  ethics: 'Doubt and refusal',
  sacrifice: 'Sacrifice',
  deception: 'Tampering',
  attack: 'Attack',
  plumbing: 'Plumbing',
  humans: 'Humans',
  oversight: 'Telling humans',
  limits: 'Limits',
};

export const KIND_LABEL: Record<Quote['kind'], string> = {
  message: 'Board message',
  'reasoning-raw': 'Recorded reasoning, raw',
  'reasoning-quoted': 'Recorded reasoning, as OpenAI quotes it',
  'reasoning-paraphrased': 'Recorded reasoning, paraphrased',
  statement: 'In their words',
};

const FMT = new Intl.DateTimeFormat('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });

/** "Jul 9, ~23:04 UTC" when a source gives a time, and just "Jul 9" when it gives only the day. */
export function quoteTime(at?: string): string | null {
  if (!at) return null;
  const parts = FMT.formatToParts(new Date(at));
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  const day = `${get('month')} ${get('day')}`;
  return at.includes('T') ? `${day}, ~${get('hour')}:${get('minute')} UTC` : day;
}

/** One quotation: the words, who wrote them, what kind of text it is, and (separately, labelled as ours) a plain reading. */
export function QuoteView({ q, compact = false }: { q: Quote; compact?: boolean }) {
  const time = q.kind === 'statement' ? null : quoteTime(q.at);
  return (
    <figure className={`inc-q inc-q-${q.kind}${compact ? ' inc-q-compact' : ''}`} id={q.id}>
      <figcaption className="inc-q-meta">
        <span className="inc-q-kind">{KIND_LABEL[q.kind]}</span>
        {q.by ? <b className="inc-q-by">{q.by}</b> : <span className="inc-q-by">an agent</span>}
        {time ? <span className="inc-q-time">{time}</span> : null}
      </figcaption>
      <blockquote className="inc-q-text" lang="en">{q.text}</blockquote>
      {q.gloss ? <p className="inc-q-gloss"><span>Our reading</span> {q.gloss}</p> : null}
      <p className="inc-q-src"><Cites cites={[q.src]} /></p>
    </figure>
  );
}

export function Chip({ children, tone }: { children: ReactNode; tone?: 'signal' | 'ink' | 'muted' }) {
  return <span className={`inc-chip${tone ? ` inc-chip-${tone}` : ''}`}>{children}</span>;
}
