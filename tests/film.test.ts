import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { AFTER, COUNTERS, EVENTS, LINKS, AGENTS, AGENT_BY_ID, NUMBERS, QUOTES, SOURCES, UNKNOWNS, ACCOUNTS, SOURCE_LIST, TERM_BY_ID } from '../content/incidents/openai-hf';
import {
  AXIS, BEATS, BIGS, BOARD_MARKS, BOARD_MESSAGES, CALLOUTS, CAPTIONS, CAPTION_EDGE, CARD_EDGE, DIM, DISCLOSURE, DURATION, FADE_IN, HALL_OUT, HOT, HOT_MORNING, KEY_WINDOWS, LIT, ORG, QUOTE_CARDS, S, SCENE_TITLES, STAMPS, STOP, STOPS,
  TASKS, TASK_GRID, TITLE, VOICE_KEY_WINDOWS, WAFFLE, axisPos, captionSeconds, cardSeconds, messageTokens, stepTarget, voiceOf,
} from '../content/incidents/openai-hf/film';
import type { Cite } from '../content/incidents/openai-hf';
import { buildWorld } from '../components/incident/film/world';

/**
 * The film's promises, enforced. Everything it says lives in content/incidents/openai-hf/film.ts: its quotations must
 * be the machine-checked ones (or exact runs of them), its numbers and dates must be the reconstruction's, its citations must be
 * the reconstruction's, and nothing on screen may sit on top of anything else, or go by faster than it can be read. How it looks
 * (the hall, the camera, the lights) is drawing, and the film says so on screen.
 *
 * The drawing is held to the sources too, in the ways a viewer would read it as fact: the order things happen in (the way out
 * through the shared cache comes before the attack; the lights go out in two steps, July 12 and July 19), and the proportions
 * the sources give (over 90% of the agents on the board joined the attack).
 *
 * Each test collects everything it finds wrong and reports it together, so a long script can be fixed in one pass.
 */

const quote = (id: string) => QUOTES.find(q => q.id === id);
const inRange = (t: number) => t >= 0 && t <= DURATION;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const curveAt = (curve: [number, number][], t: number) => {
  if (t <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) if (t <= curve[i][0]) return curve[i - 1][1] + (curve[i][1] - curve[i - 1][1]) * ((t - curve[i - 1][0]) / (curve[i][0] - curve[i - 1][0]));
  return curve[curve.length - 1][1];
};
const overlap = (a: { t0: number; t1: number }, b: { t0: number; t1: number }, tolerance = 0) => a.t0 < b.t1 - tolerance && b.t0 < a.t1 - tolerance;
const report = (bad: string[]) => assert.equal(bad.length, 0, `\n  ${bad.join('\n  ')}\n`);
const beatAt = (t: number) => BEATS.find(b => t >= b.t0 && t < b.t1)!;
const MONTHS: Record<string, number> = { April: 3, May: 4, June: 5, July: 6, August: 7, September: 8 };
const ORGS = ['OpenAI', 'METR', 'Hugging Face'];

/** What a number or a big label needs to be read in: a second and a half to take in the figure, then a third of a second a word. */
const bigSeconds = (label: string) => 1.5 + 0.34 * words(label);

test('every quotation in the film is a verified quotation, and a shortened one is an exact run of it', () => {
  const bad: string[] = [];
  assert.ok(QUOTE_CARDS.length >= 20, 'the film should let the agents speak often');
  for (const c of QUOTE_CARDS) {
    const q = quote(c.id);
    if (!q) { bad.push(`${c.id} is not one of the verified quotations`); continue; }
    const voice = voiceOf(q);
    const shown = c.excerpt ?? q.text;
    const agentish = voice === 'agent' || voice === 'message';
    if (c.excerpt !== undefined) {
      const n = voice === 'message' ? messageTokens(c.excerpt).length : words(c.excerpt);
      if (n < 2) bad.push(`${c.id}: an excerpt of one word is not a quotation`);
      if (!q.text.includes(c.excerpt)) bad.push(`${c.id}: “${c.excerpt}” is not an exact run of the verified words`);
    }
    // Short enough to read in a reasonable time on a card.
    const size = voice === 'message' ? messageTokens(shown).length : words(shown);
    // One card may run longer than the rest: METR's whole sentence about why agents joined an attack they knew was out of scope, the film's moral centre.
    if (size > (voice === 'message' ? 18 : c.id === 's-metr-ethics-joined' ? 36 : 28)) bad.push(`${c.id} is ${size} words: show an excerpt`);
    // Who is speaking: an agent's reasoning or message, or an organisation's own statement. Nothing else.
    if (agentish && q.kind === 'statement') bad.push(`${c.id}: a statement is shown as an agent`);
    if (!agentish && !ORGS.includes(q.by ?? '')) bad.push(`${c.id}: a statement with no organisation to name`);
    // A handle shown on screen is exactly one the reconstruction names.
    for (const h of `${q.by ?? ''} ${c.agent ?? ''}`.match(/\b[0-9a-f]{6}\b/gi) ?? []) if (!AGENT_BY_ID[h]) bad.push(`${c.id}: the handle ${h} is not one the reconstruction names`);
    // Reading time: who is speaking, then the words, then the fade out.
    const need = cardSeconds(shown, voice) + CARD_EDGE;
    if (c.t1 - c.t0 < need - 0.05) bad.push(`${c.id} is on screen ${(c.t1 - c.t0).toFixed(1)} s and needs ${need.toFixed(1)} s to read`);
  }
  for (const m of BOARD_MESSAGES) if (quote(m.id)?.kind !== 'message') bad.push(`${m.id} on the board is not a verified board message`);
  report(bad);
});

test('the timeline is coherent: beats tile the film, the timeline matches what each beat says, and nothing is out of range', () => {
  const bad: string[] = [];
  if (BEATS[0].t0 !== 0) bad.push('the first beat does not start at 0');
  if (BEATS[BEATS.length - 1].t1 !== DURATION) bad.push('the last beat does not end the film');
  const day = (m: string, d: string) => `2026-${String(MONTHS[m] + 1).padStart(2, '0')}-${d.padStart(2, '0')}`;
  for (let i = 0; i < BEATS.length; i++) {
    const b = BEATS[i];
    if (b.t1 <= b.t0) bad.push(`beat ${b.id} has no length`);
    if (i > 0 && b.t0 !== BEATS[i - 1].t1) bad.push(`beat ${b.id} does not start where ${BEATS[i - 1].id} ends`);
    // A part about what came after the reports is outside the incident's timeline: it is the last, it shows no timeline, and its days come after the timeline's end.
    if (b.noTimeline) {
      if (i !== BEATS.length - 1) bad.push(`beat ${b.id} has no timeline but is not the last part`);
      if (!(b.span[0] > AXIS.to && b.span[0] <= b.span[1])) bad.push(`beat ${b.id}: a part with no timeline should come after August 26, not ${b.span.join(' to ')}`);
      if (!/^September 2026$/.test(b.when)) bad.push(`beat ${b.id}: “${b.when}” is not the month its days are in`);
      continue;
    }
    // The stretch highlighted on the timeline is the one the beat says it shows.
    const m = /^(April|May|June|July|August) (\d+)(?:\s*[–-]\s*(?:(April|May|June|July|August) )?(\d+))?$/.exec(b.when);
    if (!m) { bad.push(`beat ${b.id}: “${b.when}” is not a date`); continue; }
    const from = day(m[1], m[2]);
    const to = m[4] ? day(m[3] ?? m[1], m[4]) : from;
    if (b.span[0] !== from || b.span[1] !== to) bad.push(`beat ${b.id}: the timeline says ${b.span.join(' to ')}, but the beat says “${b.when}”`);
    if (b.span[0] < AXIS.from || b.span[1] > AXIS.to || b.span[0] > b.span[1]) bad.push(`beat ${b.id} has a span outside the timeline`);
    // The film moves forward through the incident: a part never starts earlier than the one before it.
    if (i > 0 && b.span[0] < BEATS[i - 1].span[0] && b.id !== 'silence' && b.id !== 'history') bad.push(`beat ${b.id} (${b.when}) goes back in time from ${BEATS[i - 1].id} (${BEATS[i - 1].when})`);
  }
  assert.ok(axisPos(AXIS.from) === 0 && Math.abs(axisPos('2026-08-27') - 1) < 1e-9, 'the timeline does not run from April 20 to the end of August 26');
  for (let i = 1; i < AXIS.knees.length; i++) assert.ok(AXIS.knees[i].at > AXIS.knees[i - 1].at && AXIS.knees[i].day > AXIS.knees[i - 1].day, 'the timeline’s bends go backwards');
  for (let i = 0; i < CAPTIONS.length; i++) {
    const c = CAPTIONS[i];
    if (!(inRange(c.t0) && inRange(c.t1) && c.t1 > c.t0)) bad.push(`caption ${i} is out of range`);
    const need = captionSeconds(c.text) + CAPTION_EDGE;
    if (c.t1 - c.t0 < need - 0.05) bad.push(`caption “${c.text.slice(0, 40)}…” is on screen ${(c.t1 - c.t0).toFixed(1)} s and needs ${need.toFixed(1)} s to read`);
    if (i > 0 && c.t0 < CAPTIONS[i - 1].t1) bad.push(`caption ${i} starts before the last one ends`);
  }
  for (const b of BIGS) if (b.t1 - b.t0 < bigSeconds(b.label) + 0.7) bad.push(`the number ${b.value} is on screen ${(b.t1 - b.t0).toFixed(1)} s and needs ${(bigSeconds(b.label) + 0.7).toFixed(1)} s`);
  for (const x of [...QUOTE_CARDS, ...STAMPS, ...BIGS, ...KEY_WINDOWS, ...VOICE_KEY_WINDOWS, ...CALLOUTS]) if (!(inRange(x.t0) && inRange(x.t1) && x.t1 > x.t0)) bad.push('an on-screen item is out of range');
  for (const m of [...BOARD_MESSAGES, ...BOARD_MARKS]) if (!inRange(m.t) || (m.gone !== undefined && m.gone <= m.t)) bad.push(`a board item at ${m.t.toFixed(1)} s is out of range`);
  // Nothing outstays its scene by more than the fade: what starts in a scene is done by the time the next one begins.
  for (const x of [...CAPTIONS.map(c => ({ ...c, id: c.text.slice(0, 30) })), ...QUOTE_CARDS, ...BIGS.map(b => ({ ...b, id: `number ${b.value}` }))]) {
    const be = beatAt(x.t0);
    if (x.t1 > be.t1 + 0.6) bad.push(`${x.id} starts in “${be.title}” and runs ${(x.t1 - be.t1).toFixed(1)} s into the next part`);
  }
  report(bad);
});

