/**
 * The score of "The day before": instrumental beds composed in code (scripts/day-before-score.ts, with the instruments the first film's
 * music was made with), one for each mood, and the parts of the film each plays under. Nothing is sampled or downloaded, so there is
 * nothing to license: the music is ours.
 *
 * It is not tied to the film's clock. A bed plays on a loop (the end of each is built to run into its beginning) and the film changes
 * bed, with a slow crossfade, when it enters a part of a different mood, so a jump, a step or a decision's long wait never leaves the music
 * in the wrong place. The player ducks it under the narrator, keeps it quietly going while the film waits for a choice, and fades it
 * out when the viewer pauses.
 *
 * One small theme runs through all of it, a rising arch in D that comes home: D F A G F D. In the lamp it is heard whole and calm; in the
 * evening warmer; in the first hour it breaks (the last notes missing, then flat); while nobody knows who, only its first interval is asked
 * and not answered; under the decisions it sits in the lowest register, a note every few seconds; in the first morning it falls, pale;
 * and in the hot wash it is finally played to the end, in the major, as the lights come back.
 */
export type Mood = 'lamp' | 'evening' | 'unease' | 'unknown' | 'wait1' | 'dawn' | 'wait2' | 'wait3' | 'resolve';

export type MoodDef = {
  id: Mood;
  /** What it is for, in plain words. */
  for: string;
  /** The scenes (ids in film.ts) it plays under. */
  scenes: string[];
  /** Seconds of one bed. A bed that loops runs into itself; one that does not plays once and fades. */
  seconds: number;
  loop: boolean;
};

export const MOODS: MoodDef[] = [
  { id: 'lamp', for: 'The cold open: a lamp comes on over a model city. Quiet, warm, a little uncanny. The title arrives on an open fifth.', scenes: ['open'], seconds: 60, loop: false },
  { id: 'evening', for: 'Before: an ordinary Tuesday evening in the city. Warm, slow, nothing wrong yet.', scenes: ['before'], seconds: 64, loop: true },
  { id: 'unease', for: 'The first hour: the lights go out district by district. The theme breaks; a clock begins.', scenes: ['hour'], seconds: 90, loop: true },
  { id: 'unknown', for: 'Who did this? Nobody knows. Suspended: a question that is asked and not answered.', scenes: ['who'], seconds: 72, loop: true },
  { id: 'wait1', for: 'Decisions one and two: the clock is running and the film waits. Low, steady, a soft tick.', scenes: ['brake', 'say'], seconds: 96, loop: true },
  { id: 'dawn', for: 'The first morning: pale, cold, tired. The theme falls instead of rising.', scenes: ['morning'], seconds: 64, loop: true },
  { id: 'wait2', for: 'Decisions three and four: heavier. A slow heart under darker chords.', scenes: ['powers', 'pause'], seconds: 96, loop: true },
  { id: 'wait3', for: 'Decision five, who is in the room: warmer, because it is about people. The theme returns, not yet home.', scenes: ['rules'], seconds: 104, loop: true },
  { id: 'resolve', for: 'The hot wash: the lights come back and the theme is played to its end, in the major. Nothing is settled.', scenes: ['wash'], seconds: 84, loop: false },
];
export const MOOD_BY_ID: Record<Mood, MoodDef> = Object.fromEntries(MOODS.map(m => [m.id, m])) as Record<Mood, MoodDef>;
/** Which bed plays under a scene. */
export const MOOD_OF_SCENE: Record<string, Mood> = Object.fromEntries(MOODS.flatMap(m => m.scenes.map(s => [s, m.id])));

/** What has been rendered: by mood id. Written by scripts/day-before-score.ts. */
export type MusicManifest = {
  version: 1;
  generated?: string;
  /** `seconds` is the bed's own length; `length` is the file's, which for a bed that does not loop includes the tail that dies away after it. */
  beds: Record<string, { file: string; seconds: number; length: number; loop: boolean; loudness?: number }>;
};
