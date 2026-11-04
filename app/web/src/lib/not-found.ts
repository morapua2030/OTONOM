import type { Locale } from './i18n.ts';

/** Heading of the localized 404 page; its document title is "<heading> — OTONOM" (plain text, no bidi marks). */
export const NOT_FOUND_TITLE: Record<Locale, string> = { ar: 'الصفحة غير موجودة', en: 'Page not found' };

/** The unknown-locale 404 (e.g. /xx) is rewritten to /ar by the proxy, so anything but `en` is Arabic. */
export const notFoundLocale = (locale: string | undefined): Locale => (locale === 'en' ? 'en' : 'ar');

export const notFoundTitle = (locale: string | undefined) => `${NOT_FOUND_TITLE[notFoundLocale(locale)]} — OTONOM`;
