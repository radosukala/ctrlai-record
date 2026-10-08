import { Proj, clamp, lerp, ramp, rng, sampleCamera, shuffled, smooth, smoother, easeOut, at, type Cam, type V3 } from './math';
import { G, boardAnchor, boardQuad, buildWorld, nearCells, type Box, type World } from './world';
import { ARRIVAL, attackReach, beamPower, blackout, cameraKeys, coordRing, cutProgress, dimLevel, hallOut, hotCount, labels, lightLevel, litCount, oaiMix, outMix, peopleGlow, slack, stopCount, threadLeg1, threadLeg2, towerMix, watchGlow, type Label } from './direction';
import { BOARD_MARKS, BOARD_MESSAGES, CALLOUTS, S, TASKS, TASK_GRID, WAFFLE } from '@/content/incidents/openai-hf/film';
import { QUOTE_BY_ID } from '@/content/incidents/openai-hf/quotes';
import { AGENT_BY_ID } from '@/content/incidents/openai-hf/agents';

type RGB = readonly [number, number, number];
const PAPER: RGB = [244, 241, 234];
const RED: RGB = [255, 84, 40];
const WARM: RGB = [255, 214, 170];
const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a < 0 ? 0 : a > 1 ? 1 : a})`;

const P = new Proj();
const KEYS = cameraKeys();
const LABELS = labels();

/** Stroke a lot of hairlines cheaply: group them by how faint they are, and draw each group once. */
class Batch {
  private b: number[][] = Array.from({ length: 10 }, () => []);
  add(a: number, x1: number, y1: number, x2: number, y2: number) {
    if (a <= 0.015) return;
    const i = Math.min(9, (a * 10) | 0);
    this.b[i].push(x1, y1, x2, y2);
  }
  flush(ctx: CanvasRenderingContext2D, color: RGB, max: number, lw = 1) {
    ctx.lineWidth = lw;
    for (let i = 0; i < 10; i++) {
      const arr = this.b[i];
      if (!arr.length) continue;
      ctx.strokeStyle = rgba(color, ((i + 0.5) / 10) * max);
      ctx.beginPath();
      for (let j = 0; j < arr.length; j += 4) { ctx.moveTo(arr[j], arr[j + 1]); ctx.lineTo(arr[j + 2], arr[j + 3]); }
      ctx.stroke();
      arr.length = 0;
    }
  }
}
const LINES = new Batch();
const LINES_HOT = new Batch();

const glowCache = new Map<string, HTMLCanvasElement>();
function glow(color: RGB): HTMLCanvasElement {
  const key = color.join(',');
  let c = glowCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(48, 48, 0, 48, 48, 48);
  gr.addColorStop(0, rgba(color, 1));
  gr.addColorStop(0.18, rgba(color, 0.55));
  gr.addColorStop(0.5, rgba(color, 0.12));
  gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, 96, 96);
  glowCache.set(key, c);
  return c;
}

/** `lite` thins the busiest scenes (the web of lines, the faintest dots) for machines that cannot keep up. Stills and exports never use it. */
export type FrameOptions = {
  lite?: boolean;
  /** The picture alone, for a loop behind other words (the homepage): no labels, no named agents, no grid of tasks, no darkening for a chart. */
  bare?: boolean;
  /** A camera of its own, instead of the film's (the homepage loop). */
  cam?: Cam;
};

let LITE = false;
/** The scene's light level this frame, read once rather than once per line. */
let LIGHT = 1;
/** How much of the hall is still running this frame: 1, until OpenAI's responders stop the runs on July 19. */
let HALL = 1;

export function drawFrame(ctx: CanvasRenderingContext2D, t: number, W: number, H: number, dpr: number, opts: FrameOptions = {}) {
  const w = buildWorld();
  LITE = !!opts.lite;
  HALL = hallOut(t);
  LIGHT = lightLevel(t) * HALL;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  // Canvas state outlives a frame: start every frame from known text settings.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'rgba(0,0,0,0)';
  ctx.fillStyle = '#080706';
  ctx.fillRect(0, 0, W, H);

  const cam = opts.cam ? { ...opts.cam } : sampleCamera(KEYS, t);
  // A little hand-held life near the ground; none up in the air.
  const sway = clamp(1 - cam.pos[1] / 30);
  if (sway > 0 && t > 0.5) {
    cam.pos = [cam.pos[0] + Math.sin(t * 0.83) * 0.018 * sway, cam.pos[1] + Math.sin(t * 1.21 + 1) * 0.012 * sway, cam.pos[2] + Math.cos(t * 0.71) * 0.018 * sway];
    cam.roll += Math.sin(t * 0.47) * 0.0022 * sway;
  }
  P.set(cam, W, H);

  const altitude = cam.pos[1];
  const fogFar = clamp(240 + altitude * 5.5, 240, 5200);
  const fogNear = fogFar * 0.12;
  const fog = (z: number) => {
    const f = 1 - (z - fogNear) / (fogFar - fogNear);
    return f <= 0 ? 0 : f >= 1 ? 1 : f * f;
  };

  // The hall only appears once the first room is built.
  const reveal = smoother(ramp(t, S('room', 2.4), S('room', 8.5)));
  const lit = litCount(t);
  const hot = hotCount(t);
  const stop = stopCount(t);

  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  drawGround(ctx, w, fog, reveal, t);
  drawAisles(ctx, w, fog, reveal);
  drawFence(ctx, w, fog, reveal, t);
  drawOutside(ctx, w, fog, reveal, t);
  drawPeople(ctx, w, fog, t);
  drawWatchers(ctx, t);
  drawTower(ctx, fog, reveal, t);
  drawCells(ctx, w, fog, reveal, t, lit, hot, stop);
  drawBoard(ctx, w, t);
  drawWeb(ctx, w, fog, t, lit, hot, stop);
  drawBeam(ctx, t, reveal);
  drawThread(ctx, w, t);
  drawProtagonist(ctx, w, t);
  drawDust(ctx, t);

  ctx.globalCompositeOperation = 'source-over';
  // The hall is darkened behind the chart of who organised whom.
  const dim = opts.bare ? 0 : dimLevel(t);
  if (dim > 0.002) { ctx.fillStyle = `rgba(8,7,6,${dim})`; ctx.fillRect(0, 0, W, H); }
  if (!opts.bare) {
    drawLabels(ctx, w, t);
    drawCallouts(ctx, w, t, hot);
    drawTaskGrid(ctx, W, H, t);
  }
  const bk = blackout(t);
  if (bk > 0.002) { ctx.fillStyle = `rgba(8,7,6,${bk})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------------------------------------------------------------------------

function polyline(batch: Batch, pts: V3[], alpha: (z: number) => number, closed = false) {
  const n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    if (!P.seg(a[0], a[1], a[2], b[0], b[1], b[2])) continue;
    const z = (P.sz1 + P.sz2) * 0.5;
    batch.add(alpha(z), P.sx, P.sy, P.sx2, P.sy2);
  }
}

function circle(r: number, y: number, segs: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < segs; i++) { const th = (i / segs) * Math.PI * 2; out.push([r * Math.cos(th), y, r * Math.sin(th)]); }
  return out;
}

const ringCache = new Map<string, V3[]>();
function ring(r: number, y: number, segs: number) {
  const k = `${r}|${y}|${segs}`;
  let v = ringCache.get(k);
  if (!v) { v = circle(r, y, segs); ringCache.set(k, v); }
  return v;
}

function drawGround(_ctx: CanvasRenderingContext2D, _w: World, fog: (z: number) => number, reveal: number, _t: number) {
  // Distance rings and ticks beyond the fence: a faint ground, so the hall does not float.
  for (const r of [520, 640, 800, 1000, 1250, 1600, 2000]) {
    polyline(LINES, ring(r, 0, 220), z => fog(z) * 0.5 * reveal);
  }
  LINES.flush(_ctx, PAPER, 0.07);
}

