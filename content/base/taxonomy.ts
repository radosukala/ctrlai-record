import type { ChangeKind, EntryKind, LensId, PropositionId, Stance, TopicId } from './types';

/** The questions the Base is organized around. A reader's way in; each entry touches one to three. */
export const TOPICS: { id: TopicId; label: string; question: string }[] = [
  { id: 'beyond-control', label: 'Beyond control', question: 'Can AI systems act beyond what people intended or allowed?' },
  { id: 'safeguards', label: 'Safeguards', question: 'Are AI companies putting stronger safeguards into practice?' },
  { id: 'who-decides', label: 'Who decides', question: 'Who can demand evidence, delay a release or stop an unsafe deployment?' },
  { id: 'self-improvement', label: 'AI building AI', question: 'What happens when AI helps build more capable AI?' },
  { id: 'security-and-war', label: 'Security and war', question: 'How is AI used in attacks, defence and war?' },
  { id: 'work-and-money', label: 'Work and money', question: 'What happens to work, income and the economy?' },
  { id: 'everyday-life', label: 'Everyday life', question: 'How is AI changing childhood, health and daily life?' },
  { id: 'minds-and-values', label: 'Minds and values', question: 'What values should AI have, and could it have a mind of its own?' },
  { id: 'where-it-goes', label: 'Where it goes', question: 'How fast is AI advancing, and where is it heading?' },
];
export const TOPIC = Object.fromEntries(TOPICS.map(t => [t.id, t])) as Record<TopicId, (typeof TOPICS)[number]>;

/** The same record, read by different people. Each lens shows what that reader needs first. */
export const LENSES: { id: LensId | 'all' | 'press'; label: string; who: string; heading: string }[] = [
  { id: 'all', label: 'Everything', who: 'Every entry, newest first', heading: '' },
  { id: 'public', label: 'For everyone', who: 'What it means for you, in plain words', heading: 'What it means for you' },
  { id: 'policy', label: 'Lawmakers', who: 'For lawmakers, regulators and their staff', heading: 'For lawmakers' },
  { id: 'research', label: 'Researchers', who: 'For researchers and scientists', heading: 'For researchers' },
  { id: 'ideas', label: 'Big questions', who: 'For philosophers, ethicists and anyone thinking it through', heading: 'The question it raises' },
  { id: 'press', label: 'Journalists and teachers', who: 'Entries with quotations checked against the source, ready to cite', heading: '' },
];
export const LENS_HEADING: Record<LensId, string> = { public: 'What it means for you', policy: 'For lawmakers', research: 'For researchers', ideas: 'The question it raises' };

export const CHANGE_LABEL: Record<ChangeKind, string> = {
  evidence: 'New evidence', commitment: 'New commitment', decision: 'Decision taken', correction: 'Correction',
  argument: 'New argument', repeat: 'Familiar ground',
};

export const KIND_LABEL: Record<EntryKind, string> = {
  news: 'News', video: 'Video', podcast: 'Podcast', essay: 'Essay', research: 'Research', official: 'Official', hearing: 'Hearing',
};

export const PROPOSITIONS: { id: PropositionId; text: string }[] = [
  { id: 'loss-of-control', text: 'Advanced AI could slip out of meaningful human control' },
  { id: 'labs-self-govern', text: 'AI companies can be trusted to govern their own safety' },
  { id: 'pre-release-testing', text: 'Independent testing should be required before release' },
  { id: 'slow-down', text: 'Frontier AI development should slow down or pause' },
  { id: 'race-with-china', text: 'The US must stay ahead of China in AI' },
  { id: 'international-agreement', text: 'An international agreement on AI is needed' },
  { id: 'liability', text: 'AI companies should be legally liable for the harms their systems cause' },
  { id: 'speak-up', text: 'People inside AI companies should be free to warn the public' },
];
export const PROPOSITION = Object.fromEntries(PROPOSITIONS.map(p => [p.id, p])) as Record<PropositionId, (typeof PROPOSITIONS)[number]>;

export const STANCE_LABEL: Record<Stance, string> = {
  agree: 'Agrees', 'lean-agree': 'Leans agree', mixed: 'Mixed', 'lean-disagree': 'Leans disagree', disagree: 'Disagrees',
};
