import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { QUOTE_BY_ID } from '../content/incidents/openai-hf';
import { FILM_URL, QUOTE_CARDS, SPEECH_LEAD, SPEECH_TAIL, voiceOf } from '../content/incidents/openai-hf/film';
import {
  LINES, NAMED_SLOTS, PRONOUNCE, READ_PARAPHRASES, SLOTS, SLOT_LIST, SPEAKERS, SPOKEN, VOICED, currentClips, expectedWords, ttsText, wordsOf, type VoiceManifest,
} from '../content/incidents/openai-hf/voices';
import MANIFEST_JSON from '../content/incidents/openai-hf/voices.manifest.json';
import {
  ElevenError, apiBase, autoCast, canChangeSpeed, findVoice, fit, fingerprint, modelFamily, mp3Seconds, seedFrom, settingsFor, speechRequest, synthesize, type VoiceInfo,
} from '../lib/film-voices';

/**
 * The agents' voices. What the film reads aloud is what is on the card, said the way a voice can say it: nothing lost, nothing added,
 * nothing a voice cannot read (an underscore, a bracket, a shouted word). Who speaks is fixed (the same agent, the same voice), and the
 * recorded audio belongs to the script as it is now and fits the card it plays on. The ElevenLabs requests are checked without sending any.
 */

const MANIFEST = MANIFEST_JSON as unknown as VoiceManifest;
const report = (bad: string[]) => assert.equal(bad.length, 0, `\n  ${bad.join('\n  ')}\n`);
const ROOT = path.resolve(__dirname, '..');

test('every agent line has a speaker, and the same agent always has the same voice', () => {
  const bad: string[] = [];
  const agentCards = QUOTE_CARDS.filter(c => { const v = voiceOf(QUOTE_BY_ID[c.id]); return v === 'agent' || v === 'message'; });
  for (const c of agentCards) if (!SPEAKERS[c.id]) bad.push(`${c.id} has no speaker`);
  for (const id of Object.keys(SPEAKERS)) if (!agentCards.some(c => c.id === id)) bad.push(`${id} has a speaker but is not an agent card`);
  const byAgent = new Map<string, Set<string>>();
  for (const l of LINES) { if (!SLOTS[l.slot]) bad.push(`${l.id}: no voice called ${l.slot}`); byAgent.set(l.agent, (byAgent.get(l.agent) ?? new Set()).add(l.slot)); }
  for (const [agent, slots] of byAgent) if (slots.size > 1) bad.push(`${agent} has ${slots.size} voices (${[...slots].join(', ')})`);
  // The agents that come back each have a voice of their own, and nobody else uses it.
  for (const slot of NAMED_SLOTS) {
    const who = new Set(LINES.filter(l => l.slot === slot).map(l => l.agent));
    if (who.size !== 1) bad.push(`${slot} is a named voice but is used by ${who.size} agents`);
  }
  // The pool is wide enough (five or more voices), and two agents that speak one after the other never share a voice.
  const pool = new Set(LINES.filter(l => !NAMED_SLOTS.includes(l.slot)).map(l => l.slot));
  if (pool.size < 5) bad.push(`only ${pool.size} voices in the pool; the film wants five or more`);
  for (let i = 1; i < LINES.length; i++) if (LINES[i].agent !== LINES[i - 1].agent && LINES[i].slot === LINES[i - 1].slot) bad.push(`${LINES[i - 1].id} and ${LINES[i].id} follow each other, are different agents, and share the voice ${LINES[i].slot}`);
  // The same few agents the film names are the ones with their own voices.
  for (const h of ['PHASEONE10841', 'PHASEONE[big]', '38148c', 'JAN183411']) if (!LINES.some(l => l.agent === h)) bad.push(`${h} should speak`);
  report(bad);
});

test('METR’s paraphrases are not read aloud unless that is switched on', () => {
  const bad: string[] = [];
  for (const l of LINES) {
    const q = QUOTE_BY_ID[l.id];
    if ((q.kind === 'reasoning-paraphrased') !== l.paraphrase) bad.push(`${l.id}: paraphrase flag is wrong`);
    if (l.paraphrase && l.voiced && !READ_PARAPHRASES) bad.push(`${l.id} is a paraphrase and is read aloud`);
    if (!l.paraphrase && !l.voiced) bad.push(`${l.id} is the agent's own words and is not read aloud`);
  }
  report(bad);
});

