import localFont from 'next/font/local';

/**
 * Design v2 fonts (DR-104), self-hosted from src/fonts (OFL 1.1, see src/fonts/README.md).
 * next/font/local emits same-origin @font-face rules at build time: no provider request at build or run
 * time and no CSP change. Preload is off because one layout serves both locales; each locale's CSS only
 * references its own families, so the browser downloads just those files (font-display: swap).
 * Font loader arguments must be literal values, so every face is listed explicitly.
 */
const inter = localFont({
  src: '../../fonts/inter-latin-wght-normal.woff2',
  weight: '100 900',
  style: 'normal',
  variable: '--font-inter',
  display: 'swap',
  preload: false,
});

const dmSerif = localFont({
  src: '../../fonts/dm-serif-display-latin-400-normal.woff2',
  weight: '400',
  style: 'normal',
  variable: '--font-dm-serif',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Times New Roman',
});

const plexArabic = localFont({
  src: [
    { path: '../../fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-plex-arabic',
  display: 'swap',
  preload: false,
});

/** Latin glyphs of IBM Plex Sans Arabic (brand names, numbers and model ids inside Arabic text). */
const plexArabicLatin = localFont({
  src: [
    { path: '../../fonts/ibm-plex-sans-arabic-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../fonts/ibm-plex-sans-arabic-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../fonts/ibm-plex-sans-arabic-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../fonts/ibm-plex-sans-arabic-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-plex-latin',
  display: 'swap',
  preload: false,
});

export const fontVariables = [inter.variable, dmSerif.variable, plexArabic.variable, plexArabicLatin.variable].join(' ');
