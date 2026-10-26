import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { wave, wavePage, wavePagePaths } from '../src/lib/wave1.ts';

test('Wave 1 presents four equal engineering capabilities in both locales', () => {
  for (const locale of ['ar', 'en'] as const) {
    const content = wave(locale);
    assert.equal(content.services.length, 4);
    assert.deepEqual(content.services.map((item) => item.href), [
      '/services/iot-embedded',
      '/services/software-engineering',
      '/services/smart-home-automation',
      '/services/custom-engineering',
    ]);
    assert.equal(content.paths.length, 4);
    assert.equal(content.audiences.length, 2);
  }
});

test('every required D2 corporate route has Arabic and English content', () => {
  const required = [
    'services', 'services/iot-embedded', 'services/software-engineering',
    'services/smart-home-automation', 'services/custom-engineering', 'solutions',
    'about', 'engineering-process', 'build-with-us', 'contact', 'support',
  ];
  assert.deepEqual(wavePagePaths, required);
  for (const path of required) {
    for (const locale of ['ar', 'en'] as const) {
      const page = wavePage(locale, path);
      assert.ok(page, `${locale}/${path} is missing`);
      assert.ok(page.title.length > 10);
      assert.ok(page.sections.length > 0);
    }
  }
});

test('Wave 1 public copy stays evidence-first and non-commercial', () => {
  const publicCopy = JSON.stringify({ ar: wave('ar'), en: wave('en') }).toLowerCase();
  for (const forbidden of ['guaranteed savings', 'best in egypt', '100% compatible', 'buy now', 'checkout now', 'lifetime warranty']) {
    assert.equal(publicCopy.includes(forbidden), false, `unapproved claim: ${forbidden}`);
  }
});

test('consultation intake uses the same fail-closed server gate as proposal intake', () => {
  const source = readFileSync(new URL('../src/app/(site)/[locale]/consultation/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /publicRfqEnabled\(\)\s*\?/);
  assert.match(source, /data-testid="consultation-disabled"/);
  assert.doesNotMatch(source, /team@otonomiot\.com/i);
});

test('sitemap includes the required services and project-start routes', () => {
  const source = readFileSync(new URL('../src/app/(site)/sitemap.xml/route.ts', import.meta.url), 'utf8');
  for (const route of ['/services/iot-embedded', '/services/software-engineering', '/services/smart-home-automation', '/services/custom-engineering', '/engineering-process', '/build-with-us']) {
    assert.match(source, new RegExp(route.replaceAll('/', '\\/')));
  }
});
