// Behaviour tests for the access-control policy (audit 2026-11-18, C2-01 / AI1-01). No database.
// The role list and the permission matrix are written out here BY HAND on purpose: a change to who may do what must
// be made twice (source and this table), so a stray edit, a removed staff role or a widened permission fails CI.
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import {
  can,
  classifyUpload,
  CONTENT_TRANSITIONS,
  hashPassword,
  isStaff,
  MAX_UPLOAD_BYTES,
  PERMISSIONS,
  publishGate,
  signFileToken,
  STAFF_ROLES,
  uploadBaseName,
  verifyFileToken,
  verifyPassword,
  type Permission,
} from '../src/policy.ts';

const EXPECTED_STAFF_ROLES = ['OWNER', 'ADMIN', 'ENGINEER', 'STORE', 'EDITOR', 'SALES'];

/** Who may do what, per role (doc 14 §2 plus the owner decisions of 2026-11-04 and 2026-11-15). */
const EXPECTED: Record<string, readonly string[]> = {
  OWNER: [
    'order.confirm', 'order.fulfil', 'order.cancel', 'quote.issue', 'payment.record', 'payment.verify', 'stock.adjust', 'contract.sign',
    'contract.amend', 'attribution.override', 'warranty_policy.approve', 'coverage.activate', 'content.edit', 'content.review',
    'content.publish', 'consent.revoke', 'file.read_any', 'file.scan_result', 'user.role_change', 'settings.stage', 'crm.read',
    'crm.write', 'proposal.approve', 'contract.adjust', 'kpi.read', 'claims.review', 'claims.approve', 'price.propose', 'price.approve',
    'serial.register', 'warranty_claim.decide', 'system.reconcile', 'commissioning.record', 'ownership.verify', 'service.manage',
    'rma.decide', 'product.draft', 'product.approve', 'leads.read', 'leads.write', 'leads.export', 'metrics.read', 'intake.settings',
    'privacy.approve', 'staff.invite', 'staff.mfa_reset',
  ],
  ADMIN: [
    'order.confirm', 'order.fulfil', 'order.cancel', 'payment.record', 'payment.verify', 'stock.adjust', 'coverage.activate', 'content.edit',
    'content.review', 'content.publish', 'consent.revoke', 'file.read_any', 'file.scan_result', 'crm.read', 'crm.write', 'kpi.read',
    'claims.review', 'price.propose', 'serial.register', 'warranty_claim.decide', 'system.reconcile', 'commissioning.record',
    'ownership.verify', 'service.manage', 'rma.decide', 'product.draft', 'product.approve', 'leads.read', 'leads.write', 'metrics.read',
  ],
  ENGINEER: [
    'coverage.activate', 'content.review', 'file.read_any', 'crm.read', 'crm.write', 'claims.review', 'warranty_claim.decide',
    'commissioning.record', 'ownership.verify', 'service.manage', 'rma.decide',
  ],
  STORE: ['order.confirm', 'order.fulfil', 'order.cancel', 'payment.record', 'payment.verify', 'price.propose', 'serial.register'],
  EDITOR: ['content.edit', 'product.draft'],
  SALES: ['leads.read', 'leads.write', 'metrics.read'],
  CUSTOMER: [],
};

const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

test('the staff roles are exactly the six expected roles, and each one is staff', () => {
  assert.deepEqual([...STAFF_ROLES], EXPECTED_STAFF_ROLES);
  for (const role of EXPECTED_STAFF_ROLES) assert.equal(isStaff(role), true, `${role} must be staff (so MFA applies to it)`);
});

test('non-staff values are never staff', () => {
  for (const role of ['CUSTOMER', '', 'owner', 'Owner', 'OWNER ', 'ROOT', 'SUPERUSER', null, undefined]) assert.equal(isStaff(role as string | null | undefined), false, String(role));
});

test('the permission list has not changed without this table being updated', () => {
  const expectedPermissions = [...new Set(Object.values(EXPECTED).flat())].sort();
  assert.deepEqual([...ALL_PERMISSIONS].sort(), expectedPermissions);
  assert.equal(ALL_PERMISSIONS.length, 46);
});