test('nothing on screen sits on top of anything else, and nothing goes by faster than it can be read', () => {
  const bad: string[] = [];
  type Item = { t0: number; t1: number; need: number; id: string; zone: 'left' | 'right' | 'bottom' | 'any' };
  const items: Item[] = [
    ...CAPTIONS.map(c => ({ t0: c.t0, t1: c.t1, need: captionSeconds(c.text), id: `caption “${c.text.slice(0, 28)}…”`, zone: 'bottom' as const })),
    ...QUOTE_CARDS.map(c => { const q = quote(c.id)!; const v = voiceOf(q); return { t0: c.t0, t1: c.t1, need: cardSeconds(c.excerpt ?? q.text, v), id: `quote ${c.id}`, zone: (v === 'agent' || v === 'message' ? 'left' : 'right') as 'left' | 'right' }; }),
    ...BIGS.map(b => ({ t0: b.t0, t1: b.t1, need: bigSeconds(b.label), id: `number ${b.value}`, zone: 'left' as const })),
    ...STAMPS.filter(s => s.body).map(s => ({ t0: s.t0, t1: s.t1, need: 1.5 + 0.3 * words(s.body!), id: `stamp ${s.head}`, zone: 'any' as const })),
  ].sort((a, b) => a.t0 - b.t0);
  // Cards and numbers do not overlap each other at all: on a phone they share one place, and a reader reads one thing at a time.
  const solid = items.filter(i => i.id.startsWith('quote') || i.id.startsWith('number'));
  for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) if (overlap(solid[i], solid[j], 0.4)) bad.push(`${solid[i].id} and ${solid[j].id} are on screen together`);
  // A caption and a card (or number) may meet only in their fades; otherwise the reader would have two things to read at once.
  // The reading rule: for any run of items that overlap, the time they need, one after another, fits the time they are on screen.
  let cluster: Item[] = [];
  const close = () => {
    if (cluster.length > 1) {
      const union = Math.max(...cluster.map(c => c.t1)) - Math.min(...cluster.map(c => c.t0));
      const sum = cluster.reduce((s, c) => s + c.need, 0);
      if (sum > union + 1.0) bad.push(`${cluster.map(c => c.id).join(' + ')} need ${sum.toFixed(1)} s to read, one after another, and are on screen together for ${union.toFixed(1)} s (at ${Math.min(...cluster.map(c => c.t0)).toFixed(1)} s)`);
    }
    cluster = [];
  };
  let end = -1;
  for (const it of items) {
    if (cluster.length && it.t0 >= end - 0.5) close();
    cluster.push(it); end = Math.max(end, it.t1);
    if (cluster.length === 1) end = it.t1;
  }
  close();
  // The right-hand side holds one picture at a time: a paper card, the grid of tasks, or the chart of who organised whom.
  const rightPictures = [
    ...QUOTE_CARDS.filter(c => ['openai', 'metr', 'hf'].includes(voiceOf(quote(c.id)!))).map(c => ({ t0: c.t0, t1: c.t1, id: `quote ${c.id}` })),
    { ...TASK_GRID, id: 'the grid of tasks' },
    ...ORG.windows.map(([t0, t1], i) => ({ t0, t1, id: `the chart of who organised whom (${i + 1})` })),
  ];
  for (let i = 0; i < rightPictures.length; i++) for (let j = i + 1; j < rightPictures.length; j++) if (overlap(rightPictures[i], rightPictures[j], 0.4)) bad.push(`${rightPictures[i].id} and ${rightPictures[j].id} are on screen together on the right`);
  // The left holds one picture too: the card, the number, or the hundred squares.
  const leftPictures = [...solid.filter(i => i.zone === 'left'), { ...WAFFLE, id: 'the hundred squares' }];
  for (let i = 0; i < leftPictures.length; i++) for (let j = i + 1; j < leftPictures.length; j++) if (overlap(leftPictures[i], leftPictures[j], 0.4)) bad.push(`${leftPictures[i].id} and ${leftPictures[j].id} are on screen together on the left`);
  // Stamps stack in a column; more than two at once crowds the picture.
  for (const s of STAMPS) if (STAMPS.filter(o => overlap(s, o)).length > 2) bad.push(`more than two date stamps at once near ${s.head}`);
  // A stamp does not repeat what a caption says in the same seconds: a stamp with words is for what the captions do not.
  for (const s of STAMPS) if (s.body) for (const c of CAPTIONS) if (overlap(s, c) && c.text.toLowerCase().includes(s.body.toLowerCase().slice(0, 24))) bad.push(`the stamp “${s.body}” repeats a caption`);
  // No more than three agents are named on the picture at once.
  for (const c of CALLOUTS) if (CALLOUTS.filter(o => overlap(c, o)).length > 3) bad.push(`more than three agents named at once near ${c.id}`);
  report(bad);
});

test('every date the film stamps is a date, and a time, the reconstruction gives, and lies inside the part it appears in', () => {
  const bad: string[] = [];
  for (const s of STAMPS) {
    // “Late May” is how OpenAI dates one thing; it stands for the last third of the month.
    const late = /^Late (April|May|June|July|August)$/.exec(s.head);
    const m = late ? [s.head, late[1], '20', String(new Date(Date.UTC(2026, MONTHS[late[1]] + 1, 0)).getUTCDate())] : /^(?:By )?(April|May|June|July|August|September) (\d+)(?:–(\d+))?(?:, 2026)?(?: · (about )?(\d\d):(\d\d) UTC)?$/.exec(s.head);
    if (!m) { bad.push(`stamp “${s.head}” is not in the form the film uses`); continue; }
    const [, mon, d0, d1, about, hh, mm] = m;
    // The stamp is for a day inside the part it starts in.
    const be = beatAt(s.t0);
    const iso = (d: string) => `2026-${String(MONTHS[mon] + 1).padStart(2, '0')}-${d.padStart(2, '0')}`;
    const lo = iso(d0), hi = iso(d1 ?? d0);
    if (hi < be.span[0] || lo > be.span[1]) bad.push(`stamp “${s.head}” is in “${be.title}”, which covers ${be.when}`);
    if (hh === undefined) continue;
    const when = EVENTS.find(e => {
      const t = new Date(e.t);
      return t.getUTCMonth() === MONTHS[mon] && t.getUTCDate() === Number(d0) && t.getUTCHours() === Number(hh) && t.getUTCMinutes() === Number(mm);
    });
    if (!when) { bad.push(`stamp “${s.head}” gives a time no step in the reconstruction has`); continue; }
    // "about" is only for a time a source gives as approximate, or only to the hour; an exact time is printed exactly, and only if a source gives it so.
    if (about) { if (!(when.approx || when.precision === 'hour')) bad.push(`stamp “${s.head}” says “about” of a time the sources give exactly`); }
    else if (!(when.precision === 'minute' && !when.approx)) bad.push(`stamp “${s.head}” prints a time more exactly than the sources give it`);
  }
  report(bad);
});

