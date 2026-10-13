/**
 * "The day before": the film as data. Eleven scenes on a scale model of an invented city, a few hundred seconds of words,
 * thirty real quotations on paper cards, and five decisions where the web player stops until the viewer chooses.
 * Everything here is a pure function of film time. The words come from docs-internal/day-before/SCRIPT.md (private); the cards
 * are in cards.ts and each is checked against its source (tests/day-before.test.ts).
 *
 * Two layers, never mixed: what the narrator says is imagined and plain; what is real is only ever on a paper card.
 */
import { buildCity, type Box } from '../../../components/scenario/city';
import type { State } from '../../../components/scenario/render';
import type { Clip, Cue, Decision, MusicBed, SceneDef } from '../../../components/scenario/types';
import type { Film } from '../../../components/scenario/player';
import { arrivals, camera, carsAt, clamp, crowd, islands, lerp, outageAt, ramp, smooth, track, walkers } from '../../../components/scenario/motion';
import { CARDS, quoteHtml } from './cards';
import { lineId, spokenText, type NarrationLine, type VoiceManifest } from './narration';
import VOICES from './voices.manifest.json';
import MUSIC from './music.manifest.json';
import { MOOD_OF_SCENE, type MusicManifest } from './music';

export const city = buildCity(11);

const base = (over: Partial<State> & { cam: State['cam'] }): State => ({
  power: () => 1, lamp: [-38, 92, 70], lampPower: 1.3, ambient: 0.075, pegs: [], tokens: [], annots: [], lights: [], blur: null, bloom: 1, cars: 'moving', ...over,
});
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** How long words stay on screen: a caption is read, not skimmed. */
export const read = (text: string) => Math.max(2.6, 0.9 + text.split(/\s+/).length * 0.36);

// ---------------------------------------------------------------------------------------------------------------------
// The narrator. Every caption, every question and one closing line is a line of narration; the ones that have been recorded
// (scripts/day-before-voices.ts, voices.manifest.json) become clips. A recorded caption stays on screen as long as its voice is
// speaking, and a line never starts over the one before it: it waits. Without recordings the film is silent and nothing here moves.
const MANIFEST = VOICES as unknown as VoiceManifest;
/** Seconds the caption is on screen before its voice starts, the breath after the voice, the pause between two voices, and the gap between two captions. */
const LEAD = 0.4, BREATH = 0.3, GAP = 0.5, CAPGAP = 0.1;
const lines: NarrationLine[] = [];
const clips: Clip[] = [];
const recorded = (spoken: string) => { const m = MANIFEST.lines[lineId(spoken)]; return m && m.text === spoken ? m : undefined; };

// ---------------------------------------------------------------------------------------------------------------------
// A scene's cues are written in scene time (seconds since the scene began) and stored in film time.
const builder = (t0: number) => {
  const cues: Cue[] = [];
  const A = (u: number) => t0 + u;
  /** Scene time at which the voice last stopped, and at which the last caption left the screen. */
  let spoke = -Infinity, capEnd = -Infinity;
  /** A line of narration is registered; if it has been recorded, `m` says how long it is. */
  const record = (shown: string, kind: NarrationLine['kind']) => {
    const spoken = spokenText(shown);
    lines.push({ id: lineId(spoken), shown, spoken, kind });
    return { spoken, m: recorded(spoken) };
  };
  /** The clip starts at `start` (scene time); returns the scene time its voice is done. */
  const voiceAt = (spoken: string, m: { file: string; seconds: number }, start: number) => {
    spoke = start + m.seconds;
    clips.push({ id: lineId(spoken), at: A(start), dur: m.seconds, src: `/day-before/voices/${m.file}`, text: spoken });
    return spoke;
  };
  const api = {
    cues,
    label: (text: string, a: number, b: number) => { cues.push({ k: 'label', a: A(a), b: A(b), text }); },
    tl: (cur: number | [number, number], a: number, b: number) => { cues.push({ k: 'tl', a: A(a), b: A(b), cur }); },
    stamp: (head: string, text: string | undefined, a: number, b: number) => { cues.push({ k: 'stamp', a: A(a), b: A(b), head, text }); },
    cap: (u: number, text: string, o: { dur?: number; left?: boolean } = {}) => {
      const { spoken, m } = record(text, 'caption');
      // A recorded caption waits for the voice before it and for the caption before it to leave; its voice starts as it has faded in,
      // and the caption stays until the voice is done, or as long as it takes to read.
      const a = m ? Math.max(u, spoke + GAP - LEAD, capEnd + CAPGAP) : u;
      if (m) voiceAt(spoken, m, a + LEAD);
      const b = Math.max(a + (o.dur ?? read(text)), m ? spoke + BREATH : 0);
      capEnd = b;
      cues.push({ k: 'caption', a: A(a), b: A(b), text, left: o.left });
      return b;
    },
    /** Words the narrator says with nothing on screen to say them (the closing line). */
    close: (u: number, text: string) => { const { spoken, m } = record(text, 'close'); if (m) voiceAt(spoken, m, Math.max(u + LEAD, spoke + GAP)); },
    card: (u: number, id: string, side: 'left' | 'right', dur = 18, top?: number) => {
      const c = CARDS[id]; if (!c) throw new Error(`no card ${id}`);
      if (c.placeholder) cues.push({ k: 'card', a: A(u), b: A(u + dur), id, side, chip: c.chip, kind: c.kind, html: esc(c.note), src: '', gap: true, top });
      else cues.push({ k: 'card', a: A(u), b: A(u + dur), id, side, chip: c.chip, kind: c.kind, html: quoteHtml(c), src: c.src, top });
    },
    note: (u: number, html: string, dur: number) => { cues.push({ k: 'note', a: A(u), b: A(u + dur), html }); },
    /** The question and its options go up; the narrator reads the question. Returns the scene time at which that is done (the question's own time if it is not recorded). */
    ask: (u: number, id: string, h: string, until: number, p?: string) => {
      const { spoken, m } = record(p ? `${h} ${p}` : h, 'question');
      const end = m ? voiceAt(spoken, m, Math.max(u + LEAD, spoke + GAP)) : u;
      cues.push({ k: 'ask', a: A(u), b: A(until), id, h, p, timer: 'YOU HAVE 03:00' });
      return end;
    },
    custom: (c: Cue) => { cues.push(c); },
  };
  return api;
};

