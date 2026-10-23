import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import '../site.css';
import { dirOf, isLocale, t } from '@/lib/i18n.ts';
import { SiteHeader, SiteFooter } from '@/components/site.tsx';
import { Bidi, ltrIsolate } from '@/components/bidi.tsx';
import { publicMarketingOnly } from '@/lib/deployment.ts';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const publicRelease = publicMarketingOnly();
  return {
    title: { default: 'OTONOM', template: locale === 'ar' ? `%s — ${ltrIsolate('OTONOM')}` : '%s — OTONOM' },
    robots: { index: publicRelease, follow: publicRelease },
    icons: { icon: '/brand/otonom-logo.png', apple: '/brand/otonom-logo.png' },
    other: { 'content-language': locale },
  };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = t(locale);
  const publicRelease = publicMarketingOnly();
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
        <SiteHeader locale={locale} />
        <main id="main" className="wrap">
          {children}
        </main>
        <SiteFooter locale={locale} publicRelease={publicRelease} />
      </body>
    </html>
  );
}
