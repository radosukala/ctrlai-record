import type { Lang } from '../lang';
import type { Status } from './types';

/**
 * The tracker's own words in English and Czech. The Czech was translated from the English by an AI model and has not been
 * read by a native speaker; the page says so. Quotations and evidence claims stay in the language of their sources.
 */
export type Strings = {
  path: string;
  other: { label: string; href: string; lang: Lang };
  metaTitle: string;
  metaDescription: string;
  dateline: string;
  daysAfter: (n: number) => string;
  checked: string;
  headline: [string, string];
  lede: (published: string) => string;
  fig: { days: string; news: string; tied: (others: number) => string; before: string };
  glance: { title: string; blurb: string; caption: string; one: string };
  status: Record<Status, string>;
  meaning: Record<Status, string>;
  earlier: string;
  earlierMeaning: string;
  noteLabel: string;
  openEvidence: string;
  promises: { title: string; blurb: string; plain: string; silent: string; signedBy: string; andTrump: string; originalLead: string; pdf: string; ourCopy: string; transcription: string; sha: string };
  companies: { title: string; blurb: string; signedBy: (name: string) => string; checked: string; meetingsTitle: string; meetingsMeta: string; meetingsShort: string; meetingsStatements: string; none: (name: string) => string; where: string; couldNot: string; sinceLead: string; beforeLead: string; evidence: (since: string, before: string) => string; statementsLead: (name: string) => string; sourcesNote: string; allSix: string; earlierRecord: string };
  context: { title: string; blurb: string };
  silent: { title: string; blurb: string };
  method: { title: string; paras: { lead: string; text: string }[]; changes: string; correctionsMail: string };
  cta: { title: string; text: string; button: string };
  meet: string;
  noDate: string;
  mentions: string;
  sources: (n: number) => string;
  translationNote: string;
};

const en = (n: number) => `${n} ${n === 1 ? 'source' : 'sources'}`;
const cs = (n: number) => `${n} ${n === 1 ? 'zdroj' : n >= 2 && n <= 4 ? 'zdroje' : 'zdrojů'}`;

const MONTHS_CS = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
/** "2026-10-10" → "10. října 2026"; "2026-10" → "říjen 2026". */
export function longDateCs(value: string): string {
  const [y, m, d] = value.split('-');
  if (!m) return y;
  if (!d) return `${['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'][Number(m) - 1]} ${y}`;
  return `${Number(d)}. ${MONTHS_CS[Number(m) - 1]} ${y}`;
}

