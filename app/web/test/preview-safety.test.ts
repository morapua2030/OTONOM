import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { previewLocked, resolveSiteUrl, siteUsesHttps, uploadsDisabled } from '../src/lib/server.ts';

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

test('Vercel URL fallback keeps server URLs and auth cookies on HTTPS', () => {
  const vercel = { VERCEL: '1', VERCEL_URL: 'protected-preview.vercel.app' } as NodeJS.ProcessEnv;
  assert.equal(resolveSiteUrl(vercel), 'https://protected-preview.vercel.app');
  assert.equal(siteUsesHttps(vercel), true);
  assert.equal(resolveSiteUrl({ OTONOM_SITE_URL: 'https://preview.example.test' } as NodeJS.ProcessEnv), 'https://preview.example.test');
  assert.equal(resolveSiteUrl({} as NodeJS.ProcessEnv), 'http://127.0.0.1:3301');
  assert.equal(siteUsesHttps({} as NodeJS.ProcessEnv), false);
});