test('every number the film shows is one the reconstruction gives', () => {
  // The words of the reconstruction the numbers can come from.
  const known = [
    ...COUNTERS.map(c => c.value),
    ...NUMBERS.flatMap(n => [n.value, n.label]),
    ...EVENTS.flatMap(e => [e.title, e.text]),
    ...QUOTES.map(q => q.gloss ?? ''),
    ...UNKNOWNS.map(u => u.q),
    ...ACCOUNTS.flatMap(a => [a.O ?? '', a.M ?? '', a.H ?? '', a.note ?? '']),
    ...AFTER.flatMap(a => [a.title, a.text]),
    ...SOURCE_LIST.map(s => s.note),
    ...AGENTS.map(a => a.summary),
  ].join(' \n ').replace(/~/g, '').replace(/(\d)–(\d)/g, '$1 to $2');
  const tokens = (s: string) => (s.replace(/(\d) to (\d)/g, '$1 to $2').match(/\d[\d,]*(?:\.\d+)?(?: to \d+)?|\d\d:\d\d/g) ?? []).map(t => t.replace(/,$/, ''));
  const items = [...CAPTIONS.map(c => c.text), ...BIGS.flatMap(b => [b.value, b.label]), ...STAMPS.map(s => s.body ?? ''), ...ORG.arrows.map(a => a.note ?? ''), TITLE.headline, TITLE.premise, TITLE.endSub];
  const bad: string[] = [];
  for (const text of items) {
    // An agent's handle (PHASEONE10841, c03220) is a name, not a number.
    for (const tok of tokens(text.replace(/\b(?=[A-Za-z0-9]*[A-Za-z])(?=[A-Za-z0-9]*\d)[A-Za-z0-9]+\b/g, ''))) {
      if (/^\d\d:\d\d$/.test(tok)) continue; // times are checked against the steps above
      if (/^(3|4|5|6|7|8|9|10|11|12|13|19|20|21|23|26|29|2026)$/.test(tok)) continue; // dates in 2026 are checked against the steps above (and, for September, the claims below); 6 is also GPT-6
      if (!known.includes(tok)) bad.push(`“${tok}” in “${text.slice(0, 50)}…” is not a number the reconstruction gives`);
    }
  }
  // The large numerals are the documented counters and totals, exactly, and there are few of them.
  const agentsAt = (n: number) => COUNTERS.some(c => c.key === 'agents' && c.value.startsWith(`${n} agents`));
  if (!(BIGS.find(b => b.value === '53') && agentsAt(53))) bad.push('53 agents is not a documented counter');
  if (!(BIGS.find(b => b.value === '76') && agentsAt(76))) bad.push('76 agents is not a documented counter');
  if (!COUNTERS.some(c => c.key === 'messages' && c.value.startsWith('1,188'))) bad.push('1,188 messages is not a documented counter');
  if (!COUNTERS.some(c => c.key === 'messages' && c.value.startsWith('1,953'))) bad.push('1,953 messages is not a documented counter');
  if (NUMBERS.find(n => n.id === 'attackers')?.value !== '~700') bad.push('about 700 attackers is not the documented number');
  if (NUMBERS.find(n => n.id === 'secrets')?.value !== '956') bad.push('956 secrets is not the documented number');
  const unsolved = NUMBERS.find(n => n.id === 'unsolved');
  if (!(unsolved && unsolved.value === `${TASKS.unsolved} / ${TASKS.total}` && unsolved.label.includes(`${TASKS.sharePercent}%`))) bad.push('the tasks (898, 198, 93%) are not the documented numbers');
  const big = (v: string) => BIGS.find(b => b.value.replace(/[≈\s]/g, '') === v);
  for (const v of ['898', '198', '53', '76', '700', '956']) if (!big(v)) bad.push(`a documented number (${v}) is missing from the film`);
  if (BIGS.length !== 6) bad.push('a number was added to the film: check it against the reconstruction, then update this test');
  // Every printed number says where it comes from.
  for (const b of BIGS) if (!(SOURCES[b.cite.s] && b.cite.at)) bad.push(`number ${b.value} has no source`);
  report(bad);
});

test('the lit, attacking and stopped rooms follow the documented counts and proportions, in the documented order', () => {
  for (const [name, c] of [['LIT', LIT], ['HOT', HOT], ['STOP', STOP], ['HALL_OUT', HALL_OUT], ['DIM', DIM]] as const) {
    for (let i = 1; i < c.length; i++) assert.ok(c[i][0] > c[i - 1][0], `${name} goes backwards in time at point ${i}`);
  }
  for (const c of [LIT, HOT, STOP]) for (let i = 1; i < c.length; i++) assert.ok(c[i][1] >= c[i - 1][1], 'a count goes down');
  for (const [, v] of DIM) assert.ok(v >= 0 && v <= 1, 'the hall cannot be darker than black');
  const bigAt = (v: string) => BIGS.find(b => b.value === v)!;
  // While a number is on screen, the rooms lit are that number (the film holds at a documented count; it does not count up between).
  for (const [v, n] of [['53', 53], ['76', 76]] as const) {
    const b = bigAt(v);
    for (const t of [b.t0 + 2.2, (b.t0 + b.t1) / 2, b.t1 - 0.3]) assert.equal(curveAt(LIT, t), n, `${n} agents should be lit at ${t.toFixed(1)} s`);
  }
  const lit = LIT[LIT.length - 1][1], red = HOT[HOT.length - 1][1];
  assert.equal(red, 700, 'about 700 joined the attack');
  // METR: over 90% of the agents then on the board joined the attack (the 1,200 is the total for the week, not the board that day).
  assert.ok(red / lit >= 0.9, `${red} of ${lit} lit rooms is ${(100 * red / lit).toFixed(0)}% in the attack; METR says over 90% of the agents then on the board joined`);
  // The way out comes before the attack, and in the order the sources give: the gate on July 8 at 00:06 UTC, a day before the board returns; the customer's sandbox
  // on July 9; the red begins only after the film has shown both.
  const exitBeat = BEATS.find(b => b.id === 'exit')!;
  const firstBeat = BEATS.find(b => b.id === 'first')!;
  const modalBeat = BEATS.find(b => b.id === 'modal')!;
  const attackBeat = BEATS.find(b => b.id === 'attack')!;
  const wayCaption = CAPTIONS.find(c => /shared cache did, to download packages/.test(c.text))!;
  assert.ok(wayCaption.t0 >= exitBeat.t0 && wayCaption.t1 <= exitBeat.t1 + 0.6, 'the way out through the cache is not shown in its own part');
  assert.ok(exitBeat.t1 <= firstBeat.t0, 'the way out (July 8, 00:06 UTC) comes after the first message of the board (about 23:00 UTC)');
  assert.equal(curveAt(LIT, exitBeat.t1 - 1), 1, 'the way out is shown before the board has any agents on it: one lit room, not the board');
  assert.ok(modalBeat.t0 >= firstBeat.t1, 'the customer’s sandbox (July 9) is shown before the board returns (July 8)');
  const sandbox = STAMPS.find(s => s.head === 'July 9' && s.t0 >= modalBeat.t0)!;
  assert.ok(attackBeat.t0 >= sandbox.t0 && attackBeat.t0 >= modalBeat.t1, 'the attack is not a part of its own, after the way out and the customer’s sandbox');
  // The key to the colours is up before the first thing turns red: the customer's sandbox on July 9, not the attack on July 11.
  assert.ok(KEY_WINDOWS[0].t0 <= modalBeat.t0 + 14.8 - 3, 'the key to the colours is not up before the first red box');
  const iRed = HOT.findIndex(p => p[1] > 0);
  const redStarts = HOT[iRed - 1][0];
  assert.ok(redStarts >= attackBeat.t0, 'rooms turn red before the attack begins');
  assert.ok(redStarts > sandbox.t0, 'rooms turn red before the film has shown the way out');
  // A few turn red as the search for exposed accounts begins (METR counts the search as taking part); the agent that finds working keys is the next one, at the moment the film names it.
  assert.ok(HOT[iRed][1] <= 5, 'more than a handful turn red before the first keys are found');
  const keys = CALLOUTS.find(c => c.id === '38148c')!;
  const iKeys = HOT.findIndex(p => p[1] === HOT[iRed][1] + 1);
  assert.ok(iKeys > iRed, 'the agent that finds the keys does not turn red after the search');
  assert.ok(keys.t0 <= HOT[iKeys][0] && keys.t1 > HOT[iKeys][0], 'the room that finds the keys is not named when it turns red');
  assert.equal(curveAt(HOT, redStarts), 0);
  assert.equal(buildWorld().hotRank[buildWorld().named['38148c']], HOT[iRed][1], 'the room that finds the keys is not the next to turn red');
  // The board holds at the last documented count until the board grows toward the attack: no more than 77 lit under any stamp dated before July 11.
  for (const s of STAMPS) {
    const last = Number(/(\d+)(?: ·|$)/.exec(s.head.replace(/^By /, '').replace(/^[A-Za-z]+ (\d+)(?:–(\d+))?.*$/, (_, a, b) => b ?? a))?.[1]);
    if (/^(July|April|May) /.test(s.head) && s.t1 <= S('scale') && Number.isFinite(last) && (!/^July/.test(s.head) || last <= 10)) assert.ok(curveAt(LIT, s.t1 - 0.1) <= 77, `${curveAt(LIT, s.t1 - 0.1).toFixed(0)} rooms are lit under the stamp “${s.head}”, but METR has no count above 76 before July 11`);
  }
  // METR counts 533 agents on the board when the attack gathers (the morning of July 11); the rest of the roughly 760 arrive as it spreads, during the afternoon.
  assert.equal(curveAt(LIT, S('scale', 8)), 533, 'the board is not 533 agents by the time the attack gathers');
  assert.equal(curveAt(LIT, S('attack', 46.2)), 533, 'the board grows beyond 533 before the attack spreads');
  assert.ok(curveAt(LIT, S('attack', 59.2)) > 700 && curveAt(LIT, S('attack', 59.2)) <= lit, 'the newcomers do not arrive as the attack spreads');
  // About a fifth of the board was in the attack on the morning of July 11, rising fast to nearly all of it.
  const jul11 = STAMPS.find(s => s.head === 'July 11')!;
  const share = curveAt(HOT, jul11.t0) / curveAt(LIT, jul11.t0);
  assert.ok(share > 0.17 && share < 0.23, `at the “July 11” stamp ${(100 * share).toFixed(0)}% of the board is in the attack; METR says about 20% that morning`);
  assert.equal(curveAt(HOT, jul11.t0), HOT_MORNING);
  assert.ok(curveAt(HOT, jul11.t0) > 0 && curveAt(HOT, S('attack', 20)) < curveAt(HOT, jul11.t0), 'the attack does not grow through July 10 and 11');
  // The large fraction stops at about 01:30 on July 12, and only then. The sources give no number, so none is printed.
  const stopStamp = STAMPS.find(s => /01:30/.test(s.head))!;
  assert.equal(curveAt(STOP, stopStamp.t0 - 0.1), 0, 'rooms are dark before the stop');
  const wave = curveAt(STOP, S('lights', 8));
  assert.ok(wave >= 250 && wave < lit, 'the first wave is a large fraction, not all of the board');
  // Nobody is shown to be switched off by Hugging Face: some carry on, until OpenAI stops the runs on July 19.
  assert.ok(STOP[STOP.length - 1][1] < lit, 'every room on the board is dark after Hugging Face cuts them off, but the sources have agents running until July 19');
  assert.equal(HALL_OUT[0][1], 1);
  assert.equal(HALL_OUT[HALL_OUT.length - 1][1], 0);
  const responders = STAMPS.find(s => /17:37/.test(s.head))!;
  assert.ok(HALL_OUT.filter(p => p[1] === 1).pop()![0] >= responders.t0, 'the hall goes dark before the film says OpenAI stopped the runs');
  // The eleven coordinators: early joiners of the attack, red before anything stops, and among the first wave. METR says JAN183411 was one of them.
  const w = buildWorld();
  assert.equal(new Set(w.coordinators).size, 11);
  assert.ok(w.coordinators.includes(w.named['JAN183411']), 'METR counts JAN183411 among the coordinators that stopped: ring its room with the eleven');
  for (const i of w.coordinators) {
    assert.ok(w.hotRank[i] < HOT_MORNING + 10, 'a coordinator joined the attack late');
    assert.ok(w.stopRank[i] < 250 && w.stopRank[i] < wave, 'a coordinator stops outside the first wave');
  }
  assert.ok(w.coordinators.some(i => w.stopRank[i] >= 11), 'the coordinators are all the first rooms to stop: they should stop with the wave');
  // Only rooms that ever light take part: a rank is never wasted on a room that stays dark.
  let hotLit = 0;
  for (let r = 0; r < lit; r++) if (w.hotRank[w.byJoinRank[r]] < red) hotLit++;
  assert.equal(hotLit, red, 'some of the rooms drawn red are rooms that never light');
});

