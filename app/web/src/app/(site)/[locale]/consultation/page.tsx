import { notFound } from 'next/navigation';
import { isLocale, t, type Locale } from '@/lib/i18n.ts';
import type { Metadata } from 'next';
import { RfqForm } from '@/components/RfqForm.tsx';
import { Bidi } from '@/components/bidi.tsx';
import { PHONE_DISPLAY } from '@/lib/contact.ts';
import { pageMetadata, summarise } from '@/lib/seo.ts';
import { publicRfqEnabled } from '@/lib/server.ts';
import { SwashText } from '@/components/v2.tsx';

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
        <h1><SwashText text={d.pages.consultation.title} locale={locale} /></h1>
        <p>
          <Bidi text={d.pages.consultation.body} locale={locale} />
        </p>
      </section>
      {publicRfqEnabled() ? (
        <RfqForm locale={locale} kind="CONSULTATION" />
      ) : (
        <section className="section" data-testid="consultation-disabled" aria-labelledby="consultation-disabled-title">
          <h2 id="consultation-disabled-title">{locale === 'ar' ? 'حجز الاستشارات عبر الموقع غير مفعّل' : 'Online consultation booking is not enabled'}</h2>
          <p><Bidi text={locale === 'ar' ? `لا تجمع هذه الصفحة اسمًا أو بريدًا أو هاتفًا. لحجز استشارة، اتصل بـOTONOM أو راسلها عبر واتساب على الرقم ${PHONE_DISPLAY}.` : `This page does not collect a name, email address or phone number. To book a consultation, call or message OTONOM on WhatsApp at ${PHONE_DISPLAY}.`} locale={locale} /></p>
          <p><a className="btn secondary" href={`/${locale}/build-with-us`}>{locale === 'ar' ? 'حضّر موجز مشروعك' : 'Prepare your project brief'}</a></p>
        </section>
      )}
    </>
  );
}
