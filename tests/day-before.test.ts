import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { CARDS, quoteHtml, type QuoteCard } from '../content/scenarios/day-before/cards';
import verification from '../content/scenarios/day-before/verification.json';
import { FILM } from '../content/scenarios/day-before/film';
import { DISCLOSURE, TAG } from '../components/scenario/player';
import type { Cue } from '../components/scenario/types';

/**
 * The rules "The day before" promises its viewers, enforced. Every real quotation is checked against where it came from by
 * scripts/verify-day-before.ts (the texts are copyrighted and live outside the repository); this file checks that every
 * card has passed and has not been edited since, that no placeholder is left in the film, and that the timeline holds
 * together: the layout rules that kept cards from covering the options, the pauses, the disclosures.
 */

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const quoteCards = Object.values(CARDS).filter((c): c is QuoteCard => !c.placeholder);
const cardCues = FILM.cues.filter((c): c is Extract<Cue, { k: 'card' }> => c.k === 'card');

test('every real quotation was verified exactly, and has not been edited since', () => {
  assert.ok(quoteCards.length >= 30);
  const results = verification.results as Record<string, { ok: boolean; mode?: string; quoteSha: string; via: string }>;
  for (const c of quoteCards) {
    const r = results[c.id];
    assert.ok(r, `${c.id} has no verification record: run scripts/verify-day-before.ts`);
    assert.ok(r.ok, `${c.id} did not verify`);
    assert.equal(r.mode, 'exact', `${c.id} matched only as words, not exactly`);
    assert.equal(r.quoteSha, sha(c.quote), `${c.id} was edited after it was verified: re-run scripts/verify-day-before.ts`);
    assert.ok('base' in c.check ? r.via === 'base' : 'incident' in c.check ? r.via === 'incident' : r.via === 'file', `${c.id} was checked another way than its card says`);
  }
  assert.equal(Object.keys(results).length, quoteCards.length, 'verification.json has records for cards that no longer exist');
});

test('every card can be traced: a link to read it, and a written limit where the fit is partial', () => {
  for (const c of quoteCards) {
    if ('file' in c.check) assert.match(c.url ?? '', /^https:\/\//, `${c.id} is checked against a saved page but has no link to read it`);
    if (c.note) assert.ok(!/[“”]/.test(c.note), `${c.id}: a limit is in our words and does not use quotation marks`);
  }
  // Two voices stand in for a side they only partly fit: their limits must be on the page.
  for (const id of ['ncsc-premature', 'trump-race', 'irish-assembly', 'vandamme-accountability', 'courant-watered-down']) {
    const c = CARDS[id] as QuoteCard;
    assert.ok(c.note && c.note.length > 40, `${id} stands in for a side it only partly fits, and says nothing about it`);
  }
});

test('a card shows exactly the words that were checked, with the highlighter laid under words inside them', () => {
  for (const c of quoteCards) {
    const n = words(c.quote);
    assert.ok(n >= 6 && n <= 60, `${c.id} is ${n} words: a card quotes between 6 and 60`);
    assert.ok(c.chip && c.kind && c.src, `${c.id} is missing who, what or where`);
    assert.ok(c.marks.length >= 1, `${c.id} has nothing highlighted`);
    for (const m of c.marks) assert.ok(c.quote.includes(m), `${c.id}: highlighted words are not in the quotation: ${m}`);
    const shown = quoteHtml(c).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/ …$/, '');
    assert.equal(shown, c.quote, `${c.id}: what the card shows is not what was checked`);
    assert.equal(/…$/.test(quoteHtml(c)), Boolean(c.cut), `${c.id}: the ellipsis and the cut flag disagree`);
  }
});

test('no placeholder is in the film, and every card cue points at a card that exists', () => {
  assert.ok(!Object.values(CARDS).some(c => c.placeholder), 'a placeholder card is still defined: a film with one does not go out');
  for (const cue of cardCues) {
    assert.ok(CARDS[cue.id], `the film shows an unknown card: ${cue.id}`);
    assert.ok(!cue.gap, `${cue.id} is a placeholder`);
    assert.ok(cue.src, `${cue.id} is shown without a source`);
  }
  const used = new Set(cardCues.map(c => c.id));
  for (const c of quoteCards) assert.ok(used.has(c.id), `${c.id} is in the library but never shown`);
});

