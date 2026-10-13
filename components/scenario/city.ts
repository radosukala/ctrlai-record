/**
 * The model city for "The day before": a scale model on a table, invented, deterministic (same seed, same city).
 * Axis-aligned buildings on a street grid, a river, a park, a hospital, a substation, houses with gabled roofs.
 * Nothing here is a real place. y is up; the board lies in x (east-west) and z (north-south, +z toward the viewer).
 */
import { rng } from '../incident/film/math';

export type Kind = 'tower' | 'mid' | 'house' | 'shed' | 'hospital' | 'civic' | 'shop' | 'sub' | 'canopy';
export type Box = {
  id: number;
  x0: number; z0: number; x1: number; z1: number; y0: number; h: number;
  kind: Kind;
  /** House roofs: height of the ridge above the eaves, and which way it runs. */
  roof?: { rh: number; alongX: boolean };
  /** 0..1: how many of its windows exist and are lit when it has power. */
  win: number;
  tone: number;
  /** A building powered from its own generator stays lit when the grid is down. */
  backup?: boolean;
  name?: string;
};
export type Tree = { x: number; z: number; r: number; h: number; tone: number };
export type Car = { x: number; z: number; alongX: boolean; dir: 1 | -1; tone: number };
export type Pylon = { x: number; z: number; h: number };
export type City = {
  W: number; D: number; margin: number;
  xs: number[]; zs: number[];
  boxes: Box[]; trees: Tree[]; cars: Car[]; pylons: Pylon[];
  river: (x: number) => number; riverW: number;
  bridges: number[];
  park: { x: number; z: number; r: number };
  stadium: { x: number; z: number; r0: number; r1: number; h: number };
  tank: { x: number; z: number; r: number; h: number; legs: number };
  landmarks: Record<string, { x: number; z: number; y: number }>;
  streetLights: { x: number; z: number }[];
};

export const BOARD = { W: 160, D: 100 };
const STREET = 3;

