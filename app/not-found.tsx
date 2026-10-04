import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="read page">
      <section className="hero-text">
        <span className="eyebrow">Not found</span>
        <h1 className="display">Nothing here.</h1>
        <p className="lede">The link may be mistyped, or it pointed to an earlier version of this site.</p>
        <p><Link href="/" className="btn btn-primary">This week</Link> <Link href="/hall-of-fame" className="btn btn-ghost">Hall of Fame</Link></p>
      </section>
    </div>
  );
}
