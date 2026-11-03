import Image from 'next/image';
import type { Locale } from '@/lib/i18n.ts';
import { localProductText, requireProductByModel } from '@/lib/products.ts';
import { formatPackageAmount, packageCurrency, packageText, SMART_HOME_PACKAGES, type PackageItemKey } from '@/lib/smart-home-packages.ts';
import { bookVisitMessage, EXTERNAL_LINK, whatsappHref } from '@/lib/contact.ts';
import { Bidi } from './bidi.tsx';
import { SwashText } from './v2.tsx';
import { ItemVisual } from './package-items.tsx';
import { PackageTiles, packageDisplayName, packageItemLine } from './SmartHomePackages.tsx';

const tx = (locale: Locale, ar: string, en: string) => (locale === 'ar' ? ar : en);

/** Home (mix) copy, verbatim from the owner-approved design v2 reference (DR-100; AR colloquial, EN). */
export const HOME_MIX = {
  eyebrow: 'OTONOM · IoT Solutions',
  title: { ar: 'بيتك ومشروعك، شغّالين بذكاء.', en: 'Your home and your project, running smart.' },
  swash: { ar: 'بذكاء.', en: 'smart.' },
  lead: {
    ar: 'OTONOM شركة هندسية مصرية بتصمّم وتركّب المنزل الذكي بكنترولر OTONOM 16R، وبتطوّر حلول إنترنت الأشياء والبرمجيات للأفراد والشركات.',
    en: 'OTONOM is an Egyptian engineering company. We design and install smart homes built on the OTONOM 16R controller, and we build IoT and software solutions for people and businesses.',
  },
};

const ITEM_ORDER: PackageItemKey[] = ['controller', 'alexa', 'lock', 'ir', 'gas', 'panel'];
const DISCIPLINES = [
  { slug: 'iot-embedded', ar: ['إنترنت الأشياء والأنظمة المدمجة', 'أجهزة متصلة والسوفتوير اللي بيشغّلها.'], en: ['IoT & Embedded', 'Connected devices and the firmware that runs them.'] },
  { slug: 'software-engineering', ar: ['هندسة البرمجيات', 'تطبيقات ولوحات تحكم وأنظمة خلفية لمنتجك.'], en: ['Software Engineering', 'Apps, dashboards and backend systems for your product.'] },
  { slug: 'smart-home-automation', ar: ['المنزل الذكي والأتمتة', 'باقات OTONOM للبيوت، وفريقنا بيركّبها.'], en: ['Smart Home & Automation', 'OTONOM packages for homes, installed by our team.'] },
  { slug: 'custom-engineering', ar: ['الهندسة المخصصة والبحث والتطوير', 'شغل هندسي مبني على متطلبات مشروعك.'], en: ['Custom Engineering & R&D', 'Engineering work built around your specific requirement.'] },
] as const;
const ENTRY_CHIPS = [['عندي فكرة', 'I have an idea'], ['عندي نموذج أولي', 'I have a prototype'], ['عندي نظام قائم', 'I have an existing system'], ['لسه مش متأكد', 'Not sure yet']] as const;
const STEPS = [
  ['احجز زيارة', 'ابعتلنا على واتساب والباقة اللي مهتم بيها.', 'Book a visit', 'Message us on WhatsApp with the package you’re interested in.'],
  ['اختار باقتك', 'Premium أو Plus أو Essential حسب احتياج بيتك.', 'Pick your package', 'Premium, Plus or Essential, based on what your home needs.'],
  ['فريقنا بيركّب', 'فريقنا بيركّب الكنترولر ولوحة الكهرباء والأسلاك.', 'We install', 'Our team fits the controller, panel and wiring.'],
  ['تحكّم بصوتك أو بريموت IR', 'شغّل بيتك بصوتك مع Amazon Alexa أو بريموت IR.', 'Control it by voice or IR remote', 'Run your home by voice with Amazon Alexa or with the IR remote.'],
] as const;

