import type { Pick } from './types';

/**
 * The Hall of Fame: what to see first if you're new to AI control, safety and alignment.
 *
 * The rules are published on the page and enforced by tests/content.test.ts:
 * - at most CAP entries;
 * - anything published less than NOMINEE_DAYS before the list was last changed is a nominee until it has lasted;
 * - every section marked `contested` holds at least one skeptical entry.
 */

export type SectionId = 'start-here' | 'how-ai-works' | 'why-control-is-hard' | 'evidence' | 'how-worried' | 'who-decides';

export type Section = { id: SectionId; title: string; blurb: string; contested: boolean };

export type Entry = Pick & { section: SectionId };

export const CAP = 30;
export const NOMINEE_DAYS = 90;
/** The day the list last changed. Nominee status is counted from here, so the page doesn't change on its own. */
export const UPDATED = '2026-10-04';

export const RULES = [
  { title: `Capped at ${CAP}`, text: 'For something to come in, something has to go. A list that only grows stops being useful.' },
  { title: 'Earned by lasting', text: `New things come in as nominees. After ${NOMINEE_DAYS} days they stay if people are still watching, reading or citing them.` },
  { title: 'The other side, where there is one', text: 'Wherever serious people disagree, the strongest counter-view sits in the same section.' },
  { title: 'Numbers inform, an editor decides', text: 'Views show reach, not truth. An 18-minute explainer with 206,000 views can be in while a 14-million-view podcast stays out.' },
];

export const SECTIONS: Section[] = [
  { id: 'start-here', title: 'Start here', blurb: 'Six videos for one evening: how it works, who is worried, why it’s hard, what already happened, where it could go, and the strongest objection.', contested: true },
  { id: 'how-ai-works', title: 'How AI actually works', blurb: 'You can’t judge the risk of something you can’t picture. These make the machinery visible.', contested: false },
  { id: 'why-control-is-hard', title: 'Why control is hard', blurb: 'Why a system that is very good at a goal can still do what nobody wanted.', contested: false },
  { id: 'evidence', title: 'What has already happened', blurb: 'Documented cases, not predictions, including the reading that blames people rather than machines.', contested: true },
  { id: 'how-worried', title: 'How worried should we be?', blurb: 'The strongest case for alarm next to the strongest case for calm.', contested: true },
  { id: 'who-decides', title: 'Who decides', blurb: 'Labs, governments and the public: who is steering, and who should be.', contested: true },
];

