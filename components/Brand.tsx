import Link from 'next/link';

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i /><b /><i />
    </span>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="wordmark" aria-label="Ctrl AI home">
      <BrandMark />
      <span>ctrl<sup>AI</sup></span>
    </Link>
  );
}
