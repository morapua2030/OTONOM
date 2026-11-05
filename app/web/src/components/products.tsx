import Image from 'next/image';
import type { ReactNode } from 'react';
import type { Locale } from '@/lib/i18n.ts';
import { PRODUCTS, PRODUCT_REVIEW_NOTICE, localProductText, type PublicProduct } from '@/lib/products.ts';
import { Bidi } from './bidi.tsx';

const tx = (locale: Locale, ar: string, en: string) => (locale === 'ar' ? ar : en);
const productHref = (locale: Locale, product: PublicProduct) => `/${locale}/products/${product.model}`;
const rfqHref = (locale: Locale, product: PublicProduct) =>
  `/${locale}/start-project?service=smart-home`;

export function ProductImage({ product, locale, priority = false }: { product: PublicProduct; locale: Locale; priority?: boolean }) {
  return (
    <div className="product-image-frame">
      <Image
        src={product.image}
        alt={localProductText(product.alt, locale)}
        width={1254}
        height={1254}
        sizes="(max-width: 760px) 92vw, (max-width: 1100px) 45vw, 390px"
        priority={priority}
      />
    </div>
  );
}

export function ProductGrid({ locale, limit, eager = false }: { locale: Locale; limit?: number; eager?: boolean }) {
  const products = typeof limit === 'number' ? PRODUCTS.slice(0, limit) : PRODUCTS;
  return (
    <ul className="product-grid">
      {products.map((product, index) => (
        <li className="product-card" key={product.model}>
          <a className="product-card-image" href={productHref(locale, product)} aria-label={product.name}>
            <Image
              src={product.image}
              alt={localProductText(product.alt, locale)}
              width={1254}
              height={1254}
              sizes="(max-width: 760px) 92vw, (max-width: 1100px) 45vw, 380px"
              priority={eager || index === 0}
            />
          </a>
          <div className="product-card-copy">
            <span className="model-kicker"><bdi dir="ltr">{product.model.toUpperCase()}</bdi> · <bdi dir="ltr">{product.channels}</bdi> {tx(locale, 'قنوات', 'channels')}</span>
            <h3>{product.name}</h3>
            <p><Bidi text={localProductText(product.summary, locale)} locale={locale} /></p>
            <div className="actions">
              <a className="btn" href={productHref(locale, product)}>{tx(locale, 'استكشف الوحدة', 'Explore controller')}</a>
              <a className="text-link" href={rfqHref(locale, product)}>{tx(locale, 'اسأل عن الملاءمة', 'Ask about fit')}</a>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Design v2 "02 Controllers" note per model, verbatim from the reference (DR-102 facts only). */
const CONTROLLER_NOTES: Record<string, [string, string]> = {
  '4r': ['اسأل فريقنا إذا كان 4R مناسبًا لتركيبك.', 'Ask our team whether the 4R fits your installation.'],
  '6r': ['اسأل فريقنا إذا كان 6R مناسبًا لتركيبك.', 'Ask our team whether the 6R fits your installation.'],
  '16r': ['موجود في كل باقات المنزل الذكي: اثنان في Premium وPlus، وواحد في Essential.', 'Included in every Smart Home Package: two in Premium and Plus, one in Essential.'],
};

/** One row card per controller (design v2 "02 Controllers"); facts come from the product registry only. */
export function ControllerRows({ locale }: { locale: Locale }) {
  return (
    <ul className="v2-ctrl-list">
      {PRODUCTS.map((product, index) => {
        const name = product.model.toUpperCase();
        const note = CONTROLLER_NOTES[product.model];
        return (
          <li className="v2-ctrl-row" key={product.model} data-model={product.model}>
            <a className="v2-img-panel" href={productHref(locale, product)} aria-label={product.name}>
              <Image src={product.image} alt={localProductText(product.alt, locale)} width={1254} height={1254} sizes="(max-width: 760px) 80vw, 420px" priority={index === 0} />
            </a>
            <div className="v2-ctrl-info">
              <h3 className="v2-ctrl-name" dir="ltr">{name}</h3>
              <span className="v2-ctrl-label">{tx(locale, 'وحدة تحكم ذكية', 'Smart controller')}</span>
              <span className="v2-pill"><Bidi text={tx(locale, `${product.channels} قنوات تحكم`, `${product.channels} control channels`)} locale={locale} /></span>
              {note ? <p><Bidi text={tx(locale, note[0], note[1])} locale={locale} /></p> : null}
              <div className="v2-actions">
                <a className="btn" href={`/${locale}/contact`}><Bidi text={tx(locale, `اسأل عن ${name}`, `Ask about ${name}`)} locale={locale} /></a>
                {product.model === '16r' ? <a className="btn secondary" href={`/${locale}/smart-home/packages`}>{tx(locale, 'عرض الباقات', 'See packages')}</a> : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ProductDetail({ locale, product }: { locale: Locale; product: PublicProduct }) {
  return (
    <>
      <section className="product-detail-hero">
        <div>
          <p className="eyebrow"><bdi dir="ltr">OTONOM {product.model.toUpperCase()}</bdi></p>
          <h1>{product.name}</h1>
          <p className="lead"><Bidi text={localProductText(product.summary, locale)} locale={locale} /></p>
          <div className="channel-fact">
            <strong>{product.channels}</strong>
            <span>{tx(locale, 'قنوات تحكم — مؤكدة من المالك', 'control channels — owner confirmed')}</span>
          </div>
          <div className="actions">
            <a className="btn" href={rfqHref(locale, product)}>{tx(locale, 'اطلب مراجعة الملاءمة', 'Request a fit review')}</a>
            <a className="btn secondary" href={`/${locale}/products/compare`}>{tx(locale, 'قارن الوحدات', 'Compare controllers')}</a>
          </div>
        </div>
        <ProductImage product={product} locale={locale} priority />
      </section>

      <section className="section product-facts" aria-labelledby="confirmed-facts">
        <div>
          <p className="section-label">{tx(locale, 'حقائق منشورة', 'Published facts')}</p>
          <h2 id="confirmed-facts">{tx(locale, 'ما نؤكده الآن', 'What we confirm today')}</h2>
        </div>
        <dl>
          <div><dt>{tx(locale, 'العلامة', 'Brand')}</dt><dd>OTONOM Smart Home</dd></div>
          <div><dt>{tx(locale, 'الموديل', 'Model')}</dt><dd><bdi dir="ltr">{product.model.toUpperCase()}</bdi></dd></div>
          <div><dt>{tx(locale, 'عدد القنوات', 'Channel count')}</dt><dd>{product.channels}</dd></div>
          <div><dt>{tx(locale, 'ملاءمة المشروع', 'Project fit')}</dt><dd>{localProductText(product.fit, locale)}</dd></div>
        </dl>
      </section>

      <aside className="review-notice" aria-labelledby="review-notice-title">
        <strong id="review-notice-title">{tx(locale, 'المواصفات الفنية قيد الاعتماد', 'Technical specifications awaiting approval')}</strong>
        <p><Bidi text={localProductText(PRODUCT_REVIEW_NOTICE, locale)} locale={locale} /></p>
      </aside>

      <section className="section">
        <h2>{tx(locale, 'أسئلة يراجعها الفريق معك', 'Questions our team reviews with you')}</h2>
        <ul className="question-grid">
          <li>{tx(locale, 'كم دائرة مستقلة يتطلبها التصميم؟', 'How many independent circuits does the design require?')}</li>
          <li>{tx(locale, 'ما متطلبات التركيب والحماية التي يحددها المهندس؟', 'What installation and protection requirements does the engineer specify?')}</li>
          <li>{tx(locale, 'ما نطاق التكامل المطلوب للمشروع؟', 'What integration scope does the project require?')}</li>
          <li>{tx(locale, 'أي وثائق ونسخ برامج يجب اعتمادها قبل التنفيذ؟', 'Which documents and software revisions must be approved before delivery?')}</li>
        </ul>
      </section>
    </>
  );
}

type ComparisonRow = { key: string; label: (locale: Locale) => string; value: (product: PublicProduct, locale: Locale) => ReactNode };

/** One row definition feeds both the desktop table and the stacked mobile cards, so the views cannot drift. */
const COMPARISON_ROWS: readonly ComparisonRow[] = [
  { key: 'channels', label: (locale) => tx(locale, 'قنوات التحكم', 'Control channels'), value: (product) => <strong><bdi dir="ltr">{product.channels}</bdi></strong> },
  { key: 'electrical', label: (locale) => tx(locale, 'المواصفات الكهربائية', 'Electrical specifications'), value: (_product, locale) => tx(locale, 'بانتظار الاعتماد', 'Awaiting approval') },
  { key: 'price-warranty', label: (locale) => tx(locale, 'السعر والضمان', 'Price and warranty'), value: (_product, locale) => tx(locale, 'غير منشور', 'Not published') },
  { key: 'next-step', label: (locale) => tx(locale, 'الإجراء', 'Next step'), value: (product, locale) => <a href={rfqHref(locale, product)}>{tx(locale, 'راجع الملاءمة', 'Review fit')}</a> },
];

const comparisonImage = (product: PublicProduct, locale: Locale) => (
  <Image src={product.image} alt={localProductText(product.alt, locale)} width={180} height={180} sizes="180px" />
);

export function ProductComparison({ locale }: { locale: Locale }) {
  const caption = tx(locale, 'مقارنة تعتمد على الحقائق المؤكدة فقط', 'Comparison using confirmed facts only');
  return (
    <>
      <div className="table-scroll product-compare-wrap">
        <table className="data product-compare">
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">{tx(locale, 'الموديل', 'Model')}</th>
              {PRODUCTS.map((product) => <th scope="col" key={product.model}><bdi dir="ltr">{product.model.toUpperCase()}</bdi></th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{tx(locale, 'الصورة الفعلية', 'Genuine image')}</th>
              {PRODUCTS.map((product) => <td key={product.model}>{comparisonImage(product, locale)}</td>)}
            </tr>
            {COMPARISON_ROWS.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label(locale)}</th>
                {PRODUCTS.map((product) => <td key={product.model}>{row.value(product, locale)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="product-compare-stack" data-testid="product-compare-stack">
        <p className="product-compare-stack-caption">{caption}</p>
        {PRODUCTS.map((product) => (
          <article className="product-compare-card" key={product.model} aria-labelledby={`compare-card-${product.model}`}>
            <div className="product-compare-card-head">
              {comparisonImage(product, locale)}
              <div>
                <p className="model-kicker"><bdi dir="ltr">{product.model.toUpperCase()}</bdi></p>
                <h2 id={`compare-card-${product.model}`}>{product.name}</h2>
              </div>
            </div>
            <dl>
              {COMPARISON_ROWS.map((row) => (
                <div key={row.key}>
                  <dt>{row.label(locale)}</dt>
                  <dd>{row.value(product, locale)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}
