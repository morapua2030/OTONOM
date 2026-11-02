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

test('Hybrid 03 public CSS keeps exact brand UI colors and reduced-motion handling', () => {
  const css = readFileSync(new URL('../src/app/(site)/hybrid03.css', import.meta.url), 'utf8').toLowerCase();
  for (const color of ['#0f2238', '#18a3e0', '#148ce1', '#0b70b7', '#b8ddf3']) assert.match(css, new RegExp(color));
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /transition:\s*all/);
});
