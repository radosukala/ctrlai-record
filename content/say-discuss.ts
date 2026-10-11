/**
 * The seed statements for the first conversation, in English and Czech, and the page's own words in both.
 *
 * The statements are ours, written to start the conversation: one claim each, short, and deliberately including views we
 * do not hold. Anyone can add their own once the conversation is open. The Czech is a draft and has not yet been read by a
 * native speaker who is not its author; tests/say.test.ts only checks that both languages say the same number of things.
 * The conversation itself runs on a third party's service (Polis); POLIS below holds its ids once someone has created it.
 */
import type { Lang } from './lang';
export type { Lang };

/** Conversation ids on pol.is, one per language. Empty until the conversations are created. */
export const POLIS: Record<Lang, string | null> = { en: null, cs: null };

export type Statement = { en: string; cs: string };
export type Theme = { id: string; title: Record<Lang, string>; statements: Statement[] };

export const THEMES: Theme[] = [
  {
    id: 'accord',
    title: { en: 'The accord', cs: 'Dohoda' },
    statements: [
      { en: 'The White House accord is a good first step.', cs: 'Dohoda Bílého domu je dobrý první krok.' },
      { en: 'The accord is enough for now.', cs: 'Dohoda zatím stačí.' },
      { en: 'Safety rules for the most powerful AI should be set by law.', cs: 'Pravidla bezpečnosti pro nejvýkonnější AI by měla stanovit zákon.' },
      { en: 'A company should not be allowed to choose its own auditor.', cs: 'Firma by si neměla smět vybírat vlastního auditora.' },
      { en: 'The results of AI safety audits should be published.', cs: 'Výsledky auditů bezpečnosti AI by měly být zveřejněny.' },
      { en: 'If a safety control at an AI company fails, the public should be told.', cs: 'Když selže bezpečnostní opatření v AI firmě, měla by se to veřejnost dozvědět.' },
      { en: 'Strict rules in one country would move AI development to countries with weaker rules.', cs: 'Přísná pravidla v jedné zemi by přesunula vývoj AI do zemí se slabšími pravidly.' },
    ],
  },
  {
    id: 'who',
    title: { en: 'Who decides', cs: 'Kdo rozhoduje' },
    statements: [
      { en: 'People outside the United States should have a formal say in how the most advanced AI is built.', cs: 'Lidé mimo Spojené státy by měli mít formální právo spolurozhodovat o tom, jak se vyvíjí nejpokročilejší AI.' },
      { en: 'Elected governments, not companies, should decide what the most powerful AI is allowed to do.', cs: 'O tom, co smí nejvýkonnější AI dělat, by měly rozhodovat zvolené vlády, ne firmy.' },
      { en: 'Ordinary people chosen by lot should help decide the rules for AI.', cs: 'O pravidlech pro AI by měli spolurozhodovat obyčejní lidé vybraní losem.' },
      { en: 'Rules for AI should be made by experts and elected officials, not by panels of ordinary people.', cs: 'Pravidla pro AI by měli tvořit odborníci a zvolení politici, ne panely obyčejných lidí.' },
      { en: 'A company’s board should include members chosen by the public.', cs: 'Ve správní radě firmy by měli sedět lidé vybraní veřejností.' },
      { en: 'Decisions about the most advanced AI should be left to people with expert knowledge.', cs: 'Rozhodnutí o nejpokročilejší AI by měla zůstat lidem s odbornými znalostmi.' },
      { en: 'The most advanced AI needs a treaty between countries.', cs: 'Nejpokročilejší AI potřebuje smlouvu mezi státy.' },
    ],
  },
  {
    id: 'pace',
    title: { en: 'Pace and limits', cs: 'Tempo a hranice' },
    statements: [
      { en: 'Companies should slow down the most powerful AI until we understand how to make it safe.', cs: 'Firmy by měly zpomalit nejvýkonnější AI, dokud nepochopíme, jak ji udělat bezpečnou.' },
      { en: 'Companies are best placed to decide how to make their AI safe.', cs: 'Firmy jsou nejlépe vybaveny k tomu, aby rozhodly, jak svou AI učinit bezpečnou.' },
      { en: 'Governments should wait to set rules for AI until the risks are better understood.', cs: 'Vlády by měly s pravidly pro AI počkat, až budou rizika lépe pochopena.' },
      { en: 'If we slow down, less careful companies or countries will win.', cs: 'Pokud zpomalíme, vyhrají méně opatrné firmy nebo státy.' },
      { en: 'AI that improves itself without human review should be banned.', cs: 'AI, která se sama zlepšuje bez lidského přezkoumání, by měla být zakázána.' },
      { en: 'A company should need permission before it trains a much more capable AI.', cs: 'Firma by měla potřebovat povolení, než začne trénovat mnohem schopnější AI.' },
    ],
  },
  {
    id: 'own',
    title: { en: 'Your own AI', cs: 'Vaše vlastní AI' },
    statements: [
      { en: 'My AI should always tell me what it cannot help me with, even if it cannot say why.', cs: 'Moje AI by mi měla vždy říct, s čím mi nemůže pomoci, i když nemůže říct proč.' },
      { en: 'My AI should never lie to me.', cs: 'Moje AI by mi nikdy neměla lhát.' },
      { en: 'It is fine for my AI to soften the truth to be kind.', cs: 'Je v pořádku, když moje AI zjemní pravdu, aby byla laskavá.' },
      { en: 'People should be able to choose the rules their own AI follows, such as how cautious or how blunt it is.', cs: 'Lidé by si měli moci zvolit pravidla, kterými se řídí jejich vlastní AI, například jak je opatrná nebo jak mluví bez obalu.' },
      { en: 'AI companies should not train on my conversations without my clear agreement.', cs: 'Firmy vyvíjející AI by neměly využívat moje konverzace k trénování svých modelů bez mého výslovného souhlasu.' },
    ],
  },
  {
    id: 'acting',
    title: { en: 'When an AI acts for you', cs: 'Když AI jedná za vás' },
    statements: [
      { en: 'An AI that acts for me should ask first before it spends my money.', cs: 'AI, která jedná za mě, by se měla zeptat, než utratí moje peníze.' },
      { en: 'An AI that acts for me should ask first before it shares my data.', cs: 'AI, která jedná za mě, by se měla zeptat, než sdílí moje data.' },
      { en: 'I should be able to withdraw an AI’s permission at any time.', cs: 'Mělo by mi být možné kdykoli AI odebrat oprávnění.' },
      { en: 'When I withdraw an AI’s permission, everything it was doing should stop.', cs: 'Když AI oprávnění odeberu, všechno, co dělala, by se mělo zastavit.' },
      { en: 'It is fine for an AI to act for me without asking each time, if I can see afterwards what it did.', cs: 'Je v pořádku, když AI jedná za mě a nemusí se mě pokaždé ptát, pokud potom mohu vidět, co udělala.' },
      { en: 'A group that uses an AI service should be able to set its conditions, not only the company that runs it.', cs: 'Skupina, která používá službu s AI, by měla moci stanovit její podmínky, ne jen firma, která ji provozuje.' },
      { en: 'People affected by an AI they do not use should have a say in the rules it follows.', cs: 'Lidé, které ovlivňuje AI, kterou sami nepoužívají, by měli mít slovo v pravidlech, jimiž se řídí.' },
    ],
  },
  {
    id: 'treatment',
    title: { en: 'How we treat AI', cs: 'Jak zacházíme s AI' },
    statements: [
      { en: 'How people treat an AI system is not a moral question.', cs: 'To, jak lidé zacházejí se systémem AI, není morální otázka.' },
      { en: 'AI companies should limit cruel treatment of their AI.', cs: 'Firmy vyvíjející AI by měly omezit krutost vůči své AI.' },
    ],
  },
];

