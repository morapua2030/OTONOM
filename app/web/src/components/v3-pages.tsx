import Image from 'next/image';
import type { Locale } from '@/lib/i18n.ts';
import { SITE_COPY } from '@/lib/site-copy.ts';
import { INNER } from '@/lib/site-copy-inner.ts';
import { localProductText, requireProductByModel, type ProductModel } from '@/lib/products.ts';
import { bookVisitMessage, contractorMessage, developerMessage, ENTRY_STAGES, entryStageLabel, entryStageMessage, EXTERNAL_LINK, talkMessage, telHref, whatsappHref } from '@/lib/contact.ts';
import { Bidi } from './bidi.tsx';
import { Circuit, CtaBand, Icon, IconCards, InnerHero, SplitTitle, StepCards } from './v3.tsx';
import { FaqAccordion } from './FaqAccordion.tsx';
import { HomeItemsSection, HomePackagesSection } from './home-mix.tsx';
import { ItemVisual } from './package-items.tsx';

const L = (locale: Locale, p: string) => `/${locale}${p}`;

export const V3_SERVICE_KEYS = { 'services/iot-embedded': 'iot', 'services/software-engineering': 'soft', 'services/custom-engineering': 'custom' } as const;
export type V3ServicePath = keyof typeof V3_SERVICE_KEYS;
export const isV3ServicePath = (path: string): path is V3ServicePath => Object.hasOwn(V3_SERVICE_KEYS, path);

/** Design v3.1 "05 Service" template (IoT, Software, Custom). */
export function ServiceV3({ locale, path }: { locale: Locale; path: V3ServicePath }) {
  const t = INNER[locale];
  const svc = SITE_COPY[locale].svc[V3_SERVICE_KEYS[path]];
  const talk = talkMessage(locale, svc.name);
  return (
    <>
      <InnerHero
        locale={locale}
        eyebrow={svc.name}
        title={<SplitTitle parts={[svc.h1a, svc.sw, svc.h1b]} locale={locale} />}
        lead={svc.lead}
        visual={<Circuit />}
        actions={<>
          <a className="btn" href={whatsappHref(talk)} {...EXTERNAL_LINK}>{t.svcTalk}</a>
          <a className="btn secondary" href={L(locale, `/start-project?service=${path.split('/')[1]}`)}>{t.svcStart}</a>
        </>}
      />
      <section className="v2-section" aria-labelledby="svc-what"><h2 id="svc-what">{t.whatWeDo}</h2><IconCards cards={svc.cards} locale={locale} /></section>
      <section className="v2-section" aria-labelledby="svc-where">
        <h2 id="svc-where">{t.whereStart}</h2>
        <div className="v2-entry">
          {ENTRY_STAGES.map((stage) => <a className="v2-chip" href={whatsappHref(entryStageMessage(locale, stage))} {...EXTERNAL_LINK} key={stage}>{entryStageLabel(locale, stage)}</a>)}
        </div>
      </section>
      <section className="v2-section" aria-labelledby="svc-how"><h2 id="svc-how">{t.howWeWork}</h2><StepCards steps={SITE_COPY[locale].svcSteps} locale={locale} /></section>
      <section className="v2-section" aria-labelledby="svc-faq"><h2 id="svc-faq">{t.questions}</h2><FaqAccordion items={svc.faq} locale={locale} /></section>
      <CtaBand locale={locale} message={talk} />
    </>
  );
}

const DISCIPLINE_LINKS = [['iot', '/services/iot-embedded'], ['soft', '/services/software-engineering'], ['smart', '/services/smart-home-automation'], ['custom', '/services/custom-engineering']] as const;
const DISCIPLINE_LINES: Record<Locale, Record<string, string>> = {
  ar: { iot: 'أجهزة متصلة والسوفتوير اللي بيشغّلها.', soft: 'تطبيقات ولوحات تحكم وأنظمة خلفية لمنتجك.', smart: 'باقات OTONOM للبيوت، وفريقنا بيركّبها.', custom: 'شغل هندسي مبني على متطلبات مشروعك.' },
  en: { iot: 'Connected devices and the firmware that runs them.', soft: 'Apps, dashboards and backend systems for your product.', smart: 'OTONOM packages for homes, installed by our team.', custom: 'Engineering work built around your specific requirement.' },
};

