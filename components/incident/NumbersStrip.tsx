import { NUMBERS } from '@/content/incidents/openai-hf';
import { Cites } from './parts';

export function NumbersStrip() {
  return (
    <>
      <ul className="inc-numbers" aria-label="The incident in numbers">
        {NUMBERS.map(n => (
          <li key={n.id}>
            <b>{n.value}</b>
            <span>{n.label}</span>
            <Cites cites={[n.cite]} />
          </li>
        ))}
      </ul>
      <p className="inc-fine inc-numbers-key">
        The letter in each box says where a number comes from: <span className="inc-badge inc-badge-O">O</span> OpenAI’s blog post, <span className="inc-badge inc-badge-T">T</span> OpenAI’s technical report, <span className="inc-badge inc-badge-M">M</span> METR and Redwood Research, <span className="inc-badge inc-badge-H">H</span> Hugging Face.
      </p>
    </>
  );
}