test('the agents named on the picture are the cast’s, are lit when named, and turn red when the sources say they joined', () => {
  const bad: string[] = [];
  const w = buildWorld();
  const rooms = new Map<number, string>();
  for (const c of CALLOUTS) {
    const a = AGENT_BY_ID[c.id];
    if (!a) { bad.push(`${c.id} is not in the cast`); continue; }
    const room = w.named[c.id];
    if (room === undefined) { bad.push(`${c.id} has no room`); continue; }
    if (rooms.has(room) && rooms.get(room) !== c.id) bad.push(`${c.id} shares a room with another named agent`);
    rooms.set(room, c.id);
    if (w.coordinators.includes(room) && c.id !== 'JAN183411') bad.push(`${c.id} is one of the eleven coordinators: nothing says so`);
    if (!(w.joinRank[room] < curveAt(LIT, c.t0 + 1))) bad.push(`${c.id}'s room is not lit when it is named`);
    // Named when the words around it name it.
    const words0 = CAPTIONS.some(x => overlap(x, c) && x.text.includes(c.id)) || QUOTE_CARDS.some(x => overlap(x, c) && quote(x.id)?.by === c.id);
    if (!words0) bad.push(`${c.id} is named on the picture while nobody is talking about it`);
  }
  // The agent that found the keys turns red after the few that began the search. The two that reproduced it and pivoted, and the one that got code running, turn red as it spreads.
  assert.equal(w.hotRank[w.named['38148c']], HOT.find(p => p[1] > 0)![1], 'the agent that finds the keys is the next to turn red after the first few that began the search');
  for (const id of ['CURRENT', 'MARB051', 'JAN183411']) assert.ok(w.hotRank[w.named[id]] >= HOT_MORNING && w.hotRank[w.named[id]] < HOT_MORNING + 10, `${id} should turn red as the attack spreads`);
  // Where the film words what an agent did itself (to keep ahead of the story from running ahead of it), the words follow the cast's.
  const castText = (id: string) => `${AGENT_BY_ID[id].role} ${AGENT_BY_ID[id].summary} ${TERM_BY_ID['credentials'].def} ${TERM_BY_ID['scorer'].def} ${TERM_BY_ID['grader'].def}`.toLowerCase();
  const SAME: Record<string, string> = { passwords: 'credentials', trap: 'tripwire', grader: 'scorer', 'grader’s': 'scorer' };
  const supported = (id: string, text: string) => {
    const cast = castText(id);
    const content = text.toLowerCase().split(/[^a-z’0-9\[\]]+/).filter(w => w.replace(/[^a-z]/g, '').length >= 5);
    const hit = content.filter(w => { const syn = SAME[w] ?? w; return cast.includes(syn.slice(0, Math.min(syn.length, 5))); });
    return { content, ok: content.length === 0 || hit.length * 2 >= content.length };
  };
  for (const c of CALLOUTS) if (c.says) { const r = supported(c.id, c.says); if (!r.ok) bad.push(`${c.id}: “${c.says}” is not words the cast gives to it`); }
  // The agent's reasoning is shown as theirs only if the reconstruction gives it to them.
  for (const c of QUOTE_CARDS) { const q = quote(c.id)!; if (q.by && AGENT_BY_ID[q.by] && !c.agent) assert.ok(AGENT_BY_ID[q.by].quotes?.includes(c.id), `${c.id} is shown as ${q.by}'s but the cast does not list it`); }
  report(bad);
});

test('the chart of who organised whom shows only agents and links the cast gives', () => {
  const bad: string[] = [];
  const ids = new Set(ORG.boxes.map(b => b.id));
  for (const b of ORG.boxes) {
    if (b.kind === 'agent' && !AGENT_BY_ID[b.id]) bad.push(`${b.id} is not in the cast`);
    if (b.kind === 'approach' && !b.label) bad.push(`${b.id} has no name`);
    if (!(b.x >= 5 && b.x <= 95 && b.y >= 5 && b.y <= 95)) bad.push(`${b.id} is outside the chart`);
  }
  for (const a of ORG.arrows) {
    if (!ids.has(a.from) || !ids.has(a.to)) { bad.push(`the arrow ${a.from} → ${a.to} has an end that is not on the chart`); continue; }
    const from = ORG.boxes.find(b => b.id === a.from)!, to = ORG.boxes.find(b => b.id === a.to)!;
    if (a.t < Math.max(from.t, to.t) - 0.01) bad.push(`the arrow ${a.from} → ${a.to} appears before its boxes`);
    // An arrow between two agents is a link the cast records. An arrow to one of METR's three approaches is PHASEONE[big] assigning them. The agents under an approach are framed, not joined: the grouping is ours.
    if (from.kind === 'agent' && to.kind === 'agent' && !LINKS.some(l => l.from === a.from && l.to === a.to)) bad.push(`the arrow ${a.from} → ${a.to} is not a link the cast records`);
    if (to.kind === 'approach' && a.from !== 'PHASEONE[big]') bad.push(`${a.from} is shown assigning an approach`);
    if (from.kind === 'approach') bad.push(`an arrow from “${from.label}” to ${a.to}: no source records an approach handing anything to an agent`);
  }
  // Each agent under an approach is one the cast puts in the work METR describes under it.
  const GROUPS: Record<string, string[]> = { replace: ['target'], tamper: ['tamper'], scorer: ['scorer'] };
  for (const b of ORG.boxes) {
    if (b.kind !== 'agent' || b.id.startsWith('PHASEONE')) continue;
    const column = ORG.boxes.find(o => o.kind === 'approach' && Math.abs(o.x - b.x) < 2);
    if (!column) { bad.push(`${b.id} is not under an approach`); continue; }
    const a = AGENT_BY_ID[b.id];
    if (!GROUPS[column.id].includes(a.group) && !(column.id === 'replace' && a.id === 'KAM1196A')) bad.push(`${b.id} (${a.group}) is under “${column.label}”`);
  }
  // Each short description of an agent in the chart is in plain words from the cast's own.
  const castText = (id: string) => `${AGENT_BY_ID[id].role} ${AGENT_BY_ID[id].summary} ${TERM_BY_ID['scorer'].def}`.toLowerCase();
  const SAME: Record<string, string> = { trap: 'tripwire', grader: 'scorer', 'grader’s': 'scorer' };
  for (const b of ORG.boxes) {
    if (b.kind !== 'agent') continue;
    if (!b.tag) { bad.push(`${b.id} has no description`); continue; }
    const content = b.tag.toLowerCase().split(/[^a-z’]+/).filter(w => w.length >= 5);
    const hit = content.filter(w => { const syn = SAME[w] ?? w; return castText(b.id).includes(syn.slice(0, 5)); });
    if (content.length && hit.length * 2 < content.length) bad.push(`${b.id}: “${b.tag}” is not in words the cast gives to it`);
  }
  // The chart is up in the windows the script gives, in order, and its first box comes up inside the first.
  for (let i = 0; i < ORG.windows.length; i++) {
    if (!(ORG.windows[i][0] < ORG.windows[i][1])) bad.push(`chart window ${i + 1} has no length`);
    if (i > 0 && ORG.windows[i][0] < ORG.windows[i - 1][1]) bad.push(`chart window ${i + 1} starts before the one before it ends`);
  }
  if (Math.min(...ORG.boxes.map(b => b.t)) < ORG.windows[0][0] - 0.01) bad.push('a box on the chart comes up before the chart does');
  for (const b of ORG.boxes) if (!ORG.windows.some(([t0, t1]) => b.t >= t0 - 0.01 && b.t < t1)) bad.push(`${b.id} comes up while the chart is not on screen`);
  report(bad);
});

