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
  assert.match(shell, /variant="wordmark-light"/);
  assert.match(shell, /variant="primary-dark"/);
});

test('D6 product selector stays preliminary and does not activate commerce or collect data', () => {
  const selector = component('SmartProductSelector.tsx');
  // v4 restyle (DR-112): the preliminary-guidance wording is now the design's short estimate line.
  assert.ok(selector.includes("'ده تقدير مبدئي، والمهندس بيأكد في الزيارة.', 'This is an initial estimate; the engineer confirms it at the visit.'"));
  assert.doesNotMatch(selector, /fetch\(|checkout|payment|localStorage|sessionStorage/i);
  assert.match(selector, /products\/\$\{product\.model\}/);
  // The only outbound action is the visitor's own WhatsApp link, built from the choices (no free text, no form).
  assert.match(selector, /whatsappHref\(message\)\} \{\.\.\.EXTERNAL_LINK\}/);
  assert.doesNotMatch(selector, /<form|<textarea|<select|type="(text|number|email|tel)"/);
});

test('D6 selector room mode and package guidance derive every figure from the registries', () => {
  const selector = component('SmartProductSelector.tsx');
  assert.doesNotMatch(selector, /fetch\(|checkout|payment|localStorage|sessionStorage|document\.cookie|sendBeacon/i);
  assert.match(selector, /from '@\/lib\/product-selector\.ts'/);
  for (const copy of ['By channel count', 'By room', 'Add a room', 'Total: ', 'every lighting line or device = 1 channel', 'The package that covers it', 'بعدد القنوات', 'بالغرف', 'ابعت على واتساب', 'جرّب بيتك الذكي ←']) {
    assert.ok(selector.includes(copy), `missing selector copy: ${copy}`);
  }
  assert.match(selector, /aria-pressed=\{mode === 'channels'\}/);
  assert.match(selector, /aria-pressed=\{mode === 'rooms'\}/);
  assert.match(selector, /packageChannelCapacity\(pkg\)/);
  assert.match(selector, /smart-home\/packages#package-\$\{pkg\.id\}/);
  assert.match(selector, /href=\{`\/\$\{locale\}\/try`\}/);
  const guidance = selector.slice(selector.indexOf('function PackageGuidance'), selector.indexOf('export function SmartProductSelector'));
  assert.ok(guidance.length > 200, 'PackageGuidance block must exist');
  assert.doesNotMatch(guidance, /(16|32)/, 'package capacity numbers must come from packageChannelCapacity');
  assert.doesNotMatch(guidance, /priceEgp|formatPackagePrice|formatPackageAmount|EGP/, 'the selector never shows a package price');
  assert.doesNotMatch(selector, /priceEgp|formatPackagePrice|formatPackageAmount|packageCurrency/, 'no price anywhere in the selector');
  const packages = component('SmartHomePackages.tsx');
  assert.match(packages, /id=\{`package-\$\{entry\.id\}`\}/);
});

test('D6 selector intro follows the mode and room controls carry unique names', () => {
  const selector = component('SmartProductSelector.tsx');
  assert.match(selector, /mode === 'channels'\s*\?\s*tx\(locale, 'اختار عدد القنوات اللي محتاجها/);
  assert.ok(selector.includes('Add your rooms and the channels in each one: every lighting line or device = 1 channel.'));
  assert.match(selector, /roomControlNames\(rooms, locale\)/);
  for (const [ar, en] of [['قلّل القنوات', 'Fewer channels'], ['القنوات', 'Channels'], ['زوّد القنوات', 'More channels'], ['شيل', 'Remove']]) {
    assert.ok(selector.includes(`aria-label={tx(locale, \`${ar}: \${name}\`, \`${en}: \${name}\`)}`), `per-room accessible name for ${en}`);
  }
  assert.doesNotMatch(selector, /aria-label="(القنوات|Channels|عدد الدوائر|Circuits)"/);
  assert.doesNotMatch(selector, /aria-label=\{tx\(locale, '(القنوات|عدد الدوائر)'/);
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
  assert.ok(card.includes("'مشروعك محتاج مراجعة مهندس', 'Your project needs an engineer review'"));
  assert.ok(card.includes("'للمشروعات متعددة الوحدات:', 'For multi-unit projects:'"));
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
