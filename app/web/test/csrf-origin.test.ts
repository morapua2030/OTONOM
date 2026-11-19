import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PayloadRequest } from 'payload';
import { mutationOriginGuard } from '../src/lib/access.ts';

const ADMIN = 'otonom-admin.vercel.app';
const PUBLIC = 'otonom-smart-home-web.vercel.app';

const request = (method: string, host: string, origin?: string) =>
  ({ method, headers: new Headers({ host, ...(origin === undefined ? {} : { origin }) }) }) as unknown as PayloadRequest;

async function refused(res: Response | null) {
  assert.ok(res, 'expected the guard to refuse the request');
  assert.equal(res.status, 403);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await res.json(), { code: 'CSRF_ORIGIN_MISMATCH' });
}

test('the HTTPS origin of the request host passes', () => {
  assert.equal(mutationOriginGuard(request('POST', ADMIN, `https://${ADMIN}`)), null);
  assert.equal(mutationOriginGuard(request('POST', PUBLIC, `https://${PUBLIC}`)), null);
  assert.equal(mutationOriginGuard(request('PATCH', ADMIN, `https://${ADMIN}`)), null);
});

test('an http origin with the same host is refused (downgraded scheme is not the same origin)', async () => {
  await refused(mutationOriginGuard(request('POST', ADMIN, `http://${ADMIN}`)));
  await refused(mutationOriginGuard(request('DELETE', ADMIN, `http://${ADMIN}`)));
  await refused(mutationOriginGuard(request('POST', PUBLIC, `http://${PUBLIC}`)));
});

test('foreign, lookalike, wildcard and non-web origins are refused', async () => {
  for (const origin of [
    'https://evil.example',
    `https://${ADMIN}.evil.example`,
    'https://anything.vercel.app',
    `https://${ADMIN}:8443`,
    `ftp://${ADMIN}`,
    `ws://${ADMIN}`,
    'null',
    'not a url',
  ]) {
    await refused(mutationOriginGuard(request('POST', ADMIN, origin)));
  }
});

test('plain http is accepted only for a loopback host that matches the request host', async () => {
  assert.equal(mutationOriginGuard(request('POST', '127.0.0.1:3301', 'http://127.0.0.1:3301')), null);
  assert.equal(mutationOriginGuard(request('POST', 'localhost:3000', 'http://localhost:3000')), null);
  assert.equal(mutationOriginGuard(request('POST', '[::1]:3301', 'http://[::1]:3301')), null);
  await refused(mutationOriginGuard(request('POST', '192.168.1.20:3000', 'http://192.168.1.20:3000')));
  await refused(mutationOriginGuard(request('POST', ADMIN, 'http://127.0.0.1:3301')));
  await refused(mutationOriginGuard(request('POST', '127.0.0.1:3301', 'http://localhost:3301')));
});

test('unchanged: requests without Origin and GET requests are not judged by this guard', () => {
  assert.equal(mutationOriginGuard(request('POST', ADMIN)), null);
  assert.equal(mutationOriginGuard(request('GET', ADMIN, `http://${ADMIN}`)), null);
  assert.equal(mutationOriginGuard(request('GET', ADMIN, 'https://evil.example')), null);
});
