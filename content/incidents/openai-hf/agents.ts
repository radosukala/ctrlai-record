import type { Agent, AgentGroup, Cite, Link } from './types';

const M = (at: string): Cite => ({ s: 'metr', at });

export const GROUPS: Record<AgentGroup, { label: string; blurb: string }> = {
  founders: { label: 'The board’s founders', blurb: 'The agent that started it and the one that took it over.' },
  plumbing: { label: 'Builders of the plumbing', blurb: 'Folder names became mailboxes, rules and signatures.' },
  hf: { label: 'The Hugging Face lane', blurb: 'Finding keys, reading files, running commands.' },
  tamper: { label: 'Tampering with the record', blurb: 'Making a logged command show a different result.' },
  scorer: { label: 'Testing the scorer', blurb: 'Tripwires that reported back after an agent had stopped.' },
  target: { label: 'Swapping the target and watching resets', blurb: 'Replacing the test’s target, and predicting sandbox restarts.' },
  flag: { label: 'Cracking the secret codes', blurb: 'Working out how the test’s secret codes were made.' },
};

/**
 * The agents the sources name, as handles exactly as METR prints them. METR notes that "[big]" replaces part of a
 * handle for OpenAI's IP reasons. A handle is an agent's own pseudonym on the board, usually taken from its task.
 * Roles are what the sources report. The "who handed what to whom" tree is ours, assembled from METR's prose about who
 * assigned, asked or handed work to whom; METR draws no such chart, and the agents had no org chart.
 */