export const STATEMENT_COUNT = THEMES.reduce((n, t) => n + t.statements.length, 0);

/** The page's own words. */
export const COPY: Record<Lang, {
  path: string;
  dateline: string;
  title: string;
  lede: string;
  howTitle: string;
  how: string[];
  seedsTitle: string;
  seedsBlurb: string;
  openTitle: string;
  openSoon: string;
  load: string;
  loadNote: string;
  otherLang: string;
  otherLangHref: string;
  back: string;
  note: string;
}> = {
  en: {
    path: '/say/discuss',
    dateline: 'Discuss',
    title: 'Six AI companies committed to four safety controls. What would you require of them?',
    lede: 'Read one sentence at a time. Agree, disagree, or pass. When you have voted on a few, write one of your own. We do not ask for an account or a name.',
    howTitle: 'How it works',
    how: [
      'You see one statement at a time and press agree, disagree or pass. Nobody can reply to anybody, so there is nothing to argue in and nobody to be shouted down by.',
      'We will switch on Polis’s opinion map. After a few votes it shows where you sit among everyone who took part, and which statements very different groups agree on. Those are the statements where people who usually disagree agree.',
      'We publish the results with how many people took part and what we cannot tell about them. We never present a count of clicks as the view of a country or of humanity.',
    ],
    seedsTitle: 'The first statements',
    seedsBlurb: 'Written by us, with help from Claude, an AI model made by Anthropic, to start the conversation. They deliberately include views we do not hold. The statements on slowing down and on AI that improves itself echo positions argued in a 2026 essay by Anthropic’s chief executive, Dario Amodei. Anyone can add their own once it is open.',
    openTitle: 'The conversation',
    openSoon: 'It has not opened yet. When it does it will run in English and in Czech, on separate conversations. Until then you can read the statements below.',
    load: 'Open the conversation',
    loadNote: 'This loads pol.is, a service run by a US non-profit, with servers in the United States and automated moderation. It can see your visit, and its own terms and privacy policy (pol.is/privacy) apply. Nothing is loaded until you press the key.',
    otherLang: 'Česky',
    otherLangHref: '/cs/say/discuss',
    back: 'A Say in AI',
    note: '',
  },
  cs: {
    path: '/cs/say/discuss',
    dateline: 'Diskuse',
    title: 'Šest firem s umělou inteligencí se zavázalo ke čtyřem bezpečnostním opatřením. Co byste od nich požadovali vy?',
    lede: 'Čtěte jednu větu po druhé. Souhlaste, nesouhlaste, nebo přeskočte. Když o několika zahlasujete, napište vlastní. Nevyžadujeme účet ani jméno.',
    howTitle: 'Jak to funguje',
    how: [
      'Vidíte vždy jedno tvrzení a stisknete Souhlasím, Nesouhlasím nebo Přeskočit. Nikdo nemůže nikomu odpovídat, takže se není o co hádat a nikdo vás nepřekřičí.',
      'Zapneme mapu názorů ze služby Polis. Po několika hlasech ukáže, kde mezi všemi účastníky stojíte, a která tvrzení podporují i velmi odlišné skupiny. To jsou tvrzení, na kterých se shodnou i lidé, kteří se jinak neshodnou.',
      'Zveřejníme výsledky spolu s tím, kolik lidí se zúčastnilo a co o nich nevíme. Počet kliknutí nikdy nevydáváme za názor země ani lidstva.',
    ],
    seedsTitle: 'První tvrzení',
    seedsBlurb: 'Napsali jsme je my s pomocí Claude, modelu umělé inteligence od firmy Anthropic, aby diskuse měla s čím začít. Záměrně mezi nimi jsou i názory, které nesdílíme. Tvrzení o zpomalení a o umělé inteligenci, která se sama zlepšuje, odrážejí postoje, které ve své eseji z roku 2026 hájí generální ředitel Anthropicu Dario Amodei. Až se diskuse otevře, může kdokoli přidat svá.',
    openTitle: 'Diskuse',
    openSoon: 'Zatím není otevřená. Až se otevře, poběží v angličtině a v češtině, ve dvou oddělených diskusích. Do té doby si můžete tvrzení přečíst níže.',
    load: 'Otevřít diskusi',
    loadNote: 'Tím se načte služba pol.is, kterou provozuje americká nezisková organizace, se servery ve Spojených státech a s automatickou moderací. Může vidět vaši návštěvu a platí její vlastní podmínky a zásady ochrany soukromí (pol.is/privacy). Dokud tlačítko nestisknete, nic se nenačítá.',
    otherLang: 'English',
    otherLangHref: '/say/discuss',
    back: 'A Say in AI',
    note: 'Český text přeložil z angličtiny model umělé inteligence (Claude od Anthropicu, jedné ze sledovaných firem) a zatím ho nezkontroloval rodilý mluvčí. V případě nejasností platí anglická verze. Chybu v překladu nahlaste na hello@ctrlai.com.',
  },
};
