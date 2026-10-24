// Setup / migrations must refuse non-local hosts and unexpected database names (instruction pack §3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertConfiguredMigrationTarget, assertSafeTarget, roleSecretFileName } from '../src/migrate.ts';

test('setup/migration target guard', () => {
  for (const db of ['otonom_dev', 'otonom_test_kpi', 'otonom_e2e_run1', 'otonom_restore_drill']) assert.equal(assertSafeTarget(db, '127.0.0.1'), 'local');
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

  assert.equal(assertSafeTarget('otonom_preview', 'ep-staging.example.neon.tech', allowed), 'preview');
  assert.throws(() => assertSafeTarget('otonom_preview', 'other.example.neon.tech', allowed), /expected host/);
  assert.throws(() => assertSafeTarget('other_preview', 'ep-staging.example.neon.tech', allowed), /expected database/);
  assert.throws(() => assertSafeTarget('otonom_preview', 'ep-staging.example.neon.tech', { ...allowed, forcePreview: '0' }), /Preview migrations require/);
  assert.throws(() => assertSafeTarget('otonom_production', 'ep-staging.example.neon.tech', { ...allowed, expectedDatabase: 'otonom_production' }), /production-like/);
  const target = { host: 'ep-staging.example.neon.tech', database: 'otonom_preview', configuredUrl: true };
  assert.doesNotThrow(() => assertConfiguredMigrationTarget(target, 'otonom_preview', allowed));
  assert.throws(() => assertConfiguredMigrationTarget(target, 'otonom_dev', allowed), /OTONOM_DB does not match/);
  assert.equal(roleSecretFileName('domain', 'local'), 'pg_domain_pw.txt');
  assert.equal(roleSecretFileName('domain', 'preview'), 'pg_preview_domain_pw.txt');
  assert.equal(roleSecretFileName('cms', 'preview'), 'pg_preview_cms_pw.txt');
});

test('remote Production migrations require exact mutually exclusive Neon gates', () => {
  const allowed = {
    authorization: 'ISOLATED_PRODUCTION_ONLY',
    expectedHost: 'ep-production.us-east-1.aws.neon.tech',
    expectedDatabase: 'neondb',
    forceProduction: '1',
    neonProjectId: 'synthetic-production-project',
    expectedNeonProjectId: 'synthetic-production-project',
  };

  assert.equal(assertSafeTarget('neondb', 'ep-production.us-east-1.aws.neon.tech', allowed), 'production');
  assert.throws(() => assertSafeTarget('neondb', 'ep-production.us-east-1.aws.neon.tech', { ...allowed, forceProduction: '0' }), /Production migrations require/);
  assert.throws(() => assertSafeTarget('neondb', 'ep-production.us-east-1.aws.neon.tech', { ...allowed, forcePreview: '1' }), /Production migrations require/);
  assert.throws(() => assertSafeTarget('neondb', 'ep-production.us-east-1.aws.neon.tech', { ...allowed, neonProjectId: 'wrong-project' }), /project id/);
  assert.throws(() => assertSafeTarget('neondb', 'db.example.com', { ...allowed, expectedHost: 'db.example.com' }), /Neon host/);
  assert.equal(roleSecretFileName('domain', 'production'), 'pg_production_domain_pw.txt');
  assert.equal(roleSecretFileName('cms', 'production'), 'pg_production_cms_pw.txt');
});
