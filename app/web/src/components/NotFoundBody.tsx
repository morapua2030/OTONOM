'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { NOT_FOUND_TITLE, notFoundTitle } from '../lib/not-found.ts';

/** Body of the localized 404 (the locale comes from the path; an unknown locale is rewritten to /ar by the proxy). */
export function NotFoundBody() {
  const locale = usePathname().split('/')[1] === 'en' ? 'en' : 'ar';
  // The server HTML already carries the localized title (not-found.tsx generateMetadata), but in Next 16 the RSC payload
  // of a 404 still holds the layout's default "OTONOM" and hydration puts it back. Re-apply the same plain-text title.
  useEffect(() => {
    document.title = notFoundTitle(locale);
  }, [locale]);
  return (
    <section className="not-found" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <p className="eyebrow">404</p>
      <h1>{NOT_FOUND_TITLE[locale]}</h1>
      <p>{locale === 'ar' ? 'قد يكون الرابط قديمًا أو أن الصفحة المطلوبة غير متاحة.' : 'The link may be outdated or the requested page may be unavailable.'}</p>
      <div className="actions">
        <a className="btn" href={`/${locale}`}>{locale === 'ar' ? 'العودة للرئيسية' : 'Back to home'}</a>
        <a className="btn secondary" href={`/${locale}/contact`}>{locale === 'ar' ? 'تواصل معنا' : 'Contact us'}</a>
      </div>
    </section>
  );
}
