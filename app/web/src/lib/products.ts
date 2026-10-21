import type { Locale } from './i18n.ts';

export const PRODUCT_MODELS = ['4r', '6r', '16r'] as const;
export type ProductModel = (typeof PRODUCT_MODELS)[number];

type Localized = { ar: string; en: string };

export type PublicProduct = {
  model: ProductModel;
  name: string;
  channels: 4 | 6 | 16;
  image: string;
  alt: Localized;
  summary: Localized;
  fit: Localized;
  publicationStatus: 'OWNER_CONFIRMED_CORE_ONLY';
};

/** Runtime allow-list: even a polluted internal candidate cannot leak review-only fields. */
export function publicProductProjection(product: PublicProduct & Record<string, unknown>): PublicProduct {
  return {
    model: product.model,
    name: product.name,
    channels: product.channels,
    image: product.image,
    alt: { ar: product.alt.ar, en: product.alt.en },
    summary: { ar: product.summary.ar, en: product.summary.en },
    fit: { ar: product.fit.ar, en: product.fit.en },
    publicationStatus: product.publicationStatus,
  };
}

/**
 * Public-safe product registry.
 *
 * Only the brand, genuine imagery, relative size and channel counts are owner-confirmed.
 * Electrical, mechanical, radio, certification, price and warranty fields deliberately do
 * not exist in this public model, so review-only drafts cannot leak into rendered pages.
 */
const PRODUCT_CANDIDATES: readonly PublicProduct[] = [
  {
    model: '4r',
    name: 'OTONOM Smart Controller 4R',
    channels: 4,
    image: '/products/otonom-4r.png',
    alt: {
      ar: 'وحدة تحكم OTONOM 4R بأربع قنوات — صورة المنتج الفعلي',
      en: 'OTONOM 4R four-channel controller — genuine product image',
    },
    summary: {
      ar: 'أربع قنوات تحكم للمشروعات ذات عدد الدوائر الأقل. يُراجع الاختيار والتوصيل مع فريق OTONOM قبل التركيب.',
      en: 'Four controllable channels for projects with fewer circuits. Confirm model fit and installation with OTONOM before installation.',
    },
    fit: {
      ar: 'خيار أولي عندما تشير متطلبات المشروع إلى أربع قنوات مستقلة.',
      en: 'An initial option when the project brief calls for four independent channels.',
    },
    publicationStatus: 'OWNER_CONFIRMED_CORE_ONLY',
  },
  {
    model: '6r',
    name: 'OTONOM Smart Controller 6R',
    channels: 6,
    image: '/products/otonom-6r.png',
    alt: {
      ar: 'وحدة تحكم OTONOM 6R بست قنوات — صورة المنتج الفعلي',
      en: 'OTONOM 6R six-channel controller — genuine product image',
    },
    summary: {
      ar: 'ست قنوات تحكم تمنح المشروع مرونة إضافية في تخطيط الدوائر. يؤكد الفريق الملاءمة بعد مراجعة النطاق.',
      en: 'Six controllable channels for additional circuit-planning flexibility. The team confirms fit after reviewing the scope.',
    },
    fit: {
      ar: 'خيار أولي للمشروعات التي تحدد مراجعتها الهندسية احتياجًا لست قنوات مستقلة.',
      en: 'An initial option where engineering review identifies a need for six independent channels.',
    },
    publicationStatus: 'OWNER_CONFIRMED_CORE_ONLY',
  },
  {
    model: '16r',
    name: 'OTONOM Smart Controller 16R',
    channels: 16,
    image: '/products/otonom-16r.png',
    alt: {
      ar: 'وحدة تحكم OTONOM 16R بست عشرة قناة — صورة المنتج الفعلي',
      en: 'OTONOM 16R sixteen-channel controller — genuine product image',
    },
    summary: {
      ar: 'ست عشرة قناة تحكم للمشروعات ذات متطلبات الدوائر الأوسع. يعتمد الاختيار النهائي على التصميم الكهربائي والتكامل المطلوب.',
      en: 'Sixteen controllable channels for projects with broader circuit requirements. Final selection depends on the electrical and integration design.',
    },
    fit: {
      ar: 'خيار أولي عندما توضح دراسة المشروع الحاجة إلى ست عشرة قناة مستقلة.',
      en: 'An initial option where the project study identifies a need for sixteen independent channels.',
    },
    publicationStatus: 'OWNER_CONFIRMED_CORE_ONLY',
  },
] as const;

export const PRODUCTS: readonly PublicProduct[] = PRODUCT_CANDIDATES.map((product) => Object.freeze(publicProductProjection(product)));

export const productByModel = (model: string) => PRODUCTS.find((product) => product.model === model);
export const localProductText = (value: Localized, locale: Locale) => value[locale];

export const PRODUCT_REVIEW_NOTICE: Localized = {
  ar: 'المواصفات الكهربائية والميكانيكية والتوافق والسعر والضمان بانتظار اعتماد المالك والمراجعة الهندسية، وليست منشورة في هذه المعاينة.',
  en: 'Electrical, mechanical, compatibility, price and warranty details await owner approval and engineering validation and are not published in this preview.',
};
