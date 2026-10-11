import type { Metadata } from 'next';
import Link from 'next/link';
import '@/components/say/say.css';
import { Section } from '@/components/Section';
import { ACCORD, CHECKED_ON, COMPANIES } from '@/content/accord';
import { SAY } from '@/content/say';
import { longDate } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Read: what the AI companies committed to and published',
  description: 'The White House accord and each signatory’s own safety and governance documents, linked to their sources, with nothing summarized away.',
  alternates: { canonical: '/say/read' },
};

export default function ReadPage() {
  return (
    <div className="page say-page">
      <div className="shell">
        <header className="say-hero">
          <p className="dateline"><Link href={SAY.hub}>{SAY.name}</Link><b>Read</b><span>Checked {longDate(CHECKED_ON)}</span></p>
          <h1 className="headline">What the companies committed to and published, <em>in their own words.</em></h1>
          <p className="lede">
            Nobody can have a say about rules they have not read. This page lists the documents, with links to where each one lives. We do not summarize
            them away or rank them. Where a document is a promise about process rather than a rule, we say that. The frameworks and policies listed here are the companies’ own and voluntary; a company can change them.
          </p>
        </header>
      </div>

      <div className="shell">
        <Section id="accord" title="The accord" blurb="The one document all six signed.">
          <div className="say-docs">
            <div className="say-doc-co">
              <h3>{ACCORD.title}</h3>
              <div className="say-doc">
                <a href="/accord#promises">{ACCORD.subtitle}</a>
                <time dateTime={ACCORD.published}>{longDate(ACCORD.published)}</time>
                <p>
                  One page of text and one of signatures, signed by Google, Anthropic, Meta, OpenAI, xAI, Nvidia and President Trump. Read it with our
                  plain-words reading beside it, or open the <a href={ACCORD.original.url}>original PDF</a>. Whether each company has kept it is on the{' '}
                  <Link href="/accord">tracker</Link>.
                </p>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <div className="shell">
        <Section id="rulebooks" title="Each company’s own documents" blurb="Frameworks, policies, model specifications and board charters the companies themselves publish, in alphabetical order.">
          <div className="say-docs">
            {COMPANIES.map(c => (
              <div className="say-doc-co" key={c.id} id={c.id}>
                <h3>{c.name}</h3>
                {c.documents.map(d => (
                  <div className="say-doc" key={d.url}>
                    <a href={d.url}>{d.title}</a>
                    <time>{d.published ? longDate(d.published) : 'no date stated'}</time>
                    <p>{d.whatItIs}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
