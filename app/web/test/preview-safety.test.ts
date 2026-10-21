import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import { internalCommerceLabEnabled, previewLocked, resolveSiteUrl, siteUsesHttps, uploadsDisabled } from '../src/lib/server.ts';

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

test('Vercel URL fallback keeps server URLs and auth cookies on HTTPS', () => {
  const vercel = { VERCEL: '1', VERCEL_URL: 'protected-preview.vercel.app' } as NodeJS.ProcessEnv;
  assert.equal(resolveSiteUrl(vercel), 'https://protected-preview.vercel.app');
  assert.equal(siteUsesHttps(vercel), true);
  assert.equal(resolveSiteUrl({ OTONOM_SITE_URL: 'https://preview.example.test' } as NodeJS.ProcessEnv), 'https://preview.example.test');
  assert.equal(resolveSiteUrl({} as NodeJS.ProcessEnv), 'http://127.0.0.1:3301');
  assert.equal(siteUsesHttps({} as NodeJS.ProcessEnv), false);
});

test('admin title does not mislabel hosted Preview as local', () => {
  const config = readFileSync(new URL('../src/payload.config.ts', import.meta.url), 'utf8');
  assert.match(config, /titleSuffix:\s*['"]\s*— OTONOM['"]/);
  assert.doesNotMatch(config, /OTONOM \(local\)/);
});
