import { at, ramp, smoother, v3, type Cam, type Key, type V3 } from './math';
import { boardQuad, buildWorld, G, type World } from './world';
import { DIM, DURATION, HALL_OUT, HOT, LIT, S, STOP } from '@/content/incidents/openai-hf/film';

/**
 * Direction: where the camera goes, what is labelled, and the curves that say how many rooms are lit, in the attack or dark at
 * each moment. The counts come from the film script (the documented numbers); the camera is only drawing.
 */

/** A piecewise curve through [screen second, value] points, eased between each pair. */
export function curve(pts: [number, number][], t: number): number {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][0]) {
      const [t0, v0] = pts[i - 1], [t1, v1] = pts[i];
      return v0 + (v1 - v0) * smoother((t - t0) / (t1 - t0));
    }
  }
  return pts[pts.length - 1][1];
}

export const litCount = (t: number) => curve(LIT, t);
export const hotCount = (t: number) => curve(HOT, t);
export const stopCount = (t: number) => curve(STOP, t);

/** The tower's beam and lit windows: dark until the film says the agents believed the grader would read their transcripts, bright while they believe it, dark once the grader is shown not to look. */
export const beamPower = (t: number) => curve([[S('room'), 0], [S('tower', 8), 0], [S('tower', 12), 1], [S('tower', 23.5), 1], [S('tower', 25.5), 0], [1e6, 0]], t);

/** Where the lines from the lit rooms point: the board, then the tower, then (for the rooms in the attack) out through the gate. */
export const towerMix = (t: number) => curve([[S('room'), 0], [S('tower'), 0], [S('tower', 4.5), 1], [S('tower', 23.5), 1], [S('tower', 27.5), 0], [1e6, 0]], t);
export const outMix = (t: number) => curve([[S('room'), 0], [S('attack', 11), 0], [S('attack', 14.5), 1], [1e6, 1]], t);
/** The line that leaves by the gate: first a way out, half the way to the customer's sandbox (July 8), then to it (July 9). Then a red one on to Hugging Face. */
export const threadLeg1 = (t: number) => curve([[S('room'), 0], [S('exit', 4.4), 0], [S('exit', 9), 0.45], [S('modal', 0.5), 0.45], [S('modal', 6), 1], [S('epilogue', 1.5), 1], [S('epilogue', 7), 0], [1e6, 0]], t);
/** How much of Hugging Face's campus the attack has reached: it grew over about two days, so the boxes light slowly, from the first file read to the last. */
export const attackReach = (t: number) => curve([[S('room'), 0], [S('attack', 38.8), 0], [S('attack', 59.2), 0.35], [S('attack', 118.6), 0.6], [S('attack', 145.3), 1], [1e6, 1]], t);
export const threadLeg2 = (t: number) => curve([[S('room'), 0], [S('attack', 11.5), 0], [S('attack', 17.5), 1], [1e6, 1]], t);
/** Lines sagging once the grader is shown not to be watching. */
export const slack = (t: number) => curve([[S('room'), 0], [S('tower', 23.5), 0], [S('tower', 28), 1], [1e6, 1]], t);

