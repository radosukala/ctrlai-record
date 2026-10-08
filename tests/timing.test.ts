import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DURATION } from '../content/incidents/openai-hf/film';
import { FILM_DURATION, SPEECH, SPEECH_MARGIN, WARP, buildWarp, speechItems } from '../content/incidents/openai-hf/timing';
import type { VoiceManifest } from '../content/incidents/openai-hf/voices';

/**
 * Screen time and film time. The film is written in screen time (what is on screen when, long enough to be read); it plays in film time,
 * which runs slower than screen time wherever a voice needs longer than that. These tests hold the slowing to what it promises: every
 * voice fits its words, no two voices speak at once, nothing runs backwards, and with no voices the film is exactly as written.
 */

const report = (bad: string[]) => assert.equal(bad.length, 0, `\n  ${bad.join('\n  ')}\n`);

test('with no voices the film plays exactly as written', () => {
  const none = buildWarp([]);
  assert.ok(Math.abs(none.duration - DURATION) < 1e-6);
  assert.equal(none.max, 1);
  for (const t of [0, 1, 100.5, DURATION]) { assert.ok(Math.abs(none.toFilm(t) - t) < 1e-6); assert.ok(Math.abs(none.toScreen(t) - t) < 1e-6); }
  const empty: VoiceManifest = { version: 1, provider: null, draft: false, lines: {} };
  assert.equal(speechItems(empty).length, 0);
});

test('the slowing never runs backwards, is never faster than screen time, and can be undone', () => {
  const bad: string[] = [];
  let prev = -1;
  for (let t = 0; t <= DURATION; t += 0.37) {
    const f = WARP.toFilm(t);
    if (!(f > prev)) bad.push(`film time does not advance at screen time ${t.toFixed(2)}`);
    prev = f;
    if (WARP.rho(t) < 1 - 1e-9) bad.push(`the film runs faster than screen time at ${t.toFixed(1)} s`);
    if (Math.abs(WARP.toScreen(f) - t) > 0.02) bad.push(`screen ${t.toFixed(2)} → film ${f.toFixed(2)} → screen ${WARP.toScreen(f).toFixed(2)}`);
  }
  assert.ok(Math.abs(WARP.toFilm(DURATION) - FILM_DURATION) < 1e-6);
  assert.ok(FILM_DURATION >= DURATION);
  assert.ok(Math.abs(WARP.added - (FILM_DURATION - DURATION)) < 1e-6);
  // The pace is eased: it never jumps by more than a little from one moment to the next.
  for (let t = 0.1; t <= DURATION; t += 0.1) if (Math.abs(WARP.rho(t) - WARP.rho(t - 0.1)) > 0.12) bad.push(`the pace jumps at ${t.toFixed(1)} s (${WARP.rho(t - 0.1).toFixed(2)} → ${WARP.rho(t).toFixed(2)})`);
  // And it is never slower than the film can bear.
  if (WARP.max > 2.2) bad.push(`the film slows by ${WARP.max.toFixed(2)} times: give those captions more time or the voice a faster setting`);
  report(bad);
});

test('every voice has room to say its words before they leave the screen, and no two voices speak at once', () => {
  const bad: string[] = [];
  const clips = SPEECH.map(i => ({ ...i, from: WARP.toFilm(i.a), to: WARP.toFilm(i.a) + i.seconds, windowEnd: WARP.toFilm(i.b) })).sort((x, y) => x.from - y.from);
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    if (c.to > c.windowEnd - SPEECH_MARGIN + 1e-3) bad.push(`${c.channel} ${c.id} speaks until film time ${c.to.toFixed(2)} s, but its words leave the screen at ${c.windowEnd.toFixed(2)} s`);
    if (i && clips[i - 1].to > c.from + 1e-3) bad.push(`${clips[i - 1].channel} ${clips[i - 1].id} is still speaking when ${c.channel} ${c.id} starts`);
  }
  report(bad);
});
