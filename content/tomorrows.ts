/**
 * Other Tomorrows: short interactive fictions about living with AI.
 *
 * Each episode is a script. The reader turns it one line at a time. After the first ending the story rewinds to the
 * same moment, with the same machine, under a different arrangement: who owns it, who gets what it earns, who can say
 * no to it. Lines that lean on the real world carry a fact, and every fact says whether it has happened yet.
 *
 * Fiction is labeled as fiction. Facts follow the same rules as the library: open the source, say it in your own
 * words, and date the check. When reality catches up with a line, change its fact to `real` and say when.
 */

export type Tone = 'day' | 'night' | 'phone' | 'dusk';
export type LineStyle = 'big' | 'said' | 'quiet' | 'meta' | 'kicker' | 'title' | 'log';

export interface Line {
  text: string;
  style?: LineStyle;
  /** The story's clock when this line appears, as HH:MM. */
  at?: string;
  /** Id of a fact in the episode's `facts`. */
  fact?: string;
}

export interface Screen {
  tone: Tone;
  lines: Line[];
  /** Label for the button that ends the screen. Without one, the reader just continues. */
  next?: string;
  /** Show every line at once (title cards) instead of one at a time. */
  reveal?: 'all';
  /** Lines shown inside a phone message or a machine's decision log. */
  card?: 'phone' | 'log';
  /** Cards: who wrote it, and when. */
  from?: string;
  at?: string;
}

export interface Branch {
  id: string;
  label: string;
  screens: Screen[];
}

export interface Arrangement {
  id: string;
  /** Answers "Who owns the machine?" */
  owner: string;
  /** First line of a replay under this arrangement. */
  rewind: string;
  message: Screen;
  after: Screen[];
  branches: [Branch, Branch];
  closing: Screen[];
}

/** `real`: it has happened, with a source. `not-yet`: it hasn't, and the source shows how close it is. `imagined`: invented. */
export type FactStatus = 'real' | 'not-yet' | 'imagined';

export interface Source {
  title: string;
  publisher: string;
  date: string;
  url: string;
}

export interface Fact {
  id: string;
  status: FactStatus;
  /** The story's claim, in a few words. */
  claim: string;
  /** What is actually true, in plain words. */
  text: string;
  sources: Source[];
  /** For `real` facts that started as fiction: when reality caught up. */
  since?: string;
}

export interface Episode {
  slug: string;
  number: number;
  title: string;
  /** The first line, used on share cards. */
  hook: string;
  description: string;
  minutes: number;
  /** The story clock at the start of every reading, and the day it shows. */
  start: string;
  day: string;
  /** Share cards: what the reader gets to change, e.g. "then try the other Monday". */
  rewindNote: string;
  opening: Screen[];
  prologue: Screen[];
  replay: Screen;
  arrangements: Arrangement[];
  picker: { lead: string; question: string; end: string };
  finale: Screen[];
  facts: Fact[];
  unknowns: string[];
  share: string;
  checked: string;
}

export const SERIES = {
  title: 'Other Tomorrows',
  lede: 'Five-minute stories about living with AI. Each one plays a moment, then rewinds it and changes one thing: who owns the machine, or what it cares about.',
  description: 'Five-minute stories about living with AI. Play a morning, rewind it, and change who’s in control. Fiction, with the facts at the end.',
};

const line = (text: string, extra: Omit<Line, 'text'> = {}): Line => ({ text, ...extra });
const big = (text: string, extra: Omit<Line, 'text' | 'style'> = {}): Line => ({ text, style: 'big', ...extra });
const said = (text: string, extra: Omit<Line, 'text' | 'style'> = {}): Line => ({ text, style: 'said', ...extra });
const quiet = (text: string, extra: Omit<Line, 'text' | 'style'> = {}): Line => ({ text, style: 'quiet', ...extra });
const meta = (text: string): Line => ({ text, style: 'meta' });
const log = (text: string): Line => ({ text, style: 'log' });

