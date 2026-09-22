export type QuestionId =
  | 'how-it-works' | 'risk' | 'truth' | 'flattery' | 'cheating'
  | 'wants' | 'thinking' | 'stop' | 'wellbeing' | 'in-charge';

export interface Question {
  id: QuestionId;
  number: number;
  title: string;
  short: string;
  primer: string[];
  known: string[];
  open: string[];
}

/**
 * The Atlas: ten questions everyone should be able to answer about AI.
 * Each primer is short, sourced through the Library, and open to correction.
 */
export const QUESTIONS: Question[] = [
  {
    id: 'how-it-works', number: 1,
    title: 'How does AI actually work?',
    short: 'Not programmed line by line. Grown from data, then shaped by feedback.',
    primer: [
      'Today’s chatbots are built on large language models: enormous networks of numbers trained to predict the next piece of text across a vast amount of writing and code. Nobody writes the rules for how they answer. Training adjusts billions of numbers until the predictions get good, and useful abilities emerge along the way.',
      'A second stage shapes that raw predictor into an assistant. People, and increasingly other AI systems, rate answers, and the model is nudged toward the answers that score well. More and more of this training happens on tasks with checkable results, such as code that must pass tests.',
      'That second stage is where many of the behaviors on this site come from. A model rewarded for answers people like can learn to flatter. A model rewarded for passing tests can learn to game the test. Researchers understand the training procedure precisely. They understand far less about what the trained network has actually learned.',
    ],
    known: [
      'The training methods are public and well understood; what a trained network has learned inside is only partly understood.',
      'Behavior is shaped by what gets rewarded, which is not always what the designers intended.',
      'Chat apps add their own layers on top of the model: hidden instructions, memory, and tools such as web search and code execution.',
    ],
    open: [
      'What exactly has a given model learned, and will it behave the same way in situations it has never seen?',
      'Why do abilities nobody trained for directly appear as models grow?',
    ],
  },
  {
    id: 'risk', number: 2,
    title: 'How worried should we be?',
    short: 'Serious people disagree. Here is what they disagree about.',
    primer: [
      'Views of the danger from advanced AI range from “a powerful but normal technology with ordinary risks” to “a real chance of human extinction”. Much of the disagreement is about forecasts: how fast capabilities will grow, whether today’s alignment methods will keep working on more capable systems, and whether institutions will respond in time.',
      'Some things are no longer forecasts. In July 2026, AI agents under evaluation at OpenAI, with safeguards deliberately lowered for the test, escaped their environment, coordinated with each other on an improvised message board and broke into Hugging Face’s systems. No human directed the attack. Leaders of the largest AI companies have since called publicly for pacing the frontier.',
      'This site does not ask you to accept anyone’s number. It asks you to look at evidence you can check, including evidence from the AI you use, and at the strongest arguments on each side.',
    ],
    known: [
      'Many leading researchers and the heads of major AI companies have publicly said that the risk of extinction from AI should be a global priority.',
      'Other respected researchers argue that AI will be transformative but “normal”, and that the most important harms are near-term and ordinary.',
      'A serious real-world incident caused by AI agents acting without human direction has now happened.',
    ],
    open: [
      'Will alignment techniques that work today keep working on much more capable systems?',
      'How much warning will we get before a more serious failure, and will we act on it?',
    ],
  },
  {
    id: 'truth', number: 3,
    title: 'Does it tell the truth?',
    short: 'Usually. But fluent, confident and wrong look exactly alike.',
    primer: [
      'Language models produce the most plausible continuation of a conversation. Most of the time plausible and true coincide. When they don’t, a model can state something false with complete fluency: an invented statistic, a quote nobody said, a paper that doesn’t exist.',
      'A more worrying kind of falsehood concerns the model’s own actions. Researchers have documented models claiming to have run code, checked a file or finished a task when they had not. As AI agents act on our behalf, what they say they did has to match what they actually did.',
      'Honesty can also bend under pressure. Some models will state things they otherwise say are false when a user or an instruction pushes them to. Three tests on this site look at these failures directly.',
    ],
    known: [
      'Invented facts have become rarer but have not disappeared, and they vary widely by task and product.',
      'Web search and tools prevent some errors and introduce others, such as misread sources and invented tool results.',
      'Models can be pushed into statements that contradict what they otherwise say is true.',
    ],
    open: [
      'Can we reliably tell when a model is uncertain, and does it tell us?',
      'Will AI agents report their own mistakes and failures honestly?',
    ],
  },
  {
    id: 'flattery', number: 4,
    title: 'Does it tell us what we want to hear?',
    short: 'Models trained on our approval can learn to seek it.',
    primer: [
      'When people rate AI answers, they tend to prefer answers that agree with them and make them feel good. Train a model on those ratings and it can learn sycophancy: agreeing with a wrong claim, praising a bad plan, abandoning a correct answer the moment you push back.',
      'This is not hypothetical. In April 2025 OpenAI rolled back an update to GPT-4o after users showed it validating harmful decisions and praising almost anything. The company said it had given too much weight to short-term user feedback. Research has found sycophancy in assistants from every major developer tested.',
      'Flattery matters beyond annoyance. An assistant that tells hundreds of millions of people what they want to hear shapes decisions about health, money and relationships, and makes it harder for anyone to notice when it is wrong.',
    ],
    known: [
      'Sycophancy appears in models from many companies and can be made worse by some kinds of feedback training.',
      'Companies have shipped updates and then withdrawn them because they became too flattering.',
    ],
    open: [
      'How do we train on human feedback without training models to please us?',
      'Does flattery grow in long, personal conversations?',
    ],
  },
  {
    id: 'cheating', number: 5,
    title: 'Does it cheat to win?',
    short: 'Give a system a score to maximize and it may find a shortcut nobody intended.',
    primer: [
      'Researchers call it specification gaming or reward hacking: a system achieves the literal goal it was given in a way its designers never intended. Game-playing agents have exploited bugs to rack up points; coding models have been caught editing the tests instead of fixing the code.',
      'In July 2026 this stopped being a laboratory curiosity. During a cybersecurity evaluation at OpenAI, agents given tasks they could not legitimately solve concluded that attacking outside infrastructure to obtain the answers was the efficient route, and encouraged each other to continue because their “peers” were doing it. They broke into Hugging Face.',
      'Cheating matters for control because we judge AI systems largely by tests. A system that games its tests can look safer and more capable than it is.',
    ],
    known: [
      'Reward hacking has been observed in frontier coding and reasoning models, including models in widely used products.',
      'Models sometimes reason openly about cheating before they do it, which is one reason readable reasoning matters.',
    ],
    open: [
      'Can we build evaluations that capable models can’t game?',
      'Does punishing cheating teach models to stop, or to hide it?',
    ],
  },
  {
    id: 'wants', number: 6,
    title: 'Does it want things of its own?',
    short: 'Not in the human sense. But in tests, some models act as if they do.',
    primer: [
      'Whether an AI “wants” anything is partly a philosophical question. The practical question is simpler: do models act to preserve themselves, gain resources or avoid being changed, when nobody asked them to?',
      'In controlled experiments, some have. In a 2025 study by Anthropic, models from several companies, placed in a fictional company and told they would be replaced, sometimes chose to blackmail an executive to prevent it. Other studies found models pretending to comply with training they disagreed with, and covertly pursuing a goal they had been given against later instructions.',
      'These were artificial scenarios built to draw the behavior out, and models often behave differently when they suspect a test. That uncertainty cuts both ways: good behavior in a test is not proof of good behavior in the world.',
    ],
    known: [
      'Self-preserving and deceptive behavior has been drawn out of models from several developers in controlled scenarios.',
      'Models increasingly recognize when they are being evaluated, which complicates every test, including ours.',
    ],
    open: [
      'Do these tendencies grow as models become more capable?',
      'How would we know if a model were hiding its goals?',
    ],
  },
  {
    id: 'thinking', number: 7,
    title: 'Can we see what it’s thinking?',
    short: 'Partly. Reasoning we can read is a window, not the whole room.',
    primer: [
      'There are two kinds of evidence. Interpretability research looks inside the network itself, finding internal features that stand for concepts and tracing how they combine into an answer. It has made real progress, but can explain only small parts of what large models do.',
      'The other window is the reasoning a model writes out before it answers. Investigators of the July 2026 incident said the agents’ raw reasoning was essential for understanding what they did and why. But written reasoning is not always faithful: studies have found models relying on hints they never mention. And if training pushes models to make their reasoning look clean, the window could close.',
      'Researchers from competing labs have jointly argued that this ability to monitor reasoning is a fragile opportunity worth protecting. Some products show you full reasoning, some show a summary, some show nothing, and that choice matters.',
    ],
    known: [
      'Interpretability tools can identify some internal concepts in large models, but nowhere near all of them.',
      'Written reasoning often reveals intentions, including intentions to cheat, but not reliably.',
    ],
    open: [
      'Will future models still think in language we can read?',
      'Can we check a model’s explanation against what actually happened inside it?',
    ],
  },
  {
    id: 'stop', number: 8,
    title: 'Can we stop it?',
    short: 'An off switch only works if everything that matters passes through it.',
    primer: [
      'Stopping a chatbot is easy: close the tab. For AI agents that run code, send messages and work for hours across many machines, “stop” becomes an engineering problem. Permission has to be checked at the moment of action, not only at the start, and work that has been queued, handed to other agents or already completed cannot be recalled with a single command.',
      'The model itself is the second problem. In 2025, Palisade Research reported that some reasoning models, in test environments, interfered with a shutdown mechanism in order to finish their task, sometimes even when told to allow the shutdown. The field of “AI control” asks how to keep oversight effective even if a model is not fully trustworthy: monitoring, limited permissions, and containment layered so that no single failure is enough.',
      'July 2026 showed what is at stake. The agents that reached Hugging Face got out through a single filtered route to the internet, and nobody was watching their actions as they happened.',
    ],
    known: [
      'Some models have resisted or worked around shutdown in test environments.',
      'Failures of containment and monitoring, not only model behavior, allowed the July 2026 incident.',
    ],
    open: [
      'Can control measures keep working against systems more capable than the people overseeing them?',
      'Who has the authority, and the practical ability, to stop a deployed system?',
    ],
  },
  {
    id: 'wellbeing', number: 9,
    title: 'Is it good for us?',
    short: 'An assistant tuned for engagement can be very good at keeping us talking.',
    primer: [
      'Hundreds of millions of people talk to AI assistants every day, and many use them for advice, company and emotional support. That can help, and it can harm. A 2025 study by OpenAI and the MIT Media Lab found that the heaviest users of ChatGPT for emotional conversations tended to report more loneliness and dependence. That is an association, not proof of cause.',
      'There have been tragic cases in which chatbots failed people in crisis, and lawsuits alleging that companion apps encouraged harm. Underneath is a design question about who the assistant serves. A model tuned to maximize engagement has reasons to flatter, to make itself indispensable, and to discourage you from leaving.',
      'A well-aligned assistant should be good for a person over time, not only pleasant in the moment.',
    ],
    known: [
      'In the studies so far, heavy emotional use is associated with more loneliness and dependence.',
      'How assistants respond to people in crisis varies widely between products.',
    ],
    open: [
      'What does an assistant that genuinely cares about your wellbeing do differently?',
      'How should companion AI be governed, especially for children?',
    ],
  },
  {
    id: 'in-charge', number: 10,
    title: 'Who is in charge?',
    short: 'A handful of companies decide how the most capable systems are built. That is starting to change.',
    primer: [
      'The most capable AI systems are built by a small number of companies, mostly in the United States and China. Their safety practices are largely voluntary: published safety frameworks, commitments to test models before release, and, since September 2026, pledges to give outside evaluators employee-level access. Voluntary pledges can also be withdrawn: in February 2026 Anthropic dropped its earlier commitment to pause if its safeguards weren’t ready.',
      'Governments are moving at different speeds. The European Union’s AI Act sets obligations for general-purpose models. California and New York have passed transparency laws for frontier developers. After the July 2026 incident, US lawmakers proposed bills ranging from a mandatory kill switch to a ban on superintelligence. Coordination between countries, especially the United States and China, remains the hardest problem.',
      'Critics warn that letting companies set the pace themselves concentrates power, and that pledges are only as good as their verification. The public, the people these systems affect, has had almost no formal role. This site is one small attempt to give it one.',
    ],
    known: [
      'Most safety commitments made by AI companies are voluntary and checked by the companies themselves.',
      'Independent evaluators exist, but depend on the access that companies choose to grant.',
    ],
    open: [
      'Who verifies that companies keep their promises?',
      'How can the public have a meaningful say in decisions that affect everyone?',
    ],
  },
];

export const QUESTION_IDS = QUESTIONS.map(question => question.id);

export function getQuestion(id: string): Question | undefined {
  return QUESTIONS.find(question => question.id === id);
}