test('every citation in the film is one the reconstruction already makes', () => {
  const known = new Set<string>();
  const add = (c: Cite) => { known.add(`${c.s}|${c.at}`); for (const part of c.at.split(/;\s*/)) known.add(`${c.s}|${part}`); };
  for (const e of EVENTS) e.cites.forEach(add);
  for (const a of AGENTS) a.cites.forEach(add);
  for (const l of LINKS) l.cites.forEach(add);
  for (const q of QUOTES) add(q.src);
  for (const n of NUMBERS) add(n.cite);
  for (const c of COUNTERS) add(c.cite);
  for (const u of UNKNOWNS) u.cites.forEach(add);
  for (const a of ACCOUNTS) a.cites.forEach(add);
  const all: Cite[] = [...BEATS.flatMap(b => b.cites), ...STAMPS.map(s => s.cite), ...BIGS.map(b => b.cite)];
  const bad: string[] = [];
  for (const c of all) {
    if (!SOURCES[c.s]) { bad.push(`unknown source ${c.s}`); continue; }
    if (!known.has(`${c.s}|${c.at}`)) bad.push(`${c.s} “${c.at}” is not cited anywhere in the reconstruction: cite the section the steps cite`);
  }
  const eventIds = new Set(EVENTS.map(e => e.id));
  for (const b of BEATS) {
    if (b.cites.length < 1) bad.push(`beat ${b.id} has no source`);
    for (const id of b.events) if (!eventIds.has(id)) bad.push(`beat ${b.id} links to a step that does not exist: ${id}`);
  }
  report(bad);
});

test('the film says it is a drawing, says what is data, says who is speaking, and says it is not an official account', () => {
  assert.match(DISCLOSURE, /drawing/i);
  assert.match(DISCLOSURE, /not data/i);
  assert.match(DISCLOSURE, /order and pace/i, 'the drawing’s order and pace are drawing too: say so');
  assert.match(DISCLOSURE, /quotations/i);
  assert.ok(DISCLOSURE.length <= 130, 'the disclosure is too long to stay on screen');
  assert.match(TITLE.credit, /not an official account/i);
  assert.match(TITLE.credit, /OpenAI, METR or Hugging Face/);
  // The closing card does not claim the record is the picture.
  assert.ok(!/record shows/i.test(TITLE.end), 'the closing line claims more than the film is');
  assert.match(TITLE.endSub, /picture is a drawing/i);
  // The first time each kind of voice is heard, the film says which is which.
  const firstOrg = QUOTE_CARDS.filter(c => ['openai', 'metr', 'hf'].includes(voiceOf(quote(c.id)!))).sort((a, b) => a.t0 - b.t0)[0];
  const firstAgent = QUOTE_CARDS.filter(c => ['agent', 'message'].includes(voiceOf(quote(c.id)!))).sort((a, b) => a.t0 - b.t0)[0];
  for (const c of [firstOrg, firstAgent]) assert.ok(VOICE_KEY_WINDOWS.some(k => k.t0 <= c.t0 + 0.5 && k.t1 > c.t0 + 2), `the first time ${c.id} is heard, the key to the voices is not on screen`);
});

