import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_MODEL, ElevenError, MUSIC_MODEL, apiBase, autoCast, canChangeSpeed, composeMusic, findVoice, fingerprint, listModels, listVoices, mp3Seconds, seedFrom, settingsFor, synthesize, usage,
  type VoiceInfo,
} from '../lib/film-voices';
import { MOODS, type Mood } from '../content/incidents/openai-hf/music';
import { NARRATION, NARRATION_BY_ID } from '../content/incidents/openai-hf/narration';
import { EMPTY_MANIFEST, LINES, READ_PARAPHRASES, SLOTS, SLOT_LIST, VOICED, estimateSeconds, type ManifestLine, type Slot, type SpokenLine, type VoiceManifest } from '../content/incidents/openai-hf/voices';

/**
 * Makes the agents' voices for the film: one audio file for each agent line that is read aloud, and the manifest the film plays from.
 *
 *   npm run film:voices -- plan                    what would be read, by whom, how long, what it costs. No network, no key.
 *   npm run film:voices -- status                  your ElevenLabs plan and the credits left (makes no audio)
 *   npm run film:voices -- voices                  the voices your ElevenLabs account has (needs ELEVENLABS_API_KEY)
 *   npm run film:voices -- cast                    the voice chosen for each speaker, with a preview link for each
 *   npm run film:voices -- generate                make the audio with ElevenLabs (cached: only changed lines are made again)
 *   npm run film:voices -- generate --provider say draft audio from macOS voices, to check timing before ElevenLabs is set up
 *   npm run film:voices -- narrate                 the narrator reads every caption (ElevenLabs; --provider say for a free draft)
 *   npm run film:voices -- music --sample         thirty seconds of each mood of music, on one page, to hear what it will be like (a little credit)
 *   npm run film:voices -- music                   compose the film's music: one bed for each mood, each looped under its part of the film
 *   npm run film:voices -- audition                the same two captions in each British voice, side by side, to choose the narrator by ear
 *   npm run film:voices -- compare                 the same few lines in each ElevenLabs model, side by side on one page, to choose a model by ear
 *   npm run film:voices -- clean                   remove the audio and the manifest (the film goes back to being silent)
 *
 * Flags: --only id,id  (just these lines)   --force  (make them again)   --model eleven_v3  (another model)   --recast  (choose voices again)
 *        --paid  (say that this run is on a paid ElevenLabs plan, whose audio may be published commercially; the free plan's may not)
 *
 * The key is read from the environment (.env.local is loaded by the npm script) and is never printed or written anywhere.
 */

const ROOT = path.resolve(__dirname, '..');
// The three places the work lands. The environment can move them (to try the pipeline without touching the film).
const OUT = process.env.FILM_VOICES_DIR ?? path.join(ROOT, 'public/film/voices');
const MANIFEST = process.env.FILM_VOICES_MANIFEST ?? path.join(ROOT, 'content/incidents/openai-hf/voices.manifest.json');
const CAST = process.env.FILM_VOICES_CAST ?? path.join(ROOT, 'content/incidents/openai-hf/voices.cast.json');
const MUSIC_DIR = process.env.FILM_MUSIC_DIR ?? path.join(ROOT, 'public/film/music');

/** What the dashboard showed for the first 9,415 characters (4,749 credits). A model or plan may bill differently: the dashboard is the truth. */
const CREDITS_PER_CHAR = 0.505;
const [cmd = 'help', ...rest] = process.argv.slice(2);
const flag = (name: string) => rest.includes(`--${name}`);
const opt = (name: string) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
const only = opt('only')?.split(',').map(s => s.trim()).filter(Boolean);
const say = (...a: unknown[]) => console.log(...a);
const die = (m: string): never => { console.error(`\n${m}\n`); process.exit(1); };
const pad = (s: string | number, n: number) => String(s).padEnd(n);
const key = () => process.env.ELEVENLABS_API_KEY?.trim() || die('There is no ELEVENLABS_API_KEY. Put ELEVENLABS_API_KEY=… in .env.local (it is git-ignored), or use --provider say for draft audio.');

/** ElevenLabs names a voice with its character ("Liam - Energetic, Social Media Creator"); the film only needs the name. */
const shortName = (v: VoiceInfo) => v.name.split(/\s+-\s+/)[0].trim();
const readManifest = (): VoiceManifest => (fs.existsSync(MANIFEST) ? (JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as VoiceManifest) : { ...EMPTY_MANIFEST, lines: {} });
const writeManifest = (m: VoiceManifest) => fs.writeFileSync(MANIFEST, `${JSON.stringify(m, null, 2)}\n`);
type SavedCast = Partial<Record<Slot, { voice: string; voiceId: string }>>;
const readCast = (): SavedCast => (fs.existsSync(CAST) ? (JSON.parse(fs.readFileSync(CAST, 'utf8')) as SavedCast) : {});

