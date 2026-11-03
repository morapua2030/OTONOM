import Image from 'next/image';
import type { ReactNode } from 'react';
import { requireProductByModel } from '@/lib/products.ts';
import type { PackageItemKey } from '@/lib/smart-home-packages.ts';

/**
 * Visual for a package item. Only genuine OTONOM product photography is used (the 16R controller).
 * Third-party components (Alexa, lock, IR remote, gas sensor, panel) are shown as generic outline icons until the
 * owner confirms the right to publish their photos; the icons are decorative and never imitate a vendor's mark.
 */
const ICONS: Record<Exclude<PackageItemKey, 'controller'>, ReactNode> = {
  alexa: (
    <>
      <rect x="7" y="3.5" width="10" height="17" rx="3.5" />
      <circle cx="12" cy="14" r="2.6" />
      <circle cx="12" cy="7.6" r="0.9" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <path d="M12 14.5v2.5" />
    </>
  ),
  ir: (
    <>
      <rect x="8" y="5.5" width="8" height="15" rx="2.5" />
      <circle cx="12" cy="9.5" r="1.2" />
      <path d="M10.5 13.5h3M10.5 16.5h3" />
      <path d="M9.5 3.2a4 4 0 0 1 5 0" />
    </>
  ),
  gas: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v2.5M12 17.5V20M4 12h2.5M17.5 12H20" />
    </>
  ),
  panel: (
    <>
      <rect x="4.5" y="3.5" width="15" height="12" rx="1.5" />
      <path d="M8 7v5M12 7v5M16 7v5" />
      <path d="M8 15.5v5M12 15.5v3.5M16 15.5v5" />
    </>
  ),
};

export function ItemIcon({ item }: { item: Exclude<PackageItemKey, 'controller'> }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {ICONS[item]}
    </svg>
  );
}

/** `alt` is empty when a visible label sits next to the visual (avoids announcing the name twice). */
export function ItemVisual({ item, alt = '', sizes = '120px' }: { item: PackageItemKey; alt?: string; sizes?: string }) {
  if (item === 'controller') {
    const product = requireProductByModel('16r');
    return <Image src={product.image} alt={alt} width={1254} height={1254} sizes={sizes} />;
  }
  return <ItemIcon item={item} />;
}
