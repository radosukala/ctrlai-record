import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { AGENTS, EVENTS, LINKS, NUMBERS, QUOTES, SOURCES, TERM_BY_ID, UNKNOWNS, ACCOUNTS, COUNTERS, TIMELINE, ZONES, formatWhen, zoneStates } from '../content/incidents/openai-hf';
import verification from '../content/incidents/openai-hf/verification.json';
import { tokenize } from '../lib/verify-quote';
import { ALL_FILES, ourPhrases } from '../scripts/incident-copy';

/**
 * The rules the OpenAI–Hugging Face reconstruction promises its readers, enforced. The quotations are checked against the
 * source texts by scripts/verify-incident.ts (the sources are copyrighted and live outside the repository); this file
 * checks that every quotation on the page has passed, and has not been edited since.
 */

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const ids = <T extends { id: string }>(xs: T[]) => xs.map(x => x.id);

test('every quotation was verified word for word, and has not been edited since', () => {
  assert.ok(QUOTES.length >= 100);
  for (const q of QUOTES) {
    const r = (verification.results as Record<string, { ok: boolean; mode?: string; quoteSha: string }>)[q.id];
    assert.ok(r, `${q.id} has no verification record`);
    assert.ok(r.ok, `${q.id} did not verify`);
    assert.equal(r.mode, 'exact', `${q.id} matched only as words, not exactly`);
    assert.equal(r.quoteSha, sha(q.text), `${q.id} was edited after it was verified: re-run scripts/verify-incident.ts`);
  }
  assert.equal(Object.keys(verification.results).length, QUOTES.length, 'verification.json has records for quotations that no longer exist');
  for (const id of ['metr', 'oai-tr', 'hf', 'oai-blog', 'oai-astra', 'fortune']) assert.match((verification.sources as Record<string, { sha256: string }>)[id]?.sha256 ?? '', /^[0-9a-f]{64}$/, `no source hash for ${id}`);
});

test('every phrase in curly quotation marks in our own words was found in a source', () => {
  const found = verification.inlinePhrases as Record<string, string[]>;
  for (const [phrase, where] of Object.entries(found)) assert.ok(where.length, `“${phrase}” was not found in any source`);
  // The same list of files and phrases the verifier used, so nothing can be added to the page without being checked.
  for (const phrase of ourPhrases(QUOTES.map(q => q.gloss ?? ''))) {
    assert.ok(phrase in found, `“${phrase}” appears on the page in quotation marks but was never checked: re-run scripts/verify-incident.ts`);
  }
});

test('everything is cited, and every reference points at something that exists', () => {
  const quoteIds = new Set(ids(QUOTES));
  const agentIds = new Set(ids(AGENTS));
  for (const e of EVENTS) {
    assert.ok(e.cites.length >= 1, `${e.id} has no source`);
    for (const c of e.cites) assert.ok(SOURCES[c.s] && c.at, `${e.id} has a bad citation`);
    for (const q of e.quotes ?? []) assert.ok(quoteIds.has(q), `${e.id} uses unknown quote ${q}`);
    for (const a of e.agents ?? []) assert.ok(agentIds.has(a), `${e.id} names unknown agent ${a}`);
  }
  for (const a of AGENTS) assert.ok(a.cites.length >= 1, `agent ${a.id} has no source`);
  for (const l of LINKS) {
    assert.ok(agentIds.has(l.from) && agentIds.has(l.to), `link ${l.from} → ${l.to} names an unknown agent`);
    assert.ok(l.cites.length >= 1, `link ${l.from} → ${l.to} has no source`);
  }
  for (const q of QUOTES) assert.ok(SOURCES[q.src.s] && q.src.at, `${q.id} has no source`);
  for (const n of NUMBERS) assert.ok(n.cite, `number ${n.id} has no source`);
  for (const c of COUNTERS) assert.ok(c.cite, `counter ${c.key} at ${c.t} has no source`);
  for (const u of UNKNOWNS) assert.ok(u.cites.length >= 1 && u.who, `unknown "${u.q.slice(0, 30)}" has no source`);
  for (const r of ACCOUNTS) assert.ok(r.cites.length >= 1, `comparison ${r.topic} has no source`);
});

test('ids are unique, times are valid and in order, and ranges end after they begin', () => {
  for (const list of [ids(EVENTS), ids(QUOTES), ids(AGENTS)]) assert.equal(new Set(list).size, list.length, 'duplicate id');
  for (const e of EVENTS) {
    assert.ok(!Number.isNaN(Date.parse(e.t)), `${e.id} has a bad time`);
    if (e.until) assert.ok(Date.parse(e.until) > Date.parse(e.t), `${e.id} ends before it starts`);
    assert.ok(Date.parse(e.t) <= Date.parse('2026-09-30'), `${e.id} is dated after the reports`);
  }
  for (let i = 1; i < TIMELINE.length; i++) assert.ok(TIMELINE[i - 1].t <= TIMELINE[i].t, 'timeline is out of order');
  for (const q of QUOTES) if (q.at) assert.ok(!Number.isNaN(Date.parse(q.at)), `${q.id} has a bad time`);
});

