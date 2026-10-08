import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BEATS } from '../content/incidents/openai-hf/film';
import { MOODS, MOOD_BY_ID, MOOD_OF_SCENE } from '../content/incidents/openai-hf/music';
import type { VoiceManifest } from '../content/incidents/openai-hf/voices';
import MANIFEST_JSON from '../content/incidents/openai-hf/voices.manifest.json';
import { musicRequest, MUSIC_MODEL } from '../lib/film-voices';

/**
 * The music: a bed for each mood, and a mood for each part of the film. The beds are looped, so each must be long enough to loop, exist, and
 * be what the manifest says. Nothing here can say whether it is good: that is for a person to hear.
 */

const MANIFEST = MANIFEST_JSON as unknown as VoiceManifest;
const ROOT = path.resolve(__dirname, '..');

test('every part of the film has a mood, and every mood has a prompt in ElevenLabs’ own terms and a bed long enough to loop', () => {
  const bad: string[] = [];
  for (const b of BEATS) if (!MOOD_OF_SCENE[b.id as keyof typeof MOOD_OF_SCENE]) bad.push(`${b.id} has no mood`);
  const seen = new Set<string>();
  for (const m of MOODS) {
    if (m.seconds < 60) bad.push(`${m.id}: a bed of ${m.seconds} s is too short to loop without being noticed`);
    if (!/instrumental only/i.test(m.prompt)) bad.push(`${m.id}: the prompt does not say “instrumental only”`);
    if (!/\b(?:BPM|key|minor|major)\b/i.test(m.prompt) && m.id !== 'hollow') bad.push(`${m.id}: the prompt names no tempo or key`);
    for (const s of m.scenes) { if (seen.has(s)) bad.push(`${s} is in two moods`); seen.add(s); }
    // ElevenLabs' music terms forbid artist, song and label names in a prompt: none of these is the name of a person or a work.
    if (/\b(?:by|in the style of|like)\s+[A-Z][a-z]+ [A-Z][a-z]+/.test(m.prompt)) bad.push(`${m.id}: the prompt may name an artist`);
  }
  assert.equal(seen.size, BEATS.length, 'every part is in exactly one mood');
  assert.equal(MOOD_BY_ID.cold.id, 'cold');
  report(bad);
});

test('the music that has been made is what the manifest says, a bed for each mood', () => {
  const bad: string[] = [];
  const sec = MANIFEST.music;
  if (!sec || !Object.keys(sec.lines).length) return; // no music made yet
  if (!['synth', 'elevenlabs'].includes(sec.provider ?? '')) bad.push(`music provider is ${sec.provider}`);
  for (const m of MOODS) {
    const t = sec.lines[m.id];
    if (!t) { bad.push(`no bed for ${m.id}`); continue; }
    const f = path.join(ROOT, 'public/film/music', t.file);
    if (!fs.existsSync(f)) { bad.push(`${m.id}: ${t.file} is missing`); continue; }
    if (Math.abs(t.seconds - m.seconds) > 5 && sec.provider === 'synth') bad.push(`${m.id}: ${t.seconds} s but the mood asks for ${m.seconds} s`);
    if (!(t.seconds >= 60)) bad.push(`${m.id}: ${t.seconds} s is too short to loop`);
  }
  for (const id of Object.keys(sec.lines)) if (!MOOD_BY_ID[id as keyof typeof MOOD_BY_ID]) bad.push(`${id} is a bed for no mood`);
  report(bad);
});

test('a music request is the one ElevenLabs documents (instrumental, with a length)', () => {
  const r = musicRequest({ prompt: 'dark ambient, instrumental only', seconds: 30 });
  assert.equal(r.url, 'https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128');
  assert.deepEqual(r.body, { prompt: 'dark ambient, instrumental only', music_length_ms: 30000, model_id: MUSIC_MODEL, force_instrumental: true });
});

function report(bad: string[]) { assert.equal(bad.length, 0, `\n  ${bad.join('\n  ')}\n`); }
