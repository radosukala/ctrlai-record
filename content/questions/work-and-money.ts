import type { Question } from './types';

// Base entries the answer leans on most.
const YALE = { base: 'budget-lab-2026-05-07-ai-labor-market-effects' };
const DENMARK = { base: 'nber-2026-03-ai-chatbots-denmark-earnings-hours' };
const CENSUS_FIRMS = { base: 'census-2026-04-microstructure-ai-diffusion-firms-tasks' };
const ONS = { base: 'ons-2026-07-20-ai-in-uk-businesses' };
const STANFORD = { base: 'stanford-2026-08-canaries-coal-mine-ai-employment' };
const CENSUS_YOUNG = { base: 'census-2026-04-ai-early-career-hiring-qwi' };
const NYFED = { base: 'new-york-fed-2026-06-01-remote-work-young-graduates' };
const OECD = { base: 'oecd-2026-07-07-employment-outlook-2026-young-graduates' };
const SUPPORT = { base: 'arxiv-2024-11-06-generative-ai-at-work-support-agents' };
const METR = { base: 'arxiv-2025-07-25-ai-slowed-experienced-open-source-developers' };
const JAGGED = { base: 'organization-science-2026-03-jagged-frontier-ai-experiment' };
const CHALLENGER = { base: 'challenger-2026-10-01-september-job-cuts-ai-cited' };
const BLS = { base: 'bls-2026-08-27-employment-projections-2025-2035' };
const CHICAGO = { base: 'chicago-fed-2026-03-forecasting-economic-effects-ai' };
const ILO = { base: 'ilo-2025-05-20-genai-jobs-refined-exposure-index' };
const WORLDBANK = { base: 'world-bank-2026-08-04-wdr-2026-promise-of-ai' };
const PEW = { base: 'pew-2026-08-18-young-adults-wary-ai-jobs' };
const CASH = { base: 'nber-2026-08-guaranteed-income-employment-effects' };
const STL = { base: 'st-louis-fed-2026-01-12-tracking-ai-contribution-gdp-growth' };
const IMF_GFSR = { base: 'imf-2026-10-13-global-financial-stability-report' };
const IMF_SKILLS = { base: 'imf-2026-01-14-bridging-skill-gaps-ai-age' };
const ANTHROPIC_INDEX = { base: 'anthropic-2026-03-24-economic-index-learning-curves' };
const SIXTY = { base: 'cbs-60-minutes-2026-10-05-humans-teaching-ai-jobs' };
const GATES_CNN = { base: 'cnn-2026-10-12-gates-tapper-most-dangerous-technology' };
const GATES_ESSAY = { base: 'gates-notes-2026-08-26-turbulent-ai-era-critical-choices' };
const HR10044 = { base: 'us-house-2026-08-06-ai-tax-work-protection-act' };
const KLEIN = { base: 'ezra-klein-2026-10-11-ai-make-work-worse' };
const LOVELY = { base: 'fli-2026-10-13-lovely-race-to-replace-us' };