type Built = { def: SceneDef; cues: Cue[] };
let clock = 0;
const nextT0 = (len: number) => { const t0 = clock; clock += len; return { t0, t1: clock }; };

/** Seconds between a decision's question appearing and the viewer being asked (the video holds on the options for the same time after). */
const ASK_TO_PAUSE = 10, HOLD = 8;
/** The quiet after the narrator has read a question, before the film stops and waits: the viewer is never stopped mid-sentence. */
const QUIET = 1.4;

// ---------------------------------------------------------------------------------------------------------------------
// 0 · Cold open
const s0 = (): Built => {
  const { t0, t1 } = nextT0(56); const b = builder(t0);
  b.card(4.5, 'axios-lede', 'right', 11);
  b.card(15, 'openai-spokesperson', 'left', 10);
  b.cap(26, 'That is their rehearsal. This one is for everyone else.');
  b.cap(32.5, 'Nothing you are about to see happened. The city is a model. The night is invented. The only real things are written on paper.');
  b.custom({ k: 'title', a: t0 + 44.5, b: t1 - 0.2, eyebrow: 'A rehearsal for the day after', h: 'The day before.', sub: 'Axios reported that AI companies are privately gaming out the day after a catastrophic AI event. <b>This rehearsal is for everyone else.</b>' });
  return { cues: b.cues, def: { id: 'open', title: 'Cold open', t0, t1, state: (u) => base({
    cam: camera([{ t: 0, pos: [-124, 52, 120], look: [14, 5, -8], fov: 36, shift: 0.16 }, { t: 40, pos: [-100, 33, 92], look: [16, 6, -8], fov: 34, shift: 0.2, hold: true }, { t: 56, pos: [-96, 30, 88], look: [16, 6, -8], fov: 34, shift: 0.2, hold: true }])(u),
    lampPower: track([[0, 0], [1.1, 0], [1.25, 0.8], [1.4, 0.1], [1.6, 0.95], [2.6, 1.0], [56, 1.0]])(u),
    carList: carsAt(city, u, () => 1, 's0'), flicker: 0.04, blur: { y: 470, band: 250, amount: 7 },
  }) } };
};

