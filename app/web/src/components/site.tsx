import type { ReactNode } from 'react';
import Link from 'next/link';
import { t, type Locale } from '@/lib/i18n.ts';
import { wave } from '@/lib/wave1.ts';
import { Bidi } from './bidi.tsx';
import { LangSwitch } from './LangSwitch.tsx';
import { ServiceNavMenu } from './ServiceNavMenu.tsx';
import { SiteNavLink } from './SiteNavLink.tsx';
import { BrandLogo } from './BrandLogo.tsx';
import { EscapableDetails } from './EscapableDetails.tsx';
import { bookVisitMessage, EXTERNAL_LINK, PHONE_DISPLAY, telHref, whatsappHref } from '@/lib/contact.ts';

const label = (locale: Locale, ar: string, en: string) => (locale === 'ar' ? ar : en);

/** Design v2 primary navigation (DR-099/100). Services keeps its <details> menu (all five service links). */
function NavLinks({ locale, drawer = false }: { locale: Locale; drawer?: boolean }) {
  const d = wave(locale);
  const L = (p: string) => `/${locale}${p}`;
  return (
    <>
      <SiteNavLink href={L('')} label={label(locale, 'الرئيسية', 'Home')} exact />
      <ServiceNavMenu locale={locale} label={d.nav.services} items={d.services} />
      <SiteNavLink href={L('/products')} label={label(locale, 'الكنترولرات', 'Controllers')} />
      <SiteNavLink href={L('/smart-home/packages')} label={label(locale, 'الباقات', 'Packages')} />
      <SiteNavLink href={L('/projects')} label={d.nav.work} />
      <SiteNavLink href={L('/contact')} label={label(locale, 'تواصل معنا', 'Contact')} />
      {drawer ? (
        <>
          <SiteNavLink href={L('/solutions')} label={d.nav.solutions} />
          <SiteNavLink href={L('/about')} label={d.nav.company} />
          <SiteNavLink href={L('/engineering-process')} label={label(locale, 'العملية الهندسية', 'Engineering process')} />
          <SiteNavLink href={L('/start-project')} label={label(locale, 'أداة بناء المشروع', 'Project Builder')} />
          <SiteNavLink href={L('/support')} label={label(locale, 'الدعم', 'Support')} />
        </>
      ) : null}
    </>
  );
}

function BookVisitLink({ locale, className }: { locale: Locale; className: string }) {
  return (
    <a className={className} href={whatsappHref(bookVisitMessage(locale))} {...EXTERNAL_LINK}>
      {label(locale, 'احجز زيارة', 'Book a visit')}
    </a>
  );
}

function LanguageLink({ locale }: { locale: Locale }) {
  return <LangSwitch locale={locale} label={label(locale, 'EN', 'عربي')} name={label(locale, 'English', 'العربية')} className="lang-link" />;
}

export function SiteHeader({ locale }: { locale: Locale }) {
  const navLabel = label(locale, 'القائمة الرئيسية', 'Main navigation');
  return (
    <header className="header">
      <div className="wrap header-row">
        <Link className="brand" href={`/${locale}`} aria-label={label(locale, 'OTONOM — الصفحة الرئيسية', 'OTONOM — home')}>
          <BrandLogo className="brand-logo brand-logo-header" variant="wordmark-light" decorative priority />
        </Link>
        <nav className="nav nav-desktop" aria-label={navLabel}><NavLinks locale={locale} /></nav>
        <div className="header-actions">
          <LanguageLink locale={locale} />
          <BookVisitLink locale={locale} className="btn btn-sm header-book" />
        </div>
        <EscapableDetails className="menu-mobile">
          <summary aria-label={navLabel}>
            <span className="hamburger" aria-hidden="true"><span /><span /><span /></span>
          </summary>
          <nav className="nav nav-mobile" aria-label={navLabel}>
            <NavLinks locale={locale} drawer />
            <BookVisitLink locale={locale} className="btn drawer-book" />
          </nav>
        </EscapableDetails>
      </div>
    </header>
  );
}

export function SiteFooter({ locale, publicRelease = false }: { locale: Locale; publicRelease?: boolean }) {
  const d = t(locale);
  const w = wave(locale);
  const L = (p: string) => `/${locale}${p}`;
  return (
    <footer className="footer">
      <div className="wrap footer-top">
        <Link className="brand footer-brand" href={L('')} aria-label={label(locale, 'OTONOM — الصفحة الرئيسية', 'OTONOM — home')}>
          <BrandLogo className="brand-logo brand-logo-footer" variant="primary-dark" decorative />
        </Link>
        <div className="footer-contact">
          <a href={telHref()} dir="ltr" className="footer-phone">{PHONE_DISPLAY}</a>
          <a href={whatsappHref(bookVisitMessage(locale))} {...EXTERNAL_LINK}>{label(locale, 'واتساب', 'WhatsApp')}</a>
          <LanguageLink locale={locale} />
        </div>
      </div>
      <div className="wrap footer-grid">
        <nav aria-label={label(locale, 'الصفحات الرئيسية', 'Main pages')}>
          <Link href={L('')}>{label(locale, 'الرئيسية', 'Home')}</Link>
          <Link href={L('/products')}>{label(locale, 'الكنترولرات', 'Controllers')}</Link>
          <Link href={L('/smart-home/packages')}>{label(locale, 'الباقات', 'Packages')}</Link>
          <Link href={L('/contact')}>{label(locale, 'تواصل معنا', 'Contact')}</Link>
          <Link href={L('/projects')}>{w.nav.work}</Link>
        </nav>
        <nav aria-label={label(locale, 'الخدمات', 'Services')}>
          <Link href={L('/services')}>{w.nav.services}</Link>
          {w.services.map((item) => <Link href={L(item.href)} key={item.href}>{item.title}</Link>)}
        </nav>
        <nav aria-label={label(locale, 'الشركة والدعم', 'Company and support')}>
          <Link href={L('/solutions')}>{w.nav.solutions}</Link>
          <Link href={L('/about')}>{w.nav.company}</Link>
          <Link href={L('/engineering-process')}>{label(locale, 'العملية الهندسية', 'Engineering process')}</Link>
          <Link href={L('/build-with-us')}>{w.nav.build}</Link>
          <Link href={L('/start-project')}>{label(locale, 'أداة بناء المشروع', 'Project Builder')}</Link>
          <Link href={L('/support')}>{d.nav.support}</Link>
          <Link href={L('/legal/privacy')}>{d.footer.legal}</Link>
          {!publicRelease && <Link href={L('/preview')}>{d.footer.preview}</Link>}
        </nav>
      </div>
      <div className="wrap footer-bottom">
        <span dir="ltr" className="footer-copy">© 2026 OTONOM</span>
        <span>{publicRelease ? label(locale, 'موقع معلومات عام · التجارة والضمان الإلكتروني غير مفعّلين', 'Public information site · commerce and online warranty are disabled') : label(locale, 'معاينة محمية · لا بيع عام', 'Protected preview · no public selling')}</span>
      </div>
    </footer>
  );
}

export function Placeholder({ locale }: { locale: Locale }) {
  return <span className="placeholder">{t(locale).placeholderNote}</span>;
}

export function Section({ title, children, locale, intro, id }: { title: string; children: ReactNode; locale?: string; intro?: string; id?: string }) {
  return (
    <section className="section" id={id}>
      <h2><Bidi text={title} locale={locale ?? 'en'} /></h2>
      {intro && <p className="lead"><Bidi text={intro} locale={locale ?? 'en'} /></p>}
      {children}
    </section>
  );
}
