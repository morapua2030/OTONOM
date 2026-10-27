import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { t, type Locale } from '@/lib/i18n.ts';
import { wave } from '@/lib/wave1.ts';
import { Bidi } from './bidi.tsx';
import { LangSwitch } from './LangSwitch.tsx';
import { ServiceNavMenu } from './ServiceNavMenu.tsx';
import { SiteNavLink } from './SiteNavLink.tsx';

function NavLinks({ locale }: { locale: Locale }) {
  const d = wave(locale);
  const links = [
    ['/solutions', d.nav.solutions],
    ['/projects', d.nav.work],
    ['/products', d.nav.products],
    ['/about', d.nav.company],
  ] as const;
  return <><ServiceNavMenu locale={locale} label={d.nav.services} items={d.services} />{links.map(([href, label]) => <SiteNavLink href={`/${locale}${href}`} key={href} label={label} />)}</>;
}

export function SiteHeader({ locale }: { locale: Locale }) {
  const d = t(locale);
  const w = wave(locale);
  const navLabel = locale === 'ar' ? 'القائمة الرئيسية' : 'Main navigation';
  return (
    <header className="header">
      <div className="wrap header-row">
        <Link className="brand" href={`/${locale}`} aria-label={locale === 'ar' ? 'OTONOM — الصفحة الرئيسية' : 'OTONOM — home'}>
          <Image className="brand-logo" src="/brand/otonom-logo.png" alt="" width={776} height={719} priority />
          <span className="brand-name">{d.brand}</span>
        </Link>
        <nav className="nav nav-desktop" aria-label={navLabel}><NavLinks locale={locale} /></nav>
        <div className="header-actions">
          <LangSwitch locale={locale} label={d.switchLang} />
          <Link className="btn btn-sm" href={`/${locale}/build-with-us`}>{w.nav.build}</Link>
        </div>
        <details className="menu-mobile">
          <summary aria-label={navLabel}>{locale === 'ar' ? 'القائمة' : 'Menu'}</summary>
          <nav className="nav nav-mobile" aria-label={navLabel}>
            <NavLinks locale={locale} />
            <Link href={`/${locale}/engineering-process`}>{locale === 'ar' ? 'العملية الهندسية' : 'Engineering process'}</Link>
            <Link href={`/${locale}/contact`}>{locale === 'ar' ? 'تواصل' : 'Contact'}</Link>
            <Link href={`/${locale}/support`}>{locale === 'ar' ? 'الدعم' : 'Support'}</Link>
          </nav>
        </details>
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
      <div className="wrap footer-grid">
        <div>
          <Link className="brand footer-brand" href={L('')} aria-label={locale === 'ar' ? 'OTONOM — الصفحة الرئيسية' : 'OTONOM — home'}>
            <Image className="brand-logo" src="/brand/otonom-logo.png" alt="" width={776} height={719} />
            <span className="brand-name">{d.brand}</span>
          </Link>
          <p className="muted"><Bidi text={w.footerBody} locale={locale} /></p>
        </div>
        <nav aria-label={locale === 'ar' ? 'الخدمات' : 'Services'}>
          <strong>{w.nav.services}</strong>
          {w.services.map((item) => <Link href={L(item.href)} key={item.href}>{item.title}</Link>)}
        </nav>
        <nav aria-label={locale === 'ar' ? 'استكشف' : 'Explore'}>
          <strong>{locale === 'ar' ? 'استكشف' : 'Explore'}</strong>
          <Link href={L('/solutions')}>{w.nav.solutions}</Link>
          <Link href={L('/projects')}>{w.nav.work}</Link>
          <Link href={L('/products')}>{w.nav.products}</Link>
          <Link href={L('/engineering-process')}>{locale === 'ar' ? 'العملية الهندسية' : 'Engineering process'}</Link>
          <Link href={L('/build-with-us')}>{w.nav.build}</Link>
        </nav>
        <nav aria-label={locale === 'ar' ? 'الشركة والدعم' : 'Company and support'}>
          <strong>{locale === 'ar' ? 'الشركة والدعم' : 'Company & support'}</strong>
          <Link href={L('/about')}>{w.nav.company}</Link>
          <Link href={L('/contact')}>{d.nav.contact}</Link>
          <Link href={L('/support')}>{d.nav.support}</Link>
          <Link href={L('/legal/privacy')}>{d.footer.legal}</Link>
          {!publicRelease && <Link href={L('/preview')}>{d.footer.preview}</Link>}
        </nav>
      </div>
      <div className="wrap footer-bottom">
        <span>© OTONOM</span>
        <span>{publicRelease ? (locale === 'ar' ? 'موقع معلومات عام · التجارة والضمان الإلكتروني غير مفعّلين' : 'Public information site · commerce and online warranty are disabled') : (locale === 'ar' ? 'معاينة محمية · لا بيع عام' : 'Protected preview · no public selling')}</span>
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
