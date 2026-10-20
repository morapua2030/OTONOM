import { notFound } from 'next/navigation';
import { isLocale, t, type Locale } from '@/lib/i18n.ts';
import type { Metadata } from 'next';
import { RfqForm } from '@/components/RfqForm.tsx';
import { Bidi } from '@/components/bidi.tsx';
import { pageMetadata, summarise } from '@/lib/seo.ts';

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
      <RfqForm locale={locale} kind="CONSULTATION" />
    </>
  );
}
