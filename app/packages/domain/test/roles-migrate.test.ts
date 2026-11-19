// Audit 2026-11-18, C4-06: `migrate` only migrates, and role setup (`db:roles`) is local only.
// 1. `pnpm --filter @otonom/domain migrate` must not touch the roles: the role password verifiers are unchanged.
//    (The old entry point ran ensureRoles() first, which re-set both role passwords.)
// 2. `db:roles` refuses a Neon host, a configured database URL and any non-local host, before it connects, even when
//    every remote-migration authorization variable is set.
process.env.OTONOM_DB = 'otonom_test_roles_migrate';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { connConfig } = await import('../src/db.ts');
const { ensureRoles, migrate } = await import('../src/migrate.ts');

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEON_HOST = 'ep-r2-roles-refusal-test.us-east-1.aws.neon.tech';
const HOSTED_VARS = ['OTONOM_ADMIN_DATABASE_URL', 'OTONOM_DOMAIN_DATABASE_URL', 'OTONOM_CMS_DATABASE_URL', 'OTONOM_ALLOW_REMOTE_MIGRATIONS', 'OTONOM_EXPECTED_MIGRATION_HOST', 'OTONOM_EXPECTED_MIGRATION_DATABASE', 'OTONOM_FORCE_PRODUCTION', 'OTONOM_FORCE_PREVIEW', 'NEON_PROJECT_ID', 'OTONOM_EXPECTED_NEON_PROJECT_ID'];

/** Runs a package script file in a child process with a clean, explicit environment. */
function run(script: string, extra: Record<string, string>) {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !HOSTED_VARS.includes(k)) env[k] = v;
  const r = spawnSync(process.execPath, ['--import', 'tsx', script], { cwd: PKG, env: { ...env, ...extra }, encoding: 'utf8', timeout: 60_000 });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
}

/** sha256 of each role's stored password verifier (the verifiers themselves are never printed). */
async function roleVerifiers() {
  const su = new pg.Client(connConfig('superuser', 'postgres'));
  await su.connect();
  try {
    const rows = (await su.query(`SELECT rolname, rolpassword FROM pg_authid WHERE rolname IN ('otonom_domain', 'otonom_cms') ORDER BY rolname`)).rows;
    return Object.fromEntries(rows.map((r) => [r.rolname, createHash('sha256').update(String(r.rolpassword)).digest('hex').slice(0, 16)]));
  } finally {
    await su.end();
  }
}

after(async () => {
  const su = new pg.Client(connConfig('superuser', 'postgres'));
  await su.connect();
  await su.query('DROP DATABASE IF EXISTS otonom_test_roles_migrate WITH (FORCE)');
  await su.end();
});

test('db:roles refuses a Neon database URL, even with every remote-migration authorization set', () => {
  const url = { OTONOM_ADMIN_DATABASE_URL: `postgresql://ci@${NEON_HOST}/neondb`, OTONOM_DB: 'neondb' };
  const plain = run('src/roles.ts', url);
  assert.notEqual(plain.status, 0);
  assert.match(plain.out, /refusing to set up roles: a database URL is configured/);
  const authorized = run('src/roles.ts', {
    ...url,
    OTONOM_ALLOW_REMOTE_MIGRATIONS: 'ISOLATED_PRODUCTION_ONLY',
    OTONOM_EXPECTED_MIGRATION_HOST: NEON_HOST,
    OTONOM_EXPECTED_MIGRATION_DATABASE: 'neondb',
    OTONOM_FORCE_PRODUCTION: '1',
    NEON_PROJECT_ID: 'r2-test-project',
    OTONOM_EXPECTED_NEON_PROJECT_ID: 'r2-test-project',
  });
  assert.notEqual(authorized.status, 0);
  assert.match(authorized.out, /refusing to set up roles: a database URL is configured/, 'refused before any connection attempt');
  assert.doesNotMatch(authorized.out, /ENOTFOUND|ECONNREFUSED|getaddrinfo|timeout/i);
});

test('db:roles refuses a non-local host and a non-development database name', () => {
  const remote = run('src/roles.ts', { OTONOM_PG_HOST: 'db.example.com', OTONOM_DB: 'otonom_dev' });
  assert.notEqual(remote.status, 0);
  assert.match(remote.out, /refusing to set up roles on non-local host db\.example\.com|refusing to run setup\/migrations against non-local host db\.example\.com/);
  const prodName = run('src/roles.ts', { OTONOM_PG_HOST: '127.0.0.1', OTONOM_DB: 'neondb' });
  assert.notEqual(prodName.status, 0);
  assert.match(prodName.out, /refusing to run setup\/migrations against unexpected database neondb/);
});

test('migrate never touches the roles: their password verifiers stay the same', async () => {
  await ensureRoles();
  await migrate();
  // control: a role password reset does change the verifier (a new salt every time), so this check can see one
  const first = await roleVerifiers();
  await ensureRoles();
  const reset = await roleVerifiers();
  assert.notDeepEqual(reset, first, 'a password reset must be visible to this check');
  const r = run('src/migrate.ts', { OTONOM_DB: 'otonom_test_roles_migrate' });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /"applied":\[\],"alreadyApplied":\[/, 'migrate ran and found everything applied');
  assert.deepEqual(await roleVerifiers(), reset, 'migrate must not re-set any role password');
});
