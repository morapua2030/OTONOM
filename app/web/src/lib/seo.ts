import type { Metadata } from 'next';
import type { Locale } from './i18n.ts';
import { isolateText } from '../components/bidi.tsx';
import { publicMarketingOnly } from './deployment.ts';

/**
 * Per-page metadata: localized title/description, canonical and reciprocal hreflang for the SAME path in both locales.
 * Robots stay noindex/nofollow while the site is a non-public preview (public launch needs owner + legal approval).
 */
export function pageMetadata(o: { locale: Locale; path: string; title: string; description?: string | null; noindex?: boolean }): Metadata {
  const p = o.path === '/' ? '' : o.path;
  const title = isolateText(o.title, o.locale);
  const description = o.description ? isolateText(o.description, o.locale) : undefined;
  const noindex = o.noindex ?? !publicMarketingOnly();
  return {
    title,
    description,
    alternates: {
      canonical: `/${o.locale}${p}`,
      languages: { ar: `/ar${p}`, en: `/en${p}`, 'x-default': `/ar${p}` },
    },
    openGraph: { title, description, locale: o.locale === 'ar' ? 'ar_EG' : 'en_US', alternateLocale: o.locale === 'ar' ? 'en_US' : 'ar_EG', type: 'website', images: ['/brand/otonom-logo.png'] },
    twitter: { card: 'summary', title, description, images: ['/brand/otonom-logo.png'] },
    robots: { index: !noindex, follow: !noindex },
  };
}

/** First sentence (max ~160 chars) of a body text, used as the meta description fallback. */
export function summarise(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  const first = text.split(/(?<=[.!?؟。])\s/)[0] ?? text;
  return first.length > 160 ? `${first.slice(0, 157)}…` : first;
}
