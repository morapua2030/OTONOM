import type { Metadata } from 'next';
import type { Locale } from './i18n.ts';
import { publicMarketingOnly } from './deployment.ts';

/** Bidi control characters: LRM, RLM, LRE/RLE/PDF/LRO/RLO and LRI/RLI/FSI/PDI. */
const BIDI_CONTROLS = /[‎‏‪-‮⁦-⁩]/g;

/**
 * Plain text for <title>, meta description, Open Graph and Twitter text: no bidi control characters and single
 * spaces. Search results, tabs and share cards show these strings outside the page, where invisible marks render as
 * stray spaces or boxes; bidi isolation stays in the visible page body (<Bidi>, <Ltr>).
 */
export function metaText(text: string): string {
  return text.replace(BIDI_CONTROLS, '').replace(/\s+/g, ' ').trim();
}

/**
 * Per-page metadata: localized title/description, canonical and reciprocal hreflang for the SAME path in both locales.
 * Robots stay noindex/nofollow while the site is a non-public preview (public launch needs owner + legal approval).
 */
export function pageMetadata(o: { locale: Locale; path: string; title: string; description?: string | null; noindex?: boolean }): Metadata {
  const p = o.path === '/' ? '' : o.path;
  const title = metaText(o.title);
  const description = o.description ? metaText(o.description) || undefined : undefined;
  const noindex = o.noindex ?? !publicMarketingOnly();
  return {
    title,
    description,
    alternates: {
      canonical: `/${o.locale}${p}`,
      languages: { ar: `/ar${p}`, en: `/en${p}`, 'x-default': `/ar${p}` },
    },
    openGraph: { title, description, locale: o.locale === 'ar' ? 'ar_EG' : 'en_US', alternateLocale: o.locale === 'ar' ? 'en_US' : 'ar_EG', type: 'website', images: [{ url: '/brand/otonom/assets/og/og-card-1200x630.png', width: 1200, height: 630, alt: 'OTONOM — IoT Solutions' }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/brand/otonom/assets/og/og-card-1200x630.png'] },
    robots: { index: !noindex, follow: !noindex },
  };
}

/** First sentence (max ~160 chars) of a body text, used as the meta description fallback. */
export function summarise(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  const first = text.split(/(?<=[.!?؟。])\s/)[0] ?? text;
  return first.length > 160 ? `${first.slice(0, 157)}…` : first;
}
