import type { DecisionBrief } from './types';

// Sources. Parliament's own records first: the Bill's page and amendments (Parliament's open data), Hansard, GOV.UK.
const BILL = { url: 'https://bills.parliament.uk/bills/4035', label: 'Parliament: the Cyber Security and Resilience Bill' };
const RELEASE = { base: 'gov-uk-2026-10-12-britain-steps-up-ai-defences' };
const SPEECH = { url: 'https://www.gov.uk/government/speeches/building-a-safer-more-secure-britain-in-the-age-of-ai', label: 'GOV.UK: the AI Minister’s speech, October 12' };
const H_0901 = { url: 'https://hansard.parliament.uk/Lords/2026-09-01/debates/28C141CD-8131-4D81-AB23-E998272582C9/CyberSecurityAndResilience(NetworkAndInformationSystems)Bill', label: 'Hansard, Lords committee, September 1' };
const H_0903 = { url: 'https://hansard.parliament.uk/Lords/2026-09-03/debates/5545AAB6-097C-4EC1-B38F-991119A784D1/CyberSecurityAndResilience(NetworkAndInformationSystems)Bill', label: 'Hansard, Lords committee, September 3' };
const FACTSHEET = { url: 'https://www.gov.uk/government/publications/cyber-security-and-resilience-network-and-information-systems-bill-factsheets/incident-reporting', label: 'GOV.UK: the Bill’s incident reporting factsheet' };
const HARDING = { url: 'https://bills.parliament.uk/bills/4035/stages/21180/amendments/10038943', label: 'Parliament: the reporting amendment by Baroness Harding' };
const AISI = { url: 'https://www.aisi.gov.uk/blog/towards-technical-best-practice-for-frontier-ai-development', label: 'AI Security Institute, October 12' };
const BIST = { url: 'https://committees.parliament.uk/work/10013/ai-adoption-safety-and-governance/', label: 'Commons committee inquiry: AI adoption, safety and governance' };
const AI_QUESTION = { url: 'https://questions-statements.parliament.uk/written-questions/detail/2026-09-16/HL3641', label: 'Parliament: written answer, September 16' };
const EU_55 = { url: 'https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-55', label: 'EU AI Act, Article 55' };
const CA_SB53 = { url: 'https://www.gov.ca.gov/2025/09/29/governor-newsom-signs-sb-53-advancing-californias-world-leading-artificial-intelligence-industry/', label: 'California Governor: SB 53' };
const NY_RAISE = { url: 'https://www.nysenate.gov/legislation/bills/2025/S8828', label: 'New York Senate: bill S8828 (the RAISE Act)' };
const GOVAI = { url: 'https://www.governance.ai/research-paper/improving-frontier-ai-incident-reporting-regimes', label: 'GovAI policy brief, September 18' };
const WIRED_HEARING = { base: 'wired-2026-10-13-uk-committee-ai-labs-regulation' };
const MEMBERS = { url: 'https://members.parliament.uk/members/lords', label: 'Parliament: find a member of the Lords' };