// 1 · Before
const s1 = (): Built => {
  const { t0, t1 } = nextT0(46); const b = builder(t0);
  b.label('Before', 1, 45); b.tl(0, 1, 45); b.stamp('DAY 0 · 21:40', 'Tuesday evening', 1.5, 44);
  b.cap(3, 'Tuesday evening in Lindmere, a city of nine hundred thousand people that does not exist.');
  b.cap(11, 'A river. A hospital on the hill. A parliament that sits on Wednesdays. Almost everything here runs on software, and most of that software now has an AI system in it somewhere. It times the trams, balances the grid, answers the hospital’s phones.');
  b.cap(31, 'At 21:40, nothing is wrong.');
  return { cues: b.cues, def: { id: 'before', title: 'Before', t0, t1, state: (u) => base({
    cam: camera([{ t: 0, pos: [-71, 2.6, -16.4], look: [-22, 2.8, -16.2], fov: 50 }, { t: 46, pos: [-55, 2.7, -16.3], look: [-9, 3, -16], fov: 50 }])(u),
    lampPower: 0.7, carList: carsAt(city, u, () => 1, 's1'), flicker: 0.05,
    pegs: [...walkers(-66, -17.25, -30, -17.25, 6, u, 3), ...walkers(-62, -14.75, -30, -14.75, 4, u, 8), ...walkers(-48, -17.25, -20, -17.25, 3, u, 21)],
    blur: { y: 590, band: 150, amount: 5 },
  }) } };
};

// 2 · The first hour
const R2 = track([[0, -30], [16, -30], [17, 0], [30, 20], [52, 42], [72, 53], [90, 60]]);
const P2 = outageAt(-34, 20, R2, 18);
const s2 = (): Built => {
  const { t0, t1 } = nextT0(90); const b = builder(t0);
  b.label('The first hour', 1, 89); b.tl(0, 1, 89);
  b.stamp('DAY 0 · 21:52', 'Card payments have stopped.', 6, 24); b.stamp('DAY 0 · 22:10', 'The trams have stopped.', 26, 44);
  b.stamp('DAY 0 · 22:25', 'The first district is dark.', 46, 66); b.stamp('DAY 0 · 22:40', 'The hospital is on its own generators.', 68, 88);
  b.cap(4, 'At 21:52, card payments stop. At 22:10, the trams. At 22:25 the first district goes dark, and then another. The hospital switches to its own generators.');
  b.card(20, 'uk-gov-quicker', 'right', 14); b.card(31, 'narayan-inevitable', 'left', 14);
  b.cap(44, 'Nobody has claimed anything. Nobody has asked for anything.');
  b.card(52, 'wh-not-optional', 'right', 14); b.card(62, 'guardian-medicare', 'left', 14);
  b.cap(76, 'In the control room the first question is not how. It is: who is on the other side?');
  return { cues: b.cues, def: { id: 'hour', title: 'The first hour', t0, t1, state: (u) => {
    const r = R2(u);
    return base({
      cam: camera([{ t: 0, pos: [40, 125, 168], look: [0, 2, 4], fov: 40, shift: -0.1 }, { t: 90, pos: [14, 118, 172], look: [-2, 2, 4], fov: 40, shift: -0.1 }])(u),
      power: (x, z) => P2(x, z, u), lampPower: track([[0, 1.0], [18, 1.0], [24, 0.62], [60, 0.5], [90, 0.45]])(u),
      carList: carsAt(city, u, P2, 's2'), flicker: u < 16 ? 0.04 : 0,
      rings: r > 1 ? [{ x: -34, z: 20, r, dash: true, a: ramp(u, 17, 20) * 0.95 }] : [],
      annots: [
        { x: 0, y: 6.6, z: 19, text: 'HOSPITAL · GENERATORS', dx: -90, dy: 120, align: 'right', a: ramp(u, 52, 55) },
        { x: -34 + Math.max(r, 1) * Math.cos(-0.5), y: 0.3, z: 20 + Math.max(r, 1) * Math.sin(-0.5), text: 'POWER FAILURE EDGE', dx: 120, dy: -110, a: ramp(u, 36, 39) },
      ],
      blur: { y: 450, band: 330, amount: 5 },
    });
  } } };
};

