import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, t, type Locale } from '@/lib/i18n.ts';
import { c } from '@/lib/content.ts';
import { publishedDoc } from '@/lib/public.ts';
import { pageMetadata, summarise } from '@/lib/seo.ts';
import { Placeholder, Section } from '@/components/site.tsx';
import { Bidi } from '@/components/bidi.tsx';
import { Cards, CtaBand, Steps } from '@/components/blocks.tsx';
import Image from 'next/image';
import { ProductGrid } from '@/components/products.tsx';
import { publicMarketingOnly } from '@/lib/deployment.ts';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const cms = await publishedDoc('pages', 'home', locale);
  const d = t(locale);
  return pageMetadata({ locale, path: '/', title: cms?.seoTitle ?? d.home.heroTitle, description: cms?.seoDescription ?? summarise(cms?.summary ?? d.home.heroBody) });
}

// Homepage narrative per planning doc 05 §1 (preview variant): hero → process pillars → process story (no identified
// project without written consent) → B2B engagement → integration depth (honest) → solutions → controllers → final CTA.
// The "engineering proof" section is omitted until evidence records exist (doc 05 §1 row 8 fallback).
export default async function Home({ params }: P) {
  const { locale: l } = await params;
  if (!isLocale(l)) notFound();
  const locale = l as Locale;
  const d = t(locale);
  const k = c(locale);
  const cms = await publishedDoc('pages', 'home', locale);
  const publicRelease = publicMarketingOnly();
  const L = (p: string) => `/${locale}${p}`;
  const B = (s: string) => <Bidi text={s} locale={locale} />;
  return (
    <>
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            {!cms && !publicRelease && <Placeholder locale={locale} />}
            <p className="eyebrow">{B(publicRelease ? (locale === 'ar' ? 'حلول B2B · هندسة سكنية' : 'B2B SOLUTIONS · RESIDENTIAL ENGINEERING') : (locale === 'ar' ? 'معاينة B2B · هندسة سكنية' : 'B2B PREVIEW · RESIDENTIAL ENGINEERING'))}</p>
            <h1>{B(cms?.title ?? d.home.heroTitle)}</h1>
            <p className="lead">{B(cms?.summary ?? d.home.heroBody)}</p>
            <div className="actions">
              <a className="btn" href={L('/business/request-a-proposal')}>
                {d.cta.proposal}
              </a>
              <a className="btn secondary" href={L('/products')}>
                {locale === 'ar' ? 'اكتشف وحدات التحكم' : 'Explore controllers'}
              </a>
            </div>
            <p className="hero-note">{publicRelease ? (locale === 'ar' ? 'يُراجع كل نطاق هندسيًا قبل تقديم العرض. البيع الإلكتروني غير متاح.' : 'Every scope is reviewed by engineering before proposal. Online selling is unavailable.') : (locale === 'ar' ? 'يُراجع كل نطاق هندسيًا قبل تقديم العرض. لا توجد طلبات شراء عامة في المعاينة.' : 'Every scope is reviewed by engineering before proposal. Public ordering is not available in preview.')}</p>
          </div>
          <aside className="hero-panel home-hero-product" aria-label={locale === 'ar' ? 'وحدة تحكم OTONOM فعلية' : 'Genuine OTONOM controller'}>
            <span>{B(locale === 'ar' ? 'وحدات تحكم OTONOM الفعلية' : 'GENUINE OTONOM CONTROLLERS')}</span>
            <Image src="/products/otonom-16r.png" alt={locale === 'ar' ? 'وحدة تحكم OTONOM 16R بست عشرة قناة — صورة المنتج الفعلي' : 'OTONOM 16R sixteen-channel controller — genuine product image'} width={1254} height={1254} sizes="(max-width: 760px) 88vw, 430px" priority />
            <div className="hero-product-footer">
              <p><bdi dir="ltr">4R · 6R · 16R</bdi></p>
              <a href={L('/products')}>{locale === 'ar' ? 'شاهد المجموعة' : 'View the range'}</a>
            </div>
          </aside>
        </div>
      </section>

      <section className="section pillars" aria-label={locale === 'ar' ? 'مراحل العمل' : 'How we work'}>
        <ol className="pill-row">
          {d.home.pillars.map((p) => (
            <li key={p}>{B(p)}</li>
          ))}
        </ol>
      </section>

      <Section title={k.process.title} locale={locale} intro={d.home.projectsBody}>
        <Steps steps={k.process.steps} locale={locale} />
        <p>
          <a href={L('/projects')}>{d.cta.viewWork}</a>
        </p>
      </Section>

      <Section title={d.home.businessTitle} locale={locale} intro={d.home.businessBody}>
        <Cards items={k.engagement.items} locale={locale} />
        <p className="links-row">
          <a href={L('/business/developers')}>{locale === 'ar' ? 'للمطورين العقاريين' : 'For developers'}</a>
          <a href={L('/business/contractors')}>{locale === 'ar' ? 'للمقاولين والاستشاريين' : 'For contractors & consultants'}</a>
        </p>
      </Section>

      <Section title={d.home.integrationTitle} locale={locale} intro={d.home.integrationBody}>
        <p>
          <a href={L('/technology/integrations')}>{d.nav.technology}</a>
        </p>
      </Section>

      <Section title={k.scenarios.title} locale={locale} intro={k.scenarios.note}>
        <Cards items={k.scenarios.items} locale={locale} badge={k.badges.illustrative} />
        <p>
          <a href={L('/solutions')}>{d.nav.solutions}</a>
        </p>
      </Section>

      <Section title={k.controllers.title} locale={locale} intro={k.controllers.note}>
        <ProductGrid locale={locale} eager />
        <p>
          <a href={L('/products/compare')}>{B(locale === 'ar' ? 'قارن 4R و6R و16R' : 'Compare 4R, 6R and 16R')}</a>
        </p>
      </Section>

      <CtaBand title={k.finalCta.title} body={k.finalCta.body} locale={locale}>
        <a className="btn" href={L('/business/request-a-proposal')}>
          {d.cta.proposal}
        </a>
        <a className="btn secondary" href={L('/consultation')}>
          {d.cta.consultation}
        </a>
      </CtaBand>
    </>
  );
}
