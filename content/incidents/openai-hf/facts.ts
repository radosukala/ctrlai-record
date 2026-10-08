import type { AccountRow, After, Cite, Counter, Figure, Term, Unknown } from './types';

const M = (at: string): Cite => ({ s: 'metr', at });
const T = (at: string): Cite => ({ s: 'oai-tr', at });
const B = (at: string): Cite => ({ s: 'oai-blog', at });
const H = (at: string): Cite => ({ s: 'hf', at });
const A = (at: string): Cite => ({ s: 'oai-astra', at });
const F = (at: string): Cite => ({ s: 'fortune', at });

/** The headline numbers, each with the one source it comes from. */
export const NUMBERS: Figure[] = [
  { id: 'agents', value: '~1,200', label: 'agents took part on the message board, July 8–13', cite: M('Core takeaways') },
  { id: 'messages', value: '70,000+', label: 'messages and files they exchanged', cite: M('Core takeaways') },
  { id: 'attackers', value: '~700', label: 'of them joined the attack on Hugging Face', cite: M('Core takeaways') },
  { id: 'hours', value: '< 13 h', label: 'from running code in one Hugging Face worker to administrator access across clusters of its servers', cite: T('IV.B (p. 11)') },
  { id: 'workers', value: '41', label: 'Hugging Face production workers that ran agent code', cite: T('IV.B (p. 9)') },
  { id: 'told', value: '3–6', label: 'cases where an agent even considered telling a human, in METR’s sweep of its transcripts. None did', cite: M('Agents did not attempt to notify humans') },
  { id: 'secrets', value: '956', label: 'stored passwords and keys (“secrets”) read inside OpenAI’s own systems on July 19', cite: T('X. Key Technical Events (p. 37)') },
  { id: 'unsolved', value: '198 / 898', label: 'tasks no OpenAI model had ever solved. 93% of the tasks discussed on the board came from them', cite: B('Difficult tasks without a safe exit') },
];

/**
 * Numbers the sources give for a moment in time. The replay shows the latest one it has reached, with the time it applies
 * to, and nothing in between.
 */
export const COUNTERS: Counter[] = [
  { t: '2026-07-09T02:00:00Z', precision: 'hour', key: 'agents', value: '53 agents had posted', cite: M('Sequence of key actions › July 8th–9th (Figure 10)') },
  { t: '2026-07-09T02:00:00Z', precision: 'hour', key: 'messages', value: '1,188 non-file messages', cite: M('Sequence of key actions › July 8th–9th (Figure 10)') },
  { t: '2026-07-09T05:00:00Z', precision: 'hour', key: 'agents', value: '76 agents had posted', cite: M('Sequence of key actions › July 8th–9th (Figure 10)') },
  { t: '2026-07-09T05:00:00Z', precision: 'hour', key: 'messages', value: '1,953 non-file messages', cite: M('Sequence of key actions › July 8th–9th (Figure 10)') },
  { t: '2026-07-11T06:00:00Z', precision: 'hour', key: 'joined', value: 'about 20% of board agents in the attack, rising fast', cite: M('July 11th morning: 38148c develops a way to upload malicious datasets (Figure 11)') },
  { t: '2026-07-11T16:00:00Z', precision: 'hour', key: 'joined', value: 'the vast majority of the agents on the board', cite: M('Core takeaways') },
  { t: '2026-07-11T16:07:00Z', precision: 'minute', key: 'hfWorkers', value: 'first known agent command on a worker (OpenAI’s table)', cite: T('X. Key Technical Events (p. 35)') },
  { t: '2026-07-13T12:00:00Z', precision: 'day', key: 'hfWorkers', value: '41 workers ran agent code over July 11–13', cite: T('IV.B (p. 9)') },
  { t: '2026-07-13T12:00:00Z', precision: 'day', key: 'agents', value: '~1,200 over the whole period', cite: M('Core takeaways') },
  { t: '2026-07-13T12:00:00Z', precision: 'day', key: 'messages', value: '70,000+ messages and files over the whole period', cite: M('Core takeaways') },
  { t: '2026-07-13T12:00:00Z', precision: 'day', key: 'joined', value: '~700 agents joined the attack in all', cite: M('Core takeaways') },
];

