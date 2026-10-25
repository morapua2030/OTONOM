import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import { commercialOperationsEnabled, internalCommerceLabEnabled, previewLocked, publicRfqEnabled, resolveSiteUrl, siteUsesHttps, trustedCsrfOrigins, uploadsDisabled } from '../src/lib/server.ts';

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
  assert.equal(internalCommerceLabEnabled({ OTONOM_TEST_PAGES: '1' } as NodeJS.ProcessEnv), true);
  assert.equal(internalCommerceLabEnabled({ OTONOM_TEST_PAGES: '1', VERCEL: '1' } as NodeJS.ProcessEnv), false);
  assert.equal(internalCommerceLabEnabled({ OTONOM_TEST_PAGES: '1', OTONOM_FORCE_PREVIEW: '1' } as NodeJS.ProcessEnv), false);
  assert.equal(internalCommerceLabEnabled({} as NodeJS.ProcessEnv), false);
});

test('commerce and warranty operations are hard-disabled on Vercel and require two explicit local test gates', () => {
  const enabled = { OTONOM_TEST_PAGES: '1', OTONOM_ENABLE_SYNTHETIC_COMMERCIAL_TESTS: '1' } as NodeJS.ProcessEnv;
  assert.equal(commercialOperationsEnabled(enabled), true);
  assert.equal(commercialOperationsEnabled({ ...enabled, VERCEL: '1' } as NodeJS.ProcessEnv), false);
  assert.equal(commercialOperationsEnabled({ ...enabled, OTONOM_FORCE_PREVIEW: '1' } as NodeJS.ProcessEnv), false);
  assert.equal(commercialOperationsEnabled({ OTONOM_TEST_PAGES: '1' } as NodeJS.ProcessEnv), false);
  assert.equal(commercialOperationsEnabled({ OTONOM_ENABLE_SYNTHETIC_COMMERCIAL_TESTS: '1' } as NodeJS.ProcessEnv), false);
});

test('personal-data RFQ intake is local-synthetic only until policy approval', () => {
  const enabled = { OTONOM_TEST_PAGES: '1', OTONOM_ENABLE_SYNTHETIC_RFQ_TESTS: '1' } as NodeJS.ProcessEnv;
  assert.equal(publicRfqEnabled(enabled), true);
  assert.equal(publicRfqEnabled({ ...enabled, VERCEL: '1' } as NodeJS.ProcessEnv), false);
  assert.equal(publicRfqEnabled({ ...enabled, OTONOM_FORCE_PREVIEW: '1' } as NodeJS.ProcessEnv), false);
  assert.equal(publicRfqEnabled({ OTONOM_TEST_PAGES: '1' } as NodeJS.ProcessEnv), false);
});

test('Vercel URL fallback keeps server URLs and auth cookies on HTTPS', () => {
  const vercel = { VERCEL: '1', VERCEL_URL: 'protected-preview.vercel.app' } as NodeJS.ProcessEnv;
  assert.equal(resolveSiteUrl(vercel), 'https://protected-preview.vercel.app');
  assert.equal(siteUsesHttps(vercel), true);
  assert.equal(resolveSiteUrl({ OTONOM_SITE_URL: 'https://preview.example.test' } as NodeJS.ProcessEnv), 'https://preview.example.test');
  assert.equal(resolveSiteUrl({} as NodeJS.ProcessEnv), 'http://127.0.0.1:3301');
  assert.equal(siteUsesHttps({} as NodeJS.ProcessEnv), false);
});

test('Payload CSRF origins include only exact explicit aliases and the immutable Vercel deployment', () => {
  const env = {
    VERCEL: '1',
    VERCEL_URL: 'otonom-git-abc-team.vercel.app',
    OTONOM_CSRF_ORIGINS: 'https://otonom-smart-home-web-team-1626.vercel.app, https://admin.example.test',
  } as NodeJS.ProcessEnv;
  assert.deepEqual(trustedCsrfOrigins(env), [
    'https://otonom-smart-home-web-team-1626.vercel.app',
    'https://admin.example.test',
    'https://otonom-git-abc-team.vercel.app',
  ]);
  assert.deepEqual(trustedCsrfOrigins({ OTONOM_CSRF_ORIGINS: 'http://127.0.0.1:3301' } as NodeJS.ProcessEnv), ['http://127.0.0.1:3301']);
  assert.throws(
    () => trustedCsrfOrigins({ OTONOM_CSRF_ORIGINS: 'http://admin.example.test' } as NodeJS.ProcessEnv),
    /exact HTTPS origins/,
  );
  assert.throws(
    () => trustedCsrfOrigins({ OTONOM_CSRF_ORIGINS: 'https://admin.example.test/path' } as NodeJS.ProcessEnv),
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
