import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import { commercialOperationsEnabled, internalCommerceLabEnabled, previewLocked, publicRfqEnabled, resolveSiteUrl, siteUsesHttps, trustedCsrfOrigins, uploadsDisabled } from '../src/lib/server.ts';
import { testEnv } from './test-env.ts';
// These tests check the test-harness switches themselves, so they run as a harness build (audit AI3-01). That a
// normal build cannot switch them on is proven in test-switches.test.ts.
process.env.OTONOM_TEST_HARNESS_BUILD = '1';

const originalPreview = process.env.OTONOM_FORCE_PREVIEW;
const originalUploads = process.env.OTONOM_DISABLE_UPLOADS;

afterEach(() => {
  if (originalPreview === undefined) delete process.env.OTONOM_FORCE_PREVIEW;
  else process.env.OTONOM_FORCE_PREVIEW = originalPreview;
  if (originalUploads === undefined) delete process.env.OTONOM_DISABLE_UPLOADS;
  else process.env.OTONOM_DISABLE_UPLOADS = originalUploads;
});

test('preview and upload safety locks require an explicit enabled value', () => {
  process.env.OTONOM_FORCE_PREVIEW = '1';
  process.env.OTONOM_DISABLE_UPLOADS = '1';
  assert.equal(previewLocked(), true);
  assert.equal(uploadsDisabled(), true);

  process.env.OTONOM_FORCE_PREVIEW = '0';
  process.env.OTONOM_DISABLE_UPLOADS = '0';
  assert.equal(previewLocked(), false);
  assert.equal(uploadsDisabled(), false);
});

test('synthetic commerce lab is local-test-only and cannot be enabled on hosted or forced Preview runtimes', () => {
  assert.equal(internalCommerceLabEnabled(testEnv({ OTONOM_TEST_PAGES: '1' })), true);
  assert.equal(internalCommerceLabEnabled(testEnv({ OTONOM_TEST_PAGES: '1', VERCEL: '1' })), false);
  assert.equal(internalCommerceLabEnabled(testEnv({ OTONOM_TEST_PAGES: '1', OTONOM_FORCE_PREVIEW: '1' })), false);
  assert.equal(internalCommerceLabEnabled(testEnv({})), false);
});

test('commerce and warranty operations are hard-disabled on Vercel and require two explicit local test gates', () => {
  const enabled = testEnv({ OTONOM_TEST_PAGES: '1', OTONOM_ENABLE_SYNTHETIC_COMMERCIAL_TESTS: '1' });
  assert.equal(commercialOperationsEnabled(enabled), true);
  assert.equal(commercialOperationsEnabled(testEnv({ ...enabled, VERCEL: '1' })), false);
  assert.equal(commercialOperationsEnabled(testEnv({ ...enabled, OTONOM_FORCE_PREVIEW: '1' })), false);
  assert.equal(commercialOperationsEnabled(testEnv({ OTONOM_TEST_PAGES: '1' })), false);
  assert.equal(commercialOperationsEnabled(testEnv({ OTONOM_ENABLE_SYNTHETIC_COMMERCIAL_TESTS: '1' })), false);
});

test('personal-data RFQ intake is local-synthetic only until policy approval', () => {
  const enabled = testEnv({ OTONOM_TEST_PAGES: '1', OTONOM_ENABLE_SYNTHETIC_RFQ_TESTS: '1' });
  assert.equal(publicRfqEnabled(enabled), true);
  assert.equal(publicRfqEnabled(testEnv({ ...enabled, VERCEL: '1' })), false);
  assert.equal(publicRfqEnabled(testEnv({ ...enabled, OTONOM_FORCE_PREVIEW: '1' })), false);
  assert.equal(publicRfqEnabled(testEnv({ OTONOM_TEST_PAGES: '1' })), false);
});

test('Vercel URL fallback keeps server URLs and auth cookies on HTTPS', () => {
  const vercel = testEnv({ VERCEL: '1', VERCEL_URL: 'protected-preview.vercel.app' });
  assert.equal(resolveSiteUrl(vercel), 'https://protected-preview.vercel.app');
  assert.equal(siteUsesHttps(vercel), true);
  assert.equal(resolveSiteUrl(testEnv({ OTONOM_SITE_URL: 'https://preview.example.test' })), 'https://preview.example.test');
  assert.equal(resolveSiteUrl(testEnv({})), 'http://127.0.0.1:3301');
  assert.equal(siteUsesHttps(testEnv({})), false);
});

test('Payload CSRF origins include only exact explicit aliases and the immutable Vercel deployment', () => {
  const env = testEnv({
    VERCEL: '1',
    VERCEL_URL: 'otonom-git-abc-team.vercel.app',
    OTONOM_CSRF_ORIGINS: 'https://otonom-smart-home-web-team-1626.vercel.app, https://admin.example.test',
  });
  assert.deepEqual(trustedCsrfOrigins(env), [
    'https://otonom-smart-home-web-team-1626.vercel.app',
    'https://admin.example.test',
    'https://otonom-git-abc-team.vercel.app',
  ]);
  assert.deepEqual(trustedCsrfOrigins(testEnv({ OTONOM_CSRF_ORIGINS: 'http://127.0.0.1:3301' })), ['http://127.0.0.1:3301']);
  assert.throws(
    () => trustedCsrfOrigins(testEnv({ OTONOM_CSRF_ORIGINS: 'http://admin.example.test' })),
    /exact HTTPS origins/,
  );
  assert.throws(
    () => trustedCsrfOrigins(testEnv({ OTONOM_CSRF_ORIGINS: 'https://admin.example.test/path' })),
    /exact HTTPS origins/,
  );
});

test('admin title does not mislabel hosted Preview as local', () => {
  const config = readFileSync(new URL('../src/payload.config.ts', import.meta.url), 'utf8');
  assert.match(config, /titleSuffix:\s*['"]\s*— OTONOM['"]/);
  assert.doesNotMatch(config, /OTONOM \(local\)/);
});

test('synthetic checkout refresh state is tab-scoped, expiring and excludes customer-entered identity', () => {
  const source = readFileSync(new URL('../src/components/admin/CommerceLab.tsx', import.meta.url), 'utf8');
  assert.match(source, /sessionStorage\.setItem\(DRAFT_KEY/);
  assert.match(source, /DRAFT_TTL_MS\s*=\s*2\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  assert.match(source, /JSON\.stringify\(\{ step, lines, governorate, expiresAt:/);
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /JSON\.stringify\(\{[^}]*customerAlias/);
});

test('staff queue sorting remains a fixed server-side allowlist', () => {
  const store = readFileSync(new URL('../src/components/admin/StoreView.tsx', import.meta.url), 'utf8');
  const service = readFileSync(new URL('../src/components/admin/ServiceView.tsx', import.meta.url), 'utf8');
  assert.match(store, /const orderSorts = \{/);
  assert.match(store, /requestedSort in orderSorts/);
  assert.match(store, /data-testid="inventory-ledger"/);
  assert.match(store, /l\.at AS created_at/);
  assert.doesNotMatch(store, /l\.created_at/);
  assert.equal((store.match(/sort, page: String\(page [+-] 1\)/g) ?? []).length, 2);
  assert.equal((service.match(/unassigned: '1'/g) ?? []).length, 2);
});
