// D8-C v5: plain-text titles/meta, localized 404 title, footer language name, font files and per-locale preload.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { metaText, pageMetadata } from '../src/lib/seo.ts';
import { NOT_FOUND_TITLE, notFoundTitle } from '../src/lib/not-found.ts';
import { PRIMARY_FONT } from '../src/lib/fonts.ts';
import { contentSecurityPolicy } from '../src/lib/csp.ts';

const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const BIDI_CONTROL = /[‎‏‪-‮⁦-⁩]/;

test('metaText removes every bidi control character and collapses spaces', () => {
  assert.equal(metaText('كنترولر ⁦OTONOM⁩ الذكي ⁦16R⁩'), 'كنترولر OTONOM الذكي 16R');
  assert.equal(metaText(' ‏جرّب  بيتك‎ الذكي ‫x‬ '), 'جرّب بيتك الذكي x');
  assert.equal(metaText('Plain English title'), 'Plain English title');
});

test('pageMetadata: title, description, Open Graph and Twitter text are plain text in both locales', () => {
  for (const locale of ['ar', 'en'] as const) {
    const m = pageMetadata({ locale, path: '/products/16r', title: 'كنترولر OTONOM الذكي 16R', description: 'قارن وحدات OTONOM 4R و6R و16R  بسهولة.' }) as any;
    const texts = [m.title, m.description, m.openGraph.title, m.openGraph.description, m.openGraph.images[0].alt, m.twitter.title, m.twitter.description];
    for (const t of texts) {
      assert.equal(typeof t, 'string');
      assert.doesNotMatch(t, BIDI_CONTROL, `${locale}: ${t}`);
      assert.doesNotMatch(t, /\s{2}/, `${locale}: ${t}`);
    }
  }
});

