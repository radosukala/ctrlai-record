import type { Commitment, CompanyId } from './types';

/**
 * The accord itself: what it says, who signed it, and where the original lives. Everything here is the document's own
 * wording or a fact about the document. What companies have shown since is in ./companies.ts.
 *
 * The text below was read from the PDF of the accord (an image-only scan, so there is no text layer to copy)
 * and compared word for word with the Wikisource transcription, which matches. It is a work of the US federal government
 * and in the public domain. The SHA-256 of PARAGRAPHS joined with blank lines is pinned in tests/accord.test.ts.
 */
export const ACCORD = {
  title: 'White House Accord on Super Intelligence',
  subtitle: 'Joint Commitment on Frontier Responsibilities',
  /** The day it became public: AP and CBS report the President shared it on Truth Social that day, and the PDF's server timestamp is that evening. The document itself carries no date. */
  published: '2026-09-29',
  original: {
    /** The PDF (the file host is recorded by Wikimedia Commons as uploaded from the White House; the whitehouse.gov pages we read do not link to it). */
    url: 'https://d3i6fh83elv35t.cloudfront.net/static/2026/09/accord.pdf',
    sha1: 'd320fc69d2631e3bc8bff166af1df80f0a2a7099',
    bytes: 108470,
    pages: 2,
    retrieved: '2026-10-10',
    /** Our copy, in case the original moves. */
    archived: '/accord/white-house-accord-2026-09-29.pdf',
    transcription: 'https://en.wikisource.org/wiki/White_House_Accord_on_Super_Intelligence',
  },
} as const;

/** The accord's text, paragraph by paragraph, exactly as printed. */
export const PARAGRAPHS: string[] = [
  'White House Accord on Super Intelligence',
  'Joint Commitment on Frontier Responsibilities',
  'In order to build a positive future for the American people and the world, we believe every company is responsible for developing its own technology safely and in a way that builds trust with customers and the public.',
  'This starts with every company that is training and deploying frontier models having robust internal processes and controls to ensure that their technology behaves as intended and that any issues are promptly identified and resolved. Therefore, in addition to any other precautions, we believe each company should implement the following four layers of controls and audits:',
  '(1) Implement robust internal controls to monitor the capabilities and alignment of its models during training and deployment around areas like cybersecurity, biosecurity, and chemical threats, and to ensure that its models do not hack or access technical systems in unintended ways.',
  '(2) Empower an internal team to ensure all of the controls, monitoring, and detection are operating as intended, and that any issues are remediated.',
  '(3) Partner with an independent external auditor or evaluator to carry out independent assessments of whether the controls, monitoring, and detection are operating as intended.',
  '(4) Designate an independent committee of the board of directors to oversee and receive reports from the teams operating the controls and the internal and external auditors and evaluators, as well as to ensure any issues identified are remediated.',
  'Together, these steps will give each company, its customers, and the public confidence that the technology is operating as intended.',
  'The participating companies will meet regularly to establish standards and best practices to improve the safety of their systems.',
  'Over time, it may make sense to codify these steps into laws or regulations. Regardless of whether this is required of companies, we believe that implementing these controls and audits is critical to ensuring a safe future for everyone, and each of our companies are committed to doing this.',
];

export const FULL_TEXT = PARAGRAPHS.join('\n\n');

/**
 * The signature page, in the order it prints them. Names and company names are as printed ("XAI", and "President of the
 * Unites States" for the President's line, which we do not repeat).
 */
export const SIGNATURES: { name: string; company: string }[] = [
  { name: 'Sundar Pichai', company: 'Google' },
  { name: 'Dario Amodei', company: 'Anthropic' },
  { name: 'Mark Zuckerberg', company: 'Meta' },
  { name: 'Greg Brockman', company: 'OpenAI' },
  { name: 'Elon Musk', company: 'XAI' },
  { name: 'Jensen Huang', company: 'Nvidia' },
];

/** Alphabetical, so that no order reads as a ranking. */
export const COMPANY_ORDER: CompanyId[] = ['anthropic', 'google', 'meta', 'nvidia', 'openai', 'xai'];

export const COMPANY_NAME: Record<CompanyId, string> = {
  anthropic: 'Anthropic',
  google: 'Google',
  meta: 'Meta',
  nvidia: 'Nvidia',
  openai: 'OpenAI',
  xai: 'xAI',
};

