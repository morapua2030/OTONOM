// Audit 2026-11-18, P1-01 (R2 C1): mobile LCP on /ar and /ar/products/16r, and the layout shift on /ar/try.
// - The LCP element of the home, smart-home and product pages is the hero product image. It must be preloaded with
//   fetchpriority=high: Next 16's `priority` only adds the preload, and Lighthouse showed it at a low priority.
// - The Arabic fallback must be as wide as IBM Plex Sans Arabic at every weight, so a heading wraps the same before and
//   after the web font arrives (a large /ar/try heading took one line fewer, CLS 0.174).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('the hero product images are preloaded at high priority', () => {
  const home = read('components/home-mix.tsx');
  const pages = read('components/v3-pages.tsx');
  assert.match(home, /<div className="v2-hero-card">\s*<Image src=\{r16\.image\}[^>]*\bpreload fetchPriority="high" \/>/, 'home hero');
  assert.match(pages, /<h1 id="smart-title">[\s\S]{0,600}?<Image src=\{r16\.image\}[^>]*\bpreload fetchPriority="high" \/>/, 'smart-home hero');
  assert.match(pages, /<div className="v2-img-panel v3-product-photo">[\s\S]{0,700}?<Image src=\{product\.image\}[^>]*\bpreload fetchPriority="high" \/>/, 'product hero');
  assert.match(pages, /data-testid="product-admin-photo"/);
  assert.match(pages, /<img src=\{photo\.url\}[^>]*fetchPriority="high"/, 'an admin photo on the product page is the hero too');
  // Next 16 renamed priority to preload; both together are an error
  assert.doesNotMatch(home + pages, /\bpriority\s*(\/>|\s)[^>]*\bpreload\b|\bpreload\b[^>]*\bpriority\b/);
});

type Face = { weight: number; src: string; sizeAdjust: number; ascent: number; descent: number };
function arabicFallbackFaces(): Face[] {
  const css = read('app/(site)/v2.css');
  return [...css.matchAll(/@font-face \{ font-family: 'plexArabic Fallback'; ([^}]*)\}/g)].map((m) => {
    const body = m[1];
    const num = (re: RegExp) => Number(re.exec(body)?.[1] ?? NaN);
    return { weight: num(/font-weight: (\d+);/), src: /src: ([^;]+);/.exec(body)?.[1] ?? '', sizeAdjust: num(/size-adjust: ([\d.]+)%/), ascent: num(/ascent-override: ([\d.]+)%/), descent: num(/descent-override: ([\d.]+)%/) };
  });
}

test('the Arabic fallback has one face per weight, as wide as the web font', () => {
  const faces = arabicFallbackFaces();
  assert.deepEqual(faces.map((f) => f.weight), [400, 500, 600, 700]);
  // Plex / Arial width ratios measured on the live Arabic text (R2 C1): 400 1.09-1.12, 500 1.12-1.15, 600 1.13-1.15, 700 1.15-1.18
  const measured: Record<number, [number, number]> = { 400: [109, 112.5], 500: [112, 115.5], 600: [113, 115.5], 700: [115, 118.5] };
  for (const f of faces) {
    const [lo, hi] = measured[f.weight];
    assert.ok(f.sizeAdjust >= lo && f.sizeAdjust <= hi, `${f.weight}: size-adjust ${f.sizeAdjust}% outside ${lo}-${hi}%`);
    assert.match(f.src, f.weight >= 600 ? /^local\('Arial Bold'\)/ : /^local\('Arial'\)$/, `${f.weight}: the real bold face from 600 (no synthetic bold)`);
    // the line boxes stay as before: the overrides are the previous 108.5% / 41.5% divided by size-adjust
    assert.ok(Math.abs((f.ascent * f.sizeAdjust) / 100 - 108.5) < 0.1, `${f.weight}: ascent`);
    assert.ok(Math.abs((f.descent * f.sizeAdjust) / 100 - 41.5) < 0.1, `${f.weight}: descent`);
  }
});
