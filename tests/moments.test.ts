import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENTRIES } from '../content/base';
import { COUNTS, DAYS, LATEST_DAY_RUN, dayEdition, heardOf, monthEdition, weekEdition } from '../content/base/editions';
import { MOMENTS } from '../content/base/moments';
import { alignWords, captionWords, momentOf, wordsSaid, type Caption } from '../lib/moments';

const CAPTIONS: Caption[] = [
  { start: 100, text: 'so for that I think we need standards' },
  { start: 102, text: 'and guardrails that are joint. And I' },
  { start: 104, text: 'just want to be clear because we' },
  { start: 108, text: 'sometimes forget. We need standards' },
];

test('captions are spread into words that keep their order, one cue at a time, never stretched across a silence', () => {
  const words = captionWords(CAPTIONS);
  assert.equal(words.length, 8 + 7 + 7 + 5);
  for (let i = 1; i < words.length; i++) assert.ok(words[i].start >= words[i - 1].start, `word ${i} starts before the one ahead of it`);
  // The cue at 104 runs 4 s to the next one, but six words get at most 0.55 s each.
  assert.ok(words.filter(w => w.start >= 104 && w.start < 108).every(w => w.end <= 104 + 7 * 0.55 + 0.01), 'a cue stretched across the silence');
});

test('a quotation is timed word by word at the place its words are said, near the second the Base recorded', () => {
  const m = momentOf('abc123', 'And guardrails that are joint.', 102, CAPTIONS)!;
  assert.ok(m);
  assert.equal(m.v, 'abc123');
  assert.equal(m.t.length, 5);
  assert.ok(m.t[0] >= 102 && m.t[0] < 102.5, `first word at ${m.t[0]}`);
  assert.ok(m.from < m.t[0] && m.to > m.t[m.t.length - 1]);
  for (let i = 1; i < m.t.length; i++) assert.ok(m.t[i] >= m.t[i - 1]);
});

test('the same words said again elsewhere in the recording are not mistaken for the quotation', () => {
  // "We need standards" is said at 100 and again at 108; the Base recorded 108.
  const m = momentOf('abc123', 'We need standards', 108, CAPTIONS)!;
  assert.ok(m.t[0] >= 108, `timed at ${m.t[0]}, the first time it was said`);
});

test('a last word is not matched to a later copy of the same word, and a word the captions dropped is placed between its neighbours', () => {
  const heard = captionWords([
    { start: 10, text: 'we have got to put controls on AI' },
    { start: 14, text: 'and then something else entirely about' },
    { start: 22, text: 'AI again and again' },
  ]);
  const { starts, end } = alignWords('we have got to put controls on AI'.split(' '), heard);
  assert.ok(starts[7] < 14 && end <= 14.01, `the last word was taken from ${starts[7]}`);
  const dropped = alignWords('we have really got to put controls'.split(' '), heard);
  assert.ok(dropped.starts[2] > dropped.starts[1] && dropped.starts[2] < dropped.starts[3], 'the dropped word sits between its neighbours');
});

test('a quotation the captions do not carry gets no moment', () => {
  assert.equal(momentOf('abc123', 'Nothing like anything said in this recording at all', 102, CAPTIONS), undefined);
});

test('words are said by the time they start, with a little lead', () => {
  const m = { t: [10, 10.5, 11, 12] };
  assert.equal(wordsSaid(m, 9), 0);
  assert.equal(wordsSaid(m, 10), 1);
  assert.equal(wordsSaid(m, 10.4), 2);
  assert.equal(wordsSaid(m, 11.9), 4);
  assert.equal(wordsSaid(m, 99), 4);
});

test('every published moment belongs to a certain-speaker, timed quotation, with one time for each of its words, in order, near its recorded second', () => {
  const quotes = new Map(ENTRIES.flatMap(e => e.quotes.map(q => [q.id, q] as const)));
  assert.ok(Object.keys(MOMENTS).length > 0);
  for (const [id, m] of Object.entries(MOMENTS)) {
    const q = quotes.get(id);
    assert.ok(q, `${id} is a moment of a quotation that is no longer in the Base`);
    assert.ok(q.speakerCertain && q.at !== undefined, `${id} has no certain speaker or no time`);
    assert.match(m.v, /^[\w-]{11}$/, `${id} has no YouTube id`);
    assert.equal(m.t.length, q.text.replace(/\s+/g, ' ').trim().split(' ').length, `${id} has a time for every word`);
    for (let i = 1; i < m.t.length; i++) assert.ok(m.t[i] >= m.t[i - 1], `${id} word ${i} is before the word ahead of it`);
    assert.ok(m.from <= m.t[0] && m.t[m.t.length - 1] <= m.to, `${id} words fall outside the moment`);
    assert.ok(m.to - m.from < 90, `${id} runs ${m.to - m.from} s`);
    assert.ok(Math.abs(m.t[0] - q.at!) < 40, `${id} starts ${m.t[0] - q.at!} s from the second the Base recorded`);
  }
});

test('Heard: playable quotations, one voice per person on the page, none shouting, never more than an edition asks for', () => {
  for (const ed of [dayEdition(LATEST_DAY_RUN)!, weekEdition(), monthEdition(LATEST_DAY_RUN.slice(0, 7))]) {
    assert.ok(ed.heard.length <= COUNTS[ed.horizon].heard);
    const people = [...ed.changes.flatMap(c => (c.q ? [c.q.speaker] : [])), ...ed.heard.map(h => h.q.speaker), ...ed.said.map(s => s.q.speaker)];
    assert.equal(new Set(people).size, people.length, `${ed.key} quotes someone twice`);
    for (const { q } of ed.heard) {
      assert.ok(MOMENTS[q.id], `${q.id} has no moment`);
      assert.notEqual(q.text, q.text.toUpperCase(), `${q.id} is in capitals`);
    }
  }
  assert.ok(DAYS.length > 0 && heardOf([], 3).length === 0);
});
