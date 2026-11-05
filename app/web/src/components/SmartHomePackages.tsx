import type { Locale } from '@/lib/i18n.ts';
import {
  formatPackageAmount,
  PACKAGE_COMMERCIAL_CAVEAT,
  packageComparisonRows,
  packageCurrency,
  packageText,
  SMART_HOME_PACKAGES,
  type SmartHomePackage,
  type SmartHomePackageItem,
} from '@/lib/smart-home-packages.ts';
import { Bidi } from './bidi.tsx';
import { ItemVisual } from './package-items.tsx';
import { SIM_ENTRY } from '@/lib/simulator/copy.ts';

const tx = (locale: Locale, ar: string, en: string) => (locale === 'ar' ? ar : en);

/** Items whose quantity is shown everywhere (any package lists more than one unit): the 16R controller (×2/×2/×1). */
const QUANTITY_ITEMS = new Set(packageComparisonRows().filter((row) => row.showQuantities).map((row) => row.item));
const showsQuantity = (packageItem: SmartHomePackageItem) => QUANTITY_ITEMS.has(packageItem.key);

/** "Premium Package" / "باقة Premium" (design v2 reference). */
export const packageDisplayName = (entry: SmartHomePackage, locale: Locale) =>
  tx(locale, `باقة ${packageText(entry.name, locale)}`, `${packageText(entry.name, locale)} Package`);

export const packageItemLine = (packageItem: SmartHomePackageItem, locale: Locale) =>
  showsQuantity(packageItem) ? `${packageText(packageItem.name, locale)} × ${packageItem.quantity}` : packageText(packageItem.name, locale);

