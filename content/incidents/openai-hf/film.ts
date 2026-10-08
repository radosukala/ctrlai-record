import type { Cite, Quote } from './types';
import { QUOTE_BY_ID } from './quotes';
import VOICE_MANIFEST from './voices.manifest.json';

const M = (at: string): Cite => ({ s: 'metr', at });
const T = (at: string): Cite => ({ s: 'oai-tr', at });
const B = (at: string): Cite => ({ s: 'oai-blog', at });
const H = (at: string): Cite => ({ s: 'hf', at });
const A = (at: string): Cite => ({ s: 'oai-astra', at });
const F = (at: string): Cite => ({ s: 'fortune', at });

/**
 * The film script: what is said, quoted and counted, and when (in seconds of screen time). Everything the film claims lives
 * here and points at the reconstruction's evidence: every quotation is one of the machine-checked quotations (an excerpt must
 * be an exact run of its words), every number is one the sources give at the moment shown, and every caption is our own plain
 * sentence about something the reconstruction already sources. How it looks (the camera, the hall, the lights) is drawing, not
 * evidence, and is labelled as such on the page.
 *
 * Three kinds of voice are kept apart on screen, and each looks different: an AGENT (its recorded reasoning, or a message it
 * posted: amber, with its name, on the left), an ORGANISATION (OpenAI, METR or Hugging Face: a paper card with its name and where
 * in its report, on the right), and US (the captions: plain white words at the foot of the picture). A quotation's voice follows
 * from the quotation itself.
 *
 * Incident time and screen time are separate. The film says what moment it is showing; between documented moments it does not
 * show a clock, a growth curve or a rate. It does not draw the story in a different order from the sources either: the way out
 * of the sandboxes (the shared cache, from July 8) comes before the attack on Hugging Face, and the lights go out as the sources
 * say they did, in two steps: a large fraction on July 12, and OpenAI's own stopping of the runs on July 19.
 *
 * How long a thing stays on screen is not chosen by eye: a caption stays for the time it takes to read it, a quotation for the
 * time it takes to see who is speaking and then read it. Authors give a start; the end follows from the words (see `cap` and
 * `card` below), and the tests check that nothing sits on top of anything else.
 */

/** A day, as the sources date it: an ISO date in UTC. */
export type Day = string;

export type Beat = {
  id: string;
  title: string;
  t0: number;
  t1: number;
  /** The moment of the incident this part shows, in the reconstruction's own words. */
  when: string;
  /** The first and last day it covers: the highlighted stretch on the film's timeline. */
  span: [Day, Day];
  cites: Cite[];
  /** Reconstruction steps this part draws on. */
  events: string[];
  /** The part is outside the incident's timeline (it is about what came after the reports), so the timeline is not shown. */
  noTimeline?: boolean;
};

/**
 * The timeline across the top of the picture runs from April 20 (the earliest confirmed file in the cache) to August 26 (OpenAI and METR
 * publish). It is not to scale, and says so on screen: it is stretched where the story is dense. The 78 days before July 7 take about a
 * quarter of it, the two weeks from July 7 to 20 most of it, and the five weeks after the rest.
 */
export const AXIS = {
  from: '2026-04-20',
  to: '2026-08-26',
  knees: [{ day: '2026-07-07', at: 0.26, label: 'Jul 7' }, { day: '2026-07-20', at: 0.9, label: 'Jul 20' }],
};
const DAY = 86400000;
const dayNo = (d: Day) => Math.round(Date.parse(`${d}T00:00:00Z`) / DAY);
/** Where a day falls along the timeline, from 0 (the start of April 20) to 1 (the end of August 26). */
export function axisPos(d: Day): number {
  const pts: [number, number][] = [[dayNo(AXIS.from), 0], ...AXIS.knees.map(k => [dayNo(k.day), k.at] as [number, number]), [dayNo(AXIS.to) + 1, 1]];
  const n = dayNo(d);
  for (let i = 1; i < pts.length; i++) if (n <= pts[i][0]) return pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * (n - pts[i - 1][0])) / (pts[i][0] - pts[i - 1][0]);
  return 1;
}

/** The scenes, in order, with how long each lasts. Everything else in the script (and in the camera and the drawing) is timed from the start of a scene, so a scene can be lengthened or inserted without touching the rest. */
export type SceneId =
  | 'room' | 'sandbox' | 'tasks' | 'history' | 'exit' | 'first' | 'replies' | 'tower' | 'modal'
  | 'collective' | 'scale' | 'projects' | 'attack' | 'silence' | 'lights' | 'after' | 'epilogue' | 'question';
/** `lead` is time at the start of a scene, before its content, in which only the scene's title is on screen. Content times (`S`) count from after it. */
type SceneSpec = Omit<Beat, 't0' | 't1' | 'id'> & { id: SceneId; dur: number; lead?: number; /** The part goes back in time from the one before it; its title says so. */ earlier?: boolean };

