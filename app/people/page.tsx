import type { Metadata } from 'next';
import Link from 'next/link';
import '@/components/base/base.css';
import { Section } from '@/components/Section';
import { ENTRIES, currentTitle, onRecord } from '@/content/base';
import { TOPIC } from '@/content/base/taxonomy';
import { GROUP_LABEL, groupAt, partyAt, partyName } from '@/content/registry';
import { longDate } from '@/lib/site';

export const metadata: Metadata = {
  title: 'On the record',
  description: 'Everyone who spoke or wrote about AI safety and control in the sources we monitor, with what they said, checked.',
};

export default function PeoplePage() {
  const all = onRecord();
  const days = ENTRIES.map(e => e.published).sort();
  const [first, last] = [days[0], days[days.length - 1]];
  return (
    <div className="shell page b-page">
      <header className="b-hero">
        <p className="dateline"><Link href="/base"><b>The Base</b></Link><span>People</span></p>
        <h1 className="headline">On the record</h1>
        <p className="lede">Everyone who spoke or wrote in the sources the Radar reads, by how often they did. Each person’s page keeps what they said, when, with the quotation checked against the source, so you can see their views over time.</p>
        <p className="small muted">Sources dated {longDate(first)} to {longDate(last)} so far. The order is presence in the sources we monitor, nothing more: it is not a score, and it says nothing about who is right.</p>
      </header>
      <Section id="all" title={<>Everyone, <em>so far</em></>} blurb={`${all.length} people spoke or wrote. People only mentioned are not counted.`}>
        <table className="b-people">
          <thead><tr><th className="b-rank">#</th><th>Person</th><th className="hide-sm">Group</th><th className="hide-sm">Questions</th><th className="n">Entries</th><th className="n">Quotes</th></tr></thead>
          <tbody>
            {all.map((r, i) => (
              <tr key={r.person.id}>
                <td className="b-rank">{i + 1}</td>
                <td><Link href={`/people/${r.person.id}`}>{r.person.name}</Link>{currentTitle(r.person.id) ? <small>{currentTitle(r.person.id)}</small> : null}</td>
                <td className="hide-sm"><small>{GROUP_LABEL[groupAt(r.person.id, last)]}{partyAt(r.person.id, last) ? `, ${partyName(partyAt(r.person.id, last)!)}` : ''}</small></td>
                <td className="hide-sm"><small>{r.topics.slice(0, 3).map(id => TOPIC[id].label).join(' · ')}</small></td>
                <td className="n">{r.spoke}</td>
                <td className="n">{r.quotes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
