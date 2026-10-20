import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contentSecurityPolicy, nonceFromPolicy } from '../src/lib/csp.ts';

test('CSP uses a script nonce without unsafe-inline scripts', () => {
  const nonce = 'AbCdEf0123_-';
  const policy = contentSecurityPolicy(nonce);
  const script = policy.match(/(?:^|;)\s*script-src\s+([^;]+)/)?.[1] ?? '';
  assert.match(script, new RegExp(`'nonce-${nonce}'`));
  assert.match(script, /'strict-dynamic'/);
  assert.doesNotMatch(script, /'unsafe-inline'/);
  assert.match(policy, /style-src 'self' 'unsafe-inline'/);
  assert.equal(nonceFromPolicy(policy), nonce);
});

test('CSP refuses a nonce that could inject a directive', () => {
  assert.throws(() => contentSecurityPolicy("valid'; script-src *"), /invalid CSP nonce/);
});