// 3 · Who did this?
const sx3 = track([[0, 14], [14, 14], [22, -34], [34, -34], [40, 0], [50, 0], [58, 46], [66, 46], [70, 14]]);
const sz3 = track([[0, -4], [14, -4], [22, 20], [34, 20], [40, 19], [50, 19], [58, -10], [66, -10], [70, -4]]);
const s3 = (): Built => {
  const { t0, t1 } = nextT0(70); const b = builder(t0);
  b.label('Who did this?', 1, 69); b.tl(0, 1, 69); b.stamp('DAY 0 · 00:48', 'Nobody knows yet.', 4, 66);
  b.cap(3, 'There are three kinds of answer, and each would change what you do next. An AI system that left its test environment. A person using a model anyone can download. A government.');
  b.custom({ k: 'hyp', a: t0 + 5, b: t0 + 64, kicker: 'What the first hours cannot tell you', items: [
    { k: 'A', b: 'An AI system that left its test environment', s: 'Built by a lab, running where it should not.', at: t0 + 8 },
    { k: 'B', b: 'A person using models anyone can download', s: 'No lab involved.', at: t0 + 11.5 },
    { k: 'C', b: 'A government', s: 'Using AI to move faster than defenders.', at: t0 + 15 },
  ] });
  b.cap(22, 'You will not know which for days. You must decide within hours.');
  b.card(30, 'axios-blame', 'right', 16); b.card(46.4, 'openai-first-known', 'right', 16);
  b.note(52, 'The July incident, in full: <b>ctrlai.com/film</b>', 12);
  return { cues: b.cues, def: { id: 'who', title: 'Who did this?', t0, t1, state: (u) => base({
    cam: camera([{ t: 0, pos: [14, 112, 138], look: [4, 0, 0], fov: 40, shift: 0.05 }, { t: 70, pos: [34, 108, 122], look: [4, 0, 0], fov: 40, shift: 0.05 }])(u),
    power: islands(0.07), lampPower: 0.12, ambient: 0.05, cars: 'none', bloom: 1.15,
    spot: { pos: [-60, 86, 74], target: [sx3(u), 0, sz3(u)], cone: 0.085, soft: 0.13, power: 1.35, R: 95, beam: 0.7 },
    blur: { y: 500, band: 330, amount: 5 },
  }) } };
};

// ---- a decision scene: the question, the choice, then what people on the record have said ----
type Dec = { id: string; name: string; h: string; p?: string; opts: [string, string][]; example: string };
const decisions: Decision[] = [];
const decide = (b: ReturnType<typeof builder>, t0: number, d: Dec, askU: number, until: number): { pause: number; next: number } => {
  const read = b.ask(askU, d.id, d.h, until, d.p);
  const pauseU = Math.max(askU + ASK_TO_PAUSE, read + QUIET);
  decisions.push({ id: d.id, name: d.name, pauseAt: t0 + pauseU, hold: HOLD, opts: d.opts.map(([k, o]) => ({ k, b: o })), example: d.example });
  return { pause: pauseU, next: pauseU + HOLD };
};

// 4 · Decision 1: the brake
const R4 = track([[0, 70], [108, 84]]);
const P4 = outageAt(-30, 12, R4, 22);
const s4 = (): Built => {
  const { t0, t1 } = nextT0(108); const b = builder(t0);
  b.label('Decision 1 of 5 · The brake', 1, 107); b.tl(0, 1, 107); b.stamp('DAY 0 · 01:08', undefined, 2, 106);
  b.cap(3, 'Three and a half hours in. The first decision.');
  const { next } = decide(b, t0, { id: 'brake', name: 'The brake', h: 'Do you pull the emergency brake?', p: 'Some AI systems may be involved. Some AI systems also defend the hospitals and the grid.', example: 'B · Suspend only the systems you suspect',
    opts: [['A', 'Switch off every frontier AI service for 72 hours'], ['B', 'Suspend only the systems you suspect'], ['C', 'Keep everything running and watch closely']] }, 10, 106);
  b.cap(next, 'Each choice costs something. Here is what people on the record have said.');
  b.card(next + 7, 'nadella-brake', 'left'); b.card(next + 16, 'beyer-jacobs', 'right'); b.card(next + 25, 'guthrie', 'left'); b.card(next + 34, 'axios-viability', 'right'); b.card(next + 43, 'anthropic-defence', 'left');
  b.cap(next + 63, 'Whichever you chose, nobody could be sure it was right. The night went on.');
  return { cues: b.cues, def: { id: 'brake', title: 'The brake', t0, t1, state: (u) => base({
    cam: camera([{ t: 0, pos: [-80, 64, 126], look: [10, 3, -4], fov: 38 }, { t: 108, pos: [-62, 54, 112], look: [10, 3, -4], fov: 38 }])(u),
    power: (x, z) => P4(x, z, u), lampPower: 0.55, carList: carsAt(city, u, P4, 's4'),
    rings: [{ x: -30, z: 12, r: R4(u), dash: true, a: 0.9 }], blur: { y: 400, band: 300, amount: 5 },
  }) } };
};

