// Behaviour tests for the access-control layer (audit 2026-11-18, C2-01 / AI1-01): MFA enforcement for every staff
// role, the Payload access functions (perm, anyPerm, staffOnly, nobody) and the custom-endpoint guard.
// The staff roles are listed BY HAND: if a role is dropped from STAFF_ROLES, its unverified sessions would pass MFA,
// and these tests fail.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PayloadRequest } from 'payload';
import { can, type Permission } from '@otonom/domain';
import { anyPerm, body, guard, jsonRes, mfaOk, mfaSessionVerified, mutationOriginGuard, nobody, perm, staffOnly } from '../src/lib/access.ts';

const STAFF = ['OWNER', 'ADMIN', 'ENGINEER', 'STORE', 'EDITOR', 'SALES'];
const HOST = 'otonom-admin.vercel.app';

type TestUser = { id: string; role: string; _sid?: string; mfaVerifiedSids?: unknown } | null;
const verified = (role: string): TestUser => ({ id: `u-${role}`, role, _sid: 'sid-1', mfaVerifiedSids: ['sid-0', 'sid-1'] });
const unverified = (role: string): TestUser => ({ id: `u-${role}`, role, _sid: 'sid-2', mfaVerifiedSids: ['sid-1'] });
const request = (user: TestUser, method = 'POST', origin: string | undefined = `https://${HOST}`) =>
  ({ user, method, headers: new Headers({ host: HOST, ...(origin === undefined ? {} : { origin }) }) }) as unknown as PayloadRequest;
const access = (fn: (args: { req: PayloadRequest }) => unknown, user: TestUser) => fn({ req: request(user) } as { req: PayloadRequest });

async function code(res: Response | null) {
  assert.ok(res, 'expected a refusal');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  return { status: res.status, ...(await res.json()) };
}

test('MFA: every staff role needs an MFA check bound to the current session', () => {
  for (const role of STAFF) {
    assert.equal(mfaSessionVerified(verified(role)), true, `${role} verified`);
    assert.equal(mfaOk(verified(role)), true, `${role} verified`);
    assert.equal(mfaSessionVerified(unverified(role)), false, `${role}: another session's MFA does not count`);
    assert.equal(mfaOk(unverified(role)), false, `${role}: unverified staff session is refused`);
    assert.equal(mfaOk({ id: 'x', role }), false, `${role}: no session id`);
    assert.equal(mfaOk({ id: 'x', role, _sid: 'sid-1', mfaVerifiedSids: 'sid-1' }), false, `${role}: a malformed list is not a verification`);
    assert.equal(mfaOk({ id: 'x', role, _sid: '', mfaVerifiedSids: [''] }), false, `${role}: an empty session id is not a verification`);
  }
});

test('MFA: customers do not need staff MFA; a missing user is never allowed', () => {
  assert.equal(mfaSessionVerified({ id: 'c', role: 'CUSTOMER' }), true);
  assert.equal(mfaOk({ id: 'c', role: 'CUSTOMER' }), true);
  assert.equal(mfaSessionVerified(null), false);
  assert.equal(mfaOk(null), false);
  assert.equal(mfaOk(undefined), false);
});

test('perm(): the permission matrix AND a verified session, for every role and permission', () => {
  const permissions: Permission[] = ['leads.read', 'leads.export', 'crm.read', 'kpi.read', 'metrics.read', 'content.publish', 'staff.invite', 'stock.adjust'];
  for (const role of [...STAFF, 'CUSTOMER']) {
    for (const p of permissions) {
      assert.equal(access(perm(p), verified(role)), can(role, p), `${role} ${p} verified`);
      assert.equal(access(perm(p), unverified(role)), STAFF.includes(role) ? false : can(role, p), `${role} ${p} unverified`);
    }
  }
  assert.equal(access(perm('leads.read'), null), false);
});

test('anyPerm(): allowed when any one listed permission is granted', () => {
  const fn = anyPerm('leads.export', 'crm.read');
  assert.equal(access(fn, verified('OWNER')), true);
  assert.equal(access(fn, verified('ENGINEER')), true, 'crm.read only');
  assert.equal(access(fn, verified('SALES')), false, 'neither');
  assert.equal(access(fn, unverified('OWNER')), false, 'MFA still applies');
  assert.equal(access(fn, null), false);
  assert.equal(access(anyPerm('leads.read'), verified('SALES')), true);
});

test('staffOnly and nobody', () => {
  for (const role of STAFF) {
    assert.equal(access(staffOnly, verified(role)), true, role);
    assert.equal(access(staffOnly, unverified(role)), false, `${role} unverified`);
  }
  assert.equal(access(staffOnly, verified('CUSTOMER')), false);
  assert.equal(access(staffOnly, null), false);
  for (const role of STAFF) assert.equal(access(nobody, verified(role)), false, role);
});

test('guard(): 401 without a user, 401 until MFA, 403 without the permission, then the origin check', async () => {
  assert.deepEqual(await code(guard(request(null), 'leads.read')), { status: 401, code: 'UNAUTHENTICATED' });
  assert.deepEqual(await code(guard(request(unverified('OWNER')), 'leads.read')), { status: 401, code: 'MFA_REQUIRED' });
  assert.deepEqual(await code(guard(request(verified('SALES')), 'leads.export')), { status: 403, code: 'FORBIDDEN' });
  assert.deepEqual(await code(guard(request(verified('EDITOR')), 'leads.read')), { status: 403, code: 'FORBIDDEN' });
  assert.equal(guard(request(verified('SALES')), 'leads.read'), null);
  assert.equal(guard(request(verified('OWNER')), 'leads.export'), null);
  assert.deepEqual(await code(guard(request(verified('OWNER'), 'POST', 'https://evil.example'), 'leads.export')), { status: 403, code: 'CSRF_ORIGIN_MISMATCH' });
});

test('mutationOriginGuard(): same-host HTTPS passes; foreign, lookalike and invalid origins are refused', async () => {
  assert.equal(mutationOriginGuard(request(null, 'POST', `https://${HOST}`)), null);
  assert.equal(mutationOriginGuard(request(null, 'POST', undefined)), null, 'non-browser clients that send no Origin');
  assert.equal(mutationOriginGuard(request(null, 'GET', 'https://evil.example')), null, 'GET is not a state change');
  for (const origin of ['https://evil.example', `https://${HOST}.evil.example`, 'https://anything.vercel.app', 'null', 'not a url']) {
    assert.deepEqual(await code(mutationOriginGuard(request(null, 'POST', origin))), { status: 403, code: 'CSRF_ORIGIN_MISMATCH' }, origin);
  }
});

test('jsonRes() and body()', async () => {
  const r = jsonRes(418, { code: 'X' });
  assert.equal(r.status, 418);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await r.json(), { code: 'X' });
  assert.deepEqual(await body({ json: async () => ({ a: 1 }) } as unknown as PayloadRequest), { a: 1 });
  assert.deepEqual(await body({ json: async () => null } as unknown as PayloadRequest), {});
  assert.deepEqual(await body({ json: async () => { throw new SyntaxError('bad json'); } } as unknown as PayloadRequest), {});
  assert.deepEqual(await body({} as unknown as PayloadRequest), {});
});