/** The lights surge, then a large fraction of the rooms on the board go dark at once, and the picture settles a little lower. */
export const lightLevel = (t: number) => curve([[S('room'), 1], [S('lights', 1.8), 1], [S('lights', 2.8), 1.35], [S('lights', 3.1), 1.35], [S('lights', 3.9), 0.45], [S('lights', 6.4), 0.8], [1e6, 0.8]], t);
/** A dip to black, to cross a long distance between two scenes without showing the journey. */
export const blackout = (t: number) => curve([
  [S('room'), 0],
  [S('tasks', 41.8), 0], [S('tasks', 43.2), 1], [S('history', -0.3), 1], [S('history', 1.2), 0],
  [S('history', 71.2), 0], [S('history', 72), 1], [S('exit', -0.3), 1], [S('exit', 1.2), 0],
  [S('exit', 15), 0], [S('exit', 16.5), 1], [S('first', -0.3), 1], [S('first', 0.9), 0],
  [S('tower', 37.5), 0], [S('tower', 38.7), 1], [S('modal', 0.6), 1], [S('modal', 1.8), 0],
  [S('modal', 18.8), 0], [S('modal', 20), 1], [S('collective', 0.4), 1], [S('collective', 1.6), 0],
  [S('projects', 51.6), 0], [S('projects', 52.6), 1], [S('attack', -0.3), 1], [S('attack', 1.2), 0],
  [S('attack', 44.4), 0], [S('attack', 45.2), 1], [S('attack', 45.8), 1], [S('attack', 46.7), 0],
  [S('attack', 128.7), 0], [S('attack', 129.3), 1], [S('attack', 129.7), 1], [S('attack', 130.4), 0],
  [S('attack', 155.4), 0], [S('attack', 157.1), 1], [S('silence'), 1], [S('silence', 1.4), 0],
  [S('epilogue', 79.6), 0], [S('epilogue', 81.1), 1], [S('question', -0.3), 1], [S('question', 1.2), 0],
  [1e6, 0],
], t);
/** How dark the hall is behind the chart of who organised whom: the script says when. */
export const dimLevel = (t: number) => curve(DIM, t);
/** Hugging Face cuts the agents off: the red line to it dies and the campus goes dark. The pale way out and the rooms still running are not touched. */
export const cutProgress = (t: number) => curve([[S('room'), 0], [S('after', 0.2), 0], [S('after', 3), 1], [1e6, 1]], t);
/** The later episode, inside OpenAI's own systems. */
export const oaiMix = (t: number) => curve([[S('room'), 0], [S('after', 27.3), 0], [S('after', 30.3), 1], [S('epilogue', 2.5), 1], [S('epilogue', 8), 0], [1e6, 0]], t);
/** How much of the hall is still running: every room goes dark when OpenAI's responders start stopping the runs on July 19. */
export const hallOut = (t: number) => curve(HALL_OUT, t);
/** The building where the people responsible for the test are, with its one window, dim: nobody there is shown to be watching. */
export const peopleGlow = (t: number) => curve([[S('room'), 0], [S('attack', 156.7), 0], [S('silence', 2.4), 1], [S('lights', 0.6), 1], [S('lights', 2.4), 0], [1e6, 0]], t);
/** Rings round the eleven coordinators, from the moment the caption says they had stopped too. */
export const coordRing = (t: number) => curve([[S('room'), 0], [S('lights', 18.6), 0], [S('lights', 19.6), 1], [S('after', 0.4), 1], [S('after', 1.2), 0], [1e6, 0]], t);

/** How many of the far-off lights are on: from the first line of our view, lights come on one by one in a wide ring round the dark hall. Everyone who could be watching; drawing, not data. */
export const watchGlow = (t: number) => curve([[S('room'), 0], [S('question', 170.4), 0], [S('question', 212.4), 1], [1e6, 1]], t);

/**
 * The loop behind the homepage's words: a slow, closed orbit over the hall at the moment the attack is at its widest, one turn in the loop's period, with
 * the hall kept to the right of the frame so the words have room on the left. The picture is held at one moment of the film (with a faint shimmer
 * either side of it), so the loop has no seam. It is not part of the film.
 */
export const HERO_STATE = S('attack', 98);
export function heroCamera(u: number): Cam {
  const a = u * Math.PI * 2;
  return { pos: at(980, 0.55 + a, 540 + 40 * Math.sin(a)), look: [0, 6, 0], fov: 58, roll: 0, shift: 0.17 };
}

/** The first message leaves the agent's room, crosses the aisle and lands on the board. */
export const ARRIVAL = { pulse0: S('first', 44.3), pulse1: S('first', 48.3) };

const world = () => buildWorld();

