'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n.ts';

type LinkItem = { title: string; href: string };

export function ServiceNavMenu({ locale, label, items }: { locale: Locale; label: string; items: readonly LinkItem[] }) {
  const pathname = usePathname();
  const base = `/${locale}/services`;
  const active = pathname === base || pathname.startsWith(`${base}/`);
  return (
    <details className="service-nav-menu">
      <summary aria-current={active ? 'page' : undefined}>{label}</summary>
      <div className="service-nav-panel">
        <Link href={base} aria-current={pathname === base ? 'page' : undefined}>{locale === 'ar' ? 'كل الخدمات' : 'All services'}</Link>
        {items.map((item) => {
          const href = `/${locale}${item.href}`;
          return <Link href={href} aria-current={pathname === href ? 'page' : undefined} key={item.href}>{item.title}</Link>;
        })}
      </div>
    </details>
  );
}