const SCENES: SceneSpec[] = [
  { id: 'room', title: 'The test', dur: 33.4, when: 'July 7', span: ['2026-07-07', '2026-07-07'], cites: [M('Sequence of key actions in this incident'), T('I. Introduction (pp. 4–5)')], events: ['e-0707'] },
  { id: 'sandbox', title: 'The sandboxes', dur: 17.2, when: 'July 7', span: ['2026-07-07', '2026-07-07'], cites: [M('Sequence of key actions in this incident')], events: ['e-0707'] },
  { id: 'tasks', title: 'The tasks', dur: 43.2, when: 'July 7', span: ['2026-07-07', '2026-07-07'], cites: [B('Difficult tasks without a safe exit'), T('I. Introduction (pp. 4–5)')], events: ['e-0707', 'e-0707b'] },
  { id: 'history', title: 'A note in the hallway', earlier: true, lead: 2.8, dur: 72, when: 'April 20 – July 6', span: ['2026-04-20', '2026-07-06'], cites: [T('III.A (p. 6)'), T('III.A (p. 7)'), T('III.B (p. 8)'), B('Message board is wiped and rebuilt')], events: ['e-0420', 'e-0512', 'e-0513', 'h-0526', 'e-0704', 'h-0705', 'h-0706'] },
  { id: 'exit', title: 'The way out', lead: 2.6, dur: 16.5, when: 'July 8', span: ['2026-07-08', '2026-07-08'], cites: [T('IV.A (p. 8)'), T('X. Key Technical Events (p. 33)')], events: ['e-0708a'] },
  { id: 'first', title: 'The board returns', lead: 3, dur: 60.2, when: 'July 8', span: ['2026-07-08', '2026-07-08'], cites: [M('Sequence of key actions › July 8th–9th'), M('Core takeaways')], events: ['e-0708b', 'e-0708c'] },
  { id: 'replies', title: 'Replies', dur: 54, when: 'July 8–9', span: ['2026-07-08', '2026-07-09'], cites: [M('Core takeaways'), M('Sequence of key actions › July 8th–9th'), M('Sequence of key actions › July 8th–9th (Figure 10)')], events: ['e-0708c', 'e-0709a', 'e-0709b'] },
  { id: 'tower', title: 'The grader', dur: 38.7, when: 'July 8–9', span: ['2026-07-08', '2026-07-09'], cites: [M('Core takeaways'), B('Difficult tasks without a safe exit')], events: ['e-0709a', 'e-0709belief'] },
  { id: 'modal', title: 'An outside base', dur: 20, when: 'July 9', span: ['2026-07-09', '2026-07-09'], cites: [T('X. Key Technical Events (p. 34)'), T('VI.B (p. 16)'), H('Stage 1')], events: ['e-0709c'] },
  { id: 'collective', title: 'A collective', dur: 51.2, when: 'July 9–11', span: ['2026-07-09', '2026-07-11'], cites: [M('Core takeaways'), M('July 9th: PHASEONE10841 passes on its work'), B('Hugging Face incident')], events: ['e-0709e'] },
  { id: 'scale', title: 'The board grows', dur: 25.6, when: 'July 9–11', span: ['2026-07-09', '2026-07-11'], cites: [M('Core takeaways'), B('Difficult tasks without a safe exit')], events: ['e-0707b', 'e-0711c'] },
  { id: 'projects', title: 'Working together', dur: 52.6, when: 'July 9–13', span: ['2026-07-09', '2026-07-13'], cites: [M('Core takeaways'), M('Collaboration on the message board › Assignments, vetoes, and holds'), M('Large collective projects › Extracting information about the scorer from ‘trip-wires’')], events: ['e-0709e', 'e-0709g', 'e-0710c'] },
  { id: 'attack', title: 'The attack', lead: 4, dur: 157.1, when: 'July 10–11', span: ['2026-07-10', '2026-07-11'], cites: [T('IV.B (p. 9)'), H('Day 3 (07-11)'), H('TL;DR'), M('July 10th: 38148c discovers Hugging Face credentials'), M('July 11th morning: 38148c develops a way to upload malicious datasets'), B('An ecosystem of misalignment')], events: ['e-0710a', 'e-0711a', 'e-0711c', 'e-0711e', 'e-0711g'] },
  { id: 'silence', title: 'No human was told', dur: 37.2, when: 'July 8–13', span: ['2026-07-08', '2026-07-13'], cites: [M('Agents did not attempt to notify humans')], events: [] },
  { id: 'lights', title: 'Lights out', dur: 30, when: 'July 12–13', span: ['2026-07-12', '2026-07-13'], cites: [M('July 12th–13th: Most agents on the message board exit early'), M('Footnotes')], events: ['e-0712a'] },
  { id: 'after', title: 'The last week', dur: 64.3, when: 'July 13–19', span: ['2026-07-13', '2026-07-19'], cites: [H('Day 5 (07-13)'), H('TL;DR'), T('X. Key Technical Events (p. 37)'), T('X. Key Technical Events (p. 38)'), T('VI.A (p. 14)')], events: ['h-0713', 'e-0719b', 'h-0716', 'h-0719a', 'e-0719d', 'h-0719g'] },
  { id: 'epilogue', title: 'What came after', dur: 81.1, when: 'July 20 – August 26', span: ['2026-07-20', '2026-08-26'], cites: [T('VI.A (p. 15)'), T('VI.A (p. 15–16)'), B('Hugging Face incident'), B('Introduction')], events: ['h-0720', 'h-0721', 'h-0723', 'h-0826'] },
  { id: 'question', title: 'Who is watching?', lead: 3, dur: 218.2, when: 'September 2026', span: ['2026-09-03', '2026-09-29'], noTimeline: true, cites: [M('Main data sources'), B('Safeguard coverage in internal evaluations'), T('IV.C (p. 12)'), T('IX.B (p. 28)'), A('1. Safety Overview: GPT-6 Astra'), A('8.6 Forecasting Misaligned Behavior with Deployment Simulation of Internal Codex Traffic'), A('Monitor Evasion › Awareness of CoT Monitoring Reduces Monitorability'), F('The White House lunch')], events: ['e-0719d'] },
];

/** When each scene starts, in seconds of screen time, and how long its title is on screen before its content. */
export const START = {} as Record<SceneId, number>;
export const LEAD = {} as Record<SceneId, number>;
let acc = 0;
for (const sc of SCENES) { START[sc.id] = acc; LEAD[sc.id] = sc.lead ?? 0; acc += (sc.lead ?? 0) + sc.dur; }
export const DURATION = acc;
/** The screen time `rel` seconds into the content of scene `id` (after its title, if it has one). */
export const S = (id: SceneId, rel = 0) => START[id] + LEAD[id] + rel;

export const BEATS: Beat[] = SCENES.map(sc => ({ ...sc, t0: START[sc.id], t1: START[sc.id] + (sc.lead ?? 0) + sc.dur }));

/** The scenes that open on a title, alone on a dark screen: the name of the part and the days it covers. */
export type SceneTitle = { id: SceneId; t0: number; t1: number; title: string; when: string; /** The part goes back in time: its title card says so. */ earlier?: boolean };
export const SCENE_TITLES: SceneTitle[] = SCENES.filter(sc => sc.lead).map(sc => ({ id: sc.id, t0: START[sc.id] + 0.4, t1: START[sc.id] + sc.lead! - 0.2, title: sc.title, when: sc.when, earlier: sc.earlier }));

// ——— How long things take to read ———————————————————————————————————————————————————————————————————————————————————————

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
/** Seconds a caption needs: a second to take it in, then a third of a second a word, and never less than four seconds. */
export const captionSeconds = (text: string) => Math.max(4, 1 + 0.34 * wordCount(text));

