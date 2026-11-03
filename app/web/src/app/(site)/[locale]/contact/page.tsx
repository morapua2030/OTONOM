import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { smartHomePackage } from '@/lib/smart-home-packages.ts';
import { ContactBooking } from '@/components/ContactBooking.tsx';
import { SwashText } from '@/components/v2.tsx';
import { Bidi } from '@/components/bidi.tsx';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const COPY = {
  ar: { eyebrow: 'احجز زيارة', title: 'خلّينا نخطط لبيتك الذكي.', swash: 'الذكي.', body: 'كلّمنا أو ابعتلنا على واتساب. اختار الباقة الأول والرسالة هتكون جاهزة.' },
  en: { eyebrow: 'Book a visit', title: 'Let’s plan your smart home.', swash: 'smart home.', body: 'Call us or message us on WhatsApp. Pick a package first and the WhatsApp message is written for you.' },
};

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMetadata({ locale, path: '/contact', title: COPY[locale].title, description: COPY[locale].body });
}

/** Design v2 "04 Contact" (DR-101): phone and WhatsApp only; no form, backend or storage. Colloquial Arabic only (one register per page). */
export default async function ContactPage({ params, searchParams }: P) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const locale = value as Locale;
  const query = await searchParams;
  const requested = Array.isArray(query.package) ? query.package[0] : query.package;
  const initialPackage = smartHomePackage(requested)?.id ?? null;
  const copy = COPY[locale];
  return (
    <>
      <section className="v2-contact">
        <div className="v2-contact-copy">
          <span className="v2-eyebrow">{copy.eyebrow}</span>
          <h1><SwashText text={copy.title} word={copy.swash} locale={locale} /></h1>
          <p className="v2-lead"><Bidi text={copy.body} locale={locale} /></p>
        </div>
        <ContactBooking locale={locale} initialPackage={initialPackage} />
      </section>
    </>
  );
}