test('cards on screen together are on opposite sides, so none covers another', () => {
  const edge = 0.6;
  for (const a of cardCues) for (const b of cardCues) {
    if (a === b || a.side !== b.side) continue;
    const overlap = Math.min(a.b, b.b) - Math.max(a.a, b.a);
    assert.ok(overlap <= edge, `${a.id} and ${b.id} are both on the ${a.side} for ${overlap.toFixed(1)} s`);
  }
});

test('the film is one unbroken timeline of scenes, with every cue inside it', () => {
  assert.equal(FILM.scenes[0].t0, 0);
  assert.equal(FILM.scenes.at(-1)!.t1, FILM.duration);
  FILM.scenes.forEach((s, i) => { if (i) assert.equal(s.t0, FILM.scenes[i - 1].t1, `a gap before scene ${s.id}`); assert.ok(s.t1 > s.t0); });
  for (const c of FILM.cues) { assert.ok(c.b > c.a, `a ${c.k} cue ends before it starts`); assert.ok(c.a >= 0 && c.b <= FILM.duration + 0.01, `a ${c.k} cue runs outside the film`); }
  assert.deepEqual(FILM.stops, [...new Set(FILM.stops)].sort((a, b) => a - b));
  assert.ok(FILM.duration > 600 && FILM.duration < 1200, `the film is ${FILM.duration} s`);
});

test('there are five decisions; each pauses inside its scene with its question and options up', () => {
  assert.equal(FILM.decisions.length, 5);
  const asks = FILM.cues.filter((c): c is Extract<Cue, { k: 'ask' }> => c.k === 'ask');
  assert.equal(asks.length, 5);
  assert.equal(new Set(FILM.decisions.map(d => d.id)).size, 5);
  for (const d of FILM.decisions) {
    const scene = FILM.scenes.find(s => d.pauseAt > s.t0 && d.pauseAt < s.t1);
    assert.ok(scene, `${d.id} pauses outside every scene`);
    assert.ok(d.pauseAt - scene.t0 > 5, `${d.id} pauses before it has been set up`);
    assert.ok(d.hold >= 5, `${d.id} leaves the viewer ${d.hold} s with the options`);
    assert.deepEqual(d.opts.map(o => o.k), ['A', 'B', 'C']);
    assert.ok(d.opts.some(o => d.example === `${o.k} · ${o.b}`), `${d.id}: the example is not one of its options`);
    const ask = asks.find(a => a.id === d.id);
    assert.ok(ask, `${d.id} has no question on screen`);
    assert.ok(ask.a < d.pauseAt && ask.b > d.pauseAt + d.hold, `${d.id}: the question is not up for the whole choice`);
    assert.ok(ask.b <= scene.t1 + 0.01, `${d.id}: the question outlasts its scene`);
  }
});

test('every frame can be drawn: finite camera, a fade between 0 and 1, and the same frame every time', () => {
  for (let t = 0; t < FILM.duration; t += 3.7) {
    const f = FILM.frameAt(t);
    assert.ok(f.black >= 0 && f.black <= 1, `black ${f.black} at ${t}`);
    for (const v of [...f.state.cam.pos, ...f.state.cam.look, f.state.cam.fov]) assert.ok(Number.isFinite(v), `camera is not finite at ${t}`);
    assert.equal(JSON.stringify(FILM.frameAt(t).state), JSON.stringify(f.state), `frame at ${t} is not a pure function of time`);
  }
});

test('the exercise says what it is, says what is imagined, and says who made it', () => {
  assert.equal(TAG, 'EXERCISE · NOT REAL');
  assert.match(DISCLOSURE, /imagined/);
  assert.match(DISCLOSURE, /real quotations/);
  const titles = FILM.cues.filter((c): c is Extract<Cue, { k: 'title' }> => c.k === 'title');
  assert.ok(titles.length >= 2 && /rehearsal/i.test(titles[0].eyebrow), 'the opening title does not call it a rehearsal');
  assert.match(titles[0].sub, /Axios reported/, 'the opening claim about the companies is not attributed');
  assert.match(titles.at(-1)!.sub, /Axios reported/, 'the closing claim about the companies is not attributed');
  // The film names Anthropic (on cards and in the story), and it was written with Claude, made by Anthropic: it has to say so.
  const namesAnthropic = quoteCards.some(c => /Anthropic/.test(c.chip + c.kind + c.quote));
  const notes = FILM.cues.filter((c): c is Extract<Cue, { k: 'note' }> => c.k === 'note');
  assert.ok(!namesAnthropic || notes.some(n => /Claude/.test(n.html) && /Anthropic/.test(n.html)), 'the film names Anthropic but does not say it was written with Claude');
  // Ctrl AI has an interest in the last decision's third option: the viewer sees that while choosing.
  const rules = FILM.cues.find((c): c is Extract<Cue, { k: 'ask' }> => c.k === 'ask' && c.id === 'rules');
  assert.match(rules?.p ?? '', /Disclosure: Ctrl AI/);
});

