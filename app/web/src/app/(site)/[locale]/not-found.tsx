'use client';
import { usePathname } from 'next/navigation';

export default function LocalizedNotFound() {
  const locale = usePathname().split('/')[1] === 'en' ? 'en' : 'ar';
  return (
    <section className="not-found" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <p className="eyebrow">404</p>
      <h1>{locale === 'ar' ? 'الصفحة غير موجودة' : 'Page not found'}</h1>
      <p>{locale === 'ar' ? 'قد يكون الرابط قديمًا أو أن الصفحة المطلوبة غير متاحة.' : 'The link may be outdated or the requested page may be unavailable.'}</p>
      <div className="actions">
        <a className="btn" href={`/${locale}`}>{locale === 'ar' ? 'العودة للرئيسية' : 'Back to home'}</a>
        <a className="btn secondary" href={`/${locale}/business/request-a-proposal`}>{locale === 'ar' ? 'اطلب عرضًا' : 'Request a proposal'}</a>
      </div>
    </section>
  );
}