/** The four discipline cards (the same as Home), linking to the service pages. */
export function DisciplineCards({ locale }: { locale: Locale }) {
  const c = SITE_COPY[locale];
  const title = (key: string) => (key === 'smart' ? c.nav.smartAuto : c.svc[key as 'iot' | 'soft' | 'custom'].name);
  return (
    <div className="v2-grid-4">
      {DISCIPLINE_LINKS.map(([key, href]) => (
        <article className="v2-card" key={key}>
          <h3 className="v2-card-title"><Bidi text={title(key)} locale={locale} /></h3>
          <p><Bidi text={DISCIPLINE_LINES[locale][key]} locale={locale} /></p>
          <a className="v2-arrow-link" href={L(locale, href)}>{INNER[locale].learnMore} <span className="sr-only">: {title(key)}</span><span className="v2-arrow-icon" aria-hidden="true">→</span></a>
        </article>
      ))}
    </div>
  );
}

/** /services index (owner decision): the four discipline cards and the navy CTA band. */
export function ServicesIndex({ locale }: { locale: Locale }) {
  const t = INNER[locale];
  return (
    <>
      <InnerHero locale={locale} eyebrow={t.servicesEyebrow} title={<SplitTitle parts={t.servicesH1} locale={locale} />} lead={t.servicesLead} />
      {/* Visually hidden h2 so the discipline card titles (h3) do not skip a heading level. */}
      <section className="v2-section" aria-labelledby="services-index-title">
        <h2 id="services-index-title" className="sr-only">{t.whatWeDo}</h2>
        <DisciplineCards locale={locale} />
      </section>
      <CtaBand locale={locale} message={bookVisitMessage(locale)} />
    </>
  );
}