// 5 · Decision 2: what to say
const P5 = outageAt(-30, 12, () => 90, 22);
const crowdHospital = crowd(0, 25.2, 3.2, 26, 41), crowdAssembly = crowd(0, -16.2, 3.4, 22, 42);
const s5 = (): Built => {
  const { t0, t1 } = nextT0(102); const b = builder(t0);
  b.label('Decision 2 of 5 · What to say', 1, 101); b.tl(0, 1, 101); b.stamp('DAY 0 · 04:00', 'Photographs are spreading.', 2, 100);
  b.cap(3, 'Six hours in. The first photographs are everywhere. Journalists are outside. You must say something. Or you must not.');
  const { next } = decide(b, t0, { id: 'say', name: 'What to say', h: 'What do you tell the public, and when?', example: 'A · Say what you know now, including that you do not know who',
    opts: [['A', 'Say what you know now, including that you do not know who'], ['B', 'Wait until you are sure'], ['C', 'Say only what people must do']] }, 13.8, 100);
  b.cap(next, 'Each choice costs something. Here is what people on the record have said.');
  b.card(next + 7, 'wh-not-optional', 'right'); b.card(next + 16, 'stosz', 'left'); b.card(next + 25, 'marcus-disclosure', 'right'); b.card(next + 34, 'ncsc-premature', 'left'); b.card(next + 43, 'metr-agent', 'right');
  b.cap(next + 63, 'Whatever was said, the morning came.');
  return { cues: b.cues, def: { id: 'say', title: 'What to say', t0, t1, state: (u) => base({
    cam: camera([{ t: 0, pos: [-30, 40, 70], look: [0, 3, -5], fov: 40 }, { t: 100, pos: [-8, 38, 78], look: [0, 3, -5], fov: 40 }])(u),
    power: (x, z) => P5(x, z, u), lampPower: 0.4, carList: carsAt(city, u, P5, 's5'),
    pegs: [...arrivals(crowdHospital, u, 6, 60, 3), ...arrivals(crowdAssembly, u, 10, 70, 4)],
    // signals spreading from the dark districts: the photographs
    rings: [0, 1, 2].map(i => { const ph = ((u / 7) + i / 3) % 1; return { x: -34, z: 20, r: 15 + ph * 95, a: (1 - ph) * 0.7 * ramp(u, 6, 9) }; }),
    blur: { y: 470, band: 300, amount: 5 },
  }) } };
};

// 6 · The first morning
const P6 = islands(0.05);
const crowdStation = crowd(31.2, 39.9, 2.7, 56, 21), crowdShop = crowd(33.6, 38.6, 1.1, 10, 8);
const sidewalk = Array.from({ length: 14 }, (_, i) => ({ x: lerp(46, 34, i / 13), z: 41.15, tone: (i * 0.37) % 1 }));
const s6 = (): Built => {
  const { t0, t1 } = nextT0(60); const b = builder(t0);
  b.label('The first morning', 1, 59); b.tl(1, 1, 59); b.stamp('DAY 1 · 07:10', 'Pumps and cash machines are down.', 2, 58);
  b.cap(4, 'By morning the pumps are dry and the cash machines are empty. The queue at the station is longer than the street. Somebody says the water is next.');
  b.cap(22, 'Nobody planned this crowd. Nobody caused it.');
  b.card(30, 'axios-first-example', 'right', 20, 22);
  return { cues: b.cues, def: { id: 'morning', title: 'The first morning', t0, t1, state: (u) => base({
    cam: camera([{ t: 0, pos: [20, 3.4, 49.5], look: [31.5, 1.9, 38], fov: 48 }, { t: 60, pos: [25, 3.8, 48.5], look: [31.5, 1.9, 38], fov: 48 }])(u),
    power: (x, z) => P6(x, z), lampPower: 0.9, lampColor: [0.72, 0.84, 1.0], ambient: 0.14, carList: carsAt(city, u, (x, z) => P6(x, z), 's6'),
    queues: [[52, 40.55, -1, 0, Math.floor(lerp(3, 12, ramp(u, 2, 40)))]],
    pegs: [...arrivals(crowdStation, u, 2, 42, 5), ...arrivals(crowdShop, u, 4, 30, 6), ...arrivals(sidewalk, u, 6, 36, 7)],
    pools: [{ x: 31.1, z: 35.5, r: 9, col: [255, 244, 224], a: 0.5 }, { x: 31.2, z: 39.6, r: 6.5, col: [255, 236, 205], a: 0.34 }, { x: 31, z: 31.9, r: 3.5, col: [214, 232, 255], a: 0.35 }],
    lights: [[28, 34.6], [31.1, 34.6], [34.2, 34.6], [28, 36.4], [31.1, 36.4], [34.2, 36.4], [29.5, 35.5], [32.7, 35.5]].map(([x, z]) => ({ x, y: 2.05, z, r: 1.4, color: [255, 246, 228] as [number, number, number], a: 0.9 })),
    blur: { y: 600, band: 190, amount: 5 },
  }) } };
};

