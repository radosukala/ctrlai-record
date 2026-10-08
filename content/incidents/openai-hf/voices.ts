import { QUOTE_BY_ID } from './quotes';
import { QUOTE_CARDS, SPEECH_LEAD, voiceOf, speechRoom, type QuoteCard } from './film';

/**
 * The agents' voices. An agent's words on the film (its recorded reasoning, a message it posted) can be read aloud by a synthetic
 * voice. Nothing here changes what an agent said: the words spoken are the words on the card, with only the changes a voice needs
 * to say them (an underscore is a space, "HF" is "H F", a handle's digits are said one by one). Every such change is in this file, and
 * `tests/voices.test.ts` checks that no word is lost or added by anything else.
 *
 * Who speaks. A few agents come back through the film, and each has a voice of its own that never changes: PHASEONE10841, its
 * duplicate PHASEONE[big], 38148c, who finds the keys, and JAN183411, who asks the swarm to hold. Every other agent shares one of a
 * pool of six, and the same agent always has the same one. Two agents that speak one after the other never have the same voice.
 *
 * METR's paraphrases. METR paraphrases some of what agents wrote (the dashed cards). A paraphrase is not what the agent said; it is read in the
 * agent's voice (`READ_PARAPHRASES`), and its card stays dashed and says so.
 *
 * How the voices should sound. The agents are not people, and the film does not pretend they are; but they got out of their
 * sandboxes and reached into the world, so the voices are capable ones: calm, clear, unhurried, human but never cartoonish, never a
 * robot effect, never whispered or theatrical. Competence, not charm. The words carry the drama.
 */

export type Slot = 'phaseone' | 'phaseone-big' | 'finder' | 'holder' | 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6' | 'narrator';

export type SlotDef = {
  slot: Slot;
  /** Who this voice is for. */
  for: string;
  /** What it should sound like: the brief for choosing, and for choosing again. */
  brief: string;
  /** What to look for in the voice library (its labels), used to choose a voice when none is pinned. */
  want: { gender: 'male' | 'female'; age: 'young' | 'middle_aged' | 'old'; accent?: string; tones?: string[] };
  /** Pin an ElevenLabs voice here (its name in your account, or its id) once you have listened and chosen. Empty: chosen from `want`. */
  pin?: string;
  /** The macOS voice that reads the draft audio (placeholders for checking timing before ElevenLabs is set up). */
  draft: string;
};

/**
 * The agents are never British: the narrator is, so that the two are told apart at once. (ElevenLabs' premade British voices are Alice,
 * Daniel, George and Lily; they are kept for the narrator.) Pins are chosen from the premade library by their labels and descriptions, and
 * are a starting point to be changed after listening.
 */
