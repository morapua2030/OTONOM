'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { portfolioQuery, portfolioSearch } from '../lib/portfolio.ts';

/** Switches to the same page in the other locale (falls back to the other locale's home page). */
export function LangSwitch({ locale, label }: { locale: 'ar' | 'en'; label: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const other = locale === 'ar' ? 'en' : 'ar';
  const rest = pathname.replace(/^\/(ar|en)(?=\/|$)/, '');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(location.search);
      setSearch(rest === '/projects' ? portfolioSearch(portfolioQuery({ category: params.get('category'), q: params.get('q') })) : '');
    };
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener('otonom:portfolio-query', sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('otonom:portfolio-query', sync); };
  }, [rest]);
  return (
    <a href={`/${other}${rest}${search}`} lang={other} hrefLang={other}>
      {label}
    </a>
  );
}