/**
 * The five commitments. `text` is the accord's own wording without its number. `plain` is our reading and is marked as ours
 * on the page. `silent` says what the text leaves open; tests/accord.test.ts checks the wording it relies on.
 */
export const COMMITMENTS: Commitment[] = [
  {
    id: 'L1',
    number: '1',
    short: 'Internal controls',
    shortCs: 'Interní kontroly',
    text: 'Implement robust internal controls to monitor the capabilities and alignment of its models during training and deployment around areas like cybersecurity, biosecurity, and chemical threats, and to ensure that its models do not hack or access technical systems in unintended ways.',
    plain: 'Each company watches its own models, in training and in use, for dangerous abilities (the text names cyber, biological and chemical threats) and for whether they behave as intended. It also makes sure its models do not hack or get into computer systems in unintended ways.',
    silent: 'It does not say what makes a control “robust”, what a company must do if a model shows a dangerous ability, or whether any of it is published.',
    plainCs: 'Každá firma sleduje své vlastní modely, při trénování i v provozu, aby odhalila nebezpečné schopnosti (text uvádí kybernetické, biologické a chemické hrozby) a zda se chovají tak, jak bylo zamýšleno. Zároveň zajišťuje, aby její modely nehackovaly počítačové systémy ani se do nich nedostávaly nezamýšleným způsobem.',
    silentCs: 'Neříká, čím je kontrolní mechanismus „robustní“, co má firma udělat, když model projeví nebezpečnou schopnost, ani zda se z toho cokoli zveřejňuje.',
  },
  {
    id: 'L2',
    number: '2',
    short: 'Internal team',
    shortCs: 'Interní tým',
    text: 'Empower an internal team to ensure all of the controls, monitoring, and detection are operating as intended, and that any issues are remediated.',
    plain: 'A team inside the company is given the power and the job of making sure the controls, monitoring and detection work as intended, and that problems are fixed.',
    silent: 'It does not say how big the team is, who leads it, or what “empower” means in practice.',
    plainCs: 'Tým ve firmě má pravomoc i úkol zajistit, aby kontrolní mechanismy, monitorování a detekce fungovaly, jak mají, a aby se nedostatky odstranily.',
    silentCs: 'Neříká, jak velký je tým, kdo ho vede, ani co v praxi znamená „zmocnit“ (empower).',
  },
  {
    id: 'L3',
    number: '3',
    short: 'External auditor',
    shortCs: 'Externí auditor',
    text: 'Partner with an independent external auditor or evaluator to carry out independent assessments of whether the controls, monitoring, and detection are operating as intended.',
    plain: 'The company works with an outside auditor or evaluator, described as independent, that assesses whether its controls, monitoring and detection work as intended.',
    silent: 'It does not say who picks the auditor, who pays it, what makes it “independent”, or whether its findings are published.',
    plainCs: 'Firma spolupracuje s externím auditorem nebo hodnotitelem, označeným jako nezávislý, který posuzuje, zda její kontrolní mechanismy, monitorování a detekce fungují, jak mají.',
    silentCs: 'Neříká, kdo auditora vybírá, kdo ho platí, čím je „nezávislý“ ani zda se jeho zjištění zveřejňují.',
  },
  {
    id: 'L4',
    number: '4',
    short: 'Board committee',
    shortCs: 'Výbor správní rady',
    text: 'Designate an independent committee of the board of directors to oversee and receive reports from the teams operating the controls and the internal and external auditors and evaluators, as well as to ensure any issues identified are remediated.',
    plain: 'A committee of the company’s board of directors, described as independent, receives reports from the teams and the auditors and makes sure problems get fixed.',
    silent: 'It does not say who sits on the committee, what makes it “independent”, or what happens if a problem is not fixed.',
    plainCs: 'Výbor správní rady firmy, označený jako nezávislý, dostává zprávy od týmů a auditorů a dohlíží, aby se nedostatky odstranily.',
    silentCs: 'Neříká, kdo ve výboru sedí, čím je „nezávislý“ ani co se stane, když se problém nenapraví.',
  },
  {
    id: 'G',
    number: 'meet',
    short: 'Meet regularly',
    shortCs: 'Scházet se pravidelně',
    text: 'The participating companies will meet regularly to establish standards and best practices to improve the safety of their systems.',
    plain: 'The companies will meet on a regular basis to set standards and best practices for the safety of their systems.',
    silent: 'It gives no schedule, names no host, mentions no one but the companies, and does not say the standards will be published.',
    plainCs: 'Firmy se budou scházet pravidelně, aby stanovily standardy a osvědčené postupy pro bezpečnost svých systémů.',
    silentCs: 'Neuvádí žádný harmonogram, žádného pořadatele, nezmiňuje nikoho kromě firem a neříká, že se standardy zveřejní.',
  },
];

