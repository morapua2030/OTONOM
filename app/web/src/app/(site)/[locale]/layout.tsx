import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import '../site.css';
import '../hybrid03.css';
import '../v2.css';
import { dirOf, isLocale, t } from '@/lib/i18n.ts';
import { SiteHeader, SiteFooter } from '@/components/site.tsx';
import { Bidi } from '@/components/bidi.tsx';
import { publicMarketingOnly } from '@/lib/deployment.ts';
import { SITE_URL } from '@/lib/server.ts';
import { loadSiteContent } from '@/lib/site-content.ts';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const publicRelease = publicMarketingOnly();
  return {
    // Absolute canonical, hreflang and social URLs on the configured site origin (D8-A carry-over).
    metadataBase: new URL(SITE_URL),
    // Plain text: document titles and meta text carry no bidi control characters (D8-C v5); isolation is for the body.
    title: { default: 'OTONOM', template: '%s — OTONOM' },
    robots: { index: publicRelease, follow: publicRelease },
    icons: { icon: '/brand/otonom/assets/icons/favicon.ico', apple: '/brand/otonom/assets/icons/app-icon-concept-navy-1024.png' },
    other: { 'content-language': locale },
  };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = t(locale);
  const publicRelease = publicMarketingOnly();
  // Admin-managed content (published only), cached; the built-in values when nothing is published or the DB is down.
  const content = await loadSiteContent();
  const announcement = content.announcement;
  return (
    <html lang={locale} dir={dirOf(locale)}>
      <body>
        <a href="#main" className="skip">
          {locale === 'ar' ? 'انتقل إلى المحتوى' : 'Skip to content'}
        </a>
        {!publicRelease && (
          <div className="banner" role="status">
            <div className="wrap">
              <Bidi text={d.previewBanner} locale={locale} /> <a href={`/${locale}/preview`}>{d.previewLink}</a>
            </div>
          </div>
        )}
        {announcement ? (
          <div className="announce-bar" role="region" aria-label={locale === 'ar' ? 'إعلان' : 'Announcement'} data-testid="announcement-bar">
            <div className="wrap">
              {announcement.link ? <a href={announcement.link}><Bidi text={announcement.text[locale]} locale={locale} /></a> : <Bidi text={announcement.text[locale]} locale={locale} />}
            </div>
          </div>
        ) : null}
        <SiteHeader locale={locale} />
        {/* tabIndex -1: the skip link moves focus into <main>, not only the scroll position */}
        <main id="main" className="wrap" tabIndex={-1}>
          {children}
        </main>
        {/* SiteFooter also starts the site metrics, only after the page load event (owner, 2026-11-04). */}
        <SiteFooter locale={locale} publicRelease={publicRelease} content={content} />
      </body>
    </html>
  );
}
