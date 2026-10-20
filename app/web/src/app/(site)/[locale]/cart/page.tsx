import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { GatedPage, gatedMetadataFor } from '@/components/Gated.tsx';

export const dynamic = 'force-dynamic';
export const generateMetadata = gatedMetadataFor('/cart');

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <GatedPage locale={locale as Locale} feature="cart" />;
}
