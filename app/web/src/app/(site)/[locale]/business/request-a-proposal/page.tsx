import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import type { Metadata } from 'next';
import { RfqForm } from '@/components/RfqForm.tsx';
import { Bidi } from '@/components/bidi.tsx';
import { PHONE_DISPLAY } from '@/lib/contact.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { publicRfqEnabled } from '@/lib/server.ts';
import { SwashText } from '@/components/v2.tsx';

const COPY = {
  ar: { title: 'اطلب عرضًا لمشروعك', partner: 'طلب شراكة', body: 'أرسل تفاصيل مشروعك وسيراجعها مهندس من OTONOM.' },
  en: { title: 'Request a proposal', partner: 'Partner application', body: 'Send your project details and an OTONOM engineer will review them.' },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMetadata({ locale, path: '/business/request-a-proposal', title: COPY[locale].title, description: COPY[locale].body });
}

export const dynamic = 'force-dynamic';

export default async function RequestProposal({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ kind?: string }> }) {
  const { locale: l } = await params;
  if (!isLocale(l)) notFound();
  const locale = l as Locale;
  const kind = (await searchParams).kind === 'PARTNER' ? 'PARTNER' : 'RFQ';
  return (
    <>
      <section className="hero">
        <h1><SwashText text={kind === 'PARTNER' ? COPY[locale].partner : COPY[locale].title} locale={locale} /></h1>
        <p>
          <Bidi text={COPY[locale].body} locale={locale} />
        </p>
      </section>
      {publicRfqEnabled() ? (
        <RfqForm locale={locale} kind={kind} />
      ) : (
        <section className="section" data-testid="rfq-disabled" aria-labelledby="rfq-disabled-title">
          <h2 id="rfq-disabled-title">{locale === 'ar' ? 'استقبال الطلبات عبر الموقع غير مفعّل' : 'Online proposal intake is not enabled'}</h2>
          <p>
            <Bidi
              text={locale === 'ar'
                ? `لا يُجمع أي اسم أو بريد أو هاتف من هذه الصفحة. لطلب عرض، اتصل بـOTONOM أو راسلها عبر واتساب على الرقم ${PHONE_DISPLAY}.`
                : `This page does not collect names, e-mail addresses or phone numbers. To request a proposal, call or message OTONOM on WhatsApp at ${PHONE_DISPLAY}.`}
              locale={locale}
            />
          </p>
        </section>
      )}
    </>
  );
}