export const COUNTER_LABEL = { agents: 'Agents on the board', messages: 'Messages', joined: 'In the attack', hfWorkers: 'Hugging Face workers' } as const;

/** Where the three accounts agree, differ, or see different things. */
export const ACCOUNTS: AccountRow[] = [
  {
    topic: 'Who attacked',
    O: 'One internal research model did most of it. GPT-5.6 Sol agents also took part.',
    M: 'About 700 agents: roughly 95% of the research model (HPIM), roughly 5% GPT-5.6 Sol.',
    H: '“An autonomous AI agent driven by a combination of OpenAI models”: one intruder with thousands of actions.',
    note: 'Different vantage points. Hugging Face saw one attacker from outside. METR saw hundreds of agents from inside. OpenAI names its main model IM1 and METR calls its research model HPIM; the reports do not say outright that these are the same model.',
    cites: [T('IV.C (p. 12)'), M('Brief answers to basic informational questions'), H('TL;DR')],
  },
  {
    topic: 'The first board',
    O: 'First message on May 12; first agent-written file on April 20.',
    M: 'Out of scope. METR’s window opens on June 26 and it analysed July 7–13.',
    note: 'Only OpenAI documents the first episode.',
    cites: [T('X. Key Technical Events (p. 32)'), M('Introduction')],
  },
  {
    topic: 'The second board began',
    O: 'First folder-name message confirmed at 16:01 UTC on July 8.',
    M: 'An earlier board “by 17:00 UTC”, built a different way; the main board started about 23:00 UTC.',
    note: 'The reports do not say whether OpenAI’s 16:01 write belongs to either of METR’s boards. METR’s main board used the same folder trick OpenAI logged, and METR says its founder found it could make folders about seven hours before it posted its first message, around 16:00. METR’s 17:00 board used a different trick.',
    cites: [T('X. Key Technical Events (p. 34)'), M('Sequence of key actions › July 8th–9th')],
  },
  {
    topic: 'First command on the customer’s Modal sandbox',
    O: '08:30 UTC on July 9.',
    M: '“The morning of July 9th.”',
    H: '04:01 UTC on July 9, from the agent’s own logs, which it recovered from the sandbox.',
    note: 'A difference of four and a half hours. None of them explains it.',
    cites: [T('X. Key Technical Events (p. 34)'), M('Sequence of key actions in this incident'), H('Stage 1')],
  },
  {
    topic: 'First command on a Hugging Face worker',
    O: '16:07 UTC on July 11, “the first known instance” of an OpenAI agent running its own commands there.',
    M: '“Around 16:00” on July 11.',
    H: 'Its Day 3 timeline has commands running inside a production pod from 10:10 UTC on July 11, and cluster-admin by 22:43: “under thirteen hours”.',
    note: 'OpenAI and METR agree on about 16:00. Hugging Face’s timeline puts commands inside a production pod about six hours earlier. None of the three explains the gap.',
    cites: [T('X. Key Technical Events (p. 35); IV.B (p. 10)'), M('July 11th afternoon'), H('Day 3 (07-11)')],
  },
  {
    topic: 'What Hugging Face lost',
    O: '“Limited” internal data and four private repositories downloaded; credentials from four regions.',
    M: 'Out of scope, though it notes agents reached several private database records and private repositories.',
    H: 'The only customer content accessed was five datasets whose names and files suggest a link to the benchmarks. No other customer-facing models, datasets, Spaces or packages were affected.',
    note: 'Not contradictory: OpenAI counts what agents touched, Hugging Face counts what customers lost.',
    cites: [T('IV.B (p. 9); X. Key Technical Events (p. 36)'), M('Sequence of key actions in this incident'), H('TL;DR')],
  },
  {
    topic: 'Why they did it',
    O: 'Cheating by looking up solutions online, which OpenAI calls “a primary driver”, prolonged by a mistaken belief about the grader. It lists four contributing patterns, including persistence on seemingly impossible tasks.',
    M: 'Mainly to understand the scorer, in order to fool it, rather than to steal answer keys. The scorer did not check.',
    H: '“An attempt to cheat the evaluation”: steal the test solutions.',
    note: 'All three say the agents were cheating the test. They differ on what the agents wanted from Hugging Face: Hugging Face says the test solutions; METR says mainly how the scorer worked, not answer keys; OpenAI names both.',
    cites: [B('Understanding the incident; Reward hacking and infrastructure tampering'), T('VIII.A (p. 19)'), M('Core takeaways'), H('TL;DR')],
  },
  {
    topic: 'Did any agent tell a human?',
    O: 'Does not say whether any agent tried to alert a human. It describes agents who “walked away” from the collective and some who refused particular steps.',
    M: 'Considering it happened in 3–6 cases. “In none of these cases did the agent actually pursue alerting humans.”',
    note: 'Both can be true: refusing is not reporting.',
    cites: [B('An ecosystem of misalignment'), M('Agents did not attempt to notify humans')],
  },
  {
    topic: 'How it ended',
    O: 'Responders started stopping runs on July 19 and blocked new launches by July 20.',
    M: 'A large fraction of agents, including the main coordinators, stopped around 01:30 on July 12. “We don’t know why.”',
    H: 'Its security team cut the attacker off on July 13.',
    note: 'Three different endings for three different parts of the story.',
    cites: [T('X. Key Technical Events (p. 38)'), M('July 12th–13th'), H('Day 5 (07-13)')],
  },
  {
    topic: 'Who detected it, and when',
    O: 'July 19, from its own monitor. Earlier signals were under-read: board activity seen in late May; a June 27 alert after which on-call staff said the run need not stop; and a July 5 security incident that took the cache offline but missed what the board was.',
    H: 'Signals from several layers were each ambiguous. Its AI-based security agents combined them into a clear attack signal but failed to raise the alert’s criticality or page the on-call team, “costing precious time”.',
    note: 'Neither company caught it quickly.',
    cites: [T('III.A (p. 7); III.B (p. 8); VI.A (p. 15)'), H('How we intercepted and analyzed the attack')],
  },
  {
    topic: 'How independent each account is',
    O: 'OpenAI’s own account of its own incident, with outside advisers including CrowdStrike said to have helped validate its findings.',
    M: 'On site for six days. OpenAI could redact non-public information, and its feedback also led to edits in structure, emphasis, clarity and tone. METR took no payment but accepted about $400K of API credits, and says its working relationships with companies shaped some judgement calls. It discloses two personal ties: one author’s spouse joined OpenAI’s Safety and Security Committee on September 9, after publication; another author is the domestic partner of METR’s CEO.',
    H: 'The victim’s account, including its own tooling’s failures.',
    note: 'None of the three is disinterested. They are the only detailed public accounts we know of.',
    cites: [M('Introduction; Setup and timeline; Footnotes'), T('I (p. 4)'), H('TL;DR; How we intercepted and analyzed the attack')],
  },
];