/** "Everything in a package" grid (shared by Home and the smart-home page). */
export function HomeItemsSection({ locale }: { locale: Locale }) {
  const itemNames = new Map(SMART_HOME_PACKAGES.flatMap((entry) => entry.items).map((entry) => [entry.key, entry.name]));
  return (
      <section className="v2-section" aria-labelledby="home-items">
      <div className="v2-section-head">
        <h2 id="home-items"><SwashText text={tx(locale, 'كل اللي في الباقة', 'Everything in a package')} word={tx(locale, 'الباقة', 'package')} locale={locale} /></h2>
        <p><Bidi text={tx(locale, 'المكوّنات التي تتكوّن منها باقات OTONOM للمنزل الذكي.', 'The parts that go into OTONOM Smart Home Packages.')} locale={locale} /></p>
      </div>
      <ul className="v2-items-grid">
        {ITEM_ORDER.map((key) => (
          <li className="v2-item-card" key={key}>
            <span className="v2-item-visual"><ItemVisual item={key} locale={locale} sizes="(max-width: 600px) 40vw, 160px" /></span>
            <span className="v2-item-label"><Bidi text={packageText(itemNames.get(key)!, locale)} locale={locale} /></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Package cards; Home opens WhatsApp, the smart-home page preselects the package on Contact (design v2/v3.1). */
export function HomePackagesSection({ locale, choose }: { locale: Locale; choose: 'whatsapp' | 'contact' }) {
  const L = (p: string) => `/${locale}${p}`;
  return (
      <section className="v2-section" aria-labelledby="home-packages">
      <div className="v2-section-head-row">
        <div className="v2-section-head">
          <h2 id="home-packages">{tx(locale, 'باقات المنزل الذكي', 'Smart Home Packages')}</h2>
          <p>{tx(locale, 'ثلاث باقات، لكل باقة مكوناتها وسعرها الإجمالي.', 'Three packages, each with its included items and total price.')}</p>
        </div>
        <a className="btn secondary" href={L('/smart-home/packages')}>{tx(locale, 'قارن الباقات', 'Compare packages')}</a>
      </div>
      <div className="v2-pkg-grid" data-testid="home-packages">
        {SMART_HOME_PACKAGES.map((entry, index) => {
          const name = packageDisplayName(entry, locale);
          return (
            <article className={`v2-pkg-card${entry.badge ? ' is-featured' : ''}`} key={entry.id} data-package={entry.id}>
              <div className="v2-pkg-top">
                <span className="v2-pkg-num" dir="ltr">{String(index + 1).padStart(2, '0')}</span>
                {entry.badge ? <span className="v2-pkg-badge">{packageText(entry.badge, locale)}</span> : null}
              </div>
              <h3><Bidi text={name} locale={locale} /></h3>
              <PackageTiles entry={entry} locale={locale} />
              <ul className="v2-pkg-items">
                {entry.items.map((packageItem) => <li key={packageItem.key}><Bidi text={packageItemLine(packageItem, locale)} locale={locale} /></li>)}
              </ul>
              <div className="v2-pkg-price">
                <span className="v2-pkg-price-label">{tx(locale, 'السعر الإجمالي', 'Total price')}</span>
                <span className="v2-pkg-price-value"><bdi dir="ltr">{formatPackageAmount(entry.priceEgp)}</bdi> <span className="v2-pkg-currency">{packageCurrency(locale)}</span></span>
              </div>
              {choose === 'whatsapp' ? (
                <a className="btn" href={whatsappHref(bookVisitMessage(locale, entry.id))} {...EXTERNAL_LINK} data-testid={`home-choose-${entry.id}`}>
                  <Bidi text={tx(locale, `اختر ${name}`, `Choose ${name}`)} locale={locale} />
                </a>
              ) : (
                <a className="btn" href={`/${locale}/contact?package=${entry.id}`}>
                  <Bidi text={tx(locale, `اختر ${name}`, `Choose ${name}`)} locale={locale} />
                </a>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function HomeMix({ locale }: { locale: Locale }) {
  const L = (p: string) => `/${locale}${p}`;
  const r16 = requireProductByModel('16r');
  const minis = (['4r', '6r'] as const).map((model) => requireProductByModel(model));
  return (
    <div className="v2-home">
      <section className="v2-hero" aria-labelledby="home-title">
        <div className="v2-hero-copy">
          <span className="v2-eyebrow" dir="ltr">{HOME_MIX.eyebrow}</span>
          <h1 id="home-title"><SwashText text={HOME_MIX.title[locale]} word={HOME_MIX.swash[locale]} locale={locale} /></h1>
          <p className="v2-lead"><Bidi text={HOME_MIX.lead[locale]} locale={locale} /></p>
          <div className="v2-actions">
            <a className="btn" href={L('/smart-home/packages')}>{tx(locale, 'عرض الباقات', 'See packages')}</a>
            <a className="btn secondary" href="#start">{tx(locale, 'ابدأ مشروعك', 'Start your project')}</a>
          </div>
        </div>
        <div className="v2-hero-card">
          <Image src={r16.image} alt={localProductText(r16.alt, locale)} width={1254} height={1254} sizes="(max-width: 900px) 70vw, 420px" priority />
          <span className="v2-pill v2-badge-pin"><Bidi text={tx(locale, 'كنترولر 16R الذكي', '16R Smart Controller')} locale={locale} /></span>
        </div>
      </section>

      <section className="v2-section" aria-labelledby="home-16r">
        <h2 id="home-16r"><bdi dir="ltr">16R</bdi> — <SwashText text={tx(locale, 'قلب المنظومة', 'the heart of the system')} word={tx(locale, 'قلب', 'heart')} locale={locale} /></h2>
        <div className="v2-spotlight">
          <div className="v2-img-panel">
            <Image src={r16.image} alt={localProductText(r16.alt, locale)} width={1254} height={1254} sizes="(max-width: 900px) 80vw, 420px" />
          </div>
          <div className="v2-spotlight-info">
            <span className="v2-model-huge" dir="ltr">16R</span>
            <span className="v2-pill"><Bidi text={tx(locale, '16 قناة تحكم', '16 control channels')} locale={locale} /></span>
            <p><Bidi text={tx(locale, 'الكنترولر اللي جوه كل باقات OTONOM', 'The controller inside every OTONOM package')} locale={locale} /></p>
            <a className="btn" href={L('/products/16r')}><Bidi text={tx(locale, 'تعرّف على 16R', 'Meet the 16R')} locale={locale} /></a>
          </div>
        </div>
        <div className="v2-mini-grid">
          {minis.map((product) => (
            <a className="v2-mini-card" href={L(`/products/${product.model}`)} key={product.model}>
              <span className="v2-mini-img"><Image src={product.image} alt={localProductText(product.alt, locale)} width={1254} height={1254} sizes="88px" /></span>
              <span className="v2-mini-copy">
                <span className="v2-mini-name" dir="ltr">{product.model.toUpperCase()}</span>
                <span className="v2-mini-ch"><Bidi text={tx(locale, `${product.channels} قنوات تحكم`, `${product.channels} control channels`)} locale={locale} /></span>
              </span>
              <span className="v2-mini-arrow" aria-hidden="true">→</span>
            </a>
          ))}
        </div>
      </section>

      <HomeItemsSection locale={locale} />
      <HomePackagesSection locale={locale} choose="whatsapp" />

      <section className="v2-section" id="start" aria-labelledby="home-start">
        <div className="v2-section-head">
          <h2 id="home-start"><SwashText text={tx(locale, 'أكتر من منزل ذكي', 'More than smart home')} word={tx(locale, 'منزل ذكي', 'smart home')} locale={locale} /></h2>
          <p><Bidi text={tx(locale, 'OTONOM بتشتغل في أربع تخصصات هندسية.', 'OTONOM works across four engineering disciplines.')} locale={locale} /></p>
        </div>
        <div className="v2-grid-4">
          {DISCIPLINES.map((discipline) => (
            <article className="v2-card" key={discipline.slug}>
              <h3 className="v2-card-title"><Bidi text={discipline[locale][0]} locale={locale} /></h3>
              <p><Bidi text={discipline[locale][1]} locale={locale} /></p>
              <a className="v2-arrow-link" href={L(`/services/${discipline.slug}`)}>
                {tx(locale, 'اعرف أكتر', 'Learn more')} <span className="sr-only">: {discipline[locale][0]}</span><span className="v2-arrow-icon" aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </div>
        <div className="v2-entry">
          <span className="v2-entry-label">{tx(locale, 'ابدأ مشروعك', 'Start your project')}</span>
          {ENTRY_CHIPS.map(([ar, en]) => <a className="v2-chip" href={L('/start-project')} key={en}>{tx(locale, ar, en)}</a>)}
        </div>
      </section>

      <section className="v2-section" aria-labelledby="home-steps">
        <h2 id="home-steps">{tx(locale, 'إزاي بنشتغل', 'How it works')}</h2>
        <ol className="v2-steps">
          {STEPS.map(([arTitle, arBody, enTitle, enBody], index) => (
            <li className="v2-card" key={enTitle}>
              <span className="v2-step-num" dir="ltr">{index + 1}</span>
              <h3 className="v2-card-title"><Bidi text={tx(locale, arTitle, enTitle)} locale={locale} /></h3>
              <p><Bidi text={tx(locale, arBody, enBody)} locale={locale} /></p>
            </li>
          ))}
        </ol>
      </section>

      <section className="v2-section" aria-labelledby="home-alexa">
        <div className="v2-band-dark">
          <h2 id="home-alexa"><Bidi text={tx(locale, 'كل الباقات فيها Amazon Alexa، وتقدر تتحكم في الإضاءة والتكييف والأجهزة بصوتك.', 'Every package includes Amazon Alexa, so you can control lights, AC and devices by voice.')} locale={locale} /></h2>
          <div className="v2-band-side">
            <span className="v2-band-visual"><ItemVisual item="alexa" locale={locale} sizes="200px" /></span>
            <div className="v2-band-actions">
              <a className="btn btn-on-dark is-primary" href={whatsappHref(bookVisitMessage(locale))} {...EXTERNAL_LINK}>{tx(locale, 'احجز زيارة', 'Book a visit')}</a>
              <a className="btn btn-on-dark" href={L('/smart-home/packages')}>{tx(locale, 'قارن الباقات', 'Compare packages')}</a>
            </div>
          </div>
        </div>
      </section>

      <section className="v2-section" aria-labelledby="home-business">
        <div className="v2-band-ice">
          <div className="v2-section-head">
            <h2 id="home-business">{tx(locale, 'للشركات والمطوّرين', 'For businesses and developers')}</h2>
            <p>{tx(locale, 'مشروعات متعددة الوحدات بنراجعها هندسيًا معاك.', 'Multi-unit projects reviewed with you, engineer to engineer.')}</p>
          </div>
          <div className="v2-actions">
            <a className="btn secondary" href={L('/business/developers')}>{tx(locale, 'للمطوّرين', 'Developers')}</a>
            <a className="btn secondary" href={L('/business/contractors')}>{tx(locale, 'للمقاولين', 'Contractors')}</a>
          </div>
        </div>
      </section>
    </div>
  );
}