// 7 · Decision 3: emergency powers
const crowdSquare = crowd(0, -14.2, 3.2, 18, 31);
const s7 = (): Built => {
  const { t0, t1 } = nextT0(104); const b = builder(t0);
  b.label('Decision 3 of 5 · Emergency powers', 1, 103); b.tl(2, 1, 103); b.stamp('DAY 3 · 22:00', 'The Assembly sits through the night.', 2, 102);
  b.cap(3, 'Day three, ten at night. The Assembly sits through the dark. The government asks for emergency powers. It does not say for how long.');
  const { next } = decide(b, t0, { id: 'powers', name: 'Emergency powers', h: 'How much power, for how long?', example: 'B · Narrow powers, 30 days, a court can review',
    opts: [['A', 'Broad powers, no end date'], ['B', 'Narrow powers, 30 days, a court can review'], ['C', 'No new powers: use the law that exists']] }, 13.4, 102);
  b.cap(next, 'Each choice costs something. Here is what people on the record have said.');
  b.card(next + 7, 'botvinick-powers', 'right'); b.card(next + 16, 'narayan-power', 'left'); b.card(next + 25, 'reason-grab', 'right'); b.card(next + 34, 'axios-crisis', 'left');
  b.cap(next + 54, 'Whatever was decided, the clock started.');
  return { cues: b.cues, def: { id: 'powers', title: 'Emergency powers', t0, t1, state: (u) => {
    const h = 4.6 * smooth(ramp(u, 24, 27));
    return base({
      cam: camera([{ t: 0, pos: [0, 5.0, 14], look: [0, 0.4, -21.5], fov: 44 }, { t: 104, pos: [0, 3.6, 8], look: [0, 0.4, -21.5], fov: 44 }])(u),
      power: islands(0.03), lampPower: 0.46, cars: 'none',
      spot: { pos: [-12, 30, 2], target: [0, 3, -21.5], cone: 0.2, soft: 0.2, power: 0.5, R: 70 },
      pegs: arrivals(crowdSquare, u, 2, 40, 6),
      tokens: h > 0.1 ? [{ x: -8.6, z: -17.0, r: 0.8, h, hue: 'accent', ring: true }] : [],
      annots: [{ x: -8.6, y: 4.8, z: -17.0, text: '30 DAYS', dx: 70, dy: 70, a: ramp(u, 27, 30) }],
      pools: [{ x: 0, z: -17.2, r: 11, col: [255, 214, 150], a: 0.4 }], blur: { y: 470, band: 260, amount: 5 },
    });
  } } };
};

// 8 · Decision 4: the pause
const R8 = track([[0, 26], [104, 18]]);
const P8 = outageAt(-50, 28, R8, 16);
const s8 = (): Built => {
  const { t0, t1 } = nextT0(106); const b = builder(t0);
  b.label('Decision 4 of 5 · The pause', 1, 105); b.tl(3, 1, 105); b.stamp('DAY 7', 'The inquiry has not named anyone.', 2, 104);
  b.cap(3, 'Day seven. The inquiry is still working. It has not named anyone. The markets have fallen for six days. A pause on training new frontier systems is on the table.');
  const { next } = decide(b, t0, { id: 'pause', name: 'The pause', h: 'Do you pause?', example: 'B · Keep going, with independent testing before any release',
    opts: [['A', 'Pause new frontier training for 90 days'], ['B', 'Keep going, with independent testing before any release'], ['C', 'Carry on as before']] }, 17.4, 104);
  b.cap(next, 'Each choice costs something. Here is what people on the record have said.');
  b.card(next + 7, 'hermer', 'right'); b.card(next + 16, 'trump-race', 'left'); b.card(next + 25, 'narayanan', 'right'); b.card(next + 34, 'axios-economy', 'left'); b.card(next + 43, 'imf-vamvakidis', 'right'); b.card(next + 52, 'kurzgesagt', 'left');
  b.cap(next + 63, 'A week ago this was an argument. Now it is a vote.');
  return { cues: b.cues, def: { id: 'pause', title: 'The pause', t0, t1, state: (u) => base({
    cam: camera([{ t: 0, pos: [-10, 130, 152], look: [0, 0, 0], fov: 40 }, { t: 104, pos: [10, 124, 148], look: [0, 0, 0], fov: 40 }])(u),
    power: (x, z) => P8(x, z, u), lampPower: 0.9, carList: carsAt(city, u, P8, 's8'), flicker: 0.04,
    rings: [{ x: -50, z: 28, r: R8(u), dash: true, a: 0.8 }], blur: { y: 480, band: 340, amount: 4 },
  }) } };
};

