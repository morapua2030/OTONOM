import { currentStage } from '@/lib/public.ts';
import type { Metadata } from 'next';
import { isLocale, t, type Locale } from '@/lib/i18n.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { Bidi } from './bidi.tsx';
import { PRODUCTS, localProductText } from '@/lib/products.ts';
import { SwashText } from './v2.tsx';

/** Commerce/portal placeholder during the preview (G-1/G-2): informational only, no forms, noindex. */
export async function GatedPage({ locale, feature }: { locale: Locale; feature: string }) {
  const stage = await currentStage();
  const d = t(locale);
  if (stage === 'COMMERCIAL') return <p data-stage="COMMERCIAL">{feature}: commercial mode — not implemented yet.</p>;
  return (
    <section className="hero" data-stage="PREVIEW" data-feature={feature}>
      <h1><SwashText text={d.gated.title} locale={locale} /></h1>
      <p>
        <Bidi text={d.gated.body} locale={locale} />
      </p>
      {feature === 'shop' && (
        <div className="gated-demo">
          <p><Bidi text={d.home.controllersBody} locale={locale} /></p>
          <ul className="cards cols-3">
            {PRODUCTS.map((product) => (
              <li className="card" key={product.model}>
                <span className="tag">{locale === 'ar' ? 'معلومات فقط' : 'INFORMATION ONLY'}</span>
                <h2><Bidi text={product.name} locale={locale} /></h2>
                <p><Bidi text={localProductText(product.summary, locale)} locale={locale} /></p>
                <strong className="not-configured">{locale === 'ar' ? 'السعر غير مُعدّ' : 'PRICE NOT CONFIGURED'}</strong>
              </li>
            ))}
          </ul>
          <p><a className="btn secondary" href={`/${locale}/contact`}>{d.cta.supply}</a></p>
        </div>
      )}
      {feature === 'warranty' && (
        <div className="gated-demo">
          <p><Bidi text={d.pages.support.body} locale={locale} /></p>
          <ol className="gate-checks">
            <li>{locale === 'ar' ? 'سياسة الضمان: غير معتمدة' : 'Warranty policy: not approved'}</li>
            <li>{locale === 'ar' ? 'تأكيد الملكية: مطلوب عند الإطلاق' : 'Ownership verification: required at launch'}</li>
            <li>{locale === 'ar' ? 'طلبات الخدمة العامة: مغلقة خادميًا' : 'Public service requests: server-disabled'}</li>
          </ol>
        </div>
      )}
    </section>
  );
}
/** Localized, always-noindex metadata for a gated page at `path`. */
const GATED_TITLES: Record<string, Record<Locale, string>> = {
  '/account': { ar: 'حساب العميل', en: 'Customer account' },
  '/shop': { ar: 'المتجر', en: 'Store' },
  '/cart': { ar: 'سلة الشراء', en: 'Cart' },
  '/checkout': { ar: 'إتمام الطلب', en: 'Checkout' },
  '/support/warranty': { ar: 'تسجيل الضمان', en: 'Warranty registration' },
};

export const gatedMetadataFor =
  (path: string) =>
  async ({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> => {
    const { locale } = await params;
    if (!isLocale(locale)) return { robots: { index: false, follow: false } };
    const d = t(locale);
    // Unique per-page titles (D8-A carry-over); the visible gated copy is unchanged.
    const feature = GATED_TITLES[path]?.[locale];
    return pageMetadata({ locale, path, title: feature ? `${feature} — ${d.gated.title}` : d.gated.title, description: d.gated.body, noindex: true });
  };
