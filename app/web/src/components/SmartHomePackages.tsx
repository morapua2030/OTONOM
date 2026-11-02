import type { Locale } from '@/lib/i18n.ts';
import {
  formatPackagePrice,
  PACKAGE_COMMERCIAL_CAVEAT,
  packageComparisonRows,
  packageText,
  SMART_HOME_PACKAGES,
} from '@/lib/smart-home-packages.ts';
import { Bidi } from './bidi.tsx';

const tx = (locale: Locale, ar: string, en: string) => (locale === 'ar' ? ar : en);

function comparisonCell(quantity: number | null, locale: Locale) {
  if (quantity === null) return tx(locale, 'غير مذكور في البروشور', 'Not listed in the brochure');
  if (quantity > 1) return <strong><bdi dir="ltr">×{quantity}</bdi></strong>;
  return <><span aria-hidden="true">✓</span> {tx(locale, 'مدرج', 'Listed')}</>;
}

/** Item-by-package table built only from the registry; an unlisted item is only "not listed in the brochure" (DR-097). */
export function PackageComparison({ locale }: { locale: Locale }) {
  const caption = tx(locale, 'مقارنة محتويات الباقات كما وردت في البروشور', 'Package contents as listed in the brochure');
  return (
    <div className="package-compare-scroll" role="region" aria-label={caption} tabIndex={0} data-testid="package-comparison">
      <table className="data package-compare">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{tx(locale, 'المكوّن', 'Item')}</th>
            {SMART_HOME_PACKAGES.map((entry) => <th scope="col" key={entry.id}>{packageText(entry.name, locale)}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr className="package-compare-price">
            <th scope="row">{tx(locale, 'سعر الباقة المعلن', 'Published package price')}</th>
            {SMART_HOME_PACKAGES.map((entry) => <td key={entry.id}><bdi dir="ltr">{formatPackagePrice(entry.priceEgp, locale)}</bdi></td>)}
          </tr>
          {packageComparisonRows().map((row) => (
            <tr key={row.key}>
              <th scope="row">
                {row.model ? (
                  <a href={`/${locale}/products/${row.model}`} data-product-model={row.model}><Bidi text={packageText(row.name, locale)} locale={locale} /></a>
                ) : (
                  <Bidi text={packageText(row.name, locale)} locale={locale} />
                )}
              </th>
              {SMART_HOME_PACKAGES.map((entry) => <td key={entry.id} data-package={entry.id}>{comparisonCell(row.cells[entry.id], locale)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SmartHomePackages({ locale, compact = false, comparison = false }: { locale: Locale; compact?: boolean; comparison?: boolean }) {
  const packages = compact ? SMART_HOME_PACKAGES.slice(0, 3) : SMART_HOME_PACKAGES;
  return (
    <>
      <div className="package-grid" data-testid="smart-home-packages">
        {packages.map((entry) => (
          <article className={`package-card package-${entry.id}`} id={`package-${entry.id}`} key={entry.id}>
            <div className="package-card-head">
              <div>
                <p className="eyebrow">OTONOM SMART HOME</p>
                <h3>{packageText(entry.name, locale)}</h3>
              </div>
              {entry.badge ? <span className="package-badge">{packageText(entry.badge, locale)}</span> : null}
            </div>
            <p className="package-price"><bdi dir="ltr">{formatPackagePrice(entry.priceEgp, locale)}</bdi></p>
            <p className="package-price-note">{tx(locale, 'سعر الباقة المعلن — ليس عرض سعر نهائيًا', 'Published package price — not a final quotation')}</p>
            <ul className="package-items">
              {entry.items.map((packageItem) => (
                <li key={packageItem.name.en}>
                  <span aria-hidden="true" className="package-item-icon">✓</span>
                  <span>
                    {packageItem.model ? (
                      <a href={`/${locale}/products/${packageItem.model}`} data-product-model={packageItem.model}>
                        <Bidi text={packageText(packageItem.name, locale)} locale={locale} />
                      </a>
                    ) : (
                      <Bidi text={packageText(packageItem.name, locale)} locale={locale} />
                    )}
                  </span>
                  {packageItem.quantity > 1 ? <strong><bdi dir="ltr">×{packageItem.quantity}</bdi></strong> : null}
                </li>
              ))}
            </ul>
            {entry.items.some((packageItem) => packageItem.model === '16r') ? (
              <p className="package-model-note">
                {locale === 'ar' ? (
                  <>
                    <bdi dir="ltr">R16</bdi> هي وحدة <a href={`/${locale}/products/16r`}><bdi dir="ltr">OTONOM 16R</bdi></a> — راجع صفحة المنتج.
                  </>
                ) : (
                  <>
                    R16 is the <a href={`/${locale}/products/16r`}>OTONOM 16R</a> controller — see the product page.
                  </>
                )}
              </p>
            ) : null}
            <a className="btn" href={`/${locale}/start-project?package=${entry.id}&service=smart-home`}>
              {tx(locale, 'ابنِ موجز مشروعك', 'Build your project brief')}
            </a>
          </article>
        ))}
      </div>
      {comparison ? <PackageComparison locale={locale} /> : null}
      <aside className="package-caveat" aria-label={tx(locale, 'تنبيه تجاري', 'Commercial notice')}>
        <strong>{tx(locale, 'قبل الاتفاق النهائي', 'Before any final agreement')}</strong>
        <p><Bidi text={packageText(PACKAGE_COMMERCIAL_CAVEAT, locale)} locale={locale} /></p>
        <p>{tx(locale, 'لا تتضمن هذه الصفحة دفعًا أو حجزًا أو Checkout.', 'This page does not provide payment, booking or checkout.')}</p>
      </aside>
    </>
  );
}
