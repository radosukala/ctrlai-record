import type { Lang } from './lang';

/**
 * "A Say in AI": the working name of the effort to give people everywhere a place to read what AI companies have committed to,
 * check what they have done, say what they want, and have the result delivered to the people who can act on it.
 *
 * The name, the path and the five parts live here and nowhere else, so changing the name is a change to this file. The Czech
 * is an AI translation that no native speaker has read yet; the page says so.
 */
export const SAY = {
  name: 'A Say in AI',
  hub: '/say',
  line: 'Read what AI companies committed to. Check what they did. Say what you want.',
} as const;

export type PartState = 'live' | 'soon' | 'planned';

export type Part = { id: string; title: Record<Lang, string>; state: PartState; href: Record<Lang, string | undefined>; text: Record<Lang, string>; how: Record<Lang, string> };

export const PARTS: Part[] = [
  {
    id: 'read',
    title: { en: 'Read', cs: 'Číst' },
    state: 'live',
    href: { en: '/say/read', cs: '/say/read' },
    text: {
      en: 'What the companies committed to and published, in their own words, with the source for every line.',
      cs: 'K čemu se firmy zavázaly a co zveřejnily, jejich vlastními slovy, s odkazem na zdroj u každého řádku. Stránka je zatím jen v angličtině.',
    },
    how: {
      en: 'We start with the White House accord of September 29 and each company’s own safety documents. Our plain-words reading always sits beside their words and is marked as ours.',
      cs: 'Začínáme dohodou Bílého domu z 29. září a bezpečnostními dokumenty, které firmy samy zveřejňují. Náš prostý výklad je vždy vedle jejich slov a je označen jako náš.',
    },
  },
  {
    id: 'check',
    title: { en: 'Check', cs: 'Ověřit' },
    state: 'live',
    href: { en: '/accord', cs: '/cs/accord' },
    text: {
      en: 'What they have shown since. Commitment by commitment, company by company, dated.',
      cs: 'Co od té doby ukázaly. Závazek po závazku, firma po firmě, s daty.',
    },
    how: {
      en: 'The first tracker follows the accord’s four controls and its commitment to meet, across six companies. It records what is public, not what is true inside a company, and says where we looked.',
      cs: 'První přehled sleduje čtyři opatření dohody a její závazek scházet se, u šesti firem. Zaznamenává, co je veřejné, ne co je pravda uvnitř firmy, a uvádí, kde jsme hledali.',
    },
  },
  {
    id: 'discuss',
    title: { en: 'Discuss', cs: 'Diskutovat' },
    state: 'soon',
    href: { en: '/say/discuss', cs: '/cs/say/discuss' },
    text: {
      en: 'Short statements you agree with, disagree with or pass on. A map will show where very different people agree.',
      cs: 'Krátká tvrzení, se kterými souhlasíte, nesouhlasíte, nebo je přeskočíte. Mapa ukáže, v čem se shodnou i velmi odlišní lidé.',
    },
    how: {
      en: 'No comment threads to fight in. You vote on one sentence at a time, or write your own. It will run in Czech and English first.',
      cs: 'Žádná vlákna komentářů, ve kterých by se lidé hádali. Hlasujete o jedné větě po druhé, nebo napíšete vlastní. Poběží nejdřív v češtině a angličtině.',
    },
  },
  {
    id: 'decide',
    title: { en: 'Decide', cs: 'Rozhodnout' },
    state: 'planned',
    href: { en: undefined, cs: undefined },
    text: {
      en: 'A few questions that deserve a real verdict, for example whether AI should be allowed to train its own successors.',
      cs: 'Několik otázek, které si zaslouží skutečný verdikt, například zda by AI měla smět trénovat své vlastní nástupce.',
    },
    how: {
      en: 'First an open vote, then a panel of people chosen by lot to reflect the wider public, paid for their time. We publish both results and the gap between them.',
      cs: 'Nejprve otevřené hlasování, pak panel lidí vybraných losem tak, aby odrážel širší veřejnost; za svůj čas dostanou zaplaceno. Zveřejníme oba výsledky i rozdíl mezi nimi.',
    },
  },
  {
    id: 'deliver',
    title: { en: 'Deliver', cs: 'Doručit' },
    state: 'planned',
    href: { en: undefined, cs: undefined },
    text: {
      en: 'The results, with how many people took part and what we cannot tell about them, put in front of companies, governments and the UN.',
      cs: 'Výsledky, s údajem, kolik lidí se zúčastnilo a co o nich nevíme, předložené firmám, vládám a OSN.',
    },
    how: {
      en: 'We publish their replies, or their silence, next to what people asked for.',
      cs: 'Jejich odpovědi, nebo jejich mlčení, zveřejníme vedle toho, o co lidé žádali.',
    },
  },
];