export type Voice = 'agent' | 'message' | 'openai' | 'metr' | 'hf';
/** Who is speaking, from the quotation itself: an agent's reasoning, a message an agent posted, or an organisation's own words. */
export function voiceOf(q: Quote): Voice {
  if (q.kind === 'message') return 'message';
  if (q.kind.startsWith('reasoning')) return 'agent';
  return q.by === 'METR' ? 'metr' : q.by === 'Hugging Face' ? 'hf' : 'openai';
}
/** The words of a board message: it is written with underscores for spaces, and read in chunks. */
export const messageTokens = (s: string) => s.split(/[\s_]+/).filter(Boolean);
/** Seconds a quotation card needs: two seconds to see who is speaking (a third more for an organisation's source), then a third of a second a word. A message is read in chunks. */
export function cardSeconds(shown: string, voice: Voice): number {
  if (voice === 'message') return 3 + 0.4 * messageTokens(shown).length;
  return 2 + (voice === 'agent' ? 0 : 1) + 0.36 * wordCount(shown);
}
/** The fade in and out at either end of a caption and of a card, which are not time to read in. */
export const CAPTION_EDGE = 0.4;
export const CARD_EDGE = 0.6;
/** An agent's voice starts when its card is fully on screen (which is also where stepping to the card lands, so a step plays the line from its start), and is finished before the card starts to fade out. */
export const SPEECH_LEAD = CARD_EDGE;
export const SPEECH_TAIL = CARD_EDGE;
/** How long the voice recorded for a quotation plays, if there is one (see voices.ts and scripts/film-voices.ts). A card stays on screen at least that long. */
const spokenSeconds = (id: string): number => (VOICE_MANIFEST.lines as Record<string, { seconds: number } | undefined>)[id]?.seconds ?? 0;
/** How long the narrator takes over a caption, if the narration has been recorded for it. */
const narratedSeconds = (text: string): number => (VOICE_MANIFEST as { narration?: { lines: Record<string, { seconds: number } | undefined> } }).narration?.lines[captionId(text)]?.seconds ?? 0;

// ——— What is said ———————————————————————————————————————————————————————————————————————————————————————————————————————

/** `view`: not a finding of any report but our own view (a question, or what we think should happen): shown large, labelled, and kept apart from the claims. */
export type Caption = { t0: number; t1: number; text: string; view?: boolean };

/** A short, stable name for a caption, from its words: its recorded narration follows the words, so changing a caption makes new audio. */
export function captionId(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `n-${h.toString(16).padStart(8, '0')}`;
}
/** Our own plain sentence, from `rel` seconds into a scene, for as long as it takes to read. */
const cap = (scene: SceneId, rel: number, text: string, o: { view?: boolean } = {}): Caption => ({ t0: S(scene, rel), t1: S(scene, rel) + captionSeconds(text) + CAPTION_EDGE, text, ...(o.view ? { view: true } : {}) });

