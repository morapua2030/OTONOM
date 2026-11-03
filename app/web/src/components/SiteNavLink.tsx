'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
/** `exact` limits the active state to the page itself (used for Home, whose path prefixes every page). */
export function SiteNavLink({ href, label, exact = false }: { href: string; label: string; exact?: boolean }) {
  const pathname = usePathname();
  const active = pathname === href || (!exact && pathname?.startsWith(`${href}/`));
  return <Link href={href} aria-current={active ? 'page' : undefined}>{label}</Link>;
}