export const HUB: Record<Lang, {
  path: string;
  other: { label: string; href: string; lang: Lang };
  metaDescription: string;
  parts: string;
  headline: [string, string];
  lede: string;
  partsTitle: string;
  partsBlurb: string;
  states: Record<PartState, string>;
  open: string;
  preview: string;
  nowTitle: string;
  nowLine: (n: number, tied: number, of: number) => string;
  nowText: string;
  nowOpen: string;
  nowAsk: string;
  rulesTitle: string;
  rulesBlurb: string;
  rules: { title: string; text: string }[];
  note: string;
}> = {
  en: {
    path: '/say',
    other: { label: 'Česky', href: '/cs/say', lang: 'cs' },
    metaDescription: `${SAY.line} A place for people everywhere to read what AI companies committed to, check what they did, discuss, and say what they want.`,
    parts: 'Read · Check · Discuss · Decide · Deliver',
    headline: ['Who gets a say in how AI is built?', 'Our view: today, very few people.'],
    lede: 'Our view: a handful of companies decide what the most powerful AI may do and how safe it has to be, and governments are joining in slowly, mostly one at a time. We know of no place where most people, in most countries, can read what the companies committed to, check whether it happened and say what they want. This is an attempt to build that place, in the open, one working part at a time.',
    partsTitle: 'Five parts',
    partsBlurb: 'One place, in the order you would use it. Two are open; the rest are marked as what they are.',
    states: { live: 'Open now', soon: 'Next to open', planned: 'Planned, not built yet' },
    open: 'Open',
    preview: 'Preview',
    nowTitle: 'Right now',
    nowLine: (n, own, of) => `Six companies made the same four commitments, and one together: to meet regularly. ${n} of ${of} commitments have something dated since the accord, and in ${own} of those the company’s own words refer to the accord.`,
    nowText: 'The accord sets no deadline, no penalty and no public reporting, so nothing in it lets the public check whether the commitments are kept. The tracker follows each commitment for each company, with every source.',
    nowOpen: 'Open the accord tracker',
    nowAsk: 'What would you require?',
    rulesTitle: 'How we hold ourselves',
    rulesBlurb: 'Aims we can be checked against. If we break one, the page that broke it will say so.',
    rules: [
      { title: 'People write the values. We don’t.', text: 'AI helps us translate and summarize, and every summary links to what people actually wrote. No model votes or speaks for anyone. The one exception is the starter statements on the discussion page, which we wrote to start the conversation and say so there.' },
      { title: 'A source for every line.', text: 'If we can’t open it, we don’t say it. Numbers come from counting, never estimating.' },
      { title: 'How many took part, and what we can’t tell.', text: 'A big count of clicks is not humanity. Every result says how many people took part, in which language, and what we cannot tell about them; where we know who was not reached, we say so.' },
      { title: 'The same standard for every company.', text: 'Including Anthropic, whose model helped build this site. If you read one row to check our work, read that one.' },
    ],
    note: '',
  },
  cs: {
    path: '/cs/say',
    other: { label: 'English', href: '/say', lang: 'en' },
    metaDescription: 'Místo, kde si lidé kdekoli na světě mohou přečíst, k čemu se firmy vyvíjející umělou inteligenci zavázaly, ověřit, co udělaly, diskutovat a říct, co chtějí.',
    parts: 'Číst · Ověřit · Diskutovat · Rozhodnout · Doručit',
    headline: ['Kdo má slovo v tom, jak se vyvíjí umělá inteligence?', 'Náš pohled: dnes velmi málo lidí.'],
    lede: 'Náš pohled: hrstka firem rozhoduje, co smí nejvýkonnější umělá inteligence dělat a jak bezpečná musí být, a vlády se pomalu přidávají, většinou jedna po druhé. Neznáme místo, kde by většina lidí ve většině zemí mohla číst, k čemu se firmy zavázaly, ověřit, zda se to stalo, a říct, co chce. Toto je pokus takové místo vybudovat, veřejně, po jedné fungující části.',
    partsTitle: 'Pět částí',
    partsBlurb: 'Jedno místo, v pořadí, v jakém byste ho použili. Dvě jsou otevřené; u ostatních je napsáno, v jakém jsou stavu.',
    states: { live: 'Otevřeno', soon: 'Otevře se jako další', planned: 'Plánováno, ještě nepostaveno' },
    open: 'Otevřít',
    preview: 'Náhled',
    nowTitle: 'Právě teď',
    nowLine: (n, own, of) => `Šest firem se zavázalo ke stejným čtyřem věcem a k jedné společně: scházet se pravidelně. ${n} z ${of} závazků má od dohody něco s datem a u ${own} z nich dohodu zmiňují vlastní slova firmy.`,
    nowText: 'Dohoda nestanoví žádný termín, žádnou sankci ani povinnost veřejně podávat zprávy, takže nic v ní neumožňuje veřejnosti zkontrolovat, zda se závazky plní. Přehled sleduje každý závazek u každé firmy, s každým zdrojem.',
    nowOpen: 'Otevřít přehled dohody',
    nowAsk: 'Co byste požadovali?',
    rulesTitle: 'Čím se řídíme',
    rulesBlurb: 'Cíle, podle kterých nás lze měřit. Pokud některý porušíme, stránka, která ho porušila, to řekne.',
    rules: [
      { title: 'Hodnoty píší lidé. My ne.', text: 'AI nám pomáhá překládat a shrnovat a každé shrnutí odkazuje na to, co lidé skutečně napsali. Žádný model nehlasuje ani nemluví za nikoho. Jedinou výjimkou jsou úvodní tvrzení na stránce diskuse, která jsme napsali, aby diskuse měla s čím začít, a říkáme to tam.' },
      { title: 'Zdroj ke každému řádku.', text: 'Pokud si to nemůžeme otevřít, neříkáme to. Čísla pocházejí z počítání, nikdy z odhadů.' },
      { title: 'Kolik lidí se zúčastnilo a co o nich nevíme.', text: 'Velký počet kliknutí není lidstvo. Každý výsledek říká, kolik lidí se zúčastnilo, v jakém jazyce a co o nich nevíme; kde víme, koho jsme neoslovili, řekneme to.' },
      { title: 'Stejný metr pro každou firmu.', text: 'Včetně Anthropicu, jehož model pomáhal tento web postavit. Pokud si chcete ověřit naši práci u jednoho řádku, ověřte ten.' },
    ],
    note: 'Český text přeložil z angličtiny model umělé inteligence (Claude od Anthropicu, jedné ze sledovaných firem) a zatím ho nezkontroloval rodilý mluvčí. V případě nejasností platí anglická verze. Chybu v překladu nahlaste na hello@ctrlai.com.',
  },
};
