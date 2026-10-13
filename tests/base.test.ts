/**
 * The Base's published rules, enforced. Run with `npm test`.
 * The saved source texts are private, so the quotation check itself runs in scripts/radar/compose.ts; here we check that
 * every quotation on the site is the one that was checked (its hash matches), and the rules the pages promise.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENTRIES, PEOPLE, nameOf } from '../content/base';
import { TOPIC } from '../content/base/taxonomy';

const verification = JSON.parse(readFileSync('content/base/verification.json', 'utf8')) as Record<string, { ok: boolean; quoteSha: string }>;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

test('every quotation says whether it is first-hand or reported, and none is dated after its source', () => {
  const TYPES = new Set(['position', 'prediction', 'account', 'factual', 'finding', 'commitment', 'proposal', 'value', 'question']);
  for (const e of ENTRIES) for (const q of e.quotes) {
    assert.ok(q.hand === 'first' || q.hand === 'reported', `${q.id}: first-hand or reported?`);
    if (q.said) assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(q.said) && q.said <= (e.published.length === 7 ? `${e.published}-31` : e.published), `${q.id}: said ${q.said}, after its source (${e.published})?`);
    if (q.type) assert.ok(TYPES.has(q.type), `${q.id}: unknown claim type ${q.type}`);
  }
});

test('research we read in full says how its finding was reached, and every relation points at an entry', () => {
  const slugs = new Set(ENTRIES.map(e => e.slug));
  for (const e of ENTRIES) {
    if (e.kind === 'research' && e.access === 'full') assert.ok(e.evidence, `${e.slug}: research read in full needs evidence (design, finding, limits, status)`);
    if (e.evidence) for (const k of ['design', 'finding', 'limits', 'status'] as const) assert.ok(e.evidence[k]?.trim(), `${e.slug}: evidence.${k} is empty`);
    for (const r of e.relations ?? []) { assert.ok(slugs.has(r.to), `${e.slug}: relation to ${r.to}, not an entry`); assert.notEqual(r.to, e.slug); }
  }
});

test('a quotation’s id comes from its words, so a confirmed label can never move to other words', () => {
  for (const e of ENTRIES) for (const q of e.quotes) {
    const want = `${e.id}-${sha(q.text.normalize('NFKC').replace(/\s+/g, ' ').trim()).slice(0, 8)}`;
    assert.ok(q.id === want || q.id.startsWith(`${want}-`), `${q.id} is not derived from its words`);
  }
});

test('every quotation shown was checked against its source, and has not changed since', () => {
  for (const e of ENTRIES) for (const q of e.quotes) {
    const v = verification[q.id];
    assert.ok(v, `${q.id} has no verification record`);
    assert.ok(v.ok, `${q.id} failed its check but is shown`);
    assert.equal(v.quoteSha, sha(q.text), `${q.id} was edited after it was checked`);
  }
});

test('an entry we only know from its description carries no quotations', () => {
  for (const e of ENTRIES) if (e.access === 'excerpt') assert.equal(e.quotes.length, 0, `${e.slug} has quotations but we never read the source`);
});

test('slugs are unique permalinks, dates are days, topics exist', () => {
  const slugs = new Set<string>();
  for (const e of ENTRIES) {
    assert.ok(!slugs.has(e.slug), `duplicate slug ${e.slug}`);
    slugs.add(e.slug);
    assert.match(e.slug, /^[a-z0-9-]+$/, `${e.slug} is not a clean slug`);
    assert.match(e.published, /^\d{4}-\d{2}(-\d{2})?$/);
    assert.ok(e.topics.length >= 1 && e.topics.length <= 3, `${e.slug} needs one to three questions`);
    for (const t of e.topics) assert.ok(TOPIC[t], `${e.slug}: unknown question ${t}`);
  }
});

test('every person in an entry has a record, and every speaker a name', () => {
  const ids = new Set(PEOPLE.map(p => p.id));
  for (const e of ENTRIES) {
    for (const p of e.people) assert.ok(ids.has(p.id), `${e.slug}: ${p.id} has no person record`);
    for (const q of e.quotes) assert.notEqual(nameOf(q.speaker), '', `${q.id}: speaker without a name`);
  }
});

test('entries about Anthropic or Claude are marked, because Claude wrote them', () => {
  for (const e of ENTRIES) {
    const about = /\banthropic\b|\bclaude\b/i.test(`${e.title} ${e.summary}`) || e.orgs.includes('anthropic');
    if (about) assert.ok(e.conflict, `${e.slug} is about Anthropic or Claude but not marked`);
  }
});

test('our own words use no gendered pronouns', () => {
  const PRONOUN = /\b(he|she|him|his|her|hers|herself|himself)\b/i;
  for (const e of ENTRIES) {
    const ours = [e.summary, ...Object.values(e.lenses), ...e.quotes.map(q => q.context ?? '')];
    for (const s of ours) assert.ok(!PRONOUN.test(s), `${e.slug}: "${s.match(PRONOUN)?.[0]}" in "${s.slice(0, 80)}…"`);
  }
});

test('a description-only entry is never a top story', () => {
  for (const e of ENTRIES) if (e.access === 'excerpt') assert.ok(e.importance < 3, `${e.slug} is a top story but we only read its description`);
});

test('only stance labels a person confirmed are shown', async () => {
  const { positionsOf } = await import('../content/base');
  for (const p of PEOPLE) for (const list of positionsOf(p.id).values()) for (const s of list) {
    const q = ENTRIES.flatMap(e => e.quotes).find(x => x.text === s.quote);
    assert.ok(q?.positions?.some(x => x.by === 'editor'), `${p.id}: a machine label would be shown`);
  }
});