test('dates say no more than a source does', () => {
  assert.equal(formatWhen({ t: '2026-07-09T12:00:00Z', precision: 'day' }), 'Jul 9');
  assert.equal(formatWhen({ t: '2026-07-09T12:00:00Z', until: '2026-07-09T20:00:00Z', precision: 'range' }), 'Jul 9');
  assert.equal(formatWhen({ t: '2026-07-08T23:30:00Z', until: '2026-07-09T12:00:00Z', precision: 'range' }), 'Jul 8 – Jul 9');
  assert.equal(formatWhen({ t: '2026-07-09T09:00:00Z', precision: 'hour' }), 'Jul 9, about 09:00 UTC');
  assert.equal(formatWhen({ t: '2026-07-11T16:07:00Z', precision: 'minute' }), 'Jul 11, 16:07 UTC');
  // A quotation gets a time only when a source gives one for it; a midnight is a placeholder, and a placeholder is a claim.
  for (const q of QUOTES) if (q.at) assert.ok(!/T00:00(:00)?Z$/.test(q.at), `${q.id} has a time of exactly midnight: give the day only`);
  for (const q of QUOTES) if (q.kind === 'statement') assert.equal(q.at, undefined, `${q.id} is a statement in a report, not something said at a moment in the incident`);
});

test('our own words stay short and plain, and glossary words resolve', () => {
  for (const e of EVENTS) {
    assert.ok(words(e.title) <= 16, `${e.id} title is long`);
    assert.ok(words(e.text) <= 75, `${e.id} text is ${words(e.text)} words`);
    for (const m of e.text.matchAll(/\[\[([^\]]+)\]\]/g)) assert.ok(TERM_BY_ID[m[1]], `${e.id} uses unknown glossary word ${m[1]}`);
  }
  for (const a of AGENTS) assert.ok(words(a.summary) <= 60, `${a.id} summary is long`);
  for (const q of QUOTES) {
    if (q.gloss) assert.ok(words(q.gloss) <= 45, `${q.id} reading is long`);
    const n = tokenize(q.text).length;
    assert.ok(n <= (q.kind === 'message' ? 80 : 60), `${q.id} is ${n} words`);
  }
});

test('the reach map only moves one way: a station does not un-breach', () => {
  const steps = TIMELINE;
  let prev = zoneStates(steps, 0);
  const rank = { untouched: 0, touched: 1, breached: 2 } as const;
  for (let i = 1; i < steps.length; i++) {
    const now = zoneStates(steps, i);
    for (const z of ZONES) assert.ok(rank[now[z.id].state] >= rank[prev[z.id].state], `${z.id} went backwards at ${steps[i].id}`);
    prev = now;
  }
});

test('nothing on the page or in its data reproduces keys, endpoints, hostnames or exploit strings', () => {
  const banned: [string, RegExp][] = [
    ['a Hugging Face token', /hf_[A-Za-z0-9]{20,}/],
    ['a GitHub token', /gh[pousr]_[A-Za-z0-9]{20,}/],
    ['an AWS key', /AKIA[0-9A-Z]{16}/],
    ['a JWT', /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/],
    ['a private key', /-----BEGIN [A-Z ]*PRIVATE KEY/],
    ['a long encoded blob', /[A-Za-z0-9+/=]{80,}/],
    ['a template-injection payload', /__globals__|__builtins__|cycler\./],
    ['a local file path used in the attack', /\/proc\/self|\/etc\/(passwd|shadow)|\/first-rows/],
    ['a cloud metadata address', /169\.254\.169\.254/],
    ['an in-cluster hostname', /kubernetes\.default\.svc/],
    ['a shell one-liner', /\bexec\(|\beval\(|base64 -d|curl -[a-zA-Z]*s?\b.*\|/],
  ];
  // Only the sources' own addresses and ours may appear: any other host or address could be a target.
  const allowedHosts = new Set(['www.youtube.com', 'ctrlai.com', 'openai.com', 'cdn.openai.com', 'alignment.openai.com', 'deploymentsafety.openai.com', 'metr.org', 'huggingface.co', 'fortune.com']);
  for (const f of ALL_FILES) {
    const text = readFileSync(f, 'utf8');
    for (const [what, re] of banned) assert.ok(!re.test(text), `${f} contains ${what}`);
    assert.ok(!/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(text), `${f} contains an IP address`);
    for (const m of text.matchAll(/\b[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.(?:com|io|net|org|ai|dev|app|co|cloud|sh|xyz)\b/g)) {
      assert.ok(allowedHosts.has(m[0].toLowerCase()), `${f} names a host that is neither a source nor ours: ${m[0]}`);
    }
  }
});

test('the numbers on the page agree with each other', () => {
  const find = (id: string) => NUMBERS.find(n => n.id === id)!;
  assert.equal(find('agents').value, '~1,200');
  assert.equal(find('attackers').value, '~700');
  assert.ok(COUNTERS.some(c => c.key === 'joined' && /700/.test(c.value)));
  assert.ok(COUNTERS.some(c => c.key === 'hfWorkers' && /41/.test(c.value)));
  assert.ok(EVENTS.some(e => /956/.test(e.text)));
});
