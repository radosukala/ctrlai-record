import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { COMMITTED, cells } from '../lib/filings';
import { FILINGS, VERIFICATION, entryOf, passageOf, quoteOf } from '../content/filings';

const ROOT = path.join(import.meta.dirname, '..');
const sha = (s: string) => createHash('sha256').update(s.replace(/\s+/g, ' ').trim()).digest('hex');

test('every passage on a filing page was found word for word in its source, and has not changed since it was checked', () => {
  for (const f of FILINGS) {
    const v = VERIFICATION.filings[f.slug];
    assert.ok(v, `${f.slug} was never checked: npx tsx scripts/filings/check.ts`);
    for (const p of f.passages) {
      const check = v.passages[p.id];
      assert.ok(check?.ok, `${f.slug}: ${p.id} was not found in ${p.source}`);
      assert.equal(check.sha, sha(p.text), `${f.slug}: ${p.id} was edited after it was checked; run the check again`);
      if (p.source === 'filing') assert.ok(check.page, `${f.slug}: ${p.id} has no printed page`);
      else assert.ok(f.sources[p.source], `${f.slug}: ${p.id} names an unknown source`);
    }
  }
});

test('every row of the filing’s table shown was found in the filing, with a number for each column', () => {
  for (const f of FILINGS) {
    for (const r of f.money.table.rows) {
      assert.ok(VERIFICATION.filings[f.slug].rows[r.label], `${f.slug}: row ${r.label} not found`);
      const n = cells(r.row);
      assert.equal(n.length, f.money.table.columns.length, `${f.slug}: ${r.label} has ${n.length} numbers`);
      assert.ok(n.every(x => x === null || Number.isFinite(x)), `${f.slug}: ${r.label} has a cell that is neither a number nor a dash`);
    }
  }
});

test('the figures our own sentences give are the ones the filing’s prose gives', () => {
  const f = FILINGS.find(x => x.slug === 'anthropic-s-1')!;
  const prose = ['revenue', 'losses'].map(id => passageOf(f, id).text).join(' ');
  for (const figure of ['$41 million', '$16.3 billion', '$80.7 billion', '$72.4 billion']) assert.ok(prose.includes(figure), `${figure} is not in the filing’s words`);
  const commitments = f.money.commitments.map(id => passageOf(f, id).text).join(' ');
  for (const n of COMMITTED) assert.ok(commitments.includes(`$${n.toFixed(1)} billion`), `the sum uses $${n} billion, which the passages do not state`);
});

test('each warning has the filing’s words, and its public side is a checked page or a quotation in the Base', t2 => {
  for (const f of FILINGS) {
    for (const t of f.themes) {
      assert.ok(t.filing.length > 0, `${t.id} has nothing from the filing`);
      for (const id of t.filing) assert.equal(passageOf(f, id).source, 'filing', `${t.id}: ${id} is not from the filing`);
      for (const p of t.public) {
        if ('passage' in p) assert.notEqual(passageOf(f, p.passage).source, 'filing', `${t.id}: ${p.passage} is the filing, not a public statement`);
        // A quotation the Base no longer has (corrected or removed by a later run) drops off the page; it must not stop
        // the daily run's tests, so it is reported, not failed.
        else if (!quoteOf(p.quote)) t2.diagnostic(`${t.id}: quotation ${p.quote} is no longer in the Base; the page leaves it out`);
      }
      if (!t.public.length) assert.ok(t.note, `${t.id} shows no public statement and does not say why`);
    }
  }
});

test('every press quotation of the filing was checked against it; one the Base no longer has is reported, not failed', t => {
  for (const f of FILINGS) {
    for (const id of f.press.quotes) {
      if (!quoteOf(id)) t.diagnostic(`${id} is no longer in the Base; the page leaves it out`);
      assert.ok(VERIFICATION.filings[f.slug].press[id], `${id} was not checked against the filing`);
    }
    for (const h of f.press.headlines) {
      if (!entryOf(h.entry)) t.diagnostic(`headline entry ${h.entry} is no longer in the Base; the page leaves it out`);
      for (const id of h.filing) assert.equal(passageOf(f, id).source, 'filing');
    }
  }
});

test('a filing page says who writes Ctrl AI, that every company is treated the same, and that it is not investment advice', () => {
  for (const file of ['components/filings/FilingView.tsx', 'components/money/CompanyView.tsx', 'components/money/MoneyHub.tsx']) {
    const view = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.match(view, /Ctrl AI is written with Claude/, file);
    assert.match(view, /[Ee]very company/, file);
    assert.match(view, /Nothing here is investment advice/, file);
  }
  for (const f of FILINGS) for (const s of Object.values(f.sources)) assert.match(s.date, /^\d{4}-\d{2}-\d{2}$/);
});
