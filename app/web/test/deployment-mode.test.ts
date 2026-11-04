import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adminPathRequiresSessionCookie, hostRole, isAdministrativePath, isPrivatePublicRoute, isPublicHostEndpoint, marketingDecision, protectedAdminOrigin, PUBLIC_HOST_ENDPOINTS, publicMarketingOnly } from '../src/lib/deployment.ts';

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

test('admin shell requires the HttpOnly session cookie while authentication routes stay public', () => {
  assert.equal(adminPathRequiresSessionCookie('/admin', false), true);
  assert.equal(adminPathRequiresSessionCookie('/admin/account-security', false), true);
  assert.equal(adminPathRequiresSessionCookie('/admin/account-security', true), false);
  for (const path of ['/admin/login', '/admin/forgot', '/admin/reset/token', '/admin/logout', '/admin/unauthorized']) {
    assert.equal(adminPathRequiresSessionCookie(path, false), false, path);
  }
  assert.equal(adminPathRequiresSessionCookie('/staff/login', false), false);
  assert.equal(adminPathRequiresSessionCookie('/administrator', false), false);
});

// ---- Final release (owner 2026-11-04): one Production deployment, two hosts ----
const PROD = { OTONOM_PUBLIC_MARKETING_ONLY: '1', VERCEL: '1', VERCEL_ENV: 'production', OTONOM_ADMIN_URL: 'https://otonom-admin.vercel.app' } as NodeJS.ProcessEnv;
const PUBLIC_HOST = 'otonom-smart-home-web.vercel.app';
const ADMIN_HOST = 'otonom-admin.vercel.app';
const decide = (method: string, pathname: string, host: string | null, env = PROD, search = '') => marketingDecision({ method, pathname, search, host }, env);

test('a custom admin domain is accepted only when it is listed exactly in OTONOM_CSRF_ORIGINS (domain move = env only)', () => {
  assert.equal(protectedAdminOrigin({ OTONOM_ADMIN_URL: 'https://admin.otonomiot.com' } as NodeJS.ProcessEnv), undefined);
  assert.equal(protectedAdminOrigin({ OTONOM_ADMIN_URL: 'https://admin.otonomiot.com', OTONOM_CSRF_ORIGINS: 'https://otonomiot.com,https://admin.otonomiot.com' } as NodeJS.ProcessEnv), 'https://admin.otonomiot.com');
  assert.equal(protectedAdminOrigin({ OTONOM_ADMIN_URL: 'https://admin.otonomiot.com', OTONOM_CSRF_ORIGINS: 'https://otonomiot.com' } as NodeJS.ProcessEnv), undefined);
  assert.equal(protectedAdminOrigin({ OTONOM_ADMIN_URL: 'http://admin.otonomiot.com', OTONOM_CSRF_ORIGINS: 'http://admin.otonomiot.com' } as NodeJS.ProcessEnv), undefined);
});

test('host role: only the exact admin host is "admin"; everything else, including a missing Host, is public', () => {
  assert.equal(hostRole(ADMIN_HOST, PROD), 'admin');
  assert.equal(hostRole('OTONOM-ADMIN.vercel.app', PROD), 'admin');
  for (const host of [PUBLIC_HOST, 'otonom-admin.vercel.app.evil.com', 'evil-otonom-admin.vercel.app', '', null]) assert.equal(hostRole(host, PROD), 'public', String(host));
  assert.equal(hostRole(ADMIN_HOST, { ...PROD, OTONOM_ADMIN_URL: '' }), 'public');
});

test('public host: marketing pages only; /admin and /staff go to the admin host; /api and private pages 404 except the allow-listed endpoints', () => {
  assert.deepEqual(decide('GET', '/ar', PUBLIC_HOST), { kind: 'pass', noindex: false });
  assert.deepEqual(decide('GET', '/en/try', PUBLIC_HOST), { kind: 'pass', noindex: false });
  assert.deepEqual(decide('GET', '/admin/collections/leads', PUBLIC_HOST, PROD, '?x=1'), { kind: 'redirect', to: 'https://otonom-admin.vercel.app/admin/collections/leads?x=1', status: 307 });
  assert.deepEqual(decide('GET', '/staff/login', PUBLIC_HOST), { kind: 'redirect', to: 'https://otonom-admin.vercel.app/staff/login', status: 307 });
  assert.deepEqual(decide('GET', '/admin', PUBLIC_HOST, { ...PROD, OTONOM_ADMIN_URL: '' }), { kind: 'not-found' });
  for (const path of ['/api/ready', '/api/users/me', '/api/leads', '/api/booking', '/api/e', '/graphql', '/ar/account', '/en/shop', '/ar/support/warranty']) {
    assert.notEqual(decide('GET', path, PUBLIC_HOST).kind, 'pass', `GET ${path} must not pass on the public host`);
  }
  assert.deepEqual(decide('POST', '/api/e', PUBLIC_HOST), { kind: 'pass', noindex: true });
  assert.deepEqual(decide('POST', '/api/booking', PUBLIC_HOST), { kind: 'pass', noindex: true });
  for (const [method, path] of [['POST', '/api/rfq'], ['POST', '/api/users/login'], ['POST', '/api/leads'], ['PUT', '/api/e'], ['DELETE', '/api/booking'], ['POST', '/api/e/'], ['POST', '/api/booking/x'], ['POST', '/ar/contact'], ['PATCH', '/api/globals/settings']]) {
    assert.deepEqual(decide(method, path, PUBLIC_HOST), { kind: 'not-found' }, `${method} ${path}`);
  }
  assert.equal(isPublicHostEndpoint('POST', '/api/e'), true);
  assert.equal(isPublicHostEndpoint('GET', '/api/e'), false);
  assert.deepEqual(PUBLIC_HOST_ENDPOINTS.map((e) => `${e.method} ${e.path}`), ['POST /api/e', 'POST /api/booking', 'GET /api/cron/daily']);
  assert.deepEqual(decide('GET', '/api/cron/daily', PUBLIC_HOST), { kind: 'pass', noindex: true });
  assert.deepEqual(decide('POST', '/api/cron/daily', PUBLIC_HOST), { kind: 'not-found' });
});

test('admin host: staff, admin, API and static files are served with noindex; public pages redirect to /admin', () => {
  for (const path of ['/admin', '/admin/login', '/staff/login', '/api/users/login', '/api/leads', '/api/mfa/verify', '/brand/otonom/assets/icons/favicon.ico', '/fonts/inter-latin-wght.3100e775e8.woff2', '/robots.txt']) {
    assert.deepEqual(decide(path.startsWith('/api/users/login') ? 'POST' : 'GET', path, ADMIN_HOST), { kind: 'pass', noindex: true }, path);
  }
  for (const path of ['/', '/ar', '/en/try', '/ar/contact']) assert.deepEqual(decide('GET', path, ADMIN_HOST), { kind: 'redirect', to: 'https://otonom-admin.vercel.app/admin', status: 307 }, path);
  assert.deepEqual(decide('POST', '/ar/contact', ADMIN_HOST), { kind: 'not-found' });
});