test('our own words use no gendered pronouns for anyone, and never print a quotation that is not on a card', () => {
  const ours: string[] = [];
  for (const c of FILM.cues) {
    if (c.k === 'caption') ours.push(c.text);
    else if (c.k === 'stamp') ours.push(c.head, c.text ?? '');
    else if (c.k === 'label') ours.push(c.text);
    else if (c.k === 'hyp') ours.push(c.kicker, ...c.items.flatMap(i => [i.b, i.s]));
    else if (c.k === 'ask') ours.push(c.h, c.p ?? '');
    else if (c.k === 'title') ours.push(c.eyebrow, c.h, c.sub);
    else if (c.k === 'ledger') ours.push(c.kicker, c.h, c.foot);
    else if (c.k === 'note') ours.push(c.html);
  }
  for (const d of FILM.decisions) ours.push(d.name, d.example, ...d.opts.map(o => o.b));
  for (const text of ours) {
    assert.ok(!/\b(he|she|his|her|hers|him|himself|herself)\b/i.test(text), `a gendered pronoun in our own words: ${text}`);
    assert.ok(!/[“”]/.test(text.replace(/<[^>]+>/g, '')), `our words put something in quotation marks (only cards quote): ${text}`);
  }
});

// ——— The narrator ———————————————————————————————————————————————————————————————————————————————————————————————————

import fs from 'node:fs';
import { mp3Seconds } from '../lib/film-voices';
import { NARRATION } from '../content/scenarios/day-before/film';
import { ADDED_WORDS, lineId, spokenText, type VoiceManifest } from '../content/scenarios/day-before/narration';
import voices from '../content/scenarios/day-before/voices.manifest.json';