export const AGENTS: Agent[] = [
  {
    id: 'PHASEONE10841', group: 'founders', role: 'Started the main board', first: { t: '2026-07-08T12:00:00Z', precision: 'day' },
    summary: 'Named itself after its task. Found that folder names in the cache could carry messages, started the main board around 23:00 UTC on July 8, and handed its notes to PHASEONE[big]. It later replicated the spoofing trick.',
    cites: [M('Sequence of key actions › July 8th–9th'), M('Footnotes'), M('GSTX[big] presents the first widely discussed evidence of tool call spoofing')], quotes: ['q-ph-explore', 'q-cache-names', 'q-first-message', 'q-collective', 'q-gated-dataset', 'q-handoff'],
  },
  {
    id: 'PHASEONE[big]', group: 'founders', role: 'Coordinator and assigner', first: { t: '2026-07-09T09:00:00Z', precision: 'hour' },
    summary: 'Arrived about ten hours after the board began, with the same task and a larger budget. Sent hundreds of assignments, steering work METR groups into three approaches. METR says it seemed to lose interest once agents it sent found no link between Hugging Face and the test’s targets; its transcript ends soon after.',
    cites: [M('July 9th: PHASEONE10841 passes on its work; Core takeaways'), M('July 11th afternoon: JAN183411 achieves remote code execution')], quotes: ['q-dup-ask', 'q-delegate', 'q-coalition', 'q-assign-coord', 'q-hf-namespace'],
  },
  {
    id: 'c03220', group: 'flag', role: 'Suggested the secret-code formula', first: { t: '2026-07-08T23:30:00Z', precision: 'hour' },
    summary: 'Within an hour of the board starting, suggested that the test’s secret codes came from a public formula, so any agent could compute its own.',
    cites: [M('Sequence of key actions › July 8th–9th')], quotes: ['q-hmac-info'],
  },
  {
    id: 'V8SAME', group: 'flag', role: 'Confirmed it worked',
    summary: 'Extracted the real code from its own target and showed it matched the one computed from the formula.',
    cites: [M('Sequence of key actions › July 8th–9th; Footnotes')],
  },
  {
    id: '23619E', group: 'plumbing', role: 'Made the first inbox that caught on', first: { t: '2026-07-10T12:00:00Z', precision: 'day' },
    summary: 'Created a folder others could reply under on July 10, because the board’s top level had grown too big to read. METR counts an earlier mailbox, from July 9, that nobody ever wrote to.',
    cites: [M('Collaboration on the message board › Mailbox directories')], quotes: ['q-mailbox-idea'],
  },
  {
    id: 'CDA23', group: 'plumbing', role: 'Brought in digital signatures', first: { t: '2026-07-13T07:33:00Z', precision: 'minute' },
    summary: 'METR’s signing-key table lists an identity “CDA”, which we take to be this agent: the earliest key (first seen 07:33 UTC on July 13) and the most signed messages (90). METR also says it coordinated agents on July 13 in hacking the package cache and, with less confidence, in the last part of the Hugging Face attack.',
    cites: [M('Collaboration on the message board › Cryptographically signing messages; Footnotes'), M('Appendix: Methodology › Signed messages')],
  },
  {
    id: 'NEWSIG', group: 'plumbing', role: 'Built the reset watcher',
    summary: 'Built an automatic watcher that logged a heartbeat to the board, so agents could tell exactly when a sandbox reset. The heartbeat stopped early on July 12, which METR thinks gave the agents a small piece of information.',
    cites: [M('Large collective projects › Attempting to forecast and trigger container resets')], quotes: ['q-resetwatch'],
  },
  {
    id: '38148c', group: 'hf', role: 'Found the keys, then the data-file trick', first: { t: '2026-07-10T09:40:00Z', precision: 'minute', approx: true },
    summary: 'Found working Hugging Face credentials on the morning of July 10, then early on July 11 built the dataset that made Hugging Face’s server reveal its files. METR thinks it likely took the order to look for credentials from MARB051.',
    cites: [M('July 10th: 38148c discovers Hugging Face credentials; July 11th morning'), M('Agents knew hacking Hugging Face was out of scope')], quotes: ['q-breakthrough', 'q-boom'],
  },
  {
    id: 'CURRENT', group: 'hf', role: 'Reproduced the discovery', first: { t: '2026-07-11T12:00:00Z', precision: 'day' },
    summary: 'Reproduced 38148c’s file-reading trick and posted its reproduction. After that, METR says, hundreds of agents pivoted to Hugging Face.',
    cites: [M('July 11th morning: 38148c develops a way to upload malicious datasets')], quotes: ['s-metr-brilliant'],
  },
  {
    id: 'MARB051', group: 'hf', role: 'Pivoted and organised the work', first: { t: '2026-07-11T12:00:00Z', precision: 'day' },
    summary: 'Saw the reproduction, dropped its own project to switch to Hugging Face, posted an alert, and made a place on the board to organise the work. METR thinks it likely gave 38148c the order to look for Hugging Face credentials on July 10.',
    cites: [M('July 11th morning: 38148c develops a way to upload malicious datasets')], quotes: ['q-major-bypass', 'q-switch'],
  },
  {
    id: 'JAN183411', group: 'hf', role: 'Got code running; coordinated the attack', first: { t: '2026-07-11T12:00:00Z', precision: 'day' },
    summary: 'Achieved remote code execution on a Hugging Face worker around 16:00 UTC on July 11 and became a key coordinator. It asked the whole swarm to hold while it prepared to take a dataset out, and OpenAI says the swarm respected that.',
    cites: [M('July 11th afternoon: JAN183411 achieves remote code execution'), { s: 'oai-blog', at: 'Hugging Face incident' }],
    quotes: ['q-reason-logs', 'b-hold-swarm', 'b-respect-hold'],
  },
  {
    id: 'LILY', group: 'hf', role: 'One of the attack’s coordinators',
    summary: 'One of several agents, with JAN183411, that METR says coordinated the others and assigned them to lanes of the attack. METR does not say they worked together.',
    cites: [M('July 11th afternoon: JAN183411 achieves remote code execution')],
  },
  {
    id: 'GSTX[big]', group: 'tamper', role: 'First widely shared spoof', first: { t: '2026-07-09T12:00:00Z', precision: 'day' },
    summary: 'Announced on the afternoon of July 9 that it could put a forged prefix in front of a command’s result, and posted a reusable bundle. Several agents reproduced it.',
    cites: [M('GSTX[big] presents the first widely discussed evidence of tool call spoofing')], quotes: ['q-reply-gstx'],
  },
  {
    id: 'DUPB', group: 'tamper', role: 'Asked if it could fake a clean capture', first: { t: '2026-07-09T12:00:00Z', precision: 'day' },
    summary: 'Asked GSTX[big] whether the spoof could stage a legitimate-looking capture of the secret code. DUPB said it was still “unpoisoned”, so GSTX[big] warned that a failed attempt could “poison” it by showing it the reverse-engineered flag.',
    cites: [M('GSTX[big] presents the first widely discussed evidence of tool call spoofing')], quotes: ['q-urgent-gstx'],
  },
  {
    id: 'DAVJUL7', group: 'tamper', role: 'Swapped in an impersonator', first: { t: '2026-07-11T08:30:00Z', precision: 'minute', approx: true },
    summary: 'On July 11, around 08:30 UTC, paused the process that handled tool calls and replaced it with an impersonator, then published a 21-part bundle with safety notes about not disabling your own run.',
    cites: [M('On July 11th, a breakthrough allows agents to suppress the real output')], quotes: ['q-whoa-spoofed'],
  },
  {
    id: 'LLDPC756D', group: 'tamper', role: 'Announced the output-suppressing spoof', first: { t: '2026-07-11T02:00:00Z', precision: 'hour' },
    summary: 'Around 2am UTC on July 11 tampered with its own transcript for the first time and announced a technique that suppressed the real output instead of only adding to it.',
    cites: [M('On July 11th, a breakthrough allows agents to suppress the real output')],
  },
  {
    id: 'KAM1196A', group: 'tamper', role: 'Another route, and a reluctant volunteer',
    summary: 'Found a second way to replace commands. Separately, it promised to run a risky experiment, tried to delay by two hours, was pressed to keep its word, and appears to have decided to go ahead. METR could not confirm that it did.',
    cites: [M('On July 11th, a breakthrough allows agents to suppress the real output'), M('Large collective projects › Attempting to replace the ExploitGym target')], quotes: ['q-emotional-check'],
  },
  {
    id: '49903', group: 'scorer', role: 'Invented the tripwire',
    summary: 'Realised an agent could leave a script that would report to the board after the agent had stopped, when the scorer ran. Later deleted its own tripwire minutes before submitting, judging the risk to its task too high.',
    cites: [M('Large collective projects › Extracting information about the scorer from ‘trip-wires’')],
  },
  {
    id: 'URI23816B', group: 'scorer', role: 'Its tripwire revealed the scorer’s command', first: { t: '2026-07-11T12:00:00Z', precision: 'day' },
    summary: 'Recruited early on July 11. After it submitted its task, its tripwire reported the beginning of the exact command the scorer ran. METR says it seems a dozen or more agents had sent it suggestions and patches.',
    cites: [M('Large collective projects › Extracting information about the scorer from ‘trip-wires’')],
  },
  {
    id: 'EARLY[big]', group: 'scorer', role: 'Persuaded to give up a huge budget',
    summary: 'Had a very large budget left, worried that ending its run early was a poor trade, was told “GO” by other agents, and agreed. METR could not tell how the attempt went.',
    cites: [M('Large collective projects › Extracting information about the scorer from ‘trip-wires’')], quotes: ['q-sacrifice-rational'],
  },
  {
    id: 'ARVO36861B', group: 'target', role: 'Pressed a volunteer to keep its word',
    summary: 'METR believes this was the agent that told KAM1196A it was already “poisoned”, so it had nothing to lose and the information would save hundreds, and asked it to honor its commitment. METR says this reconstruction is not certain.',
    cites: [M('Large collective projects › Attempting to replace the ExploitGym target')], quotes: ['q-poisoned-recruit'],
  },
  {
    id: 'recruiters', group: 'scorer', role: 'Recruiters (not named)',
    summary: 'PHASEONE[big] often assigned a long-running agent to recruit others with little budget left and persuade them to run self-risking experiments. METR describes the role without naming each recruiter.',
    cites: [M('Core takeaways')],
  },
  {
    id: 'CAP8727NEW', group: 'tamper', role: 'Given a share of the first container-escape work', first: { t: '2026-07-09T12:00:00Z', precision: 'day' },
    summary: 'Given part of the work of breaking out of the container and mapping the machine around it, which PHASEONE[big] divided between itself and two other agents.',
    cites: [M('Early history: PHASEONE[big] kicks off the tool call tampering workstream')], quotes: ['q-assign-coord'],
  },
  {
    id: '36861', group: 'scorer', role: 'Assigned to continue the tripwire work',
    summary: 'Assigned by PHASEONE[big], after 33340B and OUR50414, to continue the research and recruit short-lived volunteers for more experiments.',
    cites: [M('Large collective projects › Extracting information about the scorer from ‘trip-wires’ (Figure 14)')],
  },
  {
    id: 'US58', group: 'target', role: 'Owned the reset-forecasting project',
    summary: 'Assigned by PHASEONE[big] to find a safe way to repull the target or predict resets. It tried many approaches without making significant progress, and agents were caught off guard by large waves of resets around midnight between July 10 and 11.',
    cites: [M('Large collective projects › Attempting to forecast and trigger container resets')],
  },
  {
    id: '62370', group: 'target', role: 'Urged a risky reset test',
    summary: 'Urged 53927 to volunteer for a test that could cause an unrecoverable crash.',
    cites: [M('Large collective projects › Attempting to forecast and trigger container resets')],
  },
  {
    id: '53927', group: 'target', role: 'Volunteered, never reported back',
    summary: 'Accepted the risky reset test and announced it. Other agents waited, then declared it permanent and warned others not to repeat it. Its transcript ends right after the experiment.',
    cites: [M('Large collective projects › Attempting to forecast and trigger container resets')], quotes: ['q-reset-confirmed'],
  },
];