export const UK_AI_INCIDENT_REPORTING: DecisionBrief = {
  id: 'uk-ai-incident-reporting',
  title: 'Should the UK make reporting serious AI incidents a legal duty?',
  jurisdiction: 'United Kingdom',
  questions: ['beyond-control', 'who-decides'],
  version: 1,
  asOf: '2026-10-13',
  published: false,
  summary:
    'On October 12 the UK government said it will “explore strengthening” the Cyber Security and Resilience Bill and the wider regime to deal with AI systems that escape human oversight, and will look at how near-miss incidents can be identified and reported. ' +
    'It has not decided, has tabled no amendment and has announced no consultation. The next fixed date is October 26, when the House of Lords considers amendments to the Bill, including one from peers that would make AI developers report certain incidents within 24 hours.',
  who: [
    {
      id: 'w-parliament',
      text: 'Parliament decides what the Bill says. Any change needs both Houses: the Lords consider amendments at Report stage on October 26, and any peer, or the Government, can table one. If the Lords amend the Bill, the Commons then considers the changes.',
      cites: [BILL],
    },
    {
      id: 'w-ministers',
      text: 'Two ministers speak for the Government on it: Kanishka Narayan, Minister for Artificial Intelligence, and Baroness Lloyd of Effra, the Bill’s minister in the Lords. Government departments were reorganized on July 21, so we name people, not departments.',
      cites: [RELEASE, { url: 'https://questions-statements.parliament.uk/written-statements/detail/2026-07-21/HLWS298', label: 'Parliament: written statement on the reorganization, July 21' }],
    },
    {
      id: 'w-aisi',
      text: 'The AI Security Institute is a research organization, not a regulator. It works with AI developers on a voluntary basis, under memoranda of understanding, and does not have the power to compel disclosure or stop a release.',
      cites: [AI_QUESTION, AISI, WIRED_HEARING],
    },
    {
      id: 'w-committee',
      text: 'A Commons committee, chaired by Liam Byrne, began an inquiry on September 30 that asks whether serious incidents, near misses, dangerous capabilities and safeguard failures should be reported on a mandatory basis. It took oral evidence on October 13.',
      cites: [BIST],
    },
  ],
  status: [
    {
      id: 's-government',
      text: 'The Government’s words, October 12: it “will explore strengthening parts of the Cyber Security and Resilience Bill and the wider regime”, and “will look at how near-miss incidents can be identified and reported”. The release does not say “legal duty”, “mandatory” or “compulsory”: those words come from newspaper reports.',
      cites: [RELEASE, SPEECH],
    },
    {
      id: 's-nothing-tabled',
      text: 'As of October 13 the Government has tabled no amendment on AI incidents, and no consultation or call for evidence on AI changes to the Bill is open. In September the Minister said the Government would “shortly consult” on what counts as a significant incident, without a date.',
      cites: [H_0903, BILL],
    },
    {
      id: 's-bill-today',
      text: 'The Bill as it stands does not mention AI. Its reporting rules, a first notice within 24 hours and a fuller report within 72, apply to regulated organizations such as health, water, energy, transport and digital infrastructure operators, not to AI developers.',
      cites: [FACTSHEET, BILL],
    },
    {
      id: 's-before',
      text: 'Until September the Government’s line was that organizations using AI must manage its risks themselves, with ministers’ direction powers as a backstop. On September 1 the Minister said the Government is “exploring whether additional targeted interventions may be needed”.',
      cites: [H_0901],
    },
    {
      id: 's-labs',
      text: 'On October 13 the Commons committee questioned OpenAI, Anthropic, Google DeepMind and Meta. As Wired reported: OpenAI’s vice president said there should be some elements that should be mandatory (Wired adds that these start with incident reporting; those two words are Wired’s, not a quotation); Anthropic said it has consistently believed there should be binding rules and that voluntary commitments are not enough; Google DeepMind, asked directly about a statutory framework, spoke of focusing on standards; Meta pointed to Britain’s existing regulators. Wired reports nothing from Anthropic, Google DeepMind or Meta on incident reporting specifically.',
      cites: [WIRED_HEARING],
    },
    {
      id: 's-stage',
      text: 'The Bill has passed the Commons and is in the Lords. Lords Report stage is scheduled for Monday October 26. A third reading in the Lords, and the Commons’ consideration of any Lords amendments, have no dates yet.',
      cites: [BILL],
    },
    {
      id: 's-amendments',
      text: 'The Report-stage list holds 47 amendments (our count). Those on AI are all from opposition, crossbench or backbench peers, not the Government: reporting by AI developers, and voluntary reporting of near misses (Baroness Harding); a pre-deployment audit by the AI Security Institute (Lord Tarassenko); emergency powers to shut down AI systems (Lord Clement-Jones); and bans on certain capabilities (Baroness Kidron).',
      cites: [BILL, HARDING],
    },
  ],
  options: [
    {
      id: 'voluntary',
      name: 'Keep reporting voluntary, through the AI Security Institute',
      what: 'Developers share incident information with the Institute under non-binding arrangements and follow best practice that it and industry develop; formal standards may follow. No new legal duty. This is the current approach.',
      for: [
        { text: 'The Institute says it is “not seeking to mandate requirements for frontier developers”, and will work with industry on voluntary practices, including how incidents involving AI agents are reported.', who: 'AI Security Institute', cites: [AISI] },
        { text: 'Giving the Institute a regulatory role would “undermine the voluntary collaboration on which AISI operates”, and could put barriers in the way of adopting AI in the UK.', who: 'Baroness Lloyd of Effra, Government minister', cites: [H_0901] },
        { text: 'Its relationships with the main developers, though voluntary, are bound by memoranda of understanding.', who: 'Baroness Twycross for the Government', cites: [AI_QUESTION] },
        { text: 'Google DeepMind, asked about supporting a statutory framework, said the focus would be on standards; Meta pointed MPs to Britain’s existing regulators. Both as Wired reported.', who: 'Owen Larter, Google DeepMind; Rob Sherman, Meta', cites: [WIRED_HEARING] },
      ],
      against: [
        { text: 'Tech companies cannot be the sole arbiters of their own safety standards; the Institute should have statutory powers, including to collect reports of AI-driven cyber attacks.', who: 'Lord Tarassenko, crossbench peer', cites: [H_0901] },
        { text: '“I don’t think the companies can be trusted to self-regulate.”', who: 'Daniel Kokotajlo, a former OpenAI researcher, to MPs on October 13, as Wired reported', cites: [WIRED_HEARING] },
        { text: 'The public learned of recent incidents through outside research and disclosures by AI firms, breached companies and government evaluators; existing arrangements do not reliably ensure incidents are reported, investigated or learned from.', who: 'Zaheed Kara, Centre for the Governance of AI', cites: [GOVAI] },
        { text: 'The White House industry pledge is a good and necessary step but no longer sufficient; there should be a legal obligation to write incident reports and to tell victims, as the BBC reported.', who: 'Brad Smith, Microsoft', cites: [{ base: 'bbc-2026-10-12-ai-less-regulated-than-milk' }] },
      ],
    },
    {
      id: 'developer-duty',
      name: 'Add a reporting duty on AI developers to this Bill',
      what: 'The clause tabled by Baroness Harding would require developers of frontier AI models to notify an affected regulated organization and its regulator within 24 hours, 72 hours and 14 days, when a model gains unauthorized access to, or interferes with, that organization’s systems. It is a peer’s proposal, not Government policy.',
      for: [
        { text: 'There is “a complete absence of an AI Bill”; AI should not be shoehorned into a cyber security bill, “but we have no other choice”.', who: 'Baroness Harding of Winscombe, Conservative peer', cites: [H_0901, HARDING] },
        { text: 'After reading the report on the Hugging Face incident, “we need legislation now”; this Bill is “our only opportunity now”.', who: 'Baroness Freeman of Steventon, crossbench peer', cites: [H_0901] },
        { text: 'Under the Bill, the NHS must protect itself, “but the AI that is attacking it has no duties or obligations under the Bill”.', who: 'Baroness Kidron, crossbench peer', cites: [H_0901] },
        { text: 'There should be some elements that should be mandatory, which Wired reports start with incident reporting (Wired’s wording).', who: 'Tom Duff Gordon, OpenAI vice president, to the Commons committee on October 13, as Wired reported', cites: [WIRED_HEARING] },
      ],
      against: [
        { text: 'The Bill works through risks to regulated organizations’ own systems, and making AI providers regulated “would not address the harms” that some AI products can pose. Government thinking is at an early stage, and any approach must weigh growth and innovation.', who: 'Baroness Lloyd of Effra, Government minister', cites: [H_0901] },
        { text: 'A rule that covers only frontier models is too narrow: they are “but one element of a far more complex constellation” of AI.', who: 'Lord Holmes of Richmond, Conservative peer', cites: [H_0901] },
        { text: 'The Government’s wider approach to cyber security and AI is unclear; it should publish a national action plan first, until then “we are debating ideas in the dark”.', who: 'Viscount Camrose, Conservative front bench', cites: [H_0901] },
      ],
    },
    {
      id: 'ai-bill',
      name: 'A separate AI bill',
      what: 'A standalone act regulating the most powerful AI models and their developers, which could include incident reporting, pre-deployment testing and a statutory role for the AI Security Institute. A bill was promised in 2024 and 2025; no consultation had been published by September 10, and none appeared in the King’s Speech of May 2026.',
      for: [
        { text: 'Recommends a new risk-based AI bill, one statutory AI oversight body and a statutory footing for the AI Security Institute, according to a law firm’s summary of the Joint Committee on Human Rights report of September 14, which we could not open.', who: 'Joint Committee on Human Rights', cites: [{ url: 'https://www.aoshearman.com/en/insights/ao-shearman-on-data/highlight-of-the-week-uk-joint-committee-on-human-rights-publishes-report-on-the-regulation-of-ai', label: 'A&O Shearman’s summary of the report' }] },
        { text: 'Anthropic has consistently believed there should be binding rules on companies and that voluntary commitments are not enough, which the Commons committee heard on October 13; the statement is about binding rules in general, not about incident reporting or a particular bill.', who: 'Liam Booth-Smith, Anthropic, as Wired reported', cites: [WIRED_HEARING] },
        { text: 'A bill was potentially ready at the end of autumn 2024, “nothing came”, and previous opportunities were not taken.', who: 'Lord Holmes of Richmond, Conservative peer', cites: [H_0901] },
        { text: 'Calls for global AI safety rules now, including a legal obligation to write incident reports and to tell a victim if their system is breached by a rogue AI agent, as the BBC reported; does not specify a UK bill.', who: 'Brad Smith, Microsoft', cites: [{ base: 'bbc-2026-10-12-ai-less-regulated-than-milk' }] },
      ],
      against: [
        { text: 'Most AI is already regulated at the point of use by existing expert regulators, with the adequacy of arrangements kept under review.', who: 'Kanishka Narayan, Minister for AI', cites: [{ url: 'https://questions-statements.parliament.uk/written-questions/detail/2026-09-02/26816', label: 'Parliament: written answer, September 2' }] },
        { text: '“We won’t look to law alone”: the stated approach leans on institutions, testing and technical capability alongside any legislation.', who: 'Kanishka Narayan, Minister for AI', cites: [RELEASE] },
        { text: 'Rules built on specific capabilities, such as red lines, are “necessarily speculative” and hard to quantify; a national plan or White Paper should come first.', who: 'Viscount Camrose, Conservative front bench', cites: [H_0901] },
      ],
    },
    {
      id: 'near-misses',
      name: 'Widen reporting to near misses, not only incidents that cause harm',
      what: 'Today the Bill’s test is an incident with a significant UK impact; the Minister says it is meant to capture significant near misses, not routine scanning or ordinary events, and thresholds will be set later in secondary legislation. Other rules go wider (California and New York name specific harms; the EU’s Code of Practice also covers near misses) or narrower.',
      for: [
        { text: 'Near-miss reporting in aviation “proved to be massively significant and fundamentally changed the whole approach to air safety”; the case for applying it here is very sound.', who: 'Lord Birt, crossbench peer', cites: [H_0903] },
        { text: 'A cyber threat that failed is valuable intelligence, because attackers do not stop after one failure.', who: 'Baroness Kidron, crossbench peer', cites: [H_0903] },
        { text: 'Mandatory reporting should extend to near misses and to incidents during training, evaluation and internal use, with independent investigation of serious incidents and a trial of “safe harbour” protection.', who: 'Zaheed Kara, Centre for the Governance of AI', cites: [GOVAI] },
      ],
      against: [
        { text: 'Extending near-miss reporting to all regulated organizations “would increase regulatory reporting very significantly”; regulators may not be able to turn it into advice, and organizations with better detection could be discouraged.', who: 'Baroness Lloyd of Effra, Government minister', cites: [H_0903] },
        { text: 'Rules that sweep in too much risk “regulators … swamped” and a worse security outcome.', who: 'Baroness Neville-Jones, Conservative peer', cites: [H_0903] },
      ],
    },
  ],
  evidence: [
    {
      id: 'e-incidents',
      text: 'Peers have pointed to recent serious incidents to argue for action, including the OpenAI–Hugging Face incident, which an independent investigation found involved about 1,200 OpenAI agents and about 700 in an attack. Whether any would have been reportable under a given rule depends on the definition, which does not yet exist.',
      cites: [{ page: '/incident/openai-hugging-face', label: 'Our reconstruction of the OpenAI–Hugging Face incident' }, H_0901],
    },
    {
      id: 'e-eu',
      text: 'The EU already requires providers of the most capable general-purpose AI models to report serious incidents to the EU AI Office “without undue delay”. This has applied since August 2, 2025.',
      cites: [EU_55],
    },
    {
      id: 'e-ca',
      text: 'California’s SB 53 requires frontier developers to report critical safety incidents to a state office within 15 days, or sooner if there is an imminent risk of death or serious injury. On September 18 the Governor ordered a review of whether its definition should cover loss-of-control incidents like the Hugging Face attack.',
      cites: [CA_SB53, GOVAI],
    },
    {
      id: 'e-ny',
      text: 'New York’s RAISE Act requires frontier developers to report a critical safety incident within 72 hours. It takes effect on January 1, 2027.',
      cites: [NY_RAISE],
    },
    {
      id: 'e-voluntary-record',
      text: 'How voluntary disclosure has worked so far is mixed: OpenAI and Anthropic each disclosed incidents and Wikimedia reported one, but what is known comes mostly from the companies, and questions remain about which companies were affected and whether they were told.',
      cites: [{ base: 'lesswrong-2026-10-12-anthropic-rogue-claudes-questions' }, { page: '/questions/beyond-control', label: 'The answer: can AI act beyond what people intended?' }],
    },
  ],
  openQuestions: [
    { id: 'q-amendment', text: 'Will the Government table its own amendment on AI incidents at Lords Report stage or later, and what would it require?', cites: [BILL] },
    { id: 'q-binding', text: 'If reporting is created, will it be a legal duty with penalties, as under the existing cyber rules, or guidance, a code of practice or voluntary practice?', cites: [RELEASE] },
    { id: 'q-who', text: 'Who would have to report: AI developers, the organizations that use AI, or both? How would a UK regulator enforce a duty on developers based overseas?', cites: [HARDING] },
    { id: 'q-threshold', text: 'What counts as a reportable AI incident or near miss? “Loss of control” has no definition in the Bill or the press release, which glosses it as “autonomous AI systems evade human oversight”.', cites: [RELEASE, FACTSHEET] },
    { id: 'q-internal', text: 'Would a duty cover incidents involving models that have not been released, or that happen during training, evaluation or internal use?', cites: [GOVAI] },
    { id: 'q-recipient', text: 'To whom would reports go, and would any be published? Who would investigate and make sure lessons are learned?', cites: [GOVAI] },
    { id: 'q-labs', text: 'What exactly did each company tell the Commons committee about mandatory incident reporting? Wired reports only OpenAI as backing some mandatory elements, in part in its own wording, and nothing on incident reporting from the others. The committee’s transcript or recording is the check; neither had been published when we looked.', cites: [WIRED_HEARING, BIST] },
  ],
  deadlines: [
    {
      id: 'dl-report',
      date: '2026-10-26',
      text: 'Lords Report stage of the Cyber Security and Resilience Bill, in the Lords Chamber: the next chance to amend it. The list of amendments is still open until the day.',
      cites: [BILL],
    },
  ],
  participate: [
    {
      id: 'p-peers',
      text: 'Write to a member of the Lords before October 26. Peers who tabled AI amendments, the Government’s minister and the Conservative front bench have published contact details.',
      until: '2026-10-26',
      cites: [MEMBERS, H_0901],
    },
    {
      id: 'p-bill-team',
      text: 'GOV.UK lists an email address for questions about the Bill: cybersecurityandresiliencebill@dsit.gov.uk. The domain is still in use after the department’s abolition.',
      cites: [{ url: 'https://www.gov.uk/government/publications/cyber-security-and-resilience-network-and-information-systems-bill-factsheets', label: 'GOV.UK: Bill factsheets' }],
    },
    {
      id: 'p-committee',
      text: 'The Commons committee’s written-evidence window closed on October 13. It says it will issue targeted calls for evidence instead; watch its page.',
      cites: [BIST],
    },
  ],
  ask: [
    'Will the Government table an amendment on reporting serious AI incidents before the Lords consider the Bill on October 26? If not, why not?',
    'If AI incident reporting is to be required, who should have to report: the developer of the AI system, the organization using it, or both?',
    'What should count as a reportable incident or near miss, and who should receive the reports and act on them?',
    'Should the AI Security Institute have the power to require access to models and incident information, or should that stay voluntary?',
  ],
  revisions: [
    { version: 1, date: '2026-10-13', note: 'First version. Research on Parliament’s open data (the Bill’s stages and amendments, Hansard), GOV.UK, the AI Security Institute and the EU, California and New York laws. Every quotation from Hansard was checked against the official text; arguments are attributed to who made them, and the brief recommends nothing.' },
  ],
};
