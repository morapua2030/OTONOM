// Audit 2026-11-18, AI3-01: the test-only switches cannot be turned on in a normal (Production) build, whatever the
// runtime environment says. Without OTONOM_TEST_HARNESS_BUILD at build time (next.config.mjs inlines it as ''), the
// fixed e-mail MFA code is refused even when all three test variables are set, also with NODE_ENV=production.
// The bundle-level proof for a real `next build` is tests/tools/assert-no-test-switches.mjs (CI build job).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { afterEach, test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { legacyRouteHarness } from '../src/lib/deployment.ts';
import { generateEmailOtp, sendOwnerEmailOtp } from '../src/lib/email-otp.ts';
import { notificationsConfigured, sendMail } from '../src/lib/notify-email.ts';
import { commercialOperationsEnabled, internalCommerceLabEnabled, publicRfqEnabled } from '../src/lib/server.ts';
import { testHarnessBuild } from '../src/lib/test-harness.ts';
import { testEnv } from './test-env.ts';

delete process.env.OTONOM_TEST_HARNESS_BUILD; // a normal build
const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXED = '483921';
/** The three test variables that used to be enough (with VERCEL unset) to make the MFA e-mail code a known value. */
const THREE = { OTONOM_EMAIL_PROVIDER: 'test', OTONOM_EMAIL_TEST_MODE: '1', OTONOM_EMAIL_OTP_TEST_CODE: FIXED };
const HARNESS = { OTONOM_TEST_PAGES: '1', OTONOM_ENABLE_SYNTHETIC_COMMERCIAL_TESTS: '1', OTONOM_ENABLE_SYNTHETIC_RFQ_TESTS: '1' };
const otpMail = { to: 'otp-owner@otonom.local', code: '123456', challengeId: 'c1', expiresAt: new Date(Date.now() + 60_000).toISOString() };

afterEach(() => {
  delete process.env.OTONOM_TEST_HARNESS_BUILD;
});

const codes = (env: NodeJS.ProcessEnv, n = 25) => Array.from({ length: n }, () => generateEmailOtp(env));

test('normal build: the fixed MFA e-mail code is refused even with all three test variables set', () => {
  assert.equal(testHarnessBuild(), false);
  for (const extra of [{}, { NODE_ENV: 'production' }, { NODE_ENV: 'test' }, { OTONOM_TEST_HARNESS_BUILD: '1' }]) {
    const generated = codes(testEnv({ ...THREE, ...extra }));
    assert.ok(generated.every((c) => /^\d{6}$/.test(c)), 'still a six-digit code');
    assert.ok(!generated.every((c) => c === FIXED), `random codes, not the fixed one (${JSON.stringify(extra)})`);
  }
});

test('normal build: the test e-mail transports are refused', async () => {
  const env = testEnv({ ...THREE, OTONOM_EMAIL_OTP_ALLOWED_RECIPIENT: 'otp-owner@otonom.local' });
  await assert.rejects(sendOwnerEmailOtp(otpMail as never, env), /EMAIL_TEST_PROVIDER_FORBIDDEN/);
  assert.equal(notificationsConfigured(env), false);
  assert.deepEqual(await sendMail({ to: 'team@otonom.local', subject: 's', text: 't', html: 'h', idempotencyKey: 'k' }, 'team@otonom.local', env), { sent: false, reason: 'NOT_CONFIGURED' });
});

test('normal build: the synthetic harness flags and the legacy-route harness stay off', () => {
  const env = testEnv(HARNESS);
  assert.equal(internalCommerceLabEnabled(env), false);
  assert.equal(commercialOperationsEnabled(env), false);
  assert.equal(publicRfqEnabled(env), false);
  assert.equal(legacyRouteHarness(env), false);
});

test('harness build: the same variables work, and Vercel still refuses them', async () => {
  process.env.OTONOM_TEST_HARNESS_BUILD = '1';
  assert.deepEqual([...new Set(codes(testEnv(THREE), 5))], [FIXED]);
  assert.ok(!codes(testEnv({ ...THREE, VERCEL: '1' })).every((c) => c === FIXED), 'never on Vercel');
  assert.equal(internalCommerceLabEnabled(testEnv(HARNESS)), true);
  assert.equal(commercialOperationsEnabled(testEnv(HARNESS)), true);
  assert.equal(internalCommerceLabEnabled(testEnv({ ...HARNESS, VERCEL: '1' })), false);
  const env = testEnv({ ...THREE, OTONOM_EMAIL_OTP_ALLOWED_RECIPIENT: 'otp-owner@otonom.local' });
  assert.deepEqual(await sendOwnerEmailOtp(otpMail as never, env), { providerMessageId: 'test-c1' });
});

test('next.config.mjs refuses a test-harness build on Vercel', () => {
  const run = (extra: Record<string, string>) =>
    spawnSync(process.execPath, ['--input-type=module', '-e', "await import('./next.config.mjs'); console.log('config loaded')"], { cwd: WEB, env: { ...process.env, ...extra }, encoding: 'utf8', timeout: 60_000 });
  const refused = run({ OTONOM_TEST_HARNESS_BUILD: '1', VERCEL: '1' });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /OTONOM_TEST_HARNESS_BUILD=1 is for the local \/ CI test harness only, never on Vercel/);
  const normal = run({ VERCEL: '1' });
  assert.equal(normal.status, 0, normal.stderr);
});
