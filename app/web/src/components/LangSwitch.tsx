'use client';
import { usePathname } from 'next/navigation';

/** Switches to the same page in the other locale (falls back to the other locale's home page). */
export function LangSwitch({ locale, label }: { locale: 'ar' | 'en'; label: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const other = locale === 'ar' ? 'en' : 'ar';
  const rest = pathname.replace(/^\/(ar|en)(?=\/|$)/, '');
  return (
    <a href={`/${other}${rest}`} lang={other} hrefLang={other}>
      {label}
    </a>
  );
}