/** The camera's journey. Coordinates are measured from the first agent's room: du outward, dv along the aisle, y up. */
export function cameraKeys(w: World = world()): Key[] {
  const p = w.protagonist;
  const C: V3 = [w.x[p], 0, w.z[p]];
  const u: V3 = [w.ux[p], 0, w.uz[p]];
  const vv: V3 = [-w.uz[p], 0, w.ux[p]];
  const rel = (du: number, dv: number, y: number): V3 => [C[0] + u[0] * du + vv[0] * dv, y, C[2] + u[2] * du + vv[2] * dv];
  const th0 = w.theta0;
  const sq = boardQuad(w, 3);
  const sign: V3 = sq.center;
  const signPos: V3 = [sign[0] + sq.normal[0] * 3.9, 1.7, sign[2] + sq.normal[2] * 3.9];
  const signLook: V3 = [sign[0], sign[1] + 0.05, sign[2]];
  const hf = w.hfAt;
  const hfLook = v3.add(hf, [0, 28, 0]);
  const thHf = Math.atan2(hf[2], hf[0]);
  const gap = w.gate.at;
  const thB = w.gate.theta;
  const md = w.modalAt;
  // Framing a named room: from behind it and above, looking out over it toward the gate and the world beyond; or from outside the fence, looking in at two.
  const roomPos = (id: string): V3 => [w.x[w.named[id]], 1.3, w.z[w.named[id]]];
  const outward = (q: V3): V3 => { const l = Math.hypot(q[0], q[2]) || 1; return [q[0] / l, 0, q[2] / l]; };
  const across = (q: V3): V3 => { const o = outward(q); return [-o[2], 0, o[0]]; };
  const viewOut = (id: string, back: number, up: number, ahead: number, drop: number) => {
    const q = roomPos(id), o = outward(q);
    return { pos: v3.add(v3.add(q, v3.scale(o, -back)), [0, up, 0]), look: v3.add(v3.add(q, v3.scale(o, ahead)), [0, drop, 0]) };
  };
  const pairMid: V3 = v3.scale(v3.add(roomPos('CURRENT'), roomPos('MARB051')), 0.5);
  const pairOut = outward(pairMid), pairAcross = across(pairMid);
  const lookIn = (out: number, side: number, up: number): V3 => v3.add(v3.add(v3.add(pairMid, v3.scale(pairOut, out)), v3.scale(pairAcross, side)), [0, up, 0]);
  const a1 = viewOut('38148c', 130, 38, 420, 6), a2 = viewOut('38148c', 112, 34, 420, 6), e1 = viewOut('JAN183411', 140, 40, 400, 8);
  return [
    // A room: one lit window in a long dark hall, a push-in along the aisle, then slowly toward the agent's door
    { t: S('room'), pos: rel(-4.2, 11, 1.6), look: rel(-2.2, -3, 1.45), fov: 62, shift: 0.1, hold: true },
    { t: S('room', 7), pos: rel(-4.3, 7.2, 1.62), look: rel(-1.9, -1.4, 1.4), fov: 58, shift: 0.13 },
    { t: S('room', 18), pos: rel(-3.9, 4.4, 1.6), look: rel(-1.7, -0.4, 1.4), fov: 54, shift: 0.1 },
    { t: S('sandbox'), pos: rel(-3.7, 3.4, 1.58), look: rel(-1.6, 0, 1.4), fov: 52, shift: 0.08 },
    // The sandboxes: away from the door, down the corridor, and up over the hall: tens of thousands of rooms
    { t: S('sandbox', 4), pos: rel(-4.3, 1.0, 3.2), look: rel(-6, -10, 2.2), fov: 66, shift: 0.05 },
    { t: S('sandbox', 7), pos: rel(-5, -7, 34), look: rel(-5, -40, 0), fov: 76, shift: 0 },
    { t: S('sandbox', 10), pos: at(190, th0 - 0.12, 150), look: at(70, th0 + 0.35, 0), fov: 70 },
    { t: S('sandbox', 13), pos: at(420, th0 - 0.4, 400), look: [0, 0, 0], fov: 62 },
    { t: S('tasks'), pos: at(610, th0 - 0.5, 575), look: [0, 0, 0], fov: 58 },
    { t: S('tasks', 42), pos: at(650, th0 - 0.4, 590), look: [0, 0, 0], fov: 57 },
    // A note in the hallway: back down to the aisle, facing the board wall, and slowly nearer to it
    { t: S('history', 2.6), pos: rel(-4.6, 11.5, 1.72), look: rel(-4.6, -4, 2.05), fov: 64, shift: 0, hold: true },
    { t: S('history', 26), pos: rel(-4.6, 8.4, 1.7), look: rel(-4.6, -4.5, 2.05), fov: 66 },
    // The note goes up on the wall: close on its sign while it is read, then back along the aisle as the wall fills
    { t: S('history', 31.8), pos: signPos, look: signLook, fov: 74, hold: true },
    { t: S('history', 37.8), pos: signPos, look: signLook, fov: 74, hold: true },
    { t: S('history', 42.6), pos: rel(-4.6, 5.4, 1.7), look: rel(-4.7, -5, 2.1), fov: 68 },
    { t: S('history', 70.6), pos: rel(-4.6, 4.8, 1.7), look: rel(-4.7, -5, 2.1), fov: 68, hold: true },
    // The way out: from above and behind the gate, looking out along the way the line will go; then with it
    { t: S('exit', 0.2), pos: at(300, thB + 0.5, 150), look: [gap[0], 6, gap[2]], fov: 62, hold: true },
    { t: S('exit', 3), pos: at(372, thB, 26), look: at(444, thB, 6), fov: 62 },
    { t: S('exit', 5.2), pos: at(402, thB, 15), look: at(510, thB, 9), fov: 62 },
    { t: S('exit', 9), pos: v3.add(v3.lerp(gap, md, 0.25), [0, 48, 0]), look: v3.add(v3.lerp(gap, md, 0.7), [0, 18, 0]), fov: 62 },
    { t: S('exit', 16.1), pos: v3.add(v3.lerp(gap, md, 0.45), [0, 52, 0]), look: v3.add(v3.lerp(gap, md, 0.8), [0, 16, 0]), fov: 62, hold: true },
    { t: S('first', -2), pos: rel(-4.5, 5.6, 1.68), look: rel(-4.6, -3, 2.05), fov: 66 },
    { t: S('first'), pos: rel(-3.9, 4.6, 1.64), look: rel(-2.6, -0.4, 1.5), fov: 60 },
    // The board returns: across the aisle to the agent, close on its door; then the message crosses to the board, and the sign
    { t: S('first', 5), pos: rel(-3.7, 3.4, 1.58), look: rel(-1.6, 0, 1.4), fov: 52, shift: 0.08 },
    { t: S('first', 27), pos: rel(-3.4, 2.7, 1.55), look: rel(-1.6, 0.1, 1.4), fov: 50, shift: 0.08 },
    { t: S('first', 42), pos: rel(-3.2, 2.5, 1.55), look: rel(-1.6, 0.1, 1.4), fov: 48, shift: 0.08 },
    { t: S('first', 44.6), pos: rel(-4.5, 6.2, 1.66), look: rel(-4.4, -2.5, 1.75), fov: 70, shift: 0.05 },
    { t: S('first', 48.3), pos: rel(-4.5, 5.6, 1.7), look: rel(-4.5, -3, 1.9), fov: 72, shift: 0 },
    { t: S('first', 51.3), pos: signPos, look: signLook, fov: 76, hold: true },
    { t: S('replies'), pos: signPos, look: signLook, fov: 76, hold: true },
    // Replies: along the aisle as others answer, then up over the hall again
    { t: S('replies', 3.5), pos: rel(-4.4, 1.6, 1.8), look: rel(-6.2, -9, 2.4), fov: 66 },
    { t: S('replies', 7), pos: rel(-4.3, -0.5, 1.9), look: rel(-6.5, -15, 2.6), fov: 72, shift: 0.12 },
    { t: S('replies', 20), pos: rel(-4.3, -3.0, 4.2), look: rel(-8, -19, 2.6), fov: 76, shift: 0.1 },
    { t: S('replies', 30), pos: rel(-5, -7, 34), look: rel(-5, -40, 0), fov: 76, shift: 0 },
    { t: S('replies', 34), pos: at(190, th0 - 0.12, 150), look: at(70, th0 + 0.35, 0), fov: 70 },
    { t: S('replies', 38), pos: at(420, th0 - 0.4, 400), look: [0, 0, 0], fov: 62 },
    { t: S('replies', 43), pos: at(610, th0 - 0.5, 575), look: [0, 0, 0], fov: 58 },
    // The tower
    { t: S('tower', 2), pos: at(230, th0 + 0.55, 130), look: [0, 55, 0], fov: 58 },
    { t: S('tower', 11), pos: at(105, th0 + 1.0, 52), look: [0, 70, 0], fov: 60 },
    { t: S('tower', 24.5), pos: at(70, th0 + 1.2, 86), look: [0, 70, 0], fov: 62 },
    { t: S('tower', 38.4), pos: at(70, th0 + 1.2, 86), look: [0, 70, 0], fov: 62, hold: true },
    // An outside base: along the pale line to the customer's sandbox, then round it
    { t: S('modal', 0.2), pos: v3.add(v3.lerp(gap, md, 0.72), [0, 62, 0]), look: v3.add(md, [0, 8, 0]), fov: 62, hold: true },
    { t: S('modal', 9), pos: v3.add(md, [70, 34, 46]), look: v3.add(md, [0, 8, 0]), fov: 56 },
    { t: S('modal', 20), pos: v3.add(md, [66, 32, 44]), look: v3.add(md, [0, 8, 0]), fov: 56, hold: true },
    // A collective, the board's growth, and the work it organised: the hall from above, slowly turning, behind the chart
    { t: S('collective', 1), pos: at(660, th0 - 0.2, 590), look: [0, 0, 0], fov: 56, hold: true },
    { t: S('collective', 51.2), pos: at(580, th0 + 0.15, 540), look: [0, 0, 0], fov: 56 },
    { t: S('scale', 25.6), pos: at(620, th0 + 0.3, 570), look: [0, 0, 0], fov: 56 },
    { t: S('projects', 52.6), pos: at(520, th0 + 0.55, 500), look: [0, 0, 0], fov: 56 },
    // The attack. First the view out from inside the hall, over the room that finds the keys, toward the gate and the world beyond
    { t: S('attack', 1.2), pos: a1.pos, look: a1.look, fov: 60, hold: true },
    { t: S('attack', 21), pos: a2.pos, look: a2.look, fov: 58 },
    { t: S('attack', 24), pos: a2.pos, look: a2.look, fov: 58 },
    // The data file: over the customer's sandbox, toward Hugging Face
    { t: S('attack', 28.5), pos: v3.add(v3.lerp(md, hf, 0.3), [0, 120, 0]), look: hfLook, fov: 60 },
    { t: S('attack', 38.8), pos: at(900, thHf + 0.1, 150), look: hfLook, fov: 60 },
    { t: S('attack', 44.4), pos: at(880, thHf + 0.12, 160), look: hfLook, fov: 60 },
    // Two agents reproduce it and pivot (after a cut): from outside the fence, looking in at their rooms; then up and back, to see the whole hall turn red
    { t: S('attack', 45.8), pos: lookIn(95, -30, 52), look: lookIn(0, 0, 2), fov: 58, hold: true },
    { t: S('attack', 53.6), pos: lookIn(72, 28, 44), look: lookIn(0, 0, 2), fov: 58 },
    { t: S('attack', 59.2), pos: at(540, thHf + 0.35, 330), look: v3.lerp([0, 0, 0], hf, 0.3), fov: 66 },
    { t: S('attack', 72), pos: at(480, thHf + 0.5, 300), look: [0, 0, 0], fov: 60 },
    { t: S('attack', 87), pos: at(600, thHf + 0.9, 340), look: [0, 0, 0], fov: 60 },
    // The afternoon: from inside the hall, over the room that gets code running, toward Hugging Face; then (after a cut) into Hugging Face, and back out
    { t: S('attack', 100.5), pos: at(540, thHf + 1.25, 330), look: [0, 0, 0], fov: 60 },
    { t: S('attack', 118.7), pos: e1.pos, look: e1.look, fov: 60, hold: true },
    { t: S('attack', 128.5), pos: v3.add(e1.pos, v3.scale(outward(e1.pos), -10)), look: e1.look, fov: 60 },
    { t: S('attack', 129.7), pos: at(1000, thHf + 0.2, 180), look: hfLook, fov: 60 },
    { t: S('attack', 137.7), pos: at(1180, thHf + 0.08, 90), look: v3.add(hf, [0, 30, 0]), fov: 58 },
    { t: S('attack', 157.1), pos: at(1020, thHf + 0.22, 200), look: v3.add(hf, [0, 30, 0]), fov: 58 },
    // Silence and lights out
    { t: S('silence', 0.4), pos: at(710, th0 - 0.3, 78), look: at(240, th0 - 0.3, 0), fov: 62 },
    { t: S('silence', 36.6), pos: at(650, th0 - 0.3, 66), look: at(240, th0 - 0.3, 0), fov: 62, hold: true },
    { t: S('lights', 2), pos: at(700, th0 - 0.3, 640), look: [0, 0, 0], fov: 56 },
    { t: S('after', 0.2), pos: at(720, th0 - 0.2, 600), look: [0, 0, 0], fov: 56 },
    // After
    { t: S('after', 31), pos: at(900, th0 + 0.3, 690), look: [0, 0, 0], fov: 56 },
    { t: S('epilogue', 0.5), pos: at(930, th0 + 0.4, 710), look: [0, 0, 0], fov: 56 },
    // Who is watching? From the dark hall, slowly up and back and round: the far-off lights come on, one by one, as the film asks
    { t: S('question', -2), pos: at(1000, th0 + 0.6, 640), look: [0, 0, 0], fov: 56, hold: true },
    { t: S('question', 60), pos: at(1200, th0 + 0.95, 950), look: [0, 0, 0], fov: 58 },
    { t: S('question', 150), pos: at(1500, th0 + 1.5, 1400), look: [0, 0, 0], fov: 62 },
    { t: S('question', 173.4), pos: at(1560, th0 + 1.65, 1560), look: [0, 0, 0], fov: 64 },
    { t: DURATION, pos: at(1500, th0 + 2.0, 1700), look: [0, 0, 0], fov: 66, hold: true },
  ];
}

