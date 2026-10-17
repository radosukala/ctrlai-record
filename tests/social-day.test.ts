import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DAYS, dayEdition } from '../content/base/editions';
import type { Entry, Quote } from '../content/base/types';
import { LINKEDIN_LIMIT, X_LIMIT } from '../lib/social';
import { REST_DAYS, cardable, dayKit, postsMarkdown, quotesOfTheDay, readElsewhere, sentences } from '../lib/social-day';

const ROOT = path.join(import.meta.dirname, '..');

for (const run of DAYS) {
  const kit = dayKit(run)!;

  test(`posts for ${run}: the card's quotation passes every rule, and the X post fits`, () => {
    if (!kit.quote) return;
    const { e, q } = kit.quote;
    assert.ok(cardable(q, e), `${q.id} should not be on a card`);
    assert.ok(e.quotes.includes(q), 'the quotation is one of its entry’s checked quotations');
    assert.ok(kit.x!.length <= X_LIMIT, `X post is ${kit.x!.length} characters`);
    assert.match(kit.x!.reply, new RegExp(`^https://ctrlai\\.com/base/${e.slug}\\?utm_source=x&utm_medium=social&utm_campaign=day-${run}#${q.id}$`));
    if (e.conflict) assert.match(kit.x!.text, /written with Claude/, 'a post about Anthropic says who writes Ctrl AI');
    for (const alt of kit.alternatives) assert.ok(cardable(alt.q, alt.e));
    const people = [kit.quote, ...kit.alternatives].map(p => p.q.speaker);
    assert.equal(new Set(people).size, people.length, 'one quotation per person');
  });

  test(`posts for ${run}: LinkedIn carries the day's changes in our words, the link in the first comment`, () => {
    const ed = dayEdition(run)!;
    if (!ed.changes.length) return assert.equal(kit.linkedinToday, undefined);
    assert.ok(kit.linkedinToday!.length <= LINKEDIN_LIMIT);
    for (const { e } of ed.changes.slice(0, 3)) assert.ok(kit.linkedinToday!.text.includes(e.change!.note));
    assert.equal(kit.linkedinToday!.comment, `https://ctrlai.com/day/${run}?utm_source=linkedin&utm_medium=social&utm_campaign=day-${run}`);
    if (ed.changes.slice(0, 3).some(p => p.e.conflict)) assert.match(kit.linkedinToday!.text, /written with Claude/);
    assert.match(postsMarkdown(kit), /^# Posts for .*\n\nDrafts only: nothing is posted\./);
  });
}

test('the same person is the card again within the rest days only when nobody fresh qualified', () => {
  const picks = DAYS.map(run => quotesOfTheDay(run)[0]);
  for (let i = 1; i < picks.length; i++) {
    const p = picks[i];
    if (!p) continue;
    const before = picks.slice(Math.max(0, i - REST_DAYS), i).filter(Boolean).map(x => x!.q.speaker);
    // Tiers 0, 1 and 3 require someone not quoted in the rest days; a repeat can only come from tier 2 or 4.
    if (before.includes(p.q.speaker)) assert.ok(p.tier === 2 || p.tier === 4, `${DAYS[i]} repeats ${p.q.speaker} from tier ${p.tier}`);
  }
});

const entry = (over: Partial<Entry> = {}) => ({ importance: 2, transcript: 'none', access: 'full', notes: '', ...over }) as Entry;
const quote = (over: Partial<Quote> = {}) => ({ id: 'x', text: 'We will look to play a leadership role in ensuring that we arrive at a code.', speaker: 'kanishka-narayan', speakerCertain: true, match: 'exact', ...over }) as Quote;

test('a card never carries captions in capitals, automatic captions, or second-hand words from a text we did not read', () => {
  assert.ok(cardable(quote(), entry()));
  assert.ok(!cardable(quote({ text: 'A LOT OF PUBLISHED REPORTS ABOUT REALLY THE WEAKNESS OF THE SAFETY PROTOCOLS IN PLACE.' }), entry()));
  assert.ok(!cardable(quote(), entry({ transcript: 'auto' })));
  assert.ok(!cardable(quote({ hand: 'reported' }), entry({ access: 'partial' })));
  assert.ok(readElsewhere(entry({ notes: 'Axios returned 403, so the saved text is Ars Technica’s follow-up.' })));
  assert.ok(!cardable(quote({ hand: 'reported' }), entry({ notes: 'Axios returned 403, so the saved text is Ars Technica’s follow-up.' })));
  assert.ok(!cardable(quote({ speakerCertain: false }), entry()));
  assert.ok(!cardable(quote(), entry({ importance: 1 })));
});

test('a quotation an outlet printed, which we read in full, competes on weight with a person’s own words', () => {
  // Oct 17: the Anthropic co-founder's quoted prediction outweighs a paper's statement of its own limits.
  const [card] = quotesOfTheDay('2026-10-17');
  if (card) assert.equal(card.q.id.split('-')[0], '1c2f07707516');
});

test('a quotation splits into whole sentences, not at "Mr."', () => {
  assert.deepEqual(sentences('On his point, Mr. Smith is right. We will act.'), ['On his point, Mr. Smith is right.', 'We will act.']);
  assert.deepEqual(sentences('One sentence only'), ['One sentence only']);
});

test('the day kit only writes files: nothing in it can post', () => {
  for (const f of ['lib/social-day.ts', 'scripts/social-day.tsx']) {
    const source = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.doesNotMatch(source, /\bfetch\(|api\.(x|twitter)\.com|api\.linkedin\.com|oauth/i, `${f} must not talk to X or LinkedIn`);
  }
});