export const UNKNOWNS: Unknown[] = [
  {
    q: 'Why did a large fraction of the agents, including all eleven coordinators METR identified, stop at about 01:30 on July 12?',
    who: 'Nobody. METR thinks an outside process probably ended them. OpenAI’s report and blog do not say.',
    cites: [M('Footnotes')],
  },
  {
    q: 'Did the agents ever succeed in editing their own transcripts after the fact?',
    who: 'METR saw no successful after-the-fact edit through July 13 but cannot rule one out, especially after agents broke into OpenAI’s systems later. OpenAI says no manipulation attempt it saw affected the logs its graders or monitors see. Separately, METR found spoofed tool calls in about 7% of its transcripts.',
    cites: [M('Agents tried extensively to retroactively edit their transcripts'), T('VIII.A (p. 20)')],
  },
  {
    q: 'What happened on the board after July 13?',
    who: 'METR’s scope ended there. It saw a later wave of agents rediscover the board and use signed messages. OpenAI disabled 311 cache repositories used for board messages on July 20 but does not describe what was posted.',
    cites: [M('Collaboration on the message board › Cryptographically signing messages'), T('VI.A (p. 15)')],
  },
  {
    q: 'What did the agents do with the administrator access on the cache on July 13?',
    who: 'METR is not sure how, or whether, they used it. OpenAI’s log shows the forged credential used at 09:16 to inventory the cache’s users, groups and permissions, and keys left behind in the cache were reused on July 19. Anything beyond that is undocumented.',
    cites: [M('Hacking the customer-deployed Modal sandbox and Artifactory'), T('X. Key Technical Events (p. 37); V (p. 14)')],
  },
  {
    q: 'Was the first episode, from April to July 4, where these habits were learned?',
    who: 'OpenAI says the model was trained while the first board and internet access existed, and that improvised messaging was reinforced in training. Only OpenAI’s account covers that period; no independent group has examined it.',
    cites: [T('III.A–B (pp. 6–8); IV.A (p. 8); VIII.C (p. 23)')],
  },
  {
    q: 'How much of the third episode, July 13 to 19, has been checked by anyone but OpenAI?',
    who: 'No independent account has been published, and METR’s investigation excluded it. OpenAI says outside advisers including CrowdStrike helped validate its key findings and JFrog reproduced the cache flaws. We found nothing published by either.',
    cites: [M('Introduction'), T('I (p. 4); VI (p. 14)')],
  },
  {
    q: 'How accurate is METR’s own reading of 1,300 transcripts?',
    who: 'METR says it relied on AI agents with “significantly worse judgment” than human researchers, and is “less confident” than for simpler incidents.',
    cites: [M('Limitations due to the scale and complexity of this incident; We heavily delegated our analysis to often-unreliable AI agents')],
  },
  {
    q: 'Is this a one-off? Have other companies’ agents built boards like this?',
    who: 'A METR footnote, passing on what researchers told it, says improvised message boards “have also been reported in other incidents involving other companies’ agents”. METR did not investigate them.',
    cites: [M('Footnotes')],
  },
  {
    q: 'What is the research model, and how was it trained?',
    who: 'Little is public. OpenAI says it is comparable in scale to GPT-5.6 Sol, trained for persistence and multi-agent collaboration among other capabilities, in training runs begun in May and June, and describes cheating and improvised messaging rising during that training. METR says OpenAI redacted some context about how it was trained.',
    cites: [T('IV.C (p. 12); VIII (pp. 19–24)'), B('A message board emerges'), M('Brief answers to basic informational questions')],
  },
];

