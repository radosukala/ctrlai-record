import type { Status } from '@/content/accord';
import { STRINGS } from '@/content/accord/strings';
import type { Lang } from '@/content/lang';

/**
 * The status as a shape and a word. The shape fills as the evidence gets stronger; "contradicted" is a square with a bar
 * through it. Color is never the only signal (AGENTS.md), and the word is always there.
 */
export function StatusMark({ status, lang = 'en', label = true, className }: { status: Status; lang?: Lang; label?: boolean; className?: string }) {
  const word = STRINGS[lang].status[status];
  return (
    <span className={`acc-status acc-status-${status}${className ? ` ${className}` : ''}`}>
      <span className="acc-mark" aria-hidden="true" />
      {label ? <span className="acc-status-word">{word}</span> : <span className="sr-only">{word}</span>}
    </span>
  );
}