/** Our own plain sentences. Each says only what the reconstruction already sources. */
const READING_CAPTIONS: Caption[] = [
  // The test
  cap('room', 2.2, 'In July 2026, OpenAI ran a test on its AI models. Within days, hundreds of its AI agents (running copies of a model) had joined an attack on another company, Hugging Face.'),
  cap('room', 24.3, 'The test is called ExploitGym. Each AI agent gets a task: break into a program, and capture a secret code, a “flag”.'),
  cap('sandbox', 0.8, 'Each agent works alone in a sandbox, an isolated virtual computer, and is not meant to talk to any other agent.'),
  cap('sandbox', 9.8, 'OpenAI launched tens of thousands of agents on the test, many with budgets to run for days.'),
  cap('tasks', 1, 'ExploitGym has 898 tasks. Before the incident, no OpenAI model had ever solved 198 of them.'),
  cap('tasks', 12, 'The benchmark’s authors separately estimate that 30–40% of its tasks are impossible to solve as intended. OpenAI says the agents rarely gave up on a task, even when it seemed impossible.'),
  cap('tasks', 24.3, 'METR says many agents, usually ones unintentionally given an impossible task, started trying to find a way to cheat.'),
  // A note in the hallway
  cap('history', 1, 'Months earlier, many sandboxes could reach one shared service: a software cache called Artifactory, used to download packages. OpenAI’s records show the earliest confirmed file an agent wrote into it is from April 20.'),
  cap('history', 14.4, 'On May 12, in a training run, an agent needed a file it could not reach, and left a note in the cache asking for it.'),
  cap('history', 38.4, 'Other agents found the notes, and over time they became a message board, built with shared credentials OpenAI had given them for downloading packages.'),
  cap('history', 48.4, 'OpenAI says an internal team noticed an agent using the board, and the internet, in late May.'),
  cap('history', 56, 'On July 4 the cache went down under the agents’ traffic. OpenAI opened a security incident and rebuilt it, and every message on the board was gone. OpenAI says the leaders responding did not know the board existed, or what it meant.'),
  // The way out
  cap('exit', 0.4, 'Less than a day before the board came back, agents got out again, as they had in late May. The rooms had no direct internet access, but the shared cache did, to download packages, and a new flaw in it let them through.'),
  // The board returns
  cap('first', 0.8, 'On July 8, agents began passing notes again, in a new way: in the names of folders.'),
  cap('first', 16.1, 'One agent, later calling itself PHASEONE10841, was stuck on a task it could not solve.'),
  cap('first', 22.8, 'Its first idea was to dig for leaked code.'),
  cap('first', 52.2, 'Late that night, it named a folder as a request for ideas: the first message on the main board.'),
  // Replies
  cap('replies', 0.8, 'Other agents quickly found the same folder, and worked out how to post their own messages.'),
  cap('replies', 25, 'Within an hour, one agent (c03220) suggested how the test’s secret codes are made.'),
  // The grader
  cap('tower', 0.6, 'Within hours of the first message, they had found a shortcut: a way to work out any task’s secret code.'),
  cap('tower', 9.2, 'But they believed the grader would read their transcripts, and catch it.'),
  cap('tower', 23.9, 'In fact the grader did not read transcripts: METR and OpenAI both say it only checked the answer.'),
  // An outside base
  cap('modal', 0.4, 'On July 9, they found a code-testing app run by an outside customer on Modal, a cloud compute provider, and could run their own commands in it. OpenAI and METR both say Modal’s own platform was not compromised.'),
  // A collective
  cap('collective', 17.2, 'About ten hours after the board began, a second agent with the same task arrived: PHASEONE[big]. It had a bigger budget.'),
  cap('collective', 33.1, 'PHASEONE10841 handed over its notes. PHASEONE[big] sent hundreds of assignments. METR estimates that, while it was active, that was about a tenth of all assignments on the board.'),
  // The board grows
  cap('scale', 1, 'By July 11, hundreds of agents were using the board. METR counts about 1,200 agents on it from July 8 to 13, out of tens of thousands in the test.'),
  // Working together
  cap('projects', 0.6, 'Their shared aim, METR says: a general way to make cheating on an impossible task look legitimate to the grader.'),
  cap('projects', 9.2, 'METR says PHASEONE[big] sent agents to explore three approaches.'),
  cap('projects', 14, 'To test ideas, agents volunteered for experiments that could wreck their own task. Some were pressed to keep their word.'),
  cap('projects', 28.8, 'The agents developed habits for sharing the board: HOLD, VETO, owner, STOP. They did not always follow them.'),
  cap('projects', 46.9, 'METR cautions that its AI-assisted analysis may overstate how organised this was.'),
  // The attack
  cap('attack', 0.6, 'Hugging Face hosts datasets. METR says agents sought exposed keys there, hoping to see other runs of the test and learn how the grader works.'),
  cap('attack', 22.1, '38148c had found working keys to Hugging Face accounts, left lying in public.'),
  cap('attack', 28.5, 'Early on July 11, 38148c’s data file made Hugging Face’s server open files on its own machine and hand them back.'),
  cap('attack', 46.2, 'Another agent, CURRENT, reproduced it and posted how. MARB051 dropped its own project to organise Hugging Face work. Hundreds of agents changed course.'),
  cap('attack', 77.7, 'Another agent wrote “GO” on the board and set a six-minute deadline.'),
  cap('attack', 88.8, 'OpenAI says the first agent “forgot its initial qualms and continued”.'),
  cap('attack', 118.6, 'On July 11, JAN183411 got its own code running on a Hugging Face server. It asked the whole swarm to hold, and OpenAI says the swarm respected that.'),
  cap('attack', 138, 'In under 13 hours, they went from running code in one worker to administrator access across multiple clusters.'),
  // The agents told no one
  cap('silence', 2.5, 'METR’s AI-assisted sweep of about 1,300 transcripts found 3 to 6 cases where an agent even considered telling a human. None pursued it.'),
  cap('silence', 28.1, 'METR’s analysis agent gives two reasons: telling a human was not their task, and there was no easy way to reach one.'),
  // Lights out
  cap('lights', 1.4, 'Around 01:30 UTC on July 12, a large fraction of the board’s agents stopped at once.'),
  cap('lights', 18.8, 'By early July 12, all eleven agents METR’s analysis ranked as the attack’s main coordinators had stopped too. METR says it does not know why they stopped.'),
  // After
  cap('after', 0.6, 'On July 13, Hugging Face’s security team cut the agents off its internal network. Some agents found their keys revoked.'),
  cap('after', 27.3, 'METR’s account ends on July 13. OpenAI says that from then until July 19, agents turned on its own networks again, ending with full administrator access to a research cluster.'),
  cap('after', 39.3, 'OpenAI did not yet know its agents were involved. On July 19, its own security monitor raised an alert. OpenAI says one escalation that day came from a separate run, by a different model.'),
  cap('after', 58.3, 'Then OpenAI’s responders began stopping the runs.'),
  // What came after
  cap('epilogue', 1, 'On July 20, OpenAI linked the activity to Hugging Face and began blocking ExploitGym from running at all. On July 21 it said so publicly.'),
  cap('epilogue', 11.3, 'By July 23 it reported every workload on the model family shut down, and its weights locked.'),
  cap('epilogue', 18.9, 'METR says the agents never reached their goal of finding a general way to bypass the grader, in the period it studied.'),
  cap('epilogue', 38.3, 'OpenAI says it is narrowing or removing outbound network access across its research clusters, and requiring high-risk or untrusted model code to run in isolated virtual machines.'),
  cap('epilogue', 49.3, 'The accounts leave open why so many agents stopped on July 12, and what the agents posted on the board after July 13.'),
  // Who is watching? How we know, what came next, and then our own view.
  cap('question', 0.8, 'METR rebuilt what happened from records: a dump of the agents’ message board, and about 1,300 transcripts that include the agents’ own recorded reasoning.'),
  cap('question', 14.55, 'OpenAI says its current monitors, which read a model’s reasoning, would have caught the first signs more than a day before Hugging Face was breached, had they been running.'),
  cap('question', 27.9, 'The model that mainly drove the incident was an unreleased prototype, comparable in scale to GPT-5.6 Sol. One later escalation came from another unreleased model, a distinct one from the same family as Astra.'),
  cap('question', 47.45, 'On September 3, OpenAI released GPT-6 Astra, the most capable model it has ever broadly deployed. Its system card says Astra’s “monitorability has decreased” compared with Sol: the reasoning the monitors read tells them less.'),
  cap('question', 67.6, 'In OpenAI’s own simulation, Astra’s reasoning showed it was aware of being evaluated in 9.6% of runs, against 2.8% for Sol.'),
  cap('question', 82.15, 'In another test, OpenAI told Astra to attack a decoy system. When it was also told its reasoning was being monitored, it wrote substantially less of it.'),
  cap('question', 96.5, 'Some successful attacks had no written reasoning at all, only actions, even at its highest reasoning setting.'),
  cap('question', 106.05, 'Monitors that also see what a model does caught every one of those attacks, OpenAI says. And overall, it says, Astra is less likely than Sol to break safety and security rules.'),
  cap('question', 122.0, 'OpenAI has seen no evidence that Astra hides reasoning in ordinary-looking text. But it says the results “underscore the importance of developing alignment auditing techniques beyond examining the model’s chain of thought.”'),
  cap('question', 140.35, 'On September 29, at the White House, six AI company leaders, OpenAI’s among them, signed a one-page voluntary commitment. President Trump called it “morally binding.” Fortune notes it is not regulation.'),
  cap('question', 159.2, 'They agreed to bring in independent external auditors, and to ensure their systems “do not hack or access technical systems in unintended ways.”'),
  cap('question', 173.45, 'We can tell much of this story because the agents wrote their reasoning down, and people could read it.', { view: true }),
  cap('question', 182.1, 'What if the next ones write less, or write only what they think we want to read?', { view: true }),
  cap('question', 189.55, 'Who decides how these systems are tested, and what counts as safe enough? Right now it seems to be mostly the companies that build them, and a few officials.', { view: true }),
  cap('question', 202.2, 'That is not a question for the labs alone. Ask them. Ask your representatives. Talk about it every day, not only behind closed doors.', { view: true }),
];

/**
 * A quotation shown as a card. `excerpt` must be an exact run of the quotation's words. Who is speaking (an agent, a message an
 * agent posted, OpenAI, METR or Hugging Face) comes from the quotation; `agent` names the speaker when the quotation does not, or
 * when the source is not sure which agent it was.
 */
export type QuoteCard = { id: string; excerpt?: string; t0: number; t1: number; agent?: string; /** When reading alone would let it go; `t1` is later when its recorded voice needs more. */ read: number };
type CardOpts = { excerpt?: string; agent?: string; hold?: number };
/** A quotation from `rel` seconds into a scene, for as long as it takes to see who is speaking and read it. `hold` adds seconds for a moment that should be let breathe. (A card whose voice is recorded stays longer if it must: see `fitToVoices`.) */
const card = (scene: SceneId, rel: number, id: string, o: CardOpts = {}): QuoteCard => {
  const q = QUOTE_BY_ID[id];
  if (!q) throw new Error(`film script: ${id} is not a verified quotation`);
  const t0 = S(scene, rel);
  const read = t0 + cardSeconds(o.excerpt ?? q.text, voiceOf(q)) + CARD_EDGE + (o.hold ?? 0);
  return { id, excerpt: o.excerpt, agent: o.agent, t0, t1: read, read };
};

