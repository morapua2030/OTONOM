'use client';
import type { ReactNode } from 'react';
import { useConfig, useTranslation } from '@payloadcms/ui';
import { payloadDatePattern } from './format.ts';

/**
 * Payload has ONE admin date pattern for every language (`admin.dateFormat`), so its own dates (Last modified,
 * Created, date columns) would show a Latin comma in Arabic. This provider wraps the admin (admin.components.providers)
 * and, before any page content is drawn, sets the pattern of the admin language on the browser copy of the config:
 * «20 نوفمبر 2026، 12:53 م» in Arabic, "20 Nov 2026, 12:53 PM" in English, with a no-break space before ص/م / AM/PM.
 * Display only: dates are stored and sent exactly as before.
 */
export function DateFormatProvider({ children }: { children?: ReactNode }) {
  const { config } = useConfig();
  const { i18n } = useTranslation();
  const pattern = payloadDatePattern(i18n?.language);
  // set during render on purpose: this provider is an ancestor of every admin screen, so the pattern is in place before
  // any date below it is formatted, including after a page swaps the config object (it re-renders with the new one)
  if (config?.admin && config.admin.dateFormat !== pattern) config.admin.dateFormat = pattern;
  return <>{children}</>;
}
