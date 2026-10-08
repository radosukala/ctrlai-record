import { AGENT_BY_ID, QUOTE_BY_ID, SOURCES, type Cite } from '@/content/incidents/openai-hf';
import {
  BEATS, BIGS, CALLOUTS, CAPTIONS, DISCLOSURE, DURATION, ORG, QUOTE_CARDS, SCENE_TITLES, STAMPS, TASK_GRID, WAFFLE,
  captionSeconds, cardSeconds, voiceOf, type Beat, type Voice,
} from '@/content/incidents/openai-hf/film';
import { NARRATION, NARRATION_BY_ID } from '@/content/incidents/openai-hf/narration';
import { FILM_DURATION, WARP } from '@/content/incidents/openai-hf/timing';
import { captionId } from '@/content/incidents/openai-hf/film';
import { MOODS } from '@/content/incidents/openai-hf/music';
import { LINES, LINE_BY_ID, PRONOUNCE, READ_PARAPHRASES, SLOT_LIST, wordsOf, type VoiceManifest } from '@/content/incidents/openai-hf/voices';
import MANIFEST_JSON from '@/content/incidents/openai-hf/voices.manifest.json';
import './script.css';

const MANIFEST = MANIFEST_JSON as unknown as VoiceManifest;

/**
 * The film's script, scene by scene, as text: what is said, by whom, when it appears and for how long, and how long it needs to be
 * read in. Built from the same script file the film plays from, so it cannot drift from it.
 */
const mmss = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const SRC = { 'oai-blog': 'OpenAI blog', 'oai-tr': 'OpenAI technical report', metr: 'METR', hf: 'Hugging Face', 'oai-astra': 'OpenAI Astra system card', fortune: 'Fortune' } as const;
const cite = (c: Cite) => `${SRC[c.s]} · ${c.at}`;
const ORG_NAME: Partial<Record<Voice, string>> = { openai: 'OpenAI', metr: 'METR', hf: 'Hugging Face' };

/** How an agent's line is voiced: who says it, in which voice, what the voice is given if that differs from the screen, and the audio if there is any. */
type VoiceRow = { agent: string; slot: string; silent: boolean; voice?: string; spoken?: string; file?: string; seconds?: number; narrator?: boolean };
type Row = { t0: number; t1: number; kind: string; tone: 'us' | 'agent' | 'org' | 'data' | 'picture'; who?: string; text: string; src?: string; need?: number; voice?: VoiceRow };