test('every role has exactly its expected permissions, and nothing else', () => {
  for (const [role, allowed] of Object.entries(EXPECTED)) {
    for (const permission of ALL_PERMISSIONS) {
      assert.equal(can(role, permission), allowed.includes(permission), `${role} ${allowed.includes(permission) ? 'must' : 'must not'} have ${permission}`);
    }
  }
});

test('SALES reads leads and metrics only: no CRM, KPI, file or export access', () => {
  for (const p of ['crm.read', 'crm.write', 'kpi.read', 'file.read_any', 'leads.export', 'claims.review', 'content.edit'] as Permission[]) assert.equal(can('SALES', p), false, p);
  for (const p of ['leads.read', 'leads.write', 'metrics.read'] as Permission[]) assert.equal(can('SALES', p), true, p);
});

test('owner-only powers stay owner-only', () => {
  const ownerOnly = ALL_PERMISSIONS.filter((p) => EXPECTED_STAFF_ROLES.every((r) => (r === 'OWNER') === EXPECTED[r].includes(p)));
  assert.deepEqual(ownerOnly.sort(), ['attribution.override', 'claims.approve', 'contract.adjust', 'contract.amend', 'contract.sign', 'intake.settings', 'leads.export', 'price.approve', 'privacy.approve', 'proposal.approve', 'quote.issue', 'settings.stage', 'staff.invite', 'staff.mfa_reset', 'user.role_change', 'warranty_policy.approve']);
  for (const p of ownerOnly) for (const r of EXPECTED_STAFF_ROLES.filter((x) => x !== 'OWNER')) assert.equal(can(r, p), false, `${r} ${p}`);
});

test('can() refuses a missing, empty, unknown or wrongly cased role', () => {
  for (const role of [null, undefined, '', 'owner', 'ROOT', 'CUSTOMER']) for (const p of ALL_PERMISSIONS) assert.equal(can(role, p), false, `${String(role)} ${p}`);
});

test('passwords: a scrypt hash verifies only the same password and is salted', () => {
  const h1 = hashPassword('correct horse battery staple');
  const h2 = hashPassword('correct horse battery staple');
  assert.match(h1, /^scrypt\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/);
  assert.notEqual(h1, h2, 'a new random salt per hash');
  assert.equal(verifyPassword('correct horse battery staple', h1), true);
  assert.equal(verifyPassword('correct horse battery staple', h2), true);
  assert.equal(verifyPassword('correct horse battery stapl', h1), false);
  assert.equal(verifyPassword('', h1), false);
  for (const bad of ['', 'scrypt', 'scrypt$$', `bcrypt$${h1.split('$')[1]}$${h1.split('$')[2]}`, `scrypt$${h1.split('$')[1]}$`, `scrypt$$${h1.split('$')[2]}`, `scrypt$${h1.split('$')[1]}$${h1.split('$')[2].slice(0, 20)}`]) {
    assert.equal(verifyPassword('correct horse battery staple', bad), false, bad);
  }
});

test('file tokens: signed, expiring, and refused when tampered with', () => {
  const secret = 's'.repeat(32);
  const now = 1_800_000_000_000;
  const token = signFileToken({ fid: 'f1', uid: 'u1', exp: now + 60_000 }, secret);
  assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(verifyFileToken(token, secret, now), { fid: 'f1', uid: 'u1', exp: now + 60_000 });
  assert.deepEqual(verifyFileToken(token, secret, now + 60_000), { fid: 'f1', uid: 'u1', exp: now + 60_000 }, 'valid up to and including exp');
  assert.equal(verifyFileToken(token, secret, now + 60_001), null, 'expired');
  assert.equal(verifyFileToken(token, 't'.repeat(32), now), null, 'other secret');
  const [body, mac] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ fid: 'f2', uid: 'u1', exp: now + 60_000 })).toString('base64url');
  assert.equal(verifyFileToken(`${forged}.${mac}`, secret, now), null, 'body changed');
  assert.equal(verifyFileToken(`${body}.${mac.slice(0, -2)}`, secret, now), null, 'short mac');
  for (const bad of ['', body, `${body}.`, `.${mac}`]) assert.equal(verifyFileToken(bad, secret, now), null, bad);
  const noExp = signFileToken({ fid: 'f1', uid: 'u1' } as unknown as { fid: string; uid: string; exp: number }, secret);
  assert.equal(verifyFileToken(noExp, secret, now), null, 'a token without exp is refused');
  const notJson = `${Buffer.from('not json').toString('base64url')}`;
  assert.equal(verifyFileToken(`${notJson}.${createHmac('sha256', secret).update(notJson).digest('base64url')}`, secret, now), null, 'a signed non-JSON body is refused');
});

