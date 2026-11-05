import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { ProductV3 } from '@/components/v3-pages.tsx';
import { SITE_COPY } from '@/lib/site-copy.ts';
import { productByModel } from '@/lib/products.ts';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ locale: string; model: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, model } = await params;
  const product = productByModel(model);
  if (!isLocale(locale) || !product) return {};
  const copy = SITE_COPY[locale].prod[product.model.toUpperCase() as '16R' | '4R' | '6R'];
  return pageMetadata({ locale, path: `/products/${model}`, title: copy.h1, description: copy.line });
}

export default async function ProductPage({ params }: P) {
  const { locale: value, model } = await params;
  const product = productByModel(model);
  if (!isLocale(value) || !product) notFound();
  const locale = value as Locale;
  return <ProductV3 locale={locale} model={product.model} />;
}
