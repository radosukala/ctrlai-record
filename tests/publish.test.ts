import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FILM_PATH, FILM_PUBLIC, FILM_SHORT_PATH, INCIDENT_PATH, VOICES_LICENSED, voicesLicensed } from '../content/incidents/openai-hf/publish';
import MANIFEST from '../content/incidents/openai-hf/voices.manifest.json';

/**
 * When the film may be shown to the public. Its voices are made with ElevenLabs, whose free plan has no commercial licence: until every voice was made on a
 * paid plan (the generating commands record `paid: true`), the film is shown in development only, and a production build leaves it off the homepage and out of
 * search engines and the sitemap.
 */

const ROOT = path.resolve(__dirname, '..');
const line = (paid?: boolean) => ({ paid });

test('the voices are licensed only when every ElevenLabs line, the agents’ and the narrator’s, was made on a paid plan', () => {
  assert.equal(voicesLicensed({ provider: null, draft: false, lines: {} }), true, 'no recorded voices, nothing to license');
  assert.equal(voicesLicensed({ provider: 'elevenlabs', draft: false, lines: { a: line(true), b: line(true) }, narration: { provider: 'elevenlabs', draft: false, lines: { n: line(true) } } }), true);
  assert.equal(voicesLicensed({ provider: 'elevenlabs', draft: false, lines: { a: line(true), b: line() } }), false, 'one agent line made on the free plan');
  assert.equal(voicesLicensed({ provider: 'elevenlabs', draft: false, lines: { a: line(true) }, narration: { provider: 'elevenlabs', draft: false, lines: { n: line(false) } } }), false, 'a narration line made on the free plan');
  assert.equal(voicesLicensed({ provider: 'macos-say', draft: true, lines: { a: line(true) } }), false, 'draft placeholder voices are never for publication');
  assert.equal(voicesLicensed({ provider: 'elevenlabs', draft: true, lines: { a: line(true) } }), false);
});

test('the switch follows the recorded voices, and the film is always on show in development', () => {
  assert.equal(VOICES_LICENSED, voicesLicensed(MANIFEST as unknown as Parameters<typeof voicesLicensed>[0]));
  if (process.env.NODE_ENV !== 'production') assert.equal(FILM_PUBLIC, true);
  assert.equal(FILM_PATH, `${INCIDENT_PATH}/film`);
  // The one way round the licence check is an environment variable, never a line of code.
  const source = fs.readFileSync(path.join(ROOT, 'content/incidents/openai-hf/publish.ts'), 'utf8');
  assert.match(source, /process\.env\.FILM_FORCE_PUBLIC === '1'/);
});

test('the pages, the sitemap and the homepage all follow the one switch', () => {
  const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const f of ['app/incident/openai-hugging-face/page.tsx', 'app/incident/openai-hugging-face/film/page.tsx']) assert.match(read(f), /robots: FILM_PUBLIC \?/, `${f} does not follow FILM_PUBLIC`);
  assert.match(read('app/sitemap.ts'), /FILM_PUBLIC \? \[/, 'the sitemap does not follow FILM_PUBLIC');
  assert.match(read('app/page.tsx'), /FILM_PUBLIC \? <FilmHero \/> : null/, 'the homepage does not follow FILM_PUBLIC');
  // The script page is for people who work on the film: never in search engines.
  assert.match(read('app/incident/openai-hugging-face/film/script/page.tsx'), /robots: \{ index: false, follow: false \}/);
});

test('the homepage band carries the film’s own headline and says what the film is and is not', () => {
  const hero = fs.readFileSync(path.join(ROOT, 'components/FilmHero.tsx'), 'utf8');
  assert.match(hero, /TITLE\.headline/, 'the band should use the film’s own headline, not its own claim');
  assert.match(hero, /Not an official account from OpenAI, METR or Hugging Face/);
  assert.match(hero, /Every date, number and quotation has its source/);
  assert.match(hero, /our view/i, 'the band should say the last lines are our view');
});

test('the short address the videos print goes to the film, and the pages link to each other', () => {
  const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  assert.equal(FILM_SHORT_PATH, '/film');
  assert.match(read('next.config.ts'), new RegExp(`source: '${FILM_SHORT_PATH}', destination: '${FILM_PATH}'`), 'the short address does not redirect to the film');
  assert.match(read('components/incident/film/Film.tsx'), /FILM_SHORT_PATH/, 'a video’s closing card should print the short address');
  assert.match(read('components/incident/film/Film.tsx'), /film-watermark/, 'a video should carry the address on every frame');
  assert.match(read('app/incident/openai-hugging-face/page.tsx'), /href=\{FILM_PATH\}|Link href=\{FILM_PATH\}/, 'the reconstruction should link to the film');
  assert.match(read('components/FilmHero.tsx'), /href=\{FILM_PATH\}/, 'the homepage band should link to the film');
});

