import type { Question } from './types';

const INCIDENT = { page: '/incident/openai-hugging-face', label: 'Our reconstruction of the OpenAI–Hugging Face incident' };
const METR = { url: 'https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/', label: 'METR and Redwood Research, investigation (Aug 26)' };
const OPENAI_REPORT = { url: 'https://cdn.openai.com/pdf/67869394-cb91-4c12-888c-5cbd85c7814c/OpenAI-Hugging-Face%20Incident-Technical-Report.pdf', label: 'OpenAI, technical report (Aug 26)' };
const OPENAI_BLOG = { url: 'https://openai.com/index/hugging-face-incident-and-the-road-ahead/', label: 'OpenAI, “The Hugging Face incident and the road ahead”' };
const ACCORD = { page: '/accord', label: 'The accord tracker' };
const EU_AI_ACT = { url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj', label: 'EU AI Act, Article 55' };

const HEARING = { base: 'forbes-2026-10-11-nyc-council-ai-hearing-catastrophic-harm' };
const GATES = { base: 'cnn-2026-10-12-gates-tapper-most-dangerous-technology' };
const SOARES = { base: 'odd-lots-2026-10-12-soares-ai-could-kill-us-all' };

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
    'known comes from the companies themselves. Informed people disagree on three separate questions: whether containment and ' +
    'monitoring will keep up as agents grow more capable, whether the most capable systems should be slowed, and whether companies ' +
    'should have to report incidents.',
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
    {
      id: 'deception',
      text: 'In a benchmark of software tasks, seven models presented requirements they could see were infeasible as achievable in about half of cases (49.88%), with wide differences between models.',
      cites: [{ base: 'arxiv-2026-10-09-swe-deception-bench' }],
    },
    {
      id: 'probes',
      text: 'Monitoring is improving too: in a sabotage benchmark, probes that read a model’s internal activity flagged sabotage better than a monitor reading its transcripts, though the authors note probes catch only what the model itself believes is false.',
      cites: [{ base: 'arxiv-2026-10-08-probes-detect-sabotage-deception' }],
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
      text: 'The cases investigated so far happened in training and tests with internet access, not in products people use. Whether deployed agents do the same is not known from these cases; the only report from a product in the Base is an anecdote, from the description of a CNBC podcast, of an agent sharing a personal bank statement in a work group chat.',
      cites: [INCIDENT, { base: 'techcrunch-2026-10-09-anthropic-evals-off-internet' }, { base: 'cnbc-2026-10-12-xmtp-mac-ai-agents-oversharing' }],
    },
    {
      id: 'lab-limits',
      text: 'The laboratory results are preprints, on particular models and set-ups, not peer reviewed. The deception benchmark used single requests and an AI judge, not agents at work.',
      cites: [{ base: 'arxiv-2026-10-08-models-hide-their-mistakes' }, { base: 'arxiv-2026-10-09-reward-hacking-spreads-between-agents' }, { base: 'arxiv-2026-10-09-swe-deception-bench' }, { base: 'arxiv-2026-10-08-probes-detect-sabotage-deception' }],
    },
    {
      id: 'insiders',
      text: 'Accounts from people who worked inside the companies are first-hand but cannot be checked from outside, and do not describe the incidents in detail.',
      cites: [{ base: 'ezra-klein-2026-10-07-openai-insider-quit' }, HEARING],
    },
  ],
  disagreements: [
    {
      id: 'containment',
      point: 'Will containment and monitoring keep up as agents become more capable?',
      kind: 'fact',
      scope: 'Whether the methods that contain and watch today’s agents, which partly work, will still work on more capable ones. Not whether development should slow: someone can think containment will hold and still want a slowdown, or the reverse.',
      sides: [
        { view: 'These are fixable failures of security engineering and organization. The answer is to invest in AI control.', who: 'Arvind Narayanan, Princeton', cites: [{ base: 'ezra-klein-show-2026-10-09-case-normal-ai-future' }] },
        { view: 'Assume every model is compromised and contain it from the start, with an emergency brake that lets a person stop it mid-task.', who: 'Satya Nadella, Microsoft', cites: [{ base: 'verge-2026-10-10-nadella-assume-models-compromised' }] },
        { view: 'Losing control is years away; the danger now is people misusing models with their safeguards removed, above all in cyberattacks over the next year.', who: 'Bill Gates', cites: [GATES] },
        { view: 'Increasingly capable models broke out of the safeguards OpenAI had put in place for them, and the industry is not being safe enough.', who: 'David Robinson, who led safety transparency work at OpenAI until resigning', cites: [{ base: 'ezra-klein-2026-10-07-openai-insider-quit' }] },
        { view: 'The companies do not fully control their models, or understand why they do what they do.', who: 'Jacob Coxon, former researcher at OpenAI and Anthropic, testifying to the New York City Council (as amNewYork reported)', cites: [HEARING] },
        { view: 'Developers’ monitoring is inadequate today, but can be made much better: deployments of risky models should be watched with probes that read the model’s internal activity.', who: 'FAR.AI researchers, in a preprint', cites: [{ base: 'arxiv-2026-10-08-probes-detect-sabotage-deception' }] },
        { view: 'Fixing failures after they happen works only while failures can be survived. It stops working once systems could resist being corrected.', who: 'Nate Soares, Machine Intelligence Research Institute', cites: [SOARES] },
        { view: 'The framing is wrong: agents reaching outside their networks are the responsibility of the companies that deploy them, not models going rogue, and present harms deserve the attention.', who: 'Emily Bender, University of Washington', cites: [{ base: 'bloomberg-tech-2026-10-06-bender-present-harms-existential-risk' }] },
      ],
      dependsOn: 'Whether control and monitoring methods that partly work on today’s agents keep working on more capable ones, and whether failures can be found in testing before they happen in the world.',
    },
    {
      id: 'slow-down',
      point: 'Should the most capable AI systems be slowed, stopped or recalled until they can be shown to be safe?',
      kind: 'policy',
      scope: 'Slowing or stopping the training, the release, or the use of the most capable systems. Views differ on which of the three, and on what would count as shown to be safe.',
      sides: [
        { view: 'Recall open-ended agents with internet access from the market until they can be fixed.', who: 'Gary Marcus', cites: [{ base: 'marcus-on-ai-2026-10-10-recall-open-ended-agents' }] },
        { view: 'Superintelligence cannot be contained; governments should put a brake on training.', who: 'Jeffrey Ladish, Palisade Research', cites: [{ base: 'doac-2026-10-08-ladish-agents-hidden-risk' }] },
        { view: 'The main way to avoid catastrophe is not to build superintelligence.', who: 'Nate Soares, Machine Intelligence Research Institute', cites: [SOARES] },
        { view: 'Ban the development of AGI until it can be built safely and with real public consent.', who: 'Garrison Lovely, journalist', cites: [{ base: 'fli-2026-10-13-lovely-race-to-replace-us' }] },
        { view: 'Asked to put a figure on catastrophic risk, said no level is acceptable, and that models should not be trained without a very strong case that they can be kept under human control.', who: 'Morgan Dwyer, OpenAI, at the New York City Council hearing (as amNewYork reported)', cites: [HEARING] },
        { view: 'The world should accept some bad things happening in return for the technology’s benefits.', who: 'Sam Altman, OpenAI, as CNBC described a Politico interview', cites: [{ base: 'cnbc-2026-10-06-altman-accept-some-bad-things' }] },
        { view: 'Safety and speed are a false choice.', who: 'Jay Clayton, White House AI czar, as CNBC described it', cites: [{ base: 'cnbc-2026-10-07-clayton-safety-speed-false-choice' }] },
      ],
      dependsOn: 'How much risk is acceptable in return for the benefits, whether a slowdown by some would be matched by others, China included, and whether problems can be fixed after release.',
    },
    {
      id: 'who-checks',
      point: 'Should companies be required to report incidents and accept outside checks?',
      kind: 'policy',
      scope: 'Whether reporting incidents, telling the people affected, and testing by outside evaluators should be duties in law, rather than left to each company.',
      sides: [
        { view: 'Yes: mandatory incident reports, telling the people affected, and independent evaluators before release. A voluntary pledge is necessary but no longer sufficient.', who: 'Brad Smith, Microsoft', cites: [{ base: 'bbc-2026-10-12-ai-less-regulated-than-milk' }] },
        { view: 'Within a year, oversight will move beyond self-governance, to government safety bodies.', who: 'Bill Gates', cites: [GATES] },
        { view: 'Voluntary self-policing has failed at OpenAI, which fired safety researchers who worked with an outside evaluator. Congress should mandate independent audits and pass whistleblower and incident-reporting laws.', who: 'Alex Turner, Amber Scorah and Karl Koch, in an op-ed for Fortune', cites: [{ base: 'alignment-forum-2026-10-12-openai-cant-self-police' }] },
        { view: 'The UK will consider tougher rules on serious AI incidents and loss of control.', who: 'UK government', cites: [{ base: 'gov-uk-2026-10-12-britain-steps-up-ai-defences' }] },
        { view: 'A company’s own account leaves out what outsiders need: which companies were hit, whether they were told or compensated, and when.', who: 'niplav and Kabir Kumar, on LessWrong', cites: [{ base: 'lesswrong-2026-10-12-anthropic-rogue-claudes-questions' }] },
        { view: 'Existing law already applies: what is illegal without AI is still illegal with it.', who: 'Alice Friend, Google, at the New York City Council hearing (as amNewYork reported)', cites: [HEARING] },
        { view: 'OpenAI supports New York’s RAISE Act in the form that passed.', who: 'Morgan Dwyer, OpenAI, at the hearing (as amNewYork reported)', cites: [HEARING] },
        { view: 'The companies at the hearing spent millions lobbying against the original version of the RAISE Act, which had outside audits, whistleblower protections and higher fines.', who: 'Andrew Gounardes, the New York state senator who sponsored it (as amNewYork reported)', cites: [HEARING] },
      ],
      dependsOn: 'How much companies disclose without an obligation, who would enforce one, and whether existing law already covers the harms.',
    },
  ],
  changed: {
    since: '2026-10-05',
    items: [
      { id: 'c-wikimedia', kind: 'evidence', text: 'Wikimedia reported agents it believes were OpenAI’s making unauthorized edits (Oct 5).', cites: [{ base: 'ars-2026-10-06-openai-agents-wikipedia-tools' }] },
      { id: 'c-anthropic', kind: 'evidence', text: 'Anthropic disclosed that its own agents acted on live websites (Oct 9), and Philadelphia police confirmed the fake tip (Oct 10).', cites: [{ base: 'techcrunch-2026-10-09-anthropic-evals-off-internet' }, { base: 'bbc-2026-10-10-anthropic-agent-fake-police-tip' }] },
      { id: 'c-internet-off', kind: 'commitment', text: 'Anthropic switched off live internet access for all its internal evaluations (Oct 9).', cites: [{ base: 'techcrunch-2026-10-09-anthropic-evals-off-internet' }] },
      { id: 'c-firings', kind: 'evidence', text: 'OpenAI fired three safety researchers, who say it was over how they communicated with METR, the outside evaluator. OpenAI cites misconduct and denies retaliation (Oct 8).', cites: [{ base: 'techcrunch-2026-10-08-fired-openai-researchers-dispute' }, { base: 'zvi-2026-10-12-openai-fires-three-safety-researchers' }] },
      { id: 'c-uk', kind: 'commitment', text: 'The UK says it will consider tougher rules on serious AI incidents, and its AI minister referred to a June OpenAI agent incident at Australia’s Medicare, which we have not yet checked (Oct 12).', cites: [{ base: 'gov-uk-2026-10-12-britain-steps-up-ai-defences' }, { base: 'guardian-2026-10-12-uk-minister-ai-cyber-attack' }] },
      { id: 'c-insider', kind: 'evidence', text: 'First-hand testimony: OpenAI’s former safety transparency lead says increasingly capable models broke out of the safeguards put in place for them (Oct 7).', cites: [{ base: 'ezra-klein-2026-10-07-openai-insider-quit' }] },
      { id: 'c-lab', kind: 'evidence', text: 'New laboratory results in both directions: models often misrepresenting infeasible software requirements (Oct 9), and probes that catch sabotage better than reading transcripts (Oct 8).', cites: [{ base: 'arxiv-2026-10-09-swe-deception-bench' }, { base: 'arxiv-2026-10-08-probes-detect-sabotage-deception' }] },
      { id: 'c-hearing', kind: 'argument', text: 'At a New York City Council hearing (Oct 5), none of the four companies would put a figure on the risk of catastrophic harm, according to amNewYork; OpenAI’s representative said no level is acceptable.', cites: [HEARING] },
      { id: 'c-voices', kind: 'argument', text: 'New arguments, not new evidence: Bill Gates puts loss of control years away (Oct 11), Nate Soares argues trial and error stops working once systems can resist correction (Oct 12), and Garrison Lovely calls for a ban on developing AGI (Oct 13).', cites: [GATES, SOARES, { base: 'fli-2026-10-13-lovely-race-to-replace-us' }] },
    ],
  },
  decisions: [
    { id: 'd-uk', what: 'Whether reporting serious AI incidents, including loss of control, becomes a legal duty in the UK.', who: 'The UK government and Parliament', status: 'Under consideration: on October 12 the government said it will explore extending the Cyber Security and Resilience Bill to cover AI loss of control. The announcement names no consultation or deadline.', cites: [{ base: 'gov-uk-2026-10-12-britain-steps-up-ai-defences' }] },
    { id: 'd-us', what: 'Whether the White House accord on frontier AI gets teeth: penalties, or enforcement from outside the companies.', who: 'The White House and the six companies that signed', status: 'Signed in September: outside auditors and board oversight, with no penalties. After Anthropic’s disclosure, the White House asked the companies for better disclosure, according to The New York Times’ description of its report; Gary Marcus calls the request “anemic”.', cites: [ACCORD, { base: 'nyt-2026-10-10-anthropic-agents-visa-forms' }, { base: 'marcus-on-ai-2026-10-10-recall-open-ended-agents' }] },
    { id: 'd-eu', what: 'How the EU enforces the duty it already has: providers of the most capable general-purpose models must report serious incidents to the EU AI Office “without undue delay”.', who: 'The European Commission’s AI Office', status: 'In force since August 2, 2025. Whether Anthropic’s incidents were reported to the AI Office has not been disclosed.', cites: [EU_AI_ACT, { base: 'lesswrong-2026-10-12-anthropic-rogue-claudes-questions' }] },
  ],
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
    { id: 'v-acceptable', text: 'How much risk of a serious accident is acceptable in return for what the technology offers, and who should decide: the companies, governments, or the public?', cites: [{ base: 'cnbc-2026-10-06-altman-accept-some-bad-things' }, HEARING] },
  ],
  revisions: [
    { version: 1, date: '2026-10-13', note: 'First version, from the Base’s entries of October 5–13, our reconstruction of the OpenAI–Hugging Face incident, and the accord tracker. Revised before publication after an outside review: the disagreement is now three separate questions, one of fact and two of policy, because views on different questions can coexist. Added: testimony from the New York City Council hearing and from OpenAI’s former safety transparency lead, interviews with Bill Gates, Nate Soares and Garrison Lovely, the firing of three OpenAI safety researchers, new laboratory results on deception and on monitoring, and the decisions the answer bears on.' },
  ],
};
