import Link from 'next/link';

/**
 * The mark: two keycaps, ctrl and AI. A chord you press. It is set in the site's own sans, so it is text,
 * not a picture, and it stays sharp at any size.
 */
export function BrandMark() {
  return (
    <span className="wordmark-keys" aria-hidden="true">
      <span className="cap">ctrl</span>
      <span className="cap">AI</span>
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
