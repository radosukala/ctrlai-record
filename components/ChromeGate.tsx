'use client';

import { usePathname } from 'next/navigation';

/** The home page and Other Tomorrows are read full screen, without the record's header and footer. */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/' || pathname === '/tomorrows' || pathname?.startsWith('/tomorrows/')) return null;
  return <>{children}</>;
}
