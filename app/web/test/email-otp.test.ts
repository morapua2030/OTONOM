import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  emailOtpCodeDigest,
  emailOtpDigestMatches,
  emailOtpRequiredForUser,
  emailOtpSessionDigest,
  generateEmailOtp,
  ownerOtpEmail,
  sendOwnerEmailOtp,
} from '../src/lib/email-otp.ts';

const baseEnv = {
  OTONOM_EMAIL_OTP_PEPPER: 'synthetic-email-otp-pepper-for-tests-2026',
  OTONOM_EMAIL_OTP_ALLOWED_RECIPIENT: 'owner@example.test',
} as NodeJS.ProcessEnv;

test('email OTP is required only for the configured OWNER identity', () => {
  const env = { ...baseEnv, OTONOM_OWNER_EMAIL_OTP_REQUIRED: '1', OTONOM_OWNER_EMAIL_OTP_ACCOUNT: 'owner@example.test' } as NodeJS.ProcessEnv;
  assert.equal(emailOtpRequiredForUser({ email: 'OWNER@example.test', role: 'OWNER' }, env), true);
  assert.equal(emailOtpRequiredForUser({ email: 'owner@example.test', role: 'ADMIN' }, env), false);
  assert.equal(emailOtpRequiredForUser({ email: 'other@example.test', role: 'OWNER' }, env), false);
  assert.equal(emailOtpRequiredForUser({ email: 'owner@example.test', role: 'OWNER' }, { ...env, OTONOM_OWNER_EMAIL_OTP_REQUIRED: '0' }), false);
});

test('OTP generation, hashing and verification are six-digit, keyed and session-bound', () => {
  const code = generateEmailOtp(baseEnv);
  assert.match(code, /^\d{6}$/);
  const sessionDigest = emailOtpSessionDigest('session-a', baseEnv);
  const input = { challengeId: 'challenge-a', userId: 'user-a', sessionDigest, code };
  const digest = emailOtpCodeDigest(input, baseEnv);
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(emailOtpDigestMatches(digest, input, baseEnv), true);
  assert.equal(emailOtpDigestMatches(digest, { ...input, code: '000000' }, baseEnv), false);
  assert.equal(emailOtpDigestMatches(digest, { ...input, sessionDigest: emailOtpSessionDigest('session-b', baseEnv) }, baseEnv), false);
});

test('local test transport is explicit, supports failure tests and is forbidden on Vercel', async () => {
  const input = { to: 'owner@example.test', code: '483921', challengeId: 'challenge-test' };
  const enabled = { ...baseEnv, OTONOM_EMAIL_PROVIDER: 'test', OTONOM_EMAIL_TEST_MODE: '1' } as NodeJS.ProcessEnv;
  assert.deepEqual(await sendOwnerEmailOtp(input, enabled), { providerMessageId: 'test-challenge-test' });
  await assert.rejects(() => sendOwnerEmailOtp(input, { ...enabled, OTONOM_EMAIL_TEST_FAIL: '1' }), /EMAIL_PROVIDER_FAILED/);
  await assert.rejects(() => sendOwnerEmailOtp(input, { ...enabled, VERCEL: '1' }), /EMAIL_TEST_PROVIDER_FORBIDDEN/);
});

test('Resend transport keeps its key out of the payload and uses an idempotency key', async () => {
  let captured: { url: string; init: RequestInit } | undefined;
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    captured = { url: String(url), init: init ?? {} };
    return Response.json({ id: 'provider-message-123' });
  }) as typeof fetch;
  const env = {
    ...baseEnv,
    OTONOM_EMAIL_PROVIDER: 'resend',
    OTONOM_EMAIL_FROM: 'OTONOM <no-reply@accounts.example.test>',
    RESEND_API_KEY: 'synthetic-provider-key-for-unit-test',
  } as NodeJS.ProcessEnv;
  const result = await sendOwnerEmailOtp({ to: 'owner@example.test', code: '483921', challengeId: 'challenge-resend' }, env, fetcher);
  assert.equal(result.providerMessageId, 'provider-message-123');
  assert.equal(captured?.url, 'https://api.resend.com/emails');
  assert.equal((captured?.init.headers as Record<string, string>)['idempotency-key'], 'otonom-owner-otp-challenge-resend');
  assert.doesNotMatch(String(captured?.init.body), /synthetic-provider-key/);
  assert.match(String(captured?.init.body), /483921/);
});

test('Arabic and English messages are branded and do not embed links or analytics', () => {
  for (const locale of ['ar', 'en'] as const) {
    const message = ownerOtpEmail({ code: '483921', locale });
    assert.match(message.subject, /OTONOM|رمز/);
    assert.match(message.text, /483921/);
    assert.doesNotMatch(message.html, /https?:|<script|pixel|analytics/i);
  }
});