/**
 * Things a reader might assume the accord contains. Each is a claim about the text's silence, so each carries the words
 * that must NOT appear in the text for the claim to hold. tests/accord.test.ts searches FULL_TEXT for them: if the text
 * were ever corrected and one of these words showed up, the claim would fail the build instead of staying on the page.
 */
export const ABSENCES: { id: string; title: string; text: string; titleCs: string; textCs: string; absent: RegExp }[] = [
  {
    id: 'deadline',
    title: 'A deadline',
    text: 'No step has a date or a time limit. The only timing words are “promptly”, “regularly” and “over time”.',
    titleCs: 'Termín',
    textCs: 'Žádný krok nemá datum ani lhůtu. Jediná slova o čase jsou „promptly“ (neprodleně), „regularly“ (pravidelně) a „over time“ (postupem času).',
    absent: /\b\d{1,4}\b(?<!\(\d)|\b(days?|weeks?|months?|years?|deadline|within|before|until|annual|quarterly|monthly)\b/i,
  },
  {
    id: 'penalty',
    title: 'A penalty',
    text: 'It names no penalty, no regulator and no one with the power to enforce it.',
    titleCs: 'Sankce',
    textCs: 'Neuvádí žádnou sankci, žádný regulační orgán ani nikoho, kdo by měl pravomoc zajistit její dodržování.',
    absent: /\b(penalt\w*|fines?|sanction\w*|enforc\w*|regulators?|attorney|liab\w*|court|prosecut\w*)\b/i,
  },
  {
    id: 'publication',
    title: 'Public reporting',
    text: 'It does not require anyone to publish an audit result, a report or an incident. Reports go to the company’s own board committee.',
    titleCs: 'Zveřejňování zpráv',
    textCs: 'Nikomu neukládá zveřejnit výsledek auditu, zprávu ani informaci o incidentu. Zprávy chodí vlastnímu výboru správní rady firmy.',
    absent: /\b(publish\w*|disclos\w*|transparen\w*|release[sd]?|incidents?|breach\w*)\b/i,
  },
  {
    id: 'definitions',
    title: 'Definitions',
    text: 'It does not define “frontier models”, “robust” or “independent”.',
    titleCs: 'Definice',
    textCs: 'Nedefinuje „frontier models“ (nejpokročilejší modely), „robustní“ ani „nezávislý“.',
    absent: /\b(defin\w*|threshold\w*|compute|flops?|criteria|standard of independence)\b/i,
  },
  {
    id: 'outsiders',
    title: 'A role for anyone else',
    text: 'It names no other country, international body, regulator, researcher or member of the public in any role. The public and customers appear only as people whose confidence the steps should earn. The only outside party with a task is the unnamed auditor or evaluator.',
    titleCs: 'Role pro kohokoli dalšího',
    textCs: 'Neuvádí žádný další stát, mezinárodní orgán, regulátora, výzkumníka ani člena veřejnosti v žádné roli. Veřejnost a zákazníci se objevují jen jako lidé, jejichž důvěru mají tyto kroky získat. Jediná vnější strana s úkolem je nepojmenovaný auditor či hodnotitel.',
    absent: /\b(international\w*|united nations|european|china|chinese|governments?|congress|legislat\w*|civil society|researchers?|academ\w*|citizens?|consult\w*)\b/i,
  },
  {
    id: 'binding',
    title: 'Legal force',
    text: 'It does not call itself legally binding. It says that putting these steps into law “may make sense” over time.',
    titleCs: 'Právní závaznost',
    textCs: 'Neoznačuje se za právně závaznou. Říká, že zakotvit tyto kroky do zákona „může dávat smysl“ (may make sense) postupem času.',
    absent: /\b(legally|binding|obligat\w*|contract\w*|statute)\b/i,
  },
];

/** The date a company-level update must be on or after to count as "since". */
export const SINCE = ACCORD.published;
