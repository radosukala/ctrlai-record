import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page">
      <div className="shell">
        <header className="hero">
          <div className="hero-main">
            <p className="dateline"><b>Not found</b></p>
            <h1 className="headline">Nothing here.</h1>
            <p className="lede">The link may be mistyped, or it pointed to an earlier version of this site.</p>
            <p><Link href="/" className="key key-primary">This week</Link> <Link href="/hall-of-fame" className="key">Hall of Fame</Link></p>
          </div>
        </header>
      </div>
    </div>
  );
}
