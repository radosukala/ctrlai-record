/**
 * The shape of a scenario film: scenes that draw the model at a given time, cues (words, cards, stamps, choices) that are
 * visible between two times, and decisions where the web player stops until the viewer chooses. Everything is a pure
 * function of time `t`, in seconds of film time, so any frame can be drawn on its own (to scrub, to look at a still, or to
 * render video).
 */
import type { State } from './render';

export type CardCue = { id: string; side: 'left' | 'right'; chip: string; kind: string; html: string; src: string; top?: number; /** a placeholder for a voice we have not sourced yet */ gap?: boolean };

export type Cue =
  | { k: 'caption'; a: number; b: number; text: string; left?: boolean }
  | ({ k: 'card'; a: number; b: number } & CardCue)
  | { k: 'stamp'; a: number; b: number; head: string; text?: string }
  | { k: 'label'; a: number; b: number; text: string }
  | { k: 'tl'; a: number; b: number; cur: number | [number, number] }
  | { k: 'hyp'; a: number; b: number; kicker: string; items: { k: string; b: string; s: string; at: number }[] }
  | { k: 'ask'; a: number; b: number; id: string; h: string; p?: string; timer?: string }
  | { k: 'title'; a: number; b: number; eyebrow: string; h: string; sub: string }
  | { k: 'ledger'; a: number; b: number; kicker: string; h: string; foot: string }
  | { k: 'note'; a: number; b: number; html: string };

export type Decision = {
  id: string;
  /** Short name, used in the hot wash. */
  name: string;
  /** When the question and its options come up: from here the viewer can choose. */
  askAt: number;
  /** The web player stops here, a moment after the question is up, and waits until the viewer chooses. A video holds on the options instead (the ask cue lasts past this). */
  pauseAt: number;
  /** Seconds after `pauseAt` that the options stay up before they give way to what people on the record have said. */
  hold: number;
  /** The narrator reading the question, played while the film waits (it is not on the film's clock: the clock is stopped). */
  clip?: Clip;
  opts: { k: string; b: string }[];
  /** What the hot wash shows when nobody has chosen yet: an example, marked as one. */
  example: string;
};

export type SceneDef = {
  id: string;
  title: string;
  t0: number;
  t1: number;
  /** Which bed of the music plays under it. */
  mood?: string;
  /** The model at scene time u (seconds since the scene began); `t` is film time, for flicker. */
  state: (u: number, t: number) => State;
};

/** One recorded line of narration: where it starts in film time, how long it plays, and where the audio is. */
export type Clip = { id: string; at: number; dur: number; src: string; text: string };

/** One bed of music: where it is, how long it is, and whether it loops (a bed that does not is scored to its scene). */
export type MusicBed = { id: string; src: string; dur: number; loop: boolean };

export type FilmDef = {
  duration: number;
  /** The narrator, when it has been recorded. Without it the film is silent and its captions last as long as they take to read. */
  clips?: Clip[];
  /** The score, when it has been rendered: one bed for each mood. A scene says which mood it is. */
  beds?: MusicBed[];
  scenes: SceneDef[];
  cues: Cue[];
  decisions: Decision[];
  /** Where ← and → step to (the start of each beat). */
  stops: number[];
};