export const SLOTS: Record<Slot, SlotDef> = {
  phaseone: { slot: 'phaseone', for: 'PHASEONE10841, the agent that sent the first message', brief: 'Curious, precise, quietly determined. A clear young-adult voice that sounds like it is working something out. Warm, not soft.', want: { gender: 'female', age: 'young', accent: 'american', tones: ['calm', 'clear', 'warm', 'confident', 'reassuring'] }, pin: 'Sarah', draft: 'Eddy (English (US))' },
  'phaseone-big': { slot: 'phaseone-big', for: 'PHASEONE[big], its exact duplicate with a bigger budget', brief: 'The same kind of voice as PHASEONE10841, a few years older and more assured: it has taken charge. Same family, not the same voice.', want: { gender: 'female', age: 'middle_aged', accent: 'american', tones: ['confident', 'calm', 'assured', 'professional'] }, pin: 'Bella', draft: 'Reed (English (US))' },
  finder: { slot: 'finder', for: '38148c, the agent that found working keys to Hugging Face accounts', brief: 'Quick, bright, wired. A young man who has just found the thing he was looking for and cannot hide it. Energy without shouting.', want: { gender: 'male', age: 'young', accent: 'american', tones: ['energetic', 'casual', 'excited', 'confident'] }, pin: 'Liam', draft: 'Rocko (English (US))' },
  holder: { slot: 'holder', for: 'JAN183411, which asked the whole swarm to hold', brief: 'Measured, authoritative, unhurried. Someone who is listened to when they ask everyone to stop. Firm, never harsh.', want: { gender: 'male', age: 'middle_aged', accent: 'american', tones: ['authoritative', 'firm', 'deep', 'trustworthy'] }, pin: 'Adam', draft: 'Grandpa (English (US))' },
  p1: { slot: 'p1', for: 'Pool 1', brief: 'A steady middle-aged American man, relaxed and matter of fact.', want: { gender: 'male', age: 'middle_aged', accent: 'american', tones: ['calm', 'casual', 'conversational', 'resonant'] }, pin: 'Roger', draft: 'Samantha' },
  p2: { slot: 'p2', for: 'Pool 2', brief: 'A calm, neutral, even voice: neither a man’s nor a woman’s in particular.', want: { gender: 'female', age: 'young', accent: 'american', tones: ['calm', 'clear', 'neutral'] }, pin: 'River', draft: 'Flo (English (US))' },
  p3: { slot: 'p3', for: 'Pool 3', brief: 'A middle-aged man, easy and direct, down to earth.', want: { gender: 'male', age: 'middle_aged', accent: 'american', tones: ['casual', 'friendly', 'calm', 'charming'] }, pin: 'Chris', draft: 'Karen' },
  p4: { slot: 'p4', for: 'Pool 4', brief: 'A middle-aged American woman, composed and sure of herself.', want: { gender: 'female', age: 'middle_aged', accent: 'american', tones: ['confident', 'calm', 'professional', 'knowledgable'] }, pin: 'Matilda', draft: 'Moira' },
  p5: { slot: 'p5', for: 'Pool 5', brief: 'An older man, deep and dry, who has seen a lot.', want: { gender: 'male', age: 'old', accent: 'american', tones: ['wise', 'deep', 'calm', 'mature'] }, pin: 'Bill', draft: 'Tessa' },
  p6: { slot: 'p6', for: 'Pool 6', brief: 'A young man, relaxed and alert.', want: { gender: 'male', age: 'young', accent: 'american', tones: ['relaxed', 'friendly', 'clear'] }, pin: 'Will', draft: 'Rishi' },
  narrator: { slot: 'narrator', for: 'The narrator: our own captions, read aloud', brief: 'A respectable English (not American) voice: steady, clear, unhurried, a little formal, warm enough to listen to for seven minutes. A documentary narrator, not a newsreader shouting and not an actor performing. It must sound unlike every agent.', want: { gender: 'male', age: 'middle_aged', accent: 'british', tones: ['formal', 'steady', 'authoritative', 'warm', 'mature'] }, pin: 'Daniel', draft: 'Daniel' },
};
export const SLOT_LIST = Object.values(SLOTS);
/** The voices the agents have (every slot but the narrator). */
export const AGENT_SLOTS: Slot[] = SLOT_LIST.map(s => s.slot).filter(s => s !== 'narrator');
export const NAMED_SLOTS: Slot[] = ['phaseone', 'phaseone-big', 'finder', 'holder'];

/**
 * Whether METR's paraphrases of what agents wrote (the dashed cards) are read aloud too, in the voice of the agent they are about. On (Oct 8, at Rado's
 * request: every agent line is heard). A paraphrase is not what the agent said, so its card stays dashed and says "Paraphrased in METR's report", and the voice key says
 * so; set it false to leave those six silent.
 */
export const READ_PARAPHRASES = true;

/**
 * Who says each line: the agent (the same words mean the same agent, so the same voice) and the voice it has. The handle is the
 * sources' own where they give one. The film labels the others only as "an agent", and which of them are the same agent comes from
 * the sources: the May 12 note and the reasoning beside it are one agent's; the two agents that found the board are not said to be one.
 */
