import type { Locale } from './i18n.ts';
import { packageControllers, packagesCovering, recommendController } from './product-selector.ts';

const tx = (locale: Locale, ar: string, en: string) => (locale === 'ar' ? ar : en);

/**
 * WhatsApp message built only from the visitor's choices (no free text): channel count, room count in room mode,
 * and the suggested controller(s). Example: «أهلًا OTONOM، محتاج حوالي 20 قناة في 3 أوضة، والمقترح 2 × 16R.»
 */
export function selectorMessage(locale: Locale, input: { channels: number; rooms: number | null; model: string }): string {
  const { channels: n, rooms: r, model } = input;
  if (locale === 'ar') return `أهلًا OTONOM، محتاج حوالي ${n} قناة${r ? ` في ${r} أوضة` : ''}، والمقترح ${model}.`;
  return `Hi OTONOM, I need about ${n} channels${r ? ` in ${r} rooms` : ''}, and the suggestion is ${model}.`;
}

/** The suggested controller(s) as written in the message: one model, the controllers of the covering package, or a review. */
export function selectorModel(locale: Locale, total: number): string {
  const product = recommendController(total);
  if (product) return product.model.toUpperCase();
  const pkg = packagesCovering(total)[0];
  if (pkg) return packageControllers(pkg).map((entry) => `${entry.quantity} × ${entry.product.model.toUpperCase()}`).join(' + ');
  return tx(locale, 'مراجعة مهندس', 'an engineer review');
}

