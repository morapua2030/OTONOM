import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const component = (name: string) => readFileSync(new URL(`../src/components/${name}`, import.meta.url), 'utf8');

test('Hybrid 03 shell uses locked SVG source variants rather than the retired PNG mark', () => {
  const brand = component('BrandLogo.tsx');
  const shell = component('site.tsx');
  assert.match(brand, /primary_light\.svg/);
  assert.match(brand, /primary_dark\.svg/);
  assert.doesNotMatch(shell, /otonom-logo\.png/);
  assert.match(shell, /variant="primary-light"/);
  assert.match(shell, /variant="primary-dark"/);
});

test('D6 product selector stays preliminary and does not activate commerce or collect data', () => {
  const selector = component('SmartProductSelector.tsx');
  assert.match(selector, /preliminary guidance/);
  assert.match(selector, /does not assume controller quantity/);
  assert.doesNotMatch(selector, /fetch\(|checkout|payment|localStorage|sessionStorage/i);
  assert.match(selector, /products\/\$\{product\.model\}/);
  assert.match(selector, /start-project\?service=smart-home/);
});

test('D6 selector room mode and package guidance derive every figure from the registries', () => {
  const selector = component('SmartProductSelector.tsx');
  assert.doesNotMatch(selector, /fetch\(|checkout|payment|localStorage|sessionStorage|document\.cookie|sendBeacon/i);
  assert.match(selector, /from '@\/lib\/product-selector\.ts'/);
  for (const copy of ['By channel count', 'By room', 'Add a room', 'Total circuits: ', 'A circuit is one independently controlled light or load', 'If you are considering a complete smart-home package', 'Channel capacity is calculated from the controllers included in the package only and does not confirm fit before engineering review.']) {
    assert.ok(selector.includes(copy), `missing selector copy: ${copy}`);
  }
  assert.match(selector, /aria-pressed=\{mode === 'channels'\}/);
  assert.match(selector, /aria-pressed=\{mode === 'rooms'\}/);
  assert.match(selector, /packageChannelCapacity\(pkg\)/);
  assert.match(selector, /smart-home\/packages#package-\$\{pkg\.id\}/);
  assert.match(selector, /start-project\?package=\$\{pkg\.id\}&service=smart-home/);
  const guidance = selector.slice(selector.indexOf('function PackageGuidance'), selector.indexOf('export function SmartProductSelector'));
  assert.ok(guidance.length > 200, 'PackageGuidance block must exist');
  assert.doesNotMatch(guidance, /\b(16|32)\b/, 'package capacity numbers must come from packageChannelCapacity');
  assert.doesNotMatch(guidance, /priceEgp|formatPackagePrice|EGP/, 'the selector never shows a package price');
  const packages = component('SmartHomePackages.tsx');
  assert.match(packages, /id=\{`package-\$\{entry\.id\}`\}/);
});

test('D6 selector intro follows the mode and room controls carry unique names', () => {
  const selector = component('SmartProductSelector.tsx');
  assert.match(selector, /preliminary guidance/);
  assert.ok(selector.includes('Add the rooms in your space and how many circuits you want to control in each. The result is preliminary guidance and does not replace design and installation review.'));
  assert.match(selector, /mode === 'channels'\s*\?\s*tx\(locale, 'اختر عدد القنوات المستقلة المتوقع/);
  assert.match(selector, /roomControlNames\(rooms, locale\)/);
  for (const [ar, en] of [['نوع الغرفة', 'Room type'], ['عدد الدوائر', 'Circuits'], ['قلّل الدوائر', 'Fewer circuits'], ['زِد الدوائر', 'More circuits'], ['احذف', 'Remove']]) {
    assert.ok(selector.includes(`aria-label={tx(locale, \`${ar}: \${name}\`, \`${en}: \${name}\`)}`), `per-room accessible name for ${en}`);
  }
  assert.doesNotMatch(selector, /aria-label="(عدد الدوائر|نوع الغرفة|Circuits|Room type)"/);
  assert.doesNotMatch(selector, /aria-label=\{tx\(locale, '(عدد الدوائر|نوع الغرفة)'/);
});

test('D6 product comparison renders the table and the stacked cards from one row array', () => {
  const products = component('products.tsx');
  const block = products.slice(products.indexOf('const COMPARISON_ROWS'));
  assert.equal((block.match(/COMPARISON_ROWS\.map\(/g) ?? []).length, 2, 'both views map the same rows');
  for (const copy of ["'بانتظار الاعتماد', 'Awaiting approval'", "'غير منشور', 'Not published'", "'مقارنة تعتمد على الحقائق المؤكدة فقط', 'Comparison using confirmed facts only'"]) assert.ok(block.includes(copy), copy);
  assert.match(block, /<th scope="col">/);
  assert.match(block, /<th scope="row">\{row\.label\(locale\)\}<\/th>/);
  assert.match(block, /className="product-compare-stack"/);
  assert.match(block, /<dt>\{row\.label\(locale\)\}<\/dt>/);
  const css = readFileSync(new URL('../src/app/(site)/hybrid03.css', import.meta.url), 'utf8');
  assert.match(css, /\.product-compare-stack \{ display: none; \}/);
  assert.match(css, /@media \(max-width: 760px\) \{\s*\.product-compare-wrap \{ display: none; \}\s*\.product-compare-stack \{ display: block; \}/);
  const page = readFileSync(new URL('../src/app/(site)/[locale]/products/compare/page.tsx', import.meta.url), 'utf8');
  for (const href of ['/smart-home/packages', '/services/smart-home-automation', '/start-project?service=smart-home']) assert.ok(page.includes('href={`/${locale}' + href + '`}'), href);
});

test('D6 selector multi-controller card links to the developer and contractor paths', () => {
  const selector = component('SmartProductSelector.tsx');
  const card = selector.slice(selector.indexOf('className="product-selector-complex"'), selector.indexOf('<PackageGuidance locale={locale} total={total} />'));
  assert.match(card, /does not assume controller quantity/);
  assert.ok(card.includes("'للمشروعات متعددة الوحدات أو مع المطوّرين والمقاولين:', 'For multi-unit projects, developers and contractors:'"));
  assert.match(card, /href=\{`\/\$\{locale\}\/business\/developers`\}/);
  assert.match(card, /href=\{`\/\$\{locale\}\/business\/contractors`\}/);
  assert.doesNotMatch(card, /priceEgp|EGP|partner price/i);
});

test('Hybrid 03 public CSS keeps exact brand UI colors and reduced-motion handling', () => {
  const css = readFileSync(new URL('../src/app/(site)/hybrid03.css', import.meta.url), 'utf8').toLowerCase();
  for (const color of ['#0f2238', '#18a3e0', '#148ce1', '#0b70b7', '#b8ddf3']) assert.match(css, new RegExp(color));
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /transition:\s*all/);
});
