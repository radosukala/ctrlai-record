/**
 * Draws the model city: a scale model on a table, lit by one lamp. Canvas2D, painter's order, shaded faces, cast shadows,
 * LED windows with bloom, tilt-shift focus. Uses the film's own camera and projection (components/incident/film/math.ts),
 * so a later film can reuse the same engine. A pure function of its inputs: the same state always gives the same picture.
 */
import { Proj, clamp, lerp, smooth, rng, type V3 } from '../incident/film/math';
import type { Box, City } from './city';

type RGB = [number, number, number];
export type Token = { x: number; z: number; r?: number; h?: number; label?: string; hue?: 'accent' | 'paper'; ring?: boolean };
export type Peg = { x: number; z: number; tone: number; /** 0..1: how much of the person has arrived (fades and grows in) */ a?: number };
export type CarState = { x: number; z: number; alongX: boolean; dir: 1 | -1; tone: number; mode: 'moving' | 'stopped' | 'off'; /** 0..1, for a car at the end of its street */ a?: number };
export type Annot = { x: number; y: number; z: number; text: string; dx: number; dy: number; accent?: boolean; align?: 'left' | 'right'; /** 0..1 */ a?: number };
export type Ring = { x: number; z: number; r: number; dash?: boolean; /** 0..1 */ a?: number };
export type Light = { x: number; y: number; z: number; r: number; color: RGB; a: number };
export type State = {
  cam: { pos: V3; look: V3; fov: number; roll?: number; shift?: number };
  /** Electric power at a point of the board, 0 (dark) to 1 (normal evening). */
  power: (x: number, z: number) => number;
  lamp: V3;
  lampPower: number;
  ambient: number;
  pegs: Peg[];
  tokens: Token[];
  annots: Annot[];
  lights: Light[];
  rings?: Ring[];
  pools?: { x: number; z: number; r: number; col: RGB; a: number }[];
  blur: { y: number; band: number; amount: number } | null;
  bloom: number;
  cars: 'moving' | 'stopped' | 'none';
  /** Cars with their own state (moving ones advance, stopped ones stay): when given, it replaces the city's cars. */
  carList?: CarState[];
  /** The room lamp's colour and the fill colour, when they are not the evening's (a cold dawn, for instance). */
  lampColor?: RGB;
  ambientColor?: RGB;
  /** Extra scenery for one scene: a table and chairs, say. */
  extraBoxes?: Box[];
  /** 0..1: the share of windows that switch on and off now and then (people at home). */
  flicker?: number;
  /** Cars queued at a point, in a line: [x, z, dx, dz, count] */
  queues?: [number, number, number, number, number][];
  glass?: number;
  spot?: { pos: V3; target: V3; cone: number; soft: number; power: number; R: number; beam?: number };
  seed?: number;
};

const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB, a = 1) => `rgba(${Math.round(clamp(c[0], 0, 255))},${Math.round(clamp(c[1], 0, 255))},${Math.round(clamp(c[2], 0, 255))},${a})`;

const WARM: RGB = [255, 214, 150];
const COOL: RGB = [196, 226, 255];
const ACCENT: RGB = [96, 190, 255];
const LAMP_COLOR: RGB = [1.0, 0.93, 0.8];
const AMBIENT_COLOR: RGB = [0.46, 0.54, 0.74];

/** Work canvases are made once per size and reused: allocating several full-size canvases every frame is what made a frame slow. */
/** How well the cheap blurs resample. 'low' (bilinear) is plenty for a halving and far cheaper than 'high' without a GPU. */
export const QUALITY = { smoothing: 'low' as ImageSmoothingQuality };
const POOL = new Map<string, HTMLCanvasElement>();
function cleared(key: string, w: number, h: number) {
  const k = `${key}:${w}x${h}`;
  let c = POOL.get(k);
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; POOL.set(k, c); }
  const g = c.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = QUALITY.smoothing;
  g.clearRect(0, 0, w, h);
  return c;
}
/** A half-size, quarter-size… copy: drawing a canvas smaller and then larger is a cheap blur, with no filter. */
function mip(src: HTMLCanvasElement, key: string, w: number, h: number) {
  const c = cleared(key, w, h);
  c.getContext('2d')!.drawImage(src, 0, 0, src.width, src.height, 0, 0, w, h);
  return c;
}