function chosen(): SpokenLine[] {
  const lines = VOICED;
  if (!only) return lines;
  const bad = only.filter(id => !lines.some(l => l.id === id));
  if (bad.length) die(`Not voiced lines: ${bad.join(', ')}. The voiced lines are: ${lines.map(l => l.id).join(', ')}`);
  return lines.filter(l => only.includes(l.id));
}

// ——— plan ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

function plan() {
  const m = readManifest();
  const chars = VOICED.reduce((n, l) => n + l.spoken.length, 0);
  say(`\nThe agents' lines in the film: ${LINES.length}. Read aloud: ${VOICED.length}${READ_PARAPHRASES ? '' : ` (the ${LINES.length - VOICED.length} paraphrases by METR are left silent: READ_PARAPHRASES is off)`}.`);
  say(`Characters to send to the voice service: ${chars}. That is about ${Math.round(chars * CREDITS_PER_CHAR)} credits (this account was billed about half a credit a character for eleven_multilingual_v2: 9,415 characters cost 4,749); a free ElevenLabs plan has 10,000 a month.\n`);
  say(`${pad('line', 24)}${pad('speaker', 13)}${pad('voice (pinned)', 16)}${pad('chars', 6)}${pad('est s', 7)}${pad('room s', 8)}audio`);
  for (const l of LINES) {
    const got = m.lines[l.id];
    const state = !l.voiced ? 'silent (paraphrase)' : !got ? 'not made yet' : got.text === l.spoken ? `${got.seconds.toFixed(1)} s, ${m.provider}${m.draft ? ' (draft)' : ''}` : 'STALE: the words have changed';
    const est = estimateSeconds(l.spoken);
    say(`${pad(l.id, 24)}${pad(l.slot, 13)}${pad(SLOTS[l.slot].pin ?? '(chosen)', 16)}${pad(l.spoken.length, 6)}${pad(est.toFixed(1), 7)}${pad(l.room.toFixed(1), 8)}${state}${l.voiced && est > l.room ? '   (may be too long for its card)' : ''}`);
  }
  const narr = m.narration;
  const narrMade = NARRATION.filter(l => narr?.lines[l.id]?.text === l.spoken);
  say(`\nThe narrator (${SLOTS.narrator.pin ?? 'chosen'}): ${NARRATION.length} captions, ${NARRATION.reduce((n, l) => n + l.spoken.length, 0)} characters. ${narrMade.length === NARRATION.length ? `All made (${(narrMade.reduce((n, l) => n + narr!.lines[l.id].seconds, 0) / 60).toFixed(1)} minutes, ${narr!.provider}${narr!.draft ? ', DRAFT' : ''}).` : `${narrMade.length} of ${NARRATION.length} made: npm run film:voices -- narrate`}`);
  const beds = Object.keys(m.music?.lines ?? {}).length;
  say(`The music: ${MOODS.length} moods. ${beds === MOODS.length ? `All made (${m.music!.provider}).` : `${beds} made: npx tsx scripts/film-score.ts`}`);
  say(`\nWho is who:`);
  for (const s of SLOT_LIST) say(`  ${pad(s.slot, 13)} ${s.for}\n                ${s.brief}${s.pin ? `\n                pinned: ${s.pin}` : ''}`);
  say(`\nNext: npm run film:voices -- generate --provider say   (draft audio now)   |   npm run film:voices -- generate   (ElevenLabs, once the key is in .env.local)\n`);
}

// ——— voices and cast ————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** What the account is and what this key may do: no audio is made, and nothing is spent. */
async function status() {
  const apiKey = key();
  const base = apiBase();
  const get = async (p: string) => { const r = await fetch(`${base}${p}`, { headers: { 'xi-api-key': apiKey } }); const t = await r.text(); let j: unknown = null; try { j = JSON.parse(t); } catch { /* not JSON */ } const d = (j as { detail?: { message?: string } | string } | null)?.detail; return { ok: r.ok, status: r.status, json: j, why: typeof d === 'string' ? d : d?.message ?? t.slice(0, 160) }; };
  say('');
  const sub = await get('/v1/user/subscription');
  if (sub.ok) { const b = sub.json as Record<string, unknown>; say(`Plan: ${b.tier ?? '?'} (${b.status ?? '?'}). Credits used ${b.character_count} of ${b.character_limit}; they renew about ${typeof b.next_character_count_reset_unix === 'number' ? new Date(b.next_character_count_reset_unix * 1000).toISOString().slice(0, 10) : '?'}.`); }
  else say(`Plan and credits: not readable with this key (${sub.why}). Add the "user_read" permission to the key to see them.`);
  const models = await get('/v1/models');
  if (models.ok) say(`Models that can speak: ${(models.json as { model_id: string; can_do_text_to_speech?: boolean }[]).filter(x => x.can_do_text_to_speech).map(x => x.model_id).join(', ')}`);
  else say(`Models: not readable with this key (${models.why}); the default model is simply tried.`);
  const vs = await get('/v2/voices?page_size=100&sort=name&sort_direction=asc');
  if (vs.ok) { const list = (vs.json as { voices: { category?: string }[] }).voices; say(`Voices in the account: ${list.length} (${list.filter(v => v.category === 'premade').length} premade).`); }
  else say(`Voices: not readable with this key (${vs.why}).`);
  say('');
}

