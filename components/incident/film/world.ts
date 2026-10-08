import { at, lerp, shuffled, rng, type V3 } from './math';
import { HOT_MORNING, LIT } from '@/content/incidents/openai-hf/film';

/**
 * The film's world: a vast circular hall at night. Tens of thousands of identical rooms (the agents' sandboxes) stand in rings;
 * between the rings run the aisles, which stand for the one thing every room could reach, the shared package cache. In the middle
 * is a tower (the grader the agents believed was watching). A fence ring marks the wall between the hall and the rest of the world,
 * with one gate in it: the shared cache's own link to the internet, which it had for downloading packages and which the agents
 * used as their way out.
 *
 * It is a drawing, not a map. Where a room stands is not data. What is data is how many agents there were at each documented
 * moment, and every word shown as a quotation.
 */
export const G = {
  r0: 66,            // radius of the first aisle
  pitch: 4.6,        // distance between rows
  rows: 77,
  cellW: 3.0,        // across the aisle front
  cellD: 3.0,
  cellH: 3.4,
  doorW: 1.4,
  doorH: 2.2,
  slot: 3.4,         // spacing of rooms along a row
  aisleHalf: 3.0,
  fence: 432,
  yard: 58,
  towerR: 15,
  towerH: 84,
  lantern: 72,
};

export type Box = { c: V3; w: number; h: number; d: number; yaw: number };

export type World = {
  n: number;
  x: Float32Array; z: Float32Array; ang: Float32Array;
  ux: Float32Array; uz: Float32Array;
  /** +1: the door faces outward (larger radius); -1: inward. */
  face: Int8Array;
  /** 1 where a radial aisle runs: no room stands here. */
  blocked: Uint8Array;
  row: Uint8Array;
  rowStart: Uint32Array; rowCount: Uint16Array; rowR: Float32Array; rowIsAisle: Uint8Array;
  aisleR: number[];
  /** Rank in the order rooms join the board: rank 0 is the agent that wrote the first message. */
  joinRank: Uint32Array;
  /** For the rooms that ever light (the first `LIT` to join): the rank in the order they join the attack. */
  hotRank: Uint32Array;
  /** For the rooms that ever light: the rank in the order they stop. The eleven coordinators are early joiners of the attack and stop with the large fraction, not before or after it. */
  stopRank: Uint32Array;
  byJoinRank: Uint32Array;
  /** The eleven rooms METR's analysis ranked as the attack's main coordinators. */
  coordinators: number[];
  protagonist: number;
  theta0: number;
  /** The wall of door-signs across the aisle from the protagonist: the board. Cell indices, left to right. */
  boardCells: number[];
  boardCenter: V3;
  /** Rooms that are near the protagonist and join first, for the close shots. */
  firstReplies: number[];
  outside: { hf: Box[]; modal: Box[]; others: Box[]; oai: Box[] };
  /** The one gate in the fence: the shared cache's link to the internet. */
  gate: { theta: number; at: V3 };
  /** Rooms the film names (an agent's handle, as the sources write it). Where each stands is drawing, not data. */
  named: Record<string, number>;
  hfAt: V3; modalAt: V3; oaiAt: V3;
  /** Somewhere outside the fence where the people responsible for the test are: a building with one window. */
  people: { at: V3; box: Box };
};

let cache: World | null = null;

