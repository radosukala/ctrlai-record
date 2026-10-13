/**
 * The registry of people and organizations: complete, consistent, and never claiming more than its sources.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENTRIES } from '../content/base';
import { GROUP_ORDER, ORGS, PARTIES, REGISTRY, groupAt, orgOf } from '../content/registry';

const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

// Completeness is a backlog, not a rule: the daily run adds new people and organizations every day, and their records
// come after (npx tsx scripts/registry/missing.ts). What is enforced is that the records that exist are right.
test('registry ids are well-formed: the people we follow need not be in the Base yet', () => {
  for (const r of REGISTRY) assert.match(r.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `registry id ${r.id}`);
});

test('one person, one record: no two records share a Wikidata id or an id', () => {
  const seen = new Map<string, string>();
  const ids = new Set<string>();
  for (const p of REGISTRY) {
    assert.ok(!ids.has(p.id), `${p.id} appears twice`);
    ids.add(p.id);
    if (!p.wikidata) continue;
    assert.match(p.wikidata, /^Q\d+$/);
    assert.ok(!seen.has(p.wikidata), `${p.id} and ${seen.get(p.wikidata)} are the same Wikidata person: merge them with aliasIds`);
    seen.set(p.wikidata, p.id);
  }
  for (const p of REGISTRY) for (const a of p.aliasIds ?? []) assert.ok(!ids.has(a), `${a} is an alias of ${p.id} and also a record`);
});

test('every membership points at a known organization and party, with dates as precise as their source', () => {
  const parties = new Set(PARTIES.map(p => p.id));
  for (const p of REGISTRY) for (const m of p.memberships) {
    assert.ok(orgOf(m.org), `${p.id}: unknown organization ${m.org}`);
    if (m.party) assert.ok(parties.has(m.party), `${p.id}: unknown party ${m.party}`);
    if (m.from) assert.match(m.from, DATE, `${p.id}: from ${m.from}`);
    if (m.to) assert.match(m.to, DATE, `${p.id}: to ${m.to}`);
    if (m.from && m.to) assert.ok(m.from <= m.to, `${p.id}: ${m.org} ends before it starts`);
    assert.ok(['wikidata', 'source', 'agent', 'editor'].includes(m.source.by), `${p.id}: where does ${m.org} come from?`);
  }
});

test('every organization in the registry has a kind, and aliases never collide', () => {
  const ids = new Set(ORGS.map(o => o.id));
  for (const o of ORGS) {
    assert.ok(o.kind, `${o.id} has no kind`);
    for (const a of o.aliases ?? []) assert.ok(!ids.has(a), `${a} is an alias of ${o.id} and also an organization`);
  }
});

test('everyone falls in a known group on the day of each of their quotations', () => {
  for (const e of ENTRIES) for (const q of e.quotes) {
    const g = groupAt(q.speaker, q.said ?? e.published);
    assert.ok(GROUP_ORDER.includes(g), `${q.id}: group ${g}`);
  }
});
