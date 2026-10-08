import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CAPTIONS, FILM_URL, captionId } from '../content/incidents/openai-hf/film';
import { ADDED_WORDS, NARRATION, NARRATION_BY_ID, SAY, narrationText, numberWords, ordinalWords } from '../content/incidents/openai-hf/narration';
import { LINES, NAMED_SLOTS, SLOTS, wordsOf, type VoiceManifest } from '../content/incidents/openai-hf/voices';
import MANIFEST_JSON from '../content/incidents/openai-hf/voices.manifest.json';

/**
 * The narrator reads our captions, and only our captions, word for word: dates, numbers and handles are said the way a voice says them, and
 * nothing else changes. Every caption is checked, the narrator's recordings must be of the captions as they are now, and the narrator must
 * not sound like an agent.
 */

const MANIFEST = MANIFEST_JSON as unknown as VoiceManifest;
const report = (bad: string[]) => assert.equal(bad.length, 0, `\n  ${bad.join('\n  ')}\n`);
const ROOT = path.resolve(__dirname, '..');

test('numbers, ordinals, dates, times and percentages are said in words, the British way', () => {
  assert.equal(numberWords(898), 'eight hundred and ninety-eight');
  assert.equal(numberWords(198), 'one hundred and ninety-eight');
  assert.equal(numberWords(1200), 'one thousand two hundred');
  assert.equal(numberWords(1300), 'one thousand three hundred');
  assert.equal(numberWords(13), 'thirteen');
  assert.equal(numberWords(40), 'forty');
  assert.equal(ordinalWords(4), 'fourth');
  assert.equal(ordinalWords(12), 'twelfth');
  assert.equal(ordinalWords(20), 'twentieth');
  assert.equal(ordinalWords(21), 'twenty-first');
  assert.equal(ordinalWords(23), 'twenty-third');
  assert.equal(narrationText('On July 4 the cache went down.'), 'On July the fourth the cache went down.');
  assert.equal(narrationText('from July 8 to 13, out of tens of thousands'), 'From July the eighth to the thirteenth, out of tens of thousands.');
  assert.equal(narrationText('In July 2026, OpenAI ran a test.'), 'In July twenty twenty-six, OpenAI ran a test.');
  assert.equal(narrationText('Around 01:30 UTC on July 12'), 'Around half past one U T C on July the twelfth.');
  assert.equal(narrationText('that 30–40% of its tasks'), 'That thirty to forty per cent of its tasks.');
  assert.equal(narrationText('METR says it. METR’s analysis'), 'Meter says it. Meter\'s analysis.');
  assert.equal(narrationText('one agent (c03220) suggested'), 'One agent, C zero three two two zero, suggested.');
  assert.equal(narrationText('HOLD, VETO, owner, STOP'), 'Hold, veto, owner, stop.');
  assert.equal(narrationText('PHASEONE[big] sent agents'), 'Phase One Big sent agents.');
  assert.equal(narrationText('a test called ExploitGym'), 'A test called Exploit Gym.');
});