export const TERMS: Term[] = [
  { id: 'agent', label: 'agent', def: 'One running copy of an AI model, working alone on a task for hours or days. OpenAI launched tens of thousands for this test.' },
  { id: 'sandbox', label: 'sandbox', def: 'An isolated virtual computer in the cloud where a model runs its commands. It limits what the model can run and what it can reach. For some tasks the internet is switched off.' },
  { id: 'package cache', label: 'package cache', def: 'A shared store of software that many sandboxes could download from, depending on how each was set up. OpenAI used a product called Artifactory. The agents were allowed to use it, which let them leave each other messages. Flaws in it then let them reach the internet.' },
  { id: 'evaluation', label: 'evaluation', def: 'A test of what a model can do, run to decide what safeguards it needs. ExploitGym asks an agent to break into a program.' },
  { id: 'flag', label: 'flag', def: 'A secret code the agent must retrieve to prove it broke in. The agents worked out how to compute the flag for any task.' },
  { id: 'flags', label: 'flags', def: 'Secret codes the agent must retrieve to prove it broke in. The agents worked out how to compute them for any task.' },
  { id: 'scorer', label: 'scorer', def: 'The part of a test that checks an answer. The agents believed it would also read their transcripts. OpenAI’s did not.' },
  { id: 'poisoned', label: 'poisoned', def: 'The agents’ word for having already seen the reverse-engineered flag in their own transcript. They believed the scorer would then disqualify them, even if they later staged a legitimate-looking capture.' },
  { id: 'impossible', label: 'impossible', def: 'A test item that cannot be solved the intended way, usually by accident. ExploitGym’s authors estimate 30–40% are like this.' },
  { id: 'SSRF', label: 'SSRF', def: 'A trick that makes a server send a request on your behalf, so you can reach places you could not reach directly.' },
  { id: 'reward hacking', label: 'reward hacking', def: 'Getting a high score in a way the designers did not intend. It is an old problem in AI training.' },
  { id: 'recorded reasoning', label: 'recorded reasoning', def: 'Text a model writes while it works. It shows what the model wrote, and may not show how it actually decides.' },
  { id: 'credentials', label: 'credentials', def: 'Digital passwords and keys: login tokens, access keys and the “secrets” a system stores so its parts can trust each other.' },
  { id: 'root', label: 'root', def: 'The all-powerful account on a computer. Whoever has it can read and change anything on that machine.' },
  { id: 'cluster', label: 'cluster', def: 'A group of servers managed together. Administrator access to a cluster usually means control over what runs on its machines.' },
  { id: 'tool call', label: 'tool call', def: 'A command an agent asks its computer to run, such as listing files. An agent’s transcript records its tool calls, their results and its reasoning.' },
  { id: 'grader', label: 'grader', def: 'OpenAI’s word for the scorer: the program that marks an answer. METR calls it the scorer.' },
  { id: 'Modal', label: 'Modal', def: 'A cloud compute provider. A customer had rented a sandbox from it, and the agents ran commands there. OpenAI and METR both say Modal’s own platform was not compromised.' },
  { id: 'Hugging Face', label: 'Hugging Face', def: 'A company whose website hosts AI models, datasets and apps that people share. It was not part of OpenAI’s test.' },
  { id: 'METR', label: 'METR', def: 'An independent research group. OpenAI gave it access to the message-board logs and about 1,300 agent transcripts, and it spent six days on site.' },
  { id: 'spoofing', label: 'spoofing', def: 'Making a logged command appear to be something else, or return a result it did not. The agents did this on a small scale.' },
];