async function voices() {
  const all = await listVoices(fetch, key());
  say(`\n${all.length} voices in this account:\n`);
  for (const v of all) say(`${pad(v.name, 28)}${pad(v.category ?? '', 11)}${pad(Object.entries(v.labels ?? {}).map(([k, x]) => `${k}=${x}`).join(' '), 70)}${v.voice_id}${v.preview_url ? `\n${' '.repeat(28)}${v.preview_url}` : ''}`);
  say('');
}

/** The voice for each slot: pinned in voices.ts, or saved in voices.cast.json, or chosen from the account by what the slot asks for (and then saved, so it never changes). */
async function resolveCast(): Promise<Record<Slot, VoiceInfo>> {
  const all = await listVoices(fetch, key());
  const premade = all.filter(v => v.category === 'premade');
  const library = premade.length >= SLOT_LIST.length ? premade : all;
  const saved = flag('recast') ? {} : readCast();
  const out = {} as Record<Slot, VoiceInfo>;
  const undecided: Slot[] = [];
  for (const s of SLOT_LIST) {
    const pinned = s.pin ? findVoice(premade, s.pin) ?? findVoice(all, s.pin) ?? die(`${s.slot} is pinned to “${s.pin}”, which is not in this account. Run: npm run film:voices -- voices`) : undefined;
    const kept = saved[s.slot] ? all.find(v => v.voice_id === saved[s.slot]!.voiceId) : undefined;
    const v = pinned ?? kept;
    if (v) out[s.slot] = v; else undecided.push(s.slot);
  }
  if (undecided.length) {
    const taken = new Set(Object.values(out).map(v => v.voice_id));
    const picks = autoCast(library.filter(v => !taken.has(v.voice_id)), undecided.map(slot => ({ slot, want: SLOTS[slot].want })));
    for (const slot of undecided) out[slot] = picks[slot];
    const keep: SavedCast = {};
    for (const s of SLOT_LIST) keep[s.slot] = { voice: out[s.slot].name, voiceId: out[s.slot].voice_id };
    fs.writeFileSync(CAST, `${JSON.stringify(keep, null, 2)}\n`);
  }
  return out;
}

async function cast() {
  const c = await resolveCast();
  say(`\nThe cast (saved in content/incidents/openai-hf/voices.cast.json; --recast chooses again; pin a voice in voices.ts to fix it):\n`);
  for (const s of SLOT_LIST) {
    const v = c[s.slot];
    say(`${pad(s.slot, 13)}${pad(v.name, 22)}${pad(Object.entries(v.labels ?? {}).map(([k, x]) => `${k}=${x}`).join(' '), 64)}${s.pin ? '(pinned)' : ''}\n${' '.repeat(13)}for ${s.for}${v.preview_url ? `\n${' '.repeat(13)}listen: ${v.preview_url}` : ''}`);
  }
  say('');
}

// ——— generate —————————————————————————————————————————————————————————————————————————————————————————————————————————————————

type Made = { bytes: Uint8Array; seconds: number; speed?: number };

