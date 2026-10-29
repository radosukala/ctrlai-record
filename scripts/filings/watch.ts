/**
 * Watches the SEC's EDGAR for new filings by the companies in the money section, and says when one appears.
 *
 *   npx tsx scripts/filings/watch.ts [--out FILE.md]
 *
 * Why: the S-1's table of what Anthropic must pay each year for computing is blank in every version filed so far, and a
 * model of what a miss in revenue would mean needs it. The amended S-1 (S-1/A) that fills it in is the day the money
 * section can say more, so the daily run looks, and tells a person. It reads one small JSON file from the SEC per company
 * (and, for a new S-1 or S-1/A, that filing once, to see whether the table is filled in). It posts and publishes nothing.
 *
 * What it has seen is kept in the private archive (filings/watch.json), so it survives a fresh clone. The first run for a
 * company records what is already filed and says nothing. Prints `NEW FILING: …` lines, which the run copies into its report.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Whose filings to watch. Add a company here when its filings are read for the money section. */
export const WATCHED = [{ name: 'Anthropic, PBC', cik: '0002130357' }];

/** The SEC asks for one request a second at most and an honest user agent. */
const UA = 'CtrlAI research (+https://ctrlai.com/about)';

/** Forms worth a person's attention: a prospectus or its amendment, the final prospectus, and the periodic reports. */
const NOTABLE = /^(S-1(\/A)?|424B\d|10-Q|10-K|8-K)$/;

export type Recent = { form: string[]; filingDate: string[]; accessionNumber: string[]; primaryDocument: string[] };
export type Filed = { form: string; date: string; accession: string; doc: string };

/** Filings in the SEC's list that are not in `seen`, oldest first. */
export function newFilings(seen: string[], recent: Recent): Filed[] {
  const known = new Set(seen);
  return recent.accessionNumber
    .map((accession, i) => ({ form: recent.form[i], date: recent.filingDate[i], accession, doc: recent.primaryDocument[i] }))
    .filter(f => !known.has(f.accession))
    .reverse();
}

/** The address of a filing's main document at the SEC. */
export const docUrl = (cik: string, f: Filed) => `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${f.accession.replace(/-/g, '')}/${f.doc}`;

const textOf = (html: string) => html.replace(/<[^>]+>/g, '|').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').replace(/(\| ?)+/g, '| ');

export type Schedule = 'filled' | 'blank' | 'not found';

/**
 * Whether the table of contractual obligations by year has figures: its cells sit between the header's last column,
 * "Thereafter", and the line of underscores above its footnotes. Footnote marks like (1) are one digit; a figure has three.
 */
export function scheduleFilled(html: string): Schedule {
  const text = textOf(html);
  const at = text.indexOf('Payments Due by Year');
  if (at < 0) return 'not found';
  const from = text.indexOf('Thereafter', at);
  const to = text.indexOf('_____', from);
  if (from < 0 || to < 0) return 'not found';
  return /\d{1,3}(,\d{3})+|\d{3,}/.test(text.slice(from + 'Thereafter'.length, to)) ? 'filled' : 'blank';
}

/** Whether the sentence on how much of the committed spend falls before 2031 has its figure ("approximately $ expected…"). */
export function narrativeFilled(html: string): Schedule {
  const text = textOf(html).replace(/\|/g, '');
  const at = text.indexOf('These commitments include approximately');
  if (at < 0) return 'not found';
  return /^These commitments include approximately \$\s*[\d.,]+/.test(text.slice(at, at + 90).replace(/\s+/g, ' ')) ? 'filled' : 'blank';
}

type State = Record<string, { seen: string[]; checked: string }>;

const get = async (url: string) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' } });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r;
};

async function main() {
  // Loaded here, not at the top, so a test can use the functions above without the private archive being there.
  const { ARCHIVE_DIR } = await import('../radar/paths');
  const STATE = join(ARCHIVE_DIR, 'filings', 'watch.json');
  const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : undefined;
  const state: State = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
  const lines: string[] = [];
  for (const { name, cik } of WATCHED) {
    try {
      const recent = ((await (await get(`https://data.sec.gov/submissions/CIK${cik}.json`)).json()) as { filings: { recent: Recent } }).filings.recent;
      const first = !state[cik];
      const fresh = newFilings(state[cik]?.seen ?? [], recent);
      // A filing of a kind we do not report is recorded as seen, but not said.
      const notable = first ? [] : fresh.filter(f => NOTABLE.test(f.form));
      for (const f of notable) {
        let note = '';
        if (/^S-1/.test(f.form)) {
          try {
            const html = await (await get(docUrl(cik, f))).text();
            note = ` The table of what it must pay each year for computing is ${scheduleFilled(html)}; the sentence on how much falls before 2031 is ${narrativeFilled(html)}.`;
          } catch (e) {
            note = ` (We could not read it to see whether the table is filled in: ${(e as Error).message}.)`;
          }
        }
        const hint = f.form === 'S-1/A' ? ' An amended prospectus: it may fill the blank table that the money page’s slider waits for.' : '';
        lines.push(`${name}, ${f.form}, filed ${f.date}.${hint}${note} ${docUrl(cik, f)}`);
      }
      state[cik] = { seen: recent.accessionNumber, checked: new Date().toISOString().slice(0, 10) };
      if (first) console.log(`${name}: ${recent.accessionNumber.length} filings recorded; you will hear about the next one.`);
      else if (!fresh.length) console.log(`${name}: nothing new at the SEC (${recent.accessionNumber.length} filings).`);
      else if (!notable.length) console.log(`${name}: ${fresh.length} new filing(s), none of a kind we report (${fresh.map(f => f.form).join(', ')}).`);
    } catch (e) {
      console.log(`WARNING: the SEC's list for ${name} could not be read (${(e as Error).message}); it is tried again tomorrow.`);
    }
  }
  for (const l of lines) console.log(`NEW FILING: ${l}`);
  mkdirSync(dirname(STATE), { recursive: true });
  writeFileSync(STATE, `${JSON.stringify(state, null, 2)}\n`);
  if (out && lines.length) writeFileSync(out, `# New SEC filings\n\n${lines.map(l => `- ${l}`).join('\n')}\n`);
}

if (process.argv[1]?.endsWith('watch.ts')) main().catch(e => { console.log(`WARNING: the filing watch failed (${e.message})`); });
