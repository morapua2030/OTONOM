import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, t, type Locale } from '@/lib/i18n.ts';
import { c } from '@/lib/content.ts';
import { publishedDoc } from '@/lib/public.ts';
import { pageMetadata, summarise } from '@/lib/seo.ts';
import { Placeholder, Section } from '@/components/site.tsx';
import { Bidi } from '@/components/bidi.tsx';
import { Cards, CtaBand, Steps } from '@/components/blocks.tsx';

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
  const L = (p: string) => `/${locale}${p}`;
  const B = (s: string) => <Bidi text={s} locale={locale} />;
  return (
    <>
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            {!cms && <Placeholder locale={locale} />}
            <p className="eyebrow">{B(locale === 'ar' ? 'معاينة B2B · هندسة سكنية' : 'B2B PREVIEW · RESIDENTIAL ENGINEERING')}</p>
            <h1>{B(cms?.title ?? d.home.heroTitle)}</h1>
            <p className="lead">{B(cms?.summary ?? d.home.heroBody)}</p>
            <div className="actions">
              <a className="btn" href={L('/business/request-a-proposal')}>
                {d.cta.proposal}
              </a>
              <a className="btn secondary" href={L('/projects')}>
                {d.cta.viewWork}
              </a>
            </div>
            <p className="hero-note">{locale === 'ar' ? 'يُراجع كل نطاق هندسيًا قبل تقديم العرض. لا توجد طلبات شراء عامة في المعاينة.' : 'Every scope is reviewed by engineering before proposal. Public ordering is not available in preview.'}</p>
          </div>
          <aside className="hero-panel" aria-label={locale === 'ar' ? 'نطاق وحدات التحكم' : 'Controller range'}>
            <span>{locale === 'ar' ? 'فئات وحدات التحكم' : 'CONTROLLER CATEGORIES'}</span>
            <div className="channel-row" dir="ltr"><strong>4</strong><strong>6</strong><strong>16</strong></div>
            <p>{locale === 'ar' ? 'قناة · تفاصيل كهربائية بعد اعتماد ورقة البيانات' : 'channels · electrical details after datasheet approval'}</p>
            <a href={L('/technology/controllers')}>{locale === 'ar' ? 'استكشف الوحدات' : 'Explore controllers'}</a>
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
        <Cards items={k.controllers.models} locale={locale} />
        <p>
          <a href={L('/shop')}>{d.nav.controllers}</a>
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
