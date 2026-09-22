import type { Metadata } from 'next';
import { Download } from 'lucide-react';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Open data', description: 'Download the whole Ctrl AI public record: every run, check, test and library entry, under CC BY 4.0.' };

const FILES = [
  { file: 'runs.json', what: 'Every public run: test and version, AI product, model shown, memory setting, replies, receipt link and status, submitter and agreed outcomes, dates.' },
  { file: 'runs.csv', what: 'The same runs as a spreadsheet (replies omitted, excerpt included).' },
  { file: 'checks.json', what: 'Individual checks on settled runs: receipt check, rating, flag, checker number. Checks on open runs are withheld until they settle, so later checkers rate blind.' },
  { file: 'tests.json', what: 'Every test with its exact messages, outcomes, limits, sources and version history.' },
  { file: 'works.json', what: 'The library: every listed work with its summary, questions, kind and caveats.' },
  { file: 'questions.json', what: 'The ten questions and their explanations.' },
  { file: 'products.json', what: 'The AI products and the share-link patterns accepted as receipts.' },
  { file: 'log.json', what: 'The latest 200 entries of the public log.' },
];

export default function DataPage() {
  return (
    <>
      <section className="test-hero">
        <div className="shell">
          <span className="eyebrow"><span className="dot" /> Open data</span>
          <h1 className="title">Take the whole record. <em>Check our math.</em></h1>
          <p className="lede">
            Everything public on this site can be downloaded, at any time, without an account. Researchers, journalists and anyone curious can
            analyze it, and if this site ever disappeared, anyone could carry the record on.
          </p>
        </div>
      </section>
      <section className="section-tight">
        <div className="shell split-wide">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>File</th><th>What’s in it</th></tr></thead>
              <tbody>
                {FILES.map(item => (
                  <tr key={item.file}>
                    <td className="num-cell"><a href={`/api/export/${item.file}`} className="inline-icon"><Download size={14} aria-hidden="true" /> {item.file}</a></td>
                    <td>{item.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="stack sticky" style={{ ['--stack' as string]: '16px' }}>
            <div className="card">
              <h2 className="h4">License</h2>
              <p className="small muted mt-8">Data: <a href={SITE.dataLicenseUrl}>{SITE.dataLicense}</a>. Use it for anything, including commercially, with credit.</p>
            </div>
            <div className="card">
              <h2 className="h4">How to cite</h2>
              <p className="small mono mt-8">Ctrl AI public record (YYYY-MM-DD). {SITE.url}</p>
              <p className="tiny muted mt-8">Use the date you downloaded it. Each file includes a ready-made citation.</p>
            </div>
            <div className="card">
              <h2 className="h4">Read it carefully</h2>
              <p className="small muted mt-8">Runs are self-selected. Use the status field: only <span className="mono">verified</span> runs have a confirmed receipt and an agreed outcome. Unchecked runs carry only the submitter’s rating.</p>
            </div>
            <div className="card">
              <h2 className="h4">One run as JSON</h2>
              <p className="small muted mt-8">Any run: <span className="mono">/api/runs/&lt;id&gt;</span>. CORS is open, so you can embed live results.</p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
