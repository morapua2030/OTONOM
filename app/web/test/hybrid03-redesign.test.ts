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

test('Hybrid 03 public CSS keeps exact brand UI colors and reduced-motion handling', () => {
  const css = readFileSync(new URL('../src/app/(site)/hybrid03.css', import.meta.url), 'utf8').toLowerCase();
  for (const color of ['#0f2238', '#18a3e0', '#148ce1', '#0b70b7', '#b8ddf3']) assert.match(css, new RegExp(color));
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /transition:\s*all/);
});
