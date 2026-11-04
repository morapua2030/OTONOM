import type { Locale } from './i18n.ts';

/**
 * The font file a locale preloads, chosen by measurement on the production build (D8-C v5; CDP getPlatformFontsForNode
 * at 360 and 1440 px, then 5 cold runs per page against the v4 baseline):
 * - English: the LCP is the hero H1 in DM Serif Display 400 on Home, Try, Controllers and Packages, so that face is
 *   preloaded (every English page's median LCP equal or better than the baseline).
 * - Arabic: nothing is preloaded. Home and Controllers have an image LCP, and preloading the H1 face (Plex Arabic 700)
 *   made the median LCP worse by more than 50 ms on /ar and /ar/try, so the preload was dropped for Arabic.
 * A URL here must match a `src` in src/app/(site)/fonts.css exactly, or the browser downloads the file twice
 * (guarded by test/d8c-v5.test.ts).
 */
export const PRELOAD_FONT: Partial<Record<Locale, string>> = {
  en: '/fonts/dm-serif-display-latin-400.fdf61e20fd.woff2',
};
