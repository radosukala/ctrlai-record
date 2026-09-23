import type { Arrangement, Episode, Fact, Screen } from '@/content/tomorrows';

/** A screen as it appears in one reading: the script's screen plus what the player needs to know about it. */
export interface RunScreen extends Screen {
  key: string;
  /** Set on the screen that ends in a choice. */
  choice?: Arrangement['branches'];
  /** Set on the last screen of a run, the one that leads back to 8:41. */
  closing?: boolean;
}

export function getArrangement(episode: Episode, id: string): Arrangement {
  const arrangement = episode.arrangements.find(item => item.id === id);
  if (!arrangement) throw new Error(`Unknown arrangement "${id}" in ${episode.slug}`);
  return arrangement;
}

/**
 * The screens of one reading, in order. The first reading opens cold and plays the whole prologue; a replay starts
 * at 8:41 with a line saying who owns the machine this time. Branch and closing screens join once a choice is made.
 */
export function buildRun(episode: Episode, arrangementId: string, options: { first: boolean; branchId: string | null }): RunScreen[] {
  const arrangement = getArrangement(episode, arrangementId);
  const screens: RunScreen[] = [];
  const add = (screen: Screen, key: string, extra: Partial<RunScreen> = {}) => screens.push({ ...screen, key, ...extra });

  if (options.first) {
    episode.opening.forEach((screen, index) => add(screen, `opening-${index}`));
    episode.prologue.forEach((screen, index) => add(screen, `prologue-${index}`));
  } else {
    add({ ...episode.replay, lines: [{ text: arrangement.rewind, style: 'meta' }, ...episode.replay.lines] }, `replay-${arrangement.id}`);
  }
  add(arrangement.message, `message-${arrangement.id}`);
  arrangement.after.forEach((screen, index) =>
    add(screen, `after-${arrangement.id}-${index}`, index === arrangement.after.length - 1 ? { choice: arrangement.branches } : {}));

  if (options.branchId) {
    const branch = arrangement.branches.find(item => item.id === options.branchId);
    if (!branch) throw new Error(`Unknown choice "${options.branchId}" in ${arrangement.id}`);
    branch.screens.forEach((screen, index) => add(screen, `branch-${arrangement.id}-${branch.id}-${index}`));
    arrangement.closing.forEach((screen, index) =>
      add(screen, `closing-${arrangement.id}-${index}`, index === arrangement.closing.length - 1 ? { closing: true } : {}));
  }
  return screens;
}

export function finaleScreens(episode: Episode): RunScreen[] {
  return episode.finale.map((screen, index) => ({ ...screen, key: `finale-${index}` }));
}

/** How many lines are visible the moment a screen appears. */
export function linesOnEntry(screen: Screen): number {
  return screen.reveal === 'all' ? screen.lines.length : 1;
}

/** The story's clock: the latest time mentioned on anything the reader has seen so far. */
export function clockAt(screens: Screen[], screenIndex: number, shown: number, start: string): string {
  let clock = start;
  for (let index = 0; index <= screenIndex && index < screens.length; index++) {
    const screen = screens[index];
    if (screen.at) clock = screen.at;
    const visible = index === screenIndex ? shown : screen.lines.length;
    for (const line of screen.lines.slice(0, visible)) if (line.at) clock = line.at;
  }
  return clock;
}

export function toMinutes(clock: string): number {
  const [hours, minutes] = clock.split(':').map(Number);
  return hours * 60 + minutes;
}

