import Image from 'next/image';
import type { Locale } from '@/lib/i18n.ts';
import { localProductText, requireProductByModel } from '@/lib/products.ts';
import type { PackageItemKey } from '@/lib/smart-home-packages.ts';

type Photo = { src: string; width: number; height: number; alt: { ar: string; en: string } };

/**
 * Package component photos. The 16R uses the genuine OTONOM product photo; the other five come from the owner's
 * brochure (owner confirmed rights to all five, DR-105), re-encoded to WebP with all metadata removed and no edits.
 * Alt text names the item only: no specs, claims or third-party marks.
 */
const PHOTOS: Record<Exclude<PackageItemKey, 'controller'>, Photo> = {
  alexa: { src: '/products/items/alexa.webp', width: 800, height: 533, alt: { ar: 'جهاز Amazon Alexa', en: 'Amazon Alexa device' } },
  lock: { src: '/products/items/smart-lock.webp', width: 800, height: 533, alt: { ar: 'قفل ذكي', en: 'Smart lock' } },
  ir: { src: '/products/items/ir-remote.webp', width: 800, height: 501, alt: { ar: 'ريموت IR', en: 'IR remote' } },
  gas: { src: '/products/items/gas-sensor.webp', width: 621, height: 426, alt: { ar: 'حساس غاز', en: 'Gas sensor' } },
  panel: { src: '/products/items/panel.webp', width: 621, height: 426, alt: { ar: 'لوحة كهرباء وأسلاك', en: 'Electrical panel and wires' } },
};

export const itemPhotoAlt = (item: PackageItemKey, locale: Locale) =>
  item === 'controller' ? localProductText(requireProductByModel('16r').alt, locale) : PHOTOS[item].alt[locale];

/**
 * Photo for a package item. `alt` is meaningful when the photo carries the item on its own; pass `decorative` when a
 * visible label right next to it already names the item (tiles, table thumbnails). Explicit width/height avoid layout
 * shift; images below the fold are lazy-loaded by next/image, which also builds the responsive srcset.
 */
export function ItemVisual({ item, locale, decorative = false, sizes = '140px', priority = false }: { item: PackageItemKey; locale: Locale; decorative?: boolean; sizes?: string; priority?: boolean }) {
  const alt = decorative ? '' : itemPhotoAlt(item, locale);
  if (item === 'controller') {
    const product = requireProductByModel('16r');
    return <Image src={product.image} alt={alt} width={1254} height={1254} sizes={sizes} priority={priority} />;
  }
  const photo = PHOTOS[item];
  return <Image src={photo.src} alt={alt} width={photo.width} height={photo.height} sizes={sizes} priority={priority} />;
}