const manifest = voices as unknown as VoiceManifest;
const wordsIn = (s: string) => s.toLowerCase().replace(/’/g, "'").replace(/[^a-z0-9' -]+/g, ' ').split(/[\s-]+/).filter(Boolean);

test('the narrator says our own words and nothing else: no digits, nothing added but numbers, clock words and spelled-out letters, and no card read aloud', () => {
  assert.ok(NARRATION.length >= 25);
  assert.equal(new Set(NARRATION.map(l => l.id)).size, NARRATION.length, 'two different lines share a name');
  const cardWords = quoteCards.map(c => c.quote);
  for (const l of NARRATION) {
    assert.equal(l.id, lineId(l.spoken));
    assert.equal(l.spoken, spokenText(l.shown));
    assert.ok(!/\d/.test(l.spoken), `a digit in what is said: ${l.spoken}`);
    const shown = new Set(wordsIn(l.shown.replace(/<[^>]+>/g, '')));
    for (const w of wordsIn(l.spoken)) assert.ok(shown.has(w) || ADDED_WORDS.has(w), `the narrator adds “${w}” to: ${l.shown}`);
    for (const q of cardWords) assert.ok(!l.spoken.includes(q.slice(0, 40)), `the narrator reads a card aloud: ${q.slice(0, 40)}`);
  }
});

test('every line is recorded, on a paid plan, for the words as they are now, and the files are there', () => {
  assert.equal(manifest.provider, 'elevenlabs');
  for (const l of NARRATION) {
    const m = manifest.lines[l.id];
    assert.ok(m, `${l.id} is not recorded: ${l.spoken}`);
    assert.equal(m.text, l.spoken, `${l.id}: the words changed after it was recorded`);
    assert.equal(m.paid, true, `${l.id} was not made on a paid plan`);
    assert.equal(m.voice, 'Daniel');
    const file = `public/day-before/voices/${m.file}`;
    assert.ok(fs.existsSync(file), `${file} is missing`);
    assert.ok(Math.abs(mp3Seconds(new Uint8Array(fs.readFileSync(file))) - m.seconds) < 0.06, `${l.id}: the manifest's length is not the file's`);
  }
  assert.equal(Object.keys(manifest.lines).length, NARRATION.length, 'recordings of lines the film no longer says are still listed');
  const files = new Set(Object.values(manifest.lines).map(m => m.file));
  for (const f of fs.readdirSync('public/day-before/voices')) assert.ok(files.has(f), `public/day-before/voices/${f} belongs to no line`);
});

test('the voice never talks over itself, is never cut by a pause or the end of its scene, and a caption waits for it', () => {
  const clips = FILM.clips ?? [];
  assert.ok(clips.length >= NARRATION.length);
  const sorted = [...clips].sort((a, b) => a.at - b.at);
  sorted.forEach((c, i) => { if (i) assert.ok(c.at >= sorted[i - 1].at + sorted[i - 1].dur + 0.3 - 1e-6, `${c.id} starts over the line before it`); });
  const caps = FILM.cues.filter((c): c is Extract<Cue, { k: 'caption' }> => c.k === 'caption');
  for (const c of clips) {
    const scene = FILM.scenes.find(s => c.at >= s.t0 && c.at < s.t1)!;
    assert.ok(c.at + c.dur <= scene.t1 - 0.5, `${c.id} runs into the end of its scene`);
    for (const d of FILM.decisions) assert.ok(!(c.at < d.pauseAt && c.at + c.dur > d.pauseAt - 1.0), `${c.id} is cut by the pause at ${d.id}`);
    const cap = caps.find(x => spokenText(x.text) === c.text && x.a <= c.at && x.b >= c.at);
    if (!c.text.startsWith('Ask the labs') && !FILM.cues.some(q => q.k === 'ask' && spokenText(q.p ? `${q.h} ${q.p}` : q.h) === c.text)) {
      assert.ok(cap, `${c.id}: no caption is on screen when it is said`);
      assert.ok(cap!.b >= c.at + c.dur, `${c.id}: the caption leaves before the voice is done`);
    }
  }
});

// ——— The music ————————————————————————————————————————————————————————————————————————————————————————————————————

import music from '../content/scenarios/day-before/music.manifest.json';
import { MOODS, MOOD_OF_SCENE, type MusicManifest } from '../content/scenarios/day-before/music';

const score = music as unknown as MusicManifest;

test('every scene has a mood, every mood has a bed, and the beds are rendered, on disk, the length they say', () => {
  for (const s of FILM.scenes) assert.ok(s.mood && MOOD_OF_SCENE[s.id] === s.mood, `scene ${s.id} has no mood`);
  for (const m of MOODS) {
    const bed = score.beds[m.id];
    assert.ok(bed, `${m.id} is not rendered: run scripts/day-before-score.ts`);
    const file = `public/day-before/music/${bed.file}`;
    assert.ok(fs.existsSync(file), `${file} is missing`);
    const len = mp3Seconds(new Uint8Array(fs.readFileSync(file)));
    assert.ok(Math.abs(len - bed.length) < 0.1, `${m.id}: the manifest says ${bed.length} s and the file is ${len.toFixed(2)} s`);
    assert.equal(bed.loop, m.loop);
    assert.ok(m.loop ? Math.abs(bed.length - m.seconds) < 0.2 : bed.length >= m.seconds, `${m.id}: a bed that loops is exactly its length; one that does not keeps its tail`);
    // A bed that does not loop is scored to its scene: it has to be as long as the scene it plays under.
    if (!m.loop) for (const id of m.scenes) { const sc = FILM.scenes.find(x => x.id === id)!; assert.ok(m.seconds >= sc.t1 - sc.t0, `${m.id} is shorter than its scene ${id}`); }
  }
  assert.equal(Object.keys(score.beds).length, MOODS.length);
  const files = new Set(Object.values(score.beds).map(b => b.file));
  for (const f of fs.readdirSync('public/day-before/music')) assert.ok(files.has(f), `public/day-before/music/${f} belongs to no bed`);
  assert.equal((FILM.beds ?? []).length, MOODS.length, 'the film does not carry every bed');
});

test('the score is quiet: every bed is mastered under the voice, with headroom', () => {
  for (const [id, bed] of Object.entries(score.beds)) assert.ok(bed.loudness !== undefined && bed.loudness < -17 && bed.loudness > -26, `${id} is ${bed.loudness} LUFS`);
});
