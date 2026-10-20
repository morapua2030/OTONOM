import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, t, type Locale } from '@/lib/i18n.ts';
import { publishedDoc, publishableClaims } from '@/lib/public.ts';
import { Placeholder, Section } from '@/components/site.tsx';
import { Bidi } from '@/components/bidi.tsx';
import { Cards, Checklist, CtaBand, Faq, Steps } from '@/components/blocks.tsx';
import { c } from '@/lib/content.ts';
import { pageMetadata, summarise } from '@/lib/seo.ts';
import { ProductGrid } from '@/components/products.tsx';

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

type P = { params: Promise<{ locale: string; slug: string[] }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, slug } = await params;
  const key = ROUTES[slug.join('/')];
  if (!key || !isLocale(locale)) return {};
  const cms = await publishedDoc('pages', slug.join('-'), locale);
  const pg = t(locale).pages[key];
  return pageMetadata({ locale, path: `/${slug.join('/')}`, title: cms?.seoTitle ?? cms?.title ?? pg.title, description: cms?.seoDescription ?? summarise(cms?.summary ?? pg.body) });
}

export default async function MarketingPage({ params }: P) {
  const { locale: l, slug } = await params;
  const path = slug.join('/');
  const key = ROUTES[path];
  if (!key || !isLocale(l)) notFound();
  const locale = l as Locale;
  const d = t(locale);
  const cms = await publishedDoc('pages', slug.join('-'), locale);
  const L = (p: string) => `/${locale}${p}`;
  return (
    <>
      <nav className="breadcrumbs" aria-label={locale === 'ar' ? 'مسار الصفحة' : 'Breadcrumb'}>
        <a href={L('')}>{locale === 'ar' ? 'الرئيسية' : 'Home'}</a>
        {slug.length > 1 && <a href={L(`/${slug[0]}`)}>{d.nav[slug[0] === 'business' ? 'business' : slug[0] === 'technology' ? 'technology' : slug[0] === 'solutions' ? 'solutions' : 'support']}</a>}
        <span aria-current="page"><Bidi text={cms?.title ?? d.pages[key].title} locale={locale} /></span>
      </nav>
      <section className="hero">
        {!cms && <Placeholder locale={locale} />}
        <h1>
          <Bidi text={cms?.title ?? d.pages[key].title} locale={locale} />
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
