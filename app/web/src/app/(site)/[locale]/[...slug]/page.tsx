import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadSiteContent, type SiteContent } from '@/lib/site-content.ts';
import { isLocale, t, type Locale } from '@/lib/i18n.ts';
import { publishedDoc, publishableClaims } from '@/lib/public.ts';
import { Placeholder, Section } from '@/components/site.tsx';
import { Bidi } from '@/components/bidi.tsx';
import { SwashText } from '@/components/v2.tsx';
import type { ReactNode } from 'react';
import { SITE_COPY } from '@/lib/site-copy.ts';
import { INNER } from '@/lib/site-copy-inner.ts';
import { BusinessV3, CompanyV3, isV3ServicePath, ServicesIndex, ServiceV3, SmartHomeLanding, SupportV3, V3_SERVICE_KEYS } from '@/components/v3-pages.tsx';
import { Cards, Checklist, CtaBand, Faq, Steps } from '@/components/blocks.tsx';
import { c } from '@/lib/content.ts';
import { pageMetadata, summarise } from '@/lib/seo.ts';
import { ProductGrid } from '@/components/products.tsx';
import { publicMarketingOnly } from '@/lib/deployment.ts';
import { CorporatePage } from '@/components/corporate.tsx';
import { wavePage } from '@/lib/wave1.ts';
import { ServiceExperience } from '@/components/services.tsx';
import { servicePage } from '@/lib/services.ts';

export const dynamic = 'force-dynamic';

// route path -> dictionary key + CMS slug
const ROUTES: Record<string, keyof ReturnType<typeof t>['pages']> = {
  about: 'about',
  solutions: 'solutions',
  'solutions/multi-unit-developments': 'multiUnit',
  'solutions/villas': 'villas',
  'solutions/apartments': 'apartments',
  'solutions/scenarios': 'scenarios',
  'business/developers': 'developers',
  'business/contractors': 'contractors',
  'business/partners': 'partners',
  technology: 'technology',
  'technology/controllers': 'controllers',
  'technology/integrations': 'integrations',
  'technology/documentation': 'documentation',
  insights: 'insights',
  contact: 'contact',
  support: 'support',
  'support/service': 'service',
  preview: 'preview',
  'legal/privacy': 'privacy',
};

/**
 * Placeholder or "coming soon" pages (owner decision D8-C #7): kept out of the sitemap and noindex until approved
 * content is published in the CMS. /technology/controllers has real registry content and is indexed instead.
 */
const PLACEHOLDER_ROUTES = new Set(['solutions/villas', 'solutions/apartments', 'solutions/scenarios', 'technology/documentation', 'insights', 'support/service', 'legal/privacy']);

const PARENT_CRUMBS: Record<string, 'solutions' | 'technology' | 'support'> = { solutions: 'solutions', technology: 'technology', support: 'support' };

type P = { params: Promise<{ locale: string; slug: string[] }> };

/** Design v3.1 pages served by this catch-all (they take precedence over the earlier templates on the same paths). */
function v3Page(locale: Locale, path: string, content?: SiteContent): { title: string; description: string; node: ReactNode } | null {
  const c = SITE_COPY[locale];
  const t = INNER[locale];
  const join = (parts: readonly string[]) => parts.join('').trim();
  if (path === 'services') return { title: c.nav.svc, description: t.servicesLead, node: <ServicesIndex locale={locale} /> };
  if (isV3ServicePath(path)) { const svc = c.svc[V3_SERVICE_KEYS[path]]; return { title: svc.name, description: svc.lead, node: <ServiceV3 locale={locale} path={path} faqs={content?.faqs[V3_SERVICE_KEYS[path]]} /> }; }
  if (path === 'services/smart-home-automation') return { title: c.nav.smart, description: t.smart.lead, node: <SmartHomeLanding locale={locale} packages={content?.packages} /> };
  if (path === 'about') return { title: join(t.companyH1), description: t.companyLead, node: <CompanyV3 locale={locale} /> };
  if (path === 'support') return { title: c.doc.support.title, description: t.supportLine, node: <SupportV3 locale={locale} /> };
  if (path === 'business/developers') return { title: c.biz.dev.h1, description: c.biz.dev.lead, node: <BusinessV3 locale={locale} kind="dev" /> };
  if (path === 'business/contractors') return { title: c.biz.contr.h1, description: c.biz.contr.lead, node: <BusinessV3 locale={locale} kind="contr" /> };
  return null;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const path = slug.join('/');
  const v3 = v3Page(locale, path);
  if (v3) return pageMetadata({ locale, path: `/${path}`, title: v3.title, description: v3.description });
  const service = servicePage(locale, path);
  if (service) return pageMetadata({ locale, path: `/${path}`, title: service.title, description: summarise(service.summary) });
  const corporate = wavePage(locale, path);
  if (corporate) return pageMetadata({ locale, path: `/${path}`, title: corporate.title, description: summarise(corporate.body) });
  const key = ROUTES[path];
  if (!key) return {};
  const cms = await publishedDoc('pages', slug.join('-'), locale);
  const pg = t(locale).pages[key];
  return pageMetadata({ locale, path: `/${slug.join('/')}`, title: cms?.seoTitle ?? cms?.title ?? pg.title, description: cms?.seoDescription ?? summarise(cms?.summary ?? pg.body), noindex: !cms && PLACEHOLDER_ROUTES.has(path) ? true : undefined });
}