/** Design v3.1 "01 Home": the smart-home landing at /services/smart-home-automation. */
export function SmartHomeLanding({ locale }: { locale: Locale }) {
  const s = INNER[locale].smart;
  const t = INNER[locale];
  const r16 = requireProductByModel('16r');
  const models: ProductModel[] = ['4r', '6r', '16r'];
  return (
    <div className="v2-home">
      <section className="v2-hero" aria-labelledby="smart-title">
        <div className="v2-hero-copy">
          <span className="v2-eyebrow" dir="ltr">{s.eyebrow}</span>
          <h1 id="smart-title"><SplitTitle parts={s.h1} locale={locale} /></h1>
          <p className="v2-lead"><Bidi text={s.lead} locale={locale} /></p>
          <div className="v2-actions">
            <a className="btn" href={L(locale, '/smart-home/packages')}>{t.seePackages}</a>
            <a className="btn secondary" href={L(locale, '/products')}>{s.explore}</a>
          </div>
        </div>
        <div className="v2-hero-card">
          <Image src={r16.image} alt={localProductText(r16.alt, locale)} width={1254} height={1254} sizes="(max-width: 900px) 70vw, 420px" priority />
          <span className="v2-pill v2-badge-pin"><Bidi text={locale === 'ar' ? 'كنترولر 16R الذكي' : '16R Smart Controller'} locale={locale} /></span>
        </div>
      </section>
      <HomeItemsSection locale={locale} />
      <HomePackagesSection locale={locale} choose="contact" />
      <section className="v2-section" aria-labelledby="smart-steps"><h2 id="smart-steps">{s.howItWorks}</h2><StepCards steps={s.steps} locale={locale} /></section>
      <section className="v2-section" aria-labelledby="smart-ctrl">
        <div className="v2-section-head-row">
          <h2 id="smart-ctrl"><SplitTitle parts={s.meet} locale={locale} /></h2>
          <a className="btn secondary" href={L(locale, '/products')}>{s.allControllers}</a>
        </div>
        <ul className="v3-ctrl-cards">
          {models.map((model) => {
            const product = requireProductByModel(model);
            return (
              <li key={model}>
                <a className="v2-card v3-ctrl-card" href={L(locale, `/products/${model}`)}>
                  <span className="v3-ctrl-img"><Image src={product.image} alt={localProductText(product.alt, locale)} width={1254} height={1254} sizes="(max-width: 700px) 80vw, 300px" /></span>
                  <span className="v2-mini-name" dir="ltr">{model.toUpperCase()}</span>
                  <span className="v2-mini-ch">{s.smartController}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="v2-section" aria-labelledby="smart-alexa">
        <div className="v2-band-dark">
          <div>
            <h2 id="smart-alexa"><Bidi text={s.alexaTitle} locale={locale} /></h2>
            <p><Bidi text={s.alexaBody} locale={locale} /></p>
          </div>
          <div className="v2-band-side">
            <span className="v2-band-visual"><ItemVisual item="alexa" locale={locale} sizes="200px" /></span>
            <div className="v2-band-actions">
              <a className="btn btn-on-dark is-primary" href={whatsappHref(bookVisitMessage(locale))} {...EXTERNAL_LINK}>{t.bookVisit}</a>
              <a className="btn btn-on-dark" href={L(locale, '/smart-home/packages')}>{locale === 'ar' ? 'قارن الباقات' : 'Compare packages'}</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const MODEL_KEY: Record<ProductModel, '16R' | '4R' | '6R'> = { '16r': '16R', '4r': '4R', '6r': '6R' };

/** Design v3.1 "06 Product" (no spec table: specs are out of scope, DR-106). */
export function ProductV3({ locale, model }: { locale: Locale; model: ProductModel }) {
  const t = INNER[locale];
  const copy = SITE_COPY[locale].prod;
  const p = copy[MODEL_KEY[model]];
  const product = requireProductByModel(model);
  const talk = talkMessage(locale, MODEL_KEY[model]);
  const others = (['16r', '4r', '6r'] as ProductModel[]).filter((m) => m !== model);
  return (
    <>
      <section className="v3-hero has-visual">
        <div className="v3-hero-copy">
          <span className="v2-eyebrow"><Bidi text={t.ctrlEyebrow} locale={locale} /></span>
          <h1><Bidi text={p.h1} locale={locale} /></h1>
          <span className="v2-pill"><Bidi text={p.ch} locale={locale} /></span>
          <p className="v2-lead"><Bidi text={p.line} locale={locale} /></p>
          <div className="v2-actions">
            <a className="btn" href={whatsappHref(talk)} {...EXTERNAL_LINK}>{t.bookVisit}</a>
            <a className="btn secondary" href={L(locale, '/smart-home/packages')}>{t.seePackages}</a>
          </div>
        </div>
        <div className="v2-img-panel v3-product-photo">
          <Image src={product.image} alt={localProductText(product.alt, locale)} width={1254} height={1254} sizes="(max-width: 900px) 80vw, 460px" priority />
        </div>
      </section>
      <section className="v2-section" aria-label={p.ch}>
        <ul className="v3-facts">
          {p.facts.map((fact) => <li key={fact}><span className="v3-icon-box"><Icon name="check" /></span><span><Bidi text={fact} locale={locale} /></span></li>)}
        </ul>
      </section>
      <section className="v2-section" aria-labelledby="prod-others">
        <h2 id="prod-others">{t.otherCtrl}</h2>
        <div className="v2-mini-grid">
          {others.map((m) => {
            const other = requireProductByModel(m);
            return (
              <a className="v2-mini-card" href={L(locale, `/products/${m}`)} key={m}>
                <span className="v2-mini-img"><Image src={other.image} alt={localProductText(other.alt, locale)} width={1254} height={1254} sizes="88px" /></span>
                <span className="v2-mini-copy"><span className="v2-mini-name" dir="ltr">{MODEL_KEY[m]}</span><span className="v2-mini-ch"><Bidi text={copy[MODEL_KEY[m]].ch} locale={locale} /></span></span>
                <span className="v2-mini-arrow" aria-hidden="true">→</span>
              </a>
            );
          })}
        </div>
      </section>
      <CtaBand locale={locale} message={talk} />
    </>
  );
}

/** Design v3.1 "07 Company" (the optional owner band is not rendered). */
export function CompanyV3({ locale }: { locale: Locale }) {
  const t = INNER[locale];
  return (
    <>
      <InnerHero locale={locale} eyebrow={t.companyEyebrow} title={<SplitTitle parts={t.companyH1} locale={locale} />} lead={t.companyLead} />
      <section className="v2-section" aria-labelledby="about-values"><h2 id="about-values">{t.howWeOperate}</h2><IconCards cards={SITE_COPY[locale].values} locale={locale} /></section>
      <section className="v2-section" aria-labelledby="about-disc"><h2 id="about-disc">{t.ourDisciplines}</h2><DisciplineCards locale={locale} /></section>
      <CtaBand locale={locale} message={bookVisitMessage(locale)} />
    </>
  );
}

/** Design v3.1 "08 Our work": the empty state ships until real, permitted projects exist (DR-098, DR-106). */
export function WorkEmptyV3({ locale }: { locale: Locale }) {
  const t = INNER[locale];
  return (
    <>
      <InnerHero locale={locale} eyebrow={t.workEyebrow} title={<SplitTitle parts={t.workH1} locale={locale} />} />
      <section className="v2-section">
        <div className="v2-card v3-empty" data-testid="work-empty">
          <span className="v3-icon-box"><Icon name="box" /></span>
          <p><Bidi text={t.workEmpty} locale={locale} /></p>
          <div className="v2-actions">
            <a className="btn secondary" href={L(locale, '/products')}>{t.controllers}</a>
            <a className="btn" href={whatsappHref(bookVisitMessage(locale))} {...EXTERNAL_LINK}>{t.bookVisit}</a>
          </div>
        </div>
      </section>
      <CtaBand locale={locale} message={bookVisitMessage(locale)} />
    </>
  );
}

/** Design v3.1 "10 Business" (developers / contractors). */
export function BusinessV3({ locale, kind }: { locale: Locale; kind: 'dev' | 'contr' }) {
  const t = INNER[locale];
  const c = SITE_COPY[locale];
  const biz = c.biz[kind];
  const message = kind === 'dev' ? developerMessage(locale) : contractorMessage(locale);
  return (
    <>
      <InnerHero
        locale={locale}
        eyebrow={t.bizEyebrow}
        title={<Bidi text={biz.h1} locale={locale} />}
        lead={biz.lead}
        visual={<Circuit />}
        actions={<>
          <a className="btn" href={whatsappHref(message)} {...EXTERNAL_LINK}>{t.bookVisit}</a>
          <a className="btn secondary" href={telHref()}>{t.callUs}</a>
        </>}
      />
      <section className="v2-section" aria-labelledby="biz-offer"><h2 id="biz-offer">{t.whatWeOffer}</h2><IconCards cards={c.bizModels} locale={locale} /></section>
      <section className="v2-section" aria-labelledby="biz-steps"><h2 id="biz-steps">{t.howItGoes}</h2><StepCards steps={c.bizSteps.map((step) => [step] as const)} locale={locale} /></section>
      <CtaBand locale={locale} message={message} />
    </>
  );
}

/** Design v3.1 "11 Text page" for Support (720px reading column). */
export function SupportV3({ locale }: { locale: Locale }) {
  const t = INNER[locale];
  const c = SITE_COPY[locale];
  return (
    <>
      <section className="v3-text">
        <h1><Bidi text={c.doc.support.title} locale={locale} /></h1>
        <p className="v3-updated"><Bidi text={t.lastUpdated} locale={locale} /></p>
        <p><Bidi text={t.supportLine} locale={locale} /></p>
        {/* Feature gate (not in the v3.1 design): warranty/service intake stays off the website until the commercial release. */}
        <p className="v3-note" data-testid="warranty-disabled"><Bidi text={t.warrantyOff} locale={locale} /></p>
        <h2>{t.beforeContact}</h2>
        <ol className="v3-tips">
          {c.tips.map((tip, index) => <li key={tip}><span className="v2-step-num" dir="ltr">{index + 1}</span><span><Bidi text={tip} locale={locale} /></span></li>)}
        </ol>
      </section>
      <CtaBand locale={locale} message={bookVisitMessage(locale)} />
    </>
  );
}

