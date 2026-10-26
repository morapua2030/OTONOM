import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { pageMetadata, summarise } from '@/lib/seo.ts';
import { CorporateHome } from '@/components/corporate.tsx';
import { wave } from '@/lib/wave1.ts';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = wave(locale);
  return pageMetadata({ locale, path: '/', title: d.hero.title, description: summarise(d.hero.body) });
}

export default async function Home({ params }: P) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <CorporateHome locale={locale as Locale} />;
}
