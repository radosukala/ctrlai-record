import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEntry } from '../content/base';
import { TOPIC } from '../content/base/taxonomy';
import { QUESTIONS } from '../content/questions';

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const PRONOUN = /\b(he|she|him|his|her|hers|herself|himself)\b/i;

for (const q of QUESTIONS) {
  test(`${q.id}: a real question with a dated, versioned answer of the right length`, () => {
    assert.ok(TOPIC[q.id], `${q.id} is not one of the Base's questions`);
    assert.match(q.asOf, /^\d{4}-\d{2}-\d{2}$/);
    const n = words(q.answer);
    assert.ok(n >= 100 && n <= 180, `the short answer is ${n} words; keep it to 100–180`);
    assert.equal(q.revisions[q.revisions.length - 1].version, q.version, 'the newest revision is the current version');
    assert.equal(q.revisions[q.revisions.length - 1].date, q.asOf, 'the newest revision carries the as-of date');
  });

  test(`${q.id}: every claim rests on something, and every Base citation exists`, () => {
    const all = [...q.established, ...q.limits, ...q.changed.items, ...q.unknowns, ...q.values, ...q.decisions, ...q.disagreements.flatMap(d => d.sides)];
    for (const c of [...q.established, ...q.limits, ...q.changed.items]) assert.ok(c.cites.length, `${'id' in c ? c.id : ''} cites nothing`);
    for (const c of all) for (const x of c.cites) if ('base' in x) assert.ok(getEntry(x.base), `cites a Base entry that does not exist: ${x.base}`);
    for (const d of q.decisions) assert.ok(d.cites.length, `${d.id} cites nothing`);
    const ids = [...q.established, ...q.limits, ...q.changed.items, ...q.unknowns, ...q.wouldChange, ...q.values, ...q.decisions, ...q.disagreements].map(c => c.id);
    assert.equal(new Set(ids).size, ids.length, 'claim ids are unique (they are anchors and challenge references)');
  });

  test(`${q.id}: each disagreement is one question, of fact or of policy, with its scope; each change says what kind it is`, () => {
    for (const d of q.disagreements) {
      assert.ok(d.kind === 'fact' || d.kind === 'policy', `${d.id}: kind`);
      assert.ok(d.scope.length > 20, `${d.id}: say exactly what is in dispute`);
      assert.ok(d.sides.length >= 2, `${d.id}: a disagreement needs at least two views`);
    }
    for (const c of q.changed.items) assert.ok(c.kind, `${c.id}: is it new evidence, or only a new argument?`);
  });

  test(`${q.id}: our words use no gendered pronouns`, () => {
    const ours = [q.answer, ...[...q.established, ...q.limits, ...q.changed.items, ...q.unknowns, ...q.wouldChange, ...q.values].map(c => c.text),
      ...q.disagreements.flatMap(d => [d.point, d.scope, d.dependsOn, ...d.sides.map(s => s.view)]),
      ...q.decisions.flatMap(d => [d.what, d.who, d.status])];
    for (const s of ours) assert.ok(!PRONOUN.test(s), `"${s.match(PRONOUN)?.[0]}" in "${s.slice(0, 80)}…"`);
  });
}