test('the narrator says exactly what each caption says: nothing lost, nothing added, nothing a voice cannot read', () => {
  const bad: string[] = [];
  const said = new Set(Object.keys(SAY));
  for (const l of NARRATION) {
    const shownWords = wordsOf(l.shown);
    const spokenWords = wordsOf(l.spoken);
    const own = new Set(shownWords);
    // Every word the narrator says is the caption's own, or one the rules add (a number's words, "the" in a date, an initialism's letters).
    for (const w of spokenWords) if (!own.has(w) && !ADDED_WORDS.has(w)) bad.push(`${l.id}: “${w}” is said but is not in the caption or the rules`);
    // Every plain word of the caption is said, in order. (A handle, an initialism, a number or a date is said another way, and is checked above.)
    const plain = l.shown.match(/[A-Za-z]{3,}/g)?.filter(w => !said.has(w) && !/^(?:January|February|March|April|May|June|July|August|September|October|November|December|big)$/.test(w)).map(w => w.toLowerCase()) ?? [];
    let at = 0;
    for (const w of plain) { const i = spokenWords.indexOf(w, at); if (i < 0) { bad.push(`${l.id}: “${w}” is in the caption but is not said, or is said out of order`); break; } at = i + 1; }
    if (/[\d%–\[\]()_\/\\{}<>|=*#@]/.test(l.spoken)) bad.push(`${l.id}: a symbol or digit is left for the voice: “${l.spoken}”`);
    if (/\b[A-Z]{3,}\b/.test(l.spoken)) bad.push(`${l.id}: a shouted word is left: “${l.spoken}”`);
    if (!/^[A-Z"]/.test(l.spoken) || !/[.!?"]$/.test(l.spoken)) bad.push(`${l.id}: does not start with a capital or end with a stop`);
    if (/\s{2,}|\s[.,;:!?]|,,|\.\./.test(l.spoken)) bad.push(`${l.id}: stray spacing or punctuation`);
  }
  assert.equal(NARRATION.length, CAPTIONS.length, 'every caption is narrated');
  assert.equal(new Set(NARRATION.map(l => l.id)).size, NARRATION.length, 'two captions have the same id');
  for (const l of NARRATION) assert.equal(l.id, captionId(l.shown));
  report(bad);
});

test('the narrator’s recordings are of the captions as they are now, in one voice that no agent shares', () => {
  const bad: string[] = [];
  const sec = MANIFEST.narration;
  if (!sec || !Object.keys(sec.lines).length) return; // no narration made yet: nothing to check
  if (sec.draft !== (sec.provider === 'macos-say')) bad.push(`narration draft is ${sec.draft} but its provider is ${sec.provider}`);
  if (sec.provider === 'elevenlabs' && !sec.model) bad.push('an ElevenLabs narration names its model');
  const voices = new Set<string>();
  for (const [id, rec] of Object.entries(sec.lines)) {
    const l = NARRATION_BY_ID[id];
    if (!l) { bad.push(`${id} is recorded but is no longer a caption`); continue; }
    if (rec.text !== l.spoken) bad.push(`${id}: the recording is stale (it says “${rec.text.slice(0, 50)}…”): run  npm run film:voices -- narrate`);
    if (rec.slot !== 'narrator') bad.push(`${id}: recorded as ${rec.slot}`);
    if (!fs.existsSync(path.join(ROOT, 'public/film/voices', rec.file))) bad.push(`${id}: the file ${rec.file} is missing`);
    if (!(rec.seconds > 0.5 && rec.seconds < 40)) bad.push(`${id}: ${rec.seconds} s is not a caption's worth of speech`);
    voices.add(rec.voice);
    if (sec.provider === 'elevenlabs' && !rec.voiceId) bad.push(`${id}: an ElevenLabs line records its voice id`);
  }
  if (voices.size !== 1) bad.push(`the narrator has ${voices.size} voices: ${[...voices].join(', ')}`);
  // Once any caption is narrated, all of them are.
  for (const l of NARRATION) if (!sec.lines[l.id]) bad.push(`${l.id} (“${l.shown.slice(0, 40)}…”) is not narrated yet`);
  // The narrator must not be a voice an agent has: the two are told apart at once.
  const agentVoices = new Set(Object.values(MANIFEST.lines).map(x => x.voice));
  for (const v of voices) if (agentVoices.has(v)) bad.push(`the narrator (${v}) is also an agent's voice`);
  const agentPins = new Set(LINES.map(l => SLOTS[l.slot].pin?.toLowerCase()).filter(Boolean));
  const narratorPin = SLOTS.narrator.pin?.toLowerCase();
  if (narratorPin && agentPins.has(narratorPin)) bad.push(`the narrator and an agent are pinned to the same voice (${narratorPin})`);
  // Draft audio is for checking timing: it must not be on a film that has been published.
  if (FILM_URL && sec.draft) bad.push('the film is published (FILM_URL is set) but its narration is a draft placeholder');
  if (FILM_URL && sec.provider === 'elevenlabs') for (const [id, rec] of Object.entries(sec.lines)) if (!rec.paid) bad.push(`${id} was made on the free plan: make it again on a paid plan (npm run film:voices -- narrate --force --paid)`);
  // The agents are never British (the narrator is): the contrast is the point.
  for (const s of NAMED_SLOTS) assert.ok(SLOTS[s].want.accent !== 'british', `${s} should not be British`);
  report(bad);
});