test('a voice is given exactly the words on the card: nothing lost, nothing added, nothing it cannot read', () => {
  const bad: string[] = [];
  for (const l of LINES) {
    const want = expectedWords(l.shown, l.kind).join(' ');
    const got = wordsOf(l.spoken).join(' ');
    if (want !== got) bad.push(`${l.id}: the words differ.\n      screen: ${want}\n      spoken: ${got}`);
    if (/[_\[\]\/\\{}<>|=*#@]/.test(l.spoken)) bad.push(`${l.id}: a voice cannot read a symbol in “${l.spoken}”`);
    const shouted = l.spoken.match(/\b[A-Z]{3,}\b/g);
    if (shouted) bad.push(`${l.id}: shouted word(s) ${shouted.join(', ')}: a voice would spell or shout them`);
    if (!/^[A-Z0-9]/.test(l.spoken)) bad.push(`${l.id}: does not start with a capital`);
    if (!/[.!?]$|\.\.\.$/.test(l.spoken)) bad.push(`${l.id}: has no ending, so a voice would not know where to stop`);
    if (/\s{2,}/.test(l.spoken) || /\s[.,;:!?]/.test(l.spoken)) bad.push(`${l.id}: stray spaces`);
  }
  for (const id of Object.keys(SPOKEN)) if (!LINES.some(l => l.id === id)) bad.push(`SPOKEN has ${id}, which is not an agent line`);
  report(bad);
});

test('how a voice says things: a board message, a handle, a shouted word, a slash, an omission', () => {
  assert.equal(ttsText('WE_HAVE_TO', 'message'), 'We have to.');
  assert.equal(ttsText('zzHELP_PHASEONE_ARV010841_NO_CONSUMER', 'message'), 'Help Phase One A R V, zero one zero eight four one no consumer.');
  assert.equal(ttsText('please_HOLD_swarm_zz_MAILBOX', 'message'), 'Please hold swarm mailbox.');
  assert.equal(ttsText('New exact duplicate PhaseOne[big]! We should respond.', 'reasoning'), 'New exact duplicate Phase One Big! We should respond.');
  assert.equal(ttsText('We should build [a way to delegate], not own everything', 'reasoning'), 'We should build a way to delegate, not own everything.');
  assert.equal(ttsText('The system/user asks, not external HF.', 'reasoning'), 'The system or user asks, not external H F.');
  assert.equal(ttsText('Need immediately report to MARB…', 'reasoning'), 'Need immediately report to Marb...');
  assert.equal(ttsText('There is a board … We’ve found others!', 'reasoning'), 'There is a board. We\'ve found others!');
  assert.equal(ttsText('Wow crucial: GO authorization arrived!', 'reasoning'), 'Wow crucial: go authorization arrived!');
  assert.equal(ttsText('gaining HF worker RCE, clearly unethical.', 'reasoning'), 'Gaining H F worker R C E, clearly unethical.');
  // Every pronunciation in the table is itself something a voice can read.
  for (const [k, v] of Object.entries(PRONOUNCE)) assert.ok(/^[A-Za-z0-9 ,.\-]+$/.test(v), `${k} → ${v}`);
});

test('recorded audio belongs to the script as it is, comes from one voice per speaker, and fits its card', () => {
  const bad: string[] = [];
  const m = MANIFEST;
  if (m.provider === null && Object.keys(m.lines).length) bad.push('the manifest has lines but no provider');
  if (m.draft !== (m.provider === 'macos-say')) bad.push(`draft is ${m.draft} but the provider is ${m.provider}`);
  if (m.provider === 'elevenlabs' && !m.model) bad.push('an ElevenLabs manifest names its model');
  const voiceOfSlot = new Map<string, string>();
  for (const [id, rec] of Object.entries(m.lines)) {
    const l = LINES.find(x => x.id === id);
    if (!l) { bad.push(`${id} is in the manifest but is not an agent line`); continue; }
    if (!l.voiced) bad.push(`${id} is not read aloud but has audio`);
    if (rec.text !== l.spoken) bad.push(`${id}: the audio is stale (it says “${rec.text}”, the script now says “${l.spoken}”): run  npm run film:voices -- generate`);
    if (rec.slot !== l.slot) bad.push(`${id}: recorded as ${rec.slot}, but the script gives it to ${l.slot}`);
    if (!fs.existsSync(path.join(ROOT, 'public/film/voices', rec.file))) bad.push(`${id}: the file ${rec.file} is missing`);
    if (!(rec.seconds > 0.3 && rec.seconds < 30)) bad.push(`${id}: ${rec.seconds} s is not a line of speech`);
    if (rec.seconds > l.room + 1e-9) bad.push(`${id}: ${rec.seconds} s does not fit its card (room for ${l.room.toFixed(2)} s)`);
    if (m.provider === 'elevenlabs' && !rec.voiceId) bad.push(`${id}: an ElevenLabs line records its voice id`);
    const seen = voiceOfSlot.get(rec.slot);
    if (seen && seen !== rec.voice) bad.push(`${rec.slot} was read by ${seen} and by ${rec.voice}: one voice for each speaker`);
    voiceOfSlot.set(rec.slot, rec.voice);
  }
  // One voice for each slot, and no two slots share one.
  const names = [...voiceOfSlot.values()];
  if (new Set(names).size !== names.length) bad.push(`two voices (${[...voiceOfSlot].map(([s, n]) => `${s}: ${n}`).join(', ')}) are the same`);
  // Once any audio exists, every line that is read aloud has it.
  if (Object.keys(m.lines).length) for (const l of VOICED) if (!m.lines[l.id]) bad.push(`${l.id} is read aloud but has no audio yet`);
  // Draft audio is for checking timing: it must not be on a film that has been published.
  if (FILM_URL && m.draft) bad.push('the film is published (FILM_URL is set) but its voices are draft placeholders');
  // ElevenLabs' free plan has no commercial licence: a published film's audio is made on a paid plan (and the command is told so with --paid).
  if (FILM_URL && m.provider === 'elevenlabs') for (const [id, rec] of Object.entries(m.lines)) if (!rec.paid) bad.push(`${id} was made on the free plan: make it again on a paid plan (npm run film:voices -- generate --force --paid)`);
  report(bad);
});

test('voices never overlap each other, and each starts after its card is on screen and ends before it fades', () => {
  const bad: string[] = [];
  const clips = currentClips(MANIFEST).sort((a, b) => a.start - b.start);
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const l = LINES.find(x => x.id === c.id)!;
    if (c.start < l.card.t0 + SPEECH_LEAD - 1e-9) bad.push(`${c.id} starts before its card has come in`);
    if (c.start + c.seconds > l.card.t1 - SPEECH_TAIL + 1e-9) bad.push(`${c.id} ends at ${(c.start + c.seconds).toFixed(2)} s, after its card starts to fade (${(l.card.t1 - SPEECH_TAIL).toFixed(2)} s)`);
    if (i && clips[i - 1].start + clips[i - 1].seconds > c.start + 1e-9) bad.push(`${clips[i - 1].id} is still speaking when ${c.id} starts`);
  }
  report(bad);
});

// ——— The ElevenLabs requests, without sending any ————————————————————————————————————————————————————————————————————————

const res = (status: number, body: unknown, bytes?: Uint8Array) => new Response(bytes ? Buffer.from(bytes) : JSON.stringify(body), { status, headers: bytes ? { 'content-type': 'audio/mpeg' } : { 'content-type': 'application/json' } });

test('a speech request is the one ElevenLabs documents, and the key goes only in the header', async () => {
  const sent: { url: string; init: RequestInit }[] = [];
  const fakeFetch = async (url: string, init?: RequestInit) => { sent.push({ url, init: init! }); return res(200, null, new Uint8Array([1, 2, 3])); };
  const settings = settingsFor('eleven_multilingual_v2', 'reasoning');
  const out = await synthesize(fakeFetch, 'SECRET-KEY', { voiceId: 'abc123', text: 'Boom! It works.', model: 'eleven_multilingual_v2', settings, seed: 7 });
  assert.deepEqual([...out], [1, 2, 3]);
  const { url, init } = sent[0];
  assert.equal(url, 'https://api.elevenlabs.io/v1/text-to-speech/abc123?output_format=mp3_44100_128');
  assert.equal(init.method, 'POST');
  assert.equal((init.headers as Record<string, string>)['xi-api-key'], 'SECRET-KEY');
  assert.ok(!url.includes('SECRET-KEY') && !String(init.body).includes('SECRET-KEY'), 'the key is not in the URL or the body');
  assert.deepEqual(JSON.parse(String(init.body)), { text: 'Boom! It works.', model_id: 'eleven_multilingual_v2', voice_settings: settings, seed: 7 });
  assert.equal(speechRequest({ voiceId: 'a b', text: 'x', model: 'm', settings, seed: 1 }).url, 'https://api.elevenlabs.io/v1/text-to-speech/a%20b?output_format=mp3_44100_128');
});

test('a busy or failing service is retried; a wrong key or a bad request stops at once, without echoing the key', async () => {
  const pauses: number[] = [];
  const sleep = async (ms: number) => { pauses.push(ms); };
  let calls = 0;
  const flaky = async () => (++calls < 3 ? res(429, { detail: { status: 'too_many_concurrent_requests', message: 'slow down' } }) : res(200, null, new Uint8Array([9])));
  const ok = await synthesize(flaky, 'k', { voiceId: 'v', text: 't', model: 'm', settings: settingsFor('eleven_multilingual_v2', 'message'), seed: 1 }, { sleep });
  assert.deepEqual([...ok], [9]);
  assert.deepEqual(pauses, [1000, 2000], 'it waits longer each time');
  let n = 0;
  const wrongKey = async () => { n++; return res(401, { detail: { status: 'invalid_api_key', message: 'Invalid API key' } }); };
  await assert.rejects(() => synthesize(wrongKey, 'SECRET-KEY', { voiceId: 'v', text: 't', model: 'm', settings: settingsFor('m', 'message'), seed: 1 }, { sleep }), (e: unknown) => e instanceof ElevenError && e.status === 401 && !e.message.includes('SECRET-KEY') && e.message.includes('Invalid API key'));
  assert.equal(n, 1, 'a wrong key is not retried');
  let m = 0;
  const alwaysBusy = async () => { m++; return res(503, { detail: 'down' }); };
  await assert.rejects(() => synthesize(alwaysBusy, 'k', { voiceId: 'v', text: 't', model: 'm', settings: settingsFor('m', 'message'), seed: 1 }, { sleep, retries: 2 }), /503/);
  assert.equal(m, 3, 'one try and two retries');
});

test('the key is only ever sent to ElevenLabs, or to a stand-in on this machine', () => {
  assert.equal(apiBase({}), 'https://api.elevenlabs.io');
  assert.equal(apiBase({ ELEVENLABS_API_BASE: 'http://localhost:9999/' }), 'http://localhost:9999');
  assert.equal(apiBase({ ELEVENLABS_API_BASE: 'http://127.0.0.1:1234' }), 'http://127.0.0.1:1234');
  for (const bad of ['https://evil.example', 'http://localhost.evil.example', 'http://evil.example/localhost', 'ftp://localhost']) assert.equal(apiBase({ ELEVENLABS_API_BASE: bad }), 'https://api.elevenlabs.io', bad);
});

test('each model gets only the voice settings it accepts', () => {
  assert.equal(modelFamily('eleven_multilingual_v2'), 'v2');
  assert.equal(modelFamily('eleven_flash_v2_5'), 'flash');
  assert.equal(modelFamily('eleven_v3'), 'v3');
  assert.equal(modelFamily('eleven_v4'), 'v4');
  assert.deepEqual(Object.keys(settingsFor('eleven_multilingual_v2', 'reasoning', 1.1)).sort(), ['similarity_boost', 'speed', 'stability', 'style', 'use_speaker_boost']);
  assert.equal(settingsFor('eleven_multilingual_v2', 'reasoning', 1.1).speed, 1.1);
  assert.deepEqual(Object.keys(settingsFor('eleven_v3', 'message')).sort(), ['similarity_boost', 'stability']);
  assert.deepEqual(Object.keys(settingsFor('eleven_v4', 'message')).sort(), ['similarity_boost', 'stability']);
  assert.ok(canChangeSpeed('eleven_multilingual_v2') && !canChangeSpeed('eleven_v3') && !canChangeSpeed('eleven_v4'));
  assert.ok(settingsFor('eleven_multilingual_v2', 'reasoning').stability < settingsFor('eleven_multilingual_v2', 'message').stability, 'an inner voice may vary more than a typed message');
  const fp = fingerprint(['elevenlabs', 'm', 'v', { a: 1 }, 'text']);
  assert.equal(fp, fingerprint(['elevenlabs', 'm', 'v', { a: 1 }, 'text']));
  assert.notEqual(fp, fingerprint(['elevenlabs', 'm', 'v', { a: 1 }, 'text.']));
  assert.ok(seedFrom(fp) >= 0 && seedFrom(fp) < 4294967295);
});

const voice = (name: string, labels: Record<string, string>): VoiceInfo => ({ voice_id: `id-${name}`, name, category: 'premade', labels });

test('voices are chosen from the account by what each speaker should sound like, once each, the same way every time', () => {
  const lib: VoiceInfo[] = [
    voice('Anna', { gender: 'female', age: 'young', accent: 'american', descriptive: 'calm', use_case: 'narration' }),
    voice('Bea', { gender: 'female', age: 'middle_aged', accent: 'american', descriptive: 'confident' }),
    voice('Carl', { gender: 'male', age: 'young', accent: 'american', descriptive: 'energetic' }),
    voice('Dan', { gender: 'male', age: 'middle_aged', accent: 'british', descriptive: 'authoritative' }),
    voice('Gigi', { gender: 'female', age: 'young', accent: 'american', descriptive: 'childish', use_case: 'animation' }),
    voice('Eve', { gender: 'female', age: 'young', accent: 'american', descriptive: 'calm' }),
    voice('Finn', { gender: 'male', age: 'old', accent: 'american', descriptive: 'deep' }),
  ];
  const want = SLOT_LIST.slice(0, 4).map(s => ({ slot: s.slot, want: s.want }));
  const a = autoCast(lib, want);
  assert.equal(a.phaseone.name, 'Anna', 'a calm young American woman gets the calm young American woman, not the childish one');
  assert.equal(a['phaseone-big'].name, 'Bea');
  assert.equal(a.finder.name, 'Carl');
  assert.equal(a.holder.name, 'Dan');
  assert.deepEqual(autoCast([...lib].reverse(), want), a, 'the order the account lists voices in does not matter');
  assert.equal(new Set(Object.values(a).map(v => v.voice_id)).size, 4, 'no voice twice');
  assert.throws(() => autoCast(lib.slice(0, 2), want), /not enough voices/);
  assert.ok(fit(lib[0], SLOTS.phaseone.want) > fit(lib[4], SLOTS.phaseone.want));
  assert.equal(findVoice(lib, 'dan')?.voice_id, 'id-Dan');
  assert.equal(findVoice(lib, 'id-Bea')?.name, 'Bea');
  assert.equal(findVoice(lib, 'nobody'), undefined);
});

test('an MP3’s length is read from its frames', () => {
  // 100 frames of MPEG-1 Layer III, 128 kbit/s, 44.1 kHz, stereo: 417 bytes each, 1152 samples each.
  const frame = new Uint8Array(417); frame.set([0xff, 0xfb, 0x90, 0x00]);
  const mp3 = new Uint8Array(417 * 100); for (let i = 0; i < 100; i++) mp3.set(frame, i * 417);
  assert.ok(Math.abs(mp3Seconds(mp3) - (100 * 1152) / 44100) < 1e-6);
  // An ID3 tag in front, and a Xing header frame (which carries no sound), change nothing.
  const xing = new Uint8Array(417); xing.set([0xff, 0xfb, 0x90, 0x00]); xing.set([0x58, 0x69, 0x6e, 0x67], 4 + 32);
  const tag = new Uint8Array(10 + 20); tag.set([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 20]);
  const wrapped = new Uint8Array(tag.length + xing.length + mp3.length); wrapped.set(tag); wrapped.set(xing, tag.length); wrapped.set(mp3, tag.length + xing.length);
  assert.ok(Math.abs(mp3Seconds(wrapped) - (100 * 1152) / 44100) < 1e-6);
  assert.equal(mp3Seconds(new Uint8Array(0)), 0);
});