function macSay(text: string, voice: string, rate: number): Made {
  const tmp = path.join(OUT, `.tmp-${process.pid}`);
  execFileSync('say', ['-v', voice, '-r', String(rate), '-o', `${tmp}.aiff`, '--', text]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${tmp}.aiff`, '-ac', '1', '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '96k', `${tmp}.mp3`]);
  const bytes = new Uint8Array(fs.readFileSync(`${tmp}.mp3`));
  fs.rmSync(`${tmp}.aiff`, { force: true }); fs.rmSync(`${tmp}.mp3`, { force: true });
  return { bytes, seconds: mp3Seconds(bytes) };
}

async function generate() {
  const provider = (opt('provider') ?? 'elevenlabs') as 'elevenlabs' | 'say';
  if (provider !== 'elevenlabs' && provider !== 'say') die('--provider is elevenlabs or say');
  const model = opt('model') ?? DEFAULT_MODEL;
  fs.mkdirSync(OUT, { recursive: true });
  const m = readManifest();
  const now = provider === 'say' ? 'macos-say' : 'elevenlabs';
  if (m.provider && m.provider !== now) {
    // Never mix draft and real audio in one manifest: a different provider replaces everything.
    if (only) die(`The manifest holds ${m.provider} audio. Making only some lines with ${now} would mix the two: run without --only to replace all of it.`);
    m.lines = {};
  }
  const lines = chosen();
  let voiceFor: (l: SpokenLine) => { name: string; id?: string };
  let apiKey = '';
  if (provider === 'elevenlabs') {
    apiKey = key();
    // A key limited to some permissions may not be allowed to list models; then the model is simply tried.
    try {
      const models = await listModels(fetch, apiKey);
      if (!models.some(x => x.model_id === model)) die(`ElevenLabs has no model “${model}”. Models that can speak: ${models.filter(x => x.can_do_text_to_speech).map(x => x.model_id).join(', ')}`);
    } catch (e) { if (!(e instanceof ElevenError && (e.status === 401 || e.status === 403))) throw e; }
    const c = await resolveCast();
    voiceFor = l => ({ name: shortName(c[l.slot]), id: c[l.slot].voice_id });
    const u = await usage(fetch, apiKey);
    const need = lines.reduce((n, l) => n + l.spoken.length, 0);
    if (u) say(`Credits used this period: ${u.used} of ${u.limit}${u.tier ? ` (${u.tier})` : ''}. This run needs up to ${need}.`);
    if (u && u.limit - u.used < need) die(`Not enough credits left (${u.limit - u.used}) for up to ${need} characters. Use --only to make some lines, or wait for the period to renew.`);
  } else {
    execFileSync('which', ['say']); execFileSync('which', ['ffmpeg']);
    voiceFor = l => ({ name: SLOTS[l.slot].draft });
  }

  m.provider = now;
  m.draft = provider === 'say';
  if (provider === 'elevenlabs') m.model = model; else delete m.model;
  const made: string[] = [], kept: string[] = [];
  for (const l of lines) {
    const v = voiceFor(l);
    // What this audio is: the same provider, model, voice, delivery and words always make the same file, so it is made once.
    const identity = fingerprint([provider, model, v.id ?? v.name, provider === 'elevenlabs' ? settingsFor(model, l.kind) : 'say', l.spoken]);
    const file = `${l.id}.${identity.slice(0, 10)}.mp3`;
    const have = m.lines[l.id];
    if (!flag('force') && have && have.file === file && have.text === l.spoken && fs.existsSync(path.join(OUT, file)) && (have.seconds <= l.room + 1e-9 || have.speed !== undefined)) { kept.push(l.id); continue; }
    const attempt = async (speed: number): Promise<Made> => {
      if (provider === 'say') return { ...macSay(l.spoken, v.name, Math.round(175 * (speed === 1 ? 1 : speed + 0.03))), speed: speed === 1 ? undefined : speed };
      const bytes = await synthesize(fetch, apiKey, { voiceId: v.id!, text: l.spoken, model, settings: settingsFor(model, l.kind, speed), seed: seedFrom(identity) });
      return { bytes, seconds: mp3Seconds(bytes), speed: speed === 1 ? undefined : speed };
    };
    let r = await attempt(1);
    // A line that would still be talking when its card must go is spoken a little faster: by the amount it is over, at least 3%, at most
    // a fifth faster, and at most twice more (each try costs credits). Cards stay for a voice if they can; this is for when they cannot.
    let speed = 1;
    for (let i = 0; i < 2 && r.seconds > l.room && speed < 1.2 && (provider === 'say' || canChangeSpeed(model)); i++) {
      speed = Math.min(1.2, Math.round(speed * Math.max(1.03, r.seconds / (l.room - 0.05)) * 100) / 100);
      r = await attempt(speed);
    }
    fs.writeFileSync(path.join(OUT, file), r.bytes);
    m.lines[l.id] = { file, seconds: Math.round(r.seconds * 100) / 100, text: l.spoken, slot: l.slot, voice: v.name, ...(v.id ? { voiceId: v.id } : {}), ...(r.speed ? { speed: r.speed } : {}), ...(provider === 'elevenlabs' ? { paid: flag('paid') } : {}) };
    made.push(l.id);
    writeManifest(m);
    say(`  ${pad(l.id, 24)}${pad(v.name, 22)}${r.seconds.toFixed(1)} s${r.speed ? ` (sped up ${r.speed}×)` : ''}  [room ${l.room.toFixed(1)} s]`);
  }
  m.provider = provider === 'say' ? 'macos-say' : 'elevenlabs';
  m.draft = provider === 'say';
  if (provider === 'elevenlabs') m.model = model; else delete m.model;
  m.generated = new Date().toISOString();
  // Lines that are no longer read aloud (or were never made) drop out; the files nothing points at are removed.
  for (const id of Object.keys(m.lines)) if (!VOICED.some(l => l.id === id)) delete m.lines[id];
  writeManifest(m);
  pruneUnused(m);
  say(`\nMade ${made.length}, kept ${kept.length}. Manifest: content/incidents/openai-hf/voices.manifest.json${m.draft ? '  (DRAFT audio: placeholders for checking timing, not for showing)' : ''}`);
  const long = VOICED.filter(l => m.lines[l.id] && m.lines[l.id].seconds > l.room + 1e-9);
  if (long.length) say(`\nToo long for their cards (give the card more time with { hold } in film.ts):\n  ${long.map(l => `${l.id}: ${m.lines[l.id].seconds.toFixed(1)} s, room for ${l.room.toFixed(1)} s`).join('\n  ')}`);
  const missing = VOICED.filter(l => !m.lines[l.id]);
  if (missing.length) say(`\nNot yet made: ${missing.map(l => l.id).join(', ')}`);
  say('');
}

/** A few lines, each read by its own voice in several models, on one page of players: how to choose a model by ear. Nothing here goes into the film. */
async function compare() {
  const apiKey = key();
  const wanted = (opt('models') ?? 'eleven_multilingual_v2,eleven_v3,eleven_v4').split(',').map(x => x.trim()).filter(Boolean);
  const ids = (opt('lines') ?? 'q-first-message,q-whoa,q-breakthrough,b-hold-swarm').split(',').map(x => x.trim());
  const lines = ids.map(id => VOICED.find(l => l.id === id) ?? die(`${id} is not a voiced line`));
  const available = await listModels(fetch, apiKey);
  const c = await resolveCast();
  const dir = path.join(OUT, '_compare');
  fs.mkdirSync(dir, { recursive: true });
  const cells: Record<string, Record<string, string>> = {};
  for (const model of wanted) {
    if (!available.some(x => x.model_id === model)) { say(`  ${model}: not offered to this account, skipped`); continue; }
    fs.mkdirSync(path.join(dir, model), { recursive: true });
    for (const l of lines) {
      try {
        const settings = settingsFor(model, l.kind);
        const bytes = await synthesize(fetch, apiKey, { voiceId: c[l.slot].voice_id, text: l.spoken, model, settings, seed: seedFrom(fingerprint([model, l.id])) });
        fs.writeFileSync(path.join(dir, model, `${l.id}.mp3`), bytes);
        (cells[l.id] ??= {})[model] = `<audio controls preload="none" src="${model}/${l.id}.mp3"></audio><small>${mp3Seconds(bytes).toFixed(1)} s</small>`;
        say(`  ${pad(model, 24)}${pad(l.id, 22)}${mp3Seconds(bytes).toFixed(1)} s`);
      } catch (e) {
        (cells[l.id] ??= {})[model] = `<small>${(e instanceof Error ? e.message : String(e)).replace(/</g, '&lt;')}</small>`;
        say(`  ${pad(model, 24)}${pad(l.id, 22)}FAILED: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html = `<!doctype html><meta charset="utf-8"><title>Voices: models side by side</title><style>body{font:15px/1.4 system-ui;margin:2rem;max-width:70rem}td,th{padding:.6rem .8rem;border-bottom:1px solid #ddd;vertical-align:top;text-align:left}small{display:block;color:#666}audio{width:15rem}</style>
<h1>The same lines, read by their own voices, in each model</h1><p>Made ${new Date().toISOString()}. Not part of the film. Choose a model, then: <code>npm run film:voices -- generate --model &lt;model_id&gt; --force</code></p>
<table><tr><th>Line (voice)</th>${wanted.map(m => `<th>${m}</th>`).join('')}</tr>${lines.map(l => `<tr><td><b>${l.id}</b> (${l.slot}: ${esc(c[l.slot].name)})<small>${esc(l.spoken)}</small></td>${wanted.map(m => `<td>${cells[l.id]?.[m] ?? '<small>skipped</small>'}</td>`).join('')}</tr>`).join('')}</table>`;
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  say(`\nOpen http://localhost:4310/film/voices/_compare/index.html (with npm run dev running) and listen.\n`);
}

/** Remove the audio files that no section of the manifest points at. */
function pruneUnused(m: VoiceManifest) {
  const used = new Set([...Object.values(m.lines), ...Object.values(m.narration?.lines ?? {})].map(x => x.file));
  if (fs.existsSync(OUT)) for (const f of fs.readdirSync(OUT)) if (f.endsWith('.mp3') && !used.has(f)) fs.rmSync(path.join(OUT, f));
  const beds = new Set(Object.values(m.music?.lines ?? {}).map(t => t.file));
  if (fs.existsSync(MUSIC_DIR)) for (const f of fs.readdirSync(MUSIC_DIR)) if (f.endsWith('.mp3') && !beds.has(f)) fs.rmSync(path.join(MUSIC_DIR, f));
}

/** The narrator reads every caption. Cached by words, voice and settings; written to the manifest after every line, so a stopped run keeps what it paid for. */
async function narrate() {
  const provider = (opt('provider') ?? 'elevenlabs') as 'elevenlabs' | 'say';
  if (provider !== 'elevenlabs' && provider !== 'say') die('--provider is elevenlabs or say');
  const model = opt('model') ?? DEFAULT_MODEL;
  const now = provider === 'say' ? 'macos-say' : 'elevenlabs';
  fs.mkdirSync(OUT, { recursive: true });
  const m = readManifest();
  const sec = (m.narration ??= { provider: null, draft: false, lines: {} });
  if (sec.provider && sec.provider !== now) {
    if (only) die(`The narration is ${sec.provider} audio. Making only some lines with ${now} would mix the two: run without --only to replace all of it.`);
    sec.lines = {};
  }
  const lines = only ? NARRATION.filter(l => only.includes(l.id)) : NARRATION;
  if (only && lines.length !== only.length) die(`Not caption ids: ${only.filter(id => !NARRATION_BY_ID[id]).join(', ')}`);
  let voiceName: string, voiceId: string | undefined, apiKey = '';
  if (provider === 'elevenlabs') {
    apiKey = key();
    const c = await resolveCast();
    voiceName = shortName(c.narrator); voiceId = c.narrator.voice_id;
    const u = await usage(fetch, apiKey);
    const need = lines.reduce((n, l) => n + l.spoken.length, 0);
    say(`Narrator: ${voiceName}. This run needs up to ${need} characters.${u ? ` Credits used ${u.used} of ${u.limit}.` : ''}`);
    if (u && u.limit - u.used < need) die(`Not enough credits left (${u.limit - u.used}) for up to ${need} characters.`);
  } else { execFileSync('which', ['say']); execFileSync('which', ['ffmpeg']); voiceName = SLOTS.narrator.draft; }
  sec.provider = now; sec.draft = provider === 'say'; if (provider === 'elevenlabs') sec.model = model; else delete sec.model;
  const made: string[] = [], kept: string[] = [];
  for (const l of lines) {
    const settings = settingsFor(model, 'narration');
    const identity = fingerprint(['narration', provider, model, voiceId ?? voiceName, provider === 'elevenlabs' ? settings : 'say', l.spoken]);
    const file = `${l.id}.${identity.slice(0, 10)}.mp3`;
    const have = sec.lines[l.id];
    if (!flag('force') && have && have.file === file && have.text === l.spoken && fs.existsSync(path.join(OUT, file))) { kept.push(l.id); continue; }
    let r: Made;
    if (provider === 'say') r = macSay(l.spoken, voiceName, 165);
    else { const bytes = await synthesize(fetch, apiKey, { voiceId: voiceId!, text: l.spoken, model, settings, seed: seedFrom(identity), previousText: l.before, nextText: l.after }); r = { bytes, seconds: mp3Seconds(bytes) }; }
    fs.writeFileSync(path.join(OUT, file), r.bytes);
    sec.lines[l.id] = { file, seconds: Math.round(r.seconds * 100) / 100, text: l.spoken, slot: 'narrator', voice: voiceName, ...(voiceId ? { voiceId } : {}), ...(provider === 'elevenlabs' ? { paid: flag('paid') } : {}) };
    sec.generated = new Date().toISOString();
    made.push(l.id);
    writeManifest(m);
    say(`  ${l.id}  ${pad(l.spoken.length, 4)} chars  ${r.seconds.toFixed(1)} s  [caption on screen for ${l.room.toFixed(1)} s]`);
  }
  for (const id of Object.keys(sec.lines)) if (!NARRATION_BY_ID[id]) delete sec.lines[id];
  writeManifest(m);
  pruneUnused(m);
  const all = NARRATION.filter(l => sec.lines[l.id]);
  const total = all.reduce((n, l) => n + sec.lines[l.id].seconds, 0);
  const over = all.filter(l => sec.lines[l.id].seconds > l.room + 1e-9);
  say(`\nMade ${made.length}, kept ${kept.length}. The narrator speaks for ${(total / 60).toFixed(1)} minutes in ${all.length} lines (${NARRATION.length - all.length} not made yet).`);
  say(`${over.length} of ${all.length} lines are longer than their caption is on screen, by ${over.reduce((n, l) => n + sec.lines[l.id].seconds - l.room, 0).toFixed(0)} s in all (the film is slowed for them: see timing).${sec.draft ? '\n(DRAFT audio from a macOS voice: placeholders.)' : ''}\n`);
}

/** The same captions in each British voice on one page, and how fast each speaks: how the narrator is chosen by ear (and how long the narration will be). */
async function audition() {
  const apiKey = key();
  const model = opt('model') ?? DEFAULT_MODEL;
  const all = await listVoices(fetch, apiKey);
  const premade = all.filter(v => v.category === 'premade');
  const names = (opt('voices') ?? 'Daniel,George,Alice,Lily').split(',').map(x => x.trim()).filter(Boolean);
  const voices = names.map(n => findVoice(premade, n) ?? die(`No premade voice called ${n}. Run: npm run film:voices -- voices`));
  const sample = [NARRATION[0], NARRATION.find(l => l.shown.startsWith('Another agent wrote'))!].filter(Boolean);
  const dir = path.join(OUT, '_compare', 'narrator');
  fs.mkdirSync(dir, { recursive: true });
  const need = voices.length * sample.reduce((n, l) => n + l.spoken.length, 0);
  say(`Each of ${voices.length} voices reads ${sample.length} captions: about ${need} characters in all.`);
  const totalChars = NARRATION.reduce((n, l) => n + l.spoken.length, 0);
  const rows: string[] = [];
  say(`\n${pad('voice', 12)}${pad('chars/s', 9)}${pad('all captions would take', 26)}`);
  for (const v of voices) {
    const nm = shortName(v);
    fs.mkdirSync(path.join(dir, nm), { recursive: true });
    let chars = 0, secs = 0; const cells: string[] = [];
    for (const l of sample) {
      const settings = settingsFor(model, 'narration');
      const bytes = await synthesize(fetch, apiKey, { voiceId: v.voice_id, text: l.spoken, model, settings, seed: seedFrom(fingerprint([nm, l.id])), previousText: l.before, nextText: l.after });
      fs.writeFileSync(path.join(dir, nm, `${l.id}.mp3`), bytes);
      const sc = mp3Seconds(bytes); chars += l.spoken.length; secs += sc;
      cells.push(`<audio controls preload="none" src="${nm}/${l.id}.mp3"></audio><small>${sc.toFixed(1)} s</small>`);
    }
    const rate = chars / secs;
    say(`${pad(nm, 12)}${pad(rate.toFixed(1), 9)}${(totalChars / rate / 60).toFixed(1)} minutes of narration`);
    rows.push(`<tr><td><b>${nm}</b><small>${v.name.replace(/</g, '&lt;')}</small><small>${Object.entries(v.labels ?? {}).map(([k, x]) => `${k}=${x}`).join(' ')}</small><small>${rate.toFixed(1)} chars/s: all the captions take ${(totalChars / rate / 60).toFixed(1)} minutes</small></td>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`);
  }
  const html = `<!doctype html><meta charset="utf-8"><title>Narrator audition</title><style>body{font:15px/1.4 system-ui;margin:2rem;max-width:72rem}td,th{padding:.7rem .9rem;border-bottom:1px solid #ddd;vertical-align:top;text-align:left}small{display:block;color:#666}audio{width:16rem}</style>
<h1>Who should narrate?</h1><p>The same captions, read by each British voice (${model}). Made ${new Date().toISOString()}. Not part of the film. Choose, then set <code>pin</code> for <code>narrator</code> in <code>content/incidents/openai-hf/voices.ts</code> and run <code>npm run film:voices -- narrate</code>.</p>
<table><tr><th>Voice</th>${sample.map(l => `<th>${l.spoken.slice(0, 70).replace(/</g, '&lt;')}…</th>`).join('')}</tr>${rows.join('')}</table>`;
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  say(`\nOpen http://localhost:4310/film/voices/_compare/narrator/index.html (with npm run dev running) and listen.\n`);
}

/** The music: one bed for each mood. `--sample` makes thirty seconds of each into a listening page and nothing else. */
async function music() {
  const apiKey = key();
  const model = opt('model') ?? MUSIC_MODEL;
  const ids = (opt('moods')?.split(',').map(x => x.trim()).filter(Boolean) ?? MOODS.map(x => x.id)) as Mood[];
  const moods = ids.map(id => MOODS.find(x => x.id === id) ?? die(`No mood called ${id}. The moods are: ${MOODS.map(x => x.id).join(', ')}`));
  const sample = flag('sample');
  const dir = sample ? path.join(MUSIC_DIR, '_compare') : MUSIC_DIR;
  fs.mkdirSync(dir, { recursive: true });
  const seconds = (m: { seconds: number }) => (sample ? 30 : Number(opt('seconds')) || m.seconds);
  say(`${sample ? 'Samples' : 'Beds'} for ${moods.map(x => x.id).join(', ')} with ${model}: ${moods.reduce((n, x) => n + seconds(x), 0)} seconds of music in all (about ${(moods.reduce((n, x) => n + seconds(x), 0) / 60).toFixed(1)} minutes; Eleven Music is billed by the minute).`);
  const m = readManifest();
  const sec = (m.music ??= { provider: null, draft: false, lines: {} });
  const cells: string[] = [];
  for (const mood of moods) {
    const identity = fingerprint(['music', model, mood.prompt, seconds(mood)]);
    const file = sample ? `${mood.id}.mp3` : `${mood.id}.${identity.slice(0, 10)}.mp3`;
    const have = sec.lines[mood.id];
    if (!sample && !flag('force') && have && have.file === file && fs.existsSync(path.join(dir, file))) { say(`  ${pad(mood.id, 10)}kept (${have.seconds.toFixed(0)} s)`); continue; }
    say(`  ${pad(mood.id, 10)}composing ${seconds(mood)} s …`);
    const bytes = await composeMusic(fetch, apiKey, { prompt: mood.prompt, seconds: seconds(mood), model });
    fs.writeFileSync(path.join(dir, file), bytes);
    const got = mp3Seconds(bytes);
    say(`  ${pad(mood.id, 10)}${got.toFixed(1)} s, ${(bytes.length / 1e6).toFixed(1)} MB`);
    cells.push(`<tr><td><b>${mood.id}</b><small>${mood.for}</small></td><td><audio controls preload="none" src="${file}"></audio><small>${got.toFixed(0)} s</small></td><td><small>${mood.prompt.replace(/</g, '&lt;')}</small></td></tr>`);
    if (!sample) {
      sec.lines[mood.id] = { file, seconds: Math.round(got * 10) / 10, prompt: mood.prompt, model };
      sec.provider = 'elevenlabs'; sec.draft = false; sec.model = model; sec.generated = new Date().toISOString();
      writeManifest(m);
    }
  }
  if (sample && cells.length) {
    fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Music samples</title><style>body{font:15px/1.4 system-ui;margin:2rem;max-width:72rem}td,th{padding:.7rem .9rem;border-bottom:1px solid #ddd;vertical-align:top;text-align:left}small{display:block;color:#666}audio{width:18rem}</style><h1>The film's music: thirty seconds of each mood</h1><p>${model}, made ${new Date().toISOString()}. Not part of the film. If you like it, compose the beds: <code>npm run film:voices -- music</code>. To change one, edit its prompt in <code>content/incidents/openai-hf/music.ts</code>.</p><table><tr><th>Mood</th><th>Listen</th><th>Prompt</th></tr>${cells.join('')}</table>`);
    say(`\nOpen http://localhost:4310/film/music/_compare/index.html (with npm run dev running) and listen.\n`);
  } else if (!sample) { pruneUnused(m); say(`\nMusic made. It plays under the film once the page is reloaded.\n`); }
}

function clean() {
  fs.rmSync(OUT, { recursive: true, force: true });
  writeManifest({ ...EMPTY_MANIFEST, lines: {} });
  say('\nRemoved the audio and emptied the manifest. The film is silent again.\n');
}

const help = () => say(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^[\s\S]*?\/\*\*/, '').replace(/^ \* ?/gm, ''));

async function main() {
  if (cmd === 'plan') plan();
  else if (cmd === 'status') await status();
  else if (cmd === 'voices') await voices();
  else if (cmd === 'cast') await cast();
  else if (cmd === 'generate') await generate();
  else if (cmd === 'compare') await compare();
  else if (cmd === 'narrate') await narrate();
  else if (cmd === 'music') await music();
  else if (cmd === 'audition') await audition();
  else if (cmd === 'clean') clean();
  else help();
}

main().catch(e => die(e instanceof Error ? e.message : String(e)));