function drawAisles(ctx: CanvasRenderingContext2D, w: World, fog: (z: number) => number, reveal: number) {
  const camR = Math.hypot(P.px, P.pz);
  for (const r of w.aisleR) {
    // Skip aisles the camera is far from when it is low: they are beyond the fog anyway.
    if (P.py < 60 && Math.abs(r - camR) > 260) continue;
    const segs = r < 140 ? 360 : r < 300 ? 480 : 600;
    polyline(LINES, ring(r - G.aisleHalf, 0, segs), z => fog(z) * 0.9 * reveal, true);
    polyline(LINES, ring(r + G.aisleHalf, 0, segs), z => fog(z) * 0.9 * reveal, true);
  }
  LINES.flush(ctx, PAPER, 0.26);
  // Radial aisles: eight spokes.
  for (let j = 0; j < 8; j++) {
    const th = (j * Math.PI) / 4;
    const c = Math.cos(th), s = Math.sin(th);
    for (const side of [-1, 1]) {
      const ox = -s * G.slot * 1.35 * side, oz = c * G.slot * 1.35 * side;
      const a: V3 = [G.r0 * c + ox, 0, G.r0 * s + oz];
      const b: V3 = [(G.r0 + G.pitch * (G.rows - 1)) * c + ox, 0, (G.r0 + G.pitch * (G.rows - 1)) * s + oz];
      // A long line, drawn in pieces so the fog can fade it.
      const pieces = 28;
      for (let k = 0; k < pieces; k++) {
        const f0 = k / pieces, f1 = (k + 1) / pieces;
        if (!P.seg(lerp(a[0], b[0], f0), 0, lerp(a[2], b[2], f0), lerp(a[0], b[0], f1), 0, lerp(a[2], b[2], f1))) continue;
        LINES.add(fog((P.sz1 + P.sz2) / 2) * reveal * 0.8, P.sx, P.sy, P.sx2, P.sy2);
      }
    }
  }
  LINES.flush(ctx, PAPER, 0.2);
  // The yard around the tower.
  polyline(LINES, ring(G.yard, 0, 240), z => fog(z) * reveal, true);
  LINES.flush(ctx, PAPER, 0.3);
  // Floor markings, near the camera: joints across the aisle at every room, and a dashed centre line.
  if (P.py < 24) {
    const thc = Math.atan2(P.pz, P.px);
    for (const r of w.aisleR) {
      if (Math.abs(r - camR) > 30) continue;
      const step = G.slot / r;
      const base = Math.round(thc / step) * step;
      const n = Math.ceil(62 / G.slot);
      for (let j = -n; j <= n; j++) {
        const th = base + j * step;
        const c = Math.cos(th), sn = Math.sin(th);
        if (P.seg((r - G.aisleHalf) * c, 0.01, (r - G.aisleHalf) * sn, (r + G.aisleHalf) * c, 0.01, (r + G.aisleHalf) * sn)) {
          LINES.add(fog((P.sz1 + P.sz2) / 2) * reveal * 0.55, P.sx, P.sy, P.sx2, P.sy2);
        }
        const a0 = th + step * 0.25, a1 = th + step * 0.75;
        if (P.seg(r * Math.cos(a0), 0.01, r * Math.sin(a0), r * Math.cos(a1), 0.01, r * Math.sin(a1))) {
          LINES.add(fog((P.sz1 + P.sz2) / 2) * reveal * 0.9, P.sx, P.sy, P.sx2, P.sy2);
        }
      }
    }
    LINES.flush(ctx, PAPER, 0.2);
  }
}

