import type { ReactNode } from 'react';
import Link from 'next/link';
import { t, type Locale } from '@/lib/i18n.ts';
import { Bidi } from './bidi.tsx';
import { LangSwitch } from './LangSwitch.tsx';
import { ServiceNavMenu } from './ServiceNavMenu.tsx';
import { SiteNavLink } from './SiteNavLink.tsx';
import { BrandLogo } from './BrandLogo.tsx';
import { EscapableDetails } from './EscapableDetails.tsx';
import { DeferredMetrics } from './DeferredMetrics.tsx';
import { bookVisitMessage, EXTERNAL_LINK, phoneDisplay, telHref, whatsappHref } from '@/lib/contact.ts';
import { DEFAULT_SITE_CONTENT, type SiteContent } from '@/lib/site-content.ts';
import { SITE_COPY } from '@/lib/site-copy.ts';
import { SIM_ENTRY } from '@/lib/simulator/copy.ts';

const label = (locale: Locale, ar: string, en: string) => (locale === 'ar' ? ar : en);

/** Design v3.1 navigation (DR-099/106): Home · Smart Home · Controllers · Packages · Services ▾ · Our work · Contact. */
function serviceItems(locale: Locale) {
  const n = SITE_COPY[locale];
  return [
    { title: n.svc.iot.name, href: '/services/iot-embedded' },
    { title: n.svc.soft.name, href: '/services/software-engineering' },
    { title: n.svc.custom.name, href: '/services/custom-engineering' },
    { title: n.nav.smartAuto, href: '/services/smart-home-automation' },
  ];
}

function NavLinks({ locale, drawer = false }: { locale: Locale; drawer?: boolean }) {
  const n = SITE_COPY[locale].nav;
  const L = (p: string) => `/${locale}${p}`;
  return (
    <>
      <SiteNavLink href={L('')} label={n.home} exact />
      <SiteNavLink href={L('/services/smart-home-automation')} label={n.smart} exact />
      <SiteNavLink href={L('/products')} label={n.ctrl} />
      <SiteNavLink href={L('/smart-home/packages')} label={n.pk} />
      {drawer ? <SiteNavLink href={L('/try')} label={SIM_ENTRY[locale].cta} /> : null}
      <ServiceNavMenu locale={locale} label={n.svc} items={serviceItems(locale)} />
      <SiteNavLink href={L('/projects')} label={n.work} />
      <SiteNavLink href={L('/contact')} label={n.contact} />
      {drawer ? (
        <>
          <span className="drawer-rule" aria-hidden="true" />
          <SiteNavLink href={L('/about')} label={n.about} />
          <SiteNavLink href={L('/business/developers')} label={n.dev} />
          <SiteNavLink href={L('/business/contractors')} label={n.contr} />
          <SiteNavLink href={L('/start-project')} label={n.start} />
          <SiteNavLink href={L('/support')} label={n.support} />
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

/** Header: the short "EN" / "عربي"; footer: the full language name, as in the design ("English" / "عربي"). */
function LanguageLink({ locale, place = 'header' }: { locale: Locale; place?: 'header' | 'footer' }) {
  const text = place === 'footer' ? label(locale, 'English', 'عربي') : label(locale, 'EN', 'عربي');
  return <LangSwitch locale={locale} label={text} name={label(locale, 'English', 'العربية')} className="lang-link" />;
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

const SOCIAL_LABELS: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok', x: 'X' };

export function SiteFooter({ locale, content = DEFAULT_SITE_CONTENT }: { locale: Locale; publicRelease?: boolean; content?: SiteContent }) {
  const c = SITE_COPY[locale];
  const contact = content.contact;
  const L = (p: string) => `/${locale}${p}`;
  const columns: Array<{ title: string; links: Array<[string, string]> }> = [
    { title: c.foot.c1, links: [[c.nav.smart, '/services/smart-home-automation'], [c.nav.ctrl, '/products'], [c.nav.pk, '/smart-home/packages'], [SIM_ENTRY[locale].cta, '/try'], ['16R', '/products/16r'], ['4R', '/products/4r'], ['6R', '/products/6r']] },
    { title: c.foot.c2, links: serviceItems(locale).map((item) => [item.title, item.href] as [string, string]) },
    { title: c.foot.c3, links: [[c.nav.about, '/about'], [c.nav.work, '/projects'], [c.nav.dev, '/business/developers'], [c.nav.contr, '/business/contractors'], [c.nav.start, '/start-project']] },
  ];
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        {columns.map((column) => (
          <nav aria-label={column.title} key={column.title}>
            <strong>{column.title}</strong>
            {column.links.map(([text, href]) => <Link href={L(href)} key={href}>{/^\d+R$/.test(text) ? <bdi dir="ltr">{text}</bdi> : text}</Link>)}
          </nav>
        ))}
        <nav aria-label={c.foot.c4} className="footer-contact-col">
          <strong>{c.foot.c4}</strong>
          <a href={telHref(contact.phoneE164)} className="footer-phone"><bdi dir="ltr">{phoneDisplay(contact.phoneE164)}</bdi></a>
          <p className="footer-address"><Bidi text={contact.address[locale]} locale={locale} /></p>
          <a href={whatsappHref(bookVisitMessage(locale), contact.whatsappE164)} {...EXTERNAL_LINK}>{c.foot.wa}</a>
          <Link href={L('/contact')}>{c.nav.contact}</Link>
          <Link href={L('/support')}>{c.nav.support}</Link>
          {/* Social links appear only when the admin fills them; the privacy page only once the OWNER approved it. */}
          {contact.socials.map((social) => (
            <a href={social.url} {...EXTERNAL_LINK} key={social.network} data-testid={`footer-social-${social.network}`}>{SOCIAL_LABELS[social.network] ?? social.network}</a>
          ))}
          {content.privacy.approved ? <Link href={L('/legal/privacy')} data-testid="footer-privacy">{label(locale, 'الخصوصية', 'Privacy')}</Link> : null}
        </nav>
      </div>
      <div className="wrap footer-bottom">
        <Link className="brand footer-brand" href={L('')} aria-label={label(locale, 'OTONOM — الصفحة الرئيسية', 'OTONOM — home')}>
          <BrandLogo className="brand-logo brand-logo-footer" variant="primary-dark" decorative />
        </Link>
        <div className="footer-bottom-end">
          <LanguageLink locale={locale} place="footer" />
          <span dir="ltr" className="footer-copy">© 2026 OTONOM</span>
        </div>
      </div>
      {/* Renders nothing. Loads the site metrics after the page load event (owner, 2026-11-04); imported here so it
          ships in the site chrome's existing script instead of adding a request before the first paint. */}
      <DeferredMetrics />
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
