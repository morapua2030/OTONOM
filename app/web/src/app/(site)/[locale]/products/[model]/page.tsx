import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { pageMetadata, summarise } from '@/lib/seo.ts';
import { ProductDetail } from '@/components/products.tsx';
import { localProductText, productByModel } from '@/lib/products.ts';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ locale: string; model: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, model } = await params;
  const product = productByModel(model);
  if (!isLocale(locale) || !product) return {};
  return pageMetadata({ locale, path: `/products/${model}`, title: product.name, description: summarise(localProductText(product.summary, locale)) });
}

export default async function ProductPage({ params }: P) {
  const { locale: value, model } = await params;
  const product = productByModel(model);
  if (!isLocale(value) || !product) notFound();
  const locale = value as Locale;
  return (
    <>
      <nav className="breadcrumbs" aria-label={locale === 'ar' ? 'مسار الصفحة' : 'Breadcrumb'}>
        <a href={`/${locale}`}>{locale === 'ar' ? 'الرئيسية' : 'Home'}</a>
        <a href={`/${locale}/products`}>{locale === 'ar' ? 'المنتجات' : 'Products'}</a>
        <span aria-current="page"><bdi dir="ltr">{product.model.toUpperCase()}</bdi></span>
      </nav>
      <ProductDetail locale={locale} product={product} />
    </>
  );
}