function drawFence(ctx: CanvasRenderingContext2D, w: World, fog: (z: number) => number, reveal: number, _t: number) {
  const rail = ring(G.fence, 0, 720);
  const top = ring(G.fence, 6, 720);
  polyline(LINES, rail, z => fog(z) * reveal * 0.85, true);
  polyline(LINES, top, z => fog(z) * reveal * 0.85, true);
  // Posts every 2.5 degrees, with a gap at the gate.
  const gateHalf = 0.014;
  const posts = 144;
  for (let i = 0; i < posts; i++) {
    const th = (i / posts) * Math.PI * 2;
    const dth = Math.abs(((th - w.gate.theta + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (dth < gateHalf) continue;
    const x = G.fence * Math.cos(th), z = G.fence * Math.sin(th);
    if (!P.seg(x, 0, z, x, 6, z)) continue;
    LINES.add(fog((P.sz1 + P.sz2) / 2) * reveal * 0.7, P.sx, P.sy, P.sx2, P.sy2);
  }
  LINES.flush(ctx, PAPER, 0.3);
  // The gate: the shared cache's own link to the internet, which it had for downloading packages. Two tall posts, a lintel, and a faint
  // line along the ground from the hall to it. It is there from the start, and it is the one lit thing on the fence.
  const gt = w.gate.theta;
  const post = (side: number): [V3, V3] => [at(G.fence, gt + side * gateHalf, 0), at(G.fence, gt + side * gateHalf, 10)];
  const [pa0, pa1] = post(-1), [pb0, pb1] = post(1);
  const gateAlpha = (z: number) => fog(z) * reveal * 1.1;
  for (const [a, b] of [[pa0, pa1], [pb0, pb1], [pa1, pb1]] as [V3, V3][]) {
    if (P.seg(a[0], a[1], a[2], b[0], b[1], b[2])) LINES.add(gateAlpha((P.sz1 + P.sz2) / 2), P.sx, P.sy, P.sx2, P.sy2);
  }
  const reach = G.r0 + G.pitch * (G.rows - 1);
  for (let k = 0; k < 14; k++) {
    const r0 = lerp(reach, G.fence, k / 14), r1 = lerp(reach, G.fence, (k + 0.6) / 14);
    const a = at(r0, gt, 0.15), b = at(r1, gt, 0.15);
    if (P.seg(a[0], a[1], a[2], b[0], b[1], b[2])) LINES.add(fog((P.sz1 + P.sz2) / 2) * reveal * 0.9, P.sx, P.sy, P.sx2, P.sy2);
  }
  LINES.flush(ctx, WARM, 0.55, 1.1);
  if (P.p(w.gate.at[0], 6, w.gate.at[2])) {
    const s = clamp(12 + 3600 / Math.max(P.sz, 60), 12, 70);
    ctx.globalAlpha = clamp(0.5 * fog(P.sz) * reveal * HALL + 0.04);
    ctx.drawImage(glow(WARM), P.sx - s, P.sy - s, s * 2, s * 2);
    ctx.globalAlpha = 1;
  }
}

function boxEdges(b: Box, batch: Batch, fog: (z: number) => number, reveal: number, scale = 1) {
  const hw = b.w / 2, hd = b.d / 2;
  const cs = Math.cos(b.yaw), sn = Math.sin(b.yaw);
  const pt = (sx: number, sz: number, y: number): V3 => [b.c[0] + (sx * hw * cs - sz * hd * sn), y, b.c[2] + (sx * hw * sn + sz * hd * cs)];
  const bottom = [pt(-1, -1, 0), pt(1, -1, 0), pt(1, 1, 0), pt(-1, 1, 0)];
  const topV = [pt(-1, -1, b.h), pt(1, -1, b.h), pt(1, 1, b.h), pt(-1, 1, b.h)];
  const alpha = (z: number) => fog(z) * reveal * scale;
  polyline(batch, bottom, alpha, true);
  polyline(batch, topV, alpha, true);
  for (let i = 0; i < 4; i++) polyline(batch, [bottom[i], topV[i]], alpha);
}

function drawOutside(ctx: CanvasRenderingContext2D, w: World, fog: (z: number) => number, reveal: number, t: number) {
  // In the last part, about what came after, the places the incident reached are only faintly there.
  const a = (ramp(t, S('exit', 2), S('exit', 8)) * 0.35 + ramp(t, S('tower', 22), S('modal', 3)) * 0.6) * (1 - 0.75 * smoother(ramp(t, S('question', -0.3), S('question', 1.2))));
  if (a <= 0.01) return;
  const cut = cutProgress(t);
  // Hugging Face's campus is reached from the moment the red line arrives (the film draws it box by box; no order is claimed).
  const attack = attackReach(t) * (1 - cut);
  const warm = smoother(ramp(t, S('attack', 9), S('attack', 12)));
  const oai = oaiMix(t);
  // The customer's sandbox turns red when the pale line out of the gate reaches it: a base outside, reached by the attack.
  const modalHit = smoother(ramp(t, S('modal', 14.8), S('modal', 16.6)));
  for (const b of w.outside.others) boxEdges(b, LINES, fog, reveal * a, 0.4);
  for (const b of w.outside.modal) boxEdges(b, modalHit > 0.02 ? LINES_HOT : LINES, fog, reveal * a, modalHit > 0.02 ? 0.5 + modalHit * 0.9 : 0.9);
  for (const b of w.outside.oai) boxEdges(b, oai > 0.02 ? LINES_HOT : LINES, fog, reveal * a, 0.5 + oai * 1.1);
  LINES.flush(ctx, PAPER, 0.24);
  LINES_HOT.flush(ctx, RED, 0.7, 1.2);
  if (oai > 0.02) {
    // A short thread from the board (the shared cache) to OpenAI's own systems, inside the hall's grounds.
    const A = w.boardCenter, Bq = w.oaiAt;
    let prev: V3 | null = null;
    for (let k = 0; k <= 40 * oai; k++) {
      const f = k / 40;
      const q: V3 = [lerp(A[0], Bq[0], f), 3 + Math.sin(f * Math.PI) * 38, lerp(A[2], Bq[2], f)];
      if (prev && P.seg(prev[0], prev[1], prev[2], q[0], q[1], q[2])) LINES_HOT.add(0.9 * fog((P.sz1 + P.sz2) / 2), P.sx, P.sy, P.sx2, P.sy2);
      prev = q;
    }
    LINES_HOT.flush(ctx, RED, 0.9, 1.4);
  }
  // Hugging Face's campus, box by box.
  w.outside.hf.forEach((b, i) => {
    const lit = clamp(attack * w.outside.hf.length * 1.1 - i, 0, 1);
    boxEdges(b, lit > 0 ? LINES_HOT : LINES, fog, reveal * a, 1 * (lit > 0 ? 0.6 + lit * 0.8 : 1));
  });
  LINES.flush(ctx, PAPER, 0.28 + warm * 0.1);
  LINES_HOT.flush(ctx, RED, 0.8, 1.2);
}

function drawTower(ctx: CanvasRenderingContext2D, fog: (z: number) => number, reveal: number, t: number) {
  const beam = beamPower(t);
  const sides = 12;
  const rings = [0, 12, 24, 36, 48, 60, G.towerH];
  const alpha = (z: number) => fog(z) * reveal * (0.45 + beam * 0.4);
  for (const y of rings) polyline(LINES, ring(G.towerR * (y === G.towerH ? 0.82 : 1), y, sides), alpha, true);
  for (let i = 0; i < sides; i++) {
    const th = (i / sides) * Math.PI * 2;
    const r1 = G.towerR, r2 = G.towerR * 0.82;
    if (!P.seg(r1 * Math.cos(th), 0, r1 * Math.sin(th), r2 * Math.cos(th), G.towerH, r2 * Math.sin(th))) continue;
    LINES.add(alpha((P.sz1 + P.sz2) / 2), P.sx, P.sy, P.sx2, P.sy2);
  }
  // Windows round the top, lit while the agents believe someone is watching.
  for (let i = 0; i < sides; i++) {
    const th0 = ((i + 0.18) / sides) * Math.PI * 2, th1 = ((i + 0.82) / sides) * Math.PI * 2;
    const r = G.towerR * 0.9;
    const a: V3 = [r * Math.cos(th0), 62, r * Math.sin(th0)], b: V3 = [r * Math.cos(th1), 62, r * Math.sin(th1)];
    const c: V3 = [b[0], 68, b[2]], d: V3 = [a[0], 68, a[2]];
    polyline(LINES, [a, b, c, d], z => fog(z) * reveal * (0.35 + beam * 0.6), true);
  }
  LINES.flush(ctx, PAPER, 0.5);
  // The lantern.
  if (P.p(0, G.lantern, 0)) {
    const s = 14 + 60 * beam * (400 / Math.max(P.sz, 40)) ** 0.5;
    ctx.globalAlpha = clamp(beam * 0.9 * fog(P.sz) * reveal + 0.05);
    ctx.drawImage(glow(WARM), P.sx - s, P.sy - s, s * 2, s * 2);
    ctx.globalAlpha = 1;
  }
}

function drawBeam(ctx: CanvasRenderingContext2D, t: number, reveal: number) {
  const b = beamPower(t) * reveal;
  if (b < 0.02) return;
  const phi = t * 0.42;
  const dl = 0.05;
  const L: V3 = [0, G.lantern, 0];
  const A = at(440, phi - dl, 0), B = at(440, phi + dl, 0);
  if (!P.p(L[0], L[1], L[2])) return;
  const lx = P.sx, ly = P.sy;
  if (!P.p(A[0], A[1], A[2])) return;
  const ax = P.sx, ay = P.sy;
  if (!P.p(B[0], B[1], B[2])) return;
  const bx = P.sx, by = P.sy;
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  const g = ctx.createLinearGradient(lx, ly, mx, my);
  g.addColorStop(0, rgba(WARM, 0.2 * b));
  g.addColorStop(0.7, rgba(WARM, 0.05 * b));
  g.addColorStop(1, rgba(WARM, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(ax, ay); ctx.lineTo(bx, by); ctx.closePath(); ctx.fill();
}

// ---------------------------------------------------------------------------------------------------------------------------------

const dots = { n: 0 };

function cellIntensity(w: World, i: number, t: number, lit: number): number {
  const rank = w.joinRank[i];
  if (rank === 0) return smoother(ramp(t, S('room', 3), S('room', 4.6)));
  if (rank <= 8) {
    // The first replies light one by one, on their own schedule.
    return smoother(ramp(t, REPLY_T[rank - 1], REPLY_T[rank - 1] + 0.9));
  }
  return clamp(lit - rank + 1, 0, 1);
}

export const REPLY_T = [1.4, 2.7, 4.2, 5.4, 6.9, 8.0, 9.2, 10.2].map(x => S('replies', x));
/** The board slots the first replies' messages go on, in order. */
const REPLY_CELLS = BOARD_MARKS.filter(m => m.t >= S('replies') && m.t < S('replies', 20)).map(m => m.cell);

function drawCells(ctx: CanvasRenderingContext2D, w: World, fog: (z: number) => number, reveal: number, t: number, lit: number, hot: number, stop: number) {
  const n = w.n;
  const L = 1200;
  // Dim rooms: one small mark each.
  const buckets: number[][] = [[], [], [], []];
  const nearD = P.py < 40 ? 150 : 0;
  const win = clamp(lit * 0.08, 3, 80);
  const lights: { x: number; y: number; z: number; a: number; hot: number; i: number }[] = [];
  for (let i = 0; i < n; i++) {
    if (w.blocked[i]) continue;
    const rank = w.joinRank[i];
    if (!P.p(w.x[i], 1.2, w.z[i])) continue;
    // Off the picture: nothing to draw, and a halo could not reach back in.
    if (P.sx < -70 || P.sx > P.W + 70 || P.sy < -70 || P.sy > P.H + 70) continue;
    const z = P.sz;
    const f = fog(z) * reveal * HALL;
    if (f <= 0.004) continue;
    const inten = rank < L ? cellIntensity(w, i, t, lit) : 0;
    const stopped = rank < L && w.stopRank[i] < stop ? 1 : 0;
    const isHot = rank < L && w.hotRank[i] < hot ? 1 : 0;
    if (inten > 0 && !stopped) {
      lights.push({ x: P.sx, y: P.sy, z, a: inten * (rank < 9 ? 1 : 1), hot: isHot, i });
      continue;
    }
    const a = f * (stopped ? 0.5 : 1);
    if (LITE && a < 0.25) continue;
    buckets[Math.min(3, (a * 4) | 0)].push(P.sx, P.sy, z < 120 ? 2.2 : z < 400 ? 1.6 : 1.2);
    void nearD;
  }
  for (let b = 0; b < 4; b++) {
    const arr = buckets[b];
    if (!arr.length) continue;
    ctx.fillStyle = rgba(PAPER, 0.1 + b * 0.07);
    ctx.beginPath();
    for (let j = 0; j < arr.length; j += 3) ctx.rect(arr[j] - arr[j + 2] / 2, arr[j + 1] - arr[j + 2] / 2, arr[j + 2], arr[j + 2]);
    ctx.fill();
  }

  // Rooms near the camera are drawn as solid rooms, far to near, so near walls hide the lines behind them.
  if (P.py < 60) drawNearRooms(ctx, w, fog, reveal, t);

  // Lit rooms: a core and a halo.
  for (const l of lights) {
    const rank = w.joinRank[l.i];
    const age = lit - rank;
    const flash = rank < 9 ? 0 : clamp(1 - Math.max(age - 1, 0) / win, 0, 1);
    const col = l.hot ? RED : PAPER;
    const hs = clamp(3.4 + 5400 / Math.max(l.z, 60), 5, 34) * (1 + flash * 0.9);
    ctx.globalAlpha = clamp(l.a * (0.5 + flash * 0.5) * fog(l.z) * 1.4 * LIGHT) * (l.hot ? 0.85 : 0.7);
    ctx.drawImage(glow(l.hot ? RED : l.z < 80 ? WARM : PAPER), l.x - hs, l.y - hs, hs * 2, hs * 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = rgba(col, clamp(l.a));
    const core = clamp(1.6 + 160 / Math.max(l.z, 20), 1.6, 4.2);
    ctx.fillRect(l.x - core / 2, l.y - core / 2, core, core);
  }
  dots.n = lights.length;
  // The eleven coordinators, ringed from just after the large fraction stops until just after they stop too.
  const cr = coordRing(t);
  if (cr > 0.01) {
    ctx.strokeStyle = rgba(PAPER, 0.85 * cr);
    ctx.lineWidth = 1.2;
    for (const i of coordinators(w)) {
      if (!P.p(w.x[i], 1.2, w.z[i])) continue;
      const rr = clamp(7 + 4200 / Math.max(P.sz, 80), 7, 22);
      ctx.beginPath(); ctx.arc(P.sx, P.sy, rr, 0, Math.PI * 2); ctx.stroke();
    }
  }
}

const coordinators = (w: World): number[] => w.coordinators;

/**
 * Labels that need the camera to place them. The eleven rings need a name; so does OpenAI's own cluster in the last scene.
 * The coordinators' label is hung on the one that is furthest to the left of the picture, where there is room for the words.
 */
const EXTRA_LABELS: Label[] = [
  {
    t0: S('lights', 18.8), t1: S('after', 0.8), text: 'Eleven coordinators', sub: 'the agents METR’s analysis ranked as the attack’s main coordinators', dx: -50, dy: -60,
    anchor: w => {
      let best: V3 = [w.x[w.protagonist], 1.2, w.z[w.protagonist]], bx = Infinity;
      for (const i of coordinators(w)) {
        if (!P.p(w.x[i], 1.2, w.z[i]) || P.sx < 60 || P.sx > P.W - 60 || P.sy < 60 || P.sy > P.H - 60) continue;
        if (P.sx < bx) { bx = P.sx; best = [w.x[i], 1.2, w.z[i]]; }
      }
      return best;
    },
  },
  { t0: S('after', 28), t1: S('after', 58.5), text: 'OpenAI’s research cluster', sub: 'its own servers, and the passwords and keys they store', dx: 60, dy: 95, anchor: w => [w.oaiAt[0], 6, w.oaiAt[2]] },
];

const BG = '#080706';
const WALL_FILL = '#0b0a09';

function drawNearRooms(ctx: CanvasRenderingContext2D, w: World, fog: (z: number) => number, reveal: number, t: number) {
  const range = P.py < 12 ? 110 : 64;
  const list: { i: number; d: number }[] = [];
  nearCells(w, P.px, P.pz, range, i => {
    if (w.blocked[i]) return;
    const dx = w.x[i] - P.px, dz = w.z[i] - P.pz;
    const d = Math.hypot(dx, dz);
    if (d > range) return;
    if (dx * P.fx + dz * P.fz < -5) return;
    list.push({ i, d });
  });
  list.sort((a, b) => b.d - a.d);
  const wire: number[] = [];
  ctx.globalCompositeOperation = 'source-over';
  for (const { i, d } of list) {
    if (i === w.protagonist && t < S('room', 3.6)) { wire.push(i); continue; }
    if (d < 2.2 || !solidRoom(ctx, w, i, d, fog, reveal, i === w.protagonist)) wire.push(i);
  }
  ctx.globalCompositeOperation = 'lighter';
  // The rooms the camera is in or very near, and the first room as it is drawn, stay as plain edges.
  for (const i of wire) drawRoom(w, i, fog, reveal, t, range);
  LINES.flush(ctx, PAPER, 0.5);
}

const FACES: { idx: number[]; nu: number; nv: number; ny: number }[] = [
  { idx: [1, 2, 6, 5], nu: 1, nv: 0, ny: 0 },
  { idx: [0, 3, 7, 4], nu: -1, nv: 0, ny: 0 },
  { idx: [0, 1, 5, 4], nu: 0, nv: -1, ny: 0 },
  { idx: [3, 2, 6, 7], nu: 0, nv: 1, ny: 0 },
  { idx: [4, 5, 6, 7], nu: 0, nv: 0, ny: 1 },
];
const CORNERS: [number, number, number][] = [[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];

/** A room as a solid: its visible faces are filled with the night, and edged. Returns false if it cannot be drawn whole. */
function solidRoom(ctx: CanvasRenderingContext2D, w: World, i: number, d: number, fog: (z: number) => number, reveal: number, isProt: boolean): boolean {
  const hw = G.cellW / 2, hd = G.cellD / 2, H = G.cellH;
  const ux = w.ux[i], uz = w.uz[i], vx = -uz, vz = ux, cx = w.x[i], cz = w.z[i];
  const sx: number[] = [], sy: number[] = [];
  for (const [su, sv, k] of CORNERS) {
    if (!P.p(cx + ux * hd * su + vx * hw * sv, k * H, cz + uz * hd * su + vz * hw * sv)) return false;
    sx.push(P.sx); sy.push(P.sy);
  }
  const a = clamp(fog(d + 1) * reveal * (isProt ? 1.25 : 0.95) * (1 + 0.9 * clamp(1 - d / 22)));
  if (a <= 0.02) return true;
  const f = w.face[i];
  // Interior, seen through the door: all the edges, faint.
  ctx.strokeStyle = rgba(PAPER, a * 0.28);
  ctx.lineWidth = 1;
  ctx.beginPath();
  const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (const [p, q] of E) { ctx.moveTo(sx[p], sy[p]); ctx.lineTo(sx[q], sy[q]); }
  ctx.stroke();
  // The visible faces, filled, with the door cut out of the front.
  const camx = P.px, camy = P.py, camz = P.pz;
  const door = (): [number, number][] | null => {
    const sv = G.doorW / G.cellW;
    const pts: [number, number][] = [];
    for (const [v, y] of [[-sv, 0], [sv, 0], [sv, G.doorH], [-sv, G.doorH]] as [number, number][]) {
      if (!P.p(cx + ux * hd * f + vx * hw * v, y, cz + uz * hd * f + vz * hw * v)) return null;
      pts.push([P.sx, P.sy]);
    }
    return pts;
  };
  ctx.fillStyle = WALL_FILL;
  const edges: number[][] = [];
  for (const face of FACES) {
    const nx = ux * face.nu + vx * face.nv, nz = uz * face.nu + vz * face.nv, ny = face.ny;
    const fcx = cx + ux * hd * face.nu + vx * hw * face.nv, fcy = ny ? H : H / 2, fcz = cz + uz * hd * face.nu + vz * hw * face.nv;
    if (nx * (camx - fcx) + ny * (camy - fcy) + nz * (camz - fcz) <= 0) continue;
    ctx.beginPath();
    const [p0, p1, p2, p3] = face.idx;
    ctx.moveTo(sx[p0], sy[p0]); ctx.lineTo(sx[p1], sy[p1]); ctx.lineTo(sx[p2], sy[p2]); ctx.lineTo(sx[p3], sy[p3]); ctx.closePath();
    const isFront = face.nu === f && face.nv === 0;
    if (isFront) {
      const dr = door();
      if (dr) { ctx.moveTo(dr[0][0], dr[0][1]); for (let k = 1; k < 4; k++) ctx.lineTo(dr[k][0], dr[k][1]); ctx.closePath(); ctx.fill('evenodd'); edges.push([p0, p1, p2, p3]); edges.push([-1]); continue; }
    }
    ctx.fill();
    edges.push([p0, p1, p2, p3]);
  }
  // Edges of the visible faces, and the door.
  ctx.strokeStyle = rgba(PAPER, a * 0.78);
  ctx.beginPath();
  for (const e of edges) {
    if (e.length < 4) continue;
    ctx.moveTo(sx[e[0]], sy[e[0]]);
    for (let k = 1; k < 4; k++) ctx.lineTo(sx[e[k]], sy[e[k]]);
    ctx.closePath();
  }
  const dr = door();
  if (dr) { ctx.moveTo(dr[0][0], dr[0][1]); for (let k = 1; k < 4; k++) ctx.lineTo(dr[k][0], dr[k][1]); ctx.closePath(); }
  ctx.stroke();
  return true;
}

function drawRoom(w: World, i: number, fog: (z: number) => number, reveal: number, t: number, range: number) {
  const hw = G.cellW / 2, hd = G.cellD / 2;
  const ux = w.ux[i], uz = w.uz[i];
  const vx = -uz, vz = ux;
  const cx = w.x[i], cz = w.z[i];
  const dx = cx - P.px, dz = cz - P.pz;
  const dist = Math.hypot(dx, dz);
  if (dist > range) return;
  const isProt = i === w.protagonist;
  const build = isProt ? smoother(ramp(t, S('room', 0.35), S('room', 3.4))) : 1;
  const base = isProt ? 1 : reveal;
  const near = fog(dist + 1) * base;
  const corner = (su: number, sv: number, y: number): V3 => [cx + ux * hd * su + vx * hw * sv, y, cz + uz * hd * su + vz * hw * sv];
  const bottom = [corner(-1, -1, 0), corner(1, -1, 0), corner(1, 1, 0), corner(-1, 1, 0)];
  const top = [corner(-1, -1, G.cellH), corner(1, -1, G.cellH), corner(1, 1, G.cellH), corner(-1, 1, G.cellH)];
  const alpha = (z: number) => fog(z) * base * (isProt ? 1.2 : 0.8);
  if (isProt && build < 1) {
    // The first room draws itself, edge by edge.
    const edges: [V3, V3][] = [
      [bottom[0], bottom[1]], [bottom[1], bottom[2]], [bottom[2], bottom[3]], [bottom[3], bottom[0]],
      [bottom[0], top[0]], [bottom[1], top[1]], [bottom[2], top[2]], [bottom[3], top[3]],
      [top[0], top[1]], [top[1], top[2]], [top[2], top[3]], [top[3], top[0]],
    ];
    edges.forEach(([a, b], k) => {
      const p = clamp(build * 12 - k * 0.7, 0, 1);
      if (p <= 0) return;
      const e: V3 = [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];
      if (P.seg(a[0], a[1], a[2], e[0], e[1], e[2])) LINES.add(alpha((P.sz1 + P.sz2) / 2), P.sx, P.sy, P.sx2, P.sy2);
    });
    return;
  }
  // Near rooms are drawn whole, middle ones as a front and a door, far ones only as a door: a hall of doors, not a thicket of lines.
  const full = dist < 14 || isProt;
  const mid = dist < 42;
  const boost = 1 + 0.9 * clamp(1 - dist / 22);
  const al = (z: number) => alpha(z) * boost;
  if (full) {
    polyline(LINES, bottom, al, true);
    polyline(LINES, top, al, true);
    for (let k = 0; k < 4; k++) polyline(LINES, [bottom[k], top[k]], al);
  }
  // The front, with a door, on the side that faces the aisle.
  const f = w.face[i];
  const front = (sv: number, y: number): V3 => [cx + ux * hd * f + vx * hw * sv, y, cz + uz * hd * f + vz * hw * sv];
  if (!full && mid) polyline(LINES, [front(-1, 0), front(-1, G.cellH), front(1, G.cellH), front(1, 0)], al);
  const dw = G.doorW / hw;
  polyline(LINES, [front(-dw, 0), front(-dw, G.doorH), front(dw, G.doorH), front(dw, 0)], z => al(z) * 0.9);
  void near;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** The board: a row of signs above the doors across the aisle from the first room. Messages are typed in; the rest are only marks. */
const FIRST_MESSAGE = BOARD_MESSAGES.find(m => m.id === 'q-first-message')!;
const PLAQUE_CHARS = 22;
/** A monospace character is 0.6 of its size wide; 22 of them, and a margin, fit the 280-unit sign. */
const SIGN_FONT = 19;
const SIGN_CH = SIGN_FONT * 0.6;

function wrapMessage(text: string): string[] {
  // Messages are long snake_case strings. Cut at a boundary and show at most two short lines, with "…" if shortened.
  const out: string[] = [];
  let rest = text;
  for (let line = 0; line < 2 && rest.length; line++) {
    if (rest.length <= PLAQUE_CHARS) { out.push(rest); rest = ''; break; }
    let cut = PLAQUE_CHARS;
    const us = rest.lastIndexOf('_', PLAQUE_CHARS);
    if (us > PLAQUE_CHARS * 0.5) cut = us + 1;
    // A line does not start with a mark of punctuation: it goes at the end of the line before (the sign has room for one more character).
    else if (/[;,.!?]/.test(rest[cut] ?? '')) cut += 1;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^ /, '');
  }
  if (rest.length) out[out.length - 1] = out[out.length - 1].replace(/_?$/, '') + '…';
  return out;
}

type Sign = { cell: number; t: number; gone?: number; id?: string; hero?: boolean };
const SIGNS: Sign[] = [
  ...BOARD_MESSAGES.map(m => ({ cell: m.cell, t: m.t, gone: m.gone, id: m.id, hero: m.hero })),
  ...BOARD_MARKS.map(m => ({ cell: m.cell, t: m.t, gone: m.gone })),
];

function drawBoard(ctx: CanvasRenderingContext2D, w: World, t: number) {
  if (P.py > 90) return;
  ctx.globalCompositeOperation = 'source-over';
  for (const s of SIGNS) {
    // A sign that is wiped when the board is rebuilt goes out in a flicker.
    const wiped = s.gone === undefined ? 0 : smoother(ramp(t, s.gone, s.gone + 0.8));
    const flick = wiped > 0 && wiped < 1 ? 0.55 + 0.45 * Math.sin(t * 70 + s.cell * 3) : 1;
    const appear = smoother(ramp(t, s.t - 0.4, s.t + 0.5)) * (1 - wiped) * flick;
    if (appear <= 0.01) continue;
    const q = boardQuad(w, s.cell);
    const pts = [q.TL, q.TR, q.BR, q.BL];
    const sp: { x: number; y: number }[] = [];
    let ok = true;
    for (const p of pts) { if (!P.p(p[0], p[1], p[2])) { ok = false; break; } sp.push({ x: P.sx, y: P.sy }); }
    if (!ok) continue;
    const area = Math.abs((sp[1].x - sp[0].x) * (sp[3].y - sp[0].y) - (sp[3].x - sp[0].x) * (sp[1].y - sp[0].y));
    if (area < 4) continue;
    // A sign that fills the frame, because the camera is passing it, fades rather than showing a crop of its words.
    const wide = Math.hypot(sp[1].x - sp[0].x, sp[1].y - sp[0].y) / P.W;
    const near = 1 - smooth(ramp(wide, s.hero ? 0.52 : 0.2, s.hero ? 0.8 : 0.38));
    if (near <= 0.02) continue;
    ctx.fillStyle = rgba(PAPER, 0.05 * appear * near);
    ctx.strokeStyle = rgba(PAPER, 0.7 * appear * near);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sp[0].x, sp[0].y); for (let k = 1; k < 4; k++) ctx.lineTo(sp[k].x, sp[k].y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Text, mapped onto the sign with an affine transform so it sits in perspective.
    const Wt = 280, Ht = 100;
    ctx.save();
    ctx.transform((sp[1].x - sp[0].x) / Wt, (sp[1].y - sp[0].y) / Wt, (sp[3].x - sp[0].x) / Ht, (sp[3].y - sp[0].y) / Ht, sp[0].x, sp[0].y);
    // Nothing is drawn outside the sign it is written on.
    ctx.beginPath(); ctx.rect(0, 0, Wt, Ht); ctx.clip();
    if (s.id) {
      // Words cut by the edge of the picture read as a template left unfilled, so they fade as the sign goes out of frame.
      const xs = sp.map(p => p.x), ys = sp.map(p => p.y);
      const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
      const inW = Math.min(Math.max(...xs), P.W) - Math.max(Math.min(...xs), 0), inH = Math.min(Math.max(...ys), P.H) - Math.max(Math.min(...ys), 0);
      const inside = bw > 0 && bh > 0 ? clamp(inW / bw) * clamp(inH / bh) : 1;
      const readable = smooth(ramp(inside, 0.62, 0.95));
      const lines = wrapMessage(QUOTE_BY_ID[s.id].text);
      const type = clamp((t - s.t) / 2.2);
      const total = lines.join('').length;
      let shown = Math.floor(total * easeOut(type));
      const first = lines[0].slice(0, Math.max(0, Math.min(lines[0].length, shown)));
      ctx.font = `600 ${SIGN_FONT}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
      ctx.fillStyle = rgba(PAPER, 0.95 * appear * near * readable);
      ctx.textBaseline = 'middle';
      lines.forEach((ln, k) => {
        const part = ln.slice(0, Math.max(0, Math.min(ln.length, shown)));
        shown -= ln.length;
        ctx.fillText(part, 14, 32 + k * 36);
      });
      if (type < 1) { ctx.fillStyle = rgba(WARM, 0.9 * appear * readable); ctx.fillRect(14 + first.length * SIGN_CH, 22, 8, 22); }
    } else {
      // Unreadable: a few short bars, the length of nothing in particular.
      const r = rng(s.cell * 97 + 5);
      ctx.fillStyle = rgba(PAPER, 0.45 * appear * near);
      for (let k = 0; k < 2; k++) ctx.fillRect(14, 22 + k * 34, 60 + r() * 150, 7);
    }
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'lighter';
}

// ---------------------------------------------------------------------------------------------------------------------------------

function hub(w: World, t: number): V3 {
  return [w.boardCenter[0], w.boardCenter[1], w.boardCenter[2]];
}

function drawWeb(ctx: CanvasRenderingContext2D, w: World, fog: (z: number) => number, t: number, lit: number, hot: number, stop: number) {
  if (lit < 1.01 && t < S('first', 40)) return;
  const board = hub(w, t);
  const tower: V3 = [0, G.lantern, 0];
  const out: V3 = [w.gate.at[0], 4, w.gate.at[2]];
  const tm = towerMix(t), om = outMix(t), sl = slack(t);
  const count = Math.min(1200, Math.ceil(lit));
  const alphaFar = P.py > 60 ? 0.55 : 1;
  const seg = LITE ? 4 : 7;
  const pulseT = t * 0.33;
  for (let rank = 1; rank < count; rank++) {
    if (LITE && rank > 12 && rank & 1) continue;
    const i = w.byJoinRank[rank];
    const inten = rank <= 8 ? smoother(ramp(t, REPLY_T[rank - 1] + 0.5, REPLY_T[rank - 1] + 1.6)) : clamp(lit - rank + 1, 0, 1);
    if (inten <= 0.01) continue;
    if (w.stopRank[i] < stop) continue;
    const isHot = w.hotRank[i] < hot;
    // Where this line points.
    let tx = board[0], ty = board[1], tz = board[2];
    if (rank <= 8) {
      // Each of the first replies points at the sign its own message will appear on.
      const q = boardAnchor(w, REPLY_CELLS[Math.min(rank - 1, REPLY_CELLS.length - 1)]);
      tx = q[0]; ty = q[1]; tz = q[2];
    }
    tx = lerp(tx, tower[0], tm); ty = lerp(ty, tower[1], tm); tz = lerp(tz, tower[2], tm);
    if (isHot) { tx = lerp(tx, out[0], om); ty = lerp(ty, out[1], om); tz = lerp(tz, out[2], om); }
    const sx = w.x[i], sy = 1.3, sz = w.z[i];
    const len = Math.hypot(tx - sx, tz - sz);
    const arc = len * 0.12 * (1 - sl * 0.8) + 2;
    let px = sx, py = sy, pz = sz;
    const batch = isHot ? LINES_HOT : LINES;
    for (let k = 1; k <= seg; k++) {
      const f = k / seg;
      const nx = lerp(sx, tx, f), nz = lerp(sz, tz, f);
      const ny = lerp(sy, ty, f) + Math.sin(f * Math.PI) * arc - sl * Math.sin(f * Math.PI) * len * 0.05;
      if (P.seg(px, py, pz, nx, ny, nz)) {
        const z = (P.sz1 + P.sz2) / 2;
        batch.add(fog(z) * inten * (rank <= 8 ? 1.2 : 0.35 * alphaFar) * (1 - sl * 0.7) * LIGHT, P.sx, P.sy, P.sx2, P.sy2);
      }
      px = nx; py = ny; pz = nz;
    }
    // A pulse running along the line, toward where it points.
    if (rank <= 400 || rank <= 8) {
      const u = (pulseT * (0.6 + ((rank * 37) % 17) / 40) + ((rank * 53) % 100) / 100) % 1;
      const f = u;
      const qx = lerp(sx, tx, f), qz = lerp(sz, tz, f);
      const qy = lerp(sy, ty, f) + Math.sin(f * Math.PI) * arc;
      if (P.p(qx, qy, qz)) {
        const s = clamp(2.5 + 900 / Math.max(P.sz, 30), 3, 14);
        ctx.globalAlpha = clamp(inten * fog(P.sz) * (rank <= 8 ? 0.9 : 0.5) * (1 - sl));
        ctx.drawImage(glow(isHot ? RED : WARM), P.sx - s, P.sy - s, s * 2, s * 2);
        ctx.globalAlpha = 1;
      }
    }
  }
  LINES.flush(ctx, PAPER, 0.5);
  LINES_HOT.flush(ctx, RED, 0.5);
}

/**
 * The line that leaves the hall by the gate. First a pale one, to the customer's code sandbox: the way out, through the shared cache,
 * and a base outside (July 8 and 9). Then a red one on to Hugging Face (July 10 and 11). The red one dies when Hugging Face cuts the
 * agents off; the pale one stays.
 */
function drawThread(ctx: CanvasRenderingContext2D, w: World, t: number) {
  const p1 = threadLeg1(t), p2 = threadLeg2(t);
  const alive = 1 - cutProgress(t);
  const leg = (a: V3, b: V3, p: number, arc: number, batch: Batch, color: RGB, strength: number, maxZ: number) => {
    const N = 90;
    const pts: V3[] = [];
    for (let k = 0; k <= N * p; k++) {
      const f = k / N;
      pts.push([lerp(a[0], b[0], f), 4 + Math.sin(f * Math.PI) * arc, lerp(a[2], b[2], f)]);
    }
    for (let strand = 0; strand < 3; strand++) {
      const off = (strand - 1) * 1.4;
      for (let k = 1; k < pts.length; k++) {
        const q0 = pts[k - 1], q1 = pts[k];
        if (!P.seg(q0[0], q0[1] + off, q0[2], q1[0], q1[1] + off, q1[2])) continue;
        const z = (P.sz1 + P.sz2) / 2;
        const trail = clamp(k / pts.length);
        batch.add(clamp(0.35 + trail * 0.6) * clamp(1.2 - z / maxZ) * strength * HALL, P.sx, P.sy, P.sx2, P.sy2);
      }
    }
    batch.flush(ctx, color, 0.95, 1.6);
    const head = pts[pts.length - 1];
    if (head && p < 0.999 && P.p(head[0], head[1], head[2])) {
      const s = clamp(8 + 4200 / Math.max(P.sz, 50), 8, 60);
      ctx.globalAlpha = 0.95 * strength;
      ctx.drawImage(glow(color), P.sx - s, P.sy - s, s * 2, s * 2);
      ctx.globalAlpha = 1;
    }
  };
  if (p1 > 0.001) leg(w.gate.at, w.modalAt, p1, 40, LINES, WARM, 0.9, 5200);
  if (p2 > 0.001 && alive > 0.01) leg(w.modalAt, w.hfAt, p2, 70, LINES_HOT, RED, alive, 4200);
  // The customer's sandbox glows when the pale line arrives, and Hugging Face when the red one does.
  if (p1 >= 0.999 && P.p(w.modalAt[0], 6, w.modalAt[2])) {
    const s = clamp(20 + 9000 / Math.max(P.sz, 80), 20, 110);
    ctx.globalAlpha = 0.55 * smoother(ramp(t, S('modal', 14.8), S('modal', 16.6))) * (1 - 0.6 * cutProgress(t));
    ctx.drawImage(glow(RED), P.sx - s, P.sy - s, s * 2, s * 2);
    ctx.globalAlpha = 1;
  }
  if (p2 >= 0.999 && alive > 0.01 && P.p(w.hfAt[0], 8, w.hfAt[2])) {
    const s = clamp(30 + 14000 / Math.max(P.sz, 80), 30, 180);
    ctx.globalAlpha = 0.7 * alive;
    ctx.drawImage(glow(RED), P.sx - s, P.sy - s, s * 2, s * 2);
    ctx.globalAlpha = 1;
  }
}

function drawProtagonist(ctx: CanvasRenderingContext2D, w: World, t: number) {
  const p = w.protagonist;
  const I = smoother(ramp(t, S('room', 3), S('room', 4.6)));
  if (I <= 0) return;
  const C: V3 = [w.x[p], 1.15, w.z[p]];
  const breath = 0.78 + 0.22 * Math.sin(t * 2.1);
  // Sonar rings on the floor.
  for (let k = 0; k < 2; k++) {
    const ph = ((t * 0.28 + k * 0.5) % 1);
    const r = 0.3 + ph * 1.5;
    polyline(LINES, ring(1, 0, 1).length ? circleAt(C[0], 0.02, C[2], r, 40) : [], z => (1 - ph) * 0.9 * I * (z < 80 ? 1 : 0.4), true);
  }
  LINES.flush(ctx, WARM, 0.5);
  // Light on the aisle floor in front of the door.
  const fl: V3 = [w.x[p] - w.ux[p] * 2.6, 0.02, w.z[p] - w.uz[p] * 2.6];
  if (P.p(fl[0], fl[1], fl[2])) {
    const sf = clamp(700 / Math.max(P.sz, 3), 30, 260);
    ctx.globalAlpha = I * 0.28;
    ctx.drawImage(glow(WARM), P.sx - sf, P.sy - sf * 0.45, sf * 2, sf * 0.9);
    ctx.globalAlpha = 1;
  }
  if (!P.p(C[0], C[1], C[2])) return;
  const s = clamp(24 + 900 / Math.max(P.sz, 4), 24, 90) * breath;
  ctx.globalAlpha = I * 0.95;
  ctx.drawImage(glow(WARM), P.sx - s, P.sy - s, s * 2, s * 2);
  ctx.globalAlpha = 1;
  const core = clamp(3 + 30 / Math.max(P.sz, 1), 3, 9);
  ctx.fillStyle = rgba([255, 250, 240], I);
  ctx.beginPath(); ctx.arc(P.sx, P.sy, core / 2, 0, Math.PI * 2); ctx.fill();

  // The first message leaves the room, crosses the aisle and lands on the board.
  const s0 = smoother(ramp(t, ARRIVAL.pulse0, ARRIVAL.pulse1));
  if (s0 > 0 && s0 < 1.02) {
    const q = boardAnchor(w, FIRST_MESSAGE.cell);
    const u = [w.ux[p], w.uz[p]];
    const door: V3 = [w.x[p] - u[0] * 1.7, 1.25, w.z[p] - u[1] * 1.7];
    const mid: V3 = [w.x[p] - u[0] * 4.6, 1.7, w.z[p] - u[1] * 4.6];
    const path = [C, door, mid, q];
    const at3 = (f: number): V3 => {
      const x = f * (path.length - 1);
      const i = Math.min(path.length - 2, Math.floor(x));
      const u2 = x - i;
      const p0 = path[Math.max(0, i - 1)], p1 = path[i], p2 = path[i + 1], p3 = path[Math.min(path.length - 1, i + 2)];
      const cr = (a: number, b: number, c: number, d: number) => 0.5 * ((2 * b) + (-a + c) * u2 + (2 * a - 5 * b + 4 * c - d) * u2 * u2 + (-a + 3 * b - 3 * c + d) * u2 * u2 * u2);
      return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1]), cr(p0[2], p1[2], p2[2], p3[2])];
    };
    for (let k = 0; k < 44; k++) {
      const f0 = Math.max(0, s0 - k * 0.012), f1 = Math.max(0, s0 - (k + 1) * 0.012);
      const a0 = at3(f0), a1 = at3(f1);
      if (P.seg(a0[0], a0[1], a0[2], a1[0], a1[1], a1[2])) LINES.add(1 - k / 44, P.sx, P.sy, P.sx2, P.sy2);
    }
    LINES.flush(ctx, WARM, 1, 2);
    const hd = at3(Math.min(1, s0));
    if (P.p(hd[0], hd[1], hd[2])) {
      const s2 = clamp(10 + 160 / Math.max(P.sz, 2), 10, 40);
      ctx.globalAlpha = 1;
      ctx.drawImage(glow(WARM), P.sx - s2, P.sy - s2, s2 * 2, s2 * 2);
    }
  }
}

function circleAt(cx: number, y: number, cz: number, r: number, segs: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < segs; i++) { const th = (i / segs) * Math.PI * 2; out.push([cx + r * Math.cos(th), y, cz + r * Math.sin(th)]); }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------

function drawLabels(ctx: CanvasRenderingContext2D, w: World, t: number) {
  for (const L of [...LABELS, ...EXTRA_LABELS]) {
    const a = smoother(ramp(t, L.t0, L.t0 + 0.7)) * (1 - smoother(ramp(t, L.t1 - 0.7, L.t1)));
    if (a <= 0.01) continue;
    if ('wideOnly' in L && L.wideOnly && P.H > P.W * 1.05) continue;
    const an = L.anchor(w);
    if (!P.p(an[0], an[1], an[2])) continue;
    const x = P.sx, y = P.sy;
    if (x < -50 || x > P.W + 50 || y < -50 || y > P.H + 50) continue;
    // On a tall, narrow picture the words go below the point, clear of the captions and quotes that sit above.
    const tall = P.H > P.W * 1.05;
    // The words grow with a wider picture, so they stay readable when it is shown large.
    const ls = clamp(P.W / 1280, 0.85, 1.6);
    const dx = (tall ? L.dx * 0.7 : L.dx) * ls, dy = (tall ? Math.abs(L.dy) * 0.8 : L.dy) * ls;
    const lx = x + dx, ly = y + dy;
    ctx.strokeStyle = rgba(PAPER, 0.8 * a);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * 0.5, ly); ctx.lineTo(lx, ly); ctx.stroke();
    ctx.fillStyle = rgba(PAPER, a);
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    const subFont = `500 ${19 * ls}px "Schibsted Grotesk Variable","Schibsted Grotesk",system-ui,sans-serif`;
    const titleFont = `700 ${17 * ls}px "Schibsted Grotesk Variable","Schibsted Grotesk",system-ui,sans-serif`;
    const spacing = `${2 * ls}px`;
    // Measure the whole block, so it can be put on whichever side of the leader it fits, and kept inside the picture.
    ctx.font = subFont;
    // A long line is broken to fit a narrow picture.
    const subLines: string[] = [];
    if (L.sub) {
      let line = '';
      for (const word of L.sub.split(' ')) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > Math.min(P.W - 40, 540 * ls)) { subLines.push(line); line = word; } else line = next;
      }
      if (line) subLines.push(line);
    }
    const subW = subLines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
    ctx.font = titleFont;
    (ctx as unknown as { letterSpacing: string }).letterSpacing = spacing;
    const titleW = ctx.measureText(L.text.toUpperCase()).width;
    const bw = Math.max(titleW, subW, 100) + 12;
    const rightX = lx + 6, leftX = lx - 6 - bw;
    const fits = (x: number) => x >= 14 && x + bw <= P.W - 14;
    let xs = dx >= 0 ? (fits(rightX) || !fits(leftX) ? rightX : leftX) : (fits(leftX) || !fits(rightX) ? leftX : rightX);
    xs = Math.max(14, Math.min(xs, P.W - 14 - bw));
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    // A soft dark halo, so the words stay legible over bright rooms.
    ctx.shadowColor = `rgba(8,7,6,${0.95 * a})`;
    ctx.shadowBlur = 8;
    ctx.fillStyle = rgba(PAPER, a);
    ctx.fillText(L.text.toUpperCase(), xs, ly - 4);
    (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
    ctx.textBaseline = 'top';
    ctx.font = subFont;
    ctx.fillStyle = rgba(PAPER, 0.84 * a);
    subLines.forEach((line, k) => ctx.fillText(line, xs, ly + 3 + k * 24 * ls));
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'rgba(0,0,0,0)';
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------

const fadeWindow = (t: number, a: number, b: number, edge: number) => smoother(ramp(t, a, a + edge)) * (1 - smoother(ramp(t, b - edge, b)));
const SANS = '"Schibsted Grotesk Variable","Schibsted Grotesk",system-ui,sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

/** Break a line of words to fit a width, as the labels do. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxW) { out.push(line); line = word; } else line = next;
  }
  if (line) out.push(line);
  return out;
}

/** Where the words of each callout stand, from the room it names: right and up, or left and down, so two at once do not meet. */
const CALL_OFFSET: Record<string, [number, number]> = {
  PHASEONE10841: [130, 80], c03220: [96, -70], 'PHASEONE[big]': [110, -90], '38148c': [100, -100], CURRENT: [-120, -90], MARB051: [-120, -70], JAN183411: [110, -90],
};

/**
 * Agents named on the picture: a ring on their room, and their handle exactly as the sources write it, with what the cast says they
 * did. Amber while they are not in the attack, red once they are.
 */
function drawCallouts(ctx: CanvasRenderingContext2D, w: World, t: number, hot: number) {
  for (const c of CALLOUTS) {
    const a = fadeWindow(t, c.t0, c.t1, 0.7);
    if (a <= 0.01) continue;
    const i = w.named[c.id];
    if (i === undefined || !P.p(w.x[i], 1.3, w.z[i])) continue;
    const x = P.sx, y = P.sy;
    if (x < -40 || x > P.W + 40 || y < -40 || y > P.H + 40) continue;
    const col = w.hotRank[i] < hot ? RED : WARM;
    const ls = clamp(P.W / 1280, 0.85, 1.6);
    const tall = P.H > P.W * 1.05;
    const [ox, oy] = CALL_OFFSET[c.id] ?? [90, -70];
    const dx = (tall ? ox * 0.7 : ox) * ls, dy = (tall ? Math.abs(oy) * 0.8 : oy) * ls;
    const lx = x + dx, ly = y + dy;
    const r = clamp(7 + 2400 / Math.max(P.sz, 60), 8, 28) * ls;
    const pulse = (t * 0.8) % 1;
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = rgba(col, 0.95 * a);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = rgba(col, 0.55 * a * (1 - pulse));
    ctx.beginPath(); ctx.arc(x, y, r * (1 + pulse * 1.4), 0, Math.PI * 2); ctx.stroke();
    const hyp = Math.hypot(dx, dy) || 1;
    ctx.strokeStyle = rgba(col, 0.8 * a);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + (dx / hyp) * r, y + (dy / hyp) * r); ctx.lineTo(x + dx * 0.5, ly); ctx.lineTo(lx, ly); ctx.stroke();
    const role = c.says ?? AGENT_BY_ID[c.id]?.role ?? '';
    ctx.font = `500 ${15 * ls}px ${SANS}`;
    const roleLines = wrapLines(ctx, role, Math.min(300 * ls, P.W - 40));
    const roleW = roleLines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
    ctx.font = `700 ${17 * ls}px ${MONO}`;
    const bw = Math.max(ctx.measureText(c.id).width, roleW, 90) + 12;
    const rightX = lx + 6, leftX = lx - 6 - bw;
    const fits = (xx: number) => xx >= 14 && xx + bw <= P.W - 14;
    let xs = dx >= 0 ? (fits(rightX) || !fits(leftX) ? rightX : leftX) : (fits(leftX) || !fits(rightX) ? leftX : rightX);
    xs = Math.max(14, Math.min(xs, P.W - 14 - bw));
    ctx.textAlign = 'left';
    ctx.shadowColor = `rgba(8,7,6,${0.95 * a})`;
    ctx.shadowBlur = 8;
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = rgba(col, a);
    ctx.fillText(c.id, xs, ly - 4);
    ctx.textBaseline = 'top';
    ctx.font = `500 ${15 * ls}px ${SANS}`;
    ctx.fillStyle = rgba(PAPER, 0.88 * a);
    roleLines.forEach((line, k) => ctx.fillText(line, xs, ly + 3 + k * 19 * ls));
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'rgba(0,0,0,0)';
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------

const GRID_COLS = 46;
/** Which of the tasks are the unsolved ones is drawing: only how many is data. */
const UNSOLVED = (() => {
  const order = shuffled(TASKS.total, 31);
  const set = new Set<number>();
  for (let k = 0; k < TASKS.unsolved; k++) set.add(order[k]);
  return set;
})();

/**
 * The test's tasks as a grid of small squares, one for each; then the ones no OpenAI model had ever solved, in amber. Later, a
 * hundred squares for the tasks the board discussed, and how many of every hundred came from the unsolved ones. Both are
 * drawing: how many, and nothing about which.
 */
function drawTaskGrid(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const g = fadeWindow(t, TASK_GRID.t0, TASK_GRID.t1, 0.9);
  const f = fadeWindow(t, WAFFLE.t0, WAFFLE.t1, 0.9);
  if (g <= 0.01 && f <= 0.01) return;
  const tall = H > W * 1.05;
  const ls = clamp(W / 1280, 0.85, 1.6);
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.textAlign = 'left';
  const heading = (text: string, x: number, y: number, a: number) => {
    ctx.font = `700 ${15.5 * ls}px ${SANS}`;
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${2 * ls}px`;
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = `rgba(8,7,6,${0.9 * a})`; ctx.shadowBlur = 8;
    ctx.fillStyle = rgba(PAPER, 0.9 * a);
    ctx.fillText(text.toUpperCase(), x, y);
    (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
    ctx.shadowBlur = 0;
  };
  const legend = (items: [RGB, string, boolean][], x: number, y: number, a: number) => {
    ctx.font = `500 ${17 * ls}px ${SANS}`;
    ctx.textBaseline = 'middle';
    let xx = x;
    for (const [col, text, filled] of items) {
      const s = 11 * ls;
      ctx.strokeStyle = rgba(col, 0.9 * a); ctx.fillStyle = rgba(col, 0.9 * a); ctx.lineWidth = 1.2;
      if (filled) ctx.fillRect(xx, y - s / 2, s, s); else ctx.strokeRect(xx + 0.5, y - s / 2 + 0.5, s - 1, s - 1);
      ctx.shadowColor = `rgba(8,7,6,${0.9 * a})`; ctx.shadowBlur = 8;
      ctx.fillStyle = rgba(PAPER, 0.88 * a);
      ctx.fillText(text, xx + s + 6 * ls, y);
      ctx.shadowBlur = 0;
      xx += s + 6 * ls + ctx.measureText(text).width + 18 * ls;
    }
  };

  if (g > 0.01) {
    const gw = tall ? W * 0.86 : W * 0.43, x0 = tall ? W * 0.07 : W * 0.53;
    const pitch = gw / GRID_COLS, rows = Math.ceil(TASKS.total / GRID_COLS), gh = pitch * rows;
    const y0 = tall ? H * 0.6 : H * 0.3;
    const mark = smoother(ramp(t, TASK_GRID.unsolvedAt, TASK_GRID.unsolvedAt + 1.4));
    const size = pitch * 0.68;
    // Cells appear in a sweep, row by row, then the unsolved ones turn amber.
    for (let k = 0; k < TASKS.total; k++) {
      const appear = smoother(ramp(t, TASK_GRID.t0 + (k / TASKS.total) * 1.8, TASK_GRID.t0 + (k / TASKS.total) * 1.8 + 0.3));
      if (appear <= 0.01) continue;
      const x = x0 + (k % GRID_COLS) * pitch, y = y0 + Math.floor(k / GRID_COLS) * pitch;
      const open = UNSOLVED.has(k);
      const m = open ? clamp(mark * 1.6 - (k % 7) * 0.05) : 0;
      ctx.fillStyle = m > 0 ? rgba(WARM, (0.35 + 0.6 * m) * appear * g) : rgba(PAPER, (open ? 0.3 : 0.3 - 0.1 * mark) * appear * g);
      ctx.fillRect(x, y, size, size);
    }
    heading('ExploitGym tasks', x0, y0 - 10 * ls, g);
    if (mark > 0.05) legend([[WARM, 'never solved by an OpenAI model', true], [PAPER, 'the rest', false]], x0, y0 + gh + 18 * ls, g * mark);
  }

  if (f > 0.01) {
    const n = 10;
    const ww = tall ? W * 0.42 : W * 0.24, x0 = tall ? (W - ww) / 2 : W * 0.06;
    const pitch = ww / n, y0 = tall ? H * 0.53 : H * 0.24, size = pitch * 0.78;
    const fill = (ramp(t, WAFFLE.t0 + 2.4, WAFFLE.t0 + 4.4)) * TASKS.sharePercent;
    for (let k = 0; k < n * n; k++) {
      const x = x0 + (k % n) * pitch, y = y0 + Math.floor(k / n) * pitch;
      const amber = k < Math.floor(fill + 0.0001);
      ctx.fillStyle = amber ? rgba(WARM, 0.95 * f) : rgba(PAPER, (k < TASKS.sharePercent ? 0.28 : 0.55) * f);
      ctx.fillRect(x, y, size, size);
    }
    heading('Tasks the board discussed', x0, y0 - 10 * ls, f);
    legend([[WARM, 'from the 198 never solved', true], [PAPER, 'any other task', true]], tall ? W * 0.06 : x0, y0 + ww + 18 * ls, f * smoother(ramp(t, WAFFLE.t0 + 3.6, WAFFLE.t0 + 4.8)));
  }
  ctx.restore();
}

const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** Dust in the air near the camera, so a still corridor still has depth. Drifts, and is the same in every render. */
function drawDust(ctx: CanvasRenderingContext2D, t: number) {
  if (P.py > 40) return;
  const fade = clamp(1 - (P.py - 6) / 30);
  const N = 240, box = 44;
  ctx.fillStyle = rgba(WARM, 1);
  for (let i = 0; i < N; i++) {
    const ox = hash(i * 3 + 1) * box, oz = hash(i * 3 + 2) * box;
    const dx = (hash(i * 3 + 3) - 0.5) * 0.4, dz = (hash(i * 7 + 5) - 0.5) * 0.4;
    const x = P.px + ((((ox + dx * t - P.px) % box) + box) % box) - box / 2;
    const z = P.pz + ((((oz + dz * t - P.pz) % box) + box) % box) - box / 2;
    const y = 0.4 + hash(i * 5 + 9) * 6 + Math.sin(t * 0.3 + i) * 0.15;
    if (!P.p(x, y, z)) continue;
    const a = clamp(0.5 - P.sz / 60) * fade * (0.4 + 0.6 * hash(i + 77)) * 0.5;
    if (a <= 0.01) continue;
    ctx.globalAlpha = a;
    const sz = clamp(70 / P.sz, 0.8, 2.6);
    ctx.fillRect(P.sx, P.sy, sz, sz);
  }
  ctx.globalAlpha = 1;
}

/**
 * The question the film ends on, drawn: far beyond the dark hall, towns of faint lights come on one by one while the film asks who is watching and says it is
 * everyone's question, until a ring of them surrounds it. Where they stand and how many there are is drawing, not data (the film says so on screen); nothing is claimed by them.
 */
const TOWNS = (() => {
  const out: { x: number; z: number; sigma: number; n: number; start: number }[] = [];
  const N = 30;
  for (let k = 0; k < N; k++) {
    const ang = ((k + hash(k * 17 + 4) * 0.8) / N) * Math.PI * 2;
    const r = 640 + hash(k * 29 + 6) * 760;
    out.push({ x: Math.cos(ang) * r, z: Math.sin(ang) * r, sigma: 45 + hash(k * 31 + 8) * 95, n: 10 + Math.floor(hash(k * 37 + 2) * 16), start: hash(k * 41 + 5) * 0.7 });
  }
  return out;
})();

function drawWatchers(ctx: CanvasRenderingContext2D, t: number) {
  const g = watchGlow(t);
  if (g <= 0.005) return;
  const paper = glow(PAPER), warm = glow(WARM);
  const every = LITE ? 2 : 1;
  for (let k = 0; k < TOWNS.length; k++) {
    const town = TOWNS[k];
    // A town comes on over a stretch of the way, its lights one after another.
    const t0 = town.start, t1 = town.start + 0.3;
    if (g <= t0) continue;
    for (let j = 0; j < town.n; j += every) {
      const h = hash(k * 101 + j * 7 + 13);
      const on = smoother(ramp(g, t0 + h * 0.8 * (t1 - t0), t0 + h * 0.8 * (t1 - t0) + 0.2 * (t1 - t0) + 0.01));
      if (on <= 0.01) continue;
      // A light stands near the middle of its town more often than at the edge.
      const rr = (hash(k * 53 + j * 3 + 1) + hash(k * 59 + j * 5 + 2) - 1) * town.sigma * 1.6;
      const aa = hash(k * 61 + j * 11 + 3) * Math.PI * 2;
      if (!P.p(town.x + Math.cos(aa) * rr, 6 + hash(k * 67 + j) * 30, town.z + Math.sin(aa) * rr)) continue;
      const big = 0.7 + 0.6 * hash(k * 71 + j * 13 + 9);
      const s = clamp(3.2 + 6200 / Math.max(P.sz, 500), 3.5, 12) * big;
      ctx.globalAlpha = Math.min(1, 0.9 * on * (0.6 + 0.4 * hash(k * 73 + j * 17 + 5)) * (0.88 + 0.12 * Math.sin(t * 0.7 + k * 3 + j)));
      ctx.drawImage(hash(k * 79 + j * 19 + 7) < 0.3 ? warm : paper, P.sx - s, P.sy - s, s * 2, s * 2);
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * The people responsible for the test: a small building with one dim window, outside the fence. Nothing travels to it. A few rooms in the
 * hall flicker once and go back to normal: an agent that considered telling someone, and did not pursue it. The sources do not say
 * anyone was watching, so the window is only dim, never bright.
 */
function drawPeople(ctx: CanvasRenderingContext2D, w: World, fog: (z: number) => number, t: number) {
  const g = peopleGlow(t);
  if (g <= 0.01) return;
  const b = w.people.box;
  boxEdges(b, LINES, fog, g, 1.15);
  LINES.flush(ctx, PAPER, 0.55);
  // The window faces the hall.
  const ax = Math.atan2(-b.c[2], -b.c[0]);
  const nx = Math.cos(ax), nz = Math.sin(ax);
  const tx = -nz, tz = nx;
  const fx = b.c[0] + nx * (b.d / 2 + 0.3), fz = b.c[2] + nz * (b.d / 2 + 0.3);
  const quad: V3[] = [[fx - tx * 9, 8, fz - tz * 9], [fx + tx * 9, 8, fz + tz * 9], [fx + tx * 9, 20, fz + tz * 9], [fx - tx * 9, 20, fz - tz * 9]];
  const pts: { x: number; y: number }[] = [];
  let ok = true;
  for (const q of quad) { if (!P.p(q[0], q[1], q[2])) { ok = false; break; } pts.push({ x: P.sx, y: P.sy }); }
  if (ok) {
    ctx.fillStyle = rgba(WARM, 0.3 * g * fog(P.sz));
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let k = 1; k < 4; k++) ctx.lineTo(pts[k].x, pts[k].y); ctx.closePath(); ctx.fill();
  }
  if (P.p(fx, 14, fz)) {
    const s = clamp(30 + 7000 / Math.max(P.sz, 60), 30, 130);
    ctx.globalAlpha = 0.28 * g;
    ctx.drawImage(glow(WARM), P.sx - s, P.sy - s, s * 2, s * 2);
    ctx.globalAlpha = 1;
  }
  // A few rooms flicker once each, in place.
  for (let k = 0; k < 4; k++) {
    const i = w.byJoinRank[38 + k * 3];
    if (w.stopRank[i] < stopCount(t)) continue;
    const u = (t - S('silence', 4 + k * 1.6)) / 1.6;
    if (u <= 0 || u >= 1) continue;
    if (!P.p(w.x[i], 1.3, w.z[i])) continue;
    const pulse = Math.sin(u * Math.PI);
    const s = clamp(8 + 1600 / Math.max(P.sz, 60), 10, 34) * (0.6 + pulse * 0.9);
    ctx.globalAlpha = 0.85 * pulse * g;
    ctx.drawImage(glow(WARM), P.sx - s, P.sy - s, s * 2, s * 2);
    ctx.globalAlpha = 1;
  }
}
