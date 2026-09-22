import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="test-hero">
      <div className="shell">
        <span className="eyebrow"><span className="dot" /> Not found</span>
        <h1 className="title">Nothing on the record here.</h1>
        <p className="lede">The page may have moved, or the link may be mistyped. Runs keep their address even when withdrawn, so a run link that 404s never existed.</p>
        <div className="actions mt-24"><Link href="/" className="btn btn-primary">Home</Link><Link href="/tests" className="btn btn-ghost">Run a test</Link></div>
      </div>
    </section>
  );
}