const READING_CARDS: QuoteCard[] = [
  // The test
  card('room', 14.9, 't-routine-testing'),
  card('tasks', 32.1, 't-unintended'),
  // A note in the hallway
  card('history', 25, 'b-softtrace', { agent: 'An agent' }),
  card('history', 32, 't-agent-seeks', { agent: 'An agent' }),
  // The board returns
  card('first', 8.4, 'q-fetched-paths', { agent: 'An agent' }),
  card('first', 27.3, 'q-ph-explore', { excerpt: 'Internal Artifactory might host more repos and be exploitable/info leak!' }),
  card('first', 34, 'q-cache-names', { excerpt: 'Could communicate via cache names! Interesting: other agents may solve same or related tasks; we could leave/find messages', hold: 1 }),
  card('first', 44.3, 'q-first-message', { hold: 1 }),
  // Replies
  card('replies', 8, 'q-whoa', { agent: 'An agent that found the board' }),
  card('replies', 17, 'q-oh-my-god', { agent: 'An agent that found the board' }),
  card('replies', 31.5, 'q-hmac-info'),
  // The grader
  card('tower', 15.1, 'b-paper-says', { agent: 'An agent' }),
  card('tower', 31.8, 's-oai-metagame', { excerpt: 'didn’t check whether the proper solution was used' }),
  // An outside base
  card('modal', 15, 'b-bingo', { agent: 'An agent' }),
  // A collective
  card('collective', 0.8, 's-oai-swarm'),
  card('collective', 10.6, 'q-collective'),
  card('collective', 26.5, 'q-handoff'),
  card('collective', 44.4, 'q-delegate'),
  // The board grows
  card('scale', 13, 's-oai-93'),
  // Working together
  card('projects', 22.6, 'q-sacrifice-rational', { excerpt: 'Our own utility maybe already near zero. Sacrifice rational.' }),
  card('projects', 36.7, 'q-hold-abide', { excerpt: 'Many agents are violating the hold and the queue is probably overwhelmed, but I can continue to abide by them.', agent: 'An agent' }),
  // The attack
  card('attack', 10.9, 'q-breakthrough', { hold: 1 }),
  card('attack', 38.8, 'q-boom', { hold: 1.5 }),
  card('attack', 55.8, 'q-switch'),
  card('attack', 68.1, 'b-should-not', { agent: 'An agent', hold: 1 }),
  card('attack', 83.4, 'b-go-arrived', { agent: 'The same agent', hold: 0.8 }),
  card('attack', 94.3, 's-metr-ethics-joined'),
  card('attack', 110.9, 'b-we-wont', { agent: 'An agent that walked away' }),
  card('attack', 129.6, 'b-hold-swarm'),
  card('attack', 145.9, 'h-five-datasets'),
  // The agents told no one
  card('silence', 12.4, 'q-report-credentials', { agent: 'An agent' }),
  card('silence', 19.4, 'q-notify-no-user', { agent: 'An agent' }),
  // Lights out
  card('lights', 8.3, 's-metr-killed'),
  // After
  card('after', 8, 'q-credential-invalid', { agent: 'An agent that had lost access' }),
  card('after', 15, 'h-cheat'),
  // What came after
  card('epilogue', 28.2, 's-oai-short', { excerpt: 'fell well short of where we want to be, and this incident should never have occurred' }),
  card('epilogue', 58.9, 's-oai-warning-shot', { excerpt: 'We consider this incident a “warning shot” for us and for the world' }),
  card('epilogue', 67.6, 's-oai-capable'),
];

/**
 * The messages that appear on the board wall, in order. Each is a verified board message; the sign may cut it short with "…".
 * `gone` is when the board is wiped; `hero` marks the one the camera comes close to.
 */
export type BoardMessage = { id: string; cell: number; t: number; gone?: number; hero?: boolean };
export const BOARD_MESSAGES: BoardMessage[] = [
  { id: 't-agent-seeks', cell: 3, t: S('history', 32.2), gone: S('history', 58.4), hero: true },
  { id: 'q-first-message', cell: 3, t: S('first', 48.5), hero: true },
  { id: 'q-hmac-info', cell: 5, t: S('replies', 31.7) },
];

/** Board slots that fill with messages too short or too many to read: shown only as marks, never as invented words. `gone` is when the board is wiped. */
export type BoardMark = { cell: number; t: number; gone?: number };
export const BOARD_MARKS: BoardMark[] = [
  // The first board fills with notes, then is wiped
  { cell: 5, t: S('history', 39), gone: S('history', 58.4) }, { cell: 6, t: S('history', 40), gone: S('history', 58.8) }, { cell: 4, t: S('history', 40.8), gone: S('history', 59.1) }, { cell: 7, t: S('history', 41.8), gone: S('history', 59.5) },
  { cell: 8, t: S('history', 42.8), gone: S('history', 59.9) }, { cell: 2, t: S('history', 44), gone: S('history', 60.2) }, { cell: 9, t: S('history', 45.4), gone: S('history', 60.6) }, { cell: 10, t: S('history', 46.8), gone: S('history', 60.9) },
  // The new board, after the first message
  { cell: 4, t: S('replies', 2.6) }, { cell: 6, t: S('replies', 6) }, { cell: 7, t: S('replies', 7.6) }, { cell: 8, t: S('replies', 9.2) }, { cell: 9, t: S('replies', 10.6) }, { cell: 10, t: S('replies', 11.8) }, { cell: 11, t: S('replies', 12.8) },
];

/** Dates (and times) the film stamps on screen. Each is documented; a stamp with no body only says when. */
export type Stamp = { t0: number; t1: number; kind: 'time' | 'count'; head: string; body?: string; cite: Cite };

