// 2026-11-15 incident: every admin save deadlocked on Vercel. Payload keeps one CMS pool connection for itself and read
// the document lock outside the save's transaction; with OTONOM_PG_POOL_MAX=2 nothing was left for that read.
// The end-to-end proof is tests/src/pool-production.ts (server with the Production pool setting).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { cmsPoolMax, CMS_MIN_USABLE_CONNECTIONS, PAYLOAD_KEPT_CONNECTIONS, POOL_CONNECT_TIMEOUT_MS } from '@otonom/domain';
import { testEnv } from './test-env.ts';

const src = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('the CMS pool always leaves room for Payload\'s kept connection plus concurrent saves', () => {
  assert.equal(PAYLOAD_KEPT_CONNECTIONS, 1);
  assert.equal(CMS_MIN_USABLE_CONNECTIONS, 4);
  assert.equal(cmsPoolMax(testEnv({ VERCEL: '1', OTONOM_PG_POOL_MAX: '2' })), 5, 'the Production setting');
  assert.equal(cmsPoolMax(testEnv({ VERCEL: '1' })), 5, 'Vercel default');
  assert.equal(cmsPoolMax(testEnv({ OTONOM_PG_POOL_MAX: '1' })), 5, 'never below the minimum');
  assert.equal(cmsPoolMax(testEnv({ OTONOM_PG_POOL_MAX: '8' })), 9);
  assert.equal(cmsPoolMax(testEnv({})), 11, 'local default');
  for (const bad of ['0', '21', 'x', '2.5']) assert.throws(() => cmsPoolMax(testEnv({ OTONOM_PG_POOL_MAX: bad })), /OTONOM_PG_POOL_MAX/, bad);
});

test('waiting for a pool connection fails fast instead of hanging', () => {
  assert.equal(POOL_CONNECT_TIMEOUT_MS, 10_000);
  const db = src('../../packages/domain/src/db.ts');
  assert.match(db, /connectionTimeoutMillis: POOL_CONNECT_TIMEOUT_MS/);
  const config = src('../src/payload.config.ts');
  assert.match(config, /pool: \{ connectionString: cmsConnString\(\), max: cmsPoolMax\(\), connectionTimeoutMillis: POOL_CONNECT_TIMEOUT_MS \}/);
});

test('document locking is off for every collection and global (its lock read ran outside the transaction)', () => {
  const config = src('../src/payload.config.ts');
  assert.match(config, /collections: collections\.map\(\(collection\) => \(\{ \.\.\.collection, lockDocuments: false as const \}\)\)/);
  assert.match(config, /globals: \[Settings, \.\.\.siteContentGlobals\]\.map\(\(global\) => \(\{ \.\.\.global, lockDocuments: false as const \}\)\)/);
  // the generated types no longer contain the locked-documents collection
  assert.doesNotMatch(src('../src/payload-types.ts'), /'payload-locked-documents': PayloadLockedDocument;/);
});

test('/admin/login hides Payload\'s "Forgot password?" link while reset e-mail is off (owner 2026-11-15)', () => {
  const notice = src('../src/components/StaffLoginNotice.tsx');
  assert.match(notice, /passwordResetEmailEnabled\(\) \? null : <style data-testid="hide-forgot-link">\{'a\[href\$="\/admin\/forgot"\]\{display:none!important\}'\}<\/style>/);
  const config = src('../src/payload.config.ts');
  assert.match(config, /beforeLogin: \['\/components\/StaffLoginNotice#StaffLoginNotice'\]/);
});