export const STRINGS: Record<Lang, Strings> = {
  en: {
    path: '/accord',
    other: { label: 'Česky', href: '/cs/accord', lang: 'cs' },
    metaTitle: 'Accord tracker',
    metaDescription: 'Six companies put their names to a White House accord on advanced AI, made public on September 29, 2026. What each has shown publicly since, commitment by commitment, with every source.',
    dateline: 'Accord tracker',
    daysAfter: n => `${n} days after the accord`,
    checked: 'Checked',
    headline: ['Six companies signed a White House accord on advanced AI.', 'Here is what they have shown since.'],
    lede: published => `The accord was made public on ${published}. Google, Anthropic, Meta, OpenAI, xAI and Nvidia put their names to a short statement, alongside President Trump, committing to four safety controls for their most advanced AI. It sets no deadline, no penalty and no public reporting, so nothing in it lets the public check whether the commitments are kept. This page looks: each commitment, each company, every claim tied to a source we opened, with a link; where we could read only part, we say so.`,
    fig: { days: 'days since the accord was made public', news: 'company commitments with any public item dated since the accord', tied: others => `of those, where the company’s own words refer to the accord${others > 0 ? ` (and ${others} more where only an outside source does)` : ''}`, before: 'where we list something the company published on the same subject before the accord' },
    glance: { title: 'At a glance', blurb: 'Four commitments, six companies in alphabetical order. Every cell opens its evidence.', caption: 'What each company has shown publicly since the accord, for each of its commitments. Companies are in alphabetical order.', one: 'One record for all six companies together' },
    status: { nothing: 'Nothing new', said: 'Said', detailed: 'Detailed', confirmed: 'Confirmed', contradicted: 'Contradicted' },
    meaning: {
      nothing: 'No public statement or action since the accord that we could find.',
      said: 'The company says it does this, or will, in general terms.',
      detailed: 'The company gives specifics anyone could check: who, what, which document.',
      confirmed: 'A company statement, and a source that is not the company and is dated since the accord, confirms the same thing.',
      contradicted: 'Public evidence points the other way.',
    },
    earlier: 'Earlier record',
    earlierMeaning: 'The company published something on the same subject before the accord. It never counts toward the status, and it may fall short of what the accord asks.',
    noteLabel: 'Our note.',
    openEvidence: 'Open the evidence.',
    promises: {
      title: 'What they committed to',
      blurb: 'The accord’s own words, with our plain reading under each. The words are theirs; the reading is ours.',
      plain: 'In plain words (ours)',
      silent: 'What the text leaves open',
      signedBy: 'Signed by',
      andTrump: 'and President Donald J. Trump',
      originalLead: 'The original PDF. It carries no date; AP and CBS report that the President shared it on Truth Social on September 29:',
      pdf: 'PDF',
      ourCopy: 'our copy',
      transcription: 'Wikisource transcription',
      sha: 'SHA-1 of the PDF',
    },
    companies: {
      title: 'Company by company',
      blurb: 'What is public since September 29, what each company had already described before, and where we looked.',
      signedBy: name => `Signed by ${name}.`,
      checked: 'Checked',
      meetingsTitle: 'All six together: meet regularly',
      meetingsMeta: 'One record for the companies as a group.',
      meetingsShort: 'Meet regularly',
      meetingsStatements: 'What signers have said about working together (not counted)',
      none: name => `We found no statement by ${name} about the accord itself in the places listed below.`,
      where: 'Where we looked',
      couldNot: 'Could not open',
      sinceLead: 'Since the accord',
      beforeLead: 'Before the accord',
      evidence: (a, b) => `Evidence: ${a} since the accord, ${b} before it`,
      statementsLead: name => `What ${name}’s leaders have said at the signing or about the accord`,
      sourcesNote: '',
      allSix: 'All six together',
      earlierRecord: 'Earlier record.',
    },
    context: { title: 'Around the accord', blurb: 'What was signed alongside it, who has reacted, and what its critics and defenders say. Each item has its source. The lists of critics and defenders are examples from the sources we read, not a poll.' },
    silent: { title: 'What it doesn’t say', blurb: 'Things a reader might assume the accord contains. We checked each against its text.' },
    method: {
      title: 'How this works',
      paras: [
        { lead: 'What counts.', text: 'Only what a person can open: a company’s own page, a filing, a regulator’s statement, a news report. We open each source and save its text, in full or, for some long filings, the passages we quote, and check every quotation against that text by machine before it goes up. A claim with no source does not go up. Nothing here is estimated.' },
        { lead: 'What a status means.', text: 'It says what is public, not what is true inside a company. A company could do all four things and publish nothing, and the accord does not ask it to publish anything. “Nothing new” means we looked in the places listed under the company and found nothing dated on or after the accord’s publication. It can change the day a company posts something.' },
        { lead: 'What counts as “Said”, and what as “Contradicted”.', text: 'A statement or action about the company’s own practice counts. Remarks by a company’s leaders at the signing that repeat what the accord says, or describe what companies in general should do, are listed under the company’s statements but do not count as “Said”. A company’s own document that restates the accord and says its plans align with it does count as “Said”, and the cell says so. “Contradicted” is for public evidence about something that happened on or after the accord’s publication; things a company disclosed since then about earlier events are described in its summary and listed with their dates, but do not by themselves change the status.' },
        { lead: 'Earlier records.', text: 'Every company has something on file for each layer, though for some it is thin or only loosely related. We show it separately, so the accord is neither credited for it nor blamed for its absence. Whether an earlier record meets the accord’s wording is for the reader to judge; the accord does not define its terms.' },
        { lead: 'The same standard for everyone.', text: 'This page was built with the help of Claude, an AI model made by Anthropic, one of the six companies. Anthropic’s row follows the same rules as every other and lists its sources in full. The checks described under “What we could not do” were also made by instances of Claude, so none of them is independent of Anthropic’s model, and nobody outside the project has checked Anthropic’s row. If you read only one row to check our work, read that one.' },
        { lead: 'Reading the rows.', text: 'A long record can mean a company publishes more, not that it did more wrong, and a short one is not a good sign by itself. Look at what each company says and shows, not how much. Many of the items are routine: a company’s product announcements are counted as evidence about a layer even when they never mention the accord, and the page marks which sources do.' },
        { lead: 'What we could not do.', text: 'This first check was made on October 10 with a limited number of web searches, and the allowance ran out before some planned searches were run. Several sites refused automated requests, and we could read only some X posts without signing in. Each company’s list says what was and was not checked. “Nothing new” is therefore a statement about what we found, not proof that nothing exists. Before publication, separate instances of Claude re-opened the sources we cite where they could be opened, looked for omissions and read the prose, and we fixed what they found. No person outside the project has reviewed the page yet, and no native Czech speaker has read the Czech. Tell us what we missed.' },
        { lead: 'Corrections.', text: 'If a source is wrong, out of date or read too strongly, write to {mail}. A company that disagrees with a cell can send the public source that says otherwise. We fix it where it was made, say so with the date, and keep the earlier text visible below.' },
        { lead: 'When it changes.', text: 'By hand, when new evidence appears, not on a schedule. The date at the top is the last day we looked. The data and the checks are in {code}, under the same licenses as the rest of the site. More about us on the {about}.' },
      ],
      changes: 'Changes to this page',
      correctionsMail: 'hello@ctrlai.com',
    },
    cta: { title: 'What would you require of them?', text: 'The accord asks nothing of anyone but the companies. If you could add one requirement, what would it be, and who should check it? Read what others think, and say what you think.', button: 'Join the conversation' },
    meet: 'meet',
    noDate: 'no date stated',
    mentions: 'mentions the accord',
    sources: en,
    translationNote: '',
  },
  cs: {
    path: '/cs/accord',
    other: { label: 'English', href: '/accord', lang: 'en' },
    metaTitle: 'Sledování dohody',
    metaDescription: 'Šest firem se podepsalo pod dohodu Bílého domu o pokročilé umělé inteligenci, zveřejněnou 29. září 2026. Co od té doby veřejně ukázaly, závazek po závazku, s každým zdrojem.',
    dateline: 'Sledování dohody',
    daysAfter: n => `${n === 1 ? '1 den' : n >= 2 && n <= 4 ? `${n} dny` : `${n} dnů`} po dohodě`,
    checked: 'Zkontrolováno',
    headline: ['Šest firem podepsalo dohodu Bílého domu o pokročilé umělé inteligenci.', 'Tady je, co od té doby veřejně ukázaly.'],
    lede: published => `Dohoda byla zveřejněna dne ${published}. Google, Anthropic, Meta, OpenAI, xAI a Nvidia spolu s prezidentem Trumpem podepsaly krátké prohlášení, v němž se zavázaly ke čtyřem bezpečnostním opatřením pro svou nejpokročilejší umělou inteligenci. Prohlášení nestanoví žádný termín, žádnou sankci ani povinnost veřejně podávat zprávy, takže nic v něm neumožňuje veřejnosti zkontrolovat, zda se závazky plní. Tato stránka to zkoumá: každý závazek, každá firma, každé tvrzení s odkazem na zdroj, který jsme otevřeli; kde jsme mohli přečíst jen část, říkáme to.`,
    fig: { days: 'dnů od zveřejnění dohody', news: 'závazků firem s jakýmkoli veřejným dokladem s datem od dohody', tied: others => `z nich tam, kde dohodu zmiňují vlastní slova firmy${others > 0 ? ` (a ${others} dalších, kde ji zmiňuje jen vnější zdroj)` : ''}`, before: 'kde uvádíme něco, co firma na stejné téma zveřejnila před dohodou' },
    glance: { title: 'Na první pohled', blurb: 'Čtyři závazky, šest firem v abecedním pořadí. Každé políčko otevře své doklady.', caption: 'Co která firma od dohody veřejně ukázala, u každého ze svých závazků. Firmy jsou v abecedním pořadí.', one: 'Jeden záznam pro všech šest firem společně' },
    status: { nothing: 'Nic nového', said: 'Prohlášeno', detailed: 'Podrobně', confirmed: 'Potvrzeno', contradicted: 'V rozporu' },
    meaning: {
      nothing: 'Od dohody jsme nenašli žádné veřejné prohlášení ani krok.',
      said: 'Firma říká, že to dělá nebo že to udělá, v obecné rovině.',
      detailed: 'Firma uvádí podrobnosti, které si kdokoli může ověřit: kdo, co, který dokument.',
      confirmed: 'Firma to uvádí a potvrzuje to zdroj, který firmou není a má datum od dohody.',
      contradicted: 'Veřejné doklady ukazují opačným směrem.',
    },
    earlier: 'Dřívější záznam',
    earlierMeaning: 'Firma zveřejnila něco na stejné téma už před dohodou. Do stavu se to nikdy nepočítá a může to zaostávat za tím, co dohoda požaduje.',
    noteLabel: 'Naše poznámka.',
    openEvidence: 'Otevřít doklady.',
    promises: {
      title: 'K čemu se zavázaly',
      blurb: 'Vlastní slova dohody, pod každým náš prostý výklad. Slova jsou jejich; výklad je náš.',
      plain: 'Jednoduše řečeno (náš výklad)',
      silent: 'Co text nechává otevřené',
      signedBy: 'Podepsali',
      andTrump: 'a prezident Donald J. Trump',
      originalLead: 'Originál (PDF). Nenese datum; podle AP a CBS ho prezident 29. září sdílel na Truth Social:',
      pdf: 'PDF',
      ourCopy: 'naše kopie',
      transcription: 'přepis na Wikisource',
      sha: 'SHA-1 souboru PDF',
    },
    companies: {
      title: 'Firma po firmě',
      blurb: 'Co je veřejné od 29. září, co která firma popisovala už dříve a kde jsme hledali.',
      signedBy: name => `Podepsáno: ${name}.`,
      checked: 'Zkontrolováno',
      meetingsTitle: 'Všech šest společně: scházet se pravidelně',
      meetingsMeta: 'Jeden záznam pro firmy jako skupinu.',
      meetingsShort: 'Scházet se pravidelně',
      meetingsStatements: 'Co signatáři řekli o spolupráci (nezapočítává se)',
      none: name => `V níže uvedených místech jsme nenašli žádné prohlášení firmy ${name} o samotné dohodě.`,
      where: 'Kde jsme hledali',
      couldNot: 'Nepodařilo se otevřít',
      sinceLead: 'Od dohody',
      beforeLead: 'Před dohodou',
      evidence: (a, b) => `Doklady: ${a} od dohody, ${b} před ní`,
      statementsLead: name => `Co vedení firmy ${name} řeklo při podpisu nebo o dohodě`,
      sourcesNote: 'Dřívější záznamy, poznámky, seznamy „Kde jsme hledali“ a „Nepodařilo se otevřít“, zdroje, citace a tvrzení k nim jsou v původním jazyce (angličtině).',
      allSix: 'Všech šest společně',
      earlierRecord: 'Dřívější záznam.',
    },
    context: { title: 'Kolem dohody', blurb: 'Co bylo podepsáno spolu s ní, kdo na ni reagoval a co říkají její kritici a zastánci. Každá položka má svůj zdroj. Seznamy kritiků a zastánců jsou příklady ze zdrojů, které jsme četli, nikoli průzkum veřejného mínění.' },
    silent: { title: 'Co dohoda neříká', blurb: 'Věci, o kterých by čtenář mohl předpokládat, že v dohodě jsou. Každou jsme ověřili proti jejímu textu.' },
    method: {
      title: 'Jak to funguje',
      paras: [
        { lead: 'Co se počítá.', text: 'Jen to, co si člověk může otevřít: vlastní stránka firmy, podání regulátorovi, prohlášení úřadu, zpráva v médiích. Každý zdroj otevíráme a ukládáme jeho text, celý, nebo u některých dlouhých podání jen citované pasáže, a každou citaci před zveřejněním strojově ověřujeme proti tomuto textu. Citace přeložené do češtiny v souhrnech jsou naše překlady a strojově se neověřují; původní znění je v anglické verzi a v seznamech zdrojů. Tvrzení bez zdroje se nezveřejní. Nic zde není odhadováno.' },
        { lead: 'Co znamená stav.', text: 'Říká, co je veřejné, ne co je pravda uvnitř firmy. Firma může udělat všechny čtyři věci a nic nezveřejnit; dohoda zveřejňování nevyžaduje. „Nic nového“ znamená, že jsme hledali v místech uvedených u firmy a nenašli nic s datem od zveřejnění dohody. Může se to změnit v den, kdy firma něco zveřejní.' },
        { lead: 'Co se počítá jako „Prohlášeno“ a co jako „V rozporu“.', text: 'Počítá se prohlášení nebo krok týkající se vlastní praxe firmy. Prohlášení vedení firmy při podpisu, která jen opakují, co dohoda říká, nebo popisují, co by firmy obecně měly dělat, jsou uvedena u prohlášení firmy, ale nepočítají se jako „Prohlášeno“. Vlastní dokument firmy, který dohodu opakuje a říká, že jeho plány s ní souhlasí, se jako „Prohlášeno“ počítá a políčko to říká. „V rozporu“ je pro veřejné doklady o tom, co se stalo v den zveřejnění dohody nebo po něm; věci, které firma od té doby zveřejnila o dřívějších událostech, jsou popsány v jejím shrnutí a uvedeny s daty, ale samy o sobě stav nemění.' },
        { lead: 'Dřívější záznamy.', text: 'Každá firma má u každé vrstvy něco ve spisu, i když u některých je to skromné nebo jen volně související. Ukazujeme to zvlášť, aby se dohodě nepřipisovalo ani nevyčítalo jejich chybění. Zda dřívější záznam odpovídá znění dohody, posoudí čtenář; dohoda své pojmy nedefinuje.' },
        { lead: 'Stejný metr pro všechny.', text: 'Tato stránka vznikla s pomocí Claude, modelu umělé inteligence od firmy Anthropic, jedné ze šesti firem. Řádek Anthropicu se řídí stejnými pravidly jako ostatní a uvádí všechny zdroje. Kontroly popsané v části „Co jsme nemohli udělat“ provedly také instance Claude, takže žádná z nich není nezávislá na modelu Anthropicu a nikdo mimo projekt řádek Anthropicu nezkontroloval. Pokud si chcete ověřit naši práci jen u jednoho řádku, ověřte tento.' },
        { lead: 'Jak číst řádky.', text: 'Dlouhý záznam může znamenat, že firma zveřejňuje víc, ne že udělala víc špatného, a krátký sám o sobě není dobré znamení. Dívejte se na to, co každá firma říká a ukazuje, ne na to, kolik toho je. Mnohé položky jsou běžné: oznámení produktů se počítají jako doklad o dané vrstvě, i když dohodu nikdy nezmiňují, a stránka označuje, které zdroje ji zmiňují.' },
        { lead: 'Co jsme nemohli udělat.', text: 'Tato první kontrola vznikla 10. října s omezeným počtem webových vyhledávání a limit se vyčerpal dřív, než proběhla část plánovaných. Několik webů odmítlo automatické požadavky a příspěvky na X (dříve Twitter) jsme bez přihlášení mohli číst jen zčásti. Seznam u každé firmy říká, co bylo a co nebylo zkontrolováno. „Nic nového“ je proto tvrzení o tom, co jsme našli, ne důkaz, že nic neexistuje. Před zveřejněním samostatné instance modelu Claude znovu otevřely zdroje, které uvádíme, tam, kde to šlo, hledaly opomenutí a četly text a my jsme opravili, co našly. Stránku zatím nezkontroloval nikdo mimo projekt a český text nečetl rodilý mluvčí. Napište nám, co jsme přehlédli.' },
        { lead: 'Opravy.', text: 'Pokud je zdroj chybný, zastaralý nebo jsme z něj vyvodili víc, než říká, napište na {mail}. Firma, která s políčkem nesouhlasí, nám může poslat veřejný zdroj, který říká něco jiného. Opravíme to tam, kde chyba vznikla, uvedeme datum a dřívější znění necháme níže viditelné.' },
        { lead: 'Kdy se mění.', text: 'Ručně, když se objeví nový doklad, ne podle rozvrhu. Datum nahoře je poslední den, kdy jsme se dívali. Data a kontroly jsou ve {code}, pod stejnými licencemi jako zbytek webu. Více o nás na stránce {about}.' },
      ],
      changes: 'Změny na této stránce',
      correctionsMail: 'hello@ctrlai.com',
    },
    cta: { title: 'Co byste od nich požadovali vy?', text: 'Dohoda nic nepožaduje od nikoho kromě samotných firem. Kdybyste mohli přidat jediný požadavek, jaký by to byl a kdo by ho měl kontrolovat? Přečtěte si, co si myslí ostatní, a řekněte, co si myslíte vy.', button: 'Zapojit se do diskuse' },
    meet: 'schůzky',
    noDate: 'datum neuvedeno',
    mentions: 'zmiňuje dohodu',
    sources: cs,
    translationNote: 'Český text přeložil z angličtiny model umělé inteligence (Claude od Anthropicu, jedné ze sledovaných firem) a zatím ho nezkontroloval rodilý mluvčí. V případě nejasností platí anglická verze. Chybu v překladu nahlaste na hello@ctrlai.com.',
  },
};
