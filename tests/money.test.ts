import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { COMPANIES, GROUPS, filingPath, getCompany, latestFiling } from '../content/money';
import { VERIFICATION, passageOf } from '../content/filings';
import { brief, rowOf } from '../lib/money';
import { cells, money } from '../lib/filings';

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

/** Every dollar figure in our own explanations is one the filing, the interview or the filing's tables give. */
test('the figures in our plain words are theirs: in a passage, or in the filing’s table', () => {
  const f = latestFiling(getCompany('anthropic')!);
  const theirs = f.passages.map(p => p.text).join(' ');
  const rows = [...f.money.table.rows, ...f.money.also].flatMap(r => cells(r.row)).filter((n): n is number => n !== null).map(n => money(Math.abs(n)));
  const known = (fig: string) => theirs.includes(fig) || rows.includes(fig);
  const blocks = [...f.money.explain.loss, ...f.money.explain.commitments];
  assert.ok(blocks.length >= 8);
  for (const b of blocks) {
    for (const text of [b.title, ...b.says]) {
      for (const fig of text.match(/\$[\d,.]+(?: (?:billion|million|trillion))?/g) ?? []) {
        assert.ok(known(fig), `${b.id}: “${fig}” is not in a passage or the filing’s table`);
      }
    }
  }
});

test('each plain-words block sits beside passages that exist, are checked, and come from the right place', () => {
  const f = latestFiling(getCompany('anthropic')!);
  const v = VERIFICATION.filings[f.slug];
  const ids = new Set<string>();
  for (const b of [...f.money.explain.loss, ...f.money.explain.commitments]) {
    assert.ok(!ids.has(b.id), `block ${b.id} appears twice`);
    ids.add(b.id);
    assert.ok(b.says.length > 0 && b.filing.length > 0, `${b.id} has no explanation or no filing words`);
    for (const id of b.filing) assert.equal(passageOf(f, id).source, 'filing', `${b.id}: ${id} is not from the filing`);
    for (const id of b.public ?? []) {
      assert.notEqual(passageOf(f, id).source, 'filing', `${b.id}: ${id} is the filing, not a public statement`);
      assert.ok(v.passages[id]?.ok, `${b.id}: ${id} was not found in its source`);
    }
    for (const id of b.filing) assert.ok(v.passages[id]?.ok && v.passages[id].page, `${b.id}: ${id} was not found in the filing`);
  }
});

test('the loss is explained from the filing’s own statements: the cash-flow statement adds the fair-value change back', () => {
  const f = latestFiling(getCompany('anthropic')!);
  assert.ok(VERIFICATION.filings[f.slug].rows['Cash-flow statement: change in fair value, added back'], 'the add-back row was not found in the filing');
  const income = rowOf(f, 'fair-value');
  const addBack = cells(f.money.also.find(r => r.key === 'cf-fair-value')!.row).map(n => n ?? 0);
  assert.deepEqual(addBack, income.map(n => -n), 'the cash-flow add-back is not the income statement’s fair-value change, reversed');
  // The words say what the filing says: the same line, every period.
  const text = f.money.explain.loss.flatMap(b => b.says).join(' ');
  assert.match(text, /cash-flow statement adds the \$72\.4 billion back/);
  assert.equal(money(Math.abs(income[income.length - 1])), '$72.4 billion');
});

test('an interview our words lean on is said to be an interview, with who spoke and when', () => {
  const f = latestFiling(getCompany('anthropic')!);
  const s = f.sources.dwarkesh;
  assert.match(s.who ?? '', /Dario Amodei/);
  assert.match(s.date, /^2026-02-\d{2}$/);
  const text = f.money.explain.commitments.flatMap(b => b.says).join(' ');
  assert.match(text, /February 2026 interview/);
  assert.match(text, /far larger than anything in the filing/);
});
