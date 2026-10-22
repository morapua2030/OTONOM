import assert from 'node:assert/strict';
import test from 'node:test';
import { accountSecurityProjection, maskEmail } from '../src/lib/security-display.ts';

test('staff e-mail masking preserves recognition without exposing the address', () => {
  const value = maskEmail('owner.synthetic@example.com');
  assert.match(value, /^o•+@e•+\.com$/);
  assert.doesNotMatch(value, /owner|synthetic|example/);
});

test('account security projection allow-lists display fields and drops every auth secret', () => {
  const projected = accountSecurityProjection({
    id: 47,
    email: 'editor.synthetic@example.com',
    role: 'EDITOR',
    mfaEnabled: true,
    totpSecret: 'must-not-escape',
    recoveryCodes: ['must-not-escape'],
    sessions: [{ token: 'must-not-escape' }],
  });
  assert.deepEqual(Object.keys(projected).sort(), ['email', 'id', 'mfaEnabled', 'role']);
  assert.deepEqual(projected, { id: '47', email: 'e••••@e••••.com', role: 'EDITOR', mfaEnabled: true });
  assert.doesNotMatch(JSON.stringify(projected), /must-not-escape/);
});