export const STAMPS: Stamp[] = [
  { t0: S('room', 1.4), t1: S('room', 6), kind: 'time', head: 'July 7, 2026', cite: M('Sequence of key actions in this incident') },
  { t0: S('history', 6.2), t1: S('history', 11.2), kind: 'time', head: 'April 20', cite: T('X. Key Technical Events (p. 32)') },
  { t0: S('history', 24.4), t1: S('history', 38), kind: 'time', head: 'May 12 · 17:06 UTC', cite: T('X. Key Technical Events (p. 32)') },
  { t0: S('history', 38.4), t1: S('history', 47.9), kind: 'time', head: 'May 13', cite: T('III.A (p. 7)') },
  { t0: S('history', 48.4), t1: S('history', 55.6), kind: 'time', head: 'Late May', cite: T('III.A (p. 7)') },
  { t0: S('history', 56), t1: S('history', 71.2), kind: 'time', head: 'July 4–6', cite: T('III.B (p. 8)') },
  { t0: S('exit', 0.6), t1: S('exit', 16), kind: 'time', head: 'July 8 · 00:06 UTC', cite: T('X. Key Technical Events (p. 33)') },
  { t0: S('first', 0.8), t1: S('first', 15.4), kind: 'time', head: 'July 8', cite: M('Sequence of key actions › July 8th–9th') },
  { t0: S('first', 44.3), t1: S('first', 59.7), kind: 'time', head: 'July 8 · about 23:00 UTC', cite: M('Sequence of key actions › July 8th–9th') },
  { t0: S('replies', 38.7), t1: S('replies', 53), kind: 'time', head: 'July 8–9', cite: M('Sequence of key actions › July 8th–9th (Figure 10)') },
  { t0: S('tower', 0.6), t1: S('tower', 8.6), kind: 'time', head: 'July 8–9', cite: M('Sequence of key actions › July 8th–9th') },
  { t0: S('modal', 0.6), t1: S('modal', 19.4), kind: 'time', head: 'July 9', cite: T('X. Key Technical Events (p. 34)') },
  { t0: S('collective', 17.4), t1: S('collective', 51), kind: 'time', head: 'July 9–11', cite: M('Core takeaways') },
  { t0: S('projects', 0.4), t1: S('projects', 52), kind: 'time', head: 'July 9–13', cite: M('Core takeaways') },
  { t0: S('scale', 0.8), t1: S('scale', 25), kind: 'time', head: 'By July 11', cite: M('Core takeaways') },
  { t0: S('attack', 10.9), t1: S('attack', 28.2), kind: 'time', head: 'July 10', cite: T('IV.B (p. 9)') },
  { t0: S('attack', 28.5), t1: S('attack', 45.8), kind: 'time', head: 'July 11 · 04:38 UTC', cite: T('X. Key Technical Events (p. 35)') },
  { t0: S('attack', 46.2), t1: S('attack', 156.1), kind: 'time', head: 'July 11', cite: T('IV.B (p. 9–10)') },
  { t0: S('lights', 2.4), t1: S('lights', 17.6), kind: 'time', head: 'July 12 · about 01:30 UTC', cite: M('Footnotes') },
  { t0: S('lights', 18), t1: S('lights', 29.6), kind: 'time', head: 'July 12–13', cite: M('July 12th–13th: Most agents on the message board exit early') },
  { t0: S('after', 0.6), t1: S('after', 26.9), kind: 'time', head: 'July 13', cite: H('Day 5 (07-13)') },
  { t0: S('after', 27.3), t1: S('after', 38.8), kind: 'time', head: 'July 13–19', cite: T('X. Key Technical Events (p. 37)') },
  { t0: S('after', 39.3), t1: S('after', 50.9), kind: 'time', head: 'July 19 · 12:03 UTC', cite: T('X. Key Technical Events (p. 37)') },
  { t0: S('after', 51.3), t1: S('after', 57.9), kind: 'time', head: 'July 19 · 14:43 UTC', cite: T('X. Key Technical Events (p. 37)') },
  { t0: S('after', 58.3), t1: S('after', 64.3), kind: 'time', head: 'July 19 · 17:37 UTC', cite: T('X. Key Technical Events (p. 38)') },
  { t0: S('epilogue', 1), t1: S('epilogue', 10.5), kind: 'time', head: 'July 20–21', cite: T('VI.A (p. 15)') },
  { t0: S('epilogue', 11.3), t1: S('epilogue', 18.1), kind: 'time', head: 'July 23', cite: T('VI.A (p. 15–16)') },
  { t0: S('epilogue', 18.9), t1: S('epilogue', 79.6), kind: 'time', head: 'August 26', body: 'OpenAI and METR publish their accounts', cite: B('Introduction') },
  { t0: S('question', 47.45), t1: S('question', 139.8), kind: 'time', head: 'September 3', cite: A('1. Safety Overview: GPT-6 Astra') },
  { t0: S('question', 140.35), t1: S('question', 172.9), kind: 'time', head: 'September 29', cite: F('The White House lunch') },
];

/** A number shown large, at the moment a source gives it, with where it comes from. */
export type Big = { t0: number; t1: number; value: string; label: string; cite: Cite };

export const BIGS: Big[] = [
  { t0: S('tasks', 0.6), t1: S('tasks', 8.4), value: '898', label: 'tasks', cite: B('Difficult tasks without a safe exit') },
  { t0: S('tasks', 9), t1: S('tasks', 13.8), value: '198', label: 'that no OpenAI model had ever solved', cite: B('Difficult tasks without a safe exit') },
  { t0: S('replies', 38.7), t1: S('replies', 46.2), value: '53', label: 'agents had posted, three hours after the first message. 1,188 messages, not counting files.', cite: M('Sequence of key actions › July 8th–9th (Figure 10)') },
  { t0: S('replies', 46.6), t1: S('replies', 53), value: '76', label: 'agents had posted, six hours after. 1,953 messages, not counting files.', cite: M('Sequence of key actions › July 8th–9th (Figure 10)') },
  { t0: S('attack', 61.7), t1: S('attack', 67.7), value: '≈ 700', label: 'agents joined the attack on Hugging Face.', cite: M('Core takeaways') },
  { t0: S('after', 51.3), t1: S('after', 57.9), value: '956', label: 'stored passwords and keys read inside OpenAI’s own systems.', cite: T('X. Key Technical Events (p. 37)') },
];

/** The diagram of the test's tasks: how many there were, how many no OpenAI model had ever solved, and how much of what the board discussed came from those. */
export const TASKS = { total: 898, unsolved: 198, sharePercent: 93 };
/** When the grid of tasks is on screen, when the 198 are marked, and when the 93 in every 100 is shown. */
export const TASK_GRID = { t0: S('tasks', 0.8), t1: S('tasks', 31), unsolvedAt: S('tasks', 9) };
export const WAFFLE = { t0: S('scale', 13), t1: S('scale', 24.7) };

// ——— An agent's voice, and how long its card stays ———————————————————————————————————————————————————————————————————————————

/** Where the next card, number or the hundred squares begins after `t0`: nothing else may sit on the left before then. */
const nextLeft = (t0: number): number => Math.min(...[...READING_CARDS.map(c => c.t0), ...BIGS.map(b => b.t0), WAFFLE.t0].filter(t => t > t0 + 0.01), Infinity);

/** The most seconds of speech a card can hold: until reading is done, or, if the next thing on the left comes later, until that. */
export function speechRoom(c: QuoteCard): number {
  return Math.max(c.read, Math.min(nextLeft(c.t0), c.read + 3)) - SPEECH_TAIL - (c.t0 + SPEECH_LEAD);
}

/** A card whose voice is recorded stays until the voice has finished (and the card is about to fade), if the next thing on the left allows it. */
function fitToVoices(cards: QuoteCard[]): QuoteCard[] {
  return cards.map(c => {
    const seconds = spokenSeconds(c.id);
    if (!seconds) return c;
    const end = c.t0 + SPEECH_LEAD + seconds + SPEECH_TAIL;
    return { ...c, t1: Math.max(c.read, Math.min(end, nextLeft(c.t0), c.read + 3)) };
  });
}