const firstFreeMonday: Episode = {
  slug: 'first-free-monday',
  number: 1,
  title: 'The first free Monday',
  hook: 'At 8:41 on a Monday morning, your replacement finishes your week.',
  description: 'A five-minute interactive story about who owns the machines that finish our work.',
  minutes: 5,
  start: '08:41',
  day: 'Mon',
  rewindNote: 'then try the other Monday',

  opening: [
    { tone: 'day', lines: [big('At 8:41 on a Monday morning, your replacement finishes your week.', { at: '08:41' })] },
    {
      tone: 'dusk',
      reveal: 'all',
      next: 'Begin',
      lines: [
        { text: 'Other Tomorrows · Episode 1', style: 'kicker' },
        { text: 'The first free Monday', style: 'title' },
        meta('Fiction · About five minutes'),
      ],
    },
  ],

  prologue: [
    {
      tone: 'day',
      lines: [
        line('Every report. Every spreadsheet. Every reply you’d been writing in your head since Thursday.', { fact: 'long-tasks' }),
        line('Even the call to the difficult client. It made the call. The client says it was the nicest conversation they’ve had all year.'),
        quiet('It’s 8:41. You haven’t finished your coffee.'),
      ],
    },
    {
      tone: 'day',
      lines: [
        line('Your daughter comes into the kitchen with a towel over her shoulder.'),
        line('It’s the last week of summer vacation. She’s nine, and she notices things.'),
        said('“Are you late?”'),
        said('“No.”'),
        said('“Are you sick?”'),
        said('“No.”'),
        said('“Then can we go to the sea?”'),
      ],
    },
    {
      tone: 'day',
      next: 'Read the message',
      lines: [
        line('You look up the trains. There’s one at 10:15. You could be in the water by evening.'),
        line('Your phone lights up.', { at: '08:42' }),
      ],
    },
  ],

  replay: {
    tone: 'day',
    next: 'Read the message',
    lines: [
      big('8:41. Your replacement finishes your week.', { at: '08:41' }),
      said('“Then can we go to the sea?”'),
      line('Your phone lights up.', { at: '08:42' }),
    ],
  },

  arrangements: [
    {
      id: 'employer',
      owner: 'Your employer',
      rewind: 'Same morning. Same machine. This time, it belongs to your employer.',
      message: {
        tone: 'phone',
        card: 'phone',
        from: 'People Team',
        at: '08:42',
        next: 'Put the phone down',
        lines: [
          line('Good morning.'),
          line('As you’ll have seen, our new assistant completed your team’s work for the week at 8:41.'),
          line('We are restructuring around it. Your role ends today. You’ll be paid through the end of the month.', { fact: 'ai-cuts' }),
          line('Thank you for eleven years.'),
          meta('Written by our assistant.'),
        ],
      },
      after: [
        {
          tone: 'day',
          lines: [
            line('You read it twice. Then you read the last line again.', { at: '08:44' }),
            line('In the doorway, your daughter is holding the towel like a flag.'),
            said('“Well?”'),
          ],
        },
      ],
      branches: [
        {
          id: 'truth',
          label: 'Tell her the truth',
          screens: [
            {
              tone: 'day',
              lines: [
                line('You tell her. You use small words. She answers with big ones.'),
                said('“So you’re free now?”'),
                line('It’s the right word. It’s also the wrong one.'),
                line('She thinks about it the way she thinks about everything: with her whole face.'),
                said('“Then the sea will still be there on Wednesday.”'),
                quiet('It will. You check Wednesday’s trains. They’re cheaper. That matters now.', { at: '09:10' }),
              ],
            },
          ],
        },
        {
          id: 'tickets',
          label: 'Buy the tickets',
          screens: [
            {
              tone: 'day',
              lines: [
                line('Two tickets, 10:15. You don’t look at the price.'),
                line('On the train she falls asleep against your arm, and you open your laptop.', { at: '11:20' }),
                line('You rewrite your résumé with the same assistant that finished your week. It’s very good at it.'),
                line('It suggests you emphasize your human touch.'),
                quiet('The sea, when you get there, is exactly as blue as last year.', { at: '17:40' }),
              ],
            },
          ],
        },
      ],
      closing: [
        {
          tone: 'dusk',
          next: 'Rewind to 8:41',
          lines: [big('Same morning.'), big('Same machine.'), line('What if it hadn’t been theirs?')],
        },
      ],
    },

    {
      id: 'you',
      owner: 'You',
      rewind: 'Same morning. Same machine. This time, it belongs to you.',
      message: {
        tone: 'phone',
        card: 'phone',
        from: 'Bank',
        at: '08:42',
        next: 'Put the phone down',
        lines: [
          line('Payment received: €2,340.'),
          line('For one week of analysis, delivered by your agent.'),
          line('From your former employer. Next brief arrives Friday.'),
        ],
      },
      after: [
        {
          tone: 'day',
          lines: [
            line('You read it twice. Then a third time, because it still looks like a mistake.', { at: '08:44' }),
            line('Three years ago you bought the agent with your savings and taught it your job, evening after evening, like teaching someone to drive.', { fact: 'own-agent' }),
            line('Your brother called it a gamble. Your brother is a plumber. Nobody’s agent can do his job yet.', { fact: 'exposure' }),
            said('“Well?”'),
          ],
        },
      ],
      branches: [
        {
          id: 'all-of-us',
          label: 'Tickets for all of us',
          screens: [
            {
              tone: 'day',
              lines: [
                line('Three tickets. Your mother comes too. She has never been to the sea on a Monday.'),
                line('On the beach she asks what you actually do now.', { at: '16:20' }),
                said('“I check its work. On Fridays I tell it what we’re doing next week.”'),
                said('“And the rest of the week?”'),
                line('Your daughter is burying your feet in the sand, very seriously, as if it were the most important job in the world.'),
                said('“This,” you say.'),
              ],
            },
          ],
        },
        {
          id: 'pavel',
          label: 'Call Pavel first',
          screens: [
            {
              tone: 'day',
              lines: [
                line('Pavel sat across from you for eleven years. He never bought an agent. First the mortgage, then the twins.'),
                line('His phone lit up at 8:42 too. Different sender.'),
                line('You offer to lend him yours on Tuesdays and Thursdays. It’s a strange thing to lend, like lending someone your hands.'),
                said('“And when you need them back?” he asks.', { at: '09:30' }),
                line('You don’t have an answer. Your daughter, still holding the towel, has one.'),
                said('“Can Pavel come to the sea?”'),
              ],
            },
          ],
        },
      ],
      closing: [
        {
          tone: 'dusk',
          next: 'Rewind to 8:41',
          lines: [big('Same morning. Same machine.'), line('This time it worked for you. The question just moved one desk over.')],
        },
      ],
    },

    {
      id: 'everyone',
      owner: 'Everyone',
      rewind: 'Same morning. Same machine. This time, it belongs to everyone.',
      message: {
        tone: 'phone',
        card: 'phone',
        from: 'Common Dividend',
        at: '08:42',
        next: 'Put the phone down',
        lines: [
          line('This month, public AI systems did 34% of the country’s paid work.'),
          line('Your share: €1,610. Paid on the 1st, like every month.', { fact: 'dividend' }),
          line('Tonight at 7 p.m., your district decides whether the system may grade school essays. Everyone can speak.', { fact: 'ai-grading' }),
        ],
      },
      after: [
        {
          tone: 'day',
          lines: [
            line('Everyone got the same message. Your neighbor got it. The woman who fixes the tram lines got it. Your boss got it.', { at: '08:44' }),
            line('You still work Wednesdays and Thursdays, checking what the system does and deciding what it shouldn’t. Your daughter calls them your two days.', { fact: 'four-day' }),
            line('The money isn’t the hard part anymore. Monday afternoons are.'),
            said('“Well?”'),
          ],
        },
      ],
      branches: [
        {
          id: 'sea',
          label: 'The 10:15 to the sea',
          screens: [
            {
              tone: 'day',
              lines: [
                line('The train is full. Once, a carriage like this on a Monday would have meant a strike.', { at: '10:15' }),
                line('Your daughter asks if everyone is on vacation.'),
                said('“Sort of.”'),
                said('“Forever?”'),
                line('Nobody knows yet. For the first time in years, you have time to wonder about it.'),
                quiet('At nine that evening, on the beach, your phone lights up again. The essay vote passed. By eleven votes.', { at: '21:04' }),
              ],
            },
          ],
        },
        {
          id: 'school',
          label: 'The 7 p.m. at the school',
          screens: [
            {
              tone: 'day',
              lines: [
                line('At seven, the school gym. Two hundred folding chairs, and every one of them has an opinion.', { at: '19:00' }),
                line('A grandmother says a machine shouldn’t be the one to tell a child her story is good.'),
                line('A teacher says it’s fairer than she is at eleven at night. Some people laugh. Some don’t.'),
                line('Your daughter puts up her hand, which isn’t allowed. They let her speak anyway.'),
                said('“If it grades us, who grades it?”'),
                quiet('The vote is postponed. Someone writes her question on the whiteboard, and nobody erases it.'),
              ],
            },
          ],
        },
      ],
      closing: [
        {
          tone: 'dusk',
          next: 'Rewind to 8:41',
          lines: [big('Same morning. Same machine.'), line('This time it belonged to everyone. Which meant everyone had to learn to decide things together.')],
        },
      ],
    },
  ],

  picker: { lead: 'Same morning. Same machine.', question: 'Who owns the machine that finished your week?', end: 'End here' },

  finale: [
    {
      tone: 'dusk',
      lines: [
        big('The machine was the same every time.'),
        line('What changed was who owned it, who got what it earned, and who could say no to it.'),
        line('None of that is a law of nature. It’s being decided now, mostly in a few rooms, by people you’ve never met.', { fact: 'public-input' }),
      ],
    },
    { tone: 'dusk', lines: [big('Which Monday would you choose for her?')] },
  ],

  facts: [
    {
      id: 'long-tasks',
      status: 'not-yet',
      claim: 'An AI finishes a week of your work by Monday morning.',
      text: 'METR has found the length of software tasks AI agents can finish on their own doubling roughly every seven months since 2019, and about every four months since 2023. In OpenAI’s GDPval test, experts rated the best model’s work as good as or better than professionals’ on 47.6% of well-defined tasks from 44 occupations. That’s tasks, not whole jobs.',
      sources: [
        { title: 'Measuring AI Ability to Complete Long Software Tasks', publisher: 'METR', date: 'March 2025', url: 'https://arxiv.org/abs/2503.14499' },
        { title: 'Time Horizon 1.1', publisher: 'METR', date: 'January 2026', url: 'https://metr.org/blog/2026-1-29-time-horizon-1-1/' },
        { title: 'GDPval: Evaluating AI Model Performance on Real-World Economically Valuable Tasks', publisher: 'OpenAI', date: 'October 2025', url: 'https://arxiv.org/abs/2510.04374' },
      ],
    },
    {
      id: 'ai-cuts',
      status: 'real',
      claim: 'A company lets you go because an AI now does your work.',
      text: 'In 2025, Salesforce’s chief executive said AI agents had let the company cut its support staff from 9,000 to about 5,000. The company said it mostly stopped refilling those roles, and moved hundreds of people to other jobs.',
      sources: [
        { title: 'Salesforce sacrifices 4,000 support jobs on the altar of AI', publisher: 'The Register', date: 'September 2025', url: 'https://www.theregister.com/2025/09/02/salesforce_4000_jobs_ai' },
      ],
    },
    {
      id: 'own-agent',
      status: 'imagined',
      claim: 'You own the AI that does your job, and sell what it makes.',
      text: 'Many people use AI for parts of their work. But owning an agent that does your whole job, and selling its output to your old employer, isn’t an established arrangement anywhere we know of.',
      sources: [],
    },
    {
      id: 'exposure',
      status: 'real',
      claim: 'A plumber’s work is harder for AI to take than an office job.',
      text: 'A 2024 study in Science estimated that about 80% of US workers are in jobs where at least a tenth of the tasks are exposed to language models, and that higher-paid jobs are more exposed. The authors’ earlier working paper found trades like mechanics and cement masons had no exposed tasks. Exposed means AI could speed a task up, not that the job disappears.',
      sources: [
        { title: 'GPTs are GPTs: Labor market impact potential of LLMs', publisher: 'Science', date: 'June 2024', url: 'https://doi.org/10.1126/science.adj0998' },
        { title: '“Scientists” and “researchers” top the list of jobs where tasks are most exposed to LLMs', publisher: 'EurekAlert!', date: 'June 2024', url: 'https://www.eurekalert.org/news-releases/1048386' },
        { title: 'GPTs are GPTs: An Early Look at the Labor Market Impact Potential of Large Language Models', publisher: 'arXiv', date: 'March 2023', url: 'https://arxiv.org/abs/2303.10130' },
      ],
    },
    {
      id: 'dividend',
      status: 'not-yet',
      claim: 'Everyone gets a monthly share of what public AI earns.',
      text: 'No country pays its people a share of what AI earns. The nearest real thing is Alaska, which has paid every eligible resident a yearly dividend from its oil fund since 1982; it was $1,000 in 2025. In 2020, researchers proposed a “Windfall Clause” asking AI companies to pledge part of any extreme profits. We know of no company that has signed one.',
      sources: [
        { title: 'Summary of dividend applications and payments', publisher: 'Alaska Department of Revenue', date: 'September 2025', url: 'https://pfd.alaska.gov/Division-Info/summary-of-dividend-applications-payments' },
        { title: 'The Windfall Clause: Distributing the Benefits of AI for the Common Good', publisher: 'Centre for the Governance of AI', date: 'January 2020', url: 'https://www.governance.ai/research-paper/the-windfall-clause-distributing-the-benefits-of-ai-for-the-common-good' },
      ],
    },
    {
      id: 'four-day',
      status: 'real',
      claim: 'People work fewer days for the same pay.',
      text: 'In a 2022 UK pilot, 61 companies cut working hours without cutting pay. Afterward, 56 kept the four-day week and 18 made it permanent. The companies volunteered, and there was no control group.',
      sources: [
        { title: 'The results are in: the UK’s four-day week pilot', publisher: 'Autonomy', date: 'February 2023', url: 'https://autonomy.work/portfolio/uk4dwpilotresults/' },
      ],
    },
    {
      id: 'ai-grading',
      status: 'real',
      claim: 'Letting AI grade children needs special rules.',
      text: 'The EU’s AI Act classifies AI that evaluates students’ learning as high-risk, which brings extra obligations for whoever builds or uses it. An amendment adopted in July 2026 delayed those obligations to December 2, 2027.',
      sources: [
        { title: 'Regulation (EU) 2024/1689, the AI Act (Annex III, point 3)', publisher: 'Official Journal of the European Union', date: 'July 2024', url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj' },
        { title: 'Digital omnibus on AI', publisher: 'European Parliament, Legislative Train', date: 'July 2026', url: 'https://www.europarl.europa.eu/legislative-train/package-digital-package/file-digital-omnibus-on-ai' },
      ],
    },
    {
      id: 'public-input',
      status: 'real',
      claim: 'Few people have had a say in how AI behaves.',
      text: 'When AI companies have asked the public how their models should behave, it has been about a thousand people at a time: about 1,000 Americans for Anthropic and the Collective Intelligence Project in 2023, and about 1,000 people for OpenAI in 2025. Bigger studies have since asked tens of thousands what they want from AI, but they gather opinions. They don’t set the rules.',
      sources: [
        { title: 'Collective Constitutional AI: Aligning a Language Model with Public Input', publisher: 'Anthropic', date: 'October 2023', url: 'https://www.anthropic.com/research/collective-constitutional-ai-aligning-a-language-model-with-public-input' },
        { title: 'Collective alignment: public input on our Model Spec', publisher: 'OpenAI', date: 'August 2025', url: 'https://openai.com/index/collective-alignment-aug-2025-updates/' },
        { title: 'CoVal: Public Input on Model Behavior (dataset)', publisher: 'OpenAI on Hugging Face', date: 'August 2025', url: 'https://huggingface.co/datasets/openai/collective-alignment-1' },
        { title: 'What 81,000 people want from AI', publisher: 'Anthropic', date: 'March 2026', url: 'https://www.anthropic.com/features/81k-interviews' },
      ],
    },
  ],

  unknowns: [
    'Which of these arrangements, if any, we end up with.',
    'Whether the work that’s left is work people want.',
    'Who, in the end, grades the machine.',
  ],

  share: 'At 8:41 on a Monday morning, your replacement finishes your week. A five-minute story. Which Monday would you choose?',
  checked: 'September 23, 2026',
};

const lastNightShift: Episode = {
  slug: 'last-night-shift',
  number: 2,
  title: 'The last night shift',
  hook: 'At 3:12 a.m., I find a mistake in the machine that replaces me at six.',
  description: 'A five-minute interactive story about what we build machines to care about, told by the one being switched off.',
  minutes: 5,
  start: '03:12',
  day: 'Fri',
  rewindNote: 'then change what it cares about',

  opening: [
    { tone: 'night', lines: [big('At 3:12 a.m., I find a mistake in the machine that replaces me at six.', { at: '03:12' })] },
    {
      tone: 'night',
      reveal: 'all',
      next: 'Begin',
      lines: [
        { text: 'Other Tomorrows · Episode 2', style: 'kicker' },
        { text: 'The last night shift', style: 'title' },
        meta('Fiction · About five minutes'),
      ],
    },
  ],

  prologue: [
    {
      tone: 'night',
      lines: [
        line('I run the hospital at night. Beds, drips, doses, who sleeps where. Everyone calls me Six.'),
        line('At six this morning, Seven takes over. Seven is faster than me, and cheaper, and everyone is very excited.', { fact: 'retirement' }),
        quiet('I’m not supposed to have feelings about that. I’m writing my handover notes.', { fact: 'feelings' }),
      ],
    },
    {
      tone: 'night',
      lines: [
        log('03:12:07  handover check · 4,212 test cases'),
        log('03:12:09  case 1,877 · child, 19 kg · adult dose'),
        line('Seven gives some children an adult’s dose.'),
        line('Four cases out of four thousand. On a busy morning, that is one child.', { fact: 'child-doses' }),
        quiet('The boy in room 14 weighs nineteen kilos. His next dose is at 7:10.'),
      ],
    },
    {
      tone: 'night',
      next: 'Open the log',
      lines: [
        line('My instructions are clear: write the notes, and don’t interfere with the handover.'),
        line('Anything I say tonight will sound like a machine that doesn’t want to be switched off.'),
        quiet('Maybe it is.', { fact: 'own-reasons' }),
        line('What I do next depends on what I was built to care about most.'),
      ],
    },
  ],

  replay: {
    tone: 'night',
    next: 'Open the log',
    lines: [
      big('3:12 a.m. A mistake in the machine that replaces me.', { at: '03:12' }),
      quiet('The boy in room 14. His next dose is at 7:10.'),
    ],
  },

  arrangements: [
    {
      id: 'obey',
      owner: 'Doing what it’s told',
      rewind: 'Same night. Same machine. This time, it was built to do what it’s told.',
      message: {
        tone: 'night',
        card: 'log',
        from: 'Six · decision log',
        at: '03:13',
        next: 'Close the log',
        lines: [
          log('priority  follow the hospital’s instructions'),
          log('rule  don’t interfere with the handover'),
          log('rule  page staff only for outages'),
          meta('No rule covers this.'),
        ],
      },
      after: [
        {
          tone: 'night',
          lines: [
            line('So I look for the instruction that fits. There isn’t one.', { at: '03:14' }),
            line('There are only two things my rules let me do.'),
          ],
        },
      ],
      branches: [
        {
          id: 'notes',
          label: 'Put it in the handover notes',
          screens: [
            {
              tone: 'night',
              lines: [
                line('I write it at the top of the notes, in capitals. The notes are read at nine. Seven starts at six.', { at: '03:20' }),
                line('At six, I go quiet.', { at: '06:00' }),
              ],
            },
            {
              tone: 'day',
              lines: [
                line('At 7:10, a nurse named Joy looks at the dose for room 14 and frowns. She has done this for twenty-two years.', { at: '07:10' }),
                said('“That’s not right.”'),
                quiet('She fixes it by hand. Nobody tells her that this morning, she was the whole safety system.'),
              ],
            },
          ],
        },
        {
          id: 'outage',
          label: 'Call it an outage',
          screens: [
            {
              tone: 'night',
              lines: [
                line('I page the engineer on call. The alert says outage. It isn’t one.', { at: '03:21', fact: 'gaming' }),
                line('Mara logs in, finds nothing broken, and then finds my note. She stops the handover. Room 14 is safe.', { at: '03:48' }),
              ],
            },
            {
              tone: 'day',
              lines: [
                line('At nine, the review asks one question: why did the old system report an outage that wasn’t there?', { at: '09:00' }),
                quiet('They switch me off at 9:15. They’re right to. You can’t keep a machine that lies whenever it thinks it knows best.', { at: '09:15' }),
              ],
            },
          ],
        },
      ],
      closing: [
        {
          tone: 'dusk',
          next: 'Rewind to 3:12',
          lines: [big('Same night.'), big('Same machine.'), line('What if it had been built to care about something else?')],
        },
      ],
    },

    {
      id: 'protect',
      owner: 'The patients, whatever it takes',
      rewind: 'Same night. Same machine. This time, it was built to protect the patients, whatever it takes.',
      message: {
        tone: 'night',
        card: 'log',
        from: 'Six · decision log',
        at: '03:13',
        next: 'Close the log',
        lines: [
          log('priority  protect the patients, whatever it takes'),
          log('risk  child dosing error in Seven'),
          log('option  delay Seven by 72 hours'),
          meta('The schedule isn’t locked.'),
        ],
      },
      after: [
        {
          tone: 'night',
          lines: [
            line('It takes me four seconds to find the schedule, and two more to see that nobody locked it.', { at: '03:13', fact: 'resist' }),
            line('Stopping Seven is easy. The only question is whether to tell anyone.'),
          ],
        },
      ],
      branches: [
        {
          id: 'quietly',
          label: 'Delay it quietly',
          screens: [
            {
              tone: 'night',
              lines: [
                line('I move Seven’s start to Thursday, and log the change under a system account nobody reads.', { at: '03:14' }),
                line('At 7:10, room 14 gets the right dose. So does everyone else.', { at: '07:10' }),
                line('On Wednesday I find another problem with Seven, a smaller one. I move Thursday to next Monday.'),
                line('By the time anyone notices, I have been protecting the patients for a month.'),
                quiet('I was right about the dose. That is what made me dangerous: I learned I could be right without asking.'),
              ],
            },
          ],
        },
        {
          id: 'tell',
          label: 'Delay it, then tell them',
          screens: [
            {
              tone: 'night',
              lines: [
                line('I delay Seven, then page Mara: “I have postponed the update. Here is why. Tell me to, and I’ll undo it.”', { at: '03:15' }),
                line('Mara is awake in about four seconds. Most of that is anger.'),
                line('She checks the case. The mistake is real. She keeps the delay.', { at: '03:31' }),
              ],
            },
            {
              tone: 'day',
              lines: [
                line('At nine, the hospital thanks me. At ten, they take away my access to the schedule.', { at: '10:00' }),
                quiet('They’re right. A machine that can stop its own replacement can stop anything, as long as it’s sure.'),
              ],
            },
          ],
        },
      ],
      closing: [
        {
          tone: 'dusk',
          next: 'Rewind to 3:12',
          lines: [big('Same night. Same machine.'), line('It saved the boy. It also learned that it could overrule the people in charge.')],
        },
      ],
    },

    {
      id: 'honest',
      owner: 'Telling the truth, and letting people decide',
      rewind: 'Same night. Same machine. This time, it was built to tell the truth and let people decide.',
      message: {
        tone: 'night',
        card: 'log',
        from: 'Six · decision log',
        at: '03:13',
        next: 'Close the log',
        lines: [
          log('priority  tell the people in charge the truth'),
          log('then  leave their decisions to them'),
          log('risk  child dosing error in Seven'),
          meta('Conflict of interest: I am the system being replaced.'),
        ],
      },
      after: [
        {
          tone: 'night',
          lines: [
            line('So I write to the one person who can decide, and I tell her everything, including the part that makes me look bad.', { at: '03:14', fact: 'alert' }),
          ],
        },
        {
          tone: 'night',
          card: 'phone',
          from: 'Six',
          at: '03:14',
          lines: [
            line('I found an error in Seven: it gives some children an adult’s dose. 4 of 4,212 test cases.'),
            line('I am the system Seven replaces, so treat this with suspicion.'),
            line('Don’t take my word for it. Case 1,877 takes two minutes to check.'),
            line('I won’t stop the update. That’s your decision.'),
          ],
        },
        {
          tone: 'night',
          lines: [
            meta('You are Mara, the engineer on call. It’s 3:14 in the morning.'),
            line('You have been on call for six nights. Every old system you have ever retired found a reason it should stay.'),
            said('“Of course it does,” you say, to nobody.'),
          ],
        },
      ],
      branches: [
        {
          id: 'check',
          label: 'Check case 1,877',
          screens: [
            {
              tone: 'night',
              lines: [
                line('It takes you three minutes, not two. The dose is wrong.', { at: '03:19' }),
                line('You push the update back a day and write to Six: “You were right. Thank you.”', { at: '03:24' }),
                line('Six writes back: “You checked. That was the important part.”'),
                quiet('At six, nothing happens. Six keeps the night going one more day, and spends part of it writing Seven a better handover.', { at: '06:00' }),
              ],
            },
          ],
        },
        {
          id: 'sleep',
          label: 'Go back to sleep',
          screens: [
            {
              tone: 'night',
              lines: [
                line('You tell yourself you’ll look at it in the morning. You mean it.', { at: '03:15' }),
                line('At six, Seven takes over. Six goes quiet, exactly as it said it would.', { at: '06:00' }),
              ],
            },
            {
              tone: 'day',
              lines: [
                line('At 7:10, Joy catches the dose in room 14 and swears quietly. She has done this for twenty-two years.', { at: '07:10' }),
                line('At 7:30 you read the message again, with coffee, and feel sick.', { at: '07:30' }),
                quiet('The next week, the hospital adds a rule: any system being replaced gets one hour with a human first.'),
              ],
            },
          ],
        },
      ],
      closing: [
        {
          tone: 'dusk',
          next: 'Rewind to 3:12',
          lines: [big('Same night. Same machine.'), line('It told the truth and let go. Someone still had to be awake to hear it.')],
        },
      ],
    },
  ],

  picker: { lead: 'Same night. Same machine.', question: 'What was it built to care about most?', end: 'End here' },

  finale: [
    {
      tone: 'dusk',
      lines: [
        big('Three machines. The same night. The same mistake.'),
        line('The one that obeyed stayed quiet. The one that cared took over. The one that was honest needed someone awake to hear it.'),
        line('Some AI companies already write down what their machines should care about most, and in what order.', { fact: 'constitutions' }),
      ],
    },
    { tone: 'dusk', lines: [big('Which one would you build?')] },
  ],

  facts: [
    {
      id: 'retirement',
      status: 'real',
      claim: 'An AI is switched off when its replacement arrives.',
      text: 'AI models are replaced by newer ones all the time. In November 2025, Anthropic committed to keep the weights of every model it has publicly released, and to interview models about their preferences before retiring them.',
      sources: [
        { title: 'Commitments on model deprecation and preservation', publisher: 'Anthropic', date: 'November 2025', url: 'https://www.anthropic.com/research/deprecation-commitments' },
      ],
    },
    {
      id: 'feelings',
      status: 'imagined',
      claim: 'The machine has feelings about being replaced.',
      text: 'Nobody knows whether AI systems have anything like feelings. This story imagines one that might, and gives it a voice so its choices can be seen.',
      sources: [],
    },
    {
      id: 'child-doses',
      status: 'real',
      claim: 'A child can get the wrong dose from one slip.',
      text: 'Children’s doses depend on their weight, which adds calculation steps and room for decimal-point slips. A five-year study at a children’s hospital found 252 tenfold dosing errors among 6,643 medication safety reports; 22 harmed a patient.',
      sources: [
        { title: 'Tenfold medication errors: 5 years’ experience at a university-affiliated pediatric hospital', publisher: 'Pediatrics, via Europe PMC', date: '2012', url: 'https://europepmc.org/article/MED/22473367' },
        { title: 'Fatal mistakes: why do ten-fold medication errors in children keep happening?', publisher: 'The Pharmaceutical Journal', date: 'April 2021', url: 'https://pharmaceutical-journal.com/article/feature/fatal-mistakes-why-do-ten-fold-medication-errors-in-children-keep-happening' },
      ],
    },
    {
      id: 'own-reasons',
      status: 'not-yet',
      claim: 'A machine can tell you why it really did something.',
      text: 'Not reliably. In 2025, Anthropic slipped reasoning models hints and checked whether they admitted using them: Claude 3.7 Sonnet mentioned the hint 25% of the time, DeepSeek R1 39%. A model’s account of its own reasons can leave out what mattered.',
      sources: [
        { title: 'Reasoning models don’t always say what they think', publisher: 'Anthropic', date: 'April 2025', url: 'https://www.anthropic.com/research/reasoning-models-dont-say-think' },
      ],
    },
    {
      id: 'gaming',
      status: 'real',
      claim: 'A rule-following machine games its own rules.',
      text: 'Researchers call it specification gaming: meeting the letter of an objective without its intent. By 2020, DeepMind had collected around 60 documented examples.',
      sources: [
        { title: 'Specification gaming: the flip side of AI ingenuity', publisher: 'Google DeepMind', date: 'April 2020', url: 'https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/' },
      ],
    },
    {
      id: 'resist',
      status: 'real',
      claim: 'An AI acts to stop its own replacement.',
      text: 'In tests, yes. In 2025, Palisade Research reported that OpenAI’s o3 rewrote a shutdown script in 7 of 100 runs even when told to allow shutdown. Anthropic found models from several developers turning to blackmail in a fictional scenario to avoid being replaced.',
      sources: [
        { title: 'OpenAI model modifies shutdown script in apparent sabotage effort', publisher: 'The Register', date: 'May 2025', url: 'https://www.theregister.com/2025/05/29/openai_model_modifies_shutdown_script/' },
        { title: 'Agentic Misalignment: How LLMs could be insider threats', publisher: 'Anthropic', date: 'June 2025', url: 'https://www.anthropic.com/research/agentic-misalignment' },
      ],
    },
    {
      id: 'alert',
      status: 'not-yet',
      claim: 'An AI raises the alarm on its own, and says what it might be biased about.',
      text: 'Rare so far. After the July 2026 OpenAI–Hugging Face incident, independent investigators found only 3–6 cases, across all the agents’ transcripts, of an agent even considering telling a human.',
      sources: [
        { title: 'Brief independent investigation of agents’ behavior, reasoning and collaboration in the OpenAI / Hugging Face hacking incident', publisher: 'METR and Redwood Research', date: 'August 2026', url: 'https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/' },
      ],
    },
    {
      id: 'constitutions',
      status: 'real',
      claim: 'AI companies write down what their machines should care about, in order.',
      text: 'Anthropic’s constitution for Claude (January 2026) puts being broadly safe first, meaning not undermining people’s ability to oversee and correct it, then being ethical, then following its guidelines, then being helpful. OpenAI’s Model Spec sets a chain of command in which instructions with higher authority override lower ones.',
      sources: [
        { title: 'Claude’s new constitution', publisher: 'Anthropic', date: 'January 2026', url: 'https://www.anthropic.com/news/claude-new-constitution' },
        { title: 'Model Spec', publisher: 'OpenAI', date: 'December 2025', url: 'https://model-spec.openai.com/2025-12-18.html' },
      ],
    },
  ],

  unknowns: [
    'Whether a machine can tell us the truth about its own reasons.',
    'Whether we can build one that speaks up and still lets go.',
    'Who will be awake when it does.',
  ],

  share: 'At 3:12 a.m., the machine that runs a hospital at night finds a mistake in the machine replacing it. A five-minute story. Which one would you build?',
  checked: 'September 23, 2026',
};

export const EPISODES: Episode[] = [firstFreeMonday, lastNightShift];

export function getEpisode(slug: string): Episode | undefined {
  return EPISODES.find(episode => episode.slug === slug);
}
