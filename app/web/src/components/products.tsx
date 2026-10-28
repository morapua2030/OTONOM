import Image from 'next/image';
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

export function ProductComparison({ locale }: { locale: Locale }) {
  return (
    <div className="table-scroll product-compare-wrap">
      <table className="data product-compare">
        <caption>{tx(locale, 'مقارنة تعتمد على الحقائق المؤكدة فقط', 'Comparison using confirmed facts only')}</caption>
        <thead>
          <tr>
            <th scope="col">{tx(locale, 'الموديل', 'Model')}</th>
            {PRODUCTS.map((product) => <th scope="col" key={product.model}><bdi dir="ltr">{product.model.toUpperCase()}</bdi></th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{tx(locale, 'الصورة الفعلية', 'Genuine image')}</th>
            {PRODUCTS.map((product) => (
              <td key={product.model}>
                <Image src={product.image} alt={localProductText(product.alt, locale)} width={180} height={180} sizes="180px" />
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">{tx(locale, 'قنوات التحكم', 'Control channels')}</th>
            {PRODUCTS.map((product) => <td key={product.model}><strong>{product.channels}</strong></td>)}
          </tr>
          <tr>
            <th scope="row">{tx(locale, 'المواصفات الكهربائية', 'Electrical specifications')}</th>
            {PRODUCTS.map((product) => <td key={product.model}>{tx(locale, 'بانتظار الاعتماد', 'Awaiting approval')}</td>)}
          </tr>
          <tr>
            <th scope="row">{tx(locale, 'السعر والضمان', 'Price and warranty')}</th>
            {PRODUCTS.map((product) => <td key={product.model}>{tx(locale, 'غير منشور', 'Not published')}</td>)}
          </tr>
          <tr>
            <th scope="row">{tx(locale, 'الإجراء', 'Next step')}</th>
            {PRODUCTS.map((product) => <td key={product.model}><a href={rfqHref(locale, product)}>{tx(locale, 'راجع الملاءمة', 'Review fit')}</a></td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
