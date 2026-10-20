import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Quotation } from '@/components/editions/EditionView';
import { currentTitle, isPerson, nameOf } from '@/content/base';
import { momentIds, momentQuote } from '@/content/base/moments';
import { clip } from '@/lib/og';
import { SITE, longDate, shortDate } from '@/lib/site';
import { DISCLOSURE } from '@/lib/social-day';

export const dynamicParams = false;
export function generateStaticParams() {
  return momentIds().map(id => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const found = momentQuote(id);
  if (!found) return {};
  const { e, q } = found;
  const title = `${nameOf(q.speaker)}: “${clip(q.text, 80)}”`;
  const description = clip(`${q.context ?? ''} Said ${shortDate(q.said ?? e.published)} on ${e.outlet}. Press play to see and hear it; every word was found in the source.`.trim(), 200);
  return {
    title,
    description,
    alternates: { canonical: `/moment/${id}` },
    // A page to open from a post, not one to find by searching: it holds one quotation and its line of context.
    robots: { index: false, follow: true },
    openGraph: { siteName: SITE.name, type: 'article', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

/** One checked quotation, played where it was said: the person on the source's own player, their words lighting up. */
export default async function MomentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = momentQuote(id);
  if (!found) notFound();
  const { e, q } = found;
  const title = isPerson(q.speaker) ? currentTitle(q.speaker) : undefined;
  const others = momentIds().flatMap(other => {
    const m = momentQuote(other);
    return m && other !== id && m.e.id === e.id ? [m] : [];
  });
  return (
    <section className="shell mo" aria-labelledby="mo-who">
      <p className="dateline"><b>Heard · {longDate(q.said ?? e.published)}</b><span>{e.outlet}</span></p>
      <h1 id="mo-who" className="mo-who">{nameOf(q.speaker)}</h1>
      {title ? <p className="mo-role">{title}</p> : null}
      <div className="mo-card"><Quotation q={q} e={e} /></div>
      {e.conflict ? <p className="ed-note">{DISCLOSURE}</p> : null}
      <p className="ed-note">The video’s captions give a time for each line, not each word, so a word can light a few tenths of a second early or late. The recording is the evidence; the highlight is a guide. Nothing loads from YouTube until you press play.</p>
      <p className="mo-links">
        <Link href={`/base/${e.slug}#${q.id}`}>The entry, with {e.quotes.length} checked {e.quotes.length === 1 ? 'quotation' : 'quotations'} <span aria-hidden="true">→</span></Link>
        <Link href={`/day/${e.run}`}>The edition of {shortDate(e.run)} <span aria-hidden="true">→</span></Link>
        {isPerson(q.speaker) ? <Link href={`/people/${q.speaker}`}>Everything {nameOf(q.speaker)} said in the record <span aria-hidden="true">→</span></Link> : null}
      </p>
      {others.length ? (
        <section className="mo-more" aria-label="More from this recording">
          <h2>More from this recording</h2>
          <ul>
            {others.map(({ q: o }) => (
              <li key={o.id}><Link href={`/moment/${o.id}`}>“{clip(o.text, 110)}”</Link><small>{nameOf(o.speaker)}</small></li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
