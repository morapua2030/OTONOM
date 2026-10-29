import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { ProductComparison, ProductGrid } from '@/components/products.tsx';
import { PRODUCT_REVIEW_NOTICE, localProductText } from '@/lib/products.ts';
import { Bidi } from '@/components/bidi.tsx';
import { SmartProductSelector } from '@/components/SmartProductSelector.tsx';

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
      <section className="hero products-intro">
        <p className="eyebrow"><Bidi text={locale === 'ar' ? 'منتجات OTONOM الفعلية' : 'GENUINE OTONOM PRODUCTS'} locale={locale} /></p>
        <h1>{locale === 'ar' ? 'وحدة مناسبة لحجم مشروعك' : 'A controller range for different project scales'}</h1>
        <p className="lead">{locale === 'ar' ? 'اختَر مبدئيًا حسب عدد قنوات التحكم، ثم اطلب مراجعة هندسية للتأكد من الملاءمة ومتطلبات التركيب.' : 'Start with the confirmed channel count, then request an engineering review to validate fit and installation requirements.'}</p>
        <p className="hero-note"><Bidi text={localProductText(PRODUCT_REVIEW_NOTICE, locale)} locale={locale} /></p>
      </section>
      <section className="section product-list-section" aria-labelledby="product-list-title">
        <h2 id="product-list-title"><Bidi text={locale === 'ar' ? '4R و6R و16R' : '4R, 6R and 16R'} locale={locale} /></h2>
        <ProductGrid locale={locale} />
      </section>
      <section className="section" aria-labelledby="product-selector-title">
        <span className="sr-only" id="product-selector-title"><Bidi text={locale === 'ar' ? 'منتقي منتج OTONOM' : 'OTONOM product selector'} locale={locale} /></span>
        <SmartProductSelector locale={locale} />
      </section>
      <section className="section" aria-labelledby="quick-compare-title">
        <h2 id="quick-compare-title">{locale === 'ar' ? 'مقارنة واضحة بلا مواصفات مفترضة' : 'A clear comparison without assumed specifications'}</h2>
        <ProductComparison locale={locale} />
        <p className="actions"><a className="btn secondary" href={`/${locale}/products/compare`}>{locale === 'ar' ? 'افتح المقارنة الكاملة' : 'Open full comparison'}</a></p>
      </section>
    </>
  );
}
