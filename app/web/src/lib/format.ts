import type { Locale } from './i18n.ts';

/**
 * Number/date formatting. PROPOSED convention (owner to confirm): Western (Latin) digits in both locales for technical and
 * commercial figures, so SKUs, quantities, money and dates read identically in Arabic and English documents.
 * Change NUMBERING to 'arab' for Arabic-Indic digits if the owner prefers.
 */
export const NUMBERING: Record<Locale, string> = { ar: 'latn', en: 'latn' };
const tag = (l: Locale) => (l === 'ar' ? 'ar-EG' : 'en-GB');

export const formatNumber = (n: number, l: Locale, opts: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat(tag(l), { numberingSystem: NUMBERING[l], ...opts } as Intl.NumberFormatOptions).format(n);

/** Minor units (piastres) → localized EGP amount. Used only for real (approved) values; tests use synthetic values. */
export const formatEgpMinor = (minor: number, l: Locale) =>
  new Intl.NumberFormat(tag(l), { style: 'currency', currency: 'EGP', numberingSystem: NUMBERING[l], maximumFractionDigits: 2 } as Intl.NumberFormatOptions).format(minor / 100);

export const formatDate = (iso: string | Date, l: Locale) =>
  new Intl.DateTimeFormat(tag(l), { year: 'numeric', month: 'short', day: 'numeric', numberingSystem: NUMBERING[l] } as Intl.DateTimeFormatOptions).format(new Date(iso));

export const formatPercent = (p: number, l: Locale) => formatNumber(p / 100, l, { style: 'percent', maximumFractionDigits: 1 });

/** Currency label per locale (EGP only; amounts are never invented — callers pass approved or synthetic values). */
export const CURRENCY_LABEL: Record<Locale, string> = { ar: 'ج.م.', en: 'EGP' };
/** Amount digits only (no currency), integer pounds when the minor part is zero. */
export const formatAmountMinor = (minor: number, l: Locale) =>
  formatNumber(minor / 100, l, { minimumFractionDigits: minor % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 });