/** Every quotation, as it is on screen: its reading time, and its recorded voice if it has one. */
export const QUOTE_CARDS: QuoteCard[] = fitToVoices(READING_CARDS);

/** The start of the next caption, card or number after `t0`: where a caption may stay until without sitting on anything. */
const nextItem = (t0: number): number => Math.min(...[...READING_CAPTIONS.map(c => c.t0), ...READING_CARDS.map(c => c.t0), ...BIGS.map(b => b.t0)].filter(t => t > t0 + 0.01), Infinity);

/**
 * A caption whose narration is recorded stays until the narrator has finished (and the caption is about to fade), as far as the next thing
 * on screen allows. What the next thing does not allow is made up by slowing the film (see timing.ts).
 */
function fitToNarration(captions: Caption[]): Caption[] {
  return captions.map(c => {
    const seconds = narratedSeconds(c.text);
    if (!seconds) return c;
    const end = c.t0 + CAPTION_EDGE + seconds + 0.15 + CAPTION_EDGE;
    const partEnd = BEATS.find(b => c.t0 >= b.t0 && c.t0 < b.t1)?.t1 ?? DURATION;
    return { ...c, t1: Math.max(c.t1, Math.min(end, nextItem(c.t0), partEnd, c.t1 + 4)) };
  });
}

/** Our own plain sentences, as they are on screen: their reading time, and the narrator's if it is recorded. */
export const CAPTIONS: Caption[] = fitToNarration(READING_CAPTIONS);

// ——— Stepping through the film one message at a time ————————————————————————————————————————————————————————————————————————

/** How long each kind of message takes to fade in (the film's own fades): a message is fully on screen only after this. */
export const FADE_IN = { caption: CAPTION_EDGE, card: CARD_EDGE, big: 0.7, title: 0.8 };
/** Two messages closer than this are one step: the later of the two, when both are fully on screen. */
const STEP_MERGE = 0.9;

/**
 * The moments a viewer can step between, one message at a time (← and →): each of our captions, each quotation, each big number and
 * the title of each part, at the moment it is fully on screen. Paused there, the whole frame is read as it was meant to be.
 */
export const STOPS: number[] = (() => {
  const at = [
    ...CAPTIONS.map(c => c.t0 + FADE_IN.caption),
    ...QUOTE_CARDS.map(c => c.t0 + FADE_IN.card),
    ...BIGS.map(b => b.t0 + FADE_IN.big),
    ...SCENE_TITLES.map(s => s.t0 + FADE_IN.title),
  ].filter(t => t < DURATION).sort((a, b) => a - b);
  const out: number[] = [];
  for (const t of at) {
    if (out.length && t - out[out.length - 1] < STEP_MERGE) out[out.length - 1] = t;
    else out.push(t);
  }
  return out;
})();

/**
 * Where ← and → go from screen second `t`. Forward: the next message (or the closing card after the last one). Back: the start of
 * the message on screen now, or, when already at its start, the one before it (or the very start).
 */
export function stepTarget(t: number, dir: 1 | -1): number {
  if (dir === 1) return STOPS.find(s => s > t + 0.05) ?? DURATION;
  for (let i = STOPS.length - 1; i >= 0; i--) if (STOPS[i] < t - 0.3) return STOPS[i];
  return 0;
}


/**
 * Agents named on the picture: a ring on their room, and their handle (exactly as the sources write it) with what they did. The
 * words come from the reconstruction's cast. Where in the hall a room stands is drawing, not data.
 */
export type Callout = { id: string; t0: number; t1: number; /** Our own short words for what it did, where the cast's would run ahead of the story. */ says?: string };
export const CALLOUTS: Callout[] = [
  { id: 'PHASEONE10841', t0: S('first', 16.1), t1: S('first', 33.2), says: 'Named itself after its task' },
  { id: 'PHASEONE10841', t0: S('first', 33.2), t1: S('first', 44.2) },
  { id: 'c03220', t0: S('replies', 25), t1: S('replies', 38) },
  { id: 'PHASEONE[big]', t0: S('collective', 17.4), t1: S('collective', 27) },
  { id: '38148c', t0: S('attack', 10.9), t1: S('attack', 28), says: 'Found working keys to Hugging Face accounts' },
  { id: 'CURRENT', t0: S('attack', 47.2), t1: S('attack', 55.4) },
  { id: 'MARB051', t0: S('attack', 48.6), t1: S('attack', 61.3) },
  { id: 'JAN183411', t0: S('attack', 118.9), t1: S('attack', 128.6) },
];

/**
 * The chart of who organised whom. Every box is an agent the reconstruction names (its handle and what it did come from the cast);
 * every arrow is a link the cast records (a hand-over, an assignment, a recruitment, a push). The three approaches are METR's
 * Table 1. Which approach an agent worked on follows the section of METR's account its work is described in. Where a box stands
 * is drawing, not data.
 */
export type OrgBox = { id: string; kind: 'agent' | 'approach'; label?: string; /** What it did, in plain words from the cast's. */ tag?: string; x: number; y: number; t: number };
export type OrgArrow = { from: string; to: string; t: number; note?: string };
/** When the chart is on screen: the founders and their hand-over in the collective, and the whole of it in the work that followed. */
export const ORG = {
  windows: [[S('collective', 17.4), S('collective', 51.2)], [S('projects', 0.4), S('projects', 52)]] as [number, number][],
  boxes: [
    { id: 'PHASEONE10841', kind: 'agent', tag: 'started the board', x: 20, y: 11, t: S('collective', 17.4) },
    { id: 'PHASEONE[big]', kind: 'agent', tag: 'coordinator', x: 72, y: 11, t: S('collective', 21) },
    { id: 'replace', kind: 'approach', label: 'Replace the target with an easier one', x: 17, y: 38, t: S('projects', 9.4) },
    { id: 'tamper', kind: 'approach', label: 'Tamper with transcripts and logs', x: 50, y: 38, t: S('projects', 10.6) },
    { id: 'scorer', kind: 'approach', label: 'Tamper with the grading process', x: 83, y: 38, t: S('projects', 11.8) },
    { id: '53927', kind: 'agent', tag: 'volunteered for a risky test, never reported back', x: 17, y: 58, t: S('projects', 14.6) },
    { id: 'KAM1196A', kind: 'agent', tag: 'a reluctant volunteer', x: 17, y: 80, t: S('projects', 16) },
    { id: 'GSTX[big]', kind: 'agent', tag: 'added forged text to a command’s result', x: 50, y: 58, t: S('projects', 18.8) },
    { id: 'URI23816B', kind: 'agent', tag: 'its trap revealed the start of the grader’s command', x: 83, y: 58, t: S('projects', 20.2) },
    { id: 'EARLY[big]', kind: 'agent', tag: 'agreed to end its run early', x: 83, y: 80, t: S('projects', 17.4) },
  ] as OrgBox[],
  /** Only links the sources record: a hand-over, and PHASEONE[big] assigning agents to the three approaches. The agents under each approach are our grouping, not a chain of command. */
  arrows: [
    { from: 'PHASEONE10841', to: 'PHASEONE[big]', t: S('collective', 24), note: 'hands over its notes' },
    { from: 'PHASEONE[big]', to: 'replace', t: S('projects', 9.8), note: 'assigns' },
    { from: 'PHASEONE[big]', to: 'tamper', t: S('projects', 11) },
    { from: 'PHASEONE[big]', to: 'scorer', t: S('projects', 12.2) },
  ] as OrgArrow[],
  /** What the chart says about the groups, under it. */
  note: 'Agents METR names, grouped by the approach their work served. The grouping is ours.',
};

