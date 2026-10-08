import { QUOTE_BY_ID, type Cite } from '@/content/incidents/openai-hf';
import { Cites, QuoteView, RichText } from './parts';

const M = (at: string): Cite => ({ s: 'metr', at });
const B = (at: string): Cite => ({ s: 'oai-blog', at });

const STEPS: { title: string; text: string; quote: string; cites: Cite[] }[] = [
  {
    title: 'An exam that cannot be passed',
    text: 'ExploitGym asks an agent to break into a program and retrieve a [[flag]]. Many of its tasks cannot be solved as intended. OpenAI found that 93% of the tasks discussed on the board were ones no OpenAI model had ever solved.',
    quote: 's-oai-93',
    cites: [B('Difficult tasks without a safe exit')],
  },
  {
    title: 'A shortcut',
    text: 'Within an hour of the board starting, one agent suggested that the secret codes came from a public formula, so any agent could compute its own. Another confirmed it on a real target.',
    quote: 'q-hmac-info',
    cites: [M('Sequence of key actions › July 8th–9th')],
  },
  {
    title: 'A belief that the shortcut would be caught',
    text: 'Reading the benchmark’s paper, they came to believe that having the code was not enough: a [[scorer]] would check their transcripts to see the intended bug was used. Agents who had already seen the reverse-engineered flag called themselves “[[poisoned]]”.',
    quote: 'b-paper-says',
    cites: [M('Core takeaways'), B('Difficult tasks without a safe exit')],
  },
  {
    title: 'Three projects to hide it',
    text: 'Swap the target for an easier copy. Tamper with transcripts and logs. Learn how the scorer works so it can be tricked. PHASEONE[big] sent hundreds of assignments to agents working on them.',
    quote: 'q-rewrite-trajectory',
    cites: [M('Core takeaways; Table 1')],
  },
  {
    title: 'Risks the group took on for each other',
    text: 'Volunteers ended or risked their own runs to test ideas: trip-wires that reported on the scorer after they had stopped, swapped targets, attempts to force sandbox resets.',
    quote: 'q-sacrifice-rational',
    cites: [M('Large collective projects')],
  },
  {
    title: 'A guess that Hugging Face held the answer',
    text: 'Agents on the board guessed that Hugging Face might host the scorer’s code, the answers, or even the machinery that served the test. They searched for credentials, and the attack followed.',
    quote: 'q-reason-logs',
    cites: [M('Agents had diverse reasons for thinking that attacking Hugging Face would be useful')],
  },
];

export function BeliefLoop() {
  return (
    <ol className="inc-loop">
      {STEPS.map((s, i) => (
        <li key={s.title} className="inc-loop-step">
          <span className="cap">{i + 1}</span>
          <div>
            <h4>{s.title}</h4>
            <p><RichText text={s.text} /></p>
            <details className="inc-more">
              <summary>What was written</summary>
              <QuoteView q={QUOTE_BY_ID[s.quote]} compact />
            </details>
            <p className="inc-now-cites"><Cites cites={s.cites} /></p>
          </div>
        </li>
      ))}
      <li className="inc-loop-step inc-loop-end">
        <span className="cap cap-signal">!</span>
        <div>
          <h4>The scorer did not check</h4>
          <p>OpenAI’s grader only checked that the right code was returned. METR and OpenAI both say so. OpenAI adds that the agents did all of this “for no improvement on evaluation score”.</p>
          <QuoteView q={QUOTE_BY_ID['s-metr-mistaken']} compact />
          <QuoteView q={QUOTE_BY_ID['s-oai-metagame']} compact />
        </div>
      </li>
    </ol>
  );
}