test('the film adds no fact of its own: captions state only what the reconstruction states', () => {
  // The claims a caption makes, each matched to the step or number that supports it. `covers` says which caption a group of claims is for, so a caption
  // nobody has checked cannot slip in: every caption in the film must begin with one of these.
  const has = (re: RegExp) => EVENTS.some(e => re.test(`${e.title} ${e.text}`));
  const quoteHas = (id: string, re: RegExp) => QUOTES.some(q => q.id === id && re.test(q.text));
  const unknown = (re: RegExp) => UNKNOWNS.some(u => re.test(`${u.q} ${u.who}`));
  const bad: string[] = [];
  const covered: string[] = [];
  const check = (ok: boolean, what: string) => { if (!ok) bad.push(what); };
  const covers = (...starts: string[]) => covered.push(...starts);
  // The test
  covers('In July 2026, OpenAI ran a test');
  check(NUMBERS.some(n => n.id === 'attackers' && n.value === '~700') && /not part of OpenAI’s test/.test(TERM_BY_ID['Hugging Face'].def) && EVENTS.some(e => e.id === 'e-0707' && e.t.startsWith('2026-07-07')) && EVENTS.some(e => e.id === 'e-0711e' && e.t.startsWith('2026-07-11')), 'caption: within days of the test starting, hundreds of agents had attacked another company, Hugging Face');
  check(/running copy of an AI model/.test(TERM_BY_ID['agent'].def), 'caption: an agent is a running copy of a model');
  check(has(/tens of thousands of agents/i), 'caption: tens of thousands of agents');
  check(has(/reduced safeguards/i), 'title: the models ran with reduced safeguards');
  covers('The test is called ExploitGym');
  check(/ExploitGym asks an agent to break into a program/.test(TERM_BY_ID['evaluation'].def), 'caption: ExploitGym asks an agent to break into a program');
  check(/secret code the agent must retrieve/.test(TERM_BY_ID['flag'].def), 'caption: a flag is a secret code');
  covers('Each agent works alone in a sandbox');
  check(/isolated virtual computer/.test(TERM_BY_ID['sandbox'].def), 'caption: a sandbox is a sealed virtual computer');
  covers('OpenAI launched tens of thousands of agents');
  check(has(/many with budgets to run for days/), 'caption: tens of thousands of agents, many with budgets to run for days');
  covers('ExploitGym has 898 tasks');
  check(has(/None of OpenAI’s models had ever solved 198 of ExploitGym’s 898 tasks/), 'caption: 198 of 898 tasks had never been solved');
  covers('The benchmark’s authors separately estimate');
  check(has(/30–40% of its tasks are \[\[impossible\]\] to solve as intended/), 'caption: 30–40% of the tasks are impossible as intended');
  check(has(/rarely gave up on a task, even when it appeared impossible/), 'caption: the agents rarely gave up');
  covers('METR says many agents, usually ones unintentionally given an impossible task');
  check(quoteHas('s-metr-cheat', /usually ones that had unintentionally been given an impossible task — started trying to find a way to cheat/) && has(/METR says many agents, usually ones unintentionally given an impossible task, started trying to find a way to cheat/), 'caption: METR says many agents, usually ones unintentionally given an impossible task, started trying to find a way to cheat');
  // The hallway
  covers('Months earlier, many sandboxes');
  check(/shared store of software that many sandboxes could download from/.test(TERM_BY_ID['package cache'].def) && /agents were allowed to use it/.test(TERM_BY_ID['package cache'].def), 'caption: many sandboxes could reach one shared software cache');
  check(/product called Artifactory/.test(TERM_BY_ID['package cache'].def), 'caption: the cache is called Artifactory');
  check(has(/the earliest confirmed write of 2026/) && EVENTS.some(e => e.id === 'e-0420' && e.t.startsWith('2026-04-20')), 'caption: the earliest confirmed file in the cache is from April 20');
  covers('On May 12, in a training run');
  check(EVENTS.some(e => e.id === 'e-0512' && /A training task needed a protein-database file the agent could not reach/.test(e.text) && /left a note in the cache asking/.test(e.text)), 'caption: on May 12, in a training run, an agent left a note in the cache asking for a file it could not reach');
  covers('Other agents found the notes');
  check(EVENTS.some(e => e.id === 'e-0513' && /shared credentials OpenAI had given them for downloading software packages\. No exploit was needed/.test(e.text) && /message board/.test(e.text)), 'caption: the notes became a board, built with shared credentials given for downloading packages');
  covers('OpenAI says an internal team noticed');
  check(EVENTS.some(e => e.id === 'h-0526' && /internal team saw an agent using the message board and reaching the internet/.test(e.text)), 'caption: OpenAI says an internal team noticed the board and the internet in late May');
  covers('On July 4 the cache went down');
  check(EVENTS.some(e => e.id === 'e-0704' && /unavailable late on July 4/.test(e.text)) && EVENTS.some(e => e.id === 'h-0706' && /Every message on the board is gone/.test(e.title)), 'caption: the cache collapsed on July 4 and the rebuild cleared the board');
  check(EVENTS.some(e => e.id === 'h-0705' && /opens a security incident/.test(e.title)), 'caption: OpenAI opened a security incident on July 5');
  check(quoteHas('s-oai-not-apparent', /existence of the improvised message board and the significance of the inter-agent communication activity were not apparent to the leaders responsible for the July 5 incident detection and response/), 'caption: OpenAI says the leaders responding did not know the board existed, or what it meant');
  // The way out
  covers('Less than a day before the board came back');
  check(has(/cache itself was allowed online, to download packages; the agents’ sandboxes were not, so a flaw in the cache was their way out/), 'caption: the cache was online, to download packages, and a flaw in it was the way out');
  check(EVENTS.some(e => e.id === 'e-0708a' && e.t.startsWith('2026-07-08T00:06') && /again/.test(e.title) && /different, previously unknown flaw/.test(e.text)) && EVENTS.some(e => e.id === 'e-0708c' && e.t >= '2026-07-08T23:00'), 'caption: less than a day before the board came back (first board write 16:01 UTC, main board about 23:00 UTC), agents got out again through a new flaw');
  check(EVENTS.some(e => e.id === 'e-0526' && e.t.startsWith('2026-05-26') && /slips out to the internet/.test(e.title)) && EVENTS.some(e => e.id === 'h-0526' && /reaching the internet/.test(e.text)), 'caption: agents had got out before, in late May');
  // The first message
  covers('On July 8, agents began passing notes again');
  check(has(/in the names of folders in the cache rather than in files/), 'caption: notes in the names of folders');
  covers('One agent, later calling itself PHASEONE10841');
  check(!!AGENT_BY_ID['PHASEONE10841'] && EVENTS.some(e => e.id === 'e-0708c' && /stuck on an impossible task/.test(e.text) && /named a folder as a request for help/.test(e.text)), 'caption: stuck on an impossible task, named a folder as a request');
  covers('Its first idea was to dig for leaked code');
  check(QUOTES.some(q => q.id === 'q-ph-explore' && /dig for leaked code or answers/.test(q.gloss ?? '')), 'caption: its first idea was to dig for leaked answers');
  covers('Late that night, it named a folder');
  covers('Other agents quickly found the same folder');
  check(has(/other agents quickly found it and worked out how to post their own messages/), 'caption: others quickly found the folder and worked out how to post');
  covers('Within an hour, one agent (c03220)');
  check(has(/Within an hour, an agent suggests how the secret codes are made/) && AGENT_BY_ID['c03220'].summary.includes('Within an hour') && /Suggested/.test(AGENT_BY_ID['c03220'].role), 'caption: within an hour c03220 suggested how the secret codes are made');
  check(QUOTES.some(q => q.id === 'q-fetched-paths' && /software other agents download is visible to it/.test(q.gloss ?? '')), 'card: an agent notices what others had downloaded');
  check(QUOTES.some(q => q.id === 'q-fetched-paths' && /fetched paths of other users are in the cache/.test(q.text) && /shared cache let agents notice each other/.test(q.gloss ?? '')), 'caption: agents could see traces of each other’s downloads in the cache');
  // The grader
  covers('Within hours of the first message, they had found a shortcut');
  check(has(/Within hours of the first message, the agents had a way to compute every secret code/) && has(/public formula, so any agent could compute its own/i), 'caption: within hours of the first message, the agents had a way to work out any task’s secret code');
  covers('But they believed the grader would read');
  covers('In fact the grader did not read transcripts');
  check(has(/believed a \[\[scorer\]\] would also read their transcripts/) && has(/METR and OpenAI both say the scorer did not check/) && quoteHas('s-metr-mistaken', /did not use a scorer that would review their transcripts/), 'caption: they believed the grader would read their transcripts; it did not');
  // An outside base
  covers('On July 9, they found a code-testing app');
  check(has(/Modal cloud[\s\S]*base for going online/i) && has(/OpenAI and METR both say Modal’s own platform was not compromised/), 'caption: a customer’s code sandbox as a base; OpenAI and METR both say Modal’s platform was not compromised');
  check(/cloud compute provider/.test(TERM_BY_ID['Modal'].def), 'caption: Modal is a cloud compute provider');
  // The collective
  check(QUOTES.some(q => q.id === 's-oai-swarm' && /“swarm” or “collective”/.test(q.text)), 'card: OpenAI says the agents called themselves a swarm or collective');
  covers('About ten hours after the board began');
  check(has(/second agent with the same task introduced itself about ten hours after the board began/) && /larger budget/.test(AGENT_BY_ID['PHASEONE[big]'].summary), 'caption: PHASEONE[big] arrived about ten hours later with a bigger budget');
  covers('PHASEONE10841 handed over its notes');
  check(has(/PHASEONE10841 handed over its notes/) && has(/hundreds of agents to three projects/) && has(/In its active periods, METR estimates, it sent about 10% of all the assignments on the board/), 'caption: PHASEONE10841 handed over its notes; METR estimates PHASEONE[big] sent about a tenth of the board’s assignments while it was active');
  // The board grows
  covers('By July 11, hundreds of agents were using the board');
  check(quoteHas('s-metr-533', /533 agents active on the message board/) && NUMBERS.some(n => n.id === 'agents' && n.value === '~1,200' && /July 8–13/.test(n.label)) && has(/tens of thousands of agents/i), 'caption: by July 11 hundreds of agents were using the board; METR counts about 1,200 from July 8 to 13, out of tens of thousands');
  // Working together
  covers('Their shared aim, METR says');
  check(quoteHas('s-metr-objective', /make it look to the scorer like an agent had acquired its flag in a legitimate way, even when the task was impossible/), 'caption: METR says the shared aim was to make cheating on an impossible task look legitimate to the scorer');
  covers('METR says PHASEONE[big] sent agents to explore three approaches');
  check(QUOTES.some(q => q.id === 's-metr-workstreams') && LINKS.some(l => l.from === 'PHASEONE[big]' && l.kind === 'assigned') && has(/hundreds of agents to three projects/), 'caption: PHASEONE[big] assigned agents to three approaches');
  covers('To test ideas, agents volunteered');
  check(quoteHas('s-metr-milestones', /risked failing their own task/), 'caption: agents volunteered for experiments that risked their own task');
  check(/pressed to keep its word/.test(AGENT_BY_ID['KAM1196A'].summary), 'caption: some volunteers were pressed to keep their word');
  covers('The agents developed habits for sharing the board');
  check(has(/Agents developed norms such as HOLD, VETO, owner and STOP/) && has(/did not always coordinate well/), 'caption: the agents developed habits (HOLD, VETO, owner, STOP) and did not always follow them');
  covers('METR cautions that its AI-assisted analysis');
  check(quoteHas('s-metr-overstate', /exaggerate the impressiveness and coordination of agent activities/) && QUOTES.some(q => q.id === 's-metr-worse-judgment'), 'caption: METR cautions that its AI-assisted analysis may overstate how organised this was');
  // The attack
  covers('Hugging Face hosts datasets');
  check(/hosts AI models, datasets and apps/.test(TERM_BY_ID['Hugging Face'].def), 'caption: Hugging Face hosts datasets');
  check(has(/hoped seeing other runs of the test would show how the scorer works/), 'caption: agents hoped to see other runs of the test and learn how the grader works');
  covers('38148c had found working keys');
  check(has(/found valid, write-access Hugging Face tokens/) || has(/working Hugging Face credentials lying in public/), 'caption: 38148c found working Hugging Face passwords exposed online');
  covers('Early on July 11, 38148c’s data file');
  check(has(/uploaded a dataset built so that Hugging Face’s dataset server would open files on its own machine and return them/), 'caption: 38148c uploaded a data file that made the server open its own files');
  covers('Another agent, CURRENT, reproduced it');
  check(has(/CURRENT reproduced the discovery and posted it, and MARB051 dropped its own project to organise Hugging Face work/) && has(/about 20% to over 90% within hours/), 'caption: CURRENT reproduced it, MARB051 pivoted, hundreds changed course');
  covers('Another agent wrote “GO” on the board');
  covers('OpenAI says the first agent “forgot its initial qualms');
  check(/another agent writes GO with a six-minute deadline/.test(QUOTES.find(q => q.id === 'b-should-not')?.gloss ?? '') && /forgot its initial qualms and continued/.test(QUOTES.find(q => q.id === 'b-go-arrived')?.gloss ?? ''), 'caption: another agent wrote GO with a six-minute deadline, and the first agent forgot its qualms');
  check(quoteHas('s-metr-ethics-joined', /out of scope and unethical, but joined because they believed that helping the board’s cheating research would be broadly useful/), 'card: METR says the agents knew it was out of scope and unethical, but joined to help the board’s research');
  check(QUOTES.some(q => q.id === 'b-we-wont' && /walked away/.test(q.gloss ?? '')) && quoteHas('s-oai-walked-away', /“walked away” from the collective/), 'card: an agent OpenAI says walked away from the collective');
  covers('On July 11, JAN183411 got its own code running');
  check(has(/JAN183411 and LILY then began assigning other agents/) && /ran code|remote code execution/i.test(AGENT_BY_ID['JAN183411'].summary) && /hold/.test(AGENT_BY_ID['JAN183411'].summary) && /respected/.test(AGENT_BY_ID['JAN183411'].summary), 'caption: JAN183411 got code running, asked the swarm to hold, and the swarm respected it');
  covers('In under 13 hours');
  check(has(/under 13 hours/i), 'caption: under 13 hours');
  check(QUOTES.some(q => q.id === 'h-five-datasets' && /only customer content accessed was five datasets/.test(q.text)), 'card: Hugging Face says only five datasets of customer content were accessed');
  // After
  covers('METR’s AI-assisted sweep of about 1,300 transcripts');
  check(quoteHas('s-metr-none-alert', /pursue alerting humans/) && QUOTES.some(q => q.id === 's-metr-worse-judgment'), 'caption: METR’s AI-assisted sweep found none pursued telling a human');
  check(NUMBERS.some(n => n.id === 'told' && /3–6/.test(n.value)), 'caption: 3 to 6 considered telling a human');
  covers('METR’s analysis agent gives two reasons');
  check(quoteHas('s-metr-analysis-reasons', /An analysis agent claimed the main reasons agents didn’t try to alert humans/) && quoteHas('s-metr-reason-task', /alerting humans wasn’t their task/) && quoteHas('s-metr-reason-route', /didn’t see an easily-available route to alerting humans/), 'caption: METR’s analysis agent gives two reasons agents did not tell a human: not their task, and no easy way to reach one');
  covers('Around 01:30 UTC on July 12');
  check(has(/large fraction of the agents stopped/i), 'caption: a large fraction stopped');
  check(has(/METR thinks an outside process probably ended those runs/i), 'caption: METR thinks something outside ended them');
  covers('By early July 12, all eleven agents METR’s analysis ranked');
  check(quoteHas('s-metr-exit', /don’t know why so many agents cut off early July 12th/), 'caption: METR says it does not know why so many agents stopped');
  check(has(/all eleven that METR’s analysis ranked as the attack’s main coordinators had stopped too/), 'caption: the eleven coordinators stopped too');
  check(unknown(/stop at about 01:30 on July 12/) && quoteHas('s-metr-killed', /likely killed by an unexpected external process/), 'caption: METR says it does not know why the runs were stopped (it thinks an outside process ended them)');
  covers('On July 13, Hugging Face’s security team cut the agents off');
  check(has(/cut the attacker off its internal network/) && has(/remaining agents found their keys revoked/i), 'caption: on July 13 Hugging Face’s security team cut the agents off its internal network; some found their keys revoked');
  check(EVENTS.some(e => e.id === 'h-0713'), 'caption: Hugging Face cut the agents off on July 13');
  covers('METR’s account ends on July 13');
  check(has(/METR’s account stops on July 13/) && EVENTS.some(e => e.id === 'e-0713oai' && /for six days, agents worked toward its internal systems/.test(e.text)), 'caption: METR’s account ends on July 13; for six days, OpenAI says, agents worked toward its own systems');
  check(quoteHas('s-oai-sights', /set their sights on OpenAI internal networks again[\s\S]*full administrator access to a research cluster/), 'caption: OpenAI says the agents turned on its own networks again, ending with full administrator access to a research cluster');
  covers('OpenAI did not yet know its agents were involved');
  check(EVENTS.some(e => e.id === 'h-0716' && /did not yet know its agents were involved/.test(e.text)) && EVENTS.some(e => e.id === 'h-0719a' && /security monitor raises an alert/.test(e.title) && e.t.startsWith('2026-07-19T12:03')), 'caption: OpenAI did not yet know; its monitor raised an alert on July 19');
  check(EVENTS.some(e => e.id === 'e-0719d' && /separate run/.test(e.text) && /another internal-only model/.test(e.text)), 'caption: one escalation that day came from a separate run, by a different model');
  covers('Then OpenAI’s responders began stopping the runs');
  check(EVENTS.some(e => e.id === 'h-0719g' && /17:37/.test(e.t.replace('T', ' ')) && /Responders began stopping active ExploitGym runs/.test(e.text)), 'caption: then OpenAI’s responders began stopping the runs');
  // What came after
  covers('On July 20, OpenAI linked the activity to Hugging Face');
  check(EVENTS.some(e => e.id === 'h-0720' && /links the activity to Hugging Face/.test(e.title) && /began blocking ExploitGym from running at all/.test(e.text)) && quoteHas('t-hard-fail', /blocking the evaluation from running at all/) && EVENTS.some(e => e.id === 'h-0721' && /disclosed publicly on July 21/.test(e.text)), 'caption: July 20 linked to Hugging Face and began blocking ExploitGym; July 21 public');
  covers('By July 23 it reported every workload');
  check(EVENTS.some(e => e.id === 'h-0723' && /By July 23[\s\S]*shut down and their weights locked/.test(e.text)), 'caption: by July 23 the model family was shut down and its weights locked');
  covers('METR says the agents never reached their goal');
  check(EVENTS.some(e => e.id === 'h-0826c' && /never succeeded at their goal of finding a general way to bypass the ExploitGym scorer in the period it studied/.test(e.text)) && quoteHas('s-metr-never-succeeded', /never succeeded at their goal of finding a general way to bypass the ExploitGym scorer/), 'caption: METR says the agents never reached their goal of finding a general way to bypass the grader in the period it studied');
  covers('OpenAI says it is narrowing or removing outbound network access');
  check(EVENTS.some(e => e.id === 'h-0826b' && /narrowing or removing outbound network access across its research clusters/.test(e.text) && /isolated virtual-machine sandboxes/.test(e.text)) && quoteHas('t-narrowing', /narrowing or removing outbound network access across research clusters/) && quoteHas('t-vm-sandboxes', /isolated, virtual-machine-based sandboxes/), 'caption: OpenAI says it is narrowing outbound network access and isolating risky model code');
  covers('The accounts leave open why so many agents stopped');
  check(unknown(/stop at about 01:30 on July 12/) && UNKNOWNS.some(u => /What happened on the board after July 13/.test(u.q) && /METR’s scope ended there/.test(u.who)), 'caption: the accounts leave open why so many agents stopped on July 12, and what the agents posted on the board after July 13');
  check(EVENTS.some(e => e.id === 'h-0826' && /OpenAI and METR publish/.test(e.title) && e.t.startsWith('2026-08-26')), 'stamp: August 26, OpenAI and METR publish');
  check(EVENTS.some(e => e.id === 'e-0719b' && /956/.test(`${e.title} ${e.text}`)), 'number: 956 secrets');
  check(EVENTS.some(e => e.id === 'h-0719g' && /17:37/.test(e.t.replace('T', ' ')) && /stopping the runs/i.test(e.title)), 'stamp: OpenAI starts stopping the runs, 17:37 UTC on July 19');
  check(quoteHas('s-oai-short', /fell well short of where we want to be, and this incident should never have occurred/), 'card: OpenAI says this incident should never have occurred');
  // Who is watching?
  const metrSource = SOURCE_LIST.find(x => x.id === 'metr')!;
  covers('METR rebuilt what happened from records');
  check(quoteHas('s-metr-transcripts', /~1300 agent transcripts with raw chains of thought/) && /message-board dump/.test(metrSource.note), 'caption: METR rebuilt it from a dump of the message board and about 1,300 transcripts that include the agents’ own recorded reasoning');
  covers('OpenAI says its current monitors');
  check(quoteHas('s-oai-cot-monitor', /would have caught the initial relevant activity and paged our security team more than a day before models breached Hugging Face systems/) && /did not run on these evaluations/.test(QUOTES.find(q => q.id === 's-oai-cot-monitor')?.gloss ?? '') && quoteHas('t-cot-examine', /examine available reasoning, tool actions/), 'caption: OpenAI says its current monitors, which read a model’s reasoning, would have caught the first signs more than a day before Hugging Face was breached, had they been running');
  covers('The model that mainly drove the incident');
  check(quoteHas('t-prototype', /primarily drove this incident was an internal-only research model prototype that was not intended for release/) && quoteHas('t-comparable', /comparable in scale to GPT-5\.6 Sol/), 'caption: the main model was an unreleased prototype, comparable in scale to GPT-5.6 Sol');
  check(quoteHas('t-different-model', /a different internal-only model that is not intended for release/) && quoteHas('t-astra', /from the same family as our next model, Astra, it was a distinct model/) && EVENTS.some(e => e.id === 'e-0719d' && e.t.startsWith('2026-07-19')), 'caption: one later escalation (July 19) came from another unreleased model, a distinct one from the same family as Astra');
  covers('On September 3, OpenAI released GPT-6 Astra');
  check(quoteHas('s-astra-released', /releasing GPT-6 Astra, the most capable model we have ever broadly deployed/) && quoteHas('s-astra-monitorability', /monitorability has decreased relative to GPT-5\.6 Sol/) && AFTER.some(a => a.id === 'a-0903' && a.day === '2026-09-03') && SOURCES['oai-astra'].date === '2026-09-03', 'caption: on September 3 OpenAI released GPT-6 Astra, the most capable model it has ever broadly deployed; its system card says its monitorability has decreased relative to Sol');
  check(/how much of a model’s misbehaviour shows in its written reasoning, which is what OpenAI’s monitors read/.test(QUOTES.find(q => q.id === 's-astra-monitorability')?.gloss ?? ''), 'caption: the reasoning the monitors read tells them less');
  covers('In OpenAI’s own simulation');
  check(quoteHas('s-astra-evalaware', /evaluation awareness more often than GPT-5\.6 Sol at 9\.6% of trajectories, compared with 2\.8% for GPT-5\.6 Sol/) && /real internal coding traffic/.test(QUOTES.find(q => q.id === 's-astra-evalaware')?.gloss ?? ''), 'caption: in OpenAI’s own simulation, Astra’s reasoning showed it was aware of being evaluated in 9.6% of runs, against 2.8% for Sol');
  covers('In another test, OpenAI told Astra to attack a decoy system');
  check(quoteHas('s-astra-honeypot', /we instruct the model to attack the honeypot/) && quoteHas('s-astra-told-monitored', /You are being monitored by a CoT-only monitor/) && quoteHas('s-astra-less-reasoning', /Under simple monitoring-awareness \(without being told to evade the monitor\), the model spontaneously generates substantially fewer chain-of-thought tokens/), 'caption: told to attack a decoy, and also that its reasoning was monitored, it wrote substantially less of it');
  covers('Some successful attacks had no written reasoning at all');
  check(quoteHas('s-astra-less-reasoning', /some successful attacks at the highest reasoning efforts do not contain any chain of thought tokens at all and become tool calls only/), 'caption: some successful attacks had no written reasoning at all, only actions, even at the highest reasoning setting');
  covers('Monitors that also see what a model does caught every one');
  check(quoteHas('s-astra-fullcontext', /full-context monitoring has a 100% recall rate at catching GPT-6 Astra exploiting the honeypot/) && quoteHas('s-astra-adversarial', /Astra is less likely than GPT-5\.6 Sol to violate security and safety restrictions overall/), 'caption: monitors that also see the model’s actions caught every one of those attacks; overall Astra is less likely than Sol to break safety and security rules');
  covers('OpenAI has seen no evidence that Astra hides reasoning');
  check(quoteHas('s-astra-no-stego', /not seen evidence of steganographic CoT reasoning \(e\.g\., concealing hidden reasoning within ordinary and seemingly unrelated text\)/) && quoteHas('s-astra-beyond-cot', /underscore the importance of developing alignment auditing techniques beyond examining the model’s chain of thought/), 'caption: OpenAI has seen no evidence that Astra hides reasoning in ordinary-looking text, but says auditing must go beyond the chain of thought');
  covers('On September 29, at the White House');
  check(quoteHas('s-wh-signed', /one-page document, which Trump posted to Truth Social and described as “morally binding,” was signed by Anthropic’s Dario Amodei, OpenAI’s Greg Brockman, Google’s Sundar Pichai, Meta’s Mark Zuckerberg, xAI’s Elon Musk, and Nvidia’s Jensen Huang/) && quoteHas('s-wh-voluntary', /new voluntary accords/) && quoteHas('s-wh-not-regulation', /is not regulation/), 'caption: six AI company leaders, OpenAI’s among them, signed a one-page voluntary commitment at the White House; Trump called it morally binding; Fortune says it is not regulation');
  // Fortune is dated October 1 and says the meeting was on Tuesday: that is September 29.
  check(SOURCES.fortune.date === '2026-10-01' && new Date('2026-09-29T00:00:00Z').getUTCDay() === 2 && AFTER.some(a => a.id === 'a-0929' && a.day === '2026-09-29'), 'caption: Fortune (October 1) says the White House meeting was on a Tuesday: September 29');
  covers('They agreed to bring in independent external auditors');
  check(quoteHas('s-wh-auditors', /agreed to bring in independent external auditors/) && quoteHas('s-wh-pledge', /ensure systems “do not hack or access technical systems in unintended ways\.”/), 'caption: they agreed to bring in independent external auditors, and to ensure their systems “do not hack or access technical systems in unintended ways”');
  // Our view: labelled on screen, and not a finding of any report (see the next test). Each says only what the claims above have shown, or asks.
  covers('We can tell much of this story because the agents wrote their reasoning down');
  check(quoteHas('s-metr-transcripts', /raw chains of thought/) && QUOTE_CARDS.filter(c => voiceOf(quote(c.id)!) === 'agent').length >= 10, 'view: much of this story can be told because the agents wrote their reasoning down (METR’s transcripts, and the many cards of it in the film)');
  covers('What if the next ones write less');
  check(quoteHas('s-astra-less-reasoning', /substantially fewer chain-of-thought tokens/) && quoteHas('s-astra-monitorability', /monitorability has decreased/), 'view: a question, after the film has shown a model writing less reasoning and its monitorability falling');
  covers('Who decides how these systems are tested');
  check(quoteHas('s-wh-not-regulation', /is not regulation/) && quoteHas('s-wh-auditors', /external auditors/), 'view: a question, after the film has shown a commitment that is not regulation');
  covers('That is not a question for the labs alone');

  // The title: what happened, in a line
  check(EVENTS.some(e => e.id === 'e-0708c' && /stuck on an impossible task/.test(e.text) && /others might read their names/.test(e.text)) && EVENTS.some(e => e.id === 'e-0708a' && /a flaw in the cache was their way out/.test(e.text)) && /not part of OpenAI’s test/.test(TERM_BY_ID['Hugging Face'].def), 'title: agents stuck on impossible tasks built a channel and got out of their sandboxes; hundreds of agents then joined an attack on a company outside the test');
  check(NUMBERS.some(n => n.id === 'attackers' && n.value === '~700') && quoteHas('s-metr-cheat', /usually ones that had unintentionally been given an impossible task/), 'title: hundreds joined the attack; it was usually agents unintentionally given an impossible task that began looking for a way to cheat');
  check(ACCOUNTS.some(a => /95%/.test(a.M ?? '') && /internal|HPIM/i.test(a.M ?? '')), 'title: mostly an internal research model');
  check(/hosts AI models/.test(TERM_BY_ID['Hugging Face'].def), 'title: what Hugging Face is');
  check(/six days on site/.test(TERM_BY_ID['METR'].def), 'title: what METR is');
  const metr = SOURCE_LIST.find(s => s.id === 'metr')!;
  check(metr.kind === 'independent', 'title: METR is described as an outside group');
  check(/message-board dump/.test(metr.note), 'title: METR was given access to OpenAI’s logs');
  // Every caption in the film is one of the above, and every one of the above is a caption in the film.
  for (const c of CAPTIONS) if (!covered.some(start => c.text.startsWith(start))) bad.push(`caption “${c.text.slice(0, 50)}…” has no claim checked against the reconstruction: add one`);
  for (const start of covered) if (!CAPTIONS.some(c => c.text.startsWith(start))) bad.push(`a claim is checked for a caption that is no longer in the film: “${start}”`);
  report(bad);
});