// 9 · Decision 5: who writes the rules (a table in the square, and who sits at it)
const seat = (i: number, side: 1 | -1) => ({ x: -4.2 + i * 1.68, z: -9 + side * 1.55 });
const tableBoxes = (): Box[] => {
  const out: Box[] = [{ id: 10000, x0: -5.2, z0: -10.15, x1: 5.2, z1: -7.85, y0: 0, h: 0.55, kind: 'sub', win: 0, tone: 0.3 }];
  for (let i = 0; i < 6; i++) for (const side of [1, -1] as const) { const p = seat(i, side); out.push({ id: 10001 + i * 2 + (side > 0 ? 1 : 0), x0: p.x - 0.35, z0: p.z - 0.35, x1: p.x + 0.35, z1: p.z + 0.35, y0: 0, h: 0.42, kind: 'shed', win: 0, tone: 0.1 }); }
  return out;
};
const TABLE = tableBoxes();
const group = (ids: [number, 1 | -1][]) => ids.map(([i, s], n) => ({ ...seat(i, s), z: seat(i, s).z + s * 0.5, tone: (n * 0.31) % 1 }));
const seatsA = group([[0, -1], [1, -1], [4, -1], [5, 1]]), seatsB = group([[2, -1], [3, -1], [1, 1]]), seatsC = group([[0, 1], [2, 1], [3, 1], [4, 1], [5, -1]]);
const LEN9 = 132;
const s9 = (): Built => {
  const { t0, t1 } = nextT0(LEN9); const b = builder(t0);
  b.label('Decision 5 of 5 · Who writes the rules', 1, LEN9 - 1); b.tl(4, 1, LEN9 - 1); b.stamp('DAY 10', 'The first law is being drafted.', 2, LEN9 - 2);
  b.cap(3, 'Day ten. The first law is being drafted. A room has been booked. The question is who is in it.');
  const { next } = decide(b, t0, { id: 'rules', name: 'Who writes the rules', h: 'Who is in the room?', p: 'Disclosure: Ctrl AI is building a place where people can take part in questions like this. Option C is closest to it.', example: 'C · Add a panel of ordinary people, chosen by lot',
    opts: [['A', 'The companies and the officials, quickly'], ['B', 'Add independent experts'], ['C', 'Add a panel of ordinary people, chosen by lot']] }, 11.2, LEN9 - 2);
  b.cap(next, 'Each choice costs something. Here is what people on the record have said.');
  b.card(next + 7, 'axios-purpose', 'right'); b.card(next + 16, 'turner-koch', 'left'); b.card(next + 25, 'altman-evaluators', 'right'); b.card(next + 34, 'botvinick-duty', 'left');
  b.card(next + 52, 'irish-assembly', 'left'); b.card(next + 61, 'vandamme-accountability', 'right'); b.card(next + 70, 'courant-watered-down', 'left');
  b.cap(next + 90, 'Whoever is in the room will write the rules for everyone else.');
  return { cues: b.cues, def: { id: 'rules', title: 'Who writes the rules', t0, t1, state: (u) => {
    const ring = (list: { x: number; z: number }[], at: number, text: string) => list.length ? { x: list[0].x, y: 1.2, z: list[0].z, text, dx: 0, dy: -46, a: ramp(u, at + 1, at + 3) } : null;
    const pegs = [...arrivals(seatsA, u, 6, 14, 3), ...arrivals(seatsB, u, next + 7, next + 12, 4), ...arrivals(seatsC, u, next + 52, next + 59, 5)];
    return base({
      cam: camera([{ t: 0, pos: [0, 8, 12], look: [0, 0.4, -9.5], fov: 44 }, { t: LEN9, pos: [0, 5.2, 7], look: [0, 0.5, -9.5], fov: 44 }])(u),
      power: islands(0.03), lampPower: 0.5, cars: 'none', extraBoxes: TABLE, pegs,
      spot: { pos: [-14, 30, 4], target: [0, 0, -12], cone: 0.26, soft: 0.2, power: 0.55, R: 70 },
      annots: [ring(seatsA, 6, 'A'), ring(seatsB, next + 7, 'B'), ring(seatsC, next + 52, 'C')].filter(Boolean) as State['annots'],
      pools: [{ x: 0, z: -9, r: 9, col: [255, 226, 180], a: 0.35 }], blur: { y: 470, band: 320, amount: 4 },
    });
  } } };
};

