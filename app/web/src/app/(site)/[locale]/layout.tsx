import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import '../site.css';
import '../hybrid03.css';
import '../v2.css';
import { fontVariables } from '../fonts.ts';
import { dirOf, isLocale, t } from '@/lib/i18n.ts';
import { SiteHeader, SiteFooter } from '@/components/site.tsx';
import { Bidi, ltrIsolate } from '@/components/bidi.tsx';
import { publicMarketingOnly } from '@/lib/deployment.ts';
import { SITE_URL } from '@/lib/server.ts';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const publicRelease = publicMarketingOnly();
  return {
    // Absolute canonical, hreflang and social URLs on the configured site origin (D8-A carry-over).
    metadataBase: new URL(SITE_URL),
    title: { default: 'OTONOM', template: locale === 'ar' ? `%s — ${ltrIsolate('OTONOM')}` : '%s — OTONOM' },
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
  return (
    <html lang={locale} dir={dirOf(locale)} className={fontVariables}>
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
        <SiteHeader locale={locale} />
        {/* tabIndex -1: the skip link moves focus into <main>, not only the scroll position */}
        <main id="main" className="wrap" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter locale={locale} publicRelease={publicRelease} />
      </body>
    </html>
  );
}