export function drawModel(ctx: CanvasRenderingContext2D, W: number, H: number, city: City, st: State, t = 0) {
  const P = new Proj();
  const cam = { pos: st.cam.pos, look: st.cam.look, fov: st.cam.fov, roll: st.cam.roll ?? 0, shift: st.cam.shift ?? 0 };
  P.set(cam, W, H);
  const L = st.lamp;
  const camPos = st.cam.pos;

  const emit = cleared('emit', W, H); const ex = emit.getContext('2d')!;
  ex.globalCompositeOperation = 'lighter';
  const SW = Math.ceil(W / 4), SH = Math.ceil(H / 4);
  const sh = cleared('shadow', SW, SH); const sx = sh.getContext('2d')!;
  sx.setTransform(0.25, 0, 0, 0.25, 0, 0); // shadows are drawn at a quarter of the size and enlarged: soft edges for free
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = QUALITY.smoothing;

  // ---- light ----
  const lampR = 78;
  const lightAt = (nx: number, ny: number, nz: number, px: number, py: number, pz: number) => {
    const dx = L[0] - px, dy = L[1] - py, dz = L[2] - pz;
    const d = Math.hypot(dx, dy, dz) || 1;
    const diff = Math.max(0, (nx * dx + ny * dy + nz * dz) / d);
    const fall = 1 / (1 + (d / lampR) ** 2);
    let I = diff * fall * st.lampPower * 1.9;
    const sp = st.spot;
    if (sp) {
      const sdx = sp.pos[0] - px, sdy = sp.pos[1] - py, sdz = sp.pos[2] - pz;
      const sd = Math.hypot(sdx, sdy, sdz) || 1;
      const ax = sp.pos[0] - sp.target[0], ay = sp.pos[1] - sp.target[1], az = sp.pos[2] - sp.target[2];
      const al = Math.hypot(ax, ay, az) || 1;
      const cosA = (sdx * ax + sdy * ay + sdz * az) / (sd * al);
      const c0 = Math.cos(sp.cone), c1 = Math.cos(sp.cone + sp.soft);
      const cone = smooth(clamp((cosA - c1) / (c0 - c1), 0, 1));
      const sdiff = Math.max(0, (nx * sdx + ny * sdy + nz * sdz) / sd);
      I += sdiff * cone * sp.power * (1 / (1 + (sd / sp.R) ** 2)) * 1.9;
    }
    return I;
  };
  const LC = st.lampColor ?? LAMP_COLOR, AC = st.ambientColor ?? AMBIENT_COLOR;
  const shadeColor = (base: RGB, I: number): RGB => [
    base[0] * (AC[0] * st.ambient + LC[0] * I),
    base[1] * (AC[1] * st.ambient + LC[1] * I),
    base[2] * (AC[2] * st.ambient + LC[2] * I),
  ];
  const allBoxes = st.extraBoxes ? city.boxes.concat(st.extraBoxes) : city.boxes;

  // ---- screen helpers ----
  const poly = (pts: V3[], fill: string, stroke?: string, c = ctx) => {
    c.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (!P.p(pts[i][0], pts[i][1], pts[i][2])) return false;
      if (i === 0) c.moveTo(P.sx, P.sy); else c.lineTo(P.sx, P.sy);
    }
    c.closePath();
    c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
    return true;
  };

  // ---- the room and the table ----
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#06080b'); bg.addColorStop(0.55, '#0b0d10'); bg.addColorStop(1, '#14120f');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // The pool of lamp light on the table.
  if (P.p(L[0], -1.6, L[2])) {
    const g = ctx.createRadialGradient(P.sx, P.sy, 0, P.sx, P.sy, W * 0.62);
    g.addColorStop(0, `rgba(120,98,70,${0.34 * st.lampPower})`); g.addColorStop(0.5, `rgba(54,44,34,${0.2 * st.lampPower})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  const bx0 = -city.W / 2, bx1 = city.W / 2, bz0 = -city.D / 2, bz1 = city.D / 2, thick = 1.7;
  const faceTest0 = (n: V3, c: V3) => (camPos[0] - c[0]) * n[0] + (camPos[1] - c[1]) * n[1] + (camPos[2] - c[2]) * n[2] > 0;

  // The board's shadow on the table: soft, wider than the board, offset away from the lamp.
  {
    const TW = Math.ceil(W / 14), TH = Math.ceil(H / 14);
    const tcv = cleared('tshadow', TW, TH); const tc = tcv.getContext('2d')!;
    tc.setTransform(1 / 14, 0, 0, 1 / 14, 0, 0);
    const k = 0.14;
    const ox = (0 - L[0]) * k, oz = (0 - L[2]) * k;
    poly([[bx0 - 4 + ox, -thick, bz0 - 3 + oz], [bx1 + 4 + ox, -thick, bz0 - 3 + oz], [bx1 + 5 + ox, -thick, bz1 + 5 + oz], [bx0 - 5 + ox, -thick, bz1 + 5 + oz]], '#000', undefined, tc);
    ctx.save(); ctx.globalAlpha = 0.75; ctx.drawImage(tcv, 0, 0, TW, TH, 0, 0, W, H); ctx.restore();
  }

  // ---- the board: sides, then the top, tessellated so the lamp's falloff is exact in perspective ----
  const sideColor: RGB = [226, 221, 208];
  const sides: { n: V3; pts: V3[] }[] = [
    { n: [0, 0, 1], pts: [[bx0, -thick, bz1], [bx1, -thick, bz1], [bx1, 0, bz1], [bx0, 0, bz1]] },
    { n: [0, 0, -1], pts: [[bx1, -thick, bz0], [bx0, -thick, bz0], [bx0, 0, bz0], [bx1, 0, bz0]] },
    { n: [1, 0, 0], pts: [[bx1, -thick, bz1], [bx1, -thick, bz0], [bx1, 0, bz0], [bx1, 0, bz1]] },
    { n: [-1, 0, 0], pts: [[bx0, -thick, bz0], [bx0, -thick, bz1], [bx0, 0, bz1], [bx0, 0, bz0]] },
  ];
  for (const s of sides) {
    const c = s.pts[0];
    if ((camPos[0] - c[0]) * s.n[0] + (camPos[1] - c[1]) * s.n[1] + (camPos[2] - c[2]) * s.n[2] <= 0) continue;
    const I = lightAt(s.n[0], s.n[1], s.n[2], (s.pts[0][0] + s.pts[1][0]) / 2, -0.8, (s.pts[0][2] + s.pts[1][2]) / 2);
    poly(s.pts, css(shadeColor(sideColor, I)), 'rgba(0,0,0,0.25)');
  }

  const patch = (x0: number, z0: number, x1: number, z1: number, base: RGB, y = 0, step = 8, spec = 0) => {
    const nx = Math.max(1, Math.ceil((x1 - x0) / step)), nz = Math.max(1, Math.ceil((z1 - z0) / step));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const ax = lerp(x0, x1, i / nx), bx = lerp(x0, x1, (i + 1) / nx), az = lerp(z0, z1, j / nz), bz = lerp(z0, z1, (j + 1) / nz);
      const cxm = (ax + bx) / 2, czm = (az + bz) / 2;
      let I = lightAt(0, 1, 0, cxm, y, czm);
      if (spec) { // a glassy surface: a stronger answer along the lamp's reflection
        const rx = (cxm - camPos[0]), rz = (czm - camPos[2]);
        const lx = L[0] - cxm, lz = L[2] - czm;
        const align = Math.max(0, 1 - Math.hypot(rx / Math.hypot(rx, rz) + lx / Math.hypot(lx, lz), 0) * 0.35);
        I += spec * align * lightAt(0, 1, 0, cxm, y, czm) * 0.8;
      }
      const col = css(shadeColor(base, I));
      poly([[ax, y, az], [bx, y, az], [bx, y, bz], [ax, y, bz]], col, col);
    }
  };

  const boardBase: RGB = [118, 116, 110];
  patch(bx0, bz0, bx1, bz1, boardBase, 0, 7);

  // Block pads: a little lighter than the street.
  const padBase: RGB = [146, 143, 135];
  for (let i = 0; i < city.xs.length - 1; i++) for (let j = 0; j < city.zs.length - 1; j++) {
    const x0 = city.xs[i] + 1.5, x1 = city.xs[i + 1] - 1.5, z0 = city.zs[j] + 1.5, z1 = city.zs[j + 1] - 1.5;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (Math.abs(cz - city.river(cx)) < city.riverW / 2 + 5) continue;
    if (Math.hypot(cx - city.park.x, cz - city.park.z) < city.park.r + 4) continue;
    patch(x0, z0, x1, z1, padBase, 0.04, 8);
  }
  // The park.
  {
    const pk = city.park; const n = 36; const base: RGB = [112, 128, 98];
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
      const mx = pk.x + Math.cos((a0 + a1) / 2) * pk.r * 0.6, mz = pk.z + Math.sin((a0 + a1) / 2) * pk.r * 0.6;
      const col = css(shadeColor(base, lightAt(0, 1, 0, mx, 0.05, mz)));
      poly([[pk.x, 0.05, pk.z], [pk.x + Math.cos(a0) * pk.r, 0.05, pk.z + Math.sin(a0) * pk.r], [pk.x + Math.cos(a1) * pk.r, 0.05, pk.z + Math.sin(a1) * pk.r]], col, col);
    }
  }
  // The river, in glass.
  {
    const waterBase: RGB = [26, 38, 52];
    const step = 4;
    for (let x = bx0; x < bx1; x += step) {
      const za = city.river(x), zb = city.river(x + step), hw = city.riverW / 2;
      const mx = x + step / 2, mz = (za + zb) / 2;
      const I = lightAt(0, 1, 0, mx, 0.02, mz) * 1.6;
      const col = css(shadeColor(waterBase, I));
      poly([[x, 0.03, za - hw], [x + step, 0.03, zb - hw], [x + step, 0.03, zb + hw], [x, 0.03, za + hw]], col, col);
    }
    // glints
    ctx.lineWidth = 1;
    for (let k = 0; k < 7; k++) {
      const off = (k - 3) * 0.8;
      ctx.beginPath(); let started = false;
      for (let x = bx0; x <= bx1; x += 3) {
        if (!P.p(x, 0.05, city.river(x) + off + Math.sin(x * 0.3 + k) * 0.18)) { started = false; continue; }
        if (!started) { ctx.moveTo(P.sx, P.sy); started = true; } else ctx.lineTo(P.sx, P.sy);
      }
      ctx.strokeStyle = `rgba(200,225,255,${0.05 + 0.03 * st.lampPower})`; ctx.stroke();
    }
  }
  // Street centre lines on the avenues: short dashes.
  {
    ctx.lineWidth = 1;
    const dash = (ax: number, az: number, bxx: number, bzz: number) => {
      if (!P.p(ax, 0.03, az)) return; const s1x = P.sx, s1y = P.sy;
      if (!P.p(bxx, 0.03, bzz)) return;
      ctx.moveTo(s1x, s1y); ctx.lineTo(P.sx, P.sy);
    };
    ctx.beginPath();
    for (const z of city.zs) for (let x = bx0 + 3; x <= bx1 - 3; x += 4) {
      if (Math.abs(z - city.river(x)) < city.riverW / 2 + 0.6) continue;
      dash(x, z, x + 2, z);
    }
    for (const x of city.xs) for (let z = bz0 + 3; z <= bz1 - 3; z += 4) {
      if (Math.abs(z - city.river(x)) < city.riverW / 2 + 0.6) continue;
      dash(x, z, x, z + 2);
    }
    ctx.strokeStyle = `rgba(235,228,210,${0.16 + 0.08 * st.lampPower})`; ctx.stroke();
  }
  // The board's top edge catches the lamp: a thin bright line, like the cut edge of card.
  {
    ctx.save(); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    const edge = (a: V3, b: V3, n: V3) => {
      const c: V3 = [(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2];
      if (!faceTest0(n, c)) return;
      const I = lightAt(n[0], 0.6, n[2], c[0], 0, c[2]);
      if (!P.p(a[0], a[1], a[2])) return; const x1 = P.sx, y1 = P.sy; if (!P.p(b[0], b[1], b[2])) return;
      ctx.strokeStyle = `rgba(255,246,228,${clamp(0.25 + I * 0.9, 0.2, 0.95)})`; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(P.sx, P.sy); ctx.stroke();
    };
    edge([bx0, 0, bz1], [bx1, 0, bz1], [0, 0, 1]); edge([bx1, 0, bz1], [bx1, 0, bz0], [1, 0, 0]); edge([bx0, 0, bz0], [bx0, 0, bz1], [-1, 0, 0]); edge([bx1, 0, bz0], [bx0, 0, bz0], [0, 0, -1]);
    ctx.restore();
  }
  // The printed edge of the map: tick marks and grid letters along the board's margin.
  {
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(235,228,210,0.35)';
    const m = 2.4;
    ctx.beginPath();
    for (let x = bx0 + 8; x < bx1; x += 8) {
      for (const z of [bz0 + 0.7, bz1 - 0.7]) {
        if (P.p(x, 0.05, z)) { ctx.moveTo(P.sx, P.sy); if (P.p(x, 0.05, z + (z < 0 ? m : -m) * 0.4)) ctx.lineTo(P.sx, P.sy); }
      }
    }
    for (let z = bz0 + 8; z < bz1; z += 8) {
      for (const x of [bx0 + 0.7, bx1 - 0.7]) {
        if (P.p(x, 0.05, z)) { ctx.moveTo(P.sx, P.sy); if (P.p(x + (x < 0 ? m : -m) * 0.4, 0.05, z)) ctx.lineTo(P.sx, P.sy); }
      }
    }
    ctx.stroke();
  }

  // ---- shadows of every building, drawn once, softened, laid on the ground ----
  const shadowPoly = (pts: [number, number, number][]) => {
    // convex hull of ground points (x, z) of footprint and displaced top
    const g: [number, number][] = [];
    for (const [x, y, z] of pts) {
      const k = L[1] / Math.max(1, (L[1] - y));
      g.push([L[0] + (x - L[0]) * k, L[2] + (z - L[2]) * k]);
    }
    return g;
  };
  const hull = (pts: [number, number][]) => {
    const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo: [number, number][] = [], up: [number, number][] = [];
    for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (const q of [...p].reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  };
  for (const b of allBoxes) {
    if (b.kind === 'canopy') continue;
    const top = b.y0 + b.h + (b.roof ? b.roof.rh : 0);
    if (top >= L[1] - 4) continue;
    const pts: [number, number, number][] = [];
    for (const x of [b.x0, b.x1]) for (const z of [b.z0, b.z1]) { pts.push([x, 0, z]); pts.push([x, top, z]); }
    const hh = hull(shadowPoly(pts));
    sx.beginPath();
    let ok = true;
    hh.forEach(([x, z], i) => { if (!P.p(x, 0.06, z)) ok = false; else if (i === 0) sx.moveTo(P.sx, P.sy); else sx.lineTo(P.sx, P.sy); });
    if (ok) { sx.closePath(); sx.fillStyle = '#000'; sx.fill(); }
  }
  // The buildings' shadows, clipped to the board top and softened.
  ctx.save();
  ctx.beginPath();
  const corners: V3[] = [[bx0, 0, bz0], [bx1, 0, bz0], [bx1, 0, bz1], [bx0, 0, bz1]];
  corners.forEach((c, i) => { P.p(c[0], c[1], c[2]); if (i === 0) ctx.moveTo(P.sx, P.sy); else ctx.lineTo(P.sx, P.sy); });
  ctx.closePath(); ctx.clip();
  ctx.globalAlpha = 0.5;
  ctx.drawImage(sh, 0, 0, SW, SH, 0, 0, W, H);
  ctx.restore();

  // ---- the things on the board, far to near ----
  type Item = { d: number; y: number; draw: () => void };
  const items: Item[] = [];
  const gd = (x: number, z: number) => Math.hypot(x - camPos[0], z - camPos[2]);

  const faceTest = (n: V3, c: V3) => (camPos[0] - c[0]) * n[0] + (camPos[1] - c[1]) * n[1] + (camPos[2] - c[2]) * n[2] > 0;
  const lit = (b: Box) => (b.backup ? 1 : st.power((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2));

  const stoneOf = (b: Box): RGB => {
    const t = b.tone;
    switch (b.kind) {
      case 'tower': return mix([206, 204, 200], [236, 232, 224], t);
      case 'mid': return mix([198, 192, 182], [226, 220, 208], t);
      case 'house': return mix([214, 205, 190], [232, 224, 210], t);
      case 'shed': return mix([170, 168, 162], [196, 192, 184], t);
      case 'hospital': return [238, 240, 240];
      case 'civic': return [236, 230, 216];
      case 'shop': return mix([198, 194, 186], [220, 214, 202], t);
      case 'sub': return [112, 114, 118];
      case 'canopy': return [232, 232, 230];
    }
  };
  const roofOf = (b: Box): RGB => (b.tone < 0.22 ? [142, 112, 98] : b.tone < 0.6 ? [104, 108, 116] : [128, 130, 134]);

  const occlude = (pts: V3[]) => { ex.save(); ex.globalCompositeOperation = 'destination-out'; poly(pts, '#000', undefined, ex); ex.restore(); };
  const drawFace = (pts: V3[], n: V3, base: RGB, edge = true) => {
    const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length] as V3, [0, 0, 0] as V3);
    if (!faceTest(n, c)) return false;
    let I = lightAt(n[0], n[1], n[2], c[0], c[1], c[2]);
    // light bounced up from the lit ground onto walls, fading with height
    if (Math.abs(n[1]) < 0.6) I += 0.3 * lightAt(0, 1, 0, c[0], 0, c[2]) * Math.max(0.2, 1 - c[1] / 14);
    const col = css(shadeColor(base, I));
    poly(pts, col, edge ? 'rgba(255,248,235,0.10)' : col);
    occlude(pts);
    return true;
  };

  const windowsOn = (b: Box, a: [number, number], bpt: [number, number], n: V3, axis: 'x' | 'z') => {
    // a, bpt: the face's two ends in the other axis (z for an x-face, x for a z-face)
    const len = Math.abs(bpt[0] - a[0]);
    const cell = b.kind === 'tower' ? 0.95 : b.kind === 'house' ? 1.2 : 1.05;
    const cols = Math.max(1, Math.floor((len - 0.6) / cell));
    const cellW = (len - 0.6) / cols;
    const winW = cellW * (b.kind === 'house' ? 0.5 : 0.52);
    const floorH = b.kind === 'house' ? 0.75 : 0.95;
    const rows = Math.max(1, Math.floor((b.h - (b.y0 > 0 ? 0.3 : 0.8)) / floorH));
    const baseY = b.y0 + (b.y0 > 0 ? 0.25 : 0.65);
    const p = lit(b);
    const ph = (b.kind === 'house' ? 0.36 : 0.52);
    const sign = a[0] < bpt[0] ? 1 : -1;
    for (let c = 0; c < cols; c++) {
      const u0 = a[0] + sign * (0.3 + c * cellW + (cellW - winW) / 2);
      const u1 = u0 + sign * winW;
      for (let r = 0; r < rows; r++) {
        const key = b.id * 1009 + c * 31 + r * 17 + (axis === 'x' ? 5 : 0) + (n[0] + n[2] > 0 ? 3 : 0);
        if (hash(key) > b.win) continue; // no window here
        const v0 = baseY + r * floorH, v1 = v0 + ph;
        let on = hash(key + 0.37) < (p > 0.02 ? Math.min(1, p * 1.05) : 0) * (b.kind === 'house' ? 0.62 : b.kind === 'tower' ? 0.5 : 0.62);
        // people at home: a few windows go on or off now and then
        if (st.flicker && p > 0.5 && hash(key + 7.7) < st.flicker) {
          const period = 5 + 9 * hash(key + 3.3);
          if (Math.floor((t + hash(key + 1.1) * period) / period) % 2 === 1) on = !on;
        }
        const eps = 0.012;
        const pts: V3[] = axis === 'x'
          ? [[n[0] > 0 ? b.x1 + eps : b.x0 - eps, v0, u0], [n[0] > 0 ? b.x1 + eps : b.x0 - eps, v0, u1], [n[0] > 0 ? b.x1 + eps : b.x0 - eps, v1, u1], [n[0] > 0 ? b.x1 + eps : b.x0 - eps, v1, u0]]
          : [[u0, v0, n[2] > 0 ? b.z1 + eps : b.z0 - eps], [u1, v0, n[2] > 0 ? b.z1 + eps : b.z0 - eps], [u1, v1, n[2] > 0 ? b.z1 + eps : b.z0 - eps], [u0, v1, n[2] > 0 ? b.z1 + eps : b.z0 - eps]];
        if (on) {
          const onGenerator = !!b.backup && st.power((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2) < 0.5;
          const cool = onGenerator || hash(key + 9.1) < 0.1;
          const col = cool ? mix(COOL, [255, 255, 255], 0.2) : mix(WARM, [255, 244, 214], hash(key + 4.4) * 0.5);
          const k = 0.7 + 0.3 * hash(key + 1.9);
          poly(pts, css(col, k));
          poly(pts, css(col, 0.9), undefined, ex);
        } else if (st.glass !== 0) {
          poly(pts, 'rgba(26,32,44,0.55)');
        }
      }
    }
  };

  const drawBox = (b: Box) => () => {
    const y1 = b.y0 + b.h;
    const stone = stoneOf(b);
    // walls
    const walls: { n: V3; pts: V3[]; axis: 'x' | 'z'; ends: [[number, number], [number, number]] }[] = [
      { n: [0, 0, 1], axis: 'z', pts: [[b.x0, b.y0, b.z1], [b.x1, b.y0, b.z1], [b.x1, y1, b.z1], [b.x0, y1, b.z1]], ends: [[b.x0, 0], [b.x1, 0]] },
      { n: [0, 0, -1], axis: 'z', pts: [[b.x1, b.y0, b.z0], [b.x0, b.y0, b.z0], [b.x0, y1, b.z0], [b.x1, y1, b.z0]], ends: [[b.x1, 0], [b.x0, 0]] },
      { n: [1, 0, 0], axis: 'x', pts: [[b.x1, b.y0, b.z1], [b.x1, b.y0, b.z0], [b.x1, y1, b.z0], [b.x1, y1, b.z1]], ends: [[b.z1, 0], [b.z0, 0]] },
      { n: [-1, 0, 0], axis: 'x', pts: [[b.x0, b.y0, b.z0], [b.x0, b.y0, b.z1], [b.x0, y1, b.z1], [b.x0, y1, b.z0]], ends: [[b.z0, 0], [b.z1, 0]] },
    ];
    for (const w of walls) {
      if (!drawFace(w.pts, w.n, stone)) continue;
      if (b.kind === 'sub' || b.kind === 'canopy') continue;
      // Do the windows only if the face is big enough to show them
      let ok = true; let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
      for (const q of w.pts) { if (!P.p(q[0], q[1], q[2])) { ok = false; break; } minx = Math.min(minx, P.sx); maxx = Math.max(maxx, P.sx); miny = Math.min(miny, P.sy); maxy = Math.max(maxy, P.sy); }
      if (!ok || (maxx - minx) * (maxy - miny) < 90) continue;
      windowsOn(b, w.ends[0] as [number, number], w.ends[1] as [number, number], w.n, w.axis);
    }
    // roof
    if (b.roof) {
      const { rh, alongX } = b.roof;
      const roof = roofOf(b);
      const mx = (b.x0 + b.x1) / 2, mz = (b.z0 + b.z1) / 2;
      if (alongX) {
        drawFace([[b.x0, y1, b.z1], [b.x1, y1, b.z1], [b.x1, y1 + rh, mz], [b.x0, y1 + rh, mz]], norm3([0, b.z1 - mz, rh]), roof);
        drawFace([[b.x1, y1, b.z0], [b.x0, y1, b.z0], [b.x0, y1 + rh, mz], [b.x1, y1 + rh, mz]], norm3([0, mz - b.z0, -rh]), roof);
        drawFace([[b.x1, y1, b.z1], [b.x1, y1, b.z0], [b.x1, y1 + rh, mz]], [1, 0, 0], stone);
        drawFace([[b.x0, y1, b.z0], [b.x0, y1, b.z1], [b.x0, y1 + rh, mz]], [-1, 0, 0], stone);
      } else {
        drawFace([[b.x1, y1, b.z0], [b.x1, y1, b.z1], [mx, y1 + rh, b.z1], [mx, y1 + rh, b.z0]], norm3([rh, b.x1 - mx, 0]), roof);
        drawFace([[b.x0, y1, b.z1], [b.x0, y1, b.z0], [mx, y1 + rh, b.z0], [mx, y1 + rh, b.z1]], norm3([-rh, mx - b.x0, 0]), roof);
        drawFace([[b.x1, y1, b.z1], [b.x0, y1, b.z1], [mx, y1 + rh, b.z1]], [0, 0, 1], stone);
        drawFace([[b.x0, y1, b.z0], [b.x1, y1, b.z0], [mx, y1 + rh, b.z0]], [0, 0, -1], stone);
      }
    } else {
      const top: RGB = b.kind === 'hospital' ? [244, 246, 248] : stone;
      drawFace([[b.x0, y1, b.z0], [b.x1, y1, b.z0], [b.x1, y1, b.z1], [b.x0, y1, b.z1]], [0, 1, 0], mix(top, [255, 252, 244], 0.12));
    }
  };
  const norm3 = (v: number[]): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

  /** True when every corner is in front of the camera and the whole box lies outside the picture: nothing to draw. */
  const offscreen = (b: Box) => {
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    const top = b.y0 + b.h + (b.roof ? b.roof.rh : 0);
    for (const x of [b.x0, b.x1]) for (const z of [b.z0, b.z1]) for (const y of [b.y0, top]) {
      if (!P.p(x, y, z)) return false;
      if (P.sx < minx) minx = P.sx; if (P.sx > maxx) maxx = P.sx; if (P.sy < miny) miny = P.sy; if (P.sy > maxy) maxy = P.sy;
    }
    const m = 80;
    return maxx < -m || minx > W + m || maxy < -m || miny > H + m;
  };
  for (const b of allBoxes) {
    if (offscreen(b)) continue;
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    items.push({ d: gd(cx, cz), y: b.y0, draw: drawBox(b) });
  }

  // Trees: little cones and balls.
  const treeBase = (t: { tone: number }): RGB => mix([84, 104, 78], [112, 126, 92], t.tone);
  for (const t of city.trees) {
    items.push({ d: gd(t.x, t.z), y: 0, draw: () => {
      const c = shadeColor(treeBase(t), lightAt(0, 1, 0, t.x, t.h, t.z) * 0.8);
      if (!P.p(t.x, 0, t.z)) return; const bx = P.sx, by = P.sy, sc = P.f / P.sz;
      if (!P.p(t.x, t.h, t.z)) return; const ty = P.sy;
      if (by - ty < 1) return;
      const rr = t.r * sc;
      ctx.fillStyle = css(mix(c, [30, 40, 28], 0.35)); ctx.beginPath(); ctx.ellipse(bx, by - (by - ty) * 0.35, rr, (by - ty) * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = css(c); ctx.beginPath(); ctx.ellipse(bx - rr * 0.1, by - (by - ty) * 0.55, rr * 0.82, (by - ty) * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    } });
  }

  // Cars.
  const carBox = (x: number, z: number, alongX: boolean, tone: number, mode: 'moving' | 'stopped' | 'off', dir: 1 | -1) => {
    const l = 1.15, w = 0.55, h = 0.4;
    const x0 = x - (alongX ? l / 2 : w / 2), x1 = x + (alongX ? l / 2 : w / 2), z0 = z - (alongX ? w / 2 : l / 2), z1 = z + (alongX ? w / 2 : l / 2);
    const body: RGB = tone < 0.4 ? [196, 192, 186] : tone < 0.7 ? [120, 124, 130] : [226, 222, 214];
    const faces: { n: V3; pts: V3[] }[] = [
      { n: [0, 0, 1], pts: [[x0, 0, z1], [x1, 0, z1], [x1, h, z1], [x0, h, z1]] },
      { n: [0, 0, -1], pts: [[x1, 0, z0], [x0, 0, z0], [x0, h, z0], [x1, h, z0]] },
      { n: [1, 0, 0], pts: [[x1, 0, z1], [x1, 0, z0], [x1, h, z0], [x1, h, z1]] },
      { n: [-1, 0, 0], pts: [[x0, 0, z0], [x0, 0, z1], [x0, h, z1], [x0, h, z0]] },
      { n: [0, 1, 0], pts: [[x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1]] },
    ];
    for (const f of faces) drawFace(f.pts, f.n, body, false);
    // lamps: white at the front, red at the back
    const fx = alongX ? x + dir * l / 2 : x, fz = alongX ? z : z + dir * l / 2;
    const rx = alongX ? x - dir * l / 2 : x, rz = alongX ? z : z - dir * l / 2;
    if (mode === 'moving') {
      lamp3(fx, 0.18, fz, 0.9, [255, 240, 205], 0.9);
      lamp3(rx, 0.18, rz, 0.7, [255, 70, 50], 0.7);
    } else if (mode === 'stopped') {
      lamp3(rx, 0.18, rz, 0.7, [255, 70, 50], 0.55);
    }
  };
  const lamp3 = (x: number, y: number, z: number, r: number, col: RGB, a: number) => {
    if (!P.p(x, y, z)) return;
    const s = clamp((P.f / P.sz) * 0.06 * r, 0.9, 5.5);
    ctx.fillStyle = css(col, Math.min(1, a)); ctx.beginPath(); ctx.arc(P.sx, P.sy, s, 0, Math.PI * 2); ctx.fill();
    ex.fillStyle = css(col, a * 0.8); ex.beginPath(); ex.arc(P.sx, P.sy, s * 1.7, 0, Math.PI * 2); ex.fill();
  };
  if (st.cars !== 'none') {
    if (st.carList) {
      for (const c of st.carList) items.push({ d: gd(c.x, c.z), y: 0, draw: () => { if ((c.a ?? 1) < 1) { ctx.save(); ctx.globalAlpha = Math.max(0, c.a ?? 1); carBox(c.x, c.z, c.alongX, c.tone, c.mode, c.dir); ctx.restore(); } else carBox(c.x, c.z, c.alongX, c.tone, c.mode, c.dir); } });
    } else {
      for (const c of city.cars) items.push({ d: gd(c.x, c.z), y: 0, draw: () => carBox(c.x, c.z, c.alongX, c.tone, st.cars === 'stopped' ? 'stopped' : 'moving', c.dir) });
    }
    for (const q of st.queues ?? []) {
      const [qx, qz, dx, dz, n] = q;
      for (let k = 0; k < n; k++) {
        const x = qx + dx * k * 1.15, z = qz + dz * k * 1.15;
        items.push({ d: gd(x, z), y: 0, draw: () => carBox(x, z, Math.abs(dx) > 0, hash(k * 3.1 + qx), 'stopped', (dx + dz) > 0 ? 1 : -1) });
      }
    }
  }

  // Street lights: a bright point, and a pool of light on the street.
  const pool = (x: number, z: number, r: number, col: RGB, a: number) => {
    if (!P.p(x, 0.05, z)) return; const cx0 = P.sx, cy0 = P.sy;
    if (!P.p(x + r, 0.05, z)) return; const rx = Math.abs(P.sx - cx0);
    if (!P.p(x, 0.05, z + r)) return; const ry = Math.abs(P.sy - cy0);
    if (rx < 1.5 || ry < 0.5 || rx > W) return;
    ex.save(); ex.translate(cx0, cy0); ex.scale(1, Math.max(0.05, ry / rx));
    const g = ex.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, css(col, a)); g.addColorStop(0.45, css(col, a * 0.35)); g.addColorStop(1, css(col, 0));
    ex.fillStyle = g; ex.beginPath(); ex.arc(0, 0, rx, 0, Math.PI * 2); ex.fill(); ex.restore();
  };
  for (const s of city.streetLights) {
    const p = st.power(s.x, s.z);
    if (p < 0.3) continue;
    items.push({ d: gd(s.x, s.z), y: 0, draw: () => { lamp3(s.x, 1.1, s.z, 0.85, [255, 200, 120], 0.9 * Math.min(1, p)); pool(s.x, s.z, 3.4, [255, 190, 110], 0.3 * Math.min(1, p) * (1.15 - st.lampPower * 0.5)); } });
  }

  // Pylons and wires.
  for (let i = 0; i < city.pylons.length; i++) {
    const p = city.pylons[i];
    items.push({ d: gd(p.x, p.z), y: 0, draw: () => {
      const w = 0.9;
      const col = 'rgba(120,122,126,0.95)';
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, 1.4 * (P.f / Math.max(10, gd(p.x, p.z)) / 25));
      const seg = (a: V3, b: V3) => { if (P.seg(a[0], a[1], a[2], b[0], b[1], b[2])) { ctx.beginPath(); ctx.moveTo(P.sx, P.sy); ctx.lineTo(P.sx2, P.sy2); ctx.stroke(); } };
      for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) seg([p.x + dx * w, 0, p.z + dz * w], [p.x + dx * 0.25, p.h, p.z + dz * 0.25]);
      for (let k = 1; k < 5; k++) { const y = p.h * k / 5, s = w * (1 - k / 5) + 0.25 * (k / 5); seg([p.x - s, y, p.z - s], [p.x + s, y, p.z + s]); seg([p.x + s, y, p.z - s], [p.x - s, y, p.z + s]); }
      seg([p.x - 2.2, p.h * 0.82, p.z], [p.x + 2.2, p.h * 0.82, p.z]);
      const nxt = city.pylons[i + 1];
      if (nxt) {
        for (const o of [-2.2, 2.2]) {
          ctx.strokeStyle = 'rgba(150,150,150,0.55)'; ctx.lineWidth = 1;
          const a: V3 = [p.x + o * 0.2, p.h * 0.82, p.z + o], b: V3 = [nxt.x + o * 0.2, nxt.h * 0.82, nxt.z + o];
          const steps = 12; ctx.beginPath(); let started = false;
          for (let s = 0; s <= steps; s++) {
            const t = s / steps; const x = lerp(a[0], b[0], t), y = lerp(a[1], b[1], t) - 1.2 * Math.sin(t * Math.PI), z = lerp(a[2], b[2], t);
            if (!P.p(x, y, z)) { started = false; continue; }
            if (!started) { ctx.moveTo(P.sx, P.sy); started = true; } else ctx.lineTo(P.sx, P.sy);
          }
          ctx.stroke();
        }
      }
    } });
  }

  // Water tower.
  {
    const tk = city.tank;
    items.push({ d: gd(tk.x, tk.z), y: 0, draw: () => {
      ctx.strokeStyle = 'rgba(150,150,150,0.9)'; ctx.lineWidth = 1.3;
      for (let k = 0; k < tk.legs; k++) {
        const a = (k / tk.legs) * Math.PI * 2;
        if (P.seg(tk.x + Math.cos(a) * tk.r * 0.8, 0, tk.z + Math.sin(a) * tk.r * 0.8, tk.x + Math.cos(a) * tk.r, tk.h - 3.6, tk.z + Math.sin(a) * tk.r)) { ctx.beginPath(); ctx.moveTo(P.sx, P.sy); ctx.lineTo(P.sx2, P.sy2); ctx.stroke(); }
      }
      const n = 16;
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
        const nx = Math.cos(am), nz = Math.sin(am);
        if (!faceTest([nx, 0, nz], [tk.x + nx * tk.r, tk.h - 1.5, tk.z + nz * tk.r])) continue;
        const col = css(shadeColor([214, 210, 200], lightAt(nx, 0, nz, tk.x + nx * tk.r, tk.h - 1.8, tk.z + nz * tk.r)));
        poly([[tk.x + Math.cos(a0) * tk.r, tk.h - 3.6, tk.z + Math.sin(a0) * tk.r], [tk.x + Math.cos(a1) * tk.r, tk.h - 3.6, tk.z + Math.sin(a1) * tk.r], [tk.x + Math.cos(a1) * tk.r, tk.h, tk.z + Math.sin(a1) * tk.r], [tk.x + Math.cos(a0) * tk.r, tk.h, tk.z + Math.sin(a0) * tk.r]], col, col);
      }
      // cone lid
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
        const col = css(shadeColor([190, 186, 178], lightAt(Math.cos(am) * 0.5, 0.86, Math.sin(am) * 0.5, tk.x, tk.h + 1, tk.z)));
        poly([[tk.x + Math.cos(a0) * tk.r, tk.h, tk.z + Math.sin(a0) * tk.r], [tk.x + Math.cos(a1) * tk.r, tk.h, tk.z + Math.sin(a1) * tk.r], [tk.x, tk.h + 1.6, tk.z]], col, col);
      }
    } });
  }
  // Stadium: a ring wall, a lit pitch.
  {
    const s = city.stadium; const n = 28;
    items.push({ d: gd(s.x, s.z) - 6, y: 0, draw: () => {
      const pp = st.power(s.x, s.z);
      // pitch
      const pitch: RGB = [96, 118, 90];
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
        const c = css(mix(shadeColor(pitch, lightAt(0, 1, 0, s.x, 0.1, s.z)), WARM, pp * 0.25));
        poly([[s.x, 0.08, s.z], [s.x + Math.cos(a0) * s.r0, 0.08, s.z + Math.sin(a0) * s.r0], [s.x + Math.cos(a1) * s.r0, 0.08, s.z + Math.sin(a1) * s.r0]], c, c);
      }
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
        const nx = Math.cos(am), nz = Math.sin(am);
        // outer wall
        if (faceTest([nx, 0, nz], [s.x + nx * s.r1, s.h / 2, s.z + nz * s.r1])) {
          const c = css(shadeColor([214, 210, 200], lightAt(nx, 0, nz, s.x + nx * s.r1, s.h / 2, s.z + nz * s.r1)));
          poly([[s.x + Math.cos(a0) * s.r1, 0, s.z + Math.sin(a0) * s.r1], [s.x + Math.cos(a1) * s.r1, 0, s.z + Math.sin(a1) * s.r1], [s.x + Math.cos(a1) * s.r1, s.h, s.z + Math.sin(a1) * s.r1], [s.x + Math.cos(a0) * s.r1, s.h, s.z + Math.sin(a0) * s.r1]], c, c);
        }
        // inner wall (seen from inside)
        if (faceTest([-nx, 0, -nz], [s.x + nx * s.r0, s.h / 2, s.z + nz * s.r0])) {
          const c = css(shadeColor([196, 192, 184], lightAt(-nx, 0, -nz, s.x + nx * s.r0, s.h / 2, s.z + nz * s.r0)));
          poly([[s.x + Math.cos(a0) * s.r0, 0, s.z + Math.sin(a0) * s.r0], [s.x + Math.cos(a1) * s.r0, 0, s.z + Math.sin(a1) * s.r0], [s.x + Math.cos(a1) * s.r0, s.h, s.z + Math.sin(a1) * s.r0], [s.x + Math.cos(a0) * s.r0, s.h, s.z + Math.sin(a0) * s.r0]], c, c);
        }
        // rim
        const c2 = css(shadeColor([232, 228, 220], lightAt(0, 1, 0, s.x + nx * (s.r0 + s.r1) / 2, s.h, s.z + nz * (s.r0 + s.r1) / 2)));
        poly([[s.x + Math.cos(a0) * s.r0, s.h, s.z + Math.sin(a0) * s.r0], [s.x + Math.cos(a1) * s.r0, s.h, s.z + Math.sin(a1) * s.r0], [s.x + Math.cos(a1) * s.r1, s.h, s.z + Math.sin(a1) * s.r1], [s.x + Math.cos(a0) * s.r1, s.h, s.z + Math.sin(a0) * s.r1]], c2, c2);
      }
    } });
  }
  // Bridges.
  for (const bxm of city.bridges) {
    const zc = city.river(bxm), hw = city.riverW / 2 + 1.2;
    items.push({ d: gd(bxm, zc), y: 0, draw: () => {
      const b: Box = { id: 9000 + bxm, x0: bxm - 1.4, x1: bxm + 1.4, z0: zc - hw, z1: zc + hw, y0: 0.05, h: 0.35, kind: 'sub', win: 0, tone: 1 };
      drawBox(b)();
    } });
  }

  // Tokens: decision markers sitting on the board.
  for (const tk of st.tokens) {
    items.push({ d: gd(tk.x, tk.z) - 2, y: 0, draw: () => {
      const r = tk.r ?? 2, h = tk.h ?? 0.9, n = 22;
      const acc = tk.hue === 'paper' ? [244, 241, 234] as RGB : ACCENT;
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
        const nx = Math.cos(am), nz = Math.sin(am);
        if (!faceTest([nx, 0, nz], [tk.x + nx * r, h / 2, tk.z + nz * r])) continue;
        const c = css(mix(acc, [20, 40, 60], 0.35 + 0.3 * (nx * 0.5 + 0.5)));
        poly([[tk.x + Math.cos(a0) * r, 0, tk.z + Math.sin(a0) * r], [tk.x + Math.cos(a1) * r, 0, tk.z + Math.sin(a1) * r], [tk.x + Math.cos(a1) * r, h, tk.z + Math.sin(a1) * r], [tk.x + Math.cos(a0) * r, h, tk.z + Math.sin(a0) * r]], c, c);
      }
      const pts: V3[] = []; for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; pts.push([tk.x + Math.cos(a) * r, h, tk.z + Math.sin(a) * r]); }
      poly(pts, css(acc), 'rgba(255,255,255,0.7)');
      poly(pts, css(acc, 0.9), undefined, ex);
      // a halo on the board
      if (tk.ring) {
        ctx.save(); ctx.lineWidth = 1.6; ctx.strokeStyle = css(ACCENT, 0.9); ctx.beginPath();
        for (let k = 0; k <= 48; k++) { const a = (k / 48) * Math.PI * 2; if (!P.p(tk.x + Math.cos(a) * r * 2.1, 0.06, tk.z + Math.sin(a) * r * 2.1)) continue; if (k === 0) ctx.moveTo(P.sx, P.sy); else ctx.lineTo(P.sx, P.sy); }
        ctx.stroke(); ctx.restore();
      }
    } });
  }

  // People: pegs.
  for (const pg of st.pegs) {
    const pa = pg.a ?? 1;
    if (pa <= 0.01) continue;
    items.push({ d: gd(pg.x, pg.z), y: 0, draw: () => {
      if (!P.p(pg.x, 0, pg.z)) return; const bx = P.sx, by = P.sy, sc = P.f / P.sz;
      const h = 0.5 * sc * (0.55 + 0.45 * pa), w = 0.18 * sc * (0.55 + 0.45 * pa);
      ctx.save(); ctx.globalAlpha = pa;
      const I = lightAt(0, 1, 0, pg.x, 0.5, pg.z);
      const body = css(shadeColor([236, 232, 222], I * 0.9 + 0.1));
      const dark = css(shadeColor([150, 146, 138], I * 0.9));
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(bx + w * 0.5, by, w * 1.1, w * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      // a rounded-shoulder peg with a head above it; a darker side gives it volume
      const bodyPath = (k: number, off: number) => {
        ctx.beginPath();
        ctx.moveTo(bx - w * 0.62 * k + off, by);
        ctx.lineTo(bx + w * 0.62 * k + off, by);
        ctx.lineTo(bx + w * 0.5 * k + off, by - h * 0.46);
        ctx.quadraticCurveTo(bx + w * 0.5 * k + off, by - h * 0.64, bx + off, by - h * 0.64);
        ctx.quadraticCurveTo(bx - w * 0.5 * k + off, by - h * 0.64, bx - w * 0.5 * k + off, by - h * 0.46);
        ctx.closePath();
      };
      ctx.fillStyle = dark; bodyPath(1, 0); ctx.fill();
      ctx.fillStyle = body; bodyPath(0.82, -w * 0.08); ctx.fill();
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(bx - w * 0.04, by - h * 0.83, w * 0.46, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(bx + w * 0.16, by - h * 0.8, w * 0.3, -1.2, 1.7); ctx.fill();
      ctx.restore();
    } });
  }

  for (const l of st.lights) items.push({ d: gd(l.x, l.z) - 0.4, y: l.y, draw: () => lamp3(l.x, l.y, l.z, l.r, l.color, l.a) });
  for (const pl of st.pools ?? []) items.push({ d: gd(pl.x, pl.z) + 0.01, y: 0, draw: () => pool(pl.x, pl.z, pl.r, pl.col, pl.a) });
  items.sort((a, b) => b.d - a.d || a.y - b.y);
  for (const it of items) it.draw();

  // ---- rings on the board: the exercise's own pen ----
  for (const rg of st.rings ?? []) {
    ctx.save(); ctx.lineWidth = Math.max(1.5, W / 960); ctx.strokeStyle = css(ACCENT, 0.95 * (rg.a ?? 1)); ctx.setLineDash(rg.dash ? [W / 190, W / 275] : []);
    ctx.beginPath(); let started = false;
    for (let k = 0; k <= 120; k++) {
      const a = (k / 120) * Math.PI * 2; const x = rg.x + Math.cos(a) * rg.r, z = rg.z + Math.sin(a) * rg.r;
      if (x < bx0 || x > bx1 || z < bz0 || z > bz1) { started = false; continue; }
      if (!P.p(x, 0.12, z)) { started = false; continue; }
      if (!started) { ctx.moveTo(P.sx, P.sy); started = true; } else ctx.lineTo(P.sx, P.sy);
    }
    ctx.stroke(); ctx.restore();
  }


  // ---- the beam of a searching light ----
  const beamAmt = st.spot?.beam ?? 0;
  if (st.spot && beamAmt) {
    const sp = st.spot; const tgt = sp.target;
    const dist = Math.hypot(sp.pos[0] - tgt[0], sp.pos[1] - tgt[1], sp.pos[2] - tgt[2]);
    const rr = Math.tan(sp.cone + sp.soft * 0.5) * dist;
    const pts: [number, number][] = [];
    for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2; if (P.p(tgt[0] + Math.cos(a) * rr, 0, tgt[2] + Math.sin(a) * rr)) pts.push([P.sx, P.sy]); }
    if (pts.length > 10 && P.p(sp.pos[0], sp.pos[1], sp.pos[2])) {
      const ax = P.sx, ay = P.sy; P.p(tgt[0], 0, tgt[2]);
      const g = ctx.createLinearGradient(ax, ay, P.sx, P.sy);
      g.addColorStop(0, 'rgba(255,240,215,0)'); g.addColorStop(1, `rgba(255,240,215,${0.09 * beamAmt})`);
      const BW = Math.ceil(W / 6), BH = Math.ceil(H / 6);
      const bcv = cleared('beam', BW, BH); const bg = bcv.getContext('2d')!;
      bg.setTransform(1 / 6, 0, 0, 1 / 6, 0, 0);
      const g2 = bg.createLinearGradient(ax, ay, P.sx, P.sy);
      g2.addColorStop(0, 'rgba(255,240,215,0)'); g2.addColorStop(1, `rgba(255,240,215,${0.09 * beamAmt})`);
      bg.fillStyle = g2; bg.beginPath(); bg.moveTo(ax, ay);
      // the visible edge of the cone: tangent-ish points, the two extremes by x
      const left = pts.reduce((m, p) => (p[0] < m[0] ? p : m), pts[0]), right = pts.reduce((m, p) => (p[0] > m[0] ? p : m), pts[0]);
      bg.lineTo(left[0], left[1]);
      for (const p of pts.filter(q => q[1] >= (left[1] + right[1]) / 2).sort((a, b) => a[0] - b[0])) bg.lineTo(p[0], p[1]);
      bg.lineTo(right[0], right[1]); bg.closePath(); bg.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(bcv, 0, 0, BW, BH, 0, 0, W, H); ctx.restore();
      void g;
    }
  }

  // ---- bloom ----
  {
    const dim = (n: number) => [Math.max(2, Math.ceil(W / n)), Math.max(2, Math.ceil(H / n))] as const;
    const m2 = mip(emit, 'e2', ...dim(2)), m4 = mip(m2, 'e4', ...dim(4)), m8 = mip(m4, 'e8', ...dim(8)), m16 = mip(m8, 'e16', ...dim(16)), m32 = mip(m16, 'e32', ...dim(32));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.7 * st.bloom; ctx.drawImage(m4, 0, 0, m4.width, m4.height, 0, 0, W, H);
    ctx.globalAlpha = 0.42 * st.bloom; ctx.drawImage(m16, 0, 0, m16.width, m16.height, 0, 0, W, H);
    ctx.globalAlpha = 0.17 * st.bloom; ctx.drawImage(m32, 0, 0, m32.width, m32.height, 0, 0, W, H);
    ctx.restore();
  }

  // ---- tilt-shift: focus on a band, soften above and below ----
  if (st.blur) {
    const dim = (n: number) => [Math.max(2, Math.ceil(W / n)), Math.max(2, Math.ceil(H / n))] as const;
    const s2 = mip(ctx.canvas, 's2', ...dim(2)), s4 = mip(s2, 's4', ...dim(4)), s8 = mip(s4, 's8', ...dim(8));
    const pass = (small: HTMLCanvasElement, a: number, b: number) => {
      const bl = cleared('tsfull', W, H); const bc = bl.getContext('2d')!;
      bc.drawImage(small, 0, 0, small.width, small.height, 0, 0, W, H);
      bc.globalCompositeOperation = 'destination-in';
      const gy0 = st.blur!.y - st.blur!.band, gy1 = st.blur!.y + st.blur!.band;
      const g = bc.createLinearGradient(0, 0, 0, H);
      const stops = [[0, 1], [Math.max(0, (gy0 - a * H) / H), 1], [Math.max(0.001, gy0 / H), 0], [Math.min(0.999, gy1 / H), 0], [Math.min(1, (gy1 + b * H) / H), 1], [1, 1]];
      for (const [pos, al] of stops) g.addColorStop(clamp(pos as number, 0, 1), `rgba(0,0,0,${al})`);
      bc.fillStyle = g; bc.fillRect(0, 0, W, H);
      ctx.drawImage(bl, 0, 0);
    };
    // a light softening, then a stronger one further from the focus (the stronger step is a smaller copy when the blur is wide)
    pass(s2, 0.3, 0.3);
    pass(st.blur.amount > 6 ? s8 : s4, 0.18, 0.18);
  }

  // ---- annotations drawn on the picture ----
  return { P };
}

/** Where a world point lands on screen, for labels placed by the page. */
export function project(city: City, W: number, H: number, st: State, x: number, y: number, z: number) {
  const P = new Proj();
  P.set({ pos: st.cam.pos, look: st.cam.look, fov: st.cam.fov, roll: st.cam.roll ?? 0, shift: st.cam.shift ?? 0 }, W, H);
  return P.p(x, y, z) ? { x: P.sx, y: P.sy, d: P.sz, k: P.f / P.sz } : null;
}

export { rng, smooth };

/** Words and leader lines drawn on the picture itself, in the exercise's own pen (azure). Call after drawModel. */
export function drawAnnots(ctx: CanvasRenderingContext2D, W: number, H: number, st: State) {
  const P = new Proj();
  P.set({ pos: st.cam.pos, look: st.cam.look, fov: st.cam.fov, roll: st.cam.roll ?? 0, shift: st.cam.shift ?? 0 }, W, H);
  const fs = Math.round(W * 0.0102);
  for (const a of st.annots) {
    if ((a.a ?? 1) <= 0.01 || !P.p(a.x, a.y, a.z)) continue;
    const x = P.sx, y = P.sy, tx = x + a.dx, ty = y + a.dy;
    ctx.save(); ctx.globalAlpha = Math.max(0, a.a ?? 1);
    ctx.lineWidth = Math.max(1.2, W / 1100); ctx.strokeStyle = css(ACCENT, 0.95); ctx.fillStyle = css(ACCENT, 1);
    ctx.beginPath(); ctx.arc(x, y, W / 480, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, W / 190, 0, Math.PI * 2); ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.lineTo(tx + (a.align === 'right' ? -1 : 1) * W / 100, ty); ctx.stroke();
    ctx.font = `600 ${fs}px "Plex Mono", ui-monospace, monospace`;
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${(fs * 0.1).toFixed(1)}px`;
    ctx.textBaseline = 'middle'; ctx.textAlign = a.align === 'right' ? 'right' : 'left';
    const lx = tx + (a.align === 'right' ? -1 : 1) * (W / 100 + W / 220);
    ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.5; ctx.strokeStyle = 'rgba(4,8,12,0.88)'; ctx.strokeText(a.text, lx, ty);
    ctx.fillStyle = css(ACCENT, 1); ctx.fillText(a.text, lx, ty);
    ctx.restore();
  }
}