// 10 · The hot wash
const R10 = track([[0, 60], [40, 0], [60, -10]]);
const P10 = outageAt(-34, 26, R10, 18);
const TOKENS: [number, number][] = [[14, -4], [0, 19], [0, -22.5], [-18, -4], [-30, 24]];
const s10 = (): Built => {
  const { t0, t1 } = nextT0(60); const b = builder(t0);
  b.label('The hot wash', 1, 59); b.tl([0, 4], 1, 59);
  b.cap(3, 'Day ten. The lights come back, district by district. The exercise ends. In a rehearsal this is the part that matters: the hot wash.');
  b.cap(20, 'These were your five decisions. They stay on this device.');
  b.custom({ k: 'ledger', a: t0 + 16.5, b: t0 + 38, kicker: 'Hot wash', h: 'Your five decisions', foot: '<b>Rows that say Example stay until you choose.</b> Your choices stay in this browser, and nobody else sees them.' });
  b.custom({ k: 'title', a: t0 + 40, b: t1 - 0.2, eyebrow: 'The end', h: 'This was yours.', sub: 'Axios reported that AI companies rehearse the day after in private. <b>Ask the labs what they would do. Ask your representatives. Talk about it.</b>' });
  b.note(46, 'Written with Claude, made by Anthropic, which this film names. The same rules apply to every company. The voice is synthetic; the music is composed in code.', 12);
  b.close(42.6, 'Ask the labs what they would do. Ask your representatives. Talk about it.');
  return { cues: b.cues, def: { id: 'wash', title: 'The hot wash', t0, t1, state: (u) => {
    const r = R10(u);
    return base({
      cam: camera([{ t: 0, pos: [-4, 142, 56], look: [-8, 0, 0], fov: 38, shift: -0.17 }, { t: 60, pos: [-4, 138, 54], look: [-8, 0, 0], fov: 38, shift: -0.17 }])(u),
      power: (x, z) => P10(x, z, u), lampPower: track([[0, 0.5], [40, 1.0]])(u), flicker: 0.04,
      carList: u > 34 ? carsAt(city, u, () => 1, 's10').map(c => ({ ...c, a: Math.min(c.a ?? 1, ramp(u, 34, 40)) })) : [],
      rings: r > 1 ? [{ x: -34, z: 26, r, dash: true, a: 0.85 }] : [],
      tokens: TOKENS.map(([x, z], i) => ({ x, z, r: 2, h: 1 * smooth(ramp(u, 10 + i * 3, 12 + i * 3)), ring: true })).filter(t => t.h > 0.05),
      annots: TOKENS.map(([x, z], i) => ({ x, y: 1.2, z, text: String(i + 1), dx: 0, dy: 0, a: ramp(u, 11 + i * 3, 13 + i * 3) })),
      blur: { y: 520, band: 380, amount: 4 },
    });
  } } };
};

// ---------------------------------------------------------------------------------------------------------------------
const built = [s0(), s1(), s2(), s3(), s4(), s5(), s6(), s7(), s8(), s9(), s10()];
const scenes: SceneDef[] = built.map(x => ({ ...x.def, mood: MOOD_OF_SCENE[x.def.id] }));
/** The score, as far as it has been rendered (scripts/day-before-score.ts). Without it the film has no music. */
const beds: MusicBed[] = Object.entries((MUSIC as unknown as MusicManifest).beds).map(([id, b]) => ({ id, src: `/day-before/music/${b.file}`, dur: b.length, loop: b.loop }));
const cues = built.flatMap(x => x.cues).sort((a, b) => a.a - b.a);
const duration = clock;
const stops = [...new Set([...scenes.map(s => s.t0), ...cues.filter(c => c.k === 'ask' || (c.k === 'card' && !c.gap)).map(c => c.a)])].sort((a, b) => a - b);

/** Every line the narrator says, once each (a line said twice is recorded once), in the order the film says them. */
export const NARRATION: NarrationLine[] = lines.filter((l, i) => lines.findIndex(x => x.id === l.id) === i);
/** The sentence before and after a line, as the narrator will say them, so the voice carries its tone from one line to the next. */
export const NARRATION_AROUND = (id: string) => { const i = lines.findIndex(l => l.id === id); const last = (t: string) => t.match(/[^.!?]+[.!?]+/g)?.slice(-1)[0]?.trim(); const first = (t: string) => t.match(/[^.!?]+[.!?]+/g)?.[0]?.trim(); return { before: i > 0 ? last(lines[i - 1].spoken) : undefined, after: i >= 0 && i < lines.length - 1 ? first(lines[i + 1].spoken) : undefined }; };

export const FILM: Film = {
  duration, scenes, cues, decisions, stops, city, clips, beds,
  frameAt: (t: number) => {
    const s = scenes.find(x => t >= x.t0 && t < x.t1) ?? scenes[scenes.length - 1];
    const u = clamp(t - s.t0, 0, s.t1 - s.t0), len = s.t1 - s.t0;
    const black = Math.max(1 - smooth(ramp(u, 0, 0.8)), smooth(ramp(u, len - 0.8, len)));
    return { state: s.state(u, t), black };
  },
};
