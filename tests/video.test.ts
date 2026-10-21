import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DAYS, LATEST_DAY_RUN, dayEdition } from '../content/base/editions';
import { quotesOfTheDay } from '../lib/social-day';
import { listenFor, spokenLines, videoScript, words } from '../lib/video-script';
import { CREDITS_PER_CHAR, Narrator, spell, spoken, wordTimes } from '../lib/video-voice';

test('numbers are spelled out, so the voice never has to guess how to read a figure', () => {
  assert.equal(spell(0), 'zero');
  assert.equal(spell(20), 'twenty');
  assert.equal(spell(45), 'forty-five');
  assert.equal(spell(100), 'one hundred');
  assert.equal(spell(114), 'one hundred fourteen');
  assert.equal(spell(999), 'nine hundred ninety-nine');
});

test('names the voice would misread are respelled one word for one word, so the words still line up with the screen', () => {
  assert.equal(spoken('METR,'), 'Meter,');
  assert.equal(spoken('US'), 'U.S.');
  assert.equal(spoken('UN'), 'U.N.');
  assert.equal(spoken('arXiv'), 'archive');
  for (const same of ['AI', 'UNIDIR', 'DeepSeek', 'Anthropic', 'users']) assert.equal(spoken(same), same);
});

test('each word of a spoken line gets the time it starts, from the character times, even if a character is missing', () => {
  const chars = [...'ab cd e'];
  const a = { characters: chars, character_start_times_seconds: chars.map((_, i) => i * 0.1), character_end_times_seconds: chars.map((_, i) => i * 0.1 + 0.1) };
  assert.deepEqual(wordTimes('ab cd e', a).map(w => Math.round(w.start * 10)), [0, 3, 6]);
  const shorter = [...'ab cd e'].filter(c => c !== ' ');
  const b = { characters: shorter, character_start_times_seconds: shorter.map((_, i) => i * 0.1), character_end_times_seconds: shorter.map((_, i) => i * 0.1 + 0.1) };
  const times = wordTimes('ab cd e', b);
  assert.equal(times.length, 3);
  assert.ok(times[0].start <= times[1].start && times[1].start <= times[2].start, 'words stay in order');
});

test('the narrator says only our own lines: no run of eight words from any quotation, and each headline line lines up word for word with the screen', () => {
  for (const run of DAYS) {
    const ed = dayEdition(run)!;
    if (!ed.changes.length) continue;
    const script = videoScript(ed, quotesOfTheDay(run)[0]);
    const said = spokenLines(script).join(' ').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ');
    for (const e of ed.entries) {
      for (const q of e.quotes) {
        const w = words(q.text.toLowerCase().replace(/[^a-z0-9' ]+/g, ' '));
        // Our own note can echo a few of a quotation's words; eight in a row would be the quotation being read.
        for (let i = 0; i + 8 <= w.length; i++) assert.ok(!said.includes(w.slice(i, i + 8).join(' ')), `${run}: the narrator would read words from a quotation (${q.id})`);
      }
    }
    for (const c of script.changes) assert.equal(c.spoken.split(' ').length, c.note.length + c.lens.length, `${run}: spoken words and screen words differ in number`);
  }
});

test('a day’s narration is short enough to stay within what was agreed to spend', () => {
  const ed = dayEdition(LATEST_DAY_RUN)!;
  const chars = spokenLines(videoScript(ed, quotesOfTheDay(LATEST_DAY_RUN)[0])).reduce((n, l) => n + l.length, 0);
  assert.ok(chars <= 1300, `${chars} characters is more than a daily video should send`);
});

test('the narrator counts what a run would send before sending it, and refuses to send more than it was allowed', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'narrator-'));
  const narrator = new Narrator(dir, 10);
  assert.equal(narrator.cost(['hello there', 'hello there', 'again']), 'hello there'.length + 'again'.length, 'a line said twice is sent once');
  await assert.rejects(() => narrator.say('this line is much longer than the ten characters allowed'), /Stopped before sending/);
  assert.equal(narrator.sent, 0);
});

test('the narrator’s ledger counts a month’s credits from what each kept line recorded', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-'));
  const put = (name: string, meta: object) => fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ file: '', seconds: 1, words: [], ...meta }));
  put('a', { chars: 100, credits: 40, at: '2026-10-03T10:00:00Z' }); // the service's own figure wins
  put('b', { chars: 200, at: '2026-10-04T10:00:00Z' }); // else characters at the rate seen on this account
  put('c', { chars: 999, credits: 999, at: '2026-09-30T10:00:00Z' }); // another month
  const narrator = new Narrator(dir, 1000);
  assert.equal(narrator.spent('2026-10'), Math.round(40 + 200 * CREDITS_PER_CHAR));
  assert.equal(narrator.spent('2026-09'), 999);
  assert.equal(narrator.spent('2026-08'), 0);
});

test('the report names the words to listen for: what was respelled for the voice, names with capitals inside, and the speaker', () => {
  const script = { intro: '', changes: [{ kind: '', outlet: '', date: '', note: ['METR', 'warns', 'DeepSeek', 'and', 'the', 'US', 'agencies'], lens: ['plain', 'words', 'only'], spoken: '' }] };
  const list = listenFor(script, 'Robin Geiss');
  assert.ok(list.some(w => /^METR \(spoken “Meter”\)$/.test(w)));
  assert.ok(list.includes('DeepSeek'));
  assert.ok(list.includes('Robin Geiss'));
  assert.ok(!list.some(w => /plain|agencies|warns/.test(w)), 'ordinary words are not listed');
});

test('the Video step of the daily finish can never stop the run, and the MP4 stays out of the archive', () => {
  const finish = fs.readFileSync(path.join(import.meta.dirname, '..', 'scripts/radar/daily-finish.sh'), 'utf8');
  const step = finish.slice(finish.indexOf('echo "== Video"'), finish.indexOf('echo "== Archive"'));
  assert.ok(step.length > 0, 'no Video step');
  assert.match(step, /else echo "WARNING: the video could not be made/, 'a failed video only warns');
  assert.match(step, /\|\| true/, 'a missing line or file does not stop it under set -e');
  assert.match(step, /--voice/);
  assert.doesNotMatch(step.replace(/^#.*$/gm, ''), /\.mp4/, 'the MP4 is not copied into the run folder, which is archived');
});
