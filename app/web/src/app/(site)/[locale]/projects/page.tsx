import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale } from '@/lib/i18n.ts';
import { publicProjects } from '@/lib/portfolio-public.ts';
import { portfolioCopy, portfolioQuery } from '@/lib/portfolio.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { WorkEmptyV3 } from '@/components/v3-pages.tsx';
import { PortfolioOverview } from '@/components/portfolio.tsx';
import '../../portfolio.css';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ locale: string }>; searchParams: Promise<{ category?: string | string[]; q?: string | string[] }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = portfolioCopy[locale];
  return pageMetadata({ locale, path: '/projects', title: d.all, description: d.intro });
}
export default async function Projects({ params, searchParams }: P) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const projects = await publicProjects(locale);
  // Design v3.1 "08 Our work": the empty state ships until real, permitted projects are published (DR-098, DR-106).
  if (projects.length === 0) return <WorkEmptyV3 locale={locale} />;
  return <PortfolioOverview locale={locale} projects={projects} query={portfolioQuery(await searchParams)} />;
}
