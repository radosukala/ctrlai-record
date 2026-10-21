import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DAYS, dayEdition } from '../content/base/editions';
import { nameOf } from '../content/base';
import { MOMENTS, momentFor } from '../content/base/moments';
import type { Entry, Quote } from '../content/base/types';
import { LINKEDIN_LIMIT, X_LIMIT, xLength } from '../lib/social';
import { REST_DAYS, cardable, dateLabel, dayKit, linkedinQuotePost, xQuotePost, momentCard, postsMarkdown, quoteCard, quoteLink, quotesOfTheDay, readElsewhere, sentences } from '../lib/social-day';

const ROOT = path.join(import.meta.dirname, '..');

for (const run of DAYS) {
  const kit = dayKit(run)!;

  test(`posts for ${run}: the card's quotation passes every rule, and the X post fits`, () => {
    if (!kit.quote) return;
    const { e, q } = kit.quote;
    assert.ok(cardable(q, e), `${q.id} should not be on a card`);
    assert.ok(e.quotes.includes(q), 'the quotation is one of its entry’s checked quotations');
    assert.ok(kit.x!.length <= X_LIMIT, `X post is ${kit.x!.length} characters`);
    // A quotation with a moment sends readers to the page that plays it; any other to its entry.
    assert.match(kit.x!.reply, momentFor(q.id)
      ? new RegExp(`^https://ctrlai\\.com/moment/${q.id}\\?utm_source=x&utm_medium=social&utm_campaign=day-${run}$`)
      : new RegExp(`^https://ctrlai\\.com/base/${e.slug}\\?utm_source=x&utm_medium=social&utm_campaign=day-${run}#${q.id}$`));
    if (e.conflict) assert.match(kit.x!.text, /written with Claude/, 'a post about Anthropic says who writes Ctrl AI');
    // The words come before a title or a date: if the whole quotation fits with the shortest attribution, it is there.
    const shortest = `${nameOf(q.speaker)}, ${q.hand === 'reported' ? `via ${e.outlet}` : e.outlet}:\n\n“${q.text}”\n\n${momentFor(q.id) ? 'Watch it below, checked word for word.' : 'Checked word for word. Link below.'}${e.conflict ? '\n\nCtrl AI is written with Claude (Anthropic).' : ''}`;
    if (xLength(shortest) <= X_LIMIT) assert.ok(kit.x!.text.includes(`“${q.text}”`), `${run}: the quotation was dropped for a title`);
    for (const alt of kit.alternatives) assert.ok(cardable(alt.q, alt.e));
    const people = [kit.quote, ...kit.alternatives].map(p => p.q.speaker);
    assert.equal(new Set(people).size, people.length, 'one quotation per person');
  });

  test(`posts for ${run}: LinkedIn carries the day's changes in our words, the link in the first comment`, () => {
    const ed = dayEdition(run)!;
    if (!ed.changes.length) return assert.equal(kit.linkedinToday, undefined);
    assert.ok(kit.linkedinToday!.length <= LINKEDIN_LIMIT);
    for (const { e } of ed.changes.slice(0, 3)) {
      assert.ok(kit.linkedinToday!.text.includes(e.change!.note.replace(/[.\s]+$/, '')), 'each change in our words');
      assert.ok(kit.linkedinToday!.text.includes(`(${e.outlet}).`), 'each change names where it was reported');
    }
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
    // Tiers 0, 1, 2 and 4 require someone not quoted in the rest days; a repeat can only come from tier 3 or 5.
    if (before.includes(p.q.speaker)) assert.ok(p.tier === 3 || p.tier === 5, `${DAYS[i]} repeats ${p.q.speaker} from tier ${p.tier}`);
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
  for (const f of ['lib/social-day.ts', 'scripts/social-day.tsx', 'scripts/social-video.tsx', 'lib/video-frames.tsx']) {
    const source = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.doesNotMatch(source, /\bfetch\(|api\.(x|twitter)\.com|api\.linkedin\.com|oauth/i, `${f} must not talk to X or LinkedIn`);
  }
});

test('the reading agents are told to write lines that stand alone, since posts and cards show them without a title', () => {
  const brief = fs.readFileSync(path.join(ROOT, 'radar/AGENT-BRIEF.md'), 'utf8');
  assert.match(brief, /\*\*Lines that stand alone\*\*/);
  assert.match(brief, /name who did what/);
});

test('a quotation with a moment comes first when it meets the first rule, may be from automatic captions, and is linked to its own page', () => {
  const withMoment = Object.keys(MOMENTS)[0];
  // Automatic captions are out for a card, unless the reader can hear the words on the quotation's page.
  assert.ok(!cardable(quote(), entry({ transcript: 'auto' })));
  assert.ok(cardable(quote({ id: withMoment }), entry({ transcript: 'auto' })));
  for (const run of DAYS) {
    const ranked = quotesOfTheDay(run);
    const first = ranked.filter(p => p.tier === 0);
    assert.ok(first.every(p => momentFor(p.q.id)), `${run}: a quotation without a moment in the moment tier`);
    assert.deepEqual(ranked.slice(0, first.length), first, `${run}: the moment tier is not first`);
    for (const p of ranked) {
      const url = new URL(quoteLink(p, 'x', run));
      assert.equal(url.pathname, momentFor(p.q.id) ? `/moment/${p.q.id}` : `/base/${p.e.slug}`);
      assert.equal(url.searchParams.get('utm_source'), 'x');
    }
  }
  // At least one day's card is a moment, so the kit is using them.
  assert.ok(DAYS.some(run => quotesOfTheDay(run)[0]?.tier === 0), 'no day picked a moment');
});

test('the moment card says the same as the quotation card, and the second in the recording; none without a moment', () => {
  const run = DAYS.find(r => quotesOfTheDay(r)[0]?.tier === 0)!;
  const p = quotesOfTheDay(run)[0];
  const card = momentCard(p, 'x')!;
  const plain = quoteCard(p, 'x');
  assert.equal(card.quote, plain.quote);
  assert.equal(card.who, plain.who);
  assert.equal(card.label, plain.label);
  assert.match(card.source, / · at \d+:\d\d$/);
  assert.ok(card.seconds > 2 && card.seconds < 90);
  const without = quotesOfTheDay(run).find(x => !momentFor(x.q.id));
  if (without) assert.equal(momentCard(without, 'x'), undefined);
});

test('a first-hand recording published days after it was made is "Said", not "Quoted by"', () => {
  const p = { e: entry({ outlet: 'The Show', published: '2026-10-16', slug: 's' } as Partial<Entry>), q: quote({ hand: 'first', said: '2026-10-12' }) };
  assert.match(quoteCard(p, 'x').label, /^Said · Oct 12, 2026$/);
  const printed = { e: p.e, q: quote({ hand: 'reported', said: '2026-10-12' }) };
  assert.match(quoteCard(printed, 'x').label, /^Quoted by The Show/);
});

test('a video or podcast with no recorded date is labelled with the day it was published, not "Said"', () => {
  const e = (kind: Entry['kind']) => entry({ kind, outlet: 'The Show', published: '2026-10-16', slug: 's' } as Partial<Entry>);
  assert.equal(dateLabel({ e: e('video'), q: quote({ hand: 'first' }) }), 'Video · Oct 16, 2026');
  assert.equal(dateLabel({ e: e('podcast'), q: quote({ hand: 'first' }) }), 'Podcast · Oct 16, 2026');
  // The entry says when it was said: that is the date.
  assert.equal(dateLabel({ e: e('video'), q: quote({ hand: 'first', said: '2026-10-12' }) }), 'Said · Oct 12, 2026');
  // Text and hearings keep "Said".
  assert.equal(dateLabel({ e: e('hearing'), q: quote({ hand: 'first' }) }), 'Said · Oct 16, 2026');
  assert.equal(dateLabel({ e: e('essay'), q: quote({ hand: 'first' }) }), 'Said · Oct 16, 2026');
});

test('a recording published days after it was made says "recorded" before the date it was made, in both posts', () => {
  const p = { e: entry({ kind: 'podcast', outlet: 'The Show', published: '2026-10-16', slug: 's' } as Partial<Entry>), q: quote({ hand: 'first', said: '2026-10-12' }) };
  assert.match(linkedinQuotePost(p, '2026-10-20').text, /The Show, recorded October 12, 2026:/);
  assert.match(xQuotePost(p, '2026-10-20').text, /The Show, recorded Oct 12:/);
  const sameDay = { e: p.e, q: quote({ hand: 'first' }) };
  assert.doesNotMatch(linkedinQuotePost(sameDay, '2026-10-20').text, /recorded/);
});

test('the day video is made only of our own material: no downloaded footage, audio or thumbnails', () => {
  for (const f of ['scripts/social-video.tsx', 'lib/video-frames.tsx']) {
    const source = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.doesNotMatch(source, /yt-dlp|ytimg|posterFor|posterDataUri/i, `${f} must not use anyone else's footage or picture`);
  }
});