export default async function MarketingPage({ params }: P) {
  const { locale: l, slug } = await params;
  if (!isLocale(l)) notFound();
  const path = slug.join('/');
  const v3 = v3Page(l, path, await loadSiteContent());
  if (v3) return v3.node;
  const service = servicePage(l, path);
  if (service) {
    const locale = l as Locale;
    const home = locale === 'ar' ? 'الرئيسية' : 'Home';
    const services = locale === 'ar' ? 'الخدمات' : 'Services';
    return (
      <>
        <nav className="breadcrumbs" aria-label={locale === 'ar' ? 'مسار الصفحة' : 'Breadcrumb'}>
          <a href={`/${locale}`}>{home}</a>
          {path !== 'services' ? <a href={`/${locale}/services`}>{services}</a> : null}
          <span aria-current="page"><Bidi text={service.eyebrow} locale={locale} /></span>
        </nav>
        <ServiceExperience locale={locale} page={service} />
      </>
    );
  }
  const corporate = wavePage(l, path);
  if (corporate) {
    const locale = l as Locale;
    return (
      <>
        <nav className="breadcrumbs" aria-label={locale === 'ar' ? 'مسار الصفحة' : 'Breadcrumb'}>
          <a href={`/${locale}`}>{locale === 'ar' ? 'الرئيسية' : 'Home'}</a>
          <span aria-current="page"><Bidi text={corporate.title} locale={locale} /></span>
        </nav>
        <CorporatePage locale={locale} page={corporate} />
      </>
    );
  }
  const key = ROUTES[path];
  if (!key) notFound();
  const locale = l as Locale;
  const d = t(locale);
  const cms = await publishedDoc('pages', slug.join('-'), locale);
  const publicRelease = publicMarketingOnly();
  const L = (p: string) => `/${locale}${p}`;
  return (
    <>
      <nav className="breadcrumbs" aria-label={locale === 'ar' ? 'مسار الصفحة' : 'Breadcrumb'}>
        <a href={L('')}>{locale === 'ar' ? 'الرئيسية' : 'Home'}</a>
        {/* Parent crumb only where the parent page exists (/business and /legal have no landing page). */}
        {slug.length > 1 && PARENT_CRUMBS[slug[0]] && <a href={L(`/${slug[0]}`)}>{d.nav[PARENT_CRUMBS[slug[0]]]}</a>}
        <span aria-current="page"><Bidi text={cms?.title ?? d.pages[key].title} locale={locale} /></span>
      </nav>
      <section className="hero">
        {!cms && !publicRelease && <Placeholder locale={locale} />}
        <h1>
          <SwashText text={cms?.title ?? d.pages[key].title} locale={locale} />
        </h1>
        <p className="lead">
          <Bidi text={cms?.summary ?? d.pages[key].body} locale={locale} />
        </p>
        {cms?.body && (
          <p style={{ whiteSpace: 'pre-line' }}>
            <Bidi text={cms.body} locale={locale} />
          </p>
        )}
        {['developers', 'contractors', 'multiUnit', 'solutions', 'villas', 'apartments', 'scenarios'].includes(key) && (
          <div className="actions">
            <a className="btn" href={L('/business/request-a-proposal')}>
              {d.cta.proposal}
            </a>
            <a className="btn secondary" href={L('/consultation')}>
              {d.cta.consultation}
            </a>
          </div>
        )}
      </section>
      {key === 'integrations' && <IntegrationClaims locale={locale} />}
      <SegmentSections pageKey={key} locale={locale} />
    </>
  );
}

