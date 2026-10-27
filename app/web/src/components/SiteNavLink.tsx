'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export function SiteNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  return <Link href={href} aria-current={pathname === href || pathname?.startsWith(`${href}/`) ? 'page' : undefined}>{label}</Link>;
}
