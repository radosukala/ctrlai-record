'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavLinks({ items }: { items: { href: string; label: string; also?: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {items.map(item => {
        const active = pathname === item.href
          || (item.href !== '/' && pathname.startsWith(`${item.href}/`))
          || (item.also !== undefined && pathname.startsWith(item.also));
        return (
          <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
