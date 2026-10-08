import type { SceneId } from './film';

/**
 * The music: a dark, restrained instrumental score under the film, made with Eleven Music (ElevenLabs), so it is ours to use under the plan
 * it was made on. It is not tied to the film's clock. It is a few beds, one for each mood, played on a loop, and the film changes bed
 * (a slow crossfade) when it enters a part of a different mood. So a jump, a step or a pause never leaves the music in the wrong place: it
 * carries on, and finds the right bed. It makes way for a voice (the narrator or an agent) and stops when the film is paused.
 *
 * The prompts follow ElevenLabs' own guidance for scores: decide the genre, the mood, the instruments, the tempo and the key; say
 * "instrumental only"; narrate the arrangement. No artist, song or label names (their terms forbid them). Each bed has no beginning and no
 * end to speak of, so that it can be looped.
 */

export type Mood = 'cold' | 'signal' | 'surge' | 'hollow' | 'aftermath' | 'open';

export type MoodDef = {
  id: Mood;
  /** What it is for, in plain words. */
  for: string;
  /** The parts of the film it plays under. */
  scenes: SceneId[];
  /** The prompt, for Eleven Music. */
  prompt: string;
  /** How long one bed is, in seconds. It is looped (with a crossfade) for as long as the film needs it. */
  seconds: number;
};

export const MOODS: MoodDef[] = [
  {
    id: 'cold', for: 'The test, the sandboxes, the tasks, the history, the way out: a vast, cold, quiet place where nothing has happened yet.',
    scenes: ['room', 'sandbox', 'tasks', 'history', 'exit'], seconds: 150,
    prompt: 'Dark ambient cinematic underscore for a documentary about machines slipping out of a controlled test. Cold, vast and unsettling. D minor, around 50 BPM but with no drums and no beat. A deep sub-bass drone that never leaves; a slow evolving synthesizer pad; a few sparse low piano notes with very long reverb tails; faint metallic resonances far away. Cavernous plate reverb, tape-warm. Restrained: no melody, no climax, nothing resolves. The same texture from start to end, so it can loop. Instrumental only.',
  },
  {
    id: 'signal', for: 'The board, the replies, the grader, the outside base, the collective, the projects: something is waking up in the dark.',
    scenes: ['first', 'replies', 'tower', 'modal', 'collective', 'scale', 'projects', 'after'], seconds: 150,
    prompt: 'Dark ambient cinematic underscore: curiosity turning to unease, as if something is waking up in the dark. D minor, 60 BPM. A low drone, a soft pulsing synthesizer arpeggio like distant signals, glassy high textures, very quiet ticking percussion far back in the mix, slow swells that build and fall back. Tension rising slowly but never breaking. No melody, no drum hits, no climax. The same texture from start to end, so it can loop. Instrumental only.',
  },
  {
    id: 'surge', for: 'The attack: dark, relentless, cold and mechanical rather than heroic, kept low under the words.',
    scenes: ['attack'], seconds: 150,
    prompt: 'Dark cinematic tension underscore for a relentless, coordinated attack unfolding in the background. D minor, 78 BPM. Deep pulsing sub-bass, low string tremolo, metallic percussion hits and a distant industrial rhythm, dissonant low brass swells; intensity growing but controlled, cold and mechanical rather than heroic. No melody, no vocals, no resolution. The same intensity from start to end, so it can loop. Instrumental only.',
  },
  {
    id: 'hollow', for: 'Nobody was told; lights out: the silence after something went wrong.',
    scenes: ['silence', 'lights'], seconds: 120,
    prompt: 'Hollow dark ambient: the silence after something has gone wrong. Very sparse. One low sustained drone, a faint cold wind-like texture, an occasional single distant note that decays into silence, a large empty reverb. No rhythm, no melody, no build. Tension suspended and unresolved. The same texture from start to end, so it can loop. Instrumental only.',
  },
  {
    id: 'aftermath', for: 'What came after, and what it means: somber, quiet, serious, human.',
    scenes: ['epilogue'], seconds: 150,
    prompt: 'Somber reflective cinematic ambient for the aftermath and what it means. D minor, 56 BPM. Slow low cello and soft piano chords with long reverb, a warm sub drone underneath, a barely audible faint rise at the end of phrases that never fully resolves. Quiet, serious, human. The same mood from start to end, so it can loop. Instrumental only.',
  },
  {
    id: 'open', for: 'The question the film ends on: serious while the facts are read, uneasy under the system card, then wider and warmer as far-off lights come on, and never resolved.',
    scenes: ['question'], seconds: 240,
    prompt: 'Cinematic ambient underscore that grows from restraint into an open question. D minor, 56 BPM. Four minutes. Begin with a low sub drone and sparse low piano notes with long reverb, serious and still. Then a faint high dissonant shimmer and a slow soft tick, uneasy. Then an austere open fifth. Then, slowly, wider and warmer: soft pads in open chords that never settle, and far-off bell tones coming on one by one, then more of them, like distant lights. End on an unresolved sustained chord with a long tail. No drums, no melody, no climax. Instrumental only.',
  },
];
export const MOOD_BY_ID: Record<Mood, MoodDef> = Object.fromEntries(MOODS.map(m => [m.id, m])) as Record<Mood, MoodDef>;

/** Which bed plays under a part of the film. */
export const MOOD_OF_SCENE: Record<SceneId, Mood> = Object.fromEntries(MOODS.flatMap(m => m.scenes.map(s => [s, m.id]))) as Record<SceneId, Mood>;