/** Only claims with a publishable evidence status are rendered (none until evidence is reviewed). */
async function IntegrationClaims({ locale }: { locale: Locale }) {
  const claims = await publishableClaims(locale);
  return (
    <Section title={locale === 'ar' ? 'قدرات موثّقة' : 'Evidenced capabilities'} locale={locale}>
      {claims.length === 0 ? (
        <p>{locale === 'ar' ? 'لا توجد ادعاءات توافق منشورة بعد — تُنشر فقط بعد مراجعة تقارير الاختبار.' : 'No compatibility claims are published yet — they are only published after test reports are reviewed.'}</p>
      ) : (
        <ul>
          {claims.map((c) => (
            <li key={c.id}>
              <Bidi text={c.claim} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/** Page-specific structured sections (planning doc 05 §2). Copy is placeholder; facts only, no unverified claims. */
function SegmentSections({ pageKey, locale }: { pageKey: string; locale: Locale }) {
  const k = c(locale);
  const d = t(locale);
  const L = (p: string) => `/${locale}${p}`;
  const cta = (
    <CtaBand title={k.finalCta.title} body={k.finalCta.body} locale={locale}>
      <a className="btn" href={L('/business/request-a-proposal')}>
        {d.cta.proposal}
      </a>
      <a className="btn secondary" href={L('/consultation')}>
        {d.cta.consultation}
      </a>
    </CtaBand>
  );
  if (pageKey === 'developers' || pageKey === 'multiUnit')
    return (
      <>
        <Section title={k.developers.painsTitle} locale={locale}>
          <Checklist items={k.developers.pains} locale={locale} />
        </Section>
        <Section title={k.process.title} locale={locale}>
          <Steps steps={k.process.steps} locale={locale} />
        </Section>
        <Section title={k.engagement.title} locale={locale}>
          <Cards items={k.engagement.items} locale={locale} />
        </Section>
        <Section title={k.developers.faqTitle} locale={locale}>
          <Faq items={k.developers.faqs} locale={locale} />
        </Section>
        <Section title={k.developers.prepareTitle} locale={locale}>
          <Checklist items={k.developers.prepare} locale={locale} />
        </Section>
        {cta}
      </>
    );
  if (pageKey === 'contractors' || pageKey === 'partners')
    return (
      <>
        <Section title={k.contractors.whoTitle} locale={locale} intro={k.contractors.who}>
          <Cards items={k.contractors.benefits} locale={locale} />
          <p className="muted">
            <Bidi text={k.contractors.docsNote} locale={locale} />
          </p>
        </Section>
        <Section title={k.engagement.title} locale={locale}>
          <Cards items={k.engagement.items} locale={locale} />
        </Section>
        <CtaBand title={k.finalCta.title} body={k.finalCta.body} locale={locale}>
          <a className="btn" href={L('/business/request-a-proposal?kind=PARTNER')}>
            {locale === 'ar' ? 'قدّم طلب شراكة' : 'Apply as a partner'}
          </a>
          <a className="btn secondary" href={L('/business/request-a-proposal')}>
            {d.cta.proposal}
          </a>
        </CtaBand>
      </>
    );
  if (['solutions', 'villas', 'apartments', 'scenarios'].includes(pageKey))
    return (
      <>
        <Section title={k.scenarios.title} locale={locale} intro={k.scenarios.note}>
          <Cards items={k.scenarios.items} locale={locale} badge={k.badges.illustrative} />
        </Section>
        {cta}
      </>
    );
  if (pageKey === 'technology' || pageKey === 'controllers')
    return (
      <>
        <Section title={k.controllers.title} locale={locale} intro={k.controllers.note}>
          <ProductGrid locale={locale} />
          <p className="actions"><a className="btn secondary" href={L('/products/compare')}>{locale === 'ar' ? 'قارن الوحدات' : 'Compare controllers'}</a></p>
        </Section>
        {cta}
      </>
    );
  if (pageKey === 'documentation')
    return (
      <Section title={locale === 'ar' ? 'حالة النشر' : 'Publication status'} locale={locale} intro={locale === 'ar' ? 'المحتوى محجوب حتى تكتمل المراجعة الفنية ودليل النسخة.' : 'Content remains withheld until technical review and revision evidence are complete.'}>
        <p className="empty-state">{locale === 'ar' ? 'لا توجد تنزيلات عامة معتمدة الآن.' : 'No approved public downloads are available yet.'}</p>
      </Section>
    );
  if (pageKey === 'service')
    return (
      <Section title={locale === 'ar' ? 'المسار الحالي' : 'Current path'} locale={locale}>
        <p>{d.pages.support.body}</p>
        <p><a href={L('/contact')}>{d.nav.contact}</a></p>
      </Section>
    );
  return null;
}
