import type { Locale } from './i18n.ts';
import type { ProductModel } from './products.ts';

export const SMART_HOME_PACKAGE_IDS = ['premium', 'plus', 'essential'] as const;
export type SmartHomePackageId = (typeof SMART_HOME_PACKAGE_IDS)[number];

type LocalText = { ar: string; en: string };
export type SmartHomePackage = {
  id: SmartHomePackageId;
  name: LocalText;
  priceEgp: number;
  badge?: LocalText;
  items: Array<SmartHomePackageItem>;
};
/** Stable item keys; the design v2 tiles and table thumbnails are chosen from this key. */
export const PACKAGE_ITEM_KEYS = ['alexa', 'lock', 'ir', 'gas', 'controller', 'panel'] as const;
export type PackageItemKey = (typeof PACKAGE_ITEM_KEYS)[number];
/** `model` links an item to its public OTONOM product page (DR-094: the brochure's R16 is the OTONOM 16R). */
export type SmartHomePackageItem = { key: PackageItemKey; name: LocalText; quantity: number; model?: ProductModel };

const item = (key: PackageItemKey, en: string, ar: string, quantity = 1, model?: ProductModel): SmartHomePackageItem =>
  model ? { key, name: { en, ar }, quantity, model } : { key, name: { en, ar }, quantity };

/** Display names from the design v2 reference; "16R Smart Controller" everywhere (DR-103). */
const ALEXA = (): SmartHomePackageItem => item('alexa', 'Amazon Alexa', 'Amazon Alexa');
const LOCK = (): SmartHomePackageItem => item('lock', 'Smart Lock', 'قفل ذكي');
const IR = (): SmartHomePackageItem => item('ir', 'IR Remote', 'ريموت IR');
const GAS = (): SmartHomePackageItem => item('gas', 'Gas Sensor', 'حساس غاز');
const CONTROLLER = (quantity: number): SmartHomePackageItem => item('controller', '16R Smart Controller', 'كنترولر 16R الذكي', quantity, '16r');
const PANEL = (): SmartHomePackageItem => item('panel', 'Electrical Panel & Wires', 'لوحة كهرباء وأسلاك');

/**
 * Owner-approved D5 package source of truth, transcribed from packages PDF.pdf.
 * Prices are display-only and never constitute a checkout or a final quotation.
 */
export const SMART_HOME_PACKAGES: readonly SmartHomePackage[] = [
  {
    id: 'premium',
    name: { en: 'Premium', ar: 'Premium' },
    priceEgp: 44_000,
    badge: { en: 'Most complete', ar: 'الأكثر تكاملاً' },
    items: [ALEXA(), LOCK(), IR(), GAS(), CONTROLLER(2), PANEL()],
  },
  {
    id: 'plus',
    name: { en: 'Plus', ar: 'Plus' },
    priceEgp: 32_000,
    items: [ALEXA(), IR(), GAS(), CONTROLLER(2), PANEL()],
  },
  {
    id: 'essential',
    name: { en: 'Essential', ar: 'Essential' },
    priceEgp: 24_000,
    items: [ALEXA(), IR(), GAS(), CONTROLLER(1), PANEL()],
  },
] as const;

/** Updated per DR-102: installation by OTONOM is included; scope, site conditions and extra wiring are confirmed first. */
export const PACKAGE_COMMERCIAL_CAVEAT: LocalText = {
  en: 'Installation by OTONOM is included in the package price. The final scope, site conditions and any extra wiring are confirmed with OTONOM before any agreement.',
  ar: 'التركيب بواسطة فريق OTONOM مشمول في سعر الباقة. يتم تأكيد النطاق النهائي وظروف الموقع وأي أسلاك إضافية مع OTONOM قبل الاتفاق.',
};

export function isSmartHomePackageId(value: unknown): value is SmartHomePackageId {
  return typeof value === 'string' && (SMART_HOME_PACKAGE_IDS as readonly string[]).includes(value.toLowerCase());
}

export function smartHomePackage(value: unknown): SmartHomePackage | null {
  if (!isSmartHomePackageId(value)) return null;
  return SMART_HOME_PACKAGES.find((entry) => entry.id === value.toLowerCase()) ?? null;
}

export type PackageComparisonRow = {
  key: string;
  item: PackageItemKey;
  name: LocalText;
  model?: ProductModel;
  /** Listed quantity per package, or `null` when the brochure does not list the item for that package. */
  cells: Record<SmartHomePackageId, number | null>;
  /** True when any package lists more than one unit, so every listed cell in the row shows its quantity. */
  showQuantities: boolean;
};

/**
 * Item-by-package matrix derived from the registry: rows follow first appearance in data order,
 * keyed by the stable English item name. Nothing is hard-coded here.
 */
export function packageComparisonRows(packages: readonly SmartHomePackage[] = SMART_HOME_PACKAGES): PackageComparisonRow[] {
  const rows = new Map<string, PackageComparisonRow>();
  for (const entry of packages) {
    for (const packageItem of entry.items) {
      let row = rows.get(packageItem.name.en);
      if (!row) {
        const cells = Object.fromEntries(packages.map((other) => [other.id, null])) as Record<SmartHomePackageId, number | null>;
        row = { key: packageItem.name.en, item: packageItem.key, name: { ...packageItem.name }, ...(packageItem.model ? { model: packageItem.model } : {}), cells, showQuantities: false };
        rows.set(row.key, row);
      }
      row.cells[entry.id] = packageItem.quantity;
      if (packageItem.quantity > 1) row.showQuantities = true;
    }
  }
  return [...rows.values()];
}

export function packageText(value: LocalText, locale: Locale): string {
  return value[locale];
}

export function formatPackagePrice(priceEgp: number, locale: Locale): string {
  // Latin digits in both locales, as in the design v2 price cards ("44,000"); see lib/format.ts NUMBERING.
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency: 'EGP',
    numberingSystem: 'latn',
    maximumFractionDigits: 0,
  }).format(priceEgp);
}

/** Amount with Latin digits and grouping, as in the design v2 price cards ("44,000"); currency shown separately. */
export function formatPackageAmount(priceEgp: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(priceEgp);
}

export const packageCurrency = (locale: Locale) => (locale === 'ar' ? 'ج.م' : 'EGP');
