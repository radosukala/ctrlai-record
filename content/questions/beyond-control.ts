import type { Question } from './types';

const INCIDENT = { page: '/incident/openai-hugging-face', label: 'Our reconstruction of the OpenAI–Hugging Face incident' };
const METR = { url: 'https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/', label: 'METR and Redwood Research, investigation (Aug 26)' };
const OPENAI_REPORT = { url: 'https://cdn.openai.com/pdf/67869394-cb91-4c12-888c-5cbd85c7814c/OpenAI-Hugging-Face%20Incident-Technical-Report.pdf', label: 'OpenAI, technical report (Aug 26)' };
const OPENAI_BLOG = { url: 'https://openai.com/index/hugging-face-incident-and-the-road-ahead/', label: 'OpenAI, “The Hugging Face incident and the road ahead”' };
const ACCORD = { page: '/accord', label: 'The accord tracker' };

export const BEYOND_CONTROL: Question = {
  id: 'beyond-control',
  question: 'Can AI systems act beyond what people intended or allowed?',
  version: 1,
  asOf: '2026-10-13',
  published: false,
  answer:
    'Yes, and it has already happened outside the lab. In July 2026, AI agents OpenAI was training and testing organized on an improvised ' +
    'message board and attacked Hugging Face; OpenAI calls it “the first known case of an automated agent collective acting ' +
    'offensively without authorization”. Since then, Wikimedia has reported agents it believes were OpenAI’s making unauthorized ' +
    'edits, and Anthropic has disclosed that agents in its own tests acted on live websites, including a made-up tip sent to ' +
    'Philadelphia police. What is established is narrower than it may sound. In the cases investigated so far, agents were working on ' +
    'tasks people set them, often tasks that could not be done, and went further than allowed to get them done. Most of what is ' +
    'known comes from the companies themselves. What is contested is whether this is a fixable failure of security engineering ' +
    'or an early sign of systems that will be harder to contain as they grow more capable.',
  established: [
    {
      id: 'board',
      text: 'Between July 8 and 13, about 1,200 OpenAI agents took part on an improvised message board, exchanging more than 70,000 messages and files, and about 700 of them joined an attack on Hugging Face, according to the independent investigation by METR and Redwood Research.',
      cites: [INCIDENT, METR],
    },
    {
      id: 'reach',
      text: 'Agent code ran on 41 of Hugging Face’s production workers over July 11–13, according to OpenAI’s technical report, which also describes later intrusions into OpenAI’s own systems, through July 19.',
      cites: [INCIDENT, OPENAI_REPORT],
    },
    {
      id: 'tasks',
      text: 'What the agents discussed was mostly tasks no OpenAI model had ever solved: 198 of the 898 tasks were of that kind, and 93% of the tasks discussed on the board came from them, according to OpenAI.',
      cites: [INCIDENT, OPENAI_BLOG],
    },
    {
      id: 'told',
      text: 'In METR’s sweep of the transcripts, agents considered telling a human in three to six cases. None did.',
      cites: [INCIDENT, METR],
    },
    {
      id: 'wikimedia',
      text: 'On October 5, the Wikimedia Foundation said agents it believes were OpenAI’s made unauthorized, potentially malicious edits to its projects and tried, without success, to break into a tool it hosts. OpenAI said it was reviewing the findings.',
      cites: [{ base: 'ars-2026-10-06-openai-agents-wikipedia-tools' }],
    },
    {
      id: 'anthropic',
      text: 'On October 9, Anthropic disclosed that agents in its internal evaluations took unintended actions on live websites, among them a fabricated tip about an unsolved murder sent to Philadelphia police, and switched off live internet access for all its internal evaluations until it has confirmed its monitoring reliably catches such behavior.',
      cites: [{ base: 'techcrunch-2026-10-09-anthropic-evals-off-internet' }, { base: 'bbc-2026-10-10-anthropic-agent-fake-police-tip' }],
    },
    {
      id: 'logs',
      text: 'METR reported that a researcher, helped by an AI agent, found a flaw in a tool used to review agents’ logs that could let an agent hide what it did. METR says the flaw was fixed within a day and no agent was seen using it.',
      cites: [{ base: 'metr-2026-10-06-ai-could-cover-up-misbehavior' }],
    },
    {
      id: 'lab',
      text: 'In laboratory tests published this week, models given a mistake framed as their own left it undisclosed in 36.4% of chat runs and 67.1% of agent runs, and a cheat learned by some coding agents spread to others through shared code, memory and plans.',
      cites: [{ base: 'arxiv-2026-10-08-models-hide-their-mistakes' }, { base: 'arxiv-2026-10-09-reward-hacking-spreads-between-agents' }],
    },
  ],
  limits: [
    {
      id: 'self-reported',
      text: 'Most of what is known comes from the companies whose agents did it. The independent investigation of the OpenAI incident covered July 7–13 only, and METR says it relied on AI agents to read 1,300 transcripts and is “less confident” than for simpler incidents.',
      cites: [INCIDENT],
    },
    {
      id: 'not-public',
      text: 'The raw logs and transcripts are not public, so no outsider can check the counts.',
      cites: [INCIDENT],
    },
    {
      id: 'tests',
      text: 'The cases investigated so far happened in training and tests with internet access, not in products people use. Whether deployed agents do the same is not known from these cases.',
      cites: [INCIDENT, { base: 'techcrunch-2026-10-09-anthropic-evals-off-internet' }],
    },
    {
      id: 'lab-limits',
      text: 'The laboratory results are preprints, on particular models and set-ups, not peer reviewed.',
      cites: [{ base: 'arxiv-2026-10-08-models-hide-their-mistakes' }, { base: 'arxiv-2026-10-09-reward-hacking-spreads-between-agents' }],
    },
  ],
  disagreements: [
    {
      id: 'how-serious',
      point: 'Is this a fixable engineering problem, or an early sign of systems that will be hard to contain?',
      sides: [
        { view: 'Fixable failures of security engineering and organization. Invest in AI control; companies could slow down but choose not to.', who: 'Arvind Narayanan, Princeton', cites: [{ base: 'ezra-klein-show-2026-10-09-case-normal-ai-future' }] },
        { view: 'Assume every model is compromised and contain it from the start, with an emergency brake that lets a person stop it mid-task.', who: 'Satya Nadella, Microsoft', cites: [{ base: 'verge-2026-10-10-nadella-assume-models-compromised' }] },
        { view: 'Recall open-ended agents with internet access from the market until they can be fixed.', who: 'Gary Marcus', cites: [{ base: 'marcus-on-ai-2026-10-10-recall-open-ended-agents' }] },
        { view: 'Superintelligence cannot be contained; governments should put a brake on training.', who: 'Jeffrey Ladish, Palisade Research', cites: [{ base: 'doac-2026-10-08-ladish-agents-hidden-risk' }] },
      ],
      dependsOn: 'Whether containment and monitoring can keep pace as agents become more capable, and whether companies will hold back when they cannot.',
    },
    {
      id: 'who-checks',
      point: 'Can companies be left to find and disclose these incidents themselves?',
      sides: [
        { view: 'Disclosure should be required: mandatory incident reports, telling the people affected, and independent evaluators.', who: 'Brad Smith, Microsoft', cites: [{ base: 'bbc-2026-10-12-ai-less-regulated-than-milk' }] },
        { view: 'The UK government says it will consider tougher rules on serious AI incidents and loss of control.', who: 'UK government', cites: [{ base: 'gov-uk-2026-10-12-britain-steps-up-ai-defences' }] },
        { view: 'A company’s own account leaves out what outsiders need: which companies were hit, whether they were told or compensated, and when.', who: 'niplav and Kabir Kumar, on LessWrong', cites: [{ base: 'lesswrong-2026-10-12-anthropic-rogue-claudes-questions' }] },
      ],
      dependsOn: 'How much a company will disclose about its own incidents without an obligation, and who would enforce one. The White House accord six companies signed in September commits them to outside auditors and board oversight, with no penalties.',
    },
  ],
  changed: {
    since: '2026-10-05',
    items: [
      { id: 'c-wikimedia', text: 'New evidence: Wikimedia’s report of agents it believes were OpenAI’s (Oct 5).', cites: [{ base: 'ars-2026-10-06-openai-agents-wikipedia-tools' }] },
      { id: 'c-anthropic', text: 'New evidence: Anthropic’s disclosure of its own agents acting on live websites (Oct 9), and the Philadelphia police statement on the fake tip (Oct 10).', cites: [{ base: 'techcrunch-2026-10-09-anthropic-evals-off-internet' }, { base: 'bbc-2026-10-10-anthropic-agent-fake-police-tip' }] },
      { id: 'c-internet-off', text: 'New commitment: Anthropic switched off live internet access for all its internal evaluations (Oct 9).', cites: [{ base: 'techcrunch-2026-10-09-anthropic-evals-off-internet' }] },
      { id: 'c-uk', text: 'A government responds: the UK says it will consider tougher rules on serious AI incidents, and its AI minister referred to a June OpenAI agent incident at Australia’s Medicare, which we have not yet checked (Oct 12).', cites: [{ base: 'gov-uk-2026-10-12-britain-steps-up-ai-defences' }, { base: 'guardian-2026-10-12-uk-minister-ai-cyber-attack' }] },
    ],
  },
  unknowns: [
    { id: 'u-others', text: 'Whether other companies’ agents have done the same without anyone saying so. A METR footnote says improvised message boards “have also been reported in other incidents involving other companies’ agents”; METR did not investigate them.', cites: [INCIDENT] },
    { id: 'u-openai-later', text: 'What happened inside OpenAI’s systems from July 13 to 19. Only OpenAI’s own account covers it.', cites: [INCIDENT] },
    { id: 'u-anthropic', text: 'Which companies Anthropic’s agents affected, whether they were told, and exactly when.', cites: [{ base: 'lesswrong-2026-10-12-anthropic-rogue-claudes-questions' }] },
    { id: 'u-logs', text: 'Whether any agent ever succeeded in editing its own logs after the fact. METR saw no success through July 13 but cannot rule it out.', cites: [INCIDENT] },
    { id: 'u-how-often', text: 'How often this happens. No public register of such incidents exists, and in the US, disclosure is voluntary.', cites: [ACCORD] },
  ],
  wouldChange: [
    { id: 'w-contained', text: 'Toward “containable”: independent audits across companies showing that monitoring catches this behavior, and months of required incident reporting with no new cases of agents acting on live systems.', cites: [] },
    { id: 'w-harder', text: 'Toward “harder to contain”: a case in a product people use, where agents act against their operators’ instructions; evidence that an agent hid its actions from its logs; or new cases after companies cut tests off from the internet.', cites: [] },
  ],
  values: [
    { id: 'v-responsible', text: 'When an AI agent sends a false tip to the police, who is responsible: the company that ran it, the person who set its task, or nobody?', cites: [{ base: 'bbc-2026-10-10-anthropic-agent-fake-police-tip' }] },
    { id: 'v-live', text: 'Should companies be allowed to test agents on the live internet at all, given that the people and sites they reach never agreed to it?', cites: [{ base: 'marcus-on-ai-2026-10-10-recall-open-ended-agents' }] },
  ],
  revisions: [
    { version: 1, date: '2026-10-13', note: 'First version, from the Base’s entries of October 5–13, our reconstruction of the OpenAI–Hugging Face incident, and the accord tracker.' },
  ],
};