test('upload names: path parts are stripped and unsafe characters replaced', () => {
  assert.equal(uploadBaseName('../../etc/passwd'), 'passwd');
  assert.equal(uploadBaseName('C:\\Users\\x\\plan.pdf'), 'plan.pdf');
  assert.equal(uploadBaseName('a/b\\c.png'), 'c.png');
  assert.equal(uploadBaseName('my plan (v2)!.pdf'), 'my plan _v2_.pdf', 'a run of unsafe characters becomes one _');
  assert.equal(uploadBaseName('x'.repeat(200) + '.pdf').length, 120);
  assert.equal(uploadBaseName('dir/'), '');
});

test('upload checks: allow-list, one extension, size and magic bytes', () => {
  const pdf = Buffer.from('%PDF-1.7\n');
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const dxf = Buffer.from('  0\r\nSECTION\n');
  assert.deepEqual(classifyUpload('plan.pdf', pdf), { ok: true, ext: 'pdf', mime: 'application/pdf' });
  assert.deepEqual(classifyUpload('photo.PNG', png), { ok: true, ext: 'png', mime: 'image/png' });
  assert.deepEqual(classifyUpload('photo.jpeg', jpg), { ok: true, ext: 'jpg', mime: 'image/jpeg' });
  assert.deepEqual(classifyUpload('photo.jpg', jpg), { ok: true, ext: 'jpg', mime: 'image/jpeg' });
  assert.deepEqual(classifyUpload('site.dxf', dxf), { ok: true, ext: 'dxf', mime: 'image/vnd.dxf' });
  assert.deepEqual(classifyUpload('', pdf), { ok: false, reason: 'INVALID_NAME' });
  assert.deepEqual(classifyUpload('.pdf', pdf), { ok: false, reason: 'INVALID_NAME' });
  assert.deepEqual(classifyUpload('plan.pdf.exe', pdf), { ok: false, reason: 'DOUBLE_EXTENSION' });
  assert.deepEqual(classifyUpload('plan.exe', pdf), { ok: false, reason: 'TYPE_NOT_ALLOWED' });
  assert.deepEqual(classifyUpload('plan', pdf), { ok: false, reason: 'TYPE_NOT_ALLOWED' });
  assert.deepEqual(classifyUpload('plan.pdf', Buffer.alloc(0)), { ok: false, reason: 'EMPTY' });
  assert.deepEqual(classifyUpload('plan.pdf', Buffer.concat([pdf, Buffer.alloc(MAX_UPLOAD_BYTES)])), { ok: false, reason: 'TOO_LARGE' });
  assert.deepEqual(classifyUpload('plan.pdf', Buffer.concat([pdf, Buffer.alloc(MAX_UPLOAD_BYTES - pdf.length)])).ok, true, 'exactly the limit is allowed');
  assert.deepEqual(classifyUpload('plan.pdf', png), { ok: false, reason: 'MAGIC_MISMATCH' });
  assert.deepEqual(classifyUpload('photo.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0b])), { ok: false, reason: 'MAGIC_MISMATCH' });
  assert.deepEqual(classifyUpload('photo.jpg', Buffer.from([0xff, 0xd8, 0xfe])), { ok: false, reason: 'MAGIC_MISMATCH' });
  assert.deepEqual(classifyUpload('photo.jpg', Buffer.from([0xff, 0xd9, 0xff])), { ok: false, reason: 'MAGIC_MISMATCH' });
  assert.deepEqual(classifyUpload('photo.jpg', Buffer.from([0xfe, 0xd8, 0xff])), { ok: false, reason: 'MAGIC_MISMATCH' });
  assert.deepEqual(classifyUpload('site.dxf', Buffer.from('HEADER\n')), { ok: false, reason: 'MAGIC_MISMATCH' });
  assert.equal(MAX_UPLOAD_BYTES, 25 * 1024 * 1024);
});

test('publish gate: every blocker is reported, and a complete approved item has none', () => {
  const ok = { status: 'APPROVED', reviewedBy: 'u1', titleAr: 'ع', titleEn: 'T', bodyAr: 'ن', bodyEn: 'B', requiresConsent: true, consentStatus: 'VALID', claimStatus: 'NONE' };
  assert.deepEqual(publishGate(ok), []);
  assert.deepEqual(publishGate({ ...ok, claimStatus: null }), [], 'no claim counts as NONE');
  for (const c of ['INDEPENDENTLY_DEMONSTRATED', 'CERTIFIED']) assert.deepEqual(publishGate({ ...ok, claimStatus: c }), []);
  assert.deepEqual(publishGate({ ...ok, requiresConsent: false, consentStatus: 'MISSING' }), []);
  assert.deepEqual(publishGate({ ...ok, status: 'IN_REVIEW' }), ['NOT_APPROVED']);
  assert.deepEqual(publishGate({ ...ok, reviewedBy: null }), ['NO_REVIEW_RECORD']);
  assert.deepEqual(publishGate({ ...ok, titleAr: '  ' }), ['ARABIC_INCOMPLETE']);
  assert.deepEqual(publishGate({ ...ok, bodyAr: null }), ['ARABIC_INCOMPLETE']);
  assert.deepEqual(publishGate({ ...ok, titleEn: '' }), ['ENGLISH_INCOMPLETE']);
  assert.deepEqual(publishGate({ ...ok, bodyEn: ' ' }), ['ENGLISH_INCOMPLETE']);
  assert.deepEqual(publishGate({ ...ok, consentStatus: 'REVOKED' }), ['CONSENT_NOT_VALID']);
  assert.deepEqual(publishGate({ ...ok, consentStatus: null }), ['CONSENT_NOT_VALID']);
  for (const c of ['OWNER_REPORTED', 'REVIEW_PENDING', 'PROHIBITED']) assert.deepEqual(publishGate({ ...ok, claimStatus: c }), ['CLAIM_NOT_PUBLISHABLE'], c);
  assert.deepEqual(
    publishGate({ status: 'DRAFT', reviewedBy: null, requiresConsent: true, consentStatus: 'MISSING', claimStatus: 'PROHIBITED' }),
    ['NOT_APPROVED', 'NO_REVIEW_RECORD', 'ARABIC_INCOMPLETE', 'ENGLISH_INCOMPLETE', 'CONSENT_NOT_VALID', 'CLAIM_NOT_PUBLISHABLE'],
  );
});

test('content workflow: the allowed transitions and the permission each one needs', () => {
  assert.equal(can('EDITOR', CONTENT_TRANSITIONS.APPROVED[0].perm), false, 'an EDITOR cannot publish');
  assert.equal(can('ENGINEER', CONTENT_TRANSITIONS.IN_REVIEW[0].perm), true, 'an ENGINEER can approve a review');
  assert.deepEqual(CONTENT_TRANSITIONS, {
    DRAFT: [{ to: 'IN_REVIEW', perm: 'content.edit' }],
    IN_REVIEW: [{ to: 'APPROVED', perm: 'content.review' }, { to: 'DRAFT', perm: 'content.review' }],
    APPROVED: [{ to: 'PUBLISHED', perm: 'content.publish' }, { to: 'DRAFT', perm: 'content.edit' }],
    PUBLISHED: [{ to: 'WITHDRAWN', perm: 'content.publish' }],
    WITHDRAWN: [{ to: 'DRAFT', perm: 'content.edit' }],
  });
});
