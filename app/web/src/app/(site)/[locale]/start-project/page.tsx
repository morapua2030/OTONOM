import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { INNER } from '@/lib/site-copy-inner.ts';
import { initialStartSelection } from '@/lib/start-message.ts';
import { StartProject } from '@/components/StartProject.tsx';
import { CtaBand, InnerHero, SplitTitle } from '@/components/v3.tsx';
import { bookVisitMessage } from '@/lib/contact.ts';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = INNER[locale];
  return pageMetadata({ locale, path: '/start-project', title: t.startEyebrow, description: t.startLead });
}

/** Design v3.1 "09 Start a project" (replaces the six-step builder; no inputs, nothing stored). */
export default async function StartProjectPage({ params, searchParams }: P) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const locale = value as Locale;
  const t = INNER[locale];
  const query = await searchParams;
  const initial = initialStartSelection({ service: one(query.service), package: one(query.package) });
  return (
    <>
      <InnerHero locale={locale} eyebrow={t.startEyebrow} title={<SplitTitle parts={t.startH1} locale={locale} />} lead={t.startLead} />
      <StartProject locale={locale} initial={initial} />
      <CtaBand locale={locale} message={bookVisitMessage(locale)} />
    </>
  );
}