test('the locale layout title template is plain text and the body keeps its bidi isolation helpers', () => {
  const layout = read('app/(site)/[locale]/layout.tsx');
  assert.match(layout, /title: \{ default: 'OTONOM', template: '%s — OTONOM' \}/);
  assert.doesNotMatch(layout, /ltrIsolate|isolateText/);
  assert.doesNotMatch(read('lib/seo.ts'), /isolateText|ltrIsolate/);
  // Bidi isolation in the visible page body is unchanged.
  assert.match(read('components/bidi.tsx'), /export function Bidi\(/);
  assert.match(layout, /<Bidi text=\{d\.previewBanner\} locale=\{locale\} \/>/);
});

test('the localized 404 has its own title in both locales; the unknown-locale 404 is Arabic (D8-A seo.404-title)', () => {
  assert.equal(notFoundTitle('ar'), 'الصفحة غير موجودة — OTONOM');
  assert.equal(notFoundTitle('en'), 'Page not found — OTONOM');
  assert.equal(notFoundTitle('xx'), notFoundTitle('ar'));
  assert.equal(notFoundTitle(undefined), notFoundTitle('ar'));
  for (const t of [notFoundTitle('ar'), notFoundTitle('en')]) assert.doesNotMatch(t, BIDI_CONTROL);
  const page = read('app/(site)/[locale]/not-found.tsx');
  assert.match(page, /export async function generateMetadata/);
  assert.match(page, /title: \{ absolute: notFoundTitle\(locale\) \}/);
  assert.match(read('components/NotFoundBody.tsx'), /<h1>\{NOT_FOUND_TITLE\[locale\]\}<\/h1>/);
  // Next 16 hydrates a 404 with the layout's default title; the body re-applies the same plain-text title.
  assert.match(read('components/NotFoundBody.tsx'), /useEffect\(\(\) => \{\s*document\.title = notFoundTitle\(locale\);\s*\}, \[locale\]\);/);
  assert.notEqual(NOT_FOUND_TITLE.ar, NOT_FOUND_TITLE.en);
});

test('footer language link says "English" / "عربي" as in the design; the header keeps "EN" / "عربي"', () => {
  const site = read('components/site.tsx');
  assert.match(site, /place === 'footer' \? label\(locale, 'English', 'عربي'\) : label\(locale, 'EN', 'عربي'\)/);
  assert.match(site, /<div className="footer-bottom-end">\s*<LanguageLink locale=\{locale\} place="footer" \/>/);
  assert.match(site, /<div className="header-actions">[\s\S]*?<LanguageLink locale=\{locale\} \/>/);
});

test('font files: woff2 only, names carry their own SHA-256 prefix, each preload URL is an @font-face src', () => {
  const dir = new URL('../public/fonts/', import.meta.url);
  const files = readdirSync(dir);
  assert.ok(files.length === 10 && files.every((f) => f.endsWith('.woff2')), files.join(','));
  for (const f of files) {
    const hash = createHash('sha256').update(readFileSync(new URL(f, dir))).digest('hex');
    assert.equal(f.split('.').at(-2), hash.slice(0, 10), f);
  }
  const css = read('app/(site)/fonts.css');
  for (const f of files) assert.ok(css.includes(`url('/fonts/${f}')`), `${f} is declared`);
  for (const [locale, href] of Object.entries(PRIMARY_FONT)) {
    assert.ok(css.includes(`src: url('${href}') format('woff2')`), `${locale} preload matches a face`);
    assert.ok(existsSync(new URL(`../public${href}`, import.meta.url)), href);
  }
  assert.match(PRIMARY_FONT.ar, /ibm-plex-sans-arabic-arabic-400\./, 'Arabic pages preload the Arabic body face');
  assert.match(PRIMARY_FONT.en, /inter-latin-wght\./, 'English pages preload Inter');
  const layout = read('app/(site)/[locale]/layout.tsx');
  assert.equal((layout.match(/rel="preload"/g) ?? []).length, 1, 'exactly one font preload per page');
  assert.match(layout, /<link rel="preload" href=\{PRIMARY_FONT\[locale\]\} as="font" type="font\/woff2" crossOrigin="anonymous" \/>/);
  assert.doesNotMatch(layout, /next\/font/);
  assert.match(read('app/(site)/[locale]/layout.tsx'), /import '\.\.\/fonts\.css';/);
});

test('font stacks and fallback metrics are the ones next/font generated (same look), with font-display: swap', () => {
  const css = read('app/(site)/fonts.css');
  assert.match(css, /--font-inter: 'inter', 'inter Fallback';/);
  assert.match(css, /--font-dm-serif: 'dmSerif', 'dmSerif Fallback';/);
  assert.match(css, /--font-plex-arabic: 'plexArabic', 'plexArabic Fallback';/);
  assert.match(css, /--font-plex-latin: 'plexArabicLatin', 'plexArabicLatin Fallback';/);
  assert.match(css, /'plexArabic Fallback'; src: local\('Arial'\); ascent-override: 108\.5%; descent-override: 41\.5%; line-gap-override: 0\.0%; size-adjust: 100\.0%;/);
  assert.match(css, /'inter Fallback'; src: local\('Arial'\); ascent-override: 89\.79%; descent-override: 22\.36%; line-gap-override: 0\.0%; size-adjust: 107\.89%;/);
  assert.equal((css.match(/font-display: swap;/g) ?? []).length, 10);
  const v2 = read('app/(site)/v2.css');
  assert.match(v2, /--font-arabic: var\(--font-plex-arabic\), var\(--font-plex-latin\), Tahoma, sans-serif;/);
  assert.match(v2, /--font-english: var\(--font-inter\), system-ui/);
});

test('font files are cached as immutable; the security headers and the CSP font-src stay as they were', () => {
  const config = readFileSync(new URL('../next.config.mjs', import.meta.url), 'utf8');
  assert.match(config, /\{ source: '\/:path\*', headers: securityHeaders \}/);
  assert.match(config, /\{ source: '\/fonts\/:file\*', headers: \[\{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' \}\] \}/);
  assert.match(contentSecurityPolicy('abc123'), /font-src 'self' data:/);
});
