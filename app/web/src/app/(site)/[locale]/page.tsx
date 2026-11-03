import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { pageMetadata, summarise } from '@/lib/seo.ts';
import { HomeMix, HOME_MIX } from '@/components/home-mix.tsx';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMetadata({ locale, path: '/', title: HOME_MIX.title[locale], description: summarise(HOME_MIX.lead[locale]) });
}

export default async function Home({ params }: P) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <HomeMix locale={locale as Locale} />;
}
