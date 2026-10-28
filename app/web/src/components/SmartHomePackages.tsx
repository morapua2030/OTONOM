import type { Locale } from '@/lib/i18n.ts';
import {
  formatPackagePrice,
  PACKAGE_COMMERCIAL_CAVEAT,
  packageText,
  SMART_HOME_PACKAGES,
} from '@/lib/smart-home-packages.ts';
import { Bidi } from './bidi.tsx';

const tx = (locale: Locale, ar: string, en: string) => (locale === 'ar' ? ar : en);

export function SmartHomePackages({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const packages = compact ? SMART_HOME_PACKAGES.slice(0, 3) : SMART_HOME_PACKAGES;
  return (
    <>
      <div className="package-grid" data-testid="smart-home-packages">
        {packages.map((entry) => (
          <article className={`package-card package-${entry.id}`} key={entry.id}>
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
                  <span><Bidi text={packageText(packageItem.name, locale)} locale={locale} /></span>
                  {packageItem.quantity > 1 ? <strong><bdi dir="ltr">×{packageItem.quantity}</bdi></strong> : null}
                </li>
              ))}
            </ul>
            <a className="btn" href={`/${locale}/start-project?package=${entry.id}&service=smart-home`}>
              {tx(locale, 'ابنِ موجز مشروعك', 'Build your project brief')}
            </a>
          </article>
        ))}
      </div>
      <aside className="package-caveat" aria-label={tx(locale, 'تنبيه تجاري', 'Commercial notice')}>
        <strong>{tx(locale, 'قبل الاتفاق النهائي', 'Before any final agreement')}</strong>
        <p><Bidi text={packageText(PACKAGE_COMMERCIAL_CAVEAT, locale)} locale={locale} /></p>
        <p>{tx(locale, 'لا تتضمن هذه الصفحة دفعًا أو حجزًا أو Checkout.', 'This page does not provide payment, booking or checkout.')}</p>
      </aside>
    </>
  );
}