export function fromMinutes(total: number): string {
  const value = Math.max(0, Math.round(total));
  return `${String(Math.floor(value / 60) % 24).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

export function factsById(episode: Episode): Map<string, Fact> {
  return new Map(episode.facts.map(fact => [fact.id, fact]));
}

/** Every screen the script can show, whichever way the reader goes. Used by tests and by nothing else. */
export function allScreens(episode: Episode): Screen[] {
  return [
    ...episode.opening,
    ...episode.prologue,
    episode.replay,
    ...episode.arrangements.flatMap(arrangement => [
      arrangement.message,
      ...arrangement.after,
      ...arrangement.branches.flatMap(branch => branch.screens),
      ...arrangement.closing,
    ]),
    ...episode.finale,
  ];
}

// ——— The player: one reader's way through an episode ———

export type Mode = 'run' | 'rewinding' | 'picker' | 'finale' | 'end';

export interface PlayerState {
  mode: Mode;
  arrangement: string;
  first: boolean;
  branch: string | null;
  screen: number;
  shown: number;
  /** Arrangements read to the end. */
  seen: string[];
  moves: number;
}

export type PlayerAction =
  | { type: 'advance' }
  | { type: 'choose'; branch: string }
  | { type: 'rewind' }
  | { type: 'rewound' }
  | { type: 'pick'; arrangement: string }
  | { type: 'finale' }
  | { type: 'restart' };

export function initialState(episode: Episode): PlayerState {
  const arrangement = episode.arrangements[0].id;
  const screens = buildRun(episode, arrangement, { first: true, branchId: null });
  return { mode: 'run', arrangement, first: true, branch: null, screen: 0, shown: linesOnEntry(screens[0]), seen: [], moves: 0 };
}

export function screensFor(episode: Episode, state: PlayerState): RunScreen[] {
  if (state.mode === 'finale' || state.mode === 'end') return finaleScreens(episode);
  return buildRun(episode, state.arrangement, { first: state.first, branchId: state.branch });
}

/** Ctrl+Z works once the message has arrived: there is nothing to undo before it. */
export function canRewind(episode: Episode, state: PlayerState): boolean {
  if (state.mode === 'finale' || state.mode === 'end') return true;
  if (state.mode !== 'run') return false;
  const screens = screensFor(episode, state);
  return state.screen >= screens.findIndex(screen => screen.tone === 'phone');
}

export function reducerFor(episode: Episode) {
  return function reduce(state: PlayerState, action: PlayerAction): PlayerState {
    switch (action.type) {
      case 'advance': {
        if (state.mode !== 'run' && state.mode !== 'finale') return state;
        const screens = screensFor(episode, state);
        const current = screens[state.screen];
        const moves = state.moves + 1;
        if (state.shown < current.lines.length) return { ...state, shown: state.shown + 1, moves };
        if (current.choice && !state.branch) return state;
        if (state.screen < screens.length - 1) {
          return { ...state, screen: state.screen + 1, shown: linesOnEntry(screens[state.screen + 1]), moves };
        }
        if (state.mode === 'finale') return { ...state, mode: 'end', moves };
        const seen = state.seen.includes(state.arrangement) ? state.seen : [...state.seen, state.arrangement];
        if (seen.length === episode.arrangements.length) {
          return { ...state, seen, mode: 'finale', screen: 0, shown: linesOnEntry(episode.finale[0]), moves };
        }
        return { ...state, seen, mode: 'rewinding', moves };
      }
      case 'choose': {
        if (state.mode !== 'run' || state.branch) return state;
        const current = screensFor(episode, state)[state.screen];
        if (!current.choice || state.shown < current.lines.length || !current.choice.some(branch => branch.id === action.branch)) return state;
        const next = buildRun(episode, state.arrangement, { first: state.first, branchId: action.branch })[state.screen + 1];
        return { ...state, branch: action.branch, screen: state.screen + 1, shown: linesOnEntry(next), moves: state.moves + 1 };
      }
      case 'rewind': {
        if (!canRewind(episode, state)) return state;
        if (state.mode !== 'run') return { ...state, mode: 'picker' };
        const current = screensFor(episode, state)[state.screen];
        const finished = !!current.closing && state.shown >= current.lines.length;
        const seen = finished && !state.seen.includes(state.arrangement) ? [...state.seen, state.arrangement] : state.seen;
        return { ...state, seen, mode: 'rewinding', moves: state.moves + 1 };
      }
      case 'rewound':
        return state.mode === 'rewinding' ? { ...state, mode: 'picker' } : state;
      case 'pick': {
        const screens = buildRun(episode, action.arrangement, { first: false, branchId: null });
        return { ...state, mode: 'run', arrangement: action.arrangement, first: false, branch: null, screen: 0, shown: linesOnEntry(screens[0]) };
      }
      case 'finale':
        return { ...state, mode: 'finale', screen: 0, shown: linesOnEntry(episode.finale[0]) };
      case 'restart':
        return initialState(episode);
    }
  };
}
