'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { localeSwitchHref } from '../lib/locale-switch.ts';

/** Switches to the same page in the other locale, keeping only allow-listed state (see `localeSwitchHref`). */
export function LangSwitch({ locale, label }: { locale: 'ar' | 'en'; label: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const other = locale === 'ar' ? 'en' : 'ar';
  const [href, setHref] = useState(() => localeSwitchHref(pathname, '', '', other));
  useEffect(() => {
    const sync = () => setHref(localeSwitchHref(pathname, location.search, location.hash, other));
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    window.addEventListener('otonom:portfolio-query', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('otonom:portfolio-query', sync);
    };
  }, [pathname, other]);
  return (
    <a href={href} lang={other} hrefLang={other}>
      {label}
    </a>
  );
}
