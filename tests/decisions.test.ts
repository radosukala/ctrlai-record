import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEntry } from '../content/base';
import { TOPIC } from '../content/base/taxonomy';
import { BRIEFS } from '../content/decisions';

const PRONOUN = /\b(he|she|him|his|her|hers|herself|himself)\b/i;

for (const b of BRIEFS) {
  test(`${b.id}: dated, versioned, and tied to real questions`, () => {
    assert.match(b.asOf, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(b.revisions[b.revisions.length - 1].version, b.version);
    for (const q of b.questions) assert.ok(TOPIC[q], `${q} is not one of the Base's questions`);
    assert.ok(b.options.length >= 2, 'a decision with one option is not a decision');
  });

  test(`${b.id}: every fact cites something, every Base citation exists, and every date is real`, () => {
    const facts = [...b.who, ...b.status, ...b.evidence, ...b.openQuestions, ...b.deadlines, ...b.participate];
    for (const f of facts) assert.ok(f.cites.length, `${f.id} cites nothing`);
    const all = [...facts, ...b.options.flatMap(o => [...o.for, ...o.against])];
    for (const c of all) for (const x of c.cites) if ('base' in x) assert.ok(getEntry(x.base), `cites a Base entry that does not exist: ${x.base}`);
    const ids = facts.map(f => f.id);
    assert.equal(new Set(ids).size, ids.length, 'fact ids are unique');
    for (const d of b.deadlines) assert.match(d.date, /^\d{4}-\d{2}-\d{2}$/);
    for (const p of b.participate) if (p.until) assert.match(p.until, /^\d{4}-\d{2}-\d{2}$/);
  });

  test(`${b.id}: every argument is attributed to who made it, and each option has both sides`, () => {
    for (const o of b.options) {
      assert.ok(o.for.length && o.against.length, `${o.id}: show both sides`);
      for (const a of [...o.for, ...o.against]) { assert.ok(a.who.trim(), `${o.id}: an argument has no author`); assert.ok(a.cites.length, `${o.id}: an argument cites nothing`); }
    }
  });

  test(`${b.id}: our words use no gendered pronouns`, () => {
    const ours = [b.summary, ...b.who.map(f => f.text), ...b.status.map(f => f.text), ...b.evidence.map(f => f.text), ...b.openQuestions.map(f => f.text),
      ...b.deadlines.map(f => f.text), ...b.participate.map(f => f.text), ...b.ask, ...b.options.map(o => `${o.name}. ${o.what}`)];
    for (const s of ours) assert.ok(!PRONOUN.test(s), `"${s.match(PRONOUN)?.[0]}" in "${s.slice(0, 80)}…"`);
  });

  test(`${b.id}: nothing here recommends a side`, () => {
    for (const s of [b.summary, ...b.ask, ...b.options.map(o => o.what)]) assert.ok(!/\b(we recommend|should be adopted|the right answer|we support)\b/i.test(s), `looks like a recommendation: ${s.slice(0, 80)}`);
  });
}
