'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Locale } from '@/lib/i18n.ts';
import { PRODUCTS, localProductText } from '@/lib/products.ts';
import { Bidi } from './bidi.tsx';

const tx = (locale: Locale, ar: string, en: string) => (locale === 'ar' ? ar : en);

function recommendation(channels: number) {
  if (channels <= 4) return PRODUCTS.find((product) => product.model === '4r');
  if (channels <= 6) return PRODUCTS.find((product) => product.model === '6r');
  if (channels <= 16) return PRODUCTS.find((product) => product.model === '16r');
  return undefined;
}

export function SmartProductSelector({ locale }: { locale: Locale }) {
  const [channels, setChannels] = useState(4);
  const product = recommendation(channels);
  return (
    <div className="product-selector" data-testid="smart-product-selector">
      <div className="product-selector-control">
        <p className="eyebrow"><Bidi text={tx(locale, 'منتقي منتج OTONOM', 'OTONOM PRODUCT SELECTOR')} locale={locale} /></p>
        <h2>{tx(locale, 'ابدأ بعدد دوائر التحكم', 'Start with the control-circuit count')}</h2>
        <p>{tx(locale, 'اختر عدد القنوات المستقلة المتوقع. النتيجة إرشاد مبدئي فقط ولا تستبدل مراجعة التصميم والتركيب.', 'Choose the expected number of independent channels. The result is preliminary guidance and does not replace design and installation review.')}</p>
        <label htmlFor="selector-channels">{tx(locale, 'عدد القنوات المتوقع', 'Expected channel count')}</label>
        <div className="product-selector-input">
          <input
            id="selector-channels"
            type="range"
            min="1"
            max="24"
            step="1"
            value={channels}
            onChange={(event) => setChannels(Number(event.target.value))}
          />
          <output htmlFor="selector-channels"><bdi dir="ltr">{channels}</bdi></output>
        </div>
        <div className="product-selector-presets" aria-label={tx(locale, 'اختيارات سريعة', 'Quick choices')}>
          {[4, 6, 16, 24].map((value) => <button type="button" key={value} aria-pressed={channels === value} onClick={() => setChannels(value)}><bdi dir="ltr">{value}</bdi></button>)}
        </div>
      </div>
      <div className="product-selector-result" aria-live="polite">
        {product ? (
          <>
            <Image src={product.image} alt={localProductText(product.alt, locale)} width={1254} height={1254} sizes="(max-width: 760px) 80vw, 360px" />
            <div>
              <p className="eyebrow">{tx(locale, 'نقطة بداية مبدئية', 'Preliminary starting point')}</p>
              <h3>{product.name}</h3>
              <p><Bidi text={tx(locale, `يغطي الموديل ${product.channels} قنوات مؤكدة. يلزم تأكيد توزيع الدوائر والحماية والملاءمة قبل الاختيار النهائي.`, `This model has ${product.channels} confirmed channels. Circuit allocation, protection and fit must be reviewed before a final selection.`)} locale={locale} /></p>
              <div className="actions">
                <a className="btn" href={`/${locale}/products/${product.model}`}>{tx(locale, 'راجع المنتج', 'Review product')}</a>
                <a className="btn secondary" href={`/${locale}/start-project?service=smart-home`}>{tx(locale, 'اطلب مراجعة هندسية', 'Request engineering review')}</a>
              </div>
            </div>
          </>
        ) : (
          <div className="product-selector-complex">
            <p className="eyebrow">{tx(locale, 'نطاق متعدد الوحدات', 'MULTI-CONTROLLER SCOPE')}</p>
            <h3>{tx(locale, 'راجع المعمارية قبل اختيار الموديلات', 'Review the architecture before choosing models')}</h3>
            <p>{tx(locale, 'الاحتياج يتجاوز 16 قناة. لا يفترض المنتقي عدد الوحدات أو توزيعها؛ يبدأ الفريق بمراجعة الدوائر وحدود النظام.', 'The requirement exceeds 16 channels. The selector does not assume controller quantity or allocation; the team first reviews circuits and system boundaries.')}</p>
            <a className="btn" href={`/${locale}/start-project?service=smart-home`}>{tx(locale, 'ابدأ موجز المشروع', 'Start a project brief')}</a>
          </div>
        )}
      </div>
    </div>
  );
}