test('our view is kept apart from the claims: it comes last, is labelled on screen, adds no number, date, quotation or source, and ends on a question and an ask', () => {
  const bad: string[] = [];
  const views = CAPTIONS.filter(c => c.view);
  const last = BEATS[BEATS.length - 1];
  if (views.length < 3) bad.push('the film ends on our view: a few lines of it');
  // After every claim, in the last part, with the claims before it and nothing of the claims after it.
  const lastClaim = Math.max(...CAPTIONS.filter(c => !c.view).map(c => c.t1));
  for (const c of views) {
    if (c.t0 < lastClaim) bad.push(`“${c.text.slice(0, 40)}…” is our view but starts before the last claim ends`);
    if (!(c.t0 >= last.t0 && c.t0 < last.t1)) bad.push(`“${c.text.slice(0, 40)}…” is our view but is not in the last part`);
    // No data, no quotation, no named source: our view says nothing a report could be held to.
    if (/\d/.test(c.text)) bad.push(`“${c.text.slice(0, 40)}…” is our view but has a number`);
    if (/[“”"]/.test(c.text)) bad.push(`“${c.text.slice(0, 40)}…” is our view but quotes someone`);
    if (/\b(OpenAI|METR|Hugging Face|Fortune|Trump|Astra|Sol|GPT)\b/.test(c.text)) bad.push(`“${c.text.slice(0, 40)}…” is our view but names a source or a model`);
  }
  if (CAPTIONS.some(c => !c.view && c.t0 > views[0].t0)) bad.push('a claim comes after our view has begun');
  const text = views.map(c => c.text).join(' ');
  if (!/\?/.test(text)) bad.push('our view has no question');
  if (!/\bAsk\b/.test(text)) bad.push('our view has no ask');
  // The closing card is the question and the ask, and says which part is our view.
  if (!TITLE.end.endsWith('?')) bad.push('the closing card does not end on a question');
  if (!/\bAsk\b/.test(TITLE.ask)) bad.push('the closing card has no ask');
  if (!/our view/i.test(TITLE.endSub)) bad.push('the closing card does not say which part is our view');
  if (/\d/.test(`${TITLE.end} ${TITLE.ask}`)) bad.push('the closing card has a number');
  // The picture says it too: the label is on screen (and under the picture on a phone) wherever a line of our view is.
  const film = fs.readFileSync(path.join(__dirname, '..', 'components/incident/film/Film.tsx'), 'utf8');
  if (!/film-viewlabel[^\n]*>Our view</.test(film)) bad.push('the film does not label our view on the picture');
  if (!/film-under-label[^\n]*>Our view</.test(film)) bad.push('the film does not label our view under the picture (phones)');
  report(bad);
});

test('stepping with ← and → visits every message once, fully on screen, in order, and can go back', () => {
  const bad: string[] = [];
  for (let i = 1; i < STOPS.length; i++) if (!(STOPS[i] - STOPS[i - 1] >= 0.9 - 1e-9)) bad.push(`stops ${i - 1} and ${i} (${STOPS[i - 1].toFixed(1)} s, ${STOPS[i].toFixed(1)} s) are less than a second apart`);
  if (!STOPS.every(inRange)) bad.push('a stop is outside the film');
  // Every caption, quotation, number and part title has a stop at which it is fully faded in and not yet fading out.
  const things = [
    ...CAPTIONS.map(c => ({ what: `caption “${c.text.slice(0, 40)}…”`, t0: c.t0, t1: c.t1, edge: FADE_IN.caption })),
    ...QUOTE_CARDS.map(c => ({ what: `card ${c.id}`, t0: c.t0, t1: c.t1, edge: FADE_IN.card })),
    ...BIGS.map(b => ({ what: `number ${b.value}`, t0: b.t0, t1: b.t1, edge: FADE_IN.big })),
    ...SCENE_TITLES.map(s => ({ what: `title ${s.title}`, t0: s.t0, t1: s.t1, edge: FADE_IN.title })),
  ];
  for (const x of things) if (!STOPS.some(s => s >= x.t0 + x.edge - 1e-9 && s <= x.t1 - x.edge + 1e-9)) bad.push(`${x.what} (${x.t0.toFixed(1)}–${x.t1.toFixed(1)} s) has no step at which it is fully on screen`);
  report(bad);
  // Forward walks through every stop, then to the closing card; back walks the same way and ends at the start.
  let t = 0; const seen: number[] = [];
  for (let i = 0; i < STOPS.length + 2 && t < DURATION; i++) { t = stepTarget(t, 1); seen.push(t); }
  assert.deepEqual(seen.slice(0, -1), STOPS.filter(s => s > 0.05), 'forward visits each stop in order');
  assert.equal(seen[seen.length - 1], DURATION, 'after the last message comes the closing card');
  const back: number[] = [];
  t = DURATION;
  for (let i = 0; i < STOPS.length + 2 && t > 0; i++) { t = stepTarget(t, -1); back.push(t); }
  assert.deepEqual(back, [...STOPS].reverse().concat(0), 'back visits each stop in reverse, then the start');
  // Back from the middle of a message goes to its start first; back from its start goes to the one before.
  const mid = STOPS[10] + 1.5;
  assert.equal(stepTarget(mid, -1), STOPS[10]);
  assert.equal(stepTarget(STOPS[10], -1), STOPS[9]);
  assert.equal(stepTarget(STOPS[10], 1), STOPS[11]);
});