function rowsFor(b: Beat): Row[] {
  const inBeat = (t: number) => t >= b.t0 && t < b.t1;
  const rows: Row[] = [];
  for (const s of SCENE_TITLES) if (inBeat(s.t0)) rows.push({ t0: s.t0, t1: s.t1, kind: 'Title', tone: 'picture', text: `${s.title} · ${s.earlier ? 'Earlier · ' : ''}${s.when}` });
  for (const c of CAPTIONS) {
    if (!inBeat(c.t0)) continue;
    const line = NARRATION_BY_ID[captionId(c.text)];
    const rec = MANIFEST.narration?.lines[line.id];
    const heard = rec && rec.text === line.spoken ? rec : undefined;
    const voice: VoiceRow = { agent: 'Narrator', slot: 'narrator', silent: false, narrator: true, voice: heard?.voice, spoken: wordsOf(line.spoken).join(' ') !== wordsOf(c.text).join(' ') || /[A-Z]{2}|\d/.test(c.text) ? line.spoken : undefined, file: heard?.file, seconds: heard?.seconds };
    rows.push({ t0: c.t0, t1: c.t1, kind: c.view ? 'Caption: our view' : 'Caption', tone: 'us', who: c.view ? 'Us, labelled Our view on screen' : 'Us', text: c.text, need: captionSeconds(c.text), voice });
  }
  for (const c of QUOTE_CARDS) {
    if (!inBeat(c.t0)) continue;
    const q = QUOTE_BY_ID[c.id];
    const v = voiceOf(q);
    const agentish = v === 'agent' || v === 'message';
    const shown = c.excerpt ?? q.text;
    const kind = v === 'message' ? 'Message an agent posted' : v === 'agent' ? (q.kind === 'reasoning-raw' ? 'Recorded reasoning' : q.kind === 'reasoning-quoted' ? 'Recorded reasoning, as quoted by OpenAI' : 'Recorded reasoning, as paraphrased') : 'Statement';
    const line = agentish ? LINE_BY_ID[c.id] : undefined;
    const rec = line ? MANIFEST.lines[c.id] : undefined;
    const heard = line && rec && rec.text === line.spoken ? rec : undefined;
    const voice: VoiceRow | undefined = line && { agent: line.agent, slot: line.slot, silent: !line.voiced, voice: heard?.voice, spoken: line.voiced && wordsOf(line.spoken).join(' ') !== wordsOf(shown).join(' ') ? line.spoken : undefined, file: heard?.file, seconds: heard?.seconds };
    rows.push({ t0: c.t0, t1: c.t1, kind, tone: agentish ? 'agent' : 'org', who: agentish ? (c.agent ?? q.by ?? 'An agent') : ORG_NAME[v], text: shown + (c.excerpt ? ' (excerpt)' : ''), src: cite(q.src), need: cardSeconds(shown, v), voice });
  }
  for (const x of BIGS) if (inBeat(x.t0)) rows.push({ t0: x.t0, t1: x.t1, kind: 'Number', tone: 'data', text: `${x.value} — ${x.label}`, src: cite(x.cite), need: 1.5 + 0.34 * words(x.label) });
  for (const s of STAMPS) if (inBeat(s.t0)) rows.push({ t0: s.t0, t1: s.t1, kind: 'Date', tone: 'data', text: s.body ? `${s.head} — ${s.body}` : s.head, src: cite(s.cite) });
  for (const c of CALLOUTS) if (inBeat(c.t0)) rows.push({ t0: c.t0, t1: c.t1, kind: 'Agent named on the picture', tone: 'picture', who: c.id, text: c.says ?? AGENT_BY_ID[c.id]?.role ?? '' });
  for (const [w0, w1] of ORG.windows) if (inBeat(w0)) rows.push({ t0: w0, t1: w1, kind: 'Chart', tone: 'picture', text: 'Who organised whom: PHASEONE10841 → PHASEONE[big] → three approaches, with the agents the cast puts under each' });
  if (inBeat(TASK_GRID.t0)) rows.push({ t0: TASK_GRID.t0, t1: TASK_GRID.t1, kind: 'Picture', tone: 'picture', text: 'A grid of the test’s tasks; the ones no OpenAI model had ever solved turn amber' });
  if (inBeat(WAFFLE.t0)) rows.push({ t0: WAFFLE.t0, t1: WAFFLE.t1, kind: 'Picture', tone: 'picture', text: 'A hundred squares: how many of every hundred tasks the board discussed came from the unsolved ones' });
  return rows.sort((a, b2) => a.t0 - b2.t0 || a.t1 - b2.t1);
}