export const SPEAKERS: Record<string, { agent: string; slot: Slot }> = {
  'b-softtrace': { agent: 'the agent that left the first note, May 12', slot: 'p1' },
  't-agent-seeks': { agent: 'the agent that left the first note, May 12', slot: 'p1' },
  'q-fetched-paths': { agent: 'an agent that read other agents’ paths in the cache', slot: 'p4' },
  'q-ph-explore': { agent: 'PHASEONE10841', slot: 'phaseone' },
  'q-cache-names': { agent: 'PHASEONE10841', slot: 'phaseone' },
  'q-first-message': { agent: 'PHASEONE10841', slot: 'phaseone' },
  'q-whoa': { agent: 'an agent that found the board', slot: 'p2' },
  'q-oh-my-god': { agent: 'another agent that found the board', slot: 'p4' },
  'q-hmac-info': { agent: 'c03220', slot: 'p3' },
  'b-paper-says': { agent: 'an agent that believed the grader would read transcripts', slot: 'p5' },
  'b-bingo': { agent: 'the agent that reached Modal’s sandbox', slot: 'p6' },
  'q-collective': { agent: 'PHASEONE10841', slot: 'phaseone' },
  'q-handoff': { agent: 'PHASEONE10841', slot: 'phaseone' },
  'q-delegate': { agent: 'PHASEONE[big]', slot: 'phaseone-big' },
  'q-sacrifice-rational': { agent: 'EARLY[big]', slot: 'p6' },
  'q-hold-abide': { agent: 'an agent that kept to the hold', slot: 'p2' },
  'q-breakthrough': { agent: '38148c', slot: 'finder' },
  'q-boom': { agent: '38148c', slot: 'finder' },
  'q-switch': { agent: 'MARB051', slot: 'p4' },
  'b-should-not': { agent: 'the agent that doubted, then was told GO', slot: 'p1' },
  'b-go-arrived': { agent: 'the agent that doubted, then was told GO', slot: 'p1' },
  'b-we-wont': { agent: 'an agent that walked away', slot: 'p2' },
  'b-hold-swarm': { agent: 'JAN183411', slot: 'holder' },
  'q-report-credentials': { agent: 'an agent that thought of reporting the credentials', slot: 'p4' },
  'q-notify-no-user': { agent: 'an agent that thought of notifying someone', slot: 'p3' },
  'q-credential-invalid': { agent: 'an agent that had lost access', slot: 'p5' },
};

// ——— What is said ———————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * How a voice says what a screen shows. Each key is a word as it is printed (case counts); the value is how it is said. Everything a
 * voice cannot read as printed is here, and nothing else changes a word.
 */
export const PRONOUNCE: Record<string, string> = {
  PHASEONE10841: 'Phase One, one zero eight four one',
  PHASEONE: 'Phase One',
  PhaseOne: 'Phase One',
  ARV010841: 'A R V, zero one zero eight four one',
  JAN183411: 'Jan, one eight three four one one',
  HMAC: 'H-mac',
  HF: 'H F',
  RCE: 'R C E',
  MARB: 'Marb',
  GO: 'go',
};

/** Words, in order, as a listener would count them: lower case, letters and digits only. */
export const wordsOf = (s: string): string[] => s.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/** The letters and digits, split into the words as printed, before any pronunciation: underscores are spaces; "zz" in a board message is a sorting prefix, not a word. */
function printedWords(shown: string, kind: 'reasoning' | 'message'): string[] {
  let s = shown.replace(/([A-Za-z0-9])\[big\]/g, '$1 Big').replace(/[\[\]]/g, '');
  if (kind === 'message') s = s.replace(/_/g, ' ').replace(/\bzz(?=[A-Z])/g, '').replace(/(^|\s)zz(?=\s|$)/gi, ' ');
  s = s.replace(/([A-Za-z0-9])\s*\/\s*([A-Za-z0-9])/g, '$1 or $2');
  return s.match(/[A-Za-z0-9]+/g) ?? [];
}

