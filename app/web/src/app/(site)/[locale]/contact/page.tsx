import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { smartHomePackage } from '@/lib/smart-home-packages.ts';
import { ContactBooking } from '@/components/ContactBooking.tsx';
import { loadSiteContent } from '@/lib/site-content.ts';
import { bookingVisible } from '@/lib/leads.ts';
import { issueBookingToken } from '@/lib/booking-token.ts';
import { BookingForm } from '@/components/BookingForm.tsx';
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

/**
 * Design v2 "04 Contact" (DR-101): phone and WhatsApp. The booking form (final release, owner 2026-11-04) is rendered
 * only when the OWNER approved the privacy text AND enabled intake in the admin; otherwise the page is unchanged.
 */
export default async function ContactPage({ params, searchParams }: P) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const locale = value as Locale;
  const query = await searchParams;
  const requested = Array.isArray(query.package) ? query.package[0] : query.package;
  const initialPackage = smartHomePackage(requested)?.id ?? null;
  const copy = COPY[locale];
  const content = await loadSiteContent();
  const packages = content.packages.map((entry) => ({ id: entry.id, label: entry.name.en }));
  const showForm = bookingVisible({ privacyApproved: content.privacy.approved, intakeEnabled: content.intakeEnabled });
  return (
    <>
      <section className="v2-contact">
        <div className="v2-contact-copy">
          <span className="v2-eyebrow">{copy.eyebrow}</span>
          <h1><SwashText text={copy.title} word={copy.swash} locale={locale} /></h1>
          <p className="v2-lead"><Bidi text={copy.body} locale={locale} /></p>
          <p className="v3-address" data-testid="contact-address"><Bidi text={content.contact.address[locale]} locale={locale} /></p>
        </div>
        <ContactBooking locale={locale} initialPackage={initialPackage} contact={content.contact} packages={packages} />
      </section>
      {showForm ? (
        <section className="v2-section booking-section" aria-label={locale === 'ar' ? 'احجز زيارة' : 'Book a visit'}>
          <BookingForm locale={locale} token={issueBookingToken()} packages={packages} initialPackage={initialPackage} source="contact" contact={content.contact} privacyHref={`/${locale}/legal/privacy`} />
        </section>
      ) : null}
    </>
  );
}
