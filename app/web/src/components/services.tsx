import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n.ts';
import type { ServiceItem, ServicePageContent } from '@/lib/services.ts';
import { Bidi } from './bidi.tsx';
import { EngineeringLayerExplorer, StartingPointFinder } from './ServiceExplorer.tsx';

function LocalLink({ locale, href, className, children }: { locale: Locale; href: string; className?: string; children: ReactNode }) {
  return <Link className={className} href={`/${locale}${href}`}>{children}</Link>;
}

function SectionHead({ eyebrow, title, body, locale }: { eyebrow?: string; title: string; body?: string; locale: Locale }) {
  return (
    <div className="section-head">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2><Bidi text={title} locale={locale} /></h2>
      {body ? <p><Bidi text={body} locale={locale} /></p> : null}
    </div>
  );
}

export function ServiceHero({ locale, page }: { locale: Locale; page: ServicePageContent }) {
  const labels = locale === 'ar'
    ? ['عتاد', 'برنامج ثابت', 'اتصال', 'برمجيات', 'تحقق']
    : ['Hardware', 'Firmware', 'Connectivity', 'Software', 'Verification'];
  return (
    <section className="service-hero">
      <div className="service-hero-copy">
        <p className="eyebrow">{page.eyebrow}</p>
        <h1><Bidi text={page.title} locale={locale} /></h1>
        <p className="wave-lead"><Bidi text={page.summary} locale={locale} /></p>
        <div className="actions">
          <a className="btn" href="#capabilities">{locale === 'ar' ? 'استكشف الخدمة' : 'Explore the service'}</a>
          <LocalLink className="btn secondary" locale={locale} href={page.productProof ? '/start-project?service=smart-home' : '/start-project'}>{page.ctaLabel}</LocalLink>
        </div>
        <p className="service-caveat"><Bidi text={page.note} locale={locale} /></p>
      </div>
      <div className="service-system-map" aria-label={locale === 'ar' ? 'طبقات هندسية اختيارية ومترابطة' : 'Optional connected engineering layers'}>
        <span className="system-map-core">OTONOM</span>
        {labels.map((label, index) => <span className={`system-map-node system-map-node-${index + 1}`} key={label}>{label}</span>)}
        <p>{locale === 'ar' ? 'ليست كل طبقة مطلوبة في كل مشروع' : 'Not every project needs every layer'}</p>
      </div>
    </section>
  );
}

export function CapabilityGrid({ locale, items, example = false }: { locale: Locale; items: ServiceItem[]; example?: boolean }) {
  return (
    <ul className="service-grid">
      {items.map((item) => (
        <li className="service-card" id={item.id} key={item.id ?? item.title}>
          {example ? <span className="service-badge">{locale === 'ar' ? 'مثال توضيحي' : 'Illustrative example'}</span> : null}
          <h3><Bidi text={item.title} locale={locale} /></h3>
          <p><Bidi text={item.body} locale={locale} /></p>
          {item.href ? <LocalLink locale={locale} href={item.href}>{item.label ?? (locale === 'ar' ? 'اعرف المزيد' : 'Learn more')} <span aria-hidden="true">→</span></LocalLink> : null}
        </li>
      ))}
    </ul>
  );
}

export function EntryStagePath({ locale, page }: { locale: Locale; page: ServicePageContent }) {
  return (
    <section className="service-section entry-stage">
      <SectionHead eyebrow={locale === 'ar' ? 'أي مرحلة مناسبة' : 'Any project stage'} title={page.entryTitle} body={page.entryIntro} locale={locale} />
      <CapabilityGrid locale={locale} items={page.entryPoints} />
    </section>
  );
}

export function ProcessSteps({ locale, page }: { locale: Locale; page: ServicePageContent }) {
  return (
    <section className="service-section service-dark">
      <SectionHead eyebrow={locale === 'ar' ? 'طريقة العمل' : 'How the work moves'} title={page.processTitle} body={page.processIntro} locale={locale} />
      <ol className="service-process">
        {page.process.map((step) => <li key={step.title}><h3>{step.title}</h3><p>{step.body}</p></li>)}
      </ol>
    </section>
  );
}

