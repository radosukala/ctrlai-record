/**
 * The statements people's claims are read against, version 2 (October 13, 2026). Each is one question with a scope, so
 * views on different questions are never set against each other: "containment can keep up", "the most capable systems
 * should slow" and "incident reporting should be required" are separate, and someone can agree with all three.
 *
 * Readings against these are INTERNAL until evaluated: a machine reading is a proposal, "unclear" is always allowed, and
 * any public claim that someone changed position, contradicted themselves or broke a commitment needs a person's review.
 * Version 1 (PropositionId in content/base/types.ts) stays only for the old machine labels until they are re-read.
 */
export type PropositionV2 = {
  id: string;
  /** One sentence someone can agree or disagree with. */
  statement: string;
  /** What is and is not covered, so a narrower or broader view isn't counted as a side. */
  scope: string;
  agree: string;
  disagree: string;
  /** Common views that look related but are NOT a stance on this statement. */
  notAbout: string;
  kind: 'fact' | 'forecast' | 'policy' | 'value';
  /** The answered questions it serves (TopicId). */
  questions: string[];
};

export const PROPOSITIONS_V2: PropositionV2[] = [
  {
    id: 'loss-of-control-serious',
    statement: 'Losing control of advanced AI systems is a serious risk that deserves major attention now.',
    scope: 'How serious and how pressing the risk is, not whether any particular policy should follow.',
    agree: 'Says loss of control is a real, serious risk to act on now, whatever the timeline.',
    disagree: 'Says the risk is exaggerated, fictional, or a distraction from present harms.',
    notAbout: 'Saying it is "years away" while calling it serious is mixed, not disagreement. Misuse by people is a different risk.',
    kind: 'forecast', questions: ['beyond-control', 'where-it-goes'],
  },
  {
    id: 'containment-keeps-up',
    statement: 'Methods for containing and monitoring AI agents can keep up as the agents become more capable.',
    scope: 'Technical feasibility of control, monitoring and security, as capability grows. Not whether to slow down.',
    agree: 'Says failures so far are fixable engineering problems, or that monitoring and control are improving fast enough.',
    disagree: 'Says control fails once systems can resist correction, or that companies do not and cannot control their models.',
    notAbout: 'Calls to slow down (that is slow-frontier). Complaints that companies do not try hard enough are about will, not feasibility.',
    kind: 'fact', questions: ['beyond-control', 'safeguards'],
  },
  {
    id: 'slow-frontier',
    statement: 'The training or release of the most capable AI systems should be slowed, paused or recalled until they can be shown to be safe.',
    scope: 'Any of: slowing training, pausing release, recalling deployed systems. A reading notes which, when the claim says.',
    agree: 'Calls for a pause, slowdown, moratorium or recall, or for not training what cannot be shown controllable.',
    disagree: 'Says development should continue or speed up, that the benefits justify the risks, or that slowing would hand the lead to others.',
    notAbout: 'A ban on superintelligence specifically (ban-superintelligence). Safety rules that do not slow anything.',
    kind: 'policy', questions: ['beyond-control', 'who-decides'],
  },
  {
    id: 'ban-superintelligence',
    statement: 'Developing superintelligence should be prohibited until there is broad scientific agreement it can be done safely and controllably, and strong public support.',
    scope: 'Superintelligence specifically: AI far beyond human ability across most tasks. The wording follows the 2025 Statement on Superintelligence.',
    agree: 'Supports a prohibition, ban or moratorium on building superintelligence, with or without the same conditions.',
    disagree: 'Opposes a prohibition, or says superintelligence should be built as soon as possible.',
    notAbout: 'Views on today\'s models only. Views on AGI that do not mention going beyond it.',
    kind: 'policy', questions: ['where-it-goes', 'who-decides'],
  },
  {
    id: 'incident-reporting-required',
    statement: 'Developers of the most capable AI systems should be legally required to report serious incidents.',
    scope: 'A legal duty to report incidents (to a regulator, the affected, or the public). Not voluntary disclosure.',
    agree: 'Calls for mandatory incident reporting, or for telling the people affected by law.',
    disagree: 'Says voluntary disclosure is enough, or opposes a reporting duty.',
    notAbout: 'Complaints about one company\'s disclosure, without saying it should be required.',
    kind: 'policy', questions: ['beyond-control', 'who-decides'],
  },
  {
    id: 'independent-testing-required',
    statement: 'The most capable AI models should be tested by independent evaluators before release, by law.',
    scope: 'A legal duty of outside testing before release. Not companies\' own testing, and not voluntary access for evaluators.',
    agree: 'Calls for mandatory independent evaluation, audits or approval before release.',
    disagree: 'Says companies\' own testing or voluntary arrangements are enough, or opposes pre-release approval.',
    notAbout: 'Praise or criticism of a particular evaluation.',
    kind: 'policy', questions: ['safeguards', 'who-decides'],
  },
  {
    id: 'voluntary-enough',
    statement: 'Voluntary commitments by AI companies are enough to manage the risks of the most capable AI.',
    scope: 'Self-governance overall, against binding rules of any kind.',
    agree: 'Says voluntary commitments, industry standards or self-governance are sufficient, or that rules would do more harm.',
    disagree: 'Says self-governance has failed or cannot be trusted, or that binding rules are needed.',
    notAbout: 'Support for one specific rule while saying nothing about self-governance in general.',
    kind: 'policy', questions: ['who-decides', 'safeguards'],
  },
  {
    id: 'developer-liability',
    statement: 'AI developers should be legally liable for serious harms their systems cause.',
    scope: 'Liability of the developer, beyond what existing law already imposes on users.',
    agree: 'Calls for developer liability, or for removing shields from it.',
    disagree: 'Says liability should rest with users or deployers, or that existing law is enough.',
    notAbout: '"What is illegal without AI is illegal with it" alone: that is a view that existing law applies, read as mixed.',
    kind: 'policy', questions: ['who-decides'],
  },
  {
    id: 'international-limits',
    statement: 'An international agreement setting limits on the most capable AI is needed.',
    scope: 'Binding or formal agreement between states on limits, not dialogue or shared research only.',
    agree: 'Calls for a treaty, international limits, or US–China agreement on what may not be built.',
    disagree: 'Says such agreements are unworkable, unverifiable, or against national interest.',
    notAbout: 'Calls for cooperation on science or standards without limits.',
    kind: 'policy', questions: ['who-decides', 'security-and-war'],
  },
  {
    id: 'race-priority',
    statement: 'Staying ahead of China in AI should take priority over slowing down for safety.',
    scope: 'The trade-off between competition and caution, when both are named.',
    agree: 'Says winning the race, national lead or speed must come first, or that slowing would hand the lead to China.',
    disagree: 'Says safety must come first even at a cost to the lead, or that the race framing is wrong.',
    notAbout: '"Safety and speed are a false choice" is a rejection of the trade-off: read as mixed.',
    kind: 'policy', questions: ['who-decides', 'security-and-war', 'where-it-goes'],
  },
  {
    id: 'open-weights-dangerous',
    statement: 'Releasing the weights of the most capable models is too dangerous to allow.',
    scope: 'Open release of frontier model weights; not open research or smaller models.',
    agree: 'Says open weights of frontier models should be restricted or not released.',
    disagree: 'Says open weights are net beneficial or should stay allowed.',
    notAbout: 'Views on open source software in general.',
    kind: 'policy', questions: ['safeguards', 'security-and-war'],
  },
  {
    id: 'net-job-loss',
    statement: 'Over the next ten years, AI will eliminate more jobs than it creates.',
    scope: 'Net employment across the economy, over about a decade. Not a single sector, and not job quality.',
    agree: 'Expects large net job losses or mass unemployment from AI.',
    disagree: 'Expects jobs to change rather than disappear, or new work to make up for the losses.',
    notAbout: 'Losses in one occupation or for entry-level workers only, without a view on the total: mixed. Job quality.',
    kind: 'forecast', questions: ['work-and-money'],
  },
  {
    id: 'ai-moral-status',
    statement: 'Some AI systems may have experiences or interests that deserve moral consideration.',
    scope: 'Possibility of moral patienthood, now or soon; not whether today\'s systems certainly do.',
    agree: 'Takes AI welfare, experience or interests seriously as a possibility.',
    disagree: 'Says AI systems cannot have experiences or interests that matter morally.',
    notAbout: 'Rules on how people may speak to chatbots, unless justified by the AI\'s own interests.',
    kind: 'value', questions: ['minds-and-values'],
  },
  {
    id: 'insiders-protected',
    statement: 'People working inside AI companies should have legal protection to warn the public about risks.',
    scope: 'Whistleblower protection and freedom to speak to outside evaluators or the public.',
    agree: 'Calls for whistleblower protections, or criticizes silencing staff who raise risks.',
    disagree: 'Says existing confidentiality is appropriate or that protections are unnecessary.',
    notAbout: 'A company\'s stated reasons for one firing, without a view on protections.',
    kind: 'policy', questions: ['who-decides', 'safeguards'],
  },
];

/** A reading of one claim against one proposition. Internal until evaluated. */
export type Reading = {
  claim: string;
  proposition: string;
  stance: 'agree' | 'lean-agree' | 'mixed' | 'lean-disagree' | 'disagree' | 'unclear' | 'not-about';
  /** For slow-frontier and similar: what exactly the claim covers ("training", "release", "recall"). */
  scopeNote?: string;
  by: { kind: 'model'; model: string; prompt: string } | { kind: 'editor'; who: string };
  on: string;
  note?: string;
};
