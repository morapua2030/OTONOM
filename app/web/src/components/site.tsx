import type { ReactNode } from 'react';
import { t, type Locale } from '@/lib/i18n.ts';
import { Bidi } from './bidi.tsx';
import { LangSwitch } from './LangSwitch.tsx';

function NavLinks({ locale }: { locale: Locale }) {
  const d = t(locale);
  const L = (p: string) => `/${locale}${p}`;
  return (
    <>
      <a href={L('/solutions')}>{d.nav.solutions}</a>
      <a href={L('/business/developers')}>{d.nav.business}</a>
      <a href={L('/projects')}>{d.nav.projects}</a>
      <a href={L('/technology')}>{d.nav.technology}</a>
      <a href={L('/shop')}>{d.nav.controllers}</a>
      <a href={L('/support')}>{d.nav.support}</a>
      <a href={L('/about')}>{d.nav.about}</a>
    </>
  );
}

export function SiteHeader({ locale }: { locale: Locale }) {
  const d = t(locale);
  const L = (p: string) => `/${locale}${p}`;
  const navLabel = locale === 'ar' ? 'القائمة الرئيسية' : 'Main navigation';
  return (
    <header className="header">
      <div className="wrap header-row">
        <a className="brand" href={L('')} aria-label={locale === 'ar' ? 'OTONOM — الصفحة الرئيسية' : 'OTONOM — home'}>
          <span className="brand-mark" aria-hidden="true">O</span><span>{d.brand}</span>
        </a>
        <nav className="nav nav-desktop" aria-label={navLabel}>
          <NavLinks locale={locale} />
        </nav>
        <div className="header-actions">
          <LangSwitch locale={locale} label={d.switchLang} />
          <a className="btn btn-sm" href={L('/business/request-a-proposal')}>
            {d.cta.proposal}
          </a>
        </div>
        {/* no-JS disclosure menu for small screens */}
        <details className="menu-mobile">
          <summary aria-label={navLabel}>{locale === 'ar' ? 'القائمة' : 'Menu'}</summary>
          <nav className="nav nav-mobile" aria-label={navLabel}>
            <NavLinks locale={locale} />
          </nav>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const d = t(locale);
  const L = (p: string) => `/${locale}${p}`;
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div>
          <strong className="brand">{d.brand}</strong>
          <p className="muted">
            <Bidi text={d.pages.about.body} locale={locale} />
          </p>
        </div>
        <nav aria-label={locale === 'ar' ? 'روابط الشركات' : 'Business links'}>
          <a href={L('/business/developers')}>{locale === 'ar' ? 'للمطورين' : 'Developers'}</a>
          <a href={L('/business/contractors')}>{locale === 'ar' ? 'للمقاولين' : 'Contractors'}</a>
          <a href={L('/business/partners')}>{locale === 'ar' ? 'الشركاء' : 'Partners'}</a>
          <a href={L('/business/request-a-proposal')}>{d.cta.proposal}</a>
        </nav>
        <nav aria-label={locale === 'ar' ? 'روابط الاستكشاف' : 'Explore links'}>
          <a href={L('/solutions')}>{d.nav.solutions}</a>
          <a href={L('/technology/controllers')}>{d.nav.controllers}</a>
          <a href={L('/technology/integrations')}>{d.nav.technology}</a>
          <a href={L('/projects')}>{d.nav.projects}</a>
        </nav>
        <nav aria-label={locale === 'ar' ? 'روابط عامة' : 'General links'}>
          <a href={L('/about')}>{d.nav.about}</a>
          <a href={L('/insights')}>{d.nav.insights}</a>
          <a href={L('/contact')}>{d.nav.contact}</a>
          <a href={L('/support')}>{d.nav.support}</a>
          <a href={L('/legal/privacy')}>{d.footer.legal}</a>
          <a href={L('/preview')}>{d.footer.preview}</a>
        </nav>
      </div>
      <div className="wrap footer-bottom"><span>© {d.footer.rights}</span><span>{locale === 'ar' ? 'معاينة داخلية · لا بيع عام' : 'Internal preview · no public selling'}</span></div>
    </footer>
  );
}

export function Placeholder({ locale }: { locale: Locale }) {
  return <span className="placeholder">{t(locale).placeholderNote}</span>;
}

export function Section({ title, children, locale, intro, id }: { title: string; children: ReactNode; locale?: string; intro?: string; id?: string }) {
  return (
    <section className="section" id={id}>
      <h2>
        <Bidi text={title} locale={locale ?? 'en'} />
      </h2>
      {intro && (
        <p className="lead">
          <Bidi text={intro} locale={locale ?? 'en'} />
        </p>
      )}
      {children}
    </section>
  );
}
