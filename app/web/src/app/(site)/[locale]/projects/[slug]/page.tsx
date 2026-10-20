import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, t, type Locale } from '@/lib/i18n.ts';
import { publishedDoc } from '@/lib/public.ts';
import { pageMetadata, summarise } from '@/lib/seo.ts';
import { Section } from '@/components/site.tsx';
import { Bidi } from '@/components/bidi.tsx';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const c = await publishedDoc('case-studies', slug, locale);
  if (!c) return {};
  return pageMetadata({ locale, path: `/projects/${slug}`, title: c.seoTitle ?? c.title, description: c.seoDescription ?? summarise(c.objectives ?? c.body) });
}

export default async function CaseStudy({ params }: P) {
  const { locale: l, slug } = await params;
  if (!isLocale(l)) notFound();
  const locale = l as Locale;
  const c = await publishedDoc('case-studies', slug, locale);
  if (!c) notFound();
  const d = t(locale);
  const B = (s: string) => <Bidi text={s} locale={locale} />;
  const block = (title: string, text?: string | null) =>
    text ? (
      <Section title={title} locale={locale}>
        <p style={{ whiteSpace: 'pre-line' }}>{B(text)}</p>
      </Section>
    ) : null;
  return (
    <article>
      <section className="hero">
        <h1>{B(c.title)}</h1>
        {c.locationGranularity && <p>{B(c.locationGranularity)}</p>}
      </section>
      {block(locale === 'ar' ? 'الأهداف' : 'Objectives', c.objectives)}
      {block(locale === 'ar' ? 'الحل والنطاق' : 'Solution & scope', c.body)}
      {block(locale === 'ar' ? 'النتائج' : 'Outcomes', c.outcomes)}
      {block(locale === 'ar' ? 'الحدود' : 'Limitations', c.limitations)}
      <p>
        <a className="btn" href={`/${locale}/business/request-a-proposal`}>
          {d.cta.similar}
        </a>
      </p>
    </article>
  );
}
