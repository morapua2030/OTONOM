import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { mfaOk, mfaSessionVerified } from '../src/lib/access.ts';
import { isUsersLoginRequest, loginIdentityDigest, normalizeLoginIdentity } from '../src/lib/login-security.ts';
import { PRODUCTION_OWNER_EMAIL, productionOwnerPasswordOnly } from '../src/lib/production-owner-auth.ts';

const owner = { id: 'owner-immutable-01', email: PRODUCTION_OWNER_EMAIL, role: 'OWNER', _sid: 'sid-owner', mfaVerifiedSids: [] };
const enabled = {
  OTONOM_PRODUCTION_OWNER_PASSWORD_ONLY: '1',
  OTONOM_PRODUCTION_OWNER_ID: owner.id,
  OTONOM_PRODUCTION_OWNER_EMAIL: PRODUCTION_OWNER_EMAIL,
  OTONOM_PUBLIC_MARKETING_ONLY: '0',
  OTONOM_FORCE_PREVIEW: '0',
  VERCEL: '1',
  VERCEL_ENV: 'production',
} as NodeJS.ProcessEnv;

test('password-only authorization is exact and does not synthesize MFA verification', () => {
  assert.equal(productionOwnerPasswordOnly(owner, enabled), true);
  assert.equal(mfaSessionVerified(owner), false);
  assert.equal(mfaOk(owner, enabled), true);
});

test('production owner exception fails closed for every identity and environment mismatch', () => {
  const cases: Array<[string, typeof owner | null, NodeJS.ProcessEnv]> = [
    ['missing user', null, enabled],
    ['missing flag', owner, { ...enabled, OTONOM_PRODUCTION_OWNER_PASSWORD_ONLY: '0' }],
    ['not Vercel', owner, { ...enabled, VERCEL: '0' }],
    ['Preview', owner, { ...enabled, VERCEL_ENV: 'preview' }],
    ['forced Preview', owner, { ...enabled, OTONOM_FORCE_PREVIEW: '1' }],
    ['marketing-only runtime', owner, { ...enabled, OTONOM_PUBLIC_MARKETING_ONLY: '1' }],
    ['missing configured id', owner, { ...enabled, OTONOM_PRODUCTION_OWNER_ID: '' }],
    ['different configured id', owner, { ...enabled, OTONOM_PRODUCTION_OWNER_ID: 'owner-recreated' }],
    ['case-variant configured email', owner, { ...enabled, OTONOM_PRODUCTION_OWNER_EMAIL: 'TEAM@otonomiot.com' }],
    ['recreated user id', { ...owner, id: 'owner-recreated' }, enabled],
    ['case-variant stored email', { ...owner, email: 'TEAM@otonomiot.com' }, enabled],
    ['other email', { ...owner, email: 'other@otonomiot.com' }, enabled],
    ['other role', { ...owner, role: 'ADMIN' }, enabled],
  ];
  for (const [label, user, env] of cases) assert.equal(productionOwnerPasswordOnly(user, env), false, label);
});

test('every other staff identity and environment still requires a session-bound MFA SID', () => {
  const admin = { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN', _sid: 'sid-a', mfaVerifiedSids: [] };
  assert.equal(mfaOk(admin, enabled), false);
  assert.equal(mfaOk({ ...admin, mfaVerifiedSids: ['sid-other'] }, enabled), false);
  assert.equal(mfaOk({ ...admin, mfaVerifiedSids: ['sid-a'] }, enabled), true);
  assert.equal(mfaOk(owner, { ...enabled, VERCEL_ENV: 'preview' }), false);
  assert.equal(mfaOk({ id: 'customer-1', role: 'CUSTOMER' }, enabled), true);
});

test('login security helpers match only the REST route and pseudonymize identities', () => {
  assert.equal(isUsersLoginRequest('POST', 'https://example.test/api/users/login'), true);
  assert.equal(isUsersLoginRequest('POST', '/api/users/login/'), true);
  assert.equal(isUsersLoginRequest('GET', '/api/users/login'), false);
  assert.equal(isUsersLoginRequest('POST', '/api/users/login-other'), false);
  assert.equal(normalizeLoginIdentity('  TEAM@OTONOMIOT.COM '), PRODUCTION_OWNER_EMAIL);
  const first = loginIdentityDigest('TEAM@OTONOMIOT.COM', 'synthetic-test-secret-at-least-32-characters');
  const second = loginIdentityDigest(' team@otonomiot.com ', 'synthetic-test-secret-at-least-32-characters');
  assert.equal(first, second);
  assert.doesNotMatch(first, /team|otonom/i);
  assert.notEqual(first, loginIdentityDigest('other@otonomiot.com', 'synthetic-test-secret-at-least-32-characters'));
});

test('hosted flow exposes a separate policy decision and keeps MFA endpoints unavailable to the exempt identity', () => {
  const endpoints = readFileSync(new URL('../src/endpoints/index.ts', import.meta.url), 'utf8');
  const login = readFileSync(new URL('../src/components/StaffLogin.tsx', import.meta.url), 'utf8');
  const users = readFileSync(new URL('../src/collections/Users.ts', import.meta.url), 'utf8');
  const provision = readFileSync(new URL('../scripts/provision-production-owner.ts', import.meta.url), 'utf8');
  assert.match(endpoints, /mfaVerified:\s*mfaSessionVerified\(u\)/);
  assert.match(endpoints, /passwordOnlyAuthorized/);
  assert.equal((endpoints.match(/code: 'MFA_NOT_AVAILABLE'/g) ?? []).length, 6);
  assert.match(login, /data\.passwordOnlyAuthorized === true && data\.authorized === true/);
  assert.match(users, /staff-login-account-fast/);
  assert.match(users, /staff-login-account-cooldown/);
  assert.match(users, /staff-login-ip/);
  assert.match(users, /rateLimitStatus/);
  assert.match(users, /user\.login_failed/);
  assert.match(users, /user\.login_succeeded/);
  assert.match(provision, /ISOLATED_PRODUCTION_OWNER_ONLY/);
  assert.match(provision, /PRODUCTION_USER_STORE_NOT_EMPTY/);
  assert.match(provision, /NEON_PROJECT_ID !== expectedNeonProjectId/);
  assert.doesNotMatch(provision, /lively-silence|nameless-wave|store_[A-Za-z0-9]+/);
  assert.match(provision, /passwordPolicyError\(password, PRODUCTION_OWNER_EMAIL\)/);
  assert.match(provision, /process\.stdin/);
  assert.doesNotMatch(provision, /console\.log\(.*password|process\.argv.*password/i);
});