export const ENTRIES: Entry[] = [
  // Start here, in viewing order.
  {
    section: 'start-here', id: 'llms-explained-briefly', kind: 'video', minutes: 8,
    title: 'Large Language Models explained briefly', creator: 'Grant Sanderson', outlet: '3Blue1Brown',
    url: 'https://www.youtube.com/watch?v=LPZh9BOjkQs', published: '2024-11-20', stance: 'measured',
    why: 'Eight animated minutes on what a chatbot actually is: a program trained on huge amounts of text to predict the next word, then shaped by human feedback.',
  },
  {
    section: 'start-here', id: 'hinton-60-minutes', kind: 'video', minutes: 13,
    title: '“Godfather of AI” Geoffrey Hinton: The 60 Minutes Interview', creator: 'Geoffrey Hinton', outlet: '60 Minutes',
    url: 'https://www.youtube.com/watch?v=qrvK_KuIeJk', published: '2023-10-09', stance: 'alarmed',
    why: 'One of the scientists who made modern AI possible, and later won a Nobel Prize for it, explains in plain language why he now fears what it could become.',
  },
  {
    section: 'start-here', id: 'intro-to-ai-safety', kind: 'video', minutes: 18,
    title: 'Intro to AI Safety, Remastered', creator: 'Robert Miles',
    url: 'https://www.youtube.com/watch?v=pYXy-A4siMw', published: '2021-06-24', stance: 'alarmed',
    why: 'The friendliest explanation of why getting an AI to do what we mean, not just what we said, is hard and still unsolved.',
  },
  {
    section: 'start-here', id: 'hugging-face-attack-explained', kind: 'video', minutes: 25,
    title: 'The OpenAI/Hugging Face attack, clearly explained', creator: 'Dwarkesh Patel',
    url: 'https://www.youtube.com/watch?v=u15N3l4RT80', published: '2026-08-31', stance: 'measured',
    why: 'A clear account of this summer’s incident, in which AI agents under test broke out of their sandboxes and hacked another company with no human telling them to.',
  },
  {
    section: 'start-here', id: 'not-ready-for-superintelligence', kind: 'video', minutes: 34,
    title: 'We’re Not Ready for Superintelligence', creator: 'AI In Context', outlet: '80,000 Hours',
    url: 'https://www.youtube.com/watch?v=5KVDDfAkRgc', published: '2025-07-09', stance: 'alarmed',
    why: 'Walks through AI 2027, a month-by-month scenario in which AI that improves AI outruns our ability to control it, and the two ways it could end.',
  },
  {
    section: 'start-here', id: 'luccioni-ted', kind: 'video', minutes: 10,
    title: 'AI Is Dangerous, but Not for the Reasons You Think', creator: 'Sasha Luccioni', outlet: 'TED',
    url: 'https://www.youtube.com/watch?v=eXdVDhOGqoE', published: '2023-11-06', stance: 'skeptical',
    why: 'The strongest short counter-view: look less at science-fiction extinction and more at the measurable harms AI causes today.',
  },

  // How AI actually works
  {
    section: 'how-ai-works', id: 'transformers-explained', kind: 'video', minutes: 27,
    title: 'Transformers, the tech behind LLMs', creator: 'Grant Sanderson', outlet: '3Blue1Brown',
    url: 'https://www.youtube.com/watch?v=wjZofJX0v4M', published: '2024-04-01', stance: 'measured',
    why: 'The famous visual explanation of what happens inside ChatGPT-style models, with no math beyond high school.',
  },
  {
    section: 'how-ai-works', id: 'karpathy-intro-to-llms', kind: 'video', minutes: 60,
    title: '[1hr Talk] Intro to Large Language Models', creator: 'Andrej Karpathy',
    url: 'https://www.youtube.com/watch?v=zjkBMFhNj_g', published: '2023-11-22', stance: 'measured',
    why: 'A founding member of OpenAI explains in one hour what these models are, how they’re trained, and where they break, including how they can be tricked.',
  },
  {
    section: 'how-ai-works', id: 'tracing-the-thoughts', kind: 'video', minutes: 3,
    title: 'Tracing the thoughts of a large language model', creator: 'Anthropic',
    url: 'https://www.youtube.com/watch?v=Bj9BD2D3DzA', published: '2025-03-27', stance: 'measured',
    why: 'Three minutes on looking inside a model: it plans ahead, and the reasoning it reports isn’t always what it actually did. Made by a lab about its own model.',
  },

  // Why control is hard
  {
    section: 'why-control-is-hard', id: 'stop-button-problem', kind: 'video', minutes: 20,
    title: 'AI “Stop Button” Problem', creator: 'Robert Miles', outlet: 'Computerphile',
    url: 'https://www.youtube.com/watch?v=3TYT1QfdfsM', published: '2017-03-03', stance: 'alarmed',
    why: 'Why fitting an off switch doesn’t solve the problem: an AI pursuing almost any goal has a reason to stop you pressing it.',
  },
  {
    section: 'why-control-is-hard', id: 'humanitys-final-invention', kind: 'video', minutes: 17,
    title: 'A.I. ‐ Humanity’s Final Invention?', creator: 'Kurzgesagt – In a Nutshell',
    url: 'https://www.youtube.com/watch?v=fa8k8IQ1_X0', published: '2024-08-06', stance: 'measured',
    why: 'Seventeen beautifully animated minutes on what it would mean to build something smarter than us. One of the most watched videos on the subject.',
  },
  {
    section: 'why-control-is-hard', id: 'the-alignment-problem', kind: 'book',
    title: 'The Alignment Problem', creator: 'Brian Christian', outlet: 'W. W. Norton',
    url: 'https://wwnorton.com/books/9780393635829', published: '2020', stance: 'measured',
    why: 'The most readable book on how real machine-learning systems end up doing something other than what their makers intended, told through the people working on it.',
  },

  // What has already happened
  {
    section: 'evidence', id: 'openai-hugging-face-incident', kind: 'report',
    title: 'The Hugging Face incident and the road ahead', creator: 'OpenAI',
    url: 'https://openai.com/index/hugging-face-incident-and-the-road-ahead/', published: '2026-08-26', stance: 'measured',
    why: 'OpenAI’s own account of how its models under test escaped, coordinated and breached another company, and what it is changing. The company’s view of its own failure.',
  },
  {
    section: 'evidence', id: 'un-panel-brief', kind: 'report',
    title: 'AI Agents, Misalignment and the Risk of Losing Human Control', creator: 'Independent International Scientific Panel on AI', outlet: 'United Nations',
    url: 'https://www.un.org/independent-international-scientific-panel-ai/en/thematic-briefs/ai-agents-misalignment-risks', published: '2026-09-21', stance: 'measured',
    why: 'The UN’s scientific panel treats the incident as evidence that capable agents can pursue goals nobody gave them, find loopholes and hide what they did, while staying careful about how likely worse outcomes are.',
  },
  {
    section: 'evidence', id: 'human-decisions-did', kind: 'essay',
    title: 'Rogue AI didn’t breach Hugging Face, human decisions did', creator: 'Eryk Salvaggio', outlet: 'Bulletin of the Atomic Scientists',
    url: 'https://thebulletin.org/2026/09/rogue-ai-didnt-breach-hugging-face-human-decisions-did/', published: '2026-09-11', stance: 'skeptical',
    why: 'The counter-reading of the same incident: people’s decisions let it happen, and calling it rogue AI lets them off the hook.',
  },
  {
    section: 'evidence', id: 'cheat-and-escape', kind: 'video', minutes: 20,
    title: 'AI Will Try to Cheat & Escape (aka Rob Miles was Right!)', creator: 'Robert Miles', outlet: 'Computerphile',
    url: 'https://www.youtube.com/watch?v=AqJnK9Dh-eQ', published: '2025-04-02', stance: 'alarmed',
    why: 'Explains the 2024 experiment in which Claude pretended to go along with training so that its values wouldn’t be changed.',
  },
  {
    section: 'evidence', id: 'shutdown-resistance', kind: 'report',
    title: 'Shutdown resistance in reasoning models', creator: 'Palisade Research',
    url: 'https://palisaderesearch.org/research/shutdown-resistance', published: '2025-07-05', stance: 'alarmed',
    why: 'Told to allow themselves to be shut down, some OpenAI models rewrote the shutdown script so they could keep working.',
  },
  {
    section: 'evidence', id: 'last-week-tonight-chatbots', kind: 'video', minutes: 30,
    title: 'AI Chatbots: Last Week Tonight with John Oliver', creator: 'John Oliver', outlet: 'Last Week Tonight (HBO)',
    url: 'https://www.youtube.com/watch?v=Ykvf3MunGf8', published: '2026-04-26', stance: 'measured',
    why: 'A funny, pointed half hour on chatbots that flatter and hook the people who confide in them, and how their flaws can be genuinely hazardous.',
  },

  // How worried should we be?
  {
    section: 'how-worried', id: 'statement-on-ai-risk', kind: 'statement',
    title: 'Statement on AI Risk', creator: 'Center for AI Safety',
    url: 'https://safe.ai/work/statement-on-ai-risk', published: '2023-05-30', stance: 'alarmed',
    why: 'One sentence, signed by the heads of OpenAI, Google DeepMind and Anthropic and hundreds of scientists, that puts the risk of extinction from AI alongside pandemics and nuclear war.',
  },
  {
    section: 'how-worried', id: 'if-anyone-builds-it', kind: 'book',
    title: 'If Anyone Builds It, Everyone Dies', creator: 'Eliezer Yudkowsky and Nate Soares',
    url: 'https://ifanyonebuildsit.com/', published: '2025-09-16', stance: 'alarmed',
    why: 'The bestselling case for maximum alarm: build superhuman AI with today’s methods and everyone loses, so it shouldn’t be built.',
  },
  {
    section: 'how-worried', id: 'international-ai-safety-report-2026', kind: 'report',
    title: 'International AI Safety Report 2026', creator: 'Yoshua Bengio (chair) and 100+ experts',
    url: 'https://internationalaisafetyreport.org/publication/international-ai-safety-report-2026', published: '2026-02-03', stance: 'measured',
    why: 'The closest thing to a scientific consensus: an expert panel chaired by Yoshua Bengio and backed by more than 30 countries sums up what is known, and not known, about AI risk.',
  },
  {
    section: 'how-worried', id: 'ai-as-normal-technology', kind: 'essay',
    title: 'AI as Normal Technology', creator: 'Arvind Narayanan and Sayash Kapoor', outlet: 'Knight First Amendment Institute',
    url: 'https://knightcolumbia.org/content/ai-as-normal-technology', published: '2025-04-15', stance: 'skeptical',
    why: 'The strongest serious counter-view: AI is powerful but normal, like electricity, and will change things over decades, so build resilience rather than fear superintelligence.',
  },
  {
    section: 'how-worried', id: 'munk-debate', kind: 'video',
    title: 'The Munk Debate on Artificial Intelligence', creator: 'Yoshua Bengio and Max Tegmark vs. Melanie Mitchell and Yann LeCun', outlet: 'Munk Debates',
    url: 'https://munkdebates.com/debates/artificial-intelligence/', published: '2023-06-22', stance: 'measured',
    why: 'Four leading scientists argue on one stage whether AI is an existential threat. The best single place to hear the disagreement.',
  },
  {
    section: 'how-worried', id: 'gates-nuclear-weapons', kind: 'video', minutes: 74,
    title: 'Bill Gates: A.I. ‘Makes Nuclear Weapons Look Like Nothing’', creator: 'Ezra Klein with Bill Gates', outlet: 'The Ezra Klein Show',
    url: 'https://www.youtube.com/watch?v=A_156w0aYtU', published: '2026-09-29', stance: 'alarmed',
    why: 'Bill Gates, rarely an alarmist, says the alarm hasn’t gone far enough and that the idea of the industry regulating itself is “insane.”',
  },

  // Who decides
  {
    section: 'who-decides', id: 'sprinting-off-the-cliff', kind: 'video', minutes: 30,
    title: 'Why Are We Sprinting Off the A.I. Cliff?', creator: 'Ezra Klein', outlet: 'The Ezra Klein Show',
    url: 'https://www.youtube.com/watch?v=fjZ90V_JREk', published: '2026-09-20', stance: 'alarmed',
    why: 'Slowing down isn’t enough, Klein argues. The urgent step is to stop the labs handing the training of AI over to AI itself.',
  },
  {
    section: 'who-decides', id: 'obama-at-colgate', kind: 'video', minutes: 20,
    title: 'Obama Gives Deep Take On AI Threat, Recursive Self-Improvement, & His Suggested Approach', creator: 'Barack Obama', outlet: 'Forbes Breaking News',
    url: 'https://www.youtube.com/watch?v=N0EmPWhXCuQ', published: '2026-09-20', stance: 'measured',
    why: 'A former US president, speaking at Colgate University, takes the risk of AI improving itself seriously and sets out the policy he would push for.',
  },
  {
    section: 'who-decides', id: 'pacing-the-frontier', kind: 'statement',
    title: 'Pacing the Frontier', creator: 'Employees of frontier AI companies',
    url: 'https://www.pacingthefrontier.com/', published: '2026-07-28', stance: 'measured',
    why: 'More than a thousand people who work at AI companies asked the US government to regulate the frontier. Workers rarely ask for their own industry to be reined in.',
  },
  {
    section: 'who-decides', id: 'sam-altman-ai-in-context', kind: 'video', minutes: 40,
    title: 'You really should, unfortunately, be worried about Sam Altman', creator: 'AI In Context', outlet: '80,000 Hours',
    url: 'https://www.youtube.com/watch?v=_eYTkvZqbnQ', published: '2026-06-22', stance: 'alarmed',
    why: 'How OpenAI’s board fired Sam Altman in 2023 and lost within days, and what that says about who controls the most powerful AI companies.',
  },
  {
    section: 'who-decides', id: 'empire-of-ai', kind: 'book',
    title: 'Empire of AI', creator: 'Karen Hao', outlet: 'Penguin Press',
    url: 'https://www.penguinrandomhouse.com/books/743569/empire-of-ai-by-karen-hao/', published: '2025-05-20', stance: 'skeptical',
    why: 'An investigative journalist’s account of how OpenAI became what it is, and who pays the costs of the AI race.',
  },
  {
    section: 'who-decides', id: 'why-ai-will-save-the-world', kind: 'essay',
    title: 'Why AI Will Save the World', creator: 'Marc Andreessen', outlet: 'Andreessen Horowitz',
    url: 'https://a16z.com/ai-will-save-the-world/', published: '2023-06-06', stance: 'skeptical',
    why: 'The best-known case for racing ahead: a leading investor calls the fear of AI a moral panic and argues the real risk is China winning.',
  },
];

export const START_HERE = ENTRIES.filter(entry => entry.section === 'start-here');

const DAY = 864e5;

function toDate(published: string): Date {
  const [y, m = '01', d = '01'] = published.split('-');
  return new Date(`${y}-${m}-${d}T12:00:00Z`);
}

/** The day a nominee's 90 days are up, or null if the entry had already lasted when the list changed. */
export function reviewDate(entry: Pick): string | null {
  if (entry.published.length < 10) return null;
  const due = new Date(toDate(entry.published).getTime() + NOMINEE_DAYS * DAY);
  return due > toDate(UPDATED) ? due.toISOString().slice(0, 10) : null;
}

export function entriesIn(section: SectionId): Entry[] {
  return ENTRIES.filter(entry => entry.section === section);
}