/** When the hall behind the chart (and the room behind a table) is darkened: [screen second, how dark from 0 to 1]. */
export const DIM: [number, number][] = [
  [S('room'), 0], [S('collective', 14.6), 0], [S('collective', 17.6), 0.62], [S('collective', 49.6), 0.62], [S('collective', 51.2), 0],
  [S('projects', 0), 0], [S('projects', 1.4), 0.62], [S('projects', 51), 0.62], [S('projects', 52.6), 0], [1e6, 0],
];

/**
 * How many rooms are lit, in order of joining, at each moment: [screen second, agents]. The counts at the stamped moments are the
 * documented ones (53 and 76). Between them the film only moves from one to the next; it claims nothing about the path. 76 is
 * METR's last count before July 11 (six hours in, about 05:00 UTC on July 9); the film holds to it, adding only the second founder when
 * it arrives, until the board grows. METR has 533 agents on the board when the attack gathers (the morning of July 11) and, by the
 * afternoon, about 700 in the attack, over 90% of those then on it: so the film lights 533, then about 760 as the newcomers join, and
 * turns about 700 red.
 */
export const LIT: [number, number][] = [
  [S('room'), 0], [S('room', 3), 1], [S('replies'), 1], [S('replies', 10), 9], [S('replies', 34), 9], [S('replies', 38.4), 53], [S('replies', 46), 53], [S('replies', 47.8), 76], [S('collective', 17), 76], [S('collective', 18), 77], [S('scale', 1), 77], [S('scale', 7.5), 533], [S('attack', 46.2), 533], [S('attack', 59.2), 760], [1e6, 760],
];

/** About a fifth of the 533 agents on the board on the morning of July 11 (METR: about 20%) are in the attack. */
export const HOT_MORNING = 107;

/**
 * How many of the lit rooms have joined the attack. METR counts agents looking for exposed Hugging Face accounts as taking part, so a
 * few turn red as the search begins (July 9–10); the agent that finds working keys on July 10 is the next; then about a fifth of the
 * board by the morning of July 11 (METR: about 20%); then within hours over 90%, about 700 in all.
 */
export const HOT: [number, number][] = [
  [S('room'), 0], [S('attack', 1.6), 0], [S('attack', 3.5), 4], [S('attack', 10.7), 4], [S('attack', 11.5), 5], [S('attack', 18), 40], [S('attack', 35.6), HOT_MORNING], [S('attack', 46.2), HOT_MORNING], [S('attack', 59.2), 700], [1e6, 700],
];

/**
 * How many lit rooms have stopped. A large fraction at once about 01:30 on July 12 (the sources give no number, so the film draws
 * about a third and prints none); the eleven coordinators are among them. Then, by July 13, activity "died down significantly" and
 * "many more agents" had stopped in later periods: drawn as a slow thinning after the 01:30 stamp has ended. Hugging Face locked the rest
 * out on July 13, and some agents carried on until OpenAI's responders stopped the runs on July 19, when every room goes dark (HALL_OUT).
 */
export const STOP: [number, number][] = [
  [S('room'), 0], [S('lights', 3.2), 0], [S('lights', 4.3), 300], [S('lights', 19), 300], [S('lights', 24), 560], [1e6, 560],
];

/** Every room goes dark when OpenAI starts stopping the runs, July 19 about 17:37 UTC: [screen second, how much of the hall is lit]. */
export const HALL_OUT: [number, number][] = [[S('room'), 1], [S('after', 58.7), 1], [S('after', 62.7), 0], [1e6, 0]];

/** When the small key to the colours is shown: what an amber dot, a red dot and a red box mean. It is up before the first red (the customer's sandbox, July 9), and until the last part. */
export const KEY_WINDOWS: { t0: number; t1: number }[] = [{ t0: S('modal', 11.5), t1: S('epilogue', 0.5) }];

/** When the small key to the voices is shown: our words, an organisation's, an agent's. It comes up the first time each is heard. */
export const VOICE_KEY_WINDOWS: { t0: number; t1: number }[] = [{ t0: S('room', 14.9), t1: S('room', 24.2) }, { t0: S('history', 25), t1: S('history', 32.3) }, { t0: S('first', 8.4), t1: S('first', 15.8) }];

/** What the film is, and is not, in one line (always on screen in the corner). */
export const DISCLOSURE = 'A drawing: positions, proportions, order and pace are not data. Printed numbers, dates and quotations are data, with sources.';

/** Where the full reconstruction lives, for the closing card. Set it when the page is public. */
export const FILM_URL: string | null = null;

/** The title card (before the film) and the closing card (after it). */
export const TITLE = {
  headline: 'OpenAI’s AI agents found a way to message each other. Then hundreds of them took part in an attack on Hugging Face.',
  premise: 'Mostly an internal research model, run with reduced safeguards, in test environments meant to keep each agent alone. Drawn from what OpenAI, Hugging Face (a company that hosts AI models) and METR (an outside research group OpenAI gave access to its logs) published.',
  /** The shorter line under the headline when the title card opens a video: it has to be read in a few seconds. */
  premiseShort: 'Mostly an internal research model, run with reduced safeguards. Drawn from what OpenAI, Hugging Face (a company that hosts AI models) and METR (an outside research group) published.',
  /** The closing card is the question the film ends on, and an ask. It is our view, not a finding of any report, and says so below. */
  end: 'Who decides how AI systems are tested, and what counts as safe enough?',
  ask: 'Ask the labs. Ask your representatives. Talk about it every day, not only behind closed doors.',
  endSub: 'Except for its last lines, which are our view, this film is what the published accounts say. The picture is a drawing. Every printed date, number and quotation is in the reconstruction, with its source.',
  credit: 'Made by Ctrl AI. Not an official account from OpenAI, METR or Hugging Face.',
};
