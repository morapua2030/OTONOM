import type { Locale } from './i18n.ts';

/**
 * The one font file each locale preloads (its body face at weight 400). Must match a `src` in
 * src/app/(site)/fonts.css exactly, or the browser downloads the file twice (guarded by test/fonts-v5.test.ts).
 * Arabic pages never preload the Latin faces and English pages never preload the Arabic ones.
 */
export const PRIMARY_FONT: Record<Locale, string> = {
  ar: '/fonts/ibm-plex-sans-arabic-arabic-400.2f4f939130.woff2',
  en: '/fonts/inter-latin-wght.3100e775e8.woff2',
};
