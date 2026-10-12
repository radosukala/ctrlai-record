import Link from 'next/link';

/**
 * The mark: Ctrl, then AI on a square of highlighter yellow, the same yellow that marks every quotation we found in its
 * source. Set in the site's own sans, so it is text, not a picture. The favicon (app/icon.svg) is the yellow square alone.
 */
export function BrandMark() {
  return (
    <span className="mark" aria-hidden="true">
      <span>Ctrl</span>
      <span className="mark-ai">AI</span>
    </span>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="wordmark" aria-label="Ctrl AI home">
      <BrandMark />
    </Link>
  );
}