export type Label = { t0: number; t1: number; anchor: (w: World) => V3; text: string; sub?: string; dx: number; dy: number; /** Not drawn on a tall (phone) picture, where it would sit on something else. */ wideOnly?: boolean };

/** Short labels drawn on the picture, in the manner of a technical drawing. They say what a shape stands for. */
export function labels(): Label[] {
  const aisleMid = (w: World): V3 => {
    const p = w.protagonist;
    return [w.x[p] - w.ux[p] * 4.6 - w.uz[p] * 5, 1.2, w.z[p] - w.uz[p] * 4.6 + w.ux[p] * 5];
  };
  // A point on the fence a little round from the gate, where its label can stand without crossing the gate's.
  const fenceAside = (w: World): V3 => at(G.fence, w.gate.theta + 0.1, 5);
  return [
    { t0: S('room', 3.6), t1: S('room', 9.4), anchor: w => [w.x[w.protagonist], 1.15, w.z[w.protagonist]], text: 'An agent', sub: 'one running copy of an AI model', dx: 70, dy: -52 },
    { t0: S('history', 1.2), t1: S('history', 9.8), anchor: aisleMid, text: 'The hallway', sub: 'the shared package cache (Artifactory), a service many of the agents could use', dx: -270, dy: -150 },
    { t0: S('sandbox', 10.2), t1: S('sandbox', 14.4), anchor: w => at(300, w.theta0 + 0.9, 0), text: 'Rooms', sub: 'tens of thousands of sandboxes, each meant to hold one agent', dx: 50, dy: 50 },
    { t0: S('sandbox', 11.6), t1: S('sandbox', 17.2), anchor: () => [0, G.towerH, 0], text: 'The grader', sub: 'the program that marks each answer', dx: 90, dy: -60 },
    { t0: S('tasks', 0.4), t1: S('tasks', 31), anchor: () => [0, G.towerH, 0], text: 'The grader', sub: 'the program that marks each answer', dx: -110, dy: 100, wideOnly: true },
    { t0: S('tower', 2.5), t1: S('tower', 12), anchor: () => [0, G.towerH, 0], text: 'The grader', sub: 'the program that marks each answer', dx: 90, dy: -40 },
    { t0: S('exit', 0.8), t1: S('exit', 6.8), anchor: fenceAside, text: 'The fence', sub: 'meant to keep the agents off the internet', dx: 70, dy: -90 },
    { t0: S('exit', 2), t1: S('exit', 8.4), anchor: w => [w.gate.at[0], 6, w.gate.at[2]], text: 'The gate', sub: 'the cache’s link to the internet, for downloading packages', dx: 80, dy: -85 },
    { t0: S('modal', 1.8), t1: S('modal', 19.4), anchor: w => w.modalAt, text: 'A code-testing app', sub: 'run by an outside customer; a more flexible base for going online, then for the attack', dx: 60, dy: -130 },
    { t0: S('attack', 2), t1: S('attack', 9.6), anchor: w => w.hfAt, text: 'Hugging Face', sub: 'a company outside the test', dx: 150, dy: -150 },
    { t0: S('attack', 29), t1: S('attack', 45), anchor: w => w.hfAt, text: 'Hugging Face', sub: 'a company outside the test', dx: 150, dy: -150 },
    { t0: S('silence', 2.2), t1: S('silence', 36.8), anchor: w => [w.people.at[0], 14, w.people.at[2]], text: 'People', sub: 'the humans responsible for the test', dx: -130, dy: -60 },
  ];
}

export { ramp };
