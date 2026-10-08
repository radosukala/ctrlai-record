/**
 * Small maths for the film. Everything the film draws is a pure function of time `t`: nothing accumulates between frames, so any
 * frame can be rendered on its own (to scrub, to review a still, or to export video) and always looks the same.
 */

export type V3 = readonly [number, number, number];

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ramp = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** A small, fast, seeded random source, so the picture is the same every time. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A deterministic shuffle of 0..n-1. */
export function shuffled(n: number, seed: number): Uint32Array {
  const r = rng(seed);
  const a = new Uint32Array(n);
  for (let i = 0; i < n; i++) a[i] = i;
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

export const v3 = {
  add: (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a: V3) => Math.hypot(a[0], a[1], a[2]),
  norm: (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};

/** A point on the arena floor, in polar form. */
export const at = (r: number, theta: number, y = 0): V3 => [r * Math.cos(theta), y, r * Math.sin(theta)];

export type Cam = { pos: V3; look: V3; fov: number; roll: number; shift: number };

export type Key = {
  /** Screen time, in seconds. */
  t: number;
  pos: V3;
  look: V3;
  /** Horizontal field of view in degrees. */
  fov?: number;
  roll?: number;
  /** Lens shift: moves the subject sideways in the frame, as a fraction of the width, to leave room for words. */
  shift?: number;
  /** The camera comes to rest here (zero speed). Without it the move flows through the key. */
  hold?: boolean;
};

/**
 * A camera path that flows through its keys (a Catmull-Rom spline in time), and rests only where a key says `hold`. Smooth, and
 * never lurching from key to key.
 */
export function sampleCamera(keys: Key[], t: number): Cam {
  const n = keys.length;
  if (t <= keys[0].t) return toCam(keys[0]);
  if (t >= keys[n - 1].t) return toCam(keys[n - 1]);
  let i = 0;
  while (i < n - 2 && t > keys[i + 1].t) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const km = keys[Math.max(0, i - 1)], kp = keys[Math.min(n - 1, i + 2)];
  const h = k1.t - k0.t;
  const u = (t - k0.t) / h;
  const u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  // Tangents (per second). A held key has zero speed.
  const tan = (kb: Key, ka: Key, kc: Key, get: (k: Key) => number) => {
    if (kb.hold) return 0;
    const span = kc.t - ka.t;
    return span > 0 ? (get(kc) - get(ka)) / span : 0;
  };
  const comp = (get: (k: Key) => number) => {
    const m0 = tan(k0, km, k1, get) * h;
    const m1 = tan(k1, k0, kp, get) * h;
    return h00 * get(k0) + h10 * m0 + h01 * get(k1) + h11 * m1;
  };
  const pos: V3 = [comp(k => k.pos[0]), comp(k => k.pos[1]), comp(k => k.pos[2])];
  const look: V3 = [comp(k => k.look[0]), comp(k => k.look[1]), comp(k => k.look[2])];
  const fov = comp(k => k.fov ?? 62);
  const roll = comp(k => k.roll ?? 0);
  const shift = comp(k => k.shift ?? 0);
  return { pos, look, fov, roll, shift };
}

const toCam = (k: Key): Cam => ({ pos: k.pos, look: k.look, fov: k.fov ?? 62, roll: k.roll ?? 0, shift: k.shift ?? 0 });

/** The projection of the world onto the stage. Reused every frame; call `set` once, then `p` or `seg` many times. */
export class Proj {
  W = 1; H = 1; f = 1; cx = 0; cy = 0; near = 0.06;
  px = 0; py = 0; pz = 0;
  rx = 1; ry = 0; rz = 0;
  ux = 0; uy = 1; uz = 0;
  fx = 0; fy = 0; fz = 1;
  sx = 0; sy = 0; sz = 0;
  sx2 = 0; sy2 = 0; sz1 = 0; sz2 = 0;

  set(c: Cam, W: number, H: number) {
    this.W = W; this.H = H;
    const f: V3 = v3.norm(v3.sub(c.look, c.pos));
    let r: V3 = v3.cross(f, [0, 1, 0]);
    if (v3.len(r) < 1e-5) r = [1, 0, 0]; // looking straight up or down
    r = v3.norm(r);
    let u: V3 = v3.cross(r, f);
    if (c.roll) {
      const cs = Math.cos(c.roll), sn = Math.sin(c.roll);
      const r2: V3 = [r[0] * cs + u[0] * sn, r[1] * cs + u[1] * sn, r[2] * cs + u[2] * sn];
      const u2: V3 = [u[0] * cs - r[0] * sn, u[1] * cs - r[1] * sn, u[2] * cs - r[2] * sn];
      r = r2; u = u2;
    }
    this.px = c.pos[0]; this.py = c.pos[1]; this.pz = c.pos[2];
    this.rx = r[0]; this.ry = r[1]; this.rz = r[2];
    this.ux = u[0]; this.uy = u[1]; this.uz = u[2];
    this.fx = f[0]; this.fy = f[1]; this.fz = f[2];
    // The horizontal field of view stays the same on any shape of stage, so a phone sees the same width as a laptop.
    this.f = (W / 2) / Math.tan((c.fov * Math.PI) / 360);
    this.cx = W / 2 + c.shift * W;
    this.cy = H / 2;
  }

  /** Depth of a point in front of the camera (negative: behind it). */
  depth(x: number, y: number, z: number) {
    return (x - this.px) * this.fx + (y - this.py) * this.fy + (z - this.pz) * this.fz;
  }

  p(x: number, y: number, z: number): boolean {
    const dx = x - this.px, dy = y - this.py, dz = z - this.pz;
    const zc = dx * this.fx + dy * this.fy + dz * this.fz;
    if (zc < this.near) return false;
    const k = this.f / zc;
    this.sx = this.cx + (dx * this.rx + dy * this.ry + dz * this.rz) * k;
    this.sy = this.cy - (dx * this.ux + dy * this.uy + dz * this.uz) * k;
    this.sz = zc;
    return true;
  }

  /** A line segment, clipped to the front of the camera. On success the ends are in (sx, sy) and (sx2, sy2). */
  seg(ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
    let adx = ax - this.px, ady = ay - this.py, adz = az - this.pz;
    let bdx = bx - this.px, bdy = by - this.py, bdz = bz - this.pz;
    let za = adx * this.fx + ady * this.fy + adz * this.fz;
    let zb = bdx * this.fx + bdy * this.fy + bdz * this.fz;
    if (za < this.near && zb < this.near) return false;
    if (za < this.near) {
      const t = (this.near - za) / (zb - za);
      adx += (bdx - adx) * t; ady += (bdy - ady) * t; adz += (bdz - adz) * t; za = this.near;
    } else if (zb < this.near) {
      const t = (this.near - zb) / (za - zb);
      bdx += (adx - bdx) * t; bdy += (ady - bdy) * t; bdz += (adz - bdz) * t; zb = this.near;
    }
    const ka = this.f / za, kb = this.f / zb;
    this.sx = this.cx + (adx * this.rx + ady * this.ry + adz * this.rz) * ka;
    this.sy = this.cy - (adx * this.ux + ady * this.uy + adz * this.uz) * ka;
    this.sx2 = this.cx + (bdx * this.rx + bdy * this.ry + bdz * this.rz) * kb;
    this.sy2 = this.cy - (bdx * this.ux + bdy * this.uy + bdz * this.uz) * kb;
    this.sz1 = za; this.sz2 = zb;
    return true;
  }
}