/** Decorative photo/icon tiles; the item list next to them carries the names and quantities for assistive technology. */
export function PackageTiles({ entry, labels = false, locale }: { entry: SmartHomePackage; labels?: boolean; locale: Locale }) {
  return (
    <ul className="v2-tiles" aria-hidden="true">
      {entry.items.map((packageItem) => (
        <li className="v2-tile" key={packageItem.key}>
          <span className="v2-tile-visual"><ItemVisual item={packageItem.key} locale={locale} decorative sizes="(max-width: 600px) 28vw, 140px" /></span>
          {labels ? <span className="v2-tile-label"><Bidi text={packageText(packageItem.name, locale)} locale={locale} /></span> : null}
          {showsQuantity(packageItem) ? <span className="v2-qty" dir="ltr">×{packageItem.quantity}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function ItemName({ packageItem, locale }: { packageItem: SmartHomePackageItem; locale: Locale }) {
  const line = packageItemLine(packageItem, locale);
  return packageItem.model ? (
    <a href={`/${locale}/products/${packageItem.model}`} data-product-model={packageItem.model}><Bidi text={line} locale={locale} /></a>
  ) : (
    <Bidi text={line} locale={locale} />
  );
}

function comparisonCell(quantity: number | null, showQuantities: boolean, locale: Locale) {
  if (quantity === null) return <span className="package-cell-none"><span aria-hidden="true">—</span><span className="sr-only">{tx(locale, 'غير مدرج في الباقة', 'Not in this package')}</span></span>;
  if (showQuantities) return <strong><bdi dir="ltr">×{quantity}</bdi></strong>;
  return <><span aria-hidden="true">✓</span><span className="sr-only">{tx(locale, 'مدرج', 'Included')}</span></>;
}

/** Item-by-package table built only from the registry (design v2 "Compare what's included"). */
export function PackageComparison({ locale, packages = SMART_HOME_PACKAGES }: { locale: Locale; packages?: readonly SmartHomePackage[] }) {
  const caption = tx(locale, 'قارن المكونات', 'Compare what’s included');
  return (
    <>
      <h3 className="package-compare-title">{caption}</h3>
      <p className="package-compare-hint" aria-hidden="true">{tx(locale, 'اسحب الجدول لعرض باقي الباقات', 'Swipe the table to see all packages')}</p>
      <div className="package-compare-scroll table-scroll" role="region" aria-label={caption} tabIndex={0} data-testid="package-comparison">
        <table className="data package-compare">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">{tx(locale, 'المكوّن', 'Item')}</th>
              {packages.map((entry) => <th scope="col" key={entry.id}>{packageText(entry.name, locale)}</th>)}
            </tr>
          </thead>
          <tbody>
            {packageComparisonRows(packages).map((row) => (
              <tr key={row.key}>
                <th scope="row">
                  <span className="package-compare-item">
                    <span className="package-compare-thumb" aria-hidden="true"><ItemVisual item={row.item} locale={locale} decorative sizes="44px" /></span>
                    {row.model ? (
                      <a href={`/${locale}/products/${row.model}`} data-product-model={row.model}><Bidi text={packageText(row.name, locale)} locale={locale} /></a>
                    ) : (
                      <Bidi text={packageText(row.name, locale)} locale={locale} />
                    )}
                  </span>
                </th>
                {packages.map((entry) => <td key={entry.id} data-package={entry.id}>{comparisonCell(row.cells[entry.id], row.showQuantities, locale)}</td>)}
              </tr>
            ))}
            <tr className="package-compare-price">
              <th scope="row">{tx(locale, 'السعر الإجمالي', 'Total price')}</th>
              {packages.map((entry) => <td key={entry.id}><bdi dir="ltr">{formatPackageAmount(entry.priceEgp)}</bdi> {packageCurrency(locale)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Packages page (design v2 "03 Packages"): full-width cards; "Choose" preselects the package on Contact. */
export function SmartHomePackages({ locale, comparison = false, packages = SMART_HOME_PACKAGES }: { locale: Locale; comparison?: boolean; packages?: readonly SmartHomePackage[] }) {
  return (
    <>
      <div className="v2-pkg-list" data-testid="smart-home-packages">
        {packages.map((entry, index) => (
          <article className={`package-card v2-pkg-card v2-pkg-wide package-${entry.id}${entry.badge ? ' is-featured' : ''}`} id={`package-${entry.id}`} key={entry.id}>
            <div className="v2-pkg-main">
              <div className="v2-pkg-top">
                <span className="v2-pkg-num" dir="ltr">{String(index + 1).padStart(2, '0')}</span>
                {entry.badge ? <span className="v2-pkg-badge">{packageText(entry.badge, locale)}</span> : null}
              </div>
              <h3><Bidi text={packageDisplayName(entry, locale)} locale={locale} /></h3>
              <ul className="v2-pkg-items">
                {entry.items.map((packageItem) => <li key={packageItem.key}><ItemName packageItem={packageItem} locale={locale} /></li>)}
              </ul>
              <div className="v2-pkg-foot">
                <div className="v2-pkg-price">
                  <span className="v2-pkg-price-label">{tx(locale, 'السعر الإجمالي', 'Total price')}</span>
                  <span className="v2-pkg-price-value"><bdi dir="ltr">{formatPackageAmount(entry.priceEgp)}</bdi> <span className="v2-pkg-currency">{packageCurrency(locale)}</span></span>
                </div>
                <a className="btn" href={`/${locale}/contact?package=${entry.id}`} data-metric={`package_${entry.id}`}>{tx(locale, 'اختر هذه الباقة', 'Choose this package')}</a>
              </div>
            </div>
            <PackageTiles entry={entry} labels locale={locale} />
          </article>
        ))}
      </div>
      {comparison ? (
        <div className="sim-entry-banner" data-testid="sim-entry">
          <p><Bidi text={SIM_ENTRY[locale].banner} locale={locale} /></p>
          <a className="btn" href={`/${locale}/try`}>{SIM_ENTRY[locale].cta}</a>
        </div>
      ) : null}
      {comparison ? <section className="v2-section" aria-label={tx(locale, 'قارن المكونات', 'Compare what’s included')}><PackageComparison locale={locale} packages={packages} /><PackageCaveat locale={locale} /></section> : <PackageCaveat locale={locale} />}
    </>
  );
}

export function PackageCaveat({ locale }: { locale: Locale }) {
  return (
    <aside className="package-caveat" aria-label={tx(locale, 'تنبيه تجاري', 'Commercial notice')}>
      <strong>{tx(locale, 'قبل الاتفاق النهائي', 'Before any final agreement')}</strong>
      <p><Bidi text={packageText(PACKAGE_COMMERCIAL_CAVEAT, locale)} locale={locale} /></p>
      <p><Bidi text={tx(locale, 'لا تتضمن هذه الصفحة دفعًا أو حجزًا أو Checkout.', 'This page does not provide payment, booking or checkout.')} locale={locale} /></p>
    </aside>
  );
}
