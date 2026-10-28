import type { Locale } from './i18n.ts';

export const SMART_HOME_PACKAGE_IDS = ['premium', 'plus', 'essential'] as const;
export type SmartHomePackageId = (typeof SMART_HOME_PACKAGE_IDS)[number];

type LocalText = { ar: string; en: string };
export type SmartHomePackage = {
  id: SmartHomePackageId;
  name: LocalText;
  priceEgp: number;
  badge?: LocalText;
  items: Array<{ name: LocalText; quantity: number }>;
};

const item = (en: string, ar: string, quantity = 1) => ({ name: { en, ar }, quantity });

/**
 * Owner-approved D5 package source of truth, transcribed from packages PDF.pdf.
 * Prices are display-only and never constitute a checkout or a final quotation.
 */
export const SMART_HOME_PACKAGES: readonly SmartHomePackage[] = [
  {
    id: 'premium',
    name: { en: 'Premium', ar: 'Premium' },
    priceEgp: 44_000,
    badge: { en: 'Most complete', ar: 'الأكثر اكتمالًا' },
    items: [
      item('Amazon Alexa', 'Amazon Alexa'),
      item('Smart Lock', 'قفل ذكي'),
      item('IR Remote', 'وحدة تحكم IR'),
      item('Gas Sensor', 'حساس غاز'),
      item('R16 Smart Controller', 'وحدة تحكم ذكية R16', 2),
      item('Electrical Panel & Wires', 'لوحة كهربائية وأسلاك'),
    ],
  },
  {
    id: 'plus',
    name: { en: 'Plus', ar: 'Plus' },
    priceEgp: 32_000,
    items: [
      item('Amazon Alexa', 'Amazon Alexa'),
      item('IR Remote', 'وحدة تحكم IR'),
      item('Gas Sensor', 'حساس غاز'),
      item('R16 Smart Controller', 'وحدة تحكم ذكية R16', 2),
      item('Electrical Panel & Wires', 'لوحة كهربائية وأسلاك'),
    ],
  },
  {
    id: 'essential',
    name: { en: 'Essential', ar: 'Essential' },
    priceEgp: 24_000,
    items: [
      item('Amazon Alexa', 'Amazon Alexa'),
      item('IR Remote', 'وحدة تحكم IR'),
      item('Gas Sensor', 'حساس غاز'),
      item('R16 Smart Controller', 'وحدة تحكم ذكية R16'),
      item('Electrical Panel & Wires', 'لوحة كهربائية وأسلاك'),
    ],
  },
] as const;

export const PACKAGE_COMMERCIAL_CAVEAT: LocalText = {
  en: 'Confirm installation, site conditions, applicable charges and the final scope with OTONOM before booking or payment.',
  ar: 'يرجى تأكيد نطاق التركيب وظروف الموقع وأي تكاليف إضافية أو رسوم مطبقة مع فريق OTONOM قبل الاتفاق النهائي.',
};

export function isSmartHomePackageId(value: unknown): value is SmartHomePackageId {
  return typeof value === 'string' && (SMART_HOME_PACKAGE_IDS as readonly string[]).includes(value.toLowerCase());
}

export function smartHomePackage(value: unknown): SmartHomePackage | null {
  if (!isSmartHomePackageId(value)) return null;
  return SMART_HOME_PACKAGES.find((entry) => entry.id === value.toLowerCase()) ?? null;
}

export function packageText(value: LocalText, locale: Locale): string {
  return value[locale];
}

export function formatPackagePrice(priceEgp: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(priceEgp);
}
