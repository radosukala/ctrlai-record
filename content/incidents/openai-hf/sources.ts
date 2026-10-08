import type { Source, SourceId } from './types';

export const SOURCES: Record<SourceId, Source> = {
  'oai-blog': {
    id: 'oai-blog',
    badge: 'O',
    short: 'OpenAI blog',
    title: 'The Hugging Face incident and the road ahead',
    by: 'OpenAI',
    date: '2026-08-26',
    url: 'https://openai.com/index/hugging-face-incident-and-the-road-ahead/',
    kind: 'affected-party',
    note: 'OpenAI’s own summary. It carries a 16-event timeline and quoted agent messages and reasoning.',
  },
  'oai-tr': {
    id: 'oai-tr',
    badge: 'T',
    short: 'OpenAI technical report',
    title: 'OpenAI – Hugging Face Incident Technical Report (38 pages)',
    by: 'OpenAI',
    date: '2026-08-26',
    url: 'https://cdn.openai.com/pdf/67869394-cb91-4c12-888c-5cbd85c7814c/OpenAI-Hugging-Face%20Incident-Technical-Report.pdf',
    kind: 'affected-party',
    note: 'OpenAI’s own full account, with a UTC-timestamped timeline. With the blog, the only source for April to June and for July 13–20.',
  },
  metr: {
    id: 'metr',
    badge: 'M',
    short: 'METR and Redwood Research',
    title: 'Brief independent investigation of agents’ behavior, reasoning and collaboration in the OpenAI / Hugging Face hacking incident',
    by: 'Ryan Greenblatt, Ajeya Cotra, Hjalmar Wijk',
    date: '2026-08-26',
    url: 'https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/',
    kind: 'independent',
    note: 'Six days on site at OpenAI with the message-board dump and about 1,300 transcripts. OpenAI could redact; METR took no payment but accepted API credits. Scope June 26 – July 13; almost all of its data is from July 7–13.',
  },
  hf: {
    id: 'hf',
    badge: 'H',
    short: 'Hugging Face',
    title: 'Anatomy of a Frontier Lab Agent Intrusion: A Technical Timeline of the July 2026 Incident',
    by: 'Hugo Larcher, Adrien Carreira, Raphael G and Christophe Rannou (Hugging Face)',
    date: '2026-07-27',
    url: 'https://huggingface.co/blog/agent-intrusion-technical-timeline',
    kind: 'affected-party',
    note: 'The victim’s own reconstruction of about 17,600 recovered actions. It sees one attacker, not 700 agents.',
  },
  'oai-astra': {
    id: 'oai-astra',
    badge: 'A',
    short: 'OpenAI Astra system card',
    title: 'GPT-6 Astra System Card',
    by: 'OpenAI',
    date: '2026-09-03',
    url: 'https://deploymentsafety.openai.com/gpt-6-astra',
    kind: 'affected-party',
    note: 'OpenAI’s own safety report for the model it released on September 3, after the reports, updated through September 29. It refers back to the incident. Not an account of the incident: the film uses it only for what it ends on.',
  },
  fortune: {
    id: 'fortune',
    badge: 'F',
    short: 'Fortune',
    title: 'AI’s biggest players promise to police themselves at the White House',
    by: 'Fortune',
    date: '2026-10-01',
    url: 'https://fortune.com/2026/10/01/trump-ai-regulation-luncheon-huang-amodei-pichai-brockman-zuckerberg-musk-joint-committment-frontier-responsibilities/',
    kind: 'independent',
    note: 'A news report of the September 29 White House lunch and the voluntary commitment signed there. Not an account of the incident: the film uses it only for one fact at its end.',
  },
};

/**
 * For readers who want the story told by others. These are commentary, not sources for any fact on the page. Each title is
 * as YouTube gives it (checked 2026-10-07); the Black Hat speakers introduce themselves as two OpenAI staff members.
 */
export const FURTHER = [
  { title: 'The OpenAI/Hugging Face attack, clearly explained', by: 'Dwarkesh Patel', kind: 'Video, 24 minutes', url: 'https://www.youtube.com/watch?v=u15N3l4RT80' },
  { title: 'Ajeya Cotra – “This might be the clearest warning shot we ever get”', by: 'Dwarkesh Patel interviews one of the METR report’s authors', kind: 'Interview, 2 h 20', url: 'https://www.youtube.com/watch?v=X50zezLFWWI' },
  { title: 'The ‘Breaking’ News: The OpenAI–Hugging Face Incident', by: 'Two OpenAI staff, at Black Hat USA 2026', kind: 'Conference talk, 37 minutes', url: 'https://www.youtube.com/watch?v=87DyyMV0kCY' },
  { title: 'Misalignment reports and notices', by: 'OpenAI', kind: 'Index of earlier and later incidents', url: 'https://alignment.openai.com/misalignment-reports/' },
];

export const SOURCE_LIST = Object.values(SOURCES);
