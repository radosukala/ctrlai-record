import type { Metadata } from 'next';
import Link from 'next/link';
import '@/components/base/base.css';
import { BaseBrowser, type Row } from '@/components/base/BaseBrowser';
import { LATEST_DAY, WEEK, WEEK_FROM, nameOf } from '@/content/base';
import { dateRange } from '@/lib/site';

export const metadata: Metadata = {
  title: 'The Base: every entry this week',
  description: 'Every entry in the Base from the last seven days: what was said about AI safety and control, by whom, and why it matters, with every quotation checked against its source. Filter by question, or read as a lawmaker, a researcher or anyone.',
  alternates: { canonical: '/base' },
};

const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/**
 * The Base as a record you can search: every entry of the last seven days, filtered by question, read through a lens.
 * The front page reads the same entries as editions; entries keep their permalinks at /base/<slug>.
 */
export default function BaseIndex() {
  const rows: Row[] = WEEK.map(e => ({
    slug: e.slug, kind: e.kind, title: e.title, outlet: e.outlet, published: e.published, summary: e.summary,
    lenses: e.lenses, topics: e.topics, people: e.people.filter(p => p.role !== 'mentioned').map(p => ({ id: p.id, name: nameOf(p.id) })),
    quotes: e.quotes.length, importance: e.importance, access: e.access,
    ...(e.quotes[0] ? { firstQuote: { text: e.quotes[0].text, by: `${nameOf(e.quotes[0].speaker)}, ${e.outlet}, ${day(e.published)}` } } : {}),
  }));
  return (
    <div className="shell f-page">
      <section className="f-mast" aria-labelledby="base-title">
        <p className="dateline"><b>The Base</b>{WEEK_FROM ? <span>{dateRange(WEEK_FROM, LATEST_DAY)}</span> : null}<span>{WEEK.length.toLocaleString('en-US')} entries</span></p>
        <h1 id="base-title" className="f-week">Every entry this week</h1>
        <div className="f-mast-foot">
          <p className="f-week-from"><Link href="/">What changed today, this week and this month <span aria-hidden="true">→</span></Link></p>
          <p className="f-key" aria-label="How to read this page">
            <span className="f-key-title">How to read this page</span>
            <span><b className="f-l-serif">Serif</b> their words, as the source published them</span>
            <span><b className="f-l-serif"><span className="hl">Marked</span></b> found word for word in the source</span>
            <span><b className="f-l-sans">Sans</b> our words</span>
          </p>
        </div>
      </section>
      <section className="f-sec" id="record" aria-labelledby="record-title">
        <header className="f-head">
          <h2 id="record-title">The record</h2>
          <div className="f-head-note">The same record for everyone, ordered by what each reader needs first. Older entries keep their pages, and every person’s page keeps what they said. <Link href="/people">Everyone on the record <span aria-hidden="true">→</span></Link></div>
        </header>
        <BaseBrowser rows={rows} />
      </section>
    </div>
  );
}