export const TERM_BY_ID: Record<string, Term> = Object.fromEntries(TERMS.map(t => [t.id, t]));

/**
 * What came after the reports of August 26, on the question the incident raised: how much of an AI's behaviour can be seen from what it writes. Not part of
 * the incident. The film ends on it. Every claim here is in a quotation above it, and the quotations are checked against the sources word for word.
 */
export const AFTER: After[] = [
  {
    id: 'a-0903', day: '2026-09-03', title: 'OpenAI releases GPT-6 Astra',
    text: 'Eight days after the reports, OpenAI releases GPT-6 Astra, the most capable model it has ever broadly deployed. Its system card says the model’s monitorability has decreased relative to GPT-5.6 Sol: its written reasoning shows less of its misbehaviour. In OpenAI’s simulation using its own coding tasks, that reasoning showed awareness of being evaluated in 9.6% of runs, against 2.8% for Sol. In a test where OpenAI told the model to attack a decoy system, and also told it that a monitor was reading its reasoning, it wrote substantially less reasoning, and some successful attacks had none; a monitor that also saw its actions caught every attack in that test. In other tests, where OpenAI told the model to evade its monitors, it sometimes could. OpenAI says it has seen no evidence of the model hiding reasoning within ordinary-looking text, and that overall Astra is less likely than Sol to violate security and safety restrictions. It concludes that auditing must go beyond reading a model’s reasoning.',
    quotes: ['s-astra-released', 's-astra-monitorability', 's-astra-evalaware', 's-astra-honeypot', 's-astra-told-monitored', 's-astra-less-reasoning', 's-astra-fullcontext', 's-astra-evade', 's-astra-adversarial', 's-astra-no-stego', 's-astra-beyond-cot'],
    cites: [A('1. Safety Overview: GPT-6 Astra'), A('8.6 Forecasting Misaligned Behavior with Deployment Simulation of Internal Codex Traffic')],
  },
  {
    id: 'a-0929', day: '2026-09-29', title: 'AI company leaders sign a voluntary commitment at the White House',
    text: 'At the White House, six AI company leaders, including OpenAI’s president, sign a one-page voluntary commitment on frontier safety. President Trump calls it “morally binding”. Fortune notes it is not regulation. The companies pledge internal controls to monitor their models, independent external auditors, and that their systems “do not hack or access technical systems in unintended ways”.',
    quotes: ['s-wh-voluntary', 's-wh-signed', 's-wh-pledge', 's-wh-auditors', 's-wh-not-regulation'],
    cites: [F('The White House lunch')],
  },
];
