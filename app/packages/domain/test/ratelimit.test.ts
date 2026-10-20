import assert from 'node:assert/strict';
import test from 'node:test';
import { consumeRateLimit, hostedRateLimitSalt } from '../src/ratelimit.ts';

test('hosted rate-limit salt prefers the dedicated secret', () => {
  const dedicated = 'd'.repeat(43);
  const derived = hostedRateLimitSalt({
    OTONOM_RATE_LIMIT_SALT: dedicated,
    PAYLOAD_SECRET: 'p'.repeat(43),
    VERCEL: '1',
  });
  assert.equal(derived?.toString(), dedicated);
});

test('hosted rate-limit salt derives deterministically from Payload secret', () => {
  const payloadSecret = 'p'.repeat(43);
  const first = hostedRateLimitSalt({ PAYLOAD_SECRET: payloadSecret, VERCEL: '1' });
  const second = hostedRateLimitSalt({ PAYLOAD_SECRET: payloadSecret, VERCEL: '1' });
  assert.equal(first?.length, 32);
  assert.deepEqual(first, second);
  assert.notEqual(first?.toString(), payloadSecret);
});

test('hosted rate-limit salt fails closed when no hosted secret exists', () => {
  assert.throws(
    () => hostedRateLimitSalt({ VERCEL: '1' }),
    /OTONOM_RATE_LIMIT_SALT or PAYLOAD_SECRET is required on Vercel/,
  );
});

test('local runtime keeps the existing file-backed fallback', () => {
  assert.equal(hostedRateLimitSalt({}), null);
});

test('weak hosted secrets are rejected', () => {
  assert.throws(
    () => hostedRateLimitSalt({ OTONOM_RATE_LIMIT_SALT: 'short', VERCEL: '1' }),
    /at least 32 characters/,
  );
  assert.throws(
    () => hostedRateLimitSalt({ PAYLOAD_SECRET: 'short', VERCEL: '1' }),
    /at least 32 characters/,
  );
});

test('Vercel rate limiting runs without a local secret file', async () => {
  const previous = {
    VERCEL: process.env.VERCEL,
    PAYLOAD_SECRET: process.env.PAYLOAD_SECRET,
    OTONOM_RATE_LIMIT_SALT: process.env.OTONOM_RATE_LIMIT_SALT,
  };
  process.env.VERCEL = '1';
  process.env.PAYLOAD_SECRET = 'p'.repeat(43);
  delete process.env.OTONOM_RATE_LIMIT_SALT;

  let capturedBucket = '';
  const fakePool = {
    async query(_sql: string, params: unknown[]) {
      capturedBucket = String(params[0]);
      return { rows: [{ hits: 1, remaining: 600 }] };
    },
  };

  try {
    const result = await consumeRateLimit(fakePool as never, 'mfa:synthetic-editor', 10, 600_000);
    assert.deepEqual(result, { allowed: true, retryAfterSec: 0 });
    assert.match(capturedBucket, /^[A-Za-z0-9_-]{43}$/);
  } finally {
    if (previous.VERCEL === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previous.VERCEL;
    if (previous.PAYLOAD_SECRET === undefined) delete process.env.PAYLOAD_SECRET;
    else process.env.PAYLOAD_SECRET = previous.PAYLOAD_SECRET;
    if (previous.OTONOM_RATE_LIMIT_SALT === undefined) delete process.env.OTONOM_RATE_LIMIT_SALT;
    else process.env.OTONOM_RATE_LIMIT_SALT = previous.OTONOM_RATE_LIMIT_SALT;
  }
});
