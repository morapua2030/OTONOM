import { notFound } from 'next/navigation';
import { isLocale, t, type Locale } from '@/lib/i18n.ts';
import type { Metadata } from 'next';
import { RfqForm } from '@/components/RfqForm.tsx';
import { Bidi } from '@/components/bidi.tsx';
import { pageMetadata, summarise } from '@/lib/seo.ts';
import { publicRfqEnabled } from '@/lib/server.ts';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = t(locale);
  return pageMetadata({ locale, path: '/consultation', title: d.pages.consultation.title, description: summarise(d.pages.consultation.body) });
}

export default async function Consultation({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: l } = await params;
  if (!isLocale(l)) notFound();
  const locale = l as Locale;
  const d = t(locale);
  return (
    <>
      <section className="hero">
        <h1>{d.pages.consultation.title}</h1>
        <p>
          <Bidi text={d.pages.consultation.body} locale={locale} />
        </p>
      </section>
      {publicRfqEnabled() ? (
        <RfqForm locale={locale} kind="CONSULTATION" />
      ) : (
        <section className="section" data-testid="consultation-disabled" aria-labelledby="consultation-disabled-title">
          <h2 id="consultation-disabled-title">{locale === 'ar' ? 'حجز الاستشارات عبر الموقع غير مفعّل' : 'Online consultation booking is not enabled'}</h2>
          <p>{locale === 'ar' ? 'لا تجمع هذه الصفحة اسمًا أو بريدًا أو هاتفًا. استخدم قناة OTONOM الموثوقة المعروفة لديك حتى اعتماد إشعار الخصوصية وسياسة الاحتفاظ.' : 'This page does not collect a name, email address or phone number. Use an existing verified OTONOM contact channel until the privacy notice and retention policy are approved.'}</p>
          <p><a className="btn secondary" href={`/${locale}/build-with-us`}>{locale === 'ar' ? 'حضّر موجز مشروعك' : 'Prepare your project brief'}</a></p>
        </section>
      )}
    </>
  );
}
