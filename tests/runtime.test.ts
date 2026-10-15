import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTriage } from '../scripts/radar/triage';
import { lint } from '../scripts/radar/lint-entry';

const items = Array.from({ length: 10 }, (_, i) => ({ id: `id${i}` }));

test('a triage plan becomes deep groups and light items, and everything else is skipped with a reason', () => {
  const { triage, skipped, problems } = buildTriage(items, {
    deep: { D1: [{ main: 0, also: [1] }, { main: 2 }] },
    light: { L1: [3, { main: 4, also: [5] }] },
    skip: { default: 'off topic', '9': 'a markets segment' },
  }, '2026-10-15');
  assert.deepEqual(problems, []);
  const t = triage as { deep: { D1: { main: { id: string }; also: { id: string }[] }[] }; light: { L1: unknown[] } };
  assert.equal(t.deep.D1[0].main.id, 'id0');
  assert.equal(t.deep.D1[0].also[0].id, 'id1');
  assert.equal(t.light.L1.length, 2);
  assert.deepEqual((t.light.L1[0] as { id: string }).id, 'id3', 'a lone light item stays a flat item');
  assert.ok(skipped.includes('id1 covered by the entry for id0'), 'also items are handled, not offered again');
  assert.ok(skipped.includes('id5 covered by the entry for id4'));
  assert.ok(skipped.includes('id9 a markets segment'));
  assert.ok(skipped.includes('id6 off topic'));
  assert.ok(!skipped.some(s => s.startsWith('id0 ') || s.startsWith('id3 ')), 'what is read is not recorded as skipped');
});

test('a triage plan with a bad number, a repeat or too many groups writes nothing', () => {
  const bad = buildTriage(items, { deep: { D1: [{ main: 0 }, { main: 0 }, { main: 99 }, { main: 1 }, { main: 2 }] } }, 'r').problems.join('\n');
  assert.match(bad, /already used/);
  assert.match(bad, /not a candidate number/);
  assert.match(bad, /at most 4/);
});

test('lint catches gendered pronouns and over-long words in our own text, and quotations in description-only entries', () => {
  const problems = lint({
    slug: 'x-2026-10-15-a', published: '2026-10-15', access: 'excerpt', importance: 3,
    summary: 'The minister said her plan would work.',
    change: { note: 'n '.repeat(30) },
    quotes: [{ text: 'too short', context: 'Where it was said.' }],
  }).join('\n');
  assert.match(problems, /gendered pronoun "her"/);
  assert.match(problems, /change\.note: 30 words; at most 25/);
  assert.match(problems, /excerpt.*quotations/);
  assert.match(problems, /cannot be importance 3/);
  assert.match(problems, /2 words; a quotation is 8–60 words/);
});

test('lint passes a clean entry', () => {
  assert.deepEqual(lint({
    slug: 'bbc-2026-10-15-ai-rules', published: '2026-10-15', access: 'full', importance: 2,
    summary: 'The BBC reports that the minister set out plans for AI rules.', change: { note: 'A new proposal.' },
    lenses: { public: 'Plans for AI rules.' },
    quotes: [{ text: 'We will set out new rules for frontier AI systems before the end of the year, the minister told MPs.', context: 'Statement to MPs.' }],
  }), []);
});
