/**
 * Motion for the model city, as pure functions of time: the lights going out, cars that drive and stop where the dark
 * reaches them, people who arrive and walk, a camera that follows keys. Nothing accumulates between frames.
 */
import { clamp, lerp, ramp, smooth, smoother, sampleCamera, type Key, type V3 } from '../incident/film/math';
import type { City } from './city';
import type { CarState, Peg, State } from './render';

export { clamp, lerp, ramp, smooth, smoother };
export const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const seeded = (seed: number) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Visible between a and b, fading in and out over `edge` seconds. */
export const fadeWindow = (t: number, a: number, b: number, edge = 0.5) => smoother(ramp(t, a, a + edge)) * (1 - smoother(ramp(t, b - edge, b)));

/** A camera path: keys in scene time. */
export const camera = (keys: Key[]) => (u: number): State['cam'] => {
  const c = sampleCamera(keys, u);
  return { pos: c.pos, look: c.look, fov: c.fov, roll: c.roll, shift: c.shift };
};

/**
 * Power that has failed inside a circle of radius r (a function of time), with ragged edges that follow districts rather than
 * single windows. 1 = lit, 0 = dark.
 */
export const outageAt = (ox: number, oz: number, r: (u: number) => number, soft = 16) => (x: number, z: number, u: number) => {
  const d = Math.hypot(x - ox, z - oz);
  const n = hash(Math.floor(x / 7) * 31 + Math.floor(z / 7) * 17) - 0.5;
  return sstep(-0.5, 0.5, (d - r(u)) / soft + n * 0.9);
};
/** Almost everything dark; a few districts still lit. */
export const islands = (share: number) => (x: number, z: number) => (hash(Math.floor(x / 11) * 13 + Math.floor(z / 11) * 29 + 5) < share ? 0.75 : 0);
/** A value that moves between keys over scene time, with easing: `track([[0, 1], [4, 0.3]])(u)`. */
export const track = (keys: [number, number][]) => (u: number) => {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], smooth(ramp(u, keys[i - 1][0], keys[i][0])));
  return keys[keys.length - 1][1];
};

// ---------------------------------------------------------------------------------------------------- cars
type Lane = { lo: number; hi: number };
const laneCache = new WeakMap<City, Map<number, Lane>>();
/** How far a car can drive along its street before the river or the board's edge: the river cuts every street except at the bridges. */
function laneOf(city: City, alongX: boolean, fixed: number, from: number): Lane {
  const lim = alongX ? city.W / 2 - 3 : city.D / 2 - 3;
  const blocked = (s: number) => { const x = alongX ? s : fixed, z = alongX ? fixed : s; return Math.abs(z - city.river(x)) < city.riverW / 2 + 0.6 && !city.bridges.some(b => Math.abs(x - b) < 2); };
  let lo = from, hi = from;
  while (lo > -lim && !blocked(lo - 1)) lo -= 1;
  while (hi < lim && !blocked(hi + 1)) hi += 1;
  return { lo, hi };
}
export type CarPlan = { lane: Lane; s0: number; fixed: number; alongX: boolean; dir: 1 | -1; tone: number; speed: number };
const planCache = new WeakMap<City, CarPlan[]>();
export function carPlans(city: City): CarPlan[] {
  let plans = planCache.get(city);
  if (!plans) {
    plans = city.cars.map((c, i) => {
      const alongX = c.alongX, s0 = alongX ? c.x : c.z, fixed = alongX ? c.z : c.x;
      return { lane: laneOf(city, alongX, fixed, s0), s0, fixed, alongX, dir: c.dir, tone: c.tone, speed: 2.4 + hash(i * 3.7) * 1.8 };
    });
    planCache.set(city, plans);
  }
  return plans;
}
const posOn = (p: CarPlan, tt: number) => {
  const len = Math.max(4, p.lane.hi - p.lane.lo);
  const raw = (p.s0 - p.lane.lo + p.dir * p.speed * tt) % len;
  const wrapped = (raw + len) % len;
  return { s: p.lane.lo + wrapped, edge: Math.min(wrapped, len - wrapped) };
};
/** When each car meets the dark, per scene: found once, by driving every car forward in quarter-second steps. */
const stopCache = new Map<string, number[]>();
/**
 * Cars at scene time u. Moving cars drive and wrap around their stretch of street (fading at its ends). A car stops where the
 * power under it falls below a threshold, and stays there. `key` names the scene, so what a car learned in one scene is never
 * carried into another.
 */