export function buildWorld(): World {
  if (cache) return cache;
  const rows = G.rows;
  const rowR = new Float32Array(rows);
  const rowIsAisle = new Uint8Array(rows);
  const rowCount = new Uint16Array(rows);
  const rowStart = new Uint32Array(rows + 1);
  const aisleR: number[] = [];
  let n = 0;
  for (let k = 0; k < rows; k++) {
    rowR[k] = G.r0 + G.pitch * k;
    if (k % 3 === 0) { rowIsAisle[k] = 1; aisleR.push(rowR[k]); continue; }
    rowCount[k] = Math.floor((2 * Math.PI * rowR[k]) / G.slot);
    n += rowCount[k];
  }
  const x = new Float32Array(n), z = new Float32Array(n), ang = new Float32Array(n);
  const ux = new Float32Array(n), uz = new Float32Array(n);
  const face = new Int8Array(n), rowOf = new Uint8Array(n), blocked = new Uint8Array(n);
  let m = 0;
  for (let k = 0; k < rows; k++) {
    rowStart[k] = m;
    if (rowIsAisle[k]) continue;
    const cnt = rowCount[k];
    for (let i = 0; i < cnt; i++) {
      const th = ((i + 0.5) / cnt) * Math.PI * 2;
      x[m] = rowR[k] * Math.cos(th); z[m] = rowR[k] * Math.sin(th); ang[m] = th;
      ux[m] = Math.cos(th); uz[m] = Math.sin(th);
      face[m] = k % 3 === 1 ? -1 : 1;
      rowOf[m] = k;
      // Eight radial aisles run out from the yard like spokes.
      const spoke = ((th / (Math.PI / 4)) % 1 + 1) % 1;
      const d = Math.min(spoke, 1 - spoke) * (Math.PI / 4) * rowR[k];
      if (d < G.slot * 1.35) blocked[m] = 1;
      m++;
    }
  }
  rowStart[rows] = m;

  // The first agent's room: a row that faces the aisle at radius ~80, so the rooms across the aisle can carry the board.
  const theta0 = 0.55;
  const protRow = 4; // 4 % 3 === 1: its doors face inward, to the aisle in row 3
  const nearest = (k: number, th: number) => {
    const cnt = rowCount[k];
    return rowStart[k] + (((Math.round((th / (Math.PI * 2)) * cnt - 0.5) % cnt) + cnt) % cnt);
  };
  const protagonist = nearest(protRow, theta0);
  const boardRow = 2; // 2 % 3 === 2: its doors face outward, to the same aisle
  const bc0 = nearest(boardRow, ang[protagonist]);
  const boardCells: number[] = [];
  // Index 3 is directly across the aisle from the first room; higher indices run down the aisle in the direction the camera looks.
  for (let k = 0; k < 14; k++) {
    const d = 3 - k;
    const cnt = rowCount[boardRow];
    const idx = rowStart[boardRow] + (((bc0 - rowStart[boardRow] + d) % cnt) + cnt) % cnt;
    boardCells.push(idx);
  }
  const boardCenter: V3 = [(x[boardCells[6]]) * (1 + 1.6 / rowR[boardRow]), 2.7, (z[boardCells[6]]) * (1 + 1.6 / rowR[boardRow])];

  // The order in which rooms join the board. The first few are rooms near the first agent, so the close shots have neighbours.
  const order = shuffled(n, 7);
  const near: number[] = [];
  for (const k of [4, 2, 5, 1]) {
    for (let d = -16; d <= 1; d++) {
      const cnt = rowCount[k];
      const idx = rowStart[k] + (((nearest(k, ang[protagonist]) - rowStart[k] + d) % cnt) + cnt) % cnt;
      if (idx !== protagonist && !boardCells.includes(idx)) near.push(idx);
    }
  }
  const pickNear = [near[3], near[19], near[9], near[26], near[14], near[33], near[7], near[22]].filter(v => v !== undefined);
  const used = new Set<number>([protagonist, ...pickNear]);
  const byJoinRank = new Uint32Array(n);
  byJoinRank[0] = protagonist;
  pickNear.forEach((c, i) => { byJoinRank[1 + i] = c; });
  let w = 1 + pickNear.length;
  for (let i = 0; i < n && w < n; i++) { const c = order[i]; if (!used.has(c) && !blocked[c]) byJoinRank[w++] = c; }
  // Blocked places never join: park them at the end of the order.
  for (let i = 0; i < n && w < n; i++) { const c = order[i]; if (!used.has(c) && blocked[c]) byJoinRank[w++] = c; }
  const joinRank = new Uint32Array(n);
  for (let r = 0; r < n; r++) joinRank[byJoinRank[r]] = r;

  // Rooms the film names. They stand where the shot that names them can see them: the first agent's own room, a neighbour for the
  // first replies, a second founder beside the first, and the four that find, repeat and push the attack, near the gate they all
  // reach out through. Each takes a place in the order of joining, so it is lit when the film says so.
  const gateTheta = -0.62 + 0.05;
  const roomAt = (r: number, th: number): number => {
    let k = -1, best = Infinity;
    for (let j = 0; j < rows; j++) if (!rowIsAisle[j] && Math.abs(rowR[j] - r) < best) { best = Math.abs(rowR[j] - r); k = j; }
    const cnt = rowCount[k];
    const base = Math.round(((((th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * cnt - 0.5);
    for (let off = 0; off < 6; off++) for (const sgn of [1, -1]) {
      const c = rowStart[k] + ((((base + sgn * off) % cnt) + cnt) % cnt);
      if (!blocked[c]) return c;
    }
    return rowStart[k] + base;
  };
  const place = (room: number, rank: number) => {
    const other = byJoinRank[rank];
    if (other === room) return;
    const old = joinRank[room];
    byJoinRank[rank] = room; byJoinRank[old] = other;
    joinRank[room] = rank; joinRank[other] = old;
  };
  const named: Record<string, number> = { PHASEONE10841: protagonist, c03220: byJoinRank[3] };
  named['PHASEONE[big]'] = near[10];
  named['38148c'] = roomAt(392, gateTheta - 0.018);
  named['CURRENT'] = roomAt(366, gateTheta + 0.075);
  named['MARB051'] = roomAt(380, gateTheta + 0.125);
  named['JAN183411'] = roomAt(352, gateTheta - 0.09);
  [['PHASEONE[big]', 76], ['38148c', 110], ['CURRENT', 111], ['MARB051', 112], ['JAN183411', 113]].forEach(([id, rank]) => place(named[id as string], rank as number));

  // Only the rooms that ever light take part in the attack and the stopping: the first `L` to join the board. Over 90% of them join the attack.
  const L = LIT[LIT.length - 1][1];
  const hotOrder = shuffled(L, 11);
  const hotRank = new Uint32Array(n).fill(0xffffffff);
  for (let r = 0; r < L; r++) hotRank[byJoinRank[r]] = hotOrder[r];
  // A few rooms turn red as the search for exposed accounts begins (METR counts the search as taking part); the agent that finds working keys is the next; the two that reproduce it and pivot, and the one that gets code
  // running, are the first to turn red when the attack spreads (just after the first hundred and fifty).
  const roomOfHot = new Uint32Array(L);
  for (let r = 0; r < L; r++) roomOfHot[hotOrder[r]] = byJoinRank[r];
  const setHot = (room: number, v: number) => {
    const other = roomOfHot[v], old = hotRank[room];
    hotRank[room] = v; hotRank[other] = old; roomOfHot[v] = room; roomOfHot[old] = other;
  };
  setHot(named['38148c'], 4); setHot(named['CURRENT'], HOT_MORNING); setHot(named['MARB051'], HOT_MORNING + 1); setHot(named['JAN183411'], HOT_MORNING + 2);
  // The eleven coordinators: rooms among the first to join the attack, so they are red well before anything stops. METR says JAN183411 was one
  // of them, so its room is one; the other ten are rooms the film does not name.
  const isNamed = new Set(Object.values(named));
  const early: number[] = [];
  for (let r = 0; r < L; r++) if (hotRank[byJoinRank[r]] < HOT_MORNING && !isNamed.has(byJoinRank[r])) early.push(byJoinRank[r]);
  const coordRooms = [named['JAN183411'], ...Array.from(shuffled(early.length, 17).slice(0, 10), k => early[k])];
  const isCoord = new Set(coordRooms);
  // They stop with the large fraction (METR: a large fraction stopped about 01:30 on July 12, "including the most important coordinating agents"):
  // somewhere inside the first 250 to stop, which is inside the first wave.
  const coordStopRanks = Array.from(shuffled(250, 19).slice(0, 11));
  const taken = new Set<number>(coordStopRanks);
  const free = Array.from(shuffled(L, 13)).filter(v => !taken.has(v));
  const stopRank = new Uint32Array(n).fill(0xffffffff);
  coordRooms.forEach((room, k) => { stopRank[room] = coordStopRanks[k]; });
  let q = 0;
  for (let r = 0; r < L; r++) { const room = byJoinRank[r]; if (!isCoord.has(room)) stopRank[room] = free[q++]; }

  // Outside the fence.
  const rand = rng(23);
  const boxes = (cx: number, cz: number, count: number, spread: number, hMin: number, hMax: number, wMin: number, wMax: number): Box[] => {
    const out: Box[] = [];
    for (let i = 0; i < count; i++) {
      const w = wMin + rand() * (wMax - wMin);
      out.push({ c: [cx + (rand() - 0.5) * spread, 0, cz + (rand() - 0.5) * spread], w, h: hMin + rand() * (hMax - hMin), d: wMin + rand() * (wMax - wMin), yaw: 0 });
    }
    return out;
  };
  const th = {
    hf: -0.62,
    oai: 2.35,
  };
  const hfAt = at(1500, th.hf, 0);
  const gateAt = at(G.fence, gateTheta, 0);
  // The customer's code sandbox: a stop on the way out, between the gate and Hugging Face, off to one side so the route bends round it.
  const toHf: V3 = [hfAt[0] - gateAt[0], 0, hfAt[2] - gateAt[2]];
  const len = Math.hypot(toHf[0], toHf[2]);
  const modalAt: V3 = [lerp(gateAt[0], hfAt[0], 0.4) - (toHf[2] / len) * 90, 0, lerp(gateAt[2], hfAt[2], 0.4) + (toHf[0] / len) * 90];
  const oaiAt = at(300, th.oai, 0);
  const outside = {
    hf: [
      ...boxes(hfAt[0], hfAt[2], 5, 200, 20, 60, 40, 90),
      { c: [hfAt[0] + 20, 0, hfAt[2]] as V3, w: 120, h: 14, d: 50, yaw: 0 },
    ],
    modal: boxes(modalAt[0], modalAt[2], 4, 90, 10, 26, 22, 40),
    others: [
      ...boxes(at(900, -2.1, 0)[0], at(900, -2.1, 0)[2], 3, 160, 8, 22, 18, 34),
      ...boxes(at(1100, 2.8, 0)[0], at(1100, 2.8, 0)[2], 4, 200, 8, 30, 18, 40),
      ...boxes(at(700, 4.2, 0)[0], at(700, 4.2, 0)[2], 3, 120, 8, 20, 16, 30),
    ],
    oai: boxes(oaiAt[0], oaiAt[2], 6, 130, 8, 30, 20, 44),
  };

  const peopleAt = at(500, theta0 - 0.3, 0);
  cache = {
    n, x, z, ang, ux, uz, face, blocked, row: rowOf, rowStart, rowCount, rowR, rowIsAisle, aisleR,
    joinRank, hotRank, stopRank, byJoinRank, coordinators: coordRooms, protagonist, theta0: ang[protagonist], boardCells, boardCenter,
    firstReplies: pickNear, outside, gate: { theta: gateTheta, at: gateAt }, named, hfAt, modalAt, oaiAt,
    people: { at: peopleAt, box: { c: peopleAt, w: 64, h: 36, d: 40, yaw: 0.2 } },
  };
  return cache;
}

/** Calls `fn` for every room whose centre is within `d` metres (on the floor) of the point. */
export function nearCells(wd: World, px: number, pz: number, d: number, fn: (i: number) => void) {
  const rc = Math.hypot(px, pz);
  const thc = Math.atan2(pz, px);
  for (let k = 0; k < G.rows; k++) {
    if (wd.rowIsAisle[k]) continue;
    const r = wd.rowR[k];
    if (Math.abs(r - rc) > d) continue;
    const cnt = wd.rowCount[k];
    const half = Math.min(Math.PI, d / Math.max(r, 1) * 1.15 + 0.01);
    const lo = Math.floor(((thc - half) / (Math.PI * 2)) * cnt);
    const hi = Math.ceil(((thc + half) / (Math.PI * 2)) * cnt);
    if (hi - lo >= cnt) { for (let i = 0; i < cnt; i++) fn(wd.rowStart[k] + i); continue; }
    for (let i = lo; i <= hi; i++) fn(wd.rowStart[k] + (((i % cnt) + cnt) % cnt));
  }
}

/** The sign above the door at `cellIdx` along the board: its four corners (seen from the aisle) and its centre. */
export function boardQuad(w: World, cellIdx: number) {
  const i = w.boardCells[cellIdx];
  const ux = w.ux[i], uz = w.uz[i];
  const vx = -uz, vz = ux;
  const px = w.x[i] + ux * (G.cellD / 2), pz = w.z[i] + uz * (G.cellD / 2);
  const hw = 1.38;
  const y0 = 2.35, y1 = 3.25;
  // Seen from the aisle, left is the +tangent side.
  const TL: V3 = [px + vx * hw, y1, pz + vz * hw];
  const TR: V3 = [px - vx * hw, y1, pz - vz * hw];
  const BL: V3 = [px + vx * hw, y0, pz + vz * hw];
  const BR: V3 = [px - vx * hw, y0, pz - vz * hw];
  return { TL, TR, BL, BR, center: [px, (y0 + y1) / 2, pz] as V3, normal: [ux, 0, uz] as V3 };
}

export const boardAnchor = (w: World, cellIdx: number): V3 => boardQuad(w, cellIdx).center;
