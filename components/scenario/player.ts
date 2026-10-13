/**
 * The player for a scenario film. Plain DOM and canvas, no framework, so the same code runs in the site (through a thin
 * React wrapper) and in a standalone page. The picture is a pure function of film time: `draw(t)` draws any frame on its
 * own. Words, cards and choices are cues that are visible between two times. The web player stops at each decision until
 * the viewer chooses; a video (capture mode) does not stop: the film itself holds on the options.
 */
import { drawAnnots, drawModel, type State } from './render';
import type { City } from './city';
import type { Clip, Cue, Decision, FilmDef, MusicBed } from './types';
import { clamp, fadeWindow, ramp } from './motion';

export type Frame = { state: State; black: number };
export type Film = FilmDef & { city: City; frameAt: (t: number) => Frame };
export type PlayerOptions = { capture?: boolean; bare?: boolean; startAt?: number; storageKey?: string; maxWidth?: number; maxDpr?: number; /** A film time to show, without words, behind the Play button until the viewer starts. */ poster?: number; /** Recorded narration to play from memory rather than from the network: base64 audio, by the clip's `src` (for a page that cannot fetch). */ clipData?: Record<string, string> };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const STOPS = ['DAY 0', 'DAY 1', 'DAY 3', 'DAY 7', 'DAY 10'];
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const TAG = 'EXERCISE · NOT REAL';
export const DISCLOSURE = 'A rehearsal. The city, the night and the events in the picture are imagined, numbers and times included.<br>Cards with a source are real quotations, checked word for word against it.';

type Item = { cue: Cue; el: HTMLElement; shown: boolean; op: number; edge: number; sub?: { el: HTMLElement; at: number }[] };

