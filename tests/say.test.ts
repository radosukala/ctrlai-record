import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COPY, POLIS, STATEMENT_COUNT, THEMES } from '../content/say-discuss';
import { HUB, PARTS, SAY } from '../content/say';

/** The rules the "A Say in AI" pages keep, enforced. */

test('every seed statement is one short claim, in both languages, and the languages say the same number of things', () => {
  assert.ok(STATEMENT_COUNT >= 15 && STATEMENT_COUNT <= 40, 'Polis advises 15 to 40 seed statements');
  const seen = new Set<string>();
  for (const theme of THEMES) {
    assert.ok(theme.title.en && theme.title.cs);
    for (const s of theme.statements) {
      for (const lang of ['en', 'cs'] as const) {
        const text = s[lang];
        assert.ok(text.length >= 15 && text.length <= 140, `${lang}: “${text}” must be at most 140 characters (Polis’s statement limit)`);
        assert.ok(/[.!?]$/.test(text), `${lang}: “${text}” should end like a sentence`);
        assert.ok(!/[.!?]\s+\p{Lu}/u.test(text), `${lang}: “${text}” holds more than one sentence; a statement is one claim`);
      }
      assert.ok(!seen.has(s.en), `duplicate statement: ${s.en}`);
      seen.add(s.en);
    }
  }
  assert.equal(seen.size, STATEMENT_COUNT);
});

test('the conversation embed is off until someone creates it, and the page says so', () => {
  for (const lang of ['en', 'cs'] as const) {
    if (POLIS[lang] === null) assert.ok(COPY[lang].openSoon.length > 40, `${lang}: the page must say the conversation is not open yet`);
    else assert.match(POLIS[lang] as string, /^[A-Za-z0-9]+$/, `${lang}: a Polis conversation id is letters and digits`);
  }
  assert.ok(COPY.cs.note.length > 20, 'the Czech page must say it is an unreviewed translation');
});

test('the five parts are the five the hub promises, and each says honestly whether it exists', () => {
  assert.deepEqual(PARTS.map(p => p.id), ['read', 'check', 'discuss', 'decide', 'deliver']);
  for (const p of PARTS) {
    assert.ok(p.text.en.length > 30 && p.text.cs.length > 30 && p.how.en.length > 30 && p.how.cs.length > 30, `${p.id}: both languages`);
    if (p.state === 'live') assert.ok(p.href.en && p.href.cs, `${p.id} is live and needs a page in both languages`);
    if (p.state === 'planned') assert.ok(!p.href.en && !p.href.cs, `${p.id} is only planned and must not link to a page that does not exist`);
  }
  assert.deepEqual(Object.keys(HUB.en.states), Object.keys(HUB.cs.states));
  assert.equal(HUB.en.rules.length, HUB.cs.rules.length);
  assert.ok(SAY.name && SAY.hub.startsWith('/'));
});
