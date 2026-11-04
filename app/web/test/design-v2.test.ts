import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { isUnknownLocalePath } from '../src/lib/deployment.ts';
import { contentSecurityPolicy } from '../src/lib/csp.ts';

const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const css = () => read('app/(site)/v2.css');

test('Home (mix) shows the 16R as hero and Choose opens WhatsApp with the encoded package message (DR-100/101)', () => {
  const home = read('components/home-mix.tsx');
  assert.match(home, /const r16 = requireProductByModel\('16r'\)/);
  assert.match(home, /<div className="v2-hero-card">\s*<Image src=\{r16\.image\}[^>]*priority \/>/);
  assert.match(home, /href=\{whatsappHref\(bookVisitMessage\(locale, entry\.id\)\)\} \{\.\.\.EXTERNAL_LINK\}/);
  // final release: cards render the admin-managed list, whose built-in default is the registry (never literal prices)
  assert.match(home, /packages = SMART_HOME_PACKAGES/, 'package cards default to the registry');
  assert.match(home, /\{packages\.map\(\(entry, index\) =>/, 'package cards come from the package list');
  assert.doesNotMatch(home, /44[,_]?000|32[,_]?000|24[,_]?000/, 'no duplicated prices');
  assert.match(read('app/(site)/[locale]/page.tsx'), /<HomeMix locale=\{locale as Locale\} packages=\{content\.packages\} \/>/);
});

test('contact surfaces collect nothing: no form, no input, no request (DR-101)', () => {
  for (const file of ['components/ContactBooking.tsx', 'app/(site)/[locale]/contact/page.tsx', 'components/home-mix.tsx', 'lib/contact.ts']) {
    const source = read(file);
    assert.doesNotMatch(source, /<form|<input|<textarea|<select|fetch\(|localStorage|sessionStorage|sendBeacon/, file);
  }
  assert.match(read('components/ContactBooking.tsx'), /aria-pressed=\{choice === chip\.id\}/);
  assert.match(read('app/(site)/[locale]/contact/page.tsx'), /smartHomePackage\(requested\)\?\.id \?\? null/, '?package goes through the registry allow-list');
});

test('fonts are self-hosted: same-origin /fonts/ files, OFL files present, no provider host anywhere, CSP unchanged (DR-104, D8-C v5)', () => {
  // D8-C v5: hand-written @font-face rules (fonts.css) replace next/font/local so each locale can preload its own face.
  const fonts = read('app/(site)/fonts.css');
  const sources = [...fonts.matchAll(/src: url\('([^']+)'\) format\('woff2'\)/g)].map((m) => m[1]);
  assert.equal(sources.length, 10, 'ten faces, woff2 only');
  for (const src of sources) assert.match(src, /^\/fonts\/[a-z0-9-]+\.[0-9a-f]{10}\.woff2$/, 'same-origin, content-hashed file');
  assert.doesNotMatch(fonts, /next\/font\/google|https?:/);
  const files = readdirSync(new URL('../src/fonts/', import.meta.url));
  for (const licence of ['OFL-Inter.txt', 'OFL-DMSerifDisplay.txt', 'OFL-IBMPlexSansArabic.txt']) assert.ok(files.includes(licence), licence);
  assert.ok(files.filter((file) => file.endsWith('.woff2')).length >= 10, 'masters kept');
  for (const file of ['app/(site)/fonts.css', 'app/(site)/v2.css', 'app/(site)/[locale]/layout.tsx']) assert.doesNotMatch(read(file), /fonts\.(googleapis|gstatic)\.com/, file);
  const policy = contentSecurityPolicy('abc123');
  assert.match(policy, /font-src 'self' data:/);
  assert.doesNotMatch(policy, /googleapis|gstatic/);
});

test('small blue text uses the accessible #0B70B7; the focus ring and reduced motion follow the v2 rules', () => {
  const sheet = css();
  assert.match(sheet, /--v2-blue-text: #0b70b7;/);
  assert.match(sheet, /\.eyebrow, \.model-kicker, \.section-label, \.v2-eyebrow \{\s*color: var\(--v2-blue-text\);/);
  assert.match(sheet, /\na \{ color: var\(--v2-blue-text\); \}/);
  assert.match(sheet, /:focus-visible \{ outline: 3px solid var\(--v2-sky\); outline-offset: 2px; \}/);
  assert.match(sheet, /@media \(prefers-reduced-motion: reduce\) \{[^}]*scroll-behavior: auto;/);
  assert.doesNotMatch(sheet, /transition:\s*all/);
});

test('the swash blob is decorative and the nav switches to the drawer below 1000px', () => {
  assert.match(read('components/v2.tsx'), /<span className="v2-swash-blob" aria-hidden="true" \/>/);
  const sheet = css();
  assert.match(sheet, /@media \(max-width: 999\.98px\) \{\s*\.nav-desktop, \.header-book \{ display: none; \}\s*\.menu-mobile \{ display: block; \}/);
  assert.match(sheet, /@media \(min-width: 1000px\) \{\s*\.menu-mobile \{ display: none !important; \}/);
  const shell = read('components/site.tsx');
  assert.match(shell, /variant="wordmark-light"/);
  assert.match(shell, /<EscapableDetails className="menu-mobile">/);
});

test('unknown language-code paths get the localized 404; site paths never do', () => {
  for (const path of ['/xx', '/xx/about', '/fr', '/de-de/x']) assert.equal(isUnknownLocalePath(path), true, path);
  for (const path of ['/ar', '/en/products', '/api/ready', '/admin', '/staff/login', '/brand/otonom/assets/svg/primary_dark.svg', '/robots.txt', '/sitemap.xml', '/arx']) assert.equal(isUnknownLocalePath(path), false, path);
});

test('sitemap indexes /products and keeps the placeholder and redirected routes out (D8-C #7, DR-107)', () => {
  const sitemap = read('app/(site)/sitemap.xml/route.ts');
  assert.match(sitemap, /'\/products'/);
  // final release: /legal/privacy is listed only once the OWNER approved the privacy text (never in the static list)
  assert.match(sitemap, /const privacy = \(await loadSiteContent\(\)\)\.privacy\.approved \? \['\/legal\/privacy'\] : \[\];/);
  assert.ok(!/const STATIC = \[[^\]]*legal\/privacy/.test(sitemap), '/legal/privacy is not a static sitemap path');
  for (const path of ['/solutions/villas', '/solutions/apartments', '/solutions/scenarios', '/technology/documentation', '/insights', '/support/service',
    '/solutions', '/technology', '/technology/controllers', '/engineering-process', '/build-with-us', '/products/compare', '/consultation', '/business/request-a-proposal', '/business/partners']) {
    assert.ok(!sitemap.includes(`'${path}'`), `${path} must stay out of the sitemap`);
  }
  assert.match(read('app/(site)/[locale]/[...slug]/page.tsx'), /noindex: !cms && PLACEHOLDER_ROUTES\.has\(path\) \? true : undefined/);
});

test('the builder WhatsApp brief is user-initiated, capped and only offered while intake is disabled', () => {
  const builder = read('components/ProjectBuilder.tsx');
  const locked = builder.slice(builder.indexOf('data-testid="project-intake-disabled"'));
  assert.match(locked, /href=\{whatsappHref\(brief\)\} \{\.\.\.EXTERNAL_LINK\} data-testid="builder-whatsapp"/);
  assert.match(read('lib/contact.ts'), /message\.length > WHATSAPP_MESSAGE_MAX/);
});
