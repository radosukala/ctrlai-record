import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoDuration, itemId, parseFeed, parseYouTubeVideos, uploadsPlaylist, type Source } from '../scripts/radar/feeds';

const SRC: Source = { id: 'yt-test', name: 'Test channel', kind: 'youtube', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCXl4i9dYBrFOabk0xGmbkRA', tier: 1, filter: 'general' };

test('a channel feed URL gives the channel’s uploads playlist', () => {
  assert.equal(uploadsPlaylist(SRC.url), 'UUXl4i9dYBrFOabk0xGmbkRA');
  assert.equal(uploadsPlaylist('https://example.com/feed'), undefined);
});

test('ISO 8601 lengths read as seconds', () => {
  assert.equal(isoDuration('PT1M19S'), 79);
  assert.equal(isoDuration('PT2H5M'), 7500);
  assert.equal(isoDuration('P1DT1S'), 86401);
  assert.equal(isoDuration('P0D'), undefined);
  assert.equal(isoDuration('soon'), undefined);
});

test('a video read through the API is the same item, with the same id, as through the RSS feed', () => {
  const rss = parseFeed(SRC, `<feed><entry><id>yt:video:abc123</id><yt:videoId>abc123</yt:videoId><title>AI safety &amp; control</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=abc123"/><author><name>Test channel</name></author>
    <published>2026-10-12T17:40:51+00:00</published><media:group><media:description>About alignment.</media:description>
    <media:community><media:statistics views="90714"/></media:community></media:group></entry></feed>`);
  const api = parseYouTubeVideos(SRC, JSON.stringify({ items: [
    { id: 'abc123', snippet: { title: 'AI safety & control', description: 'About alignment.', publishedAt: '2026-10-12T17:40:51Z', channelTitle: 'Test channel', liveBroadcastContent: 'none' }, contentDetails: { duration: 'PT1H2M3S' }, statistics: { viewCount: '90714' } },
    { id: 'later', snippet: { title: 'Premiere tomorrow', publishedAt: '2026-10-14T10:00:00Z', liveBroadcastContent: 'upcoming' } },
  ] }));
  assert.equal(api.length, 1, 'an upcoming premiere has nothing to read yet');
  const [a, r] = [api[0], rss[0]];
  assert.equal(a.id, r.id);
  assert.equal(a.id, itemId('https://www.youtube.com/watch?v=abc123'));
  for (const k of ['url', 'title', 'excerpt', 'author', 'videoId', 'views'] as const) assert.equal(a[k], r[k], k);
  assert.equal(Date.parse(a.published), Date.parse(r.published));
  assert.equal(a.durationSec, 3723);
});

test('a stream is dated by when it went out, so the run after it aired still finds it', () => {
  const [it] = parseYouTubeVideos(SRC, JSON.stringify({ items: [
    { id: 'brief1', snippet: { title: 'Press briefing', publishedAt: '2026-10-12T19:47:21Z', liveBroadcastContent: 'none' }, liveStreamingDetails: { actualStartTime: '2026-10-13T13:34:02Z' } },
  ] }));
  assert.equal(it.published, '2026-10-13T13:34:02Z');
});