export const WORK_AND_MONEY: Question = {
  id: 'work-and-money',
  question: 'What happens to work, income and the economy as AI spreads?',
  version: 1,
  asOf: '2026-10-14',
  published: true,
  answer:
    'So far, AI has not shown up as a broad loss of jobs in the data. The largest studies of US employment and pay and of Danish earnings and hours find no clear effect on the economy as a whole, ' +
    'and few firms that use AI report cutting staff. The clearest exception is young people starting careers in the jobs most exposed to AI: a payroll study finds their employment 19% below where it would be had it kept pace with less exposed jobs, ' +
    'and a Census Bureau study finds hiring fell after ChatGPT’s release. Whether AI is the cause is disputed: the New York Fed attributes most of the rise in young graduates’ unemployment to remote work, and the OECD judges AI unlikely to be the main factor. ' +
    'None of the studies we have read can separate AI’s effect from other changes, and pay, hours and job quality are barely measured. Informed people disagree about how far and how fast this will go, and about what governments should do.',
  established: [
    {
      id: 'employment-overall',
      text: 'The Yale Budget Lab’s May 2026 update finds no statistically or economically significant effect of AI exposure on US occupational employment or real hourly wages. The Stanford payroll study, which finds a problem for young workers, also reports no widespread job displacement.',
      cites: [YALE, STANFORD],
    },
    {
      id: 'denmark',
      text: 'In Denmark, where about 43% of employers encourage chatbot use, a study of employers and workers finds earnings and hours centered on zero, ruling out average effects larger than about 2%.',
      cites: [DENMARK],
    },
    {
      id: 'firms',
      text: 'Few firms that use AI report cutting staff: 2.0% of AI-using US firms report a decrease in headcount from AI (Census Bureau), and among UK businesses using AI to improve operations, 6% report a lower headcount, 1% a higher one and 63% no change (Office for National Statistics).',
      cites: [CENSUS_FIRMS, ONS],
    },
    {
      id: 'young-workers',
      text: 'Employment of 22–25-year-olds in the most AI-exposed occupations is 19% below where it would be had it kept pace with less exposed jobs, with no comparable gap for experienced workers (Stanford, August 2026). Hires of 22–24-year-olds in the most exposed industry-state groups fell about 9% right after ChatGPT’s release and had not recovered (Census Bureau, April 2026).',
      cites: [STANFORD, CENSUS_YOUNG],
    },
    {
      id: 'productivity',
      text: 'Gains from AI at work are real for some tasks and workers, and absent for others. In one customer-support firm, AI raised issues resolved per hour by 15% on average, and about 30% for less experienced agents, with minimal effect for the most experienced. In a trial with experienced open-source developers, allowing AI increased completion time by 19%. In a consulting experiment, AI users finished tasks inside AI’s reach faster, and were 19% less likely to produce a correct answer on one task outside it.',
      cites: [SUPPORT, METR, JAGGED],
    },
    {
      id: 'adoption',
      text: 'AI use is spreading unevenly. About 35% of UK businesses with 10 or more employees report using AI in June 2026, up from about 12% in September 2023 (ONS). In the US, 18% of firms use it in a business function, and 32% weighted by employment (Census Bureau). Over 70% of consumer ChatGPT messages in June 2025 were not about work, according to OpenAI’s own data.',
      cites: [ONS, CENSUS_FIRMS, { base: 'nber-2025-09-how-people-use-chatgpt' }],
    },
    {
      id: 'announced-cuts',
      text: 'Employers’ announced job cuts that cite AI came to 120,136 in January–September 2026, about 21% of all announced cuts and the most-cited reason, even as total announced cuts fell 39% from a year earlier (Challenger, Gray & Christmas, a private outplacement firm counting employers’ stated reasons).',
      cites: [CHALLENGER],
    },
    {
      id: 'exposure',
      text: 'About 24% of global employment is in an occupation with some exposure to generative AI, 3.3% in the highest group, and 34% in high-income countries against 11% in low-income ones (International Labour Organization). The World Bank scores about 14.2% of jobs in high-income countries as amenable to automation by generative AI, against 4.5% in low- and middle-income ones.',
      cites: [ILO, WORLDBANK],
    },
    {
      id: 'projections',
      text: 'The US Bureau of Labor Statistics projects total employment to grow 3.5% from 2025 to 2035. Office and administrative support is projected to fall the most of any major group, by 4.0% or 752,100 jobs, partly as automation tools including AI reduce demand.',
      cites: [BLS],
    },
    {
      id: 'public-view',
      text: '71% of US adults expect AI to lead to fewer jobs over the next 20 years, up from 64% in 2024, and 55% of adults under 30 say they are more concerned than excited about AI in daily life, a majority for the first time (Pew Research Center).',
      cites: [PEW],
    },
    {
      id: 'cash',
      text: 'On income support, one large experiment gave low-income adults $1,000 a month for three years: employment fell 4.2 percentage points and hours worked by one to two a week, with no change in job quality. It is not about AI or displaced workers.',
      cites: [CASH],
    },
    {
      id: 'growth-finance',
      text: 'AI-related investment supplied about 39% of US economic growth in the first three quarters of 2025 (36% without data centers), against 28% at the dot-com peak in 2000 (St. Louis Fed). The IMF names a correction in AI-related asset prices as one of three salient risks to financial stability, and a risk scenario, not a forecast.',
      cites: [STL, IMF_GFSR],
    },
  ],
  limits: [
    {
      id: 'no-causal',
      text: 'Every employment study compares more and less AI-exposed groups, or tests timing. None can separate AI from other changes such as remote work, interest rates and slower hiring after the pandemic. The authors of the Stanford and Census papers say theirs are early, descriptive indicators, not causal estimates.',
      cites: [STANFORD, CENSUS_YOUNG, YALE],
    },
    {
      id: 'no-official-count',
      text: 'No official statistic counts jobs lost or created by AI. The only running tally of AI-attributed layoffs is a private firm’s count of the reasons employers give in announcements, which are not measured causes.',
      cites: [CHALLENGER],
    },
    {
      id: 'exposure-not-impact',
      text: 'Exposure scores, from the ILO, the World Bank and the BLS, rate tasks that AI could do, not jobs lost. The ILO calls its estimates an upper threshold that leaves out new jobs.',
      cites: [ILO, WORLDBANK, BLS],
    },
    {
      id: 'firm-reports',
      text: 'What firms report about headcount is their own answer in a survey, and many say the effect is uncertain. Usage data from AI companies describe their own users: Anthropic’s covers one week of Claude users, and OpenAI’s covers consumer plans only.',
      cites: [ONS, CENSUS_FIRMS, ANTHROPIC_INDEX],
    },
    {
      id: 'forecasts',
      text: 'Forecasts are not measurements. A survey of economists, superforecasters, AI experts and the public finds every group expecting growth near recent trends to 2030, but widely different outcomes if AI progress is rapid.',
      cites: [CHICAGO],
    },
  ],
  disagreements: [
    {
      id: 'entry-level',
      point: 'Is the weak hiring of young workers in AI-exposed jobs caused by AI?',
      kind: 'fact',
      scope: 'Whether AI explains the weaker hiring and employment of workers aged about 22–25 since 2022. Not whether AI will have that effect in future, and not what should be done about it.',
      sides: [
        { view: 'The drop is concentrated in occupations where AI substitutes for human tasks and shows up in hiring, not firing, which is consistent with an AI effect; the authors stress these are early, descriptive indicators, not causal estimates.', who: 'Erik Brynjolfsson and co-authors, Stanford', cites: [STANFORD] },
        { view: 'Hires of the youngest workers fell sharply and persistently in the most exposed groups after ChatGPT arrived, but trends were already shifting around the start of COVID, so the author urges caution in attributing all of it to AI.', who: 'Lee C. Tucker, US Census Bureau', cites: [CENSUS_YOUNG] },
        { view: 'The rise in young graduates’ unemployment predates the spread of generative AI, and remote work, not AI, explains most of it, though AI may matter more later.', who: 'Natalia Emanuel and colleagues, New York Fed', cites: [NYFED] },
        { view: 'The graduate unemployment gap has widened since before the pandemic in every country studied, with no turn when firms began using language models, so they are unlikely to be the main factor.', who: 'OECD', cites: [OECD] },
      ],
      dependsOn: 'Whether the weakening of young workers’ hiring that began before ChatGPT is a separate trend, and better data on when and where firms adopted AI.',
    },
    {
      id: 'scale',
      point: 'Over the coming years, will AI displace more work than it creates?',
      kind: 'fact',
      scope: 'The expected net effect of AI on the number and quality of jobs over the next decade or so. This is a forecast, so nothing here can yet settle it. It is separate from the question of what governments should do.',
      sides: [
        { view: 'AI is changing human work, not ending it: some repetitive tasks go, and there are many other things people can do.', who: 'Brendan Foody, chief executive of Mercor, which pays experts to train AI, on 60 Minutes', cites: [SIXTY] },
        { view: 'Many people could lose their jobs, starting at entry level, where the work is preparing information and analysis for others.', who: 'Clara Shih, on 60 Minutes', cites: [SIXTY] },
        { view: 'Those employed to train AI are few compared with the many whose work it replaces, which is the whole point of automation, though the future is subject to choice and agency.', who: 'Daron Acemoglu, economist, on 60 Minutes', cites: [SIXTY] },
        { view: 'Many jobs, especially entry and mid-level ones, will disappear for good.', who: 'Bill Gates, in an essay (as the description of it says)', cites: [GATES_ESSAY] },
        { view: 'The industry is trying to build machines that replace human labor, which would strip people of economic and political power.', who: 'Garrison Lovely, journalist, on the Future of Life Institute podcast', cites: [LOVELY] },
        { view: 'Official projections see total US employment still growing to 2035, with office and administrative support shrinking most. Surveyed economists, AI experts and the public all expect growth near recent trends to 2030 unless AI progress is rapid, when forecasts diverge widely.', who: 'US Bureau of Labor Statistics; Chicago Fed and the Forecasting Research Institute', cites: [BLS, CHICAGO] },
        { view: 'The bigger story is job quality, which is under-studied: AI is turning knowledge workers into managers of AI agents, answerable for their mistakes without the pay or status of managers. Agents could be designed differently.', who: 'Arvind Narayanan, Princeton', cites: [KLEIN] },
      ],
      dependsOn: 'How fast AI systems become reliable enough to do whole jobs, how firms use them (to augment or to replace), and whether new work appears as fast as old work goes.',
    },
    {
      id: 'what-to-do',
      point: 'What should governments do to share gains and protect workers?',
      kind: 'policy',
      scope: 'Taxes on AI, jobs reserved for people, cash support, and retraining. Views on whether disruption will come are a separate question.',
      sides: [
        { view: 'Tax AI tokens and robots to fund retraining and a stronger safety net, and set aside a “Human Reserved” domain of roles for people only. Society will decide, politically, which things only humans should be allowed to do.', who: 'Bill Gates (the essay as described, and the CNN interview)', cites: [GATES_ESSAY, GATES_CNN] },
        { view: 'Tax the makers and sellers of large AI models, with rates that rise as unemployment passes 5%, to fund a new Labor Department agency that awards grants for jobs people carry out.', who: 'Representative Greg Casar and two co-sponsors (H.R. 10044, a proposal)', cites: [HR10044] },
        { view: 'Treat the future as a matter of choice: it is all the more important to discuss what can be done.', who: 'Daron Acemoglu, economist', cites: [SIXTY] },
        { view: 'Stop trying to build AI that replaces human labor, and ban certain developments; build a movement strong enough to make presidents act.', who: 'Garrison Lovely, journalist', cites: [LOVELY] },
        { view: 'New skills, AI skills among them, go with higher wage offers, but so far they have not raised overall employment, and the gains reach high- and low-skilled workers more than the middle, so helping workers gain skills matters and does not by itself protect the middle.', who: 'International Monetary Fund staff, in a staff note', cites: [IMF_SKILLS] },
      ],
      dependsOn: 'How much displacement actually comes, who gets the gains, and what cash and reserved-job policies do to work, which the one large income experiment found reduces it a little among low-income adults.',
    },
  ],
  changed: {
    since: '2026-10-05',
    items: [
      { id: 'c-imf', kind: 'evidence', text: 'The IMF’s October 13 stability report names a correction in AI-related asset prices as one of three salient risks, worsened by leverage, concentrated exposures and circular financing.', cites: [IMF_GFSR] },
      { id: 'c-sixty', kind: 'evidence', text: 'On 60 Minutes (October 4), experts paid to train AI describe teaching it their jobs; an AI-training company says work is evolving, while an economist and another guest warn of large job losses.', cites: [SIXTY] },
      { id: 'c-gates', kind: 'argument', text: 'New arguments, not new evidence: Bill Gates says society must decide how to tax AI and robots and which jobs to keep for humans (October 11); Garrison Lovely argues the industry aims to replace human labor (October 13); Arvind Narayanan argues job quality is the neglected question (October 9–11).', cites: [GATES_CNN, LOVELY, KLEIN] },
      { id: 'c-uk', kind: 'decision', text: 'The UK government’s Pro-Worker AI Adoption Prize recognizes organizations that use AI in ways that benefit workers (October 8, from the page’s excerpt).', cites: [{ base: 'uk-dsit-2026-10-08-pro-worker-ai-adoption-prize' }] },
    ],
  },
  decisions: [
    {
      id: 'd-hr10044',
      what: 'Whether the US Congress taxes AI to fund jobs: H.R. 10044, the AI Tax and Work Protection Act, would tax makers and sellers of large AI models and fund a new Labor Department agency that awards grants for jobs.',
      who: 'The US Congress',
      status: 'Introduced on August 6, 2026 by Representative Greg Casar with two co-sponsors, as we read the bill text. A proposal, not law.',
      cites: [HR10044],
    },
  ],
  unknowns: [
    { id: 'u-causal', text: 'AI’s causal effect on jobs. Nothing we have read isolates it from remote work, interest rates and other changes.', cites: [STANFORD, YALE] },
    { id: 'u-count', text: 'How many jobs AI is actually costing or creating. No official count exists, and announced reasons are not measured causes.', cites: [CHALLENGER] },
    { id: 'u-pay', text: 'What AI does to pay, hours and job quality outside Denmark. The one large administrative test of pay and hours is Danish, and none we found covers the US or UK.', cites: [DENMARK] },
    { id: 'u-labor-share', text: 'Whether AI is shifting income from workers to owners of capital. No source we read shows a measured shift in the labor share.', cites: [] },
    { id: 'u-ladder', text: 'Whether thin entry-level hiring thins the later supply of experienced workers. Stanford raises it only as a possibility.', cites: [STANFORD] },
    { id: 'u-developing', text: 'What AI means for jobs in low- and middle-income countries, where the World Bank relies on exposure scores and job postings from a few countries.', cites: [WORLDBANK] },
    { id: 'u-agents', text: 'What happens if AI agents become able to do whole jobs. BLS says its method assumes technology and productivity in line with history, and METR could not measure 2026 developer speed-ups reliably.', cites: [BLS, METR] },
    { id: 'u-growth', text: 'How much growth depends on AI investment and whether it lasts. The St. Louis Fed uses broad investment categories as stand-ins, and the IMF’s correction is a scenario, not an observation.', cites: [STL, IMF_GFSR] },
  ],
  wouldChange: [
    { id: 'w-displacement', text: 'Toward “AI is displacing workers”: a study that isolates AI’s effect and finds job losses; official statistics that count AI-attributed job changes; young workers’ hiring staying weak while the pandemic-era trends fade; or pay and hours falling where AI is adopted, as they have not in Denmark.', cites: [] },
    { id: 'w-not-ai', text: 'Toward “AI is not the main cause”: young workers’ hiring recovering while AI adoption keeps rising; or firm surveys continuing to show few headcount cuts as use spreads.', cites: [] },
    { id: 'w-agents', text: 'Toward faster change: evidence that AI agents are doing whole roles reliably in firms, in the data on hiring, rather than in demonstrations.', cites: [] },
  ],
  values: [
    { id: 'v-share', text: 'If AI raises output but displaces some workers, how should the gains be shared: through taxes on AI or its use, retraining, cash payments, or not at all?', cites: [GATES_ESSAY, HR10044] },
    { id: 'v-reserve', text: 'Should some work be reserved for humans, even where machines could do it more cheaply?', cites: [GATES_CNN] },
    { id: 'v-ladder', text: 'If entry-level jobs thin out, who should bear the cost: young workers, employers, or society?', cites: [STANFORD] },
  ],
  revisions: [
    { version: 1, date: '2026-10-14', note: 'First version, from a research pass of 25 primary sources (studies, official statistics and reports on jobs, pay, productivity, adoption and income policy), the Base’s entries of October 5–13, and the same rules as the first answered question: facts, views and values kept apart, and views on different questions never set against each other. Evidence that cuts both ways is shown both ways.' },
  ],
};
