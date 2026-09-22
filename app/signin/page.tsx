import type { Metadata } from 'next';
import Link from 'next/link';
import { KeepRecordForm } from '@/components/KeepRecordForm';
import { safeNextPath } from '@/lib/auth';
import { MeClient } from '../me/MeClient';

export const metadata: Metadata = { title: 'Keep your record', robots: { index: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <section className="test-hero">
      <div className="shell split">
        <div>
          <span className="eyebrow"><span className="dot" /> Optional account</span>
          <h1 className="title">Keep your record.</h1>
          <p className="lede">
            You never need an account to run or check a test. An account keeps your contributions together across devices,
            lets you withdraw any of them later, and protects your contributor number if this browser forgets you.
          </p>
          <ul className="bullets mt-24">
            <li>No password: we email you a link that works once.</li>
            <li>Your email is never shown, shared or published. You stay a contributor number or a name you choose.</li>
            <li>Delete the account at any time, with or without withdrawing your runs.</li>
          </ul>
          <p className="small muted mt-24"><Link href="/about#privacy">What we keep, and what we don’t</Link></p>
        </div>
        <div className="stack" style={{ ['--stack' as string]: '16px' }}>
          <div className="card">
            <KeepRecordForm next={safeNextPath(next)} />
          </div>
          <MeClient mode="restore" />
        </div>
      </div>
    </section>
  );
}
