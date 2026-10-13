/**
 * Makes the narrator's voice for "The day before": one audio file for each line the narrator says (see content/scenarios/day-before/film.ts,
 * `NARRATION`), and the manifest the film plays from (content/scenarios/day-before/voices.manifest.json).
 *
 *   npm run day-before:voices -- plan                 what would be sent, how many characters, about what it costs (no network)
 *   npm run day-before:voices -- narrate --paid       make the lines that are not made yet (or whose words changed)
 *        --force        make every line again, even those already made (this spends credits again)
 *        --only id,id   only these lines
 *        --paid         say that this run is on a paid ElevenLabs plan, whose audio may be published commercially; the free plan's may not
 *
 * The voice is the first film's narrator (Daniel), with the same model and settings, so the two films sound like one series. A line is
 * cached by its words, voice, model and settings: change a caption's words and only that line is made again. Each line is saved as it is
 * made, so a run that stops (no credits left) keeps what it paid for. There is no `clean`: a changed line is simply replaced.
 *
 * The key is read from the environment (ELEVENLABS_API_KEY, for example from `--env-file`) and is never printed or written anywhere.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_MODEL, fingerprint, mp3Seconds, seedFrom, settingsFor, synthesize } from '../lib/film-voices';
import { NARRATION, NARRATION_AROUND } from '../content/scenarios/day-before/film';
import type { VoiceManifest } from '../content/scenarios/day-before/narration';

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public/day-before/voices');
const MANIFEST = path.join(ROOT, 'content/scenarios/day-before/voices.manifest.json');
/** The first film's narrator: ElevenLabs' premade Daniel ("Steady Broadcaster"). */
const NARRATOR = { name: 'Daniel', voiceId: 'onwK4e9ZLuTAKqWW03F9' };
/** What this account was billed for the first film's narration: 9,415 characters cost 4,749 credits. The dashboard is the truth. */
const CREDITS_PER_CHAR = 0.505;
/** About how fast Daniel speaks, measured on the first film: 12.5 characters a second. */
const CHARS_PER_SECOND = 12.5;

const [cmd = 'help', ...rest] = process.argv.slice(2);
const flag = (name: string) => rest.includes(`--${name}`);
const opt = (name: string) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
const only = opt('only')?.split(',').map(s => s.trim()).filter(Boolean);
const say = (...a: unknown[]) => console.log(...a);
const die = (m: string): never => { console.error(`\n${m}\n`); process.exit(1); };
const pad = (s: string | number, n: number) => String(s).padEnd(n);
const readManifest = (): VoiceManifest => (fs.existsSync(MANIFEST) ? (JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as VoiceManifest) : { version: 1, provider: null, lines: {} });
const writeManifest = (m: VoiceManifest) => fs.writeFileSync(MANIFEST, `${JSON.stringify(m, null, 2)}\n`);

function plan() {
  const m = readManifest();
  const chars = NARRATION.reduce((n, l) => n + l.spoken.length, 0);
  say(`\nThe narrator says ${NARRATION.length} different lines (a line the film says twice is made once). ${chars} characters: about ${Math.round(chars * CREDITS_PER_CHAR)} credits, about ${(chars / CHARS_PER_SECOND / 60).toFixed(1)} minutes of speech.\n`);
  say(`${pad('id', 12)}${pad('kind', 10)}${pad('chars', 6)}${pad('est s', 7)}state`);
  let todo = 0;
  for (const l of NARRATION) {
    const got = m.lines[l.id];
    const state = !got ? 'not made yet' : got.text === l.spoken ? `${got.seconds.toFixed(1)} s${got.paid ? ', paid plan' : ', NOT marked as made on a paid plan'}` : 'STALE: the words have changed';
    if (!got || got.text !== l.spoken) todo += l.spoken.length;
    say(`${pad(l.id, 12)}${pad(l.kind, 10)}${pad(l.spoken.length, 6)}${pad((l.spoken.length / CHARS_PER_SECOND).toFixed(1), 7)}${state}`);
    say(`${' '.repeat(12)}${l.spoken}`);
  }
  say(`\nStill to make: ${todo} characters, about ${Math.round(todo * CREDITS_PER_CHAR)} credits.\n`);
}

async function narrate() {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim() || die('There is no ELEVENLABS_API_KEY in the environment (use --env-file with the .env.local that holds it).');
  if (!flag('paid')) die('Say whether this is a paid plan: add --paid. (The free plan has no commercial licence, and audio made on it must not be published.)');
  const model = opt('model') ?? DEFAULT_MODEL;
  const lines = only ? NARRATION.filter(l => only.includes(l.id)) : NARRATION;
  if (only && lines.length !== only.length) die(`Not line ids: ${only.filter(id => !NARRATION.some(l => l.id === id)).join(', ')}`);
  fs.mkdirSync(OUT, { recursive: true });
  const m = readManifest();
  m.provider = 'elevenlabs'; m.model = model;
  const settings = settingsFor(model, 'narration');
  const need = lines.reduce((n, l) => n + l.spoken.length, 0);
  say(`Narrator: ${NARRATOR.name}. Up to ${need} characters (about ${Math.round(need * CREDITS_PER_CHAR)} credits) if every line has to be made.`);
  const made: string[] = [], kept: string[] = [];
  for (const l of lines) {
    const identity = fingerprint(['day-before', 'elevenlabs', model, NARRATOR.voiceId, settings, l.spoken]);
    const file = `${l.id}.${identity.slice(0, 10)}.mp3`;
    const have = m.lines[l.id];
    if (!flag('force') && have && have.file === file && have.text === l.spoken && fs.existsSync(path.join(OUT, file))) { kept.push(l.id); continue; }
    const around = NARRATION_AROUND(l.id);
    const bytes = await synthesize(fetch, apiKey, { voiceId: NARRATOR.voiceId, text: l.spoken, model, settings, seed: seedFrom(identity), previousText: around.before, nextText: around.after });
    const seconds = mp3Seconds(bytes);
    fs.writeFileSync(path.join(OUT, file), bytes);
    if (have && have.file !== file) fs.rmSync(path.join(OUT, have.file), { force: true });
    m.lines[l.id] = { file, seconds: Math.round(seconds * 100) / 100, text: l.spoken, voice: NARRATOR.name, voiceId: NARRATOR.voiceId, paid: true };
    m.generated = new Date().toISOString();
    made.push(l.id);
    writeManifest(m);
    say(`  ${l.id}  ${pad(l.spoken.length, 4)} chars  ${seconds.toFixed(1)} s`);
  }
  // Recordings of lines the film no longer says are dropped.
  for (const id of Object.keys(m.lines)) if (!NARRATION.some(l => l.id === id)) { fs.rmSync(path.join(OUT, m.lines[id].file), { force: true }); delete m.lines[id]; }
  writeManifest(m);
  const total = NARRATION.filter(l => m.lines[l.id]).reduce((n, l) => n + m.lines[l.id].seconds, 0);
  say(`\nMade ${made.length}, kept ${kept.length}. The narrator speaks for ${(total / 60).toFixed(1)} minutes in ${NARRATION.filter(l => m.lines[l.id]).length} of ${NARRATION.length} lines.\n`);
}

const commands: Record<string, () => void | Promise<void>> = { plan, narrate };
(commands[cmd] ?? (() => say('Commands: plan, narrate [--paid] [--force] [--only id,id]')))();
