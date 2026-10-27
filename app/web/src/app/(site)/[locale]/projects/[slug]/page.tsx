import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale } from '@/lib/i18n.ts';
import { publicProjects } from '@/lib/portfolio-public.ts';
import { pageMetadata, summarise } from '@/lib/seo.ts';
import { CaseStudyView } from '@/components/portfolio.tsx';
import '../../../portfolio.css';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const project = (await publicProjects(locale)).find((item) => item.slug === slug);
  if (!project) return { robots: { index: false, follow: false } };
  const meta = pageMetadata({ locale, path: `/projects/${slug}`, title: project.seoTitle || project.title, description: project.seoDescription || summarise(project.summary) });
  if (project.hero) {
    meta.openGraph = { ...meta.openGraph, images: [{ url: project.hero.src, alt: project.hero.alt, width: project.hero.width, height: project.hero.height }] };
    meta.twitter = { ...meta.twitter, card: 'summary_large_image', images: [project.hero.src] };
  }
  return meta;
}
export default async function CaseStudy({ params }: P) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const projects = await publicProjects(locale);
  const project = projects.find((item) => item.slug === slug);
  if (!project) notFound();
  return <CaseStudyView locale={locale} project={project} projects={projects} />;
}