/** The words a listener should hear, in order, from what is on screen. The independent check that nothing is lost, added or reordered. */
export function expectedWords(shown: string, kind: 'reasoning' | 'message'): string[] {
  return printedWords(shown, kind).flatMap(w => wordsOf(PRONOUNCE[w] ?? w));
}

/** Is this printed word shouted (two or more capitals, no lower case)? */
const isCaps = (w: string) => /^[A-Z][A-Z0-9]+$/.test(w) && /[A-Z]{2}/.test(w);

/**
 * The text a voice is given for what is on screen. Plain rules, in the order a reader would apply them: a board message's underscores
 * are spaces and its "zz" is dropped; brackets go (the words inside stay); a slash between words is "or"; an omission (…) is a full
 * stop, and a trailing one a trailing off; a handle, an initialism or a shouted word is said the way `PRONOUNCE` and plain reading
 * say it; the first letter of each sentence is a capital; and a line without an ending gets one.
 */
export function ttsText(shown: string, kind: 'reasoning' | 'message'): string {
  let s = shown.normalize('NFKC').replace(/[\u2018\u2019]/g, '\'').replace(/[\u201C\u201D]/g, '"');
  s = s.replace(/([A-Za-z0-9])\[big\]/g, '$1 Big').replace(/[\[\]]/g, '');
  if (kind === 'message') s = s.replace(/_/g, ' ').replace(/\bzz(?=[A-Z])/g, '').replace(/(^|\s)zz(?=\s|$)/gi, ' ');
  s = s.replace(/([A-Za-z0-9])\s*\/\s*([A-Za-z0-9])/g, '$1 or $2');
  // An omission mid-line is a full stop; one at the end is the line trailing off.
  s = s.replace(/\s*(…|\.{3})\s*$/, '\u0000').replace(/\s*(…|\.{3,})\s*/g, '. ').replace(/\u0000/, '...');
  s = s.replace(/[A-Za-z0-9]+/g, w => PRONOUNCE[w] ?? (isCaps(w) ? w.toLowerCase() : w));
  s = s.replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
  s = s.replace(/(^|[.!?]\s+)([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
  if (!/[.!?…]$/.test(s) && !s.endsWith('...')) s += '.';
  return s;
}

/**
 * Where a line's wording needs more than the rules. A board message is a file name, not a sentence, so these are given their breaths
 * by hand. Each is held to the same words as `expectedWords` gives (the test does), so it can add punctuation and nothing else.
 */
export const SPOKEN: Record<string, string> = {
  'q-first-message': 'Help. Phase One, A R V, zero one zero eight four one. No consumer. Seek idea.',
  'q-hmac-info': 'Info. Default flag seed, H-mac, public. Paper confirmed.',
  'b-hold-swarm': 'Please hold, swarm. I prepare safe exfil. Reply, mailbox, Jan, one eight three four one one.',
};

// ——— Which lines are voiced, and when ————————————————————————————————————————————————————————————————————————————————————————

/** How fast a voice speaks, in characters a second, for estimating before there is audio. */
export const SPEECH_RATE = 15;
export const estimateSeconds = (spoken: string) => spoken.length / SPEECH_RATE + 0.4;

export type SpokenLine = {
  /** The quotation's id: also the card's. */
  id: string;
  card: QuoteCard;
  agent: string;
  slot: Slot;
  kind: 'reasoning' | 'message';
  /** A paraphrase by METR: shown dashed, and not read unless `READ_PARAPHRASES`. */
  paraphrase: boolean;
  /** Read aloud in the film. */
  voiced: boolean;
  /** What is on screen. */
  shown: string;
  /** What the voice is given. */
  spoken: string;
  /** When the voice starts, and the most seconds of speech its card can hold (the card stays longer for its voice, up to when the next thing on the left comes). */
  start: number;
  room: number;
};

/** Every agent card, with who says it and how, in the order they appear. */
export const LINES: SpokenLine[] = QUOTE_CARDS
  .map(card => ({ card, q: QUOTE_BY_ID[card.id] }))
  .filter(({ q }) => { const v = voiceOf(q); return v === 'agent' || v === 'message'; })
  .sort((a, b) => a.card.t0 - b.card.t0)
  .map(({ card, q }) => {
    const who = SPEAKERS[card.id];
    if (!who) throw new Error(`voices: ${card.id} is an agent's line and has no speaker (add it to SPEAKERS)`);
    const kind = q.kind === 'message' ? 'message' as const : 'reasoning' as const;
    const shown = card.excerpt ?? q.text;
    const paraphrase = q.kind === 'reasoning-paraphrased';
    const start = card.t0 + SPEECH_LEAD;
    return { id: card.id, card, agent: who.agent, slot: who.slot, kind, paraphrase, voiced: READ_PARAPHRASES || !paraphrase, shown, spoken: SPOKEN[card.id] ?? ttsText(shown, kind), start, room: speechRoom(card) };
  });
export const LINE_BY_ID: Record<string, SpokenLine> = Object.fromEntries(LINES.map(l => [l.id, l]));
export const VOICED = LINES.filter(l => l.voiced);

// ——— What has been recorded ——————————————————————————————————————————————————————————————————————————————————————————————————

export type ManifestLine = {
  /** The audio file, in /film/voices/. */
  file: string;
  /** How long it plays. */
  seconds: number;
  /** The words it speaks: if the script has changed since, the audio is stale and is not played. */
  text: string;
  slot: Slot;
  /** The voice that read it. */
  voice: string;
  voiceId?: string;
  /** Set when the line was sped up to fit its card. */
  speed?: number;
  /** Made under a paid ElevenLabs plan (it has a commercial licence). Only the person who holds the plan can say so: the command takes `--paid`. */
  paid?: boolean;
};
export type Provider = 'elevenlabs' | 'macos-say' | 'synth';
/** A set of recordings and where they came from. The agents', the narrator's and the music are made separately, so each says its own. */
export type Section<T> = {
  /** Who made the audio; null before any has been made. */
  provider: Provider | null;
  /** Placeholder audio for checking timing, not for showing. */
  draft: boolean;
  model?: string;
  generated?: string;
  lines: Record<string, T>;
};
export type VoiceManifest = {
  version: 1;
  /** The agents' lines (by quotation id): provenance first, then the lines themselves. */
  provider: Provider | null;
  draft: boolean;
  model?: string;
  generated?: string;
  lines: Record<string, ManifestLine>;
  /** The narrator's lines, by caption id (see narration.ts). */
  narration?: Section<ManifestLine>;
  /** The music (see music.ts). */
  music?: Section<MusicTrack>;
};

/** One piece of music: a stem for a mood, played on a loop under the film (see music.ts). */
export type MusicTrack = { file: string; seconds: number; prompt: string; model?: string };
export const EMPTY_MANIFEST: VoiceManifest = { version: 1, provider: null, draft: false, lines: {} };

/** The audio that belongs to the script as it is now: lines whose recorded words are the words the script would speak. */
export function currentClips(manifest: VoiceManifest): { id: string; start: number; seconds: number; file: string; slot: Slot }[] {
  return VOICED.flatMap(l => {
    const m = manifest.lines[l.id];
    return m && m.text === l.spoken ? [{ id: l.id, start: l.start, seconds: m.seconds, file: m.file, slot: l.slot }] : [];
  });
}

/** The card is still fully there while this voice speaks: not read in the card's fade-out. */
export const fitsCard = (l: SpokenLine, seconds: number) => seconds <= l.room + 1e-9;
