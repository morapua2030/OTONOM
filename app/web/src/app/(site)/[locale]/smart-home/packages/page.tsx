import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { SmartHomePackages } from '@/components/SmartHomePackages.tsx';

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
      <section className="hero compact-hero package-hero">
        <p className="eyebrow">OTONOM SMART HOME 2026</p>
        <h1>{locale === 'ar' ? 'ثلاث باقات واضحة، وبداية هندسية مسؤولة' : 'Three clear packages, one responsible engineering start'}</h1>
        <p className="lead">
          {locale === 'ar'
            ? 'قارن المكونات والأسعار المعتمدة، ثم استخدم أداة بناء المشروع لتوثيق احتياجاتك. الباقة المختارة نقطة بداية وليست تأكيدًا للملاءمة أو عرضًا نهائيًا.'
            : 'Compare approved contents and prices, then use the Project Builder to document your needs. A selected package is a starting point, not a fit confirmation or final quotation.'}
        </p>
      </section>
      <section className="section" aria-labelledby="package-list-title">
        <h2 id="package-list-title">{locale === 'ar' ? 'Premium وPlus وEssential' : 'Premium, Plus and Essential'}</h2>
        <SmartHomePackages locale={locale} />
      </section>
    </>
  );
}
