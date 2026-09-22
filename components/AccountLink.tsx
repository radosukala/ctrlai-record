'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** "Your record" once someone has contributed or signed in; otherwise "Sign in". Loaded after the page, so pages stay fast. */
export function AccountLink({ className }: { className?: string }) {
  const pathname = usePathname();
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/me', { cache: 'no-store' })
      .then(response => response.json())
      .then(body => { if (!cancelled) setLabel(body.account || body.contributor ? 'Your record' : 'Sign in'); })
      .catch(() => { if (!cancelled) setLabel('Sign in'); });
    return () => { cancelled = true; };
  }, [pathname]);
  if (!label) return null;
  return <Link href={label === 'Sign in' ? '/signin' : '/me'} className={className} aria-current={pathname === '/me' || pathname === '/signin' ? 'page' : undefined}>{label}</Link>;
}