export function carsAt(city: City, u: number, power: (x: number, z: number, u: number) => number, key: string, stopBelow = 0.3, horizon = 130): CarState[] {
  const plans = carPlans(city);
  let stops = stopCache.get(key);
  if (!stops) {
    stops = plans.map(p => {
      for (let k = 0; k <= horizon * 4; k++) {
        const q = k / 4, { s } = posOn(p, q);
        const x = p.alongX ? s : p.fixed, z = p.alongX ? p.fixed : s;
        if (power(x, z, q) < stopBelow) return q;
      }
      return Infinity;
    });
    stopCache.set(key, stops);
  }
  return plans.map((p, i) => {
    const stopAt = stops![i], stopped = u >= stopAt;
    const { s, edge } = posOn(p, stopped ? stopAt : u);
    const x = p.alongX ? s : p.fixed, z = p.alongX ? p.fixed : s;
    return { x, z, alongX: p.alongX, dir: p.dir, tone: p.tone, mode: stopped ? 'stopped' : 'moving', ...(!stopped && edge < 1.2 ? { a: edge / 1.2 } : {}) } as CarState;
  });
}

// ---------------------------------------------------------------------------------------------------- people
/** Pegs that arrive between times a and b (each at its own moment) and then stand there. */
export function arrivals(list: { x: number; z: number; tone: number }[], u: number, a: number, b: number, seed = 5, fade = 1.4): Peg[] {
  return list.map((p, i) => ({ ...p, a: ramp(u, lerp(a, b, hash(seed + i * 1.7)), lerp(a, b, hash(seed + i * 1.7)) + fade) })).filter(p => (p.a ?? 0) > 0);
}
/** Pegs that walk back and forth along a line, at body-height-per-second speeds. */
export function walkers(x0: number, z0: number, x1: number, z1: number, n: number, u: number, seed = 3, speed = 0.45): Peg[] {
  const len = Math.hypot(x1 - x0, z1 - z0) || 1;
  const out: Peg[] = [];
  for (let i = 0; i < n; i++) {
    const dir = hash(seed + i * 2.3) < 0.5 ? 1 : -1, ph = hash(seed + i * 5.1);
    const f = ((ph + (dir * speed * u) / len) % 1 + 1) % 1;
    const edge = Math.min(f, 1 - f) * len;
    out.push({ x: lerp(x0, x1, f), z: lerp(z0, z1, f), tone: hash(seed + i * 9.7), a: clamp(edge / 1.5) });
  }
  return out;
}
export const crowd = (cx: number, cz: number, r: number, n: number, seed: number) => {
  const R = seeded(seed); const out: { x: number; z: number; tone: number }[] = [];
  for (let k = 0; k < n; k++) { const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * r; out.push({ x: cx + Math.cos(a) * rr, z: cz + Math.sin(a) * rr, tone: R() }); }
  return out;
};
export const line = (x0: number, z0: number, x1: number, z1: number, n: number, seed: number, jit = 0.18) => {
  const R = seeded(seed); const out: { x: number; z: number; tone: number }[] = [];
  for (let k = 0; k < n; k++) { const t = k / Math.max(1, n - 1); out.push({ x: x0 + (x1 - x0) * t + (R() - 0.5) * jit * 2, z: z0 + (z1 - z0) * t + (R() - 0.5) * jit * 2, tone: R() }); }
  return out;
};

export type { V3, Key };
