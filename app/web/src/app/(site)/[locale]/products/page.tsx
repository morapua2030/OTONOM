import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { ControllerRows } from '@/components/products.tsx';
import { SwashText } from '@/components/v2.tsx';
import { PRODUCT_REVIEW_NOTICE, localProductText } from '@/lib/products.ts';
import { Bidi, isolateText } from '@/components/bidi.tsx';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMetadata({
    locale,
    path: '/products',
    title: locale === 'ar' ? 'وحدات تحكم OTONOM' : 'OTONOM smart controllers',
    description: locale === 'ar' ? 'قارن وحدات OTONOM 4R و6R و16R باستخدام صور المنتجات الفعلية وعدد القنوات المؤكد.' : 'Compare OTONOM 4R, 6R and 16R controllers using genuine product imagery and confirmed channel counts.',
  });
}

export default async function ProductsPage({ params }: P) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const locale = value as Locale;
  return (
    <>
      <section className="v2-page-head products-intro">
        <span className="v2-eyebrow"><Bidi text={locale === 'ar' ? 'وحدات تحكم OTONOM' : 'OTONOM Controllers'} locale={locale} /></span>
        <h1><SwashText text={locale === 'ar' ? 'وحدة تحكم لكل مساحة.' : 'One controller for every room size.'} word={locale === 'ar' ? 'مساحة.' : 'controller'} locale={locale} /></h1>
        <p className="hero-note"><Bidi text={localProductText(PRODUCT_REVIEW_NOTICE, locale)} locale={locale} /></p>
      </section>
      <section className="v2-section product-list-section" aria-labelledby="product-list-title">
        <h2 id="product-list-title" className="sr-only">{isolateText(locale === 'ar' ? '4R و6R و16R' : '4R, 6R and 16R', locale)}</h2>
        <ControllerRows locale={locale} />
      </section>
    </>
  );
}