export function buildCity(seed = 11): City {
  const R = rng(seed);
  const xs: number[] = [], zs: number[] = [];
  for (let x = -72; x <= 72; x += 16) xs.push(x);
  for (let z = -44; z <= 40; z += 14) zs.push(z);
  const riverZ = (x: number) => -26 + (x + 80) * 0.27 + 4.2 * Math.sin(x * 0.055 + 0.6);
  const riverW = 7;
  const bridges = [-24, 8, 40];
  const downtown = { x: 16, z: -4 };
  const park = { x: -28, z: 24, r: 11 };
  const stadium = { x: 54, z: 30, r0: 6.2, r1: 9, h: 3.2 };
  const tank = { x: 63, z: -34, r: 2.6, h: 13, legs: 5 };
  const hosp = { x0: -6, z0: 14, x1: 6, z1: 24 };
  // Blocks kept for places that are built by hand: [i, j] of the street grid.
  const reserved = new Set(['4,1', '4,2', '4,3', '4,4', '6,5']);
  const subst = { x: -70, z: -47 };
  const boxes: Box[] = [];
  const trees: Tree[] = [];
  const cars: Car[] = [];
  const pylons: Pylon[] = [];
  const landmarks: City['landmarks'] = {};
  let id = 0;

  const inRiver = (x: number, z: number, pad = 0) => Math.abs(z - riverZ(x)) < riverW / 2 + pad;
  const inPark = (x: number, z: number, pad = 0) => Math.hypot(x - park.x, z - park.z) < park.r + pad;
  const inStadium = (x: number, z: number) => Math.hypot(x - stadium.x, z - stadium.z) < stadium.r1 + 3;
  const overlapsHosp = (x0: number, z0: number, x1: number, z1: number) => x1 > hosp.x0 - 1 && x0 < hosp.x1 + 1 && z1 > hosp.z0 - 1 && z0 < hosp.z1 + 1;
  const push = (b: Omit<Box, 'id'>) => { boxes.push({ id: id++, ...b }); };

  // Blocks between the streets.
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const bx0 = xs[i] + STREET / 2, bx1 = xs[i + 1] - STREET / 2;
      const bz0 = zs[j] + STREET / 2, bz1 = zs[j + 1] - STREET / 2;
      const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
      const d = Math.hypot(cx - downtown.x, cz - downtown.z);
      const industrial = cx < -46 && cz > 6;
      const reach = Math.hypot((cx - downtown.x) * 0.8, cz - downtown.z);
      if (inPark(cx, cz, 4) || inStadium(cx, cz)) continue;
      if (overlapsHosp(bx0, bz0, bx1, bz1) || reserved.has(`${i},${j}`)) continue;

      if (industrial) {
        const n = R() < 0.5 ? 1 : 2;
        for (let k = 0; k < n; k++) {
          const w = 7 + R() * 3, dd = 4.2 + R() * 2;
          const x0 = bx0 + 0.8 + R() * (bx1 - bx0 - w - 1.6), z0 = n === 1 ? bz0 + 1 + R() * (bz1 - bz0 - dd - 2) : (k === 0 ? bz0 + 0.8 : bz1 - dd - 0.8);
          if (inRiver((x0 + x0 + w) / 2, (z0 + z0 + dd) / 2, 1)) continue;
          push({ x0, z0, x1: x0 + w, z1: z0 + dd, y0: 0, h: 1.8 + R() * 1.2, kind: 'shed', win: 0.15, tone: R() });
        }
        continue;
      }
      if (reach < 20) {
        // Towers: up to four plots, each with a podium and sometimes a setback.
        const nx = 2, nz = 2;
        for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
          if (R() < 0.12) continue;
          const px0 = bx0 + (bx1 - bx0) * a / nx + 0.45, px1 = bx0 + (bx1 - bx0) * (a + 1) / nx - 0.45;
          const pz0 = bz0 + (bz1 - bz0) * b / nz + 0.45, pz1 = bz0 + (bz1 - bz0) * (b + 1) / nz - 0.45;
          if (inRiver((px0 + px1) / 2, (pz0 + pz1) / 2, 1.2)) continue;
          const core = 1 - reach / 22;
          const h = 6 + R() * 10 + core * (R() * 18);
          const podium = 1.6 + R() * 1.2;
          push({ x0: px0, z0: pz0, x1: px1, z1: pz1, y0: 0, h: podium, kind: 'mid', win: 0.85, tone: R() });
          const ins = 0.5 + R() * 0.8;
          push({ x0: px0 + ins, z0: pz0 + ins, x1: px1 - ins, z1: pz1 - ins, y0: podium, h: h - podium, kind: 'tower', win: 0.55 + R() * 0.4, tone: R() });
          if (h > 18 && R() < 0.5) {
            const ins2 = ins + 0.9;
            push({ x0: px0 + ins2, z0: pz0 + ins2, x1: px1 - ins2, z1: pz1 - ins2, y0: h, h: 3 + R() * 5, kind: 'tower', win: 0.5, tone: R() });
          }
        }
        continue;
      }
      if (reach < 38 || d < 38) {
        const nx = 2, nz = 2;
        for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
          if (R() < 0.15) continue;
          const px0 = bx0 + (bx1 - bx0) * a / nx + 0.5, px1 = bx0 + (bx1 - bx0) * (a + 1) / nx - 0.5;
          const pz0 = bz0 + (bz1 - bz0) * b / nz + 0.5, pz1 = bz0 + (bz1 - bz0) * (b + 1) / nz - 0.5;
          if (inRiver((px0 + px1) / 2, (pz0 + pz1) / 2, 1.2)) continue;
          push({ x0: px0, z0: pz0, x1: px1, z1: pz1, y0: 0, h: 3 + R() * 5.5, kind: 'mid', win: 0.6 + R() * 0.3, tone: R() });
        }
        continue;
      }
      // Houses in rows, gabled.
      const hw = 2.3, hd = 3.1, gx = 0.55, gz = 0.9;
      const cols = Math.floor((bx1 - bx0 + gx) / (hw + gx)), rows = Math.floor((bz1 - bz0 + gz) / (hd + gz));
      const ox = bx0 + ((bx1 - bx0) - (cols * hw + (cols - 1) * gx)) / 2;
      const oz = bz0 + ((bz1 - bz0) - (rows * hd + (rows - 1) * gz)) / 2;
      for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) {
        if (R() < 0.06) continue;
        const x0 = ox + a * (hw + gx), z0 = oz + b * (hd + gz);
        if (inRiver(x0 + hw / 2, z0 + hd / 2, 1.2)) continue;
        const alongX = R() < 0.35;
        push({ x0, z0, x1: x0 + hw, z1: z0 + hd, y0: 0, h: 1.0 + R() * 0.7, kind: 'house', roof: { rh: 0.7 + R() * 0.3, alongX }, win: 0.95, tone: R() });
      }
    }
  }

  // The hospital: a cross of two blocks. It has its own generators.
  {
    const cx = (hosp.x0 + hosp.x1) / 2, cz = (hosp.z0 + hosp.z1) / 2;
    push({ x0: hosp.x0, z0: cz - 2.2, x1: hosp.x1, z1: cz + 2.2, y0: 0, h: 4.2, kind: 'hospital', win: 0.95, tone: 0.9, backup: true, name: 'hospital' });
    push({ x0: cx - 2.6, z0: hosp.z0, x1: cx + 2.6, z1: hosp.z1, y0: 0, h: 5.8, kind: 'hospital', win: 0.95, tone: 0.95, backup: true, name: 'hospital' });
    landmarks.hospital = { x: cx, z: cz, y: 6 };
  }
  // The Assembly: a classical hall with a pediment, a row of columns and wide steps, a drum behind it, on its own plaza.
  {
    const x0 = -6, x1 = 6, z0 = -25.4, z1 = -19.8;
    push({ x0: x0 - 1.4, z0: z1, x1: x1 + 1.4, z1: z1 + 2.3, y0: 0, h: 0.22, kind: 'civic', win: 0, tone: 1, backup: true, name: 'assembly' });
    push({ x0: x0 - 0.7, z0: z1, x1: x1 + 0.7, z1: z1 + 1.2, y0: 0.22, h: 0.22, kind: 'civic', win: 0, tone: 1, backup: true, name: 'assembly' });
    push({ x0, z0, x1, z1, y0: 0, h: 3.3, kind: 'civic', win: 0.9, tone: 0.95, backup: true, roof: { rh: 2.1, alongX: false }, name: 'assembly' });
    for (let k = 0; k < 7; k++) { const cx = x0 + 0.7 + k * (x1 - x0 - 1.4) / 6; push({ x0: cx - 0.24, z0: z1 + 0.05, x1: cx + 0.24, z1: z1 + 0.55, y0: 0.44, h: 2.9, kind: 'civic', win: 0, tone: 1, backup: true, name: 'assembly' }); }
    push({ x0: -2.6, z0: z0 - 2.4, x1: 2.6, z1: z0 + 1.2, y0: 0, h: 6.2, kind: 'civic', win: 0.8, tone: 1, backup: true, roof: { rh: 1.2, alongX: false }, name: 'assembly' });
    landmarks.assembly = { x: 0, z: (z0 + z1) / 2, y: 7.4 };
  }
  // A petrol station on the board's south edge, its canopy on the avenue, a shop behind it: the place a queue forms.
  {
    push({ x0: 27, z0: 33.4, x1: 35.2, z1: 37.6, y0: 2.1, h: 0.3, kind: 'canopy', win: 0, tone: 1, backup: true, name: 'station' });
    for (const [px, pz] of [[27.5, 33.9], [34.7, 33.9], [27.5, 37.1], [34.7, 37.1]]) push({ x0: px - 0.18, z0: pz - 0.18, x1: px + 0.18, z1: pz + 0.18, y0: 0, h: 2.1, kind: 'canopy', win: 0, tone: 1, backup: true });
    for (const px of [29.2, 33]) push({ x0: px - 0.35, z0: 35.1, x1: px + 0.35, z1: 35.9, y0: 0, h: 0.9, kind: 'sub', win: 0, tone: 0.9 });
    push({ x0: 27, z0: 28.4, x1: 35.2, z1: 31.4, y0: 0, h: 2.3, kind: 'shop', win: 0.7, tone: 0.8, backup: true });
    landmarks.station = { x: 31, z: 35.5, y: 2.4 };
  }
  // The substation and its pylons.
  {
    push({ x0: subst.x - 4, z0: subst.z - 3, x1: subst.x + 4, z1: subst.z + 3, y0: 0, h: 0.25, kind: 'sub', win: 0, tone: 0.7, name: 'substation' });
    for (const [dx, dz] of [[-2, -1], [0.3, -1], [2.2, -1], [-1, 1.4], [1.4, 1.4]]) push({ x0: subst.x + dx - 0.7, z0: subst.z + dz - 0.7, x1: subst.x + dx + 0.7, z1: subst.z + dz + 0.7, y0: 0.25, h: 1.6, kind: 'sub', win: 0, tone: 0.5 });
    // The line runs east along the board's north margin, clear of the streets.
    for (let k = 0; k < 7; k++) pylons.push({ x: subst.x + 8 + k * 20, z: -46.8 + (k % 2) * 0.4, h: 8.5 });
    landmarks.substation = { x: subst.x, z: subst.z, y: 2 };
  }

  // The mall between the Assembly and the hospital: two rows of trees.
  for (let z = -13.5; z <= 10; z += 3.4) for (const x of [-4.4, 4.4]) trees.push({ x, z, r: 0.6, h: 1.5, tone: 0.5 });
  // Trees: the park, and a few along the streets.
  for (let k = 0; k < 90; k++) {
    const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * (park.r - 0.8);
    trees.push({ x: park.x + Math.cos(a) * rr, z: park.z + Math.sin(a) * rr, r: 0.7 + R() * 0.5, h: 1.3 + R() * 1.1, tone: R() });
  }
  for (let k = 0; k < 120; k++) {
    const i = Math.floor(R() * (xs.length - 1)), j = Math.floor(R() * zs.length);
    const x = xs[i] + 1.5 + R() * (xs[i + 1] - xs[i] - 3);
    const z = zs[j] + (R() < 0.5 ? -1 : 1) * 1.15;
    if (inRiver(x, z, 1) || inPark(x, z, 2)) continue;
    if (boxes.some(b => x > b.x0 - 0.3 && x < b.x1 + 0.3 && z > b.z0 - 0.3 && z < b.z1 + 0.3)) continue;
    trees.push({ x, z, r: 0.45 + R() * 0.3, h: 0.9 + R() * 0.6, tone: R() });
  }

  // Cars, one lane each way.
  for (let k = 0; k < 150; k++) {
    const alongX = R() < 0.5;
    if (alongX) {
      const j = Math.floor(R() * zs.length), dir: 1 | -1 = R() < 0.5 ? 1 : -1;
      const x = -76 + R() * 152, z = zs[j] + dir * 0.55;
      if (inRiver(x, z, 0.5)) continue;
      cars.push({ x, z, alongX, dir, tone: R() });
    } else {
      const i = Math.floor(R() * xs.length), dir: 1 | -1 = R() < 0.5 ? 1 : -1;
      const z = -46 + R() * 92, x = xs[i] + dir * 0.55;
      if (inRiver(x, z, 0.5)) continue;
      cars.push({ x, z, alongX, dir, tone: R() });
    }
  }

  // Street lights along the avenues.
  const streetLights: { x: number; z: number }[] = [];
  for (const z of zs) for (let x = -76; x <= 76; x += 7) { if (!inRiver(x, z, 0.5)) streetLights.push({ x, z: z + 1.7 }); }
  for (const x of xs) for (let z = -46; z <= 44; z += 7) { if (!inRiver(x, z, 0.5)) streetLights.push({ x: x + 1.7, z }); }

  return { W: BOARD.W, D: BOARD.D, margin: 6, xs, zs, boxes, trees, cars, pylons, river: riverZ, riverW, bridges, park, stadium, tank, landmarks, streetLights };
}
