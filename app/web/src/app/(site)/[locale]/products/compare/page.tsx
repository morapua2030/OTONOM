import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { ProductComparison } from '@/components/products.tsx';
import { PRODUCT_REVIEW_NOTICE, localProductText } from '@/lib/products.ts';
import { Bidi } from '@/components/bidi.tsx';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMetadata({
    locale,
    path: '/products/compare',
    title: locale === 'ar' ? 'قارن وحدات OTONOM' : 'Compare OTONOM controllers',
    description: locale === 'ar' ? 'مقارنة 4R و6R و16R حسب عدد القنوات المؤكد وصور المنتجات الفعلية.' : 'Compare 4R, 6R and 16R by confirmed channel count and genuine product imagery.',
  });
}

export default async function ComparePage({ params }: P) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const locale = value as Locale;
  return (
    <>
      <nav className="breadcrumbs" aria-label={locale === 'ar' ? 'مسار الصفحة' : 'Breadcrumb'}>
        <a href={`/${locale}`}>{locale === 'ar' ? 'الرئيسية' : 'Home'}</a>
        <a href={`/${locale}/products`}>{locale === 'ar' ? 'المنتجات' : 'Products'}</a>
        <span aria-current="page">{locale === 'ar' ? 'المقارنة' : 'Compare'}</span>
      </nav>
      <section className="hero compact-hero">
        <p className="eyebrow">{locale === 'ar' ? 'مقارنة مسؤولة' : 'RESPONSIBLE COMPARISON'}</p>
        <h1>{locale === 'ar' ? 'قارن عدد القنوات، ثم راجع التصميم' : 'Compare channel counts, then validate the design'}</h1>
        <p className="lead"><Bidi text={localProductText(PRODUCT_REVIEW_NOTICE, locale)} locale={locale} /></p>
      </section>
      <section className="section"><ProductComparison locale={locale} /></section>
    </>
  );
}
