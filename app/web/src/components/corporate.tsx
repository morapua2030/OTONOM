import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n.ts';
import { wave, type WaveItem, type WavePage } from '@/lib/wave1.ts';
import { Bidi } from './bidi.tsx';

function LocalLink({ locale, href, className, children }: { locale: Locale; href: string; className?: string; children: ReactNode }) {
  return <Link className={className} href={`/${locale}${href}`}>{children}</Link>;
}

export function WaveCards({ locale, items, ordered = false }: { locale: Locale; items: readonly WaveItem[]; ordered?: boolean }) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={`wave-cards${ordered ? ' wave-cards-ordered' : ''}`}>
      {items.map((item) => (
        <li className="wave-card" id={item.href?.split('#')[1]} key={item.title}>
          <h3><Bidi text={item.title} locale={locale} /></h3>
          <p><Bidi text={item.body} locale={locale} /></p>
          {item.href && <LocalLink locale={locale} href={item.href}>{item.label ?? (locale === 'ar' ? 'اعرف المزيد' : 'Learn more')} <span aria-hidden="true">↗</span></LocalLink>}
        </li>
      ))}
    </Tag>
  );
}

export function CorporateHome({ locale }: { locale: Locale }) {
  const d = wave(locale);
  return (
    <>
      <section className="wave-hero">
        <div className="wave-hero-copy">
          <p className="eyebrow">{d.hero.eyebrow}</p>
          <h1><Bidi text={d.hero.title} locale={locale} /></h1>
          <p className="wave-lead"><Bidi text={d.hero.body} locale={locale} /></p>
          <div className="actions">
            <LocalLink className="btn" locale={locale} href="/start-project">{d.hero.primary}</LocalLink>
            <LocalLink className="btn secondary" locale={locale} href="/services">{d.hero.secondary}</LocalLink>
          </div>
          <p className="hero-note"><Bidi text={d.hero.note} locale={locale} /></p>
        </div>
        <div className="capability-orbit" aria-label={locale === 'ar' ? 'قدرات OTONOM الأربع' : 'Four OTONOM capabilities'}>
          <div className="orbit-core"><Image src="/brand/otonom-logo.png" alt="" width={776} height={719} priority /><span>OTONOM</span></div>
          {d.services.map((service, index) => <span className={`orbit-node orbit-node-${index + 1}`} key={service.title}>{service.title}</span>)}
        </div>
      </section>

      <section className="wave-strip" aria-label={d.pathsTitle}>
        {d.paths.map((item, index) => <LocalLink locale={locale} href={item.href} key={item.title}><span>0{index + 1}</span>{item.title}</LocalLink>)}
      </section>

      <section className="wave-section" id="capabilities">
        <div className="section-head"><p className="eyebrow">{locale === 'ar' ? 'قدرات مترابطة' : 'Connected capabilities'}</p><h2>{d.servicesTitle}</h2><p>{d.servicesBody}</p></div>
        <WaveCards locale={locale} items={d.services} />
      </section>

      <section className="wave-section wave-dark">
        <div className="section-head"><p className="eyebrow">{locale === 'ar' ? 'مسار المشروع' : 'Project path'}</p><h2>{d.processTitle}</h2><p>{d.processBody}</p></div>
        <WaveCards locale={locale} items={d.process} ordered />
        <LocalLink className="text-arrow" locale={locale} href="/engineering-process">{locale === 'ar' ? 'شاهد العملية الهندسية كاملة' : 'See the full engineering process'} <span aria-hidden="true">→</span></LocalLink>
      </section>

      <section className="wave-section audience-section">
        <div className="section-head"><p className="eyebrow">{locale === 'ar' ? 'من نخدم' : 'Who we work with'}</p><h2>{d.audiencesTitle}</h2></div>
        <WaveCards locale={locale} items={d.audiences} />
      </section>

      <section className="wave-section product-proof">
        <div className="product-proof-copy"><p className="eyebrow">{locale === 'ar' ? 'دليل قائم' : 'Existing proof'}</p><h2>{d.proofTitle}</h2><p><Bidi text={d.proofBody} locale={locale} /></p><LocalLink className="text-arrow" locale={locale} href="/products">{locale === 'ar' ? 'استكشف عائلة وحدات التحكم' : 'Explore the controller family'} <span aria-hidden="true">→</span></LocalLink></div>
        <div className="product-proof-image"><Image src="/products/otonom-16r.png" alt={locale === 'ar' ? 'وحدة تحكم OTONOM 16R — صورة المنتج الفعلية' : 'OTONOM 16R controller — genuine product image'} width={1254} height={1254} sizes="(max-width: 760px) 90vw, 480px" loading="eager" /></div>
      </section>

      <section className="wave-section work-note">
        <p className="eyebrow">{locale === 'ar' ? 'أعمالنا' : 'Our work'}</p><h2>{d.workTitle}</h2><p>{d.workBody}</p><LocalLink className="text-arrow" locale={locale} href="/projects">{locale === 'ar' ? 'كيف نعرض الأعمال بمسؤولية' : 'How we present work responsibly'} <span aria-hidden="true">→</span></LocalLink>
      </section>

      <section className="wave-section path-section">
        <div className="section-head"><p className="eyebrow">{locale === 'ar' ? 'نقطة البداية' : 'Your starting point'}</p><h2>{d.pathsTitle}</h2><p>{d.pathsBody}</p></div>
        <WaveCards locale={locale} items={d.paths} />
      </section>

      <section className="wave-final">
        <div><p className="eyebrow">{locale === 'ar' ? 'ابنِ معنا' : 'Build with us'}</p><h2>{d.finalTitle}</h2><p>{d.finalBody}</p></div>
        <LocalLink className="btn btn-light" locale={locale} href="/start-project">{d.hero.primary}</LocalLink>
      </section>
    </>
  );
}

export function CorporatePage({ locale, page }: { locale: Locale; page: WavePage }) {
  return (
    <>
      <section className="wave-page-hero">
        <p className="eyebrow">{page.eyebrow}</p>
        <h1><Bidi text={page.title} locale={locale} /></h1>
        <p className="wave-lead"><Bidi text={page.body} locale={locale} /></p>
      </section>
      {page.sections.map((section, index) => (
        <section className={`wave-section${index % 2 === 1 ? ' wave-tint' : ''}`} key={section.title}>
          <div className="section-head">
            {section.eyebrow && <p className="eyebrow">{section.eyebrow}</p>}
            <h2><Bidi text={section.title} locale={locale} /></h2>
            {section.body && <p><Bidi text={section.body} locale={locale} /></p>}
          </div>
          {section.items && <WaveCards locale={locale} items={section.items} ordered={page.eyebrow.toLowerCase().includes('process') || page.eyebrow.includes('العملية')} />}
        </section>
      ))}
      <section className="wave-final">
        <div><h2>{page.ctaTitle}</h2><p>{page.ctaBody}</p></div>
        <LocalLink className="btn btn-light" locale={locale} href={page.eyebrow.toLowerCase().includes('support') || page.eyebrow.includes('الدعم') ? '/build-with-us' : '/start-project'}>{locale === 'ar' ? 'الخطوة التالية' : 'Next step'}</LocalLink>
      </section>
    </>
  );
}
