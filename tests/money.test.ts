import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { COMPANIES, GROUPS, filingPath, getCompany, latestFiling } from '../content/money';
import { VERIFICATION, passageOf } from '../content/filings';
import { brief, rowOf } from '../lib/money';

const ROOT = path.join(import.meta.dirname, '..');

test('every company is in a group, and every filing lives under its company', () => {
  for (const c of COMPANIES) {
    assert.ok(GROUPS.some(g => g.id === c.group), `${c.slug}: unknown group ${c.group}`);
    assert.ok(c.filings.length > 0, `${c.slug} has no filing`);
    assert.equal(getCompany(c.slug), c);
    for (const f of c.filings) {
      assert.equal(f.companySlug, c.slug, `${f.slug} names another company`);
      assert.match(filingPath(f), /^\/money\/[a-z0-9-]+\/[a-z0-9-]+$/);
    }
  }
  const paths = COMPANIES.flatMap(c => c.filings.map(filingPath));
  assert.equal(new Set(paths).size, paths.length, 'two filings share an address');
});

/** The charts draw from the table, so the table must add up the way the filing's statement does, in every column. */
test('each filing’s table adds up: costs to operating expenses, and operating loss down to net loss', () => {
  for (const c of COMPANIES) {
    for (const f of c.filings) {
      const r = (k: string) => rowOf(f, k);
      const [revenue, compute, personnel, bartz, sales, admin, opex, opLoss, interest, fairValue, other, pretax, taxes, netLoss] =
        ['revenue', 'compute', 'personnel', 'bartz', 'sales', 'admin', 'opex', 'operating-loss', 'interest', 'fair-value', 'other-income', 'pretax', 'taxes', 'net-loss'].map(r);
      f.money.table.columns.forEach((col, i) => {
        const at = `${f.slug}, ${col.label}`;
        assert.equal(compute[i] + personnel[i] + bartz[i] + sales[i] + admin[i], opex[i], `${at}: the cost lines do not add up to operating expenses`);
        assert.equal(revenue[i] - opex[i], opLoss[i], `${at}: revenue less operating expenses is not the operating loss`);
        assert.equal(opLoss[i] + interest[i] + fairValue[i] + other[i], pretax[i], `${at}: the lines below the operating loss do not add up`);
        assert.equal(pretax[i] - taxes[i], netLoss[i], `${at}: the pretax loss less taxes is not the net loss`);
      });
    }
  }
});

test('the company page compares like with like: the last column is the same half year, one year after the column before it', () => {
  for (const c of COMPANIES) {
    const cols = latestFiling(c).money.table.columns;
    const [a, b] = cols.slice(-2).map(x => x.label);
    assert.equal(a.replace(/\d{4}$/, ''), b.replace(/\d{4}$/, ''), `${c.slug}: ${a} and ${b} are not the same period`);
    assert.equal(Number(b.slice(-4)) - Number(a.slice(-4)), 1, `${c.slug}: ${a} is not a year before ${b}`);
  }
});

test('the headline figures are the ones the filing’s prose states', () => {
  const f = latestFiling(getCompany('anthropic')!);
  const prose = f.money.passages.map(id => passageOf(f, id).text).join(' ');
  const { stats } = brief(f);
  for (const label of ['Revenue', 'Net loss']) {
    const s = stats.find(x => x.label === label)!;
    assert.ok(prose.includes(s.value), `${label}: ${s.value} is not in the filing’s words`);
  }
  // The note under the loss chart quotes the filing's explanation of both fair-value lines.
  for (const id of ['loss-fair-value', 'other-expense']) assert.match(passageOf(f, id).text, /fair value/);
});

test('the old address of the S-1 page sends readers to its new one', () => {
  const config = fs.readFileSync(path.join(ROOT, 'next.config.ts'), 'utf8');
  for (const c of COMPANIES) for (const f of c.filings) {
    assert.ok(config.includes(`source: '/filings/${f.slug}', destination: '${filingPath(f)}'`), `no redirect from /filings/${f.slug}`);
  }
});

test('the commitments section’s own figures are in the filing’s words, and every arrangement it lists is a checked passage', () => {
  const f = latestFiling(getCompany('anthropic')!);
  const view = fs.readFileSync(path.join(ROOT, 'components/money/CompanyView.tsx'), 'utf8');
  // The note under the chart quotes the filing's total; the passage must state it.
  assert.match(passageOf(f, 'commit-june').text, /\$265\.6 billion/);
  assert.ok(view.includes('$265.6 billion'), 'the note no longer gives the filing’s figure');
  const amd = passageOf(f, 'amd').text;
  assert.match(amd, /does not specify a fixed dollar commitment/);
  assert.match(amd, /exceed \$20\.0 billion/);
  assert.ok(view.includes("name: 'AMD chips'") && view.includes('over $20B'), 'the AMD row on the chart does not match the passage');
  for (const id of [...f.money.commitments, ...f.money.arrangements]) assert.ok(VERIFICATION.filings[f.slug].passages[id]?.ok, `${id} is not a checked passage`);
  const listed = new Set([...f.money.commitments, ...f.money.arrangements]);
  assert.equal(listed.size, f.money.commitments.length + f.money.arrangements.length, 'a passage is listed twice');
});