export function ServiceFAQ({ locale, page }: { locale: Locale; page: ServicePageContent }) {
  return (
    <section className="service-section service-faq">
      <SectionHead eyebrow="FAQ" title={page.faqTitle} locale={locale} />
      <div>
        {page.faqs.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
      </div>
    </section>
  );
}

function JourneySections({ locale, page }: { locale: Locale; page: ServicePageContent }) {
  if (!page.journeys) return null;
  return (
    <section className="service-section service-journeys">
      <SectionHead eyebrow={locale === 'ar' ? 'رحلات عميقة' : 'Deep project journeys'} title={locale === 'ar' ? 'راجع الموجود قبل اختيار الخطوة التالية' : 'Review what exists before choosing the next step'} locale={locale} />
      <div className="journey-list">
        {page.journeys.map((journey) => (
          <article key={journey.title}>
            <h3>{journey.title}</h3>
            <p>{journey.body}</p>
            <dl>
              <div><dt>{locale === 'ar' ? 'ما نراجعه' : 'What we review'}</dt><dd>{journey.review}</dd></div>
              <div><dt>{locale === 'ar' ? 'مخرجات محتملة' : 'Potential deliverables'}</dt><dd>{journey.deliverables}</dd></div>
            </dl>
            <LocalLink className="text-arrow" locale={locale} href={journey.href}>{journey.label} <span aria-hidden="true">→</span></LocalLink>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductProof({ locale }: { locale: Locale }) {
  return (
    <section className="service-section service-product-proof">
      <div>
        <p className="eyebrow">{locale === 'ar' ? 'منتجات قائمة' : 'Existing products'}</p>
        <h2>{locale === 'ar' ? 'عائلة وحدات OTONOM الفعلية' : 'The real OTONOM controller family'}</h2>
        <p>{locale === 'ar' ? 'تربط خدمة الأتمتة إلى صفحات 4R و6R و16R الحالية. تظل المواصفات الكهربائية والتوافقات مقيدة بالأدلة المنشورة والمراجعة الخاصة بالمشروع.' : 'The automation service connects to the current 4R, 6R and 16R pages. Electrical specifications and compatibility remain limited to published evidence and project-specific review.'}</p>
        <div className="actions">
          <LocalLink className="btn secondary" locale={locale} href="/products">{locale === 'ar' ? 'استكشف عائلة وحدات التحكم' : 'Explore the controller family'}</LocalLink>
          <LocalLink className="btn" locale={locale} href="/smart-home/packages">{locale === 'ar' ? 'قارن الباقات' : 'Compare packages'}</LocalLink>
        </div>
      </div>
      <div className="service-product-image"><Image src="/products/otonom-16r.png" alt={locale === 'ar' ? 'وحدة تحكم OTONOM 16R — صورة منتج فعلية' : 'OTONOM 16R controller — genuine product image'} width={1254} height={1254} sizes="(max-width: 760px) 88vw, 440px" /></div>
    </section>
  );
}

export function ServiceExperience({ locale, page }: { locale: Locale; page: ServicePageContent }) {
  return (
    <>
      <ServiceHero locale={locale} page={page} />

      <section className="service-section" id="capabilities">
        <SectionHead eyebrow={locale === 'ar' ? 'القدرات' : 'Capabilities'} title={page.capabilitiesTitle} body={page.capabilitiesIntro} locale={locale} />
        <CapabilityGrid locale={locale} items={page.capabilities} />
      </section>

      {page.overview ? (
        <section className="service-section service-discovery" id="find-your-start">
          <SectionHead eyebrow={locale === 'ar' ? 'ابدأ بالنتيجة' : 'Start with the outcome'} title={locale === 'ar' ? 'ماذا تريد أن تحقق؟' : 'What do you want to achieve?'} body={locale === 'ar' ? 'اختر أقرب هدف لتحصل على توجيه معلوماتي فوري. لا تُحفظ بيانات ولا يُصدر قرار جدوى أو سعر.' : 'Choose the closest objective for immediate informational guidance. Nothing is submitted or stored, and this is not a feasibility or pricing decision.'} locale={locale} />
          <StartingPointFinder locale={locale} />
        </section>
      ) : null}

      <section className="service-section service-tint" id={page.productProof ? 'use-cases' : 'problems'}>
        <SectionHead eyebrow={locale === 'ar' ? 'المشكلة والنتيجة' : 'Problem and outcome'} title={page.problemsTitle} body={page.problemsIntro} locale={locale} />
        <CapabilityGrid locale={locale} items={page.problems} />
      </section>

      <JourneySections locale={locale} page={page} />

      <section className="service-section">
        <SectionHead eyebrow={locale === 'ar' ? 'استخدامات محتملة' : 'Possible situations'} title={page.scenariosTitle} body={page.scenariosIntro} locale={locale} />
        <CapabilityGrid locale={locale} items={page.scenarios} example />
      </section>

      <section className="service-section service-stack">
        <SectionHead eyebrow={locale === 'ar' ? 'قدرات مترابطة' : 'Connected capabilities'} title={locale === 'ar' ? 'استكشف طبقات النظام الهندسي' : 'Explore the engineering system layers'} body={locale === 'ar' ? 'اختر طبقة لفهم دورها المحتمل. يمكن أن يبدأ المشروع من أي طبقة، ولا يلزم أن يمر بها كلها.' : 'Choose a layer to understand its possible role. A project can begin at any layer and does not have to include them all.'} locale={locale} />
        <EngineeringLayerExplorer locale={locale} />
      </section>

      <EntryStagePath locale={locale} page={page} />
      <ProcessSteps locale={locale} page={page} />

      <section className="service-section">
        <SectionHead eyebrow={locale === 'ar' ? 'المخرجات' : 'Deliverables'} title={page.deliverablesTitle} body={page.deliverablesIntro} locale={locale} />
        <CapabilityGrid locale={locale} items={page.deliverables} />
      </section>

      {page.productProof ? <ProductProof locale={locale} /> : null}

      <ServiceFAQ locale={locale} page={page} />

      <section className="service-section service-related">
        <SectionHead eyebrow={locale === 'ar' ? 'خدمات مرتبطة' : 'Related services'} title={page.relatedTitle} locale={locale} />
        <CapabilityGrid locale={locale} items={page.related} />
      </section>

      <section className="wave-final service-final">
        <div><h2>{page.ctaTitle}</h2><p>{page.ctaBody}</p></div>
        <LocalLink className="btn btn-light" locale={locale} href={page.productProof ? '/start-project?service=smart-home' : '/start-project'}>{page.ctaLabel}</LocalLink>
      </section>
    </>
  );
}
