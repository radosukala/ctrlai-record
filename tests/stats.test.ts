import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCount } from '../scripts/measure';
import { HN_THRESHOLD, MEASURED_ON, compact, signals, statsFor } from '../lib/stats';
import { ISSUES } from '../content/issues';
import { ENTRIES } from '../content/hall';
import type { Pick } from '../content/types';
import { existsSync, statSync } from 'node:fs';
import { mediaFor } from '../lib/media';

const base: Pick = { id: 'x', kind: 'video', title: 'T', creator: 'C', url: 'https://example.com/none', published: '2026-09-27', why: 'A sentence long enough to pass as a why line.', stance: 'measured' };

test('parses the counts YouTube shows', () => {
  assert.equal(parseCount('2.1K'), 2100);
  assert.equal(parseCount('3K'), 3000);
  assert.equal(parseCount('1,234'), 1234);
  assert.equal(parseCount('839'), 839);
  assert.equal(parseCount('1.2M'), 1200000);
  assert.equal(parseCount('no digits'), undefined);
});

test('compacts numbers the way the pages show them', () => {
  assert.equal(compact(206358), '206k');
  assert.equal(compact(1126609), '1.1M');
  assert.equal(compact(12583426), '13M');
  assert.equal(compact(4719), '4.7k');
  assert.equal(compact(705), '705');
});

test('the snapshot has a date, and every video and X post was measured', () => {
  assert.match(MEASURED_ON, /^\d{4}-\d{2}-\d{2}$/);
  const picks = [...ISSUES.flatMap(issue => issue.picks), ...ENTRIES];
  for (const pick of picks.filter(p => /youtube\.com|x\.com/.test(p.url))) {
    assert.ok(statsFor(pick.url)?.views, `${pick.url} has no view count; run npm run measure`);
  }
});

test('an X post shows how often it was kept and argued over, using replies', () => {
  const post = ISSUES[0].picks.find(pick => pick.url.includes('x.com'))!;
  const keys = signals(post, 'week').map(signal => signal.key);
  assert.deepEqual(keys, ['reach', 'pace', 'liked', 'kept', 'argued']);
});

test('the Hall of Fame counts views per year, the week counts views per day', () => {
  const video = ENTRIES.find(entry => entry.url.includes('youtube.com'))!;
  assert.equal(signals(video, 'hall').find(signal => signal.key === 'pace')?.label, 'a year');
  assert.equal(signals(video, 'week').find(signal => signal.key === 'pace')?.label, 'a day');
});

test(`Hacker News scores under ${HN_THRESHOLD} points stay hidden`, () => {
  const small = ENTRIES.find(entry => (statsFor(entry.url)?.hnPoints ?? HN_THRESHOLD) < HN_THRESHOLD);
  if (small) assert.ok(!signals(small, 'hall').some(signal => signal.key === 'hn'));
  const big = [...ISSUES[0].picks, ...ENTRIES].find(pick => (statsFor(pick.url)?.hnPoints ?? 0) >= HN_THRESHOLD);
  if (big) assert.ok(signals(big, 'hall').some(signal => signal.key === 'hn'));
});

test('a pick without numbers shows none, rather than zeros', () => {
  assert.deepEqual(signals(base, 'week'), []);
});

test('every video has a picture on this site, and nothing points at YouTube or X for images', () => {
  const picks = [...ISSUES.flatMap(issue => issue.picks), ...ENTRIES];
  for (const pick of picks) {
    const media = mediaFor(pick.url);
    if (pick.url.includes('youtube.com')) assert.equal(media?.type, 'youtube', `${pick.url} has no thumbnail; run npm run measure`);
    if (!media) continue;
    for (const image of [('image' in media ? media.image : undefined), (media.type === 'x' ? media.avatar : undefined)]) {
      if (!image) continue;
      assert.match(image, /^\/media\/[\w-]+\.jpg$/, `${image} must be a local copy`);
      const file = `public${image}`;
      assert.ok(existsSync(file), `${file} is missing`);
      assert.ok(statSync(file).size < 250_000, `${file} is over 250 KB`);
    }
  }
});
