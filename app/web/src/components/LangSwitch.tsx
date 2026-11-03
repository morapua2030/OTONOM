'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BUILDER_QUERY_EVENT } from '../lib/builder-query.ts';
import { localeSwitchHref } from '../lib/locale-switch.ts';

/** Switches to the same page in the other locale, keeping only allow-listed state (see `localeSwitchHref`). */
export function LangSwitch({ locale, label, name, className }: { locale: 'ar' | 'en'; label: string; name?: string; className?: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const other = locale === 'ar' ? 'en' : 'ar';
  const [href, setHref] = useState(() => localeSwitchHref(pathname, '', '', other));
  useEffect(() => {
    const sync = () => setHref(localeSwitchHref(pathname, location.search, location.hash, other));
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    window.addEventListener('otonom:portfolio-query', sync);
    window.addEventListener(BUILDER_QUERY_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('otonom:portfolio-query', sync);
      window.removeEventListener(BUILDER_QUERY_EVENT, sync);
    };
  }, [pathname, other]);
  return (
    <a href={href} lang={other} hrefLang={other} aria-label={name} className={className}>
      {label}
    </a>
  );
}
