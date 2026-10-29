import Link from 'next/link';
import { currentTitle, isPerson, nameOf } from '@/content/base';
import { VERIFICATION, passageOf, quoteOf } from '@/content/filings';
import type { Filing } from '@/content/filings/types';
import { longDate } from '@/lib/site';

/** Words from the filing itself, with the page it is on and whether a program found it there word for word. */
export function FilingWords({ f, id }: { f: Filing; id: string }) {
  const p = passageOf(f, id);
  const check = VERIFICATION.filings[f.slug]?.passages[id];
  return (
    <figure className="fi-q">
      <blockquote>“<span className="hl">{p.text}</span>”</blockquote>
      <figcaption>
        <a href={f.url}>{f.form}, page {check?.page ?? '?'}</a>
        {check?.ok ? ' · found word for word in the filing' : ' · not checked'}
      </figcaption>
    </figure>
  );
}

/** Words from a public page: the company's own, or an interview of its people (the source says who speaks). */
export function PublicWords({ f, id }: { f: Filing; id: string }) {
  const p = passageOf(f, id);
  const s = f.sources[p.source];
  const check = VERIFICATION.filings[f.slug]?.passages[id];
  return (
    <figure className="fi-q">
      <blockquote>“<span className="hl">{p.text}</span>”</blockquote>
      <figcaption>
        {s.who ?? f.company}, <a href={s.url}>{s.title}</a>, {longDate(s.date)}
        {check?.ok ? (s.who ? ' · found word for word in the transcript' : ' · found word for word on the page') : ' · not checked'}
      </figcaption>
    </figure>
  );
}

/** A quotation already in the Base, with who said it and where we found it. */
export function BaseWords({ id }: { id: string }) {
  const found = quoteOf(id);
  if (!found) return null;
  const { e, q } = found;
  const who = isPerson(q.speaker) ? nameOf(q.speaker) : undefined;
  const title = isPerson(q.speaker) ? currentTitle(q.speaker) : undefined;
  return (
    <figure className="fi-q">
      <blockquote>“<span className="hl">{q.text}</span>”</blockquote>
      <figcaption>
        {who ? <>{isPerson(q.speaker) ? <Link href={`/people/${q.speaker}`}>{who}</Link> : who}{title ? `, ${title}` : ''} · </> : null}
        {q.hand === 'reported' ? 'as quoted by ' : ''}<Link href={`/base/${e.slug}#${q.id}`}>{e.outlet}</Link>{who ? '' : <>, “{e.title}”</>}, {longDate(q.said ?? e.published)}
        {' · found word for word in that source'}
      </figcaption>
    </figure>
  );
}