export function createPlayer(root: HTMLElement, film: Film, opts: PlayerOptions = {}) {
  const capture = !!opts.capture, bare = !!opts.bare;
  const hasVoice = !capture && !!film.clips?.length, hasMusic = !capture && !!film.beds?.length;
  const key = opts.storageKey ?? 'day-before:answers:v1';
  root.classList.add('dbf'); if (capture) root.classList.add('dbf-capture');
  root.innerHTML = `
    <div class="dbf-stage">
      <canvas class="dbf-canvas"></canvas>
      <div class="dbf-vignette"></div><div class="dbf-title-shade"></div><div class="dbf-grain"></div>
      ${bare ? '' : `<div class="dbf-ui"></div>
      <div class="dbf-hud"><div class="dbf-scene"><span class="dbf-tag"><i></i>${TAG}</span><span class="dbf-label"></span></div>
        <div class="dbf-timeline" style="opacity:0"><span class="dbf-tl-scale">not to scale</span><div class="dbf-tl-track"></div><div class="dbf-tl-labels"></div></div></div>
      <div class="dbf-stamps"></div>
      <p class="dbf-note">${DISCLOSURE}</p>`}
      <div class="dbf-fade"></div>
      ${capture ? (bare ? '' : '<p class="dbf-watermark">ctrlai.com</p>') : `<button type="button" class="dbf-start" aria-label="Play the film"><span><b>Play</b><small>${hasVoice && hasMusic ? 'With a synthetic narrator and music composed in code.' : hasVoice ? 'With a synthetic narrator.' : 'No sound yet.'} You will be asked to choose five times, and the film waits for you. Space pauses; ← → move by beat; A, B, C choose; ${hasVoice || hasMusic ? 'M mutes; ' : ''}F full screen.</small><small class="dbf-rotate">On a phone, turn it sideways: the picture is made for a wide screen.</small></span></button>`}
    </div>
    ${capture ? '' : `<div class="dbf-bar"><button type="button" class="dbf-btn dbf-play" aria-label="Play">Play</button>
      <div class="dbf-scrub"><input class="dbf-range" type="range" min="0" max="${Math.round(film.duration * 10)}" value="0" step="1" aria-label="Position in the film"><div class="dbf-ticks"></div></div>
      <span class="dbf-time">0:00 / ${fmt(film.duration)}</span>${hasVoice ? '<button type="button" class="dbf-btn dbf-voice" aria-pressed="false" aria-label="Narrator">Voice on</button>' : ''}${hasMusic ? '<button type="button" class="dbf-btn dbf-music" aria-pressed="false" aria-label="Music">Music on</button>' : ''}<button type="button" class="dbf-btn dbf-fs" aria-label="Full screen">Full screen</button></div>`}`;

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T | null;
  const stage = $('.dbf-stage')!, canvas = $<HTMLCanvasElement>('.dbf-canvas')!, ctx = canvas.getContext('2d')!;
  const ui = $('.dbf-ui'), stamps = $('.dbf-stamps'), fade = $('.dbf-fade')!, shade = $('.dbf-title-shade')!;
  const hudLabel = $('.dbf-label'), tlEl = $('.dbf-timeline'), tlTrack = $('.dbf-tl-track'), tlLabels = $('.dbf-tl-labels');
  const startBtn = $('.dbf-start'), playBtn = $('.dbf-play'), voiceBtn = $('.dbf-voice'), musicBtn = $('.dbf-music'), range = $<HTMLInputElement>('.dbf-range'), timeEl = $('.dbf-time'), fsBtn = $('.dbf-fs'), ticks = $('.dbf-ticks');
  if (tlTrack) tlTrack.innerHTML = STOPS.map((_, i) => `<i class="dbf-tl-tick" style="left:${(i / (STOPS.length - 1)) * 100}%"></i>`).join('') + '<i class="dbf-tl-span"></i>';
  if (ticks) ticks.innerHTML = film.decisions.map(d => `<i style="left:${(d.pauseAt / film.duration) * 100}%"></i>`).join('');

  // ---- what the viewer chose (kept in this browser only; the film works without it) ----
  let answers: Record<string, string> = {};
  try { answers = JSON.parse(localStorage.getItem(key) ?? '{}') || {}; } catch { answers = {}; }
  const save = () => { try { localStorage.setItem(key, JSON.stringify(answers)); } catch { /* private window: the film still plays */ } };

  // ---- the cues, built once ----
  const items: Item[] = [];
  let ledgerEl: HTMLElement | null = null;
  const addTo = (parent: HTMLElement | null, html: string) => { const d = document.createElement('div'); d.innerHTML = html.trim(); const el = d.firstElementChild as HTMLElement; parent?.appendChild(el); return el; };
  if (ui && stamps) {
    for (const cue of film.cues) {
      let el: HTMLElement | null = null; let edge = 0.5; let sub: Item['sub'];
      switch (cue.k) {
        case 'caption': el = addTo(ui, `<p class="dbf-caption${cue.left ? ' is-left' : ''}">${esc(cue.text)}</p>`); break;
        case 'card': edge = 0.6; el = addTo(ui, `<figure class="dbf-card is-${cue.side}${cue.gap ? ' is-gap' : ''}"${cue.top ? ` style="top:${cue.top}cqw"` : ''}><header><span class="dbf-chip">${esc(cue.chip)}</span><span class="dbf-kind">${esc(cue.kind)}</span></header>${cue.gap ? `<p class="dbf-gap">${cue.html}</p>` : `<blockquote>${cue.html}</blockquote><figcaption><span>${esc(cue.src)}</span><em>word for word</em></figcaption>`}</figure>`); break;
        case 'stamp': edge = 0.6; el = addTo(stamps, `<div class="dbf-stamp"><b>${esc(cue.head)}</b>${cue.text ? `<span>${esc(cue.text)}</span>` : ''}</div>`); break;
        case 'hyp': edge = 0.6; el = addTo(ui, `<div class="dbf-hyp"><span class="dbf-kicker">${esc(cue.kicker)}</span>${cue.items.map(o => `<div class="dbf-pill"><kbd>${o.k}</kbd><div><b>${esc(o.b)}</b><span>${esc(o.s)}</span></div></div>`).join('')}</div>`);
          sub = cue.items.map((o, i) => ({ el: el!.children[i + 1] as HTMLElement, at: o.at })); break;
        case 'ask': {
          const d = film.decisions.find(x => x.id === cue.id)!;
          edge = 0.6; el = addTo(ui, `<div class="dbf-askwrap" data-d="${cue.id}"><p class="dbf-ask">${esc(cue.h)}${cue.p ? `<small>${esc(cue.p)}</small>` : ''}<small class="dbf-yours" hidden></small></p><div class="dbf-pills">${d.opts.map(o => `<button type="button" class="dbf-pill" data-k="${o.k}"><kbd>${o.k}</kbd><b>${esc(o.b)}</b></button>`).join('')}</div>${cue.timer ? `<div class="dbf-timerbar"><span>${esc(cue.timer)}</span><i></i></div>` : ''}<span class="dbf-choose" hidden>Choose A, B or C · Enter to skip</span></div>`);
          break;
        }
        case 'title': edge = 0.9; el = addTo(ui, `<div class="dbf-title"><span class="dbf-mark"><span>Ctrl</span><span class="dbf-mark-ai">AI</span></span><span class="dbf-eyebrow">${esc(cue.eyebrow)}</span><h2>${esc(cue.h)}</h2><p class="dbf-sub">${cue.sub}</p></div>`); break;
        case 'ledger': edge = 0.8; el = addTo(ui, `<div class="dbf-ledger"><span class="dbf-kicker">${esc(cue.kicker)}</span><h2>${esc(cue.h)}</h2><div class="dbf-rows"></div><footer>${cue.foot}</footer></div>`); ledgerEl = el; break;
        case 'note': el = addTo(ui, `<p class="dbf-line">${cue.html}</p>`); break;
        default: break; // label and timeline cues are drawn in the HUD
      }
      if (el) { el.hidden = true; items.push({ cue, el, shown: false, op: -1, edge, sub }); }
    }
  }
  const renderLedger = () => {
    const rows = ledgerEl?.querySelector('.dbf-rows'); if (!rows) return;
    rows.innerHTML = film.decisions.map((d, i) => {
      const k = answers[d.id]; const o = d.opts.find(x => x.k === k);
      return `<div class="dbf-row${o ? ' is-yours' : ''}"><i>${i + 1}</i><div><b>${esc(d.name)}</b><span>${o ? `${o.k} · ${esc(o.b)}` : `Example: ${esc(d.example)}`}</span></div></div>`;
    }).join('');
  };
  renderLedger();
  const syncPicks = () => root.querySelectorAll<HTMLElement>('.dbf-askwrap').forEach(w => w.querySelectorAll<HTMLElement>('.dbf-pill').forEach(p => p.classList.toggle('is-pick', answers[w.dataset.d ?? ''] === p.dataset.k)));
  syncPicks();

  // ---- sound: the narrator's recorded clips and the music's beds, on one Web Audio context ----
  // Web Audio, not <audio>: one context, unlocked by the first press of Play (Safari and phones need that); a clip can start part way
  // through when the viewer jumps; and a pause can freeze every sound at once by suspending the context. The picture is the master: if
  // the voice has drifted from it, the voice is put back. The music is not tied to the clock: a bed loops (crossfaded at its seam) and is
  // changed, crossfaded, when the film enters a scene of another mood; a bed that does not loop is scored to its scene.
  const clips: Clip[] = hasVoice ? film.clips! : [];
  const beds: MusicBed[] = hasMusic ? film.beds! : [];
  const readFlag = (name: string) => { try { return localStorage.getItem(`${key}:${name}`) === '1'; } catch { return false; } };
  const writeFlag = (name: string, on: boolean) => { try { localStorage.setItem(`${key}:${name}`, on ? '1' : '0'); } catch { /* not kept */ } };
  let voiceOff = readFlag('voice-off'), musicOff = readFlag('music-off');
  let actx: AudioContext | null = null, master: GainNode | null = null, meter: AnalyserNode | null = null;
  let musicBus: GainNode | null = null, musicMeter: AnalyserNode | null = null;
  const decoded = new Map<string, AudioBuffer>(), loading = new Map<string, Promise<void>>();
  let voice: { id: string; at: number; node: AudioBufferSourceNode; ctxStart: number; offset: number } | null = null;
  const bytesOf = async (src: string): Promise<ArrayBuffer> => {
    const inline = opts.clipData?.[src];
    if (inline) { const bin = atob(inline), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
    return (await fetch(src)).arrayBuffer();
  };
  const load = (src: string) => {
    let p = loading.get(src);
    if (!p && actx) { const ctx = actx; p = bytesOf(src).then(b => ctx.decodeAudioData(b)).then(buf => { decoded.set(src, buf); }).catch(() => { /* this line stays silent */ }); loading.set(src, p); }
    return p;
  };
  const MUSIC_LEVEL = 0.7;
  const bedBytes = new Map<string, Promise<ArrayBuffer>>(), bedBuf = new Map<string, AudioBuffer>(), bedDecoding = new Map<string, Promise<void>>();
  /** Beds are decoded when they are about to be wanted (a bed is minutes of stereo: decoded, tens of megabytes) and let go of after. */
  const decodeBed = (src: string) => {
    if (bedBuf.has(src)) return Promise.resolve();
    let p = bedDecoding.get(src);
    if (!p && actx) {
      const ctx = actx; let bytes = bedBytes.get(src);
      if (!bytes) { bytes = bytesOf(src); bedBytes.set(src, bytes); }
      p = bytes.then(b => ctx.decodeAudioData(b.slice(0))).then(buf => { bedBuf.set(src, buf); }).catch(() => { /* this part of the film stays without music */ }).finally(() => { bedDecoding.delete(src); });
      bedDecoding.set(src, p);
    }
    return p ?? Promise.resolve();
  };
  type Playing = { id: string; src: string; out: GainNode; stop: () => void; startCtx: number; offset0: number; scored: boolean; sceneT0: number };
  let bedNow: Playing | null = null;
  const fadeAndStop = (p: Playing, tau = 0.9, afterMs = 5000) => {
    if (!actx) return;
    const now = actx.currentTime; p.out.gain.cancelScheduledValues(now); p.out.gain.setTargetAtTime(0, now, tau);
    window.setTimeout(() => p.stop(), afterMs);
  };
  /** Start a bed. A loop plays on and on, each pass fading into the next over a few seconds so the seam cannot be heard. */
  const startBed = (bed: MusicBed, buf: AudioBuffer, sceneT0: number): Playing => {
    const ctx = actx!, out = ctx.createGain();
    out.gain.value = 0; out.connect(musicBus!);
    const scored = !bed.loop;
    const offset0 = scored ? clamp(t - sceneT0, 0, Math.max(0, buf.duration - 0.5)) : 0;
    const X = Math.min(4, buf.duration * 0.08);
    const nodes: AudioBufferSourceNode[] = [];
    let nextAt = ctx.currentTime + 0.03, first = true, offsetNext = offset0, timer = 0;
    const schedule = () => {
      while (nextAt < ctx.currentTime + 10 && (bed.loop || first)) {
        const node = ctx.createBufferSource(), g = ctx.createGain();
        node.buffer = buf; node.connect(g); g.connect(out);
        const at0 = nextAt, off = offsetNext, len = buf.duration - off;
        g.gain.setValueAtTime(first ? 1 : 0, at0);
        if (!first) g.gain.linearRampToValueAtTime(1, at0 + X);
        if (bed.loop) { g.gain.setValueAtTime(1, at0 + len - X); g.gain.linearRampToValueAtTime(0, at0 + len); }
        node.start(at0, off); node.stop(at0 + len + 0.05);
        nodes.push(node);
        nextAt = at0 + len - X; offsetNext = 0; first = false;
        if (!bed.loop) break;
      }
    };
    schedule();
    if (bed.loop) timer = window.setInterval(schedule, 700);
    out.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
    return { id: bed.id, src: bed.src, out, startCtx: ctx.currentTime, offset0, scored, sceneT0, stop: () => { clearInterval(timer); for (const n of nodes) { try { n.stop(); } catch { /* ended */ } n.disconnect(); } out.disconnect(); } };
  };
  const unlockAudio = () => {
    if (!hasVoice && !hasMusic) return;
    try {
      if (!actx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        actx = new AC();
        master = actx.createGain(); master.gain.value = 1; meter = actx.createAnalyser(); meter.fftSize = 512; master.connect(meter); meter.connect(actx.destination);
        musicBus = actx.createGain(); musicBus.gain.value = 0; musicMeter = actx.createAnalyser(); musicMeter.fftSize = 512; musicBus.connect(musicMeter); musicMeter.connect(actx.destination);
        for (const src of new Set([...clips, ...film.decisions.flatMap(d => (d.clip ? [d.clip] : []))].map(c => c.src))) void load(src);
        const first = film.scenes.find(s => s.mood && beds.some(b => b.id === s.mood)); // the first bed is wanted at once
        if (first) void decodeBed(beds.find(b => b.id === first.mood)!.src);
      }
      if (actx.state === 'suspended') void actx.resume().catch(() => {});
    } catch { /* no sound here; the captions carry the film */ }
  };
  const stopVoice = () => { if (voice) { try { voice.node.stop(); } catch { /* already ended */ } voice = null; } };
  const syncAudio = () => {
    if (!actx || !master || !clips.length) return;
    const want = playing && !voiceOff && !pausedAt ? clips.find(c => t >= c.at - 0.01 && t < c.at + c.dur - 0.05) : undefined;
    if (!want) { stopVoice(); return; }
    const buf = decoded.get(want.src);
    if (!buf) return; // not decoded yet: try again on the next frame
    const offset = clamp(t - want.at, 0, buf.duration);
    if (voice && voice.id === want.id && voice.at === want.at) {
      const heard = voice.offset + (actx.currentTime - voice.ctxStart);
      if (Math.abs(heard - offset) <= 0.4) return;
    }
    stopVoice();
    if (actx.state === 'suspended') void actx.resume().catch(() => {});
    const node = actx.createBufferSource(); node.buffer = buf; node.connect(master);
    node.start(0, offset);
    voice = { id: want.id, at: want.at, node, ctxStart: actx.currentTime, offset };
  };
  // The narrator reads a question while the film waits for the choice. The film's clock is stopped then, so this voice runs on real time.
  let question: AudioBufferSourceNode | null = null;
  const stopQuestion = () => { if (question) { try { question.stop(); } catch { /* already ended */ } question = null; } };
  const startQuestion = (d: Decision) => {
    stopQuestion();
    if (!actx || !master || voiceOff || !d.clip) return;
    const buf = decoded.get(d.clip.src);
    if (!buf) return;
    if (actx.state === 'suspended') void actx.resume().catch(() => {});
    const node = actx.createBufferSource(); node.buffer = buf; node.connect(master); node.start(0);
    node.onended = () => { if (question === node) question = null; };
    question = node;
  };
  const sceneAt = (tt: number) => film.scenes.find(s => tt >= s.t0 && tt < s.t1) ?? film.scenes[film.scenes.length - 1];
  let idleSince = 0, slept = false;
  const syncMusic = () => {
    if (!actx || !musicBus || !beds.length) return;
    const now = actx.currentTime, wall = performance.now();
    const ended = t >= film.duration - 0.05;
    const live = started && !posterMode;
    const userPaused = live && !playing && !pausedAt && !ended;
    const scene = sceneAt(t), mood = live ? scene.mood : undefined;
    const bed = mood ? beds.find(x => x.id === mood) : undefined;
    // The bed under this part of the film: the one that is playing, or the one that is about to start when it has been decoded.
    if (bed && !ended) {
      const buf = bedBuf.get(bed.src);
      if (!bedNow || bedNow.id !== bed.id) {
        if (buf) {
          if (bedNow) fadeAndStop(bedNow);
          bedNow = startBed(bed, buf, scene.t0);
          for (const src of [...bedBuf.keys()]) if (src !== bed.src) bedBuf.delete(src); // the ones that were fading out are let go of
        } else void decodeBed(bed.src);
      } else if (bedNow.scored && buf && !userPaused) {
        // A bed scored to its scene follows the film: if the viewer has jumped within the scene, it is put back in step.
        const heard = bedNow.offset0 + (now - bedNow.startCtx), asked = t - bedNow.sceneT0;
        if (Math.abs(heard - asked) > 1.5 && now - bedNow.startCtx > 0.6) { fadeAndStop(bedNow, 0.12, 700); bedNow = startBed(bed, buf, scene.t0); }
      }
      // The next scene's bed is decoded a little before it is wanted, so that the change is not late.
      const nextScene = film.scenes[film.scenes.indexOf(scene) + 1];
      const nextBed = nextScene?.mood && nextScene.mood !== scene.mood ? beds.find(x => x.id === nextScene.mood) : undefined;
      if (nextBed && scene.t1 - t < 40) void decodeBed(nextBed.src);
    }
    // How loud: ducked under the narrator (a little before, and a second and a half after), kept going while the film waits for a choice,
    // gone while the viewer has paused, faded slowly when the film ends.
    const duck = !voiceOff && (question || clips.some(c => t >= c.at - 0.3 && t < c.at + c.dur + 1.5)) ? 0.4 : 1;
    const level = musicOff || userPaused || ended || !live ? 0 : MUSIC_LEVEL * duck * (pausedAt ? 0.9 : 1);
    musicBus.gain.setTargetAtTime(level, now, ended ? 1.8 : musicOff || userPaused ? 0.12 : duck < 1 ? 0.25 : 0.7);
    // While the viewer has paused every sound is frozen together (and the loops do not drift); when the film moves again they go on.
    if (userPaused || ended) { if (!idleSince) idleSince = wall; if (!slept && wall - idleSince > (ended ? 4500 : 500)) { slept = true; void actx.suspend().catch(() => {}); } }
    else { idleSince = 0; if (slept || actx.state === 'suspended') { slept = false; void actx.resume().catch(() => {}); } }
  };
  const syncSound = () => { syncAudio(); syncMusic(); };
  const applyFlags = () => {
    if (voiceBtn) { voiceBtn.textContent = voiceOff ? 'Voice off' : 'Voice on'; voiceBtn.setAttribute('aria-pressed', String(voiceOff)); }
    if (musicBtn) { musicBtn.textContent = musicOff ? 'Music off' : 'Music on'; musicBtn.setAttribute('aria-pressed', String(musicOff)); }
    syncSound();
  };
  const setVoiceOff = (off: boolean) => { voiceOff = off; writeFlag('voice-off', off); if (off) stopQuestion(); applyFlags(); };
  const setMusicOff = (off: boolean) => { musicOff = off; writeFlag('music-off', off); applyFlags(); };
  /** M: everything off, or, when everything is already off, everything on. */
  const toggleAll = () => { const off = !(voiceOff && musicOff) ; voiceOff = off; musicOff = off; if (off) stopQuestion(); writeFlag('voice-off', off); writeFlag('music-off', off); applyFlags(); };

  // ---- the picture ----
  let W = 0, H = 0, scale = 1, t = Math.max(0, Math.min(film.duration, opts.startAt ?? 0)), blackExtra = 0;
  const startAt = t;
  let posterMode = opts.poster != null && !capture && !bare;
  if (posterMode) { t = clamp(opts.poster!, 0, film.duration); root.classList.add('dbf-poster'); }
  const leavePoster = () => { if (!posterMode) return; posterMode = false; root.classList.remove('dbf-poster'); t = startAt; dirty = true; };
  const maxDpr = opts.maxDpr ?? 1.5, maxWidth = opts.maxWidth ?? 1920;
  let sizeOverride: [number, number] | null = null;
  const resize = () => {
    const cssW = stage.clientWidth || 960;
    const w = sizeOverride ? sizeOverride[0] : Math.min(maxWidth, Math.round(cssW * Math.min(window.devicePixelRatio || 1, maxDpr) * scale));
    const h = sizeOverride ? sizeOverride[1] : Math.round((w * 9) / 16);
    if (w !== W || h !== H) { W = w; H = h; canvas.width = W; canvas.height = H; return true; }
    return false;
  };
  const activeLabel = () => film.cues.find(c => c.k === 'label' && t >= c.a && t < c.b) as Extract<Cue, { k: 'label' }> | undefined;
  const activeTl = () => film.cues.find(c => c.k === 'tl' && t >= c.a && t < c.b) as Extract<Cue, { k: 'tl' }> | undefined;
  let pausedAt: Decision | null = null;

  /** A decision is open for a choice from the moment its options are up (a third of a second into their fade) until they give way to the argument, if it has not been answered. */
  const openFor = (d: Decision) => !capture && t >= d.askAt + 0.3 && t < d.pauseAt + d.hold - 0.5 && answers[d.id] === undefined;
  const draw = (tt: number, black = 0) => {
    t = clamp(tt, 0, film.duration); blackExtra = black;
    resize();
    const f = film.frameAt(t);
    drawModel(ctx, W, H, film.city, f.state, t);
    drawAnnots(ctx, W, H, f.state);
    fade.style.opacity = String(Math.max(f.black, black));
    let titleOp = 0;
    for (const it of items) {
      let op = fadeWindow(t, it.cue.a, it.cue.b, it.edge);
      if (it.cue.k === 'title') titleOp = Math.max(titleOp, op);
      if (it.sub) it.sub.forEach(s => { s.el.style.opacity = String(ramp(t, s.at, s.at + 0.7)); });
      const show = op > 0.01;
      if (show !== it.shown) { it.el.hidden = !show; it.shown = show; }
      if (show && Math.abs(op - it.op) > 0.005) { it.el.style.opacity = String(op); it.op = op; }
      if (it.cue.k === 'ask') {
        const id = it.cue.id, d = film.decisions.find(x => x.id === id)!;
        const choose = it.el.querySelector<HTMLElement>('.dbf-choose'); if (choose) choose.hidden = !(pausedAt?.id === id || openFor(d));
        // once the options have been up for `hold` seconds they give way to the arguments, and the viewer's own pick is kept as one line
        const settled = t >= d.pauseAt + d.hold - 0.5, o = d.opts.find(x => x.k === answers[id]);
        it.el.classList.toggle('is-settled', settled);
        const yours = it.el.querySelector<HTMLElement>('.dbf-yours');
        if (yours) { yours.hidden = !(settled && o); if (settled && o) yours.textContent = `You chose ${o.k} · ${o.b}`; }
      }
    }
    shade.style.opacity = String(titleOp);
    root.classList.toggle('dbf-asking', !!pausedAt || film.decisions.some(openFor));
    const lab = activeLabel(), tl = activeTl();
    if (hudLabel) hudLabel.textContent = lab ? lab.text : '';
    if (tlEl && tlTrack && tlLabels) {
      tlEl.style.opacity = tl ? '1' : '0';
      if (tl) {
        const cur = tl.cur, a = Array.isArray(cur) ? cur[0] : cur, b = Array.isArray(cur) ? cur[1] : cur, n = STOPS.length - 1;
        const span = tlTrack.querySelector<HTMLElement>('.dbf-tl-span')!; span.style.left = `${(a / n) * 100}%`; span.style.width = `${Math.max(1.5, ((b - a) / n) * 100)}%`;
        tlLabels.innerHTML = STOPS.map((s, i) => (i >= a && i <= b ? `<b>${s}</b>` : `<span>${s}</span>`)).join('');
      }
    }
    const shown = posterMode ? startAt : t;
    if (range && document.activeElement !== range) range.value = String(Math.round(shown * 10));
    if (timeEl) timeEl.textContent = `${fmt(shown)} / ${fmt(film.duration)}`;
    if (playBtn) playBtn.textContent = playing ? 'Pause' : t >= film.duration - 0.05 ? 'Replay' : 'Play';
  };

  // ---- time ----
  let playing = false, started = false, raf = 0, last = 0, dirty = true;
  const intervals: number[] = []; let lastAdapt = 0;
  /** Only the decisions the playhead has passed stay answered: go back before one and it is asked again, start over and all of them are. */
  const forgetAhead = () => {
    let changed = false;
    for (const d of film.decisions) if (d.askAt > t + 0.01 && answers[d.id] !== undefined) { delete answers[d.id]; changed = true; }
    if (changed) { save(); syncPicks(); renderLedger(); }
  };
  const finishChoice = () => { pausedAt = null; syncPicks(); renderLedger(); dirty = true; };
  const choose = (k: string) => {
    const d = pausedAt ?? film.decisions.find(x => t >= x.askAt + 0.3 && t < x.pauseAt + x.hold - 0.5);
    if (!d || !d.opts.some(o => o.k === k)) return;
    answers[d.id] = k; save(); stopQuestion();
    if (pausedAt) { pausedAt = null; playing = true; }
    finishChoice();
  };
  const skip = () => { if (!pausedAt) return; stopQuestion(); answers[pausedAt.id] = answers[pausedAt.id] ?? ''; if (!answers[pausedAt.id]) delete answers[pausedAt.id]; pausedAt = null; playing = true; finishChoice(); };
  const advance = (dt: number) => {
    const next = t + dt;
    if (!capture) {
      const d = film.decisions.find(x => x.pauseAt > t && x.pauseAt <= next && answers[x.id] === undefined);
      if (d) { t = d.pauseAt; pausedAt = d; playing = false; dirty = true; startQuestion(d); return; }
    }
    t = next;
    if (t >= film.duration) { t = film.duration; playing = false; }
  };
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.25, (now - last) / 1000); last = now;
    if (playing) {
      advance(dt); dirty = true;
      intervals.push(dt); if (intervals.length > 40) intervals.shift();
      if (intervals.length >= 30 && now - lastAdapt > 2500) {
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        if (avg > 0.042 && scale > 0.5 && !sizeOverride) { scale = Math.max(0.5, scale * 0.85); lastAdapt = now; intervals.length = 0; }
      }
    }
    if (dirty) { dirty = false; draw(t, blackExtra); }
    syncSound();
    if (playBtn) playBtn.textContent = playing ? 'Pause' : t >= film.duration - 0.05 ? 'Replay' : 'Play';
  };
  const play = () => {
    if (pausedAt) return;
    leavePoster();
    unlockAudio();
    if (t >= film.duration - 0.05) { t = 0; forgetAhead(); }
    started = true; startBtn && (startBtn.hidden = true); playing = true; dirty = true;
  };
  const pause = () => { playing = false; dirty = true; stopQuestion(); syncSound(); };
  const seek = (s: number) => { if (posterMode) { posterMode = false; root.classList.remove('dbf-poster'); } stopQuestion(); pausedAt = null; t = clamp(s, 0, film.duration); forgetAhead(); dirty = true; if (!started) { started = true; startBtn && (startBtn.hidden = true); } draw(t, blackExtra); };
  const stepTo = (dir: 1 | -1) => {
    const cur = t, stops = film.stops;
    const target = dir > 0 ? stops.find(s => s > cur + 0.3) ?? film.duration : [...stops].reverse().find(s => s < cur - 1.2) ?? 0;
    seek(target);
  };

  // Full screen is a request the page may refuse (an embedded frame, a phone): the film plays on either way.
  const toggleFullscreen = () => { try { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); else void root.requestFullscreen?.()?.catch(() => {}); } catch { /* not allowed here */ } };
  startBtn?.addEventListener('click', () => { play(); });
  playBtn?.addEventListener('click', () => { if (pausedAt) skip(); else if (playing) pause(); else play(); });
  range?.addEventListener('input', () => seek(Number(range.value) / 10));
  fsBtn?.addEventListener('click', () => toggleFullscreen());
  voiceBtn?.addEventListener('click', () => setVoiceOff(!voiceOff));
  musicBtn?.addEventListener('click', () => setMusicOff(!musicOff));
  // A film that plays while nobody can see it would run on with its voice: it stops when the tab is hidden.
  const onHidden = () => { if (document.hidden) { stopQuestion(); if (playing) pause(); } };
  document.addEventListener('visibilitychange', onHidden);
  applyFlags();
  root.addEventListener('click', e => { const b = (e.target as HTMLElement).closest<HTMLElement>('.dbf-pill[data-k]'); if (b) choose(b.dataset.k ?? ''); });
  // The film answers the keyboard only while it is the thing being looked at: on a page with other words around it, Space and the
  // arrows must still scroll the page when the film is off screen.
  let inView = true;
  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(es => { inView = es.some(x => x.isIntersecting); }, { threshold: 0.5 }) : null;
  io?.observe(stage);
  const onKey = (e: KeyboardEvent) => {
    if (!inView && !root.contains(document.activeElement) && !document.fullscreenElement) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (e.metaKey || e.ctrlKey || e.altKey || tag === 'INPUT' && (e.target as HTMLInputElement).type !== 'range' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (k === 'a' || k === 'b' || k === 'c') { choose(k.toUpperCase()); return; }
    if (k === 'enter' && pausedAt) { e.preventDefault(); skip(); return; }
    if (k === ' ' || k === 'k') { if (tag === 'BUTTON') return; e.preventDefault(); if (pausedAt) skip(); else if (playing) pause(); else play(); return; }
    if (k === 'arrowright') { e.preventDefault(); stepTo(1); } else if (k === 'arrowleft') { e.preventDefault(); stepTo(-1); }
    else if (k === 'f') toggleFullscreen();
    else if (k === 'm' && (hasVoice || hasMusic)) toggleAll();
  };
  window.addEventListener('keydown', onKey);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { dirty = true; }) : null;
  ro?.observe(stage);

  // ---- for tools: stills, contact sheets, video frames ----
  const hooks = {
    seek: (s: number) => draw(s, 0),
    seekFilm: (T: number, black = 0) => draw(T, black),
    setSize: (w: number, h: number) => { sizeOverride = [w, h]; draw(t, blackExtra); },
    card: (kind: 'title' | 'end', visible = 1, black = 0) => { draw(kind === 'end' ? film.duration : (film.scenes[0]?.t0 ?? 0) + 44, black); void visible; },
    get t() { return t; }, get T() { return t; }, get duration() { return film.duration; }, get answers() { return answers; }, get paused() { return pausedAt?.id ?? null; },
    get scale() { return scale; }, get decisions() { return film.decisions; }, get voice() { return voice?.id ?? null; }, get questionVoice() { return question !== null; }, get asking() { return !!pausedAt || film.decisions.some(openFor); }, get voiceOff() { return voiceOff; }, get musicOff() { return musicOff; }, get mood() { return bedNow?.id ?? null; }, get decoded() { return decoded.size; }, get bedsDecoded() { return bedBuf.size; }, get audioRunning() { return actx?.state === 'running'; }, get audioState() { return actx?.state ?? 'none'; }, get musicGain() { return musicBus?.gain.value ?? 0; },
    /** How loud the music is right now (0 to 1): for tools that cannot listen. */
    musicLevel: () => { if (!musicMeter) return 0; const d = new Float32Array(musicMeter.fftSize); musicMeter.getFloatTimeDomainData(d); let sum = 0; for (const x of d) sum += x * x; return Math.sqrt(sum / d.length); }, get audioTime() { return actx?.currentTime ?? 0; },
    /** How loud the narrator is right now (0 to 1, root mean square of the output): for tools that cannot listen. */
    level: () => { if (!meter) return 0; const d = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(d); let sum = 0; for (const x of d) sum += x * x; return Math.sqrt(sum / d.length); },
    choose,
    play: () => play(), pause: () => pause(),
    /** The viewer's own seek: moves the playhead (unlike `seek`, which only draws a frame for tools). */
    goTo: (s: number) => seek(s),
    /** Time `n` finished frames from film time `from` (a drawn frame is only done when its pixels are read back). */
    bench: (n: number, from = 0) => { const times: number[] = []; for (let i = 0; i < n; i++) { const a = performance.now(); draw(from + i * 0.04, 0); ctx.getImageData(0, 0, 1, 1); times.push(performance.now() - a); } const rest = times.slice(2); return { first: times[0], avg: rest.reduce((x, y) => x + y, 0) / rest.length, max: Math.max(...rest) }; },
  };
  (window as unknown as { __film?: unknown }).__film = hooks;

  draw(t, 0);
  raf = requestAnimationFrame(loop);
  return {
    play, pause, seek, draw, choose, hooks,
    get t() { return t; }, get playing() { return playing; }, get started() { return started; },
    destroy() { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onHidden); ro?.disconnect(); io?.disconnect(); stopVoice(); bedNow?.stop(); void actx?.close().catch(() => {}); },
  };
}
export type Player = ReturnType<typeof createPlayer>;
