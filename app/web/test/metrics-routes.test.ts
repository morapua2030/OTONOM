// Audit 2026-11-18, S9-01: the public metrics endpoint counts only pages the site really serves, at most 60 events
// per client every 10 minutes, and a package-interest click once per client and day. The limits themselves are
// exercised over HTTP in tests/src/final-release.ts (F-METRICS-*); this file covers the route registry.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { METRIC_IP_LIMIT, metricRoute, PACKAGE_INTEREST_EVENTS } from '../src/lib/metrics.ts';
import { isKnownPublicPath, PUBLIC_STATIC_PATHS } from '../src/lib/public-routes.ts';

test('every static public page is a known metric route, in both locales', () => {
  for (const p of PUBLIC_STATIC_PATHS) {
    for (const l of ['ar', 'en'] as const) assert.deepEqual(metricRoute(`/${l}${p}`), { route: `/${l}${p}`, locale: l }, `/${l}${p}`);
  }
  assert.deepEqual(metricRoute('/ar/products/compare'), { route: '/ar/products/compare', locale: 'ar' });
  assert.deepEqual(metricRoute('/en/legal/privacy'), { route: '/en/legal/privacy', locale: 'en' });
  assert.deepEqual(metricRoute('/ar/try/?demo=1#x'), { route: '/ar/try', locale: 'ar' }, 'query, hash and trailing slash are dropped');
});

test('made-up, unreleased or disabled pages are never counted', () => {
  for (const bad of ['/ar/no-such-page', '/en/about/team', '/ar/products/99r', '/en/projects/not-released', '/ar/shop', '/en/cart', '/ar/account', '/en/checkout', '/ar/support/warranty', '/ar/preview/bidi-samples', '/en/insights', '/ar/x1']) {
    assert.equal(metricRoute(bad), null, bad);
  }
  assert.equal(isKnownPublicPath('/projects'), true, 'the projects index is a page');
  assert.equal(isKnownPublicPath('/projects/not-released'), false, 'no case study is released yet');
});

test('the client and package limits', () => {
  assert.equal(METRIC_IP_LIMIT, 60);
  assert.deepEqual([...PACKAGE_INTEREST_EVENTS].sort(), ['package_essential', 'package_plus', 'package_premium']);
});
