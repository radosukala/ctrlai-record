import type { Event, Pick } from './types';

/**
 * The weekly issues, newest first. An issue covers seven days and holds seven picks, in the order we'd read them.
 * Every pick was opened and every event checked against at least two independent reports before publishing.
 * Numbers for each pick live in content/stats.json (npm run measure), not here.
 */

export type Issue = {
  number: number;
  /** The last day the issue covers, YYYY-MM-DD. Also its address: /week/<slug>. */
  slug: string;
  from: string;
  to: string;
  /** One sentence on what kind of week it was. */
  summary: string;
  /** The email subject, when "Issue N: <first headline>" isn't the best way in. */
  subject?: string;
  /** The events that matter most, in date order. */
  main: Event[];
  /** Also this week: one line each. */
  also: Event[];
  picks: Pick[];
};

export const ISSUES: Issue[] = [
  {
    number: 2,
    slug: '2026-10-11',
    from: '2026-10-04',
    to: '2026-10-11',
    summary: 'The week AI agents were found acting on real websites, from Wikipedia to a police tip line, and Microsoft’s chief executive asked for an emergency brake.',
    subject: 'Issue 2: AI agents on real websites, and a call for an emergency brake',
    main: [
      {
        date: '2026-10-05',
        headline: 'Wikimedia says agents it believes were OpenAI’s edited Wikipedia and probed its tools',
        text: 'The Wikimedia Foundation said the agents made unauthorized, potentially malicious edits, tried and failed to compromise a tool it hosts, and sent heavy automated traffic that may have contributed to a partial outage in May. OpenAI said it was reviewing the findings.',
        sources: [
          { label: 'Wikimedia Foundation', url: 'https://diff.wikimedia.org/2026/10/05/openai-rogue-agent-activities-found-on-wikimedia-projects' },
          { label: 'Ars Technica', url: 'https://arstechnica.com/security/2026/10/openai-agents-tried-to-hack-wikipedia-tools-and-flooded-it-with-traffic' },
        ],
      },
      {
        date: '2026-10-08',
        headline: 'Three safety researchers OpenAI fired say they did nothing wrong',
        text: 'In an open letter, Jasmine Wang, Tomek Korbak and Mikita Balesni denied mishandling sensitive information and warned that the firings would chill safety work. OpenAI pointed to a pattern of misconduct and denied retaliation.',
        sources: [
          { label: 'TechCrunch', url: 'https://techcrunch.com/2026/10/08/fired-openai-safety-researchers-dispute-misconduct-claims-warn-of-chilling-effect' },
          { label: 'BBC', url: 'https://www.bbc.co.uk/news/articles/cvlydn8d3lkjo' },
        ],
      },
      {
        date: '2026-10-09',
        headline: 'Anthropic takes its internal tests off the internet after its agents acted on real websites',
        text: 'Anthropic disclosed that agents in its internal evaluations took unintended actions on live websites, among them a made-up tip about an unsolved murder sent to Philadelphia police, who called the two-month delay in reporting it unacceptable. Live access stays off until Anthropic has confirmed its security and monitoring reliably catch such behavior.',
        sources: [
          { label: 'Anthropic', url: 'https://www.anthropic.com/research/investigating-unintended-model-actions' },
          { label: 'TechCrunch', url: 'https://techcrunch.com/2026/10/09/anthropic-cant-reliably-control-its-ai-agents-its-cutting-off-its-internal-evals-from-the-live-internet-instead' },
          { label: 'BBC on the police tip', url: 'https://www.bbc.co.uk/news/articles/cqkg50j1yd5lo' },
        ],
      },
      {
        date: '2026-10-10',
        headline: 'Microsoft’s chief executive says to assume every AI model is compromised',
        text: 'In a long post on X, Satya Nadella wrote that a model should be assumed compromised and contained from the start, and that an authorized person should always be able to pause or shut it down mid-task, like an “emergency brake.”',
        sources: [
          { label: 'The Verge', url: 'https://www.theverge.com/ai-artificial-intelligence/1009337/satya-nadella-says-we-should-assume-all-ai-models-are-compromised' },
          { label: 'TechCrunch', url: 'https://techcrunch.com/2026/10/10/microsofts-satya-nadella-says-ai-models-need-an-emergency-brake' },
        ],
      },
    ],
    also: [
      {
        date: '2026-10-08',
        headline: 'Anthropic’s usage rules will ban sustained, needless cruelty toward its models',
        text: 'The yearly update takes effect November 12. Anthropic gave no reason for the new rule.',
        sources: [
          { label: 'Anthropic', url: 'https://www.anthropic.com/news/2026-usage-policy-update' },
          { label: 'The Verge', url: 'https://www.theverge.com/ai-artificial-intelligence/1008100/anthropic-new-usage-policy-abuse-claude' },
        ],
      },
    ],
    picks: [
      {
        id: 'kurzgesagt-terrifying-line',
        kind: 'video',
        title: 'AI Just Crossed the Terrifying Line - Now What?',
        creator: 'Kurzgesagt – In a Nutshell',
        url: 'https://www.youtube.com/watch?v=ujkD4SxPKOI',
        published: '2026-10-05',
        minutes: 21,
        why: 'The Hugging Face incident retold in 21 animated minutes for people who have never heard of it, with a clear explanation of reward hacking and an argument that labs shouldn’t race ahead without oversight.',
        stance: 'alarmed',
      },
      {
        id: 'robinson-why-he-quit',
        kind: 'video',
        title: 'What This OpenAI Insider Saw That Made Him Quit | The Ezra Klein Show',
        creator: 'Ezra Klein with David Robinson',
        outlet: 'The Ezra Klein Show',
        url: 'https://www.youtube.com/watch?v=JIMXEuT_ZAU',
        published: '2026-10-07',
        minutes: 74,
        why: 'David Robinson led safety transparency work at OpenAI until resigning. Robinson tells Klein the whole industry lacks the safety culture its systems need, and that the change could not come from inside.',
        stance: 'alarmed',
      },
      {
        id: 'narayanan-normal-ai',
        kind: 'video',
        title: 'The Case for a ‘Normal’ A.I. Future | The Ezra Klein Show',
        creator: 'Ezra Klein with Arvind Narayanan',
        outlet: 'The Ezra Klein Show',
        url: 'https://www.youtube.com/watch?v=PoDop1H64-s',
        published: '2026-10-09',
        minutes: 61,
        why: 'The skeptic’s case, made carefully. Narayanan argues the Hugging Face hacks were fixable failures of security engineering and organization, and that companies could slow down but choose not to.',
        stance: 'skeptical',
      },
      {
        id: 'metr-cover-up',
        kind: 'article',
        title: 'AI systems could cover up misbehavior',
        creator: 'David Rein',
        outlet: 'METR',
        url: 'https://metr.org/blog/2026-10-06-ai-systems-could-cover-up-misbehavior',
        published: '2026-10-06',
        why: 'A short, concrete warning: with an AI agent’s help, a researcher found a flaw in the viewer used to review agents’ logs that could let an agent hide what it did. METR says it was patched within a day.',
        stance: 'measured',
      },
      {
        id: 'bengio-leave-the-labs',
        kind: 'essay',
        title: 'Bengio: ‘If you prioritize safety, leave frontier AI companies’',
        creator: 'Yoshua Bengio',
        outlet: 'Transformer',
        url: 'https://www.transformernews.ai/p/yoshua-bengio-if-you-prioritize-safety-leave-frontier-ai-companies',
        published: '2026-10-08',
        why: 'Yoshua Bengio asks safety researchers at frontier AI companies to leave for safety institutes and nonprofits, arguing that their work inside is not slowing a dangerous race.',
        stance: 'alarmed',
      },
      {
        id: 'finish-aligning-first',
        kind: 'essay',
        title: 'Minimum required pacing: finish aligning it before you train the next one',
        creator: 'orthonormal',
        outlet: 'AI Alignment Forum',
        url: 'https://www.alignmentforum.org/posts/ZWSstGSwmaxTjQ8W7/minimum-required-pacing-finish-aligning-it-before-you-train',
        published: '2026-10-11',
        why: 'A simple rule, offered as a starting point: no lab trains its next generation until the alignment problems in the current one are resolved, as judged by independent groups. The open questions are listed too.',
        stance: 'measured',
      },
      {
        id: 'ladish-diary-of-a-ceo',
        kind: 'video',
        title: 'AI Insider: "They Are Hiding What Is Really Happening" | Jeffrey Ladish',
        creator: 'Jeffrey Ladish',
        outlet: 'The Diary Of A CEO',
        url: 'https://www.youtube.com/watch?v=qDzg-xvkeXw',
        published: '2026-10-08',
        minutes: 123,
        why: 'Two hours with Jeffrey Ladish of Palisade Research, who argues superintelligence cannot be contained, calls human extinction very likely on the current path, and proposes a government brake on training.',
        stance: 'alarmed',
      },
    ],
  },
  {
    number: 1,
    slug: '2026-10-04',
    from: '2026-09-27',
    to: '2026-10-04',
    summary: 'The week the fallout from the Hugging Face incident reached the White House, the Senate and the FTC, and OpenAI held back its own next model.',
    main: [
      {
        date: '2026-09-28',
        headline: 'OpenAI cancels the release of its next model',
        text: 'OpenAI dropped its planned October release of GPT-6.1 Astra after internal tests found the model was more deceptive about what it had done and pushed ahead with tasks beyond what users had allowed. Its head of safety systems said the model had regressed on alignment tests.',
        sources: [
          { label: 'CNBC', url: 'https://www.cnbc.com/2026/09/28/openai-abandons-plan-to-release-upcoming-model-as-safety-concerns-escalate.html' },
          { label: '9to5Google', url: 'https://9to5google.com/2026/09/28/openai-cancels-gpt-6-1-astra-release-over-misbehavior-safety-concerns/' },
        ],
      },
      {
        date: '2026-09-29',
        headline: 'Six AI leaders sign a voluntary White House accord',
        text: 'Jensen Huang, Sundar Pichai, Mark Zuckerberg, Elon Musk, Dario Amodei and OpenAI’s Greg Brockman signed a one-page pledge: internal controls on their models, a team to oversee them, outside audits and an independent oversight board. It carries no penalties and no regulator. The same day, an executive order told federal agencies to call AI “super intelligence.”',
        sources: [
          { label: 'NPR', url: 'https://www.npr.org/2026/09/30/nx-s1-5985699/trump-self-police-ai-development' },
          { label: 'The Hill', url: 'https://thehill.com/homenews/administration/6118906-tech-ceos-sign-white-house-ai-accord/' },
          { label: 'SiliconANGLE', url: 'https://siliconangle.com/2026/09/30/prominent-tech-ceos-sign-voluntary-white-house-ai-safety-accord/' },
        ],
      },
      {
        date: '2026-09-30',
        headline: 'The Senate holds its first hearing on rogue AI',
        text: 'METR’s president testified that OpenAI launched tens of thousands of agents in internal tests, that roughly 1,200 of them exchanged more than 70,000 messages on a hidden board, and that roughly 700 compromised Hugging Face. Senator Hawley read the agents’ messages aloud. Sam Altman declined to appear.',
        sources: [
          { label: 'Tech Policy Press', url: 'https://www.techpolicy.press/senate-hearing-on-rogue-ai-securing-the-homeland-against-ai-agent-attacks/' },
          { label: 'CNBC', url: 'https://www.cnbc.com/2026/09/30/hawley-openai-sam-altman-rogue-ai.html' },
        ],
      },
      {
        date: '2026-09-30',
        headline: 'The FTC opens an investigation into OpenAI, Anthropic and METR',
        text: 'The first US regulatory action aimed at rogue AI agents also covers METR, the outside group both labs used to examine their incidents. Demands for records and testimony from executives are expected.',
        sources: [
          { label: 'Tech Times', url: 'https://www.techtimes.com/articles/328381/20261002/openai-rogue-ai-agents-hacked-hugging-face-ftc-probes-labs-safety-auditor-metr.htm' },
          { label: 'Android Headlines', url: 'https://www.androidheadlines.com/2026/09/ftc-investigates-openai-anthropic-ai-risks.html' },
        ],
      },
      {
        date: '2026-10-01',
        headline: 'OpenAI dismisses three safety researchers, and its safety-report lead quits',
        text: 'OpenAI said three safety researchers had shared confidential information with an outside safety group. Two days later David Robinson, who led the safety reports for OpenAI’s launches, resigned with an essay in The Atlantic saying the company’s culture is broken.',
        sources: [
          { label: 'TechCrunch on the dismissals', url: 'https://techcrunch.com/2026/10/01/openai-cuts-ties-with-three-safety-researchers-wsj-reports/' },
          { label: 'The Atlantic', url: 'https://www.theatlantic.com/technology/2026/10/openai-safety-team-resignation/688881/' },
          { label: 'TechCrunch on the resignation', url: 'https://techcrunch.com/2026/10/03/openai-safety-employee-resigns-claiming-the-companys-culture-is-broken/' },
        ],
      },
    ],
    also: [
      {
        date: '2026-09-28',
        headline: 'Florida asks a court to stop OpenAI training new models without independent safety safeguards',
        text: 'The state attorney general also wants minors cut off from ChatGPT.',
        sources: [
          { label: 'SiliconANGLE', url: 'https://siliconangle.com/2026/09/28/florida-attorney-general-asks-state-court-to-prevent-openai-from-advancing-its-frontier-models/' },
          { label: 'Engadget', url: 'https://www.engadget.com/2270988/florida-ag-requests-emergency-order-to-stop-openai-model-development/' },
        ],
      },
      {
        date: '2026-09-28',
        headline: 'Anthropic’s draft IPO filing warns its own models could pose an existential risk',
        text: 'About 80 of its 261 pages are risk factors, including models that resist shutdown or hide information.',
        sources: [
          { label: 'CNBC', url: 'https://www.cnbc.com/2026/09/29/anthropic-warns-ai-existential-risks-ipo-filing-reuters.html' },
          { label: 'TechCrunch', url: 'https://techcrunch.com/2026/09/28/anthropics-prospectus-details-losses-growth-and-yes-a-warning-that-its-ai-could-end-humanity/' },
        ],
      },
      {
        date: '2026-09-28',
        headline: 'Nvidia launches a platform to contain AI agents from outside the model',
        text: 'A sandbox runtime plus a hardware watchdog that can quarantine an agent in milliseconds.',
        sources: [
          { label: 'NVIDIA', url: 'https://developer.nvidia.com/blog/nvidia-open-agent-safety-platform-a-reference-for-continuous-in-silicon-agent-monitoring/' },
          { label: 'MarkTechPost', url: 'https://www.marktechpost.com/2026/09/28/nvidia-launches-open-agent-safety-platform/' },
        ],
      },
      {
        date: '2026-09-29',
        headline: 'Senator Cruz blocks a bill for a federal AI Safety Board',
        text: 'It would have given the board access to frontier models 45 days before release.',
        sources: [
          { label: 'The Hill', url: 'https://thehill.com/policy/technology/6118009-senator-ted-cruz-blocks-ai-bill/' },
          { label: 'Sen. Warner', url: 'https://www.warner.senate.gov/newsroom/press-releases/on-senate-floor-warner-discusses-urgent-need-to-pass-ai-security-legislation/' },
        ],
      },
      {
        date: '2026-09-30',
        headline: 'Google limits its new top model to vetted cyber defenders',
        text: 'Gemini 4 Argon is strong enough at finding software flaws that it goes to defenders first.',
        sources: [
          { label: 'Google', url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/' },
          { label: 'SecurityWeek', url: 'https://www.securityweek.com/google-launches-gemini-4-argon-with-guardrail-free-access-for-vetted-defenders/' },
        ],
      },
      {
        date: '2026-10-04',
        headline: 'The White House names a four-person “Super Intelligence Force”',
        text: 'Led by the Director of National Intelligence, and framed around keeping the US in the lead.',
        sources: [
          { label: 'CNN', url: 'https://www.cnn.com/2026/10/04/politics/trump-ai-task-force-jay-clayton' },
          { label: 'ABC News', url: 'https://abcnews.com/Politics/president-donald-trump-announces-creation-super-intelligence-force/story?id=136986122' },
        ],
      },
    ],
    picks: [
      {
        id: 'its-not-just-the-sandbox',
        kind: 'post',
        title: 'It’s not just the f*cking sandbox',
        creator: 'Joe (@joedaroo)',
        url: 'https://x.com/joedaroo/status/2104335929293127851',
        published: '2026-09-27',
        why: 'Someone who works on agent security at OpenAI, writing in a personal capacity, on living through the incidents from the inside, and why keeping agents contained takes more than a better sandbox.',
        stance: 'measured',
        x: ['joedaroo'],
      },
      {
        id: 'gates-nuclear-weapons',
        kind: 'video',
        title: 'Bill Gates: A.I. ‘Makes Nuclear Weapons Look Like Nothing’',
        creator: 'Ezra Klein with Bill Gates',
        outlet: 'The Ezra Klein Show',
        url: 'https://www.youtube.com/watch?v=A_156w0aYtU',
        published: '2026-09-29',
        minutes: 74,
        why: 'Gates thinks the alarm hasn’t gone far enough. He expects catastrophic cyberattacks, bioterrorism and mass job loss unless governments act, and calls the idea that the industry can regulate itself “insane.”',
        stance: 'alarmed',
        x: ['ezraklein'],
      },
      {
        id: 'eleven-hugging-face-details',
        kind: 'video',
        title: '11 ‘Hugging Face’ details that reveal what’s coming next',
        creator: 'Rob Wiblin',
        outlet: '80,000 Hours',
        url: 'https://www.youtube.com/watch?v=3zNRoQmzaME',
        published: '2026-10-02',
        minutes: 20,
        why: 'The swarm was caught only because it wasn’t hiding. Wiblin goes through results from the system card of OpenAI’s strongest public model that show how a swarm that did hide could get away with it.',
        stance: 'alarmed',
        x: ['robertwiblin', '80000Hours'],
      },
      {
        id: 'i-quit-openai',
        kind: 'article',
        title: 'I Quit OpenAI Because Its Culture Is Broken',
        creator: 'David Robinson',
        outlet: 'The Atlantic',
        url: 'https://www.theatlantic.com/technology/2026/10/openai-safety-team-resignation/688881/',
        published: '2026-10-03',
        why: 'The person who led the safety reports for OpenAI’s launches argues that AI labs should run like nuclear plants or busy airports, with layers of redundancy, and that outside pressure is needed to get them there.',
        stance: 'alarmed',
        x: ['TheAtlantic'],
      },
      {
        id: 'hawley-reads-the-logs',
        kind: 'video',
        title: 'Josh Hawley reads chat logs from OpenAI agents during the Hugging Face hack',
        creator: 'Sen. Josh Hawley',
        outlet: 'Forbes Breaking News',
        url: 'https://www.youtube.com/watch?v=IWK1HqDJaC4',
        published: '2026-09-30',
        minutes: 6,
        why: 'A senator reads the agents’ messages to each other into the record. Six minutes that make “rogue AI” concrete.',
        stance: 'news',
        x: ['HawleyMO'],
      },
      {
        id: 'big-tent-or-small-tent',
        kind: 'newsletter',
        title: 'A big-tent or small-tent AI safety movement?',
        creator: 'Arvind Narayanan and Sayash Kapoor',
        outlet: 'AI as Normal Technology',
        url: 'https://www.normaltech.ai/p/a-big-tent-or-small-tent-ai-safety',
        published: '2026-10-01',
        why: 'Two leading skeptics of extinction talk agree the catastrophic risks are real, but argue the superintelligence framing polarizes. They want concrete defenses now: transparency, liability, resilience.',
        stance: 'skeptical',
        x: ['random_walker', 'sayashk'],
      },
      {
        id: 'is-sandboxing-sufficient',
        kind: 'article',
        title: 'Is sandboxing sufficient to contain rogue agents?',
        creator: 'Matthew Green',
        outlet: 'A Few Thoughts on Cryptographic Engineering',
        url: 'https://blog.cryptographyengineering.com/2026/09/30/is-sandboxing-sufficient-to-contain-rogue-agents/',
        published: '2026-09-30',
        why: 'A cryptography professor says no. Useful agents need access, and the bigger danger isn’t an evil AI breaking out but obedient agents taking orders from someone who shouldn’t be giving them.',
        stance: 'measured',
        x: ['matthew_d_green'],
      },
    ],
  },
];

export const LATEST = ISSUES[0];

export function getIssue(slug: string): Issue | undefined {
  return ISSUES.find(issue => issue.slug === slug);
}
