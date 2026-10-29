import { test } from 'node:test';
import assert from 'node:assert/strict';
import { docUrl, narrativeFilled, newFilings, scheduleFilled, type Recent } from '../scripts/filings/watch';

// The SEC lists filings newest first.
const recent: Recent = {
  form: ['S-1/A', '8-K', 'S-1', 'DRS/A'],
  filingDate: ['2026-11-09', '2026-11-02', '2026-10-26', '2026-10-09'],
  accessionNumber: ['0001628280-26-070000', '0001628280-26-069000', '0001628280-26-067168', '0002130357-26-000014'],
  primaryDocument: ['anthropicpbc-sx1a.htm', 'a8k.htm', 'anthropicpbc-sx1.htm', 'filename1.htm'],
};

test('a filing the watch has not seen is new, oldest first, and one it has seen is not', () => {
  const seen = ['0001628280-26-067168', '0002130357-26-000014'];
  assert.deepEqual(newFilings(seen, recent).map(f => f.form), ['8-K', 'S-1/A']);
  assert.deepEqual(newFilings(recent.accessionNumber, recent), []);
  assert.equal(newFilings([], recent).length, 4);
});

test('the address of a filing’s main document is the SEC’s, without dashes in the accession number', () => {
  const f = newFilings([], recent).find(x => x.form === 'S-1/A')!;
  assert.equal(docUrl('0002130357', f), 'https://www.sec.gov/Archives/edgar/data/2130357/000162828026070000/anthropicpbc-sx1a.htm');
});

// The table as the SEC's page has it: the header, one row per kind, and the footnotes under a line of underscores.
const table = (cells: string) => `<table><tr><td>Payments Due by Year</td></tr><tr><td>(in millions)</td><td>Total</td><td>2026</td><td>2027</td><td>2028</td><td>2029</td><td>2030</td><td>Thereafter</td></tr>
<tr><td>Operating leases</td><td>(1)</td>${cells}</tr><tr><td>Finance leases</td><td>(2)</td>${cells}</tr><tr><td>Purchase</td><td>commitments</td><td>(3)</td>${cells}</tr><tr><td>Total</td><td>(4)(5)</td>${cells}</tr></table>
<p>______________</p><p>(1) Consists of operating leases for corporate offices</p>`;

test('the table of what must be paid each year is blank when its cells hold only footnote marks, and filled when they hold figures', () => {
  assert.equal(scheduleFilled(table('')), 'blank');
  assert.equal(scheduleFilled(table('<td>$</td><td>12,345</td><td>1,200</td><td>3,400</td>')), 'filled');
  assert.equal(scheduleFilled(table('<td>$</td><td>987</td><td>—</td>')), 'filled');
  assert.equal(scheduleFilled('<p>A prospectus without that table</p>'), 'not found');
});

test('the sentence on how much falls before 2031 is blank until its figure is filled in', () => {
  const sentence = (x: string) => `<p>These commitments include approximately $<font>${x}</font> expected to be incurred before December 31, 2030, and substantially all of the remainder between 2031 and 2045.</p>`;
  assert.equal(narrativeFilled(sentence('')), 'blank');
  assert.equal(narrativeFilled(sentence('120.5 billion')), 'filled');
  assert.equal(narrativeFilled('<p>Nothing about it</p>'), 'not found');
});
