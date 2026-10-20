// Setup / migrations must refuse non-local hosts and unexpected database names (instruction pack §3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertConfiguredMigrationTarget, assertSafeTarget, roleSecretFileName } from '../src/migrate.ts';

test('setup/migration target guard', () => {
  for (const db of ['otonom_dev', 'otonom_test_kpi', 'otonom_e2e_run1', 'otonom_restore_drill']) assert.doesNotThrow(() => assertSafeTarget(db, '127.0.0.1'));
  for (const db of ['postgres', 'spike_opt_a', 'otonom_prod', 'otonom', 'customers']) assert.throws(() => assertSafeTarget(db, '127.0.0.1'), /unexpected database/);
  assert.throws(() => assertSafeTarget('otonom_dev', 'db.example.com'), /non-local host/);
});

test('remote migrations require an exact synthetic Preview gate', () => {
  const allowed = {
    authorization: 'SYNTHETIC_PREVIEW_ONLY',
    expectedHost: 'ep-staging.example.neon.tech',
    expectedDatabase: 'otonom_preview',
    forcePreview: '1',
  };

  assert.doesNotThrow(() => assertSafeTarget('otonom_preview', 'ep-staging.example.neon.tech', allowed));
  assert.throws(() => assertSafeTarget('otonom_preview', 'other.example.neon.tech', allowed), /expected host/);
  assert.throws(() => assertSafeTarget('other_preview', 'ep-staging.example.neon.tech', allowed), /expected database/);
  assert.throws(() => assertSafeTarget('otonom_preview', 'ep-staging.example.neon.tech', { ...allowed, forcePreview: '0' }), /FORCE_PREVIEW/);
  assert.throws(() => assertSafeTarget('otonom_production', 'ep-staging.example.neon.tech', { ...allowed, expectedDatabase: 'otonom_production' }), /production-like/);
  const target = { host: 'ep-staging.example.neon.tech', database: 'otonom_preview', configuredUrl: true };
  assert.doesNotThrow(() => assertConfiguredMigrationTarget(target, 'otonom_preview', allowed));
  assert.throws(() => assertConfiguredMigrationTarget(target, 'otonom_dev', allowed), /OTONOM_DB does not match/);
  assert.equal(roleSecretFileName('domain', false), 'pg_domain_pw.txt');
  assert.equal(roleSecretFileName('domain', true), 'pg_preview_domain_pw.txt');
  assert.equal(roleSecretFileName('cms', true), 'pg_preview_cms_pw.txt');
});