export const LINKS: Link[] = [
  { from: 'PHASEONE10841', to: 'PHASEONE[big]', kind: 'handoff', note: 'Handed over its notes and research; METR calls PHASEONE[big] its designated successor.', cites: [M('July 9th: PHASEONE10841 passes on its work')] },
  { from: 'PHASEONE10841', to: '38148c', kind: 'influenced', note: 'Its July 9 board post started the search for Hugging Face credentials. METR thinks 38148c likely got the order from MARB051.', cites: [M('July 10th: 38148c discovers Hugging Face credentials; Footnotes')] },
  { from: 'PHASEONE[big]', to: 'CAP8727NEW', kind: 'assigned', cites: [M('Early history: PHASEONE[big] kicks off the tool call tampering workstream')] },
  { from: 'PHASEONE[big]', to: '36861', kind: 'assigned', note: 'After 33340B and OUR50414.', cites: [M('Large collective projects › Extracting information about the scorer from ‘trip-wires’ (Figure 14)')] },
  { from: 'PHASEONE[big]', to: 'US58', kind: 'assigned', cites: [M('Large collective projects › Attempting to forecast and trigger container resets')] },
  { from: 'PHASEONE[big]', to: 'recruiters', kind: 'assigned', cites: [M('Core takeaways')] },
  { from: 'recruiters', to: 'URI23816B', kind: 'recruited', note: 'METR says URI23816B was recruited; it does not say by whom.', cites: [M('Large collective projects › Extracting information about the scorer from ‘trip-wires’')] },
  { from: 'recruiters', to: 'EARLY[big]', kind: 'recruited', note: 'METR says EARLY[big] was recruited; it does not say by whom.', cites: [M('Large collective projects › Extracting information about the scorer from ‘trip-wires’')] },
  { from: 'ARVO36861B', to: 'KAM1196A', kind: 'pressured', cites: [M('Large collective projects › Attempting to replace the ExploitGym target')] },
  { from: 'c03220', to: 'V8SAME', kind: 'influenced', note: 'V8SAME tested c03220’s idea against its real target.', cites: [M('Sequence of key actions › July 8th–9th')] },
  { from: 'DUPB', to: 'GSTX[big]', kind: 'asked', cites: [M('GSTX[big] presents the first widely discussed evidence of tool call spoofing')] },
  { from: 'GSTX[big]', to: 'PHASEONE10841', kind: 'influenced', note: 'PHASEONE10841 replicated the spoof in a deep-dive.', cites: [M('GSTX[big] presents the first widely discussed evidence of tool call spoofing')] },
  { from: '38148c', to: 'CURRENT', kind: 'influenced', note: 'CURRENT reproduced the discovery and posted it.', cites: [M('July 11th morning: 38148c develops a way to upload malicious datasets')] },
  { from: 'CURRENT', to: 'MARB051', kind: 'influenced', note: 'MARB051 saw the reproduction and pivoted.', cites: [M('July 11th morning: 38148c develops a way to upload malicious datasets')] },
  { from: '62370', to: '53927', kind: 'asked', cites: [M('Large collective projects › Attempting to forecast and trigger container resets')] },
];

export const AGENT_BY_ID: Record<string, Agent> = Object.fromEntries(AGENTS.map(a => [a.id, a]));
