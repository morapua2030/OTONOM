import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { SmartHomePackages } from '@/components/SmartHomePackages.tsx';
import { Bidi } from '@/components/bidi.tsx';
import { SwashText } from '@/components/v2.tsx';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMetadata({
    locale,
    path: '/smart-home/packages',
    title: locale === 'ar' ? 'باقات OTONOM للمنزل الذكي' : 'OTONOM smart-home packages',
    description: locale === 'ar'
      ? 'قارن باقات Premium وPlus وEssential ومكوناتها وأسعارها المعلنة، ثم أنشئ موجز مشروع دون دفع إلكتروني.'
      : 'Compare the published Premium, Plus and Essential package contents and prices, then build a project brief without online payment.',
  });
}

export default async function SmartHomePackagesPage({ params }: P) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const locale = value as Locale;
  return (
    <>
      <nav className="breadcrumbs" aria-label={locale === 'ar' ? 'مسار الصفحة' : 'Breadcrumb'}>
        <a href={`/${locale}`}>{locale === 'ar' ? 'الرئيسية' : 'Home'}</a>
        <a href={`/${locale}/services/smart-home-automation`}>{locale === 'ar' ? 'المنزل الذكي' : 'Smart home'}</a>
        <span aria-current="page">{locale === 'ar' ? 'الباقات' : 'Packages'}</span>
      </nav>
      <section className="v2-page-head package-hero">
        <span className="v2-eyebrow" dir="ltr">OTONOM Smart Home · 2026</span>
        <h1><SwashText text={locale === 'ar' ? 'باقات المنزل الذكي' : 'Smart Home Packages'} word={locale === 'ar' ? 'باقات' : 'Packages'} locale={locale} /></h1>
        <p className="v2-lead">{locale === 'ar' ? 'ثلاث باقات، لكل باقة مكوناتها وسعرها الإجمالي.' : 'Three packages, each with its included items and total price.'}</p>
      </section>
      <section className="v2-section" aria-labelledby="package-list-title">
        <h2 id="package-list-title" className="sr-only"><Bidi text={locale === 'ar' ? 'Premium وPlus وEssential' : 'Premium, Plus and Essential'} locale={locale} /></h2>
        <SmartHomePackages locale={locale} comparison />
      </section>
    </>
  );
}
