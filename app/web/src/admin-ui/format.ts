import type { AdminLang } from './copy.ts';

/** Admin dates and numbers (R3, M1): Cairo time, Western digits 0–9 in both languages, no raw ISO/UTC strings. */
export const CAIRO = 'Africa/Cairo';
const locale = (lang: AdminLang) => (lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB');

const NBSP = '\u00a0';

/**
 * Payload's own date pattern (date-fns) for the admin language: the Arabic comma «،» in Arabic, a comma in English, and
 * a no-break space so the time never splits from ص/م (AM/PM). Used by DateFormatProvider and the config default.
 */
export function payloadDatePattern(language: string | undefined | null): string {
  return language === 'en' ? `d MMM yyyy, h:mm${NBSP}a` : `d MMM yyyy، h:mm${NBSP}a`;
}

/** «22 نوفمبر 2026، 3:05 م» / "22 Nov 2026, 3:05 PM" (the time and ص/م never split across lines) */
export function dateTime(value: string | number | Date | null | undefined, lang: AdminLang): string {
  if (value === null || value === undefined || value === '') return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const date = new Intl.DateTimeFormat(locale(lang), { timeZone: CAIRO, day: 'numeric', month: lang === 'ar' ? 'long' : 'short', year: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { timeZone: CAIRO, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(d)
    .replace(/\s+/g, NBSP);
  return lang === 'ar' ? `${date}، ${time}` : `${date}, ${time}`;
}

/** «22 نوفمبر 2026» / "22 Nov 2026" (Cairo calendar day) */
export function dateOnly(value: string | number | Date | null | undefined, lang: AdminLang): string {
  if (value === null || value === undefined || value === '') return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale(lang), { timeZone: CAIRO, day: 'numeric', month: lang === 'ar' ? 'long' : 'short', year: 'numeric' }).format(d);
}

/** «الأحد، 22 نوفمبر 2026» / "Sunday, 22 November 2026" */
export function longDate(value: Date, lang: AdminLang): string {
  return new Intl.DateTimeFormat(locale(lang), { timeZone: CAIRO, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(value);
}

/** The hour in Cairo (0–23), for the greeting. */
export function cairoHour(value: Date): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: CAIRO, hour: '2-digit', hour12: false }).format(value)) % 24;
}

/** «من 5 دقايق» / "5 minutes ago"; older than a week falls back to the date. */
export function timeAgo(value: string | number | Date, lang: AdminLang, now = new Date()): string {
  const d = new Date(value);
  const s = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const days = Math.floor(h / 24);
  if (lang === 'ar') {
    if (m < 1) return 'دلوقتي';
    if (m < 60) return m === 1 ? 'من دقيقة' : m === 2 ? 'من دقيقتين' : `من ${m} ${m <= 10 ? 'دقايق' : 'دقيقة'}`;
    if (h < 24) return h === 1 ? 'من ساعة' : h === 2 ? 'من ساعتين' : `من ${h} ${h <= 10 ? 'ساعات' : 'ساعة'}`;
    if (days < 7) return days === 1 ? 'إمبارح' : days === 2 ? 'من يومين' : `من ${days} أيام`;
    return dateTime(d, lang);
  }
  if (m < 1) return 'just now';
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  if (days < 7) return days === 1 ? 'yesterday' : `${days} days ago`;
  return dateTime(d, lang);
}

/** Western digits for counts in both languages. */
export const count = (n: number) => new Intl.NumberFormat('en-US', { useGrouping: true }).format(n);

/** A stored Egyptian mobile (+20 1x xxxxxxxx) → the digits for wa.me, or null when it is not a valid mobile. */
export function egyptMobileDigits(phone: string | null | undefined): string | null {
  const v = String(phone ?? '').replace(/[\s-]/g, '');
  return /^\+201[0125]\d{8}$/.test(v) ? v.slice(1) : null;
}