/** Who speaks, in what voice, and how a voice says what the screen shows. */
function VoicesPanel() {
  const made = Object.keys(MANIFEST.lines).length;
  return (
    <section className="script-voices" aria-label="The agents’ voices">
      <h2>The agents’ voices</h2>
      <p>
        An agent’s words can be read aloud by a synthetic voice (there is no recording of any agent: they wrote text). A few agents that come back each have a voice of their own; every other agent shares one of a pool of six, and the same agent always has the same one.
        METR’s paraphrases{READ_PARAPHRASES ? ' are read too' : ' are not read: a paraphrase is not what the agent said'}. Voices made so far: {made}{MANIFEST.provider ? ` (${MANIFEST.provider === 'macos-say' ? 'draft audio from macOS voices, for checking timing' : `ElevenLabs, ${MANIFEST.model}`})` : ''}. How to make them: docs/FILM-VOICES.md.
      </p>
      <table>
        <thead><tr><th>Voice</th><th>For</th><th>Should sound like</th><th>Used by</th></tr></thead>
        <tbody>
          {SLOT_LIST.map(sl => {
            const used = LINES.filter(l => l.slot === sl.slot);
            const heard = used.map(l => MANIFEST.lines[l.id]?.voice).find(Boolean);
            return (
              <tr key={sl.slot}>
                <td><b>{sl.slot}</b>{heard ? <><br /><small>{heard}</small></> : null}</td>
                <td>{sl.for}</td>
                <td>{sl.brief}</td>
                <td>{Array.from(new Set(used.map(l => l.agent))).join('; ')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="script-note">What a voice is given instead of what is printed (nothing else about a word is changed): {Object.entries(PRONOUNCE).map(([k, v]) => <span key={k}><code>{k}</code> → <i>{v}</i>; </span>)}a board message’s underscores are spaces, its <i>zz</i> prefix is dropped, a bracket is dropped, and a slash is <i>or</i>.</p>
    </section>
  );
}

/** The music: a bed for each mood, and the parts of the film each plays under. */
function MusicPanel() {
  const sec = MANIFEST.music;
  const titles = Object.fromEntries(BEATS.map(b => [b.id, b.title]));
  return (
    <section className="script-voices" aria-label="The music">
      <h2>The music</h2>
      <p>
        {sec && Object.keys(sec.lines).length
          ? <>A dark, quiet instrumental score under the film, {sec.provider === 'synth' ? 'composed in code for this film (drones, slow pads, sparse low notes, far-off metal and a great deal of reverb, in D minor; nothing sampled or downloaded, so there is nothing to license)' : 'made with Eleven Music'}. It is not tied to the film’s clock: one bed for each mood, looped, and the film changes bed (a slow crossfade) when it enters a part of a different mood, so a jump, a step or a pause never leaves it in the wrong place. It makes way for every voice and rests when the film is paused.</>
          : <>No music has been made yet: <code>npx tsx scripts/film-score.ts</code> composes it, or <code>npm run film:voices -- music</code> makes it with Eleven Music (a paid plan).</>}
      </p>
      <table>
        <thead><tr><th>Mood</th><th>Plays under</th><th>What it is</th><th>Listen</th></tr></thead>
        <tbody>
          {MOODS.map(m => {
            const t = sec?.lines[m.id];
            return (
              <tr key={m.id}>
                <td><b>{m.id}</b>{t ? <><br /><small>{t.seconds.toFixed(0)} s, looped</small></> : null}</td>
                <td>{m.scenes.map(sc => titles[sc]).join(' · ')}</td>
                <td>{m.for}</td>
                <td>{t ? <audio controls preload="none" src={`/film/music/${t.file}`} aria-label={`Hear the ${m.id} bed`} /> : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export function Script() {
  const caps = CAPTIONS.length;
  const cards = QUOTE_CARDS.map(c => voiceOf(QUOTE_BY_ID[c.id]));
  const agentCards = cards.filter(v => v === 'agent' || v === 'message').length;
  const orgCards = cards.length - agentCards;
  const capWords = CAPTIONS.reduce((n, c) => n + words(c.text), 0);
  const narrationMinutes = Object.values(MANIFEST.narration?.lines ?? {}).reduce((n, l) => n + l.seconds, 0) / 60;
  return (
    <div className="script">
      <header className="script-head">
        <p className="script-eyebrow">The film · script and timing</p>
        <h1>What the film says, and when</h1>
        <p className="script-lede">
          Every word on screen, in order, with when it appears, how long it stays, and how long it needs to be read. This page is built from the same script the film plays from, so it cannot drift from it. Times are screen seconds. The film is written to {mmss(DURATION)} of screen time{WARP.added > 1 ? `, and plays for ${mmss(FILM_DURATION)}: it slows, by up to ${WARP.max.toFixed(1)} times and eased in and out, wherever a voice needs longer than the words need to be read, so nothing is rushed` : ''}.
        </p>
        <ul className="script-key" aria-label="Who is speaking">
          <li><b className="script-chip is-us">Us</b> Our own plain captions, at the foot of the picture.</li>
          <li><b className="script-chip is-agent">Agent</b> An agent’s own words: its recorded reasoning, or a message it posted. Amber, with its name, on the left.</li>
          <li><b className="script-chip is-org">OpenAI · METR · Hugging Face</b> An organisation’s own words, on a paper card with where in its report they are, on the right.</li>
          <li><b className="script-chip is-data">Number · Date</b> A figure or a day the sources give, with where it comes from.</li>
        </ul>
        <dl className="script-stats">
          <div><dt>Captions</dt><dd>{caps} <small>({capWords} words)</small></dd></div>
          <div><dt>Agents speak</dt><dd>{agentCards} <small>times</small></dd></div>
          <div><dt>Organisations speak</dt><dd>{orgCards} <small>times</small></dd></div>
          <div><dt>Read aloud</dt><dd>{LINES.filter(l => l.voiced).length} <small>agent lines</small></dd></div>
          <div><dt>Narrator</dt><dd>{narrationMinutes ? narrationMinutes.toFixed(1) : '—'} <small>{narrationMinutes ? `minutes, ${Object.keys(MANIFEST.narration?.lines ?? {}).length} captions` : 'not made yet'}</small></dd></div>
          <div><dt>Numbers</dt><dd>{BIGS.length}</dd></div>
        </dl>
        <p className="script-note">On the picture, always: <i>{DISCLOSURE}</i></p>
        <VoicesPanel />
        <MusicPanel />
        <p className="script-links"><a href="/incident/openai-hugging-face/film">Watch the film</a> <a href="/incident/openai-hugging-face">The reconstruction</a></p>
      </header>

      <nav className="script-nav" aria-label="Scenes">
        {BEATS.map(b => <a key={b.id} href={`#${b.id}`}><span>{b.title}</span><small>{mmss(b.t0)}</small></a>)}
      </nav>

      {BEATS.map(b => {
        const rows = rowsFor(b);
        const need = rows.reduce((n, r) => n + (r.need ?? 0), 0);
        return (
          <section key={b.id} id={b.id} className="script-scene">
            <h2><span>{b.title}</span> <small>{b.when}</small></h2>
            <p className="script-scene-meta">{mmss(b.t0)} – {mmss(b.t1)} · {(b.t1 - b.t0).toFixed(1)} s on screen · {need.toFixed(0)} s of it is reading</p>
            <ol className="script-rows">
              {rows.map((r, i) => (
                <li key={i} className={`script-row is-${r.tone}`}>
                  <span className="script-time">{mmss(r.t0)}<small>{(r.t1 - r.t0).toFixed(1)} s{r.need ? ` · reads in ${r.need.toFixed(1)}` : ''}</small></span>
                  <span className="script-what">
                    <span className="script-kind">{r.who ? <b>{r.who}</b> : null} {r.kind}</span>
                    <span className="script-text">{r.text}</span>
                    {r.src ? <span className="script-src">{r.src}</span> : null}
                    {r.voice ? (
                      <span className="script-voice">
                        {r.voice.silent ? <>Not read aloud: METR’s paraphrase of what the agent wrote, not its words. </> : r.voice.narrator ? <>Narrator{r.voice.voice ? ` (${r.voice.voice})` : ''}{r.voice.seconds ? `, ${r.voice.seconds.toFixed(1)} s` : ''}. </> : <>Voice <b>{r.voice.slot}</b>{r.voice.voice ? ` (${r.voice.voice})` : ''} · {r.voice.agent}. </>}
                        {r.voice.spoken ? <>Said as: <i>{r.voice.spoken}</i> </> : null}
                        {r.voice.file ? <audio controls preload="none" src={`/film/voices/${r.voice.file}`} aria-label={`Hear ${r.voice.narrator ? 'the narrator' : r.who}`} /> : null}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
            <p className="script-cites">Draws on: {b.cites.map(cite).join(' · ')}</p>
          </section>
        );
      })}
      <p className="script-note">Sources: {Object.values(SOURCES).map(s => s.short).join(', ')}. Not an official account from OpenAI, METR or Hugging Face.</p>
    </div>
  );
}
