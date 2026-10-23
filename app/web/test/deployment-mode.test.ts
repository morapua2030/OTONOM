import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isAdministrativePath, isPrivatePublicRoute, protectedAdminOrigin, publicMarketingOnly } from '../src/lib/deployment.ts';

test('public marketing mode is fail-closed outside Vercel Production', () => {
  const enabled = { OTONOM_PUBLIC_MARKETING_ONLY: '1', VERCEL: '1', VERCEL_ENV: 'production' } as NodeJS.ProcessEnv;
  assert.equal(publicMarketingOnly(enabled), true);
  assert.equal(publicMarketingOnly({ ...enabled, VERCEL_ENV: 'preview' }), false);
  assert.equal(publicMarketingOnly({ ...enabled, VERCEL: '0' }), false);
  assert.equal(publicMarketingOnly({ ...enabled, OTONOM_PUBLIC_MARKETING_ONLY: '0' }), false);
});

test('public marketing routing blocks all private application surfaces', () => {
  for (const path of ['/api/ready', '/api/graphql', '/graphql', '/ar/account', '/en/cart', '/ar/checkout', '/en/shop', '/ar/support/warranty', '/en/preview/bidi-samples']) {
    assert.equal(isPrivatePublicRoute(path), true, path);
  }
  for (const path of ['/ar', '/en/products/4r', '/ar/solutions', '/en/business/request-a-proposal', '/robots.txt']) {
    assert.equal(isPrivatePublicRoute(path), false, path);
  }
  assert.equal(isAdministrativePath('/staff/login'), true);
  assert.equal(isAdministrativePath('/admin/overview'), true);
  assert.equal(isAdministrativePath('/administrator'), false);
});

test('admin redirects accept only credential-free HTTPS Vercel deployment origins', () => {
  assert.equal(protectedAdminOrigin({ OTONOM_ADMIN_URL: 'https://protected-team.vercel.app/path' } as NodeJS.ProcessEnv), 'https://protected-team.vercel.app');
  assert.equal(protectedAdminOrigin({ OTONOM_ADMIN_URL: 'http://protected-team.vercel.app' } as NodeJS.ProcessEnv), undefined);
  assert.equal(protectedAdminOrigin({ OTONOM_ADMIN_URL: 'https://user:pass@protected-team.vercel.app' } as NodeJS.ProcessEnv), undefined);
  assert.equal(protectedAdminOrigin({ OTONOM_ADMIN_URL: 'https://example.com' } as NodeJS.ProcessEnv), undefined);
});
