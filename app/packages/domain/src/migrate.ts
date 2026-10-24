// Versioned, checksummed migrations for the "domain" schema (fills the spike's Option-C gap; Payload manages its own schema).
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { connConfig, databaseTarget, DB_NAME, PG_HOST, ROLE_NAMES, SECRETS_DIR } from './db.ts';

/**
 * Target guard (S3 instruction pack §3): local setup/migrations only target the OTONOM development or disposable
 * test databases. A remote synthetic Preview target needs an exact, one-shot allowlist and PREVIEW lock.
 */
export type RemoteMigrationGate = {
  authorization?: string;
  expectedHost?: string;
  expectedDatabase?: string;
  forcePreview?: string;
  forceProduction?: string;
  neonProjectId?: string;
  expectedNeonProjectId?: string;
};

export type MigrationEnvironment = 'local' | 'preview' | 'production';

export function assertSafeTarget(db = DB_NAME, host = PG_HOST, remote: RemoteMigrationGate = {}): MigrationEnvironment {
  const normalizedHost = host.toLowerCase();
  if (['127.0.0.1', 'localhost', '::1'].includes(normalizedHost)) {
    if (!/^otonom_(dev|test_[a-z0-9_]+|e2e_[a-z0-9_]+|restore_drill)$/.test(db)) throw new Error(`refusing to run setup/migrations against unexpected database ${db}`);
    return 'local';
  }

  if (!['SYNTHETIC_PREVIEW_ONLY', 'ISOLATED_PRODUCTION_ONLY'].includes(remote.authorization ?? '')) {
    throw new Error(`refusing to run setup/migrations against non-local host ${normalizedHost}`);
  }
  if (!remote.expectedHost || normalizedHost !== remote.expectedHost.toLowerCase()) throw new Error('remote migration host does not match the explicit expected host');
  if (!remote.expectedDatabase || db !== remote.expectedDatabase) throw new Error('remote migration database does not match the explicit expected database');

  if (remote.authorization === 'SYNTHETIC_PREVIEW_ONLY') {
    if (remote.forcePreview !== '1' || remote.forceProduction === '1') throw new Error('Preview migrations require OTONOM_FORCE_PREVIEW=1 and no Production gate');
    if (/(^|[_-])(prod|production|live|customer)([_-]|$)/i.test(db)) throw new Error('remote migration database name appears production-like');
    return 'preview';
  }

  if (remote.authorization === 'ISOLATED_PRODUCTION_ONLY') {
    if (remote.forceProduction !== '1' || remote.forcePreview === '1') throw new Error('Production migrations require OTONOM_FORCE_PRODUCTION=1 and no Preview gate');
    if (!normalizedHost.endsWith('.neon.tech')) throw new Error('Production migrations require an explicitly expected Neon host');
    if (!remote.expectedNeonProjectId || !remote.neonProjectId || remote.neonProjectId !== remote.expectedNeonProjectId) {
      throw new Error('Production migration Neon project id does not match the explicit expected project');
    }
    return 'production';
  }

  throw new Error('unreachable remote migration gate');
}

export function assertConfiguredMigrationTarget(
  target = databaseTarget('superuser'),
  configuredDatabase = DB_NAME,
  remote: RemoteMigrationGate = {
    authorization: process.env.OTONOM_ALLOW_REMOTE_MIGRATIONS,
    expectedHost: process.env.OTONOM_EXPECTED_MIGRATION_HOST,
    expectedDatabase: process.env.OTONOM_EXPECTED_MIGRATION_DATABASE,
    forcePreview: process.env.OTONOM_FORCE_PREVIEW,
    forceProduction: process.env.OTONOM_FORCE_PRODUCTION,
    neonProjectId: process.env.NEON_PROJECT_ID,
    expectedNeonProjectId: process.env.OTONOM_EXPECTED_NEON_PROJECT_ID,
  },
) {
  if (target.configuredUrl && configuredDatabase !== target.database) {
    throw new Error('OTONOM_DB does not match the database in OTONOM_ADMIN_DATABASE_URL');
  }
  const migrationEnvironment = assertSafeTarget(target.database, target.host, remote);
  return { ...target, migrationEnvironment };
}

const ROLE_LOCK = 0x07070001; // arbitrary constant key for pg_advisory_lock
const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

function ensureSecret(name: string) {
  mkdirSync(SECRETS_DIR, { recursive: true });
  const p = path.join(SECRETS_DIR, name);
  if (!existsSync(p)) writeFileSync(p, randomBytes(24).toString('base64url'));
  return readFileSync(p, 'utf8').trim();
}

export function roleSecretFileName(role: 'domain' | 'cms', environment: MigrationEnvironment) {
  return environment === 'local' ? `pg_${role}_pw.txt` : `pg_${environment}_${role}_pw.txt`;
}

/** Create login roles (idempotent). Passwords are generated locally and never printed. */
export async function ensureRoles(): Promise<void> {
  const target = assertConfiguredMigrationTarget();
  const c = new pg.Client(connConfig('superuser', 'postgres'));
  await c.connect();
  // cluster-wide advisory lock: concurrent setups (parallel test files, two deploy steps) must not race on ALTER ROLE
  await c.query('SELECT pg_advisory_lock($1)', [ROLE_LOCK]);
  try {
    for (const role of ['domain', 'cms'] as const) {
      const name = ROLE_NAMES[role];
      const pw = ensureSecret(roleSecretFileName(role, target.migrationEnvironment));
      const ex = await c.query(`SELECT 1 FROM pg_roles WHERE rolname=$1`, [name]);
      // Neon grants a newly created role back to its creator with ADMIN but without SET.
      // SET lets the owner become the login role, rotate that role's own password, and create
      // objects it owns without requiring a managed-service superuser capability.
      if (ex.rowCount && target.configuredUrl) {
        await c.query(`GRANT ${name} TO CURRENT_USER WITH SET TRUE`);
        await c.query(`SET ROLE ${name}`);
        try {
          await c.query(`ALTER ROLE CURRENT_USER PASSWORD ${pg.escapeLiteral(pw)}`);
        } finally {
          await c.query('RESET ROLE');
        }
      } else {
        await c.query(`${ex.rowCount ? 'ALTER' : 'CREATE'} ROLE ${name} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD ${pg.escapeLiteral(pw)}`);
      }
      if (target.configuredUrl) await c.query(`GRANT ${name} TO CURRENT_USER WITH SET TRUE`);
    }
    const db = await c.query(`SELECT 1 FROM pg_database WHERE datname=$1`, [DB_NAME]);
    if (!db.rowCount) await c.query(`CREATE DATABASE ${DB_NAME}`);
  } finally {
    await c.query('SELECT pg_advisory_unlock($1)', [ROLE_LOCK]).catch(() => {});
    await c.end();
  }
}

export type MigrationResult = { applied: string[]; alreadyApplied: string[] };

export async function migrate(): Promise<MigrationResult> {
  assertConfiguredMigrationTarget();
  const c = new pg.Client(connConfig('superuser'));
  await c.connect();
  const applied: string[] = [];
  const already: string[] = [];
  try {
    await c.query(`REVOKE CREATE ON SCHEMA public FROM PUBLIC`);
    await c.query(`CREATE SCHEMA IF NOT EXISTS domain`);
    await c.query(`CREATE SCHEMA IF NOT EXISTS cms AUTHORIZATION ${ROLE_NAMES.cms}`);
    await c.query(`CREATE TABLE IF NOT EXISTS domain.schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort();
    for (const f of files) {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
      const sum = createHash('sha256').update(sql).digest('hex');
      const row = (await c.query(`SELECT checksum FROM domain.schema_migrations WHERE version=$1`, [f])).rows[0];
      if (row) {
        if (row.checksum !== sum) throw new Error(`migration ${f} was modified after being applied (checksum mismatch)`);
        already.push(f);
        continue;
      }
      await c.query('BEGIN');
      try {
        await c.query(sql);
        await c.query(`INSERT INTO domain.schema_migrations(version, checksum) VALUES ($1,$2)`, [f, sum]);
        await c.query('COMMIT');
        applied.push(f);
      } catch (e) {
        await c.query('ROLLBACK');
        throw new Error(`migration ${f} failed: ${(e as Error).message}`);
      }
    }
    // least-privilege grants (re-applied every run so new tables are covered)
    const d = ROLE_NAMES.domain;
    await c.query(`
      REVOKE ALL ON SCHEMA domain FROM PUBLIC;
      GRANT USAGE ON SCHEMA domain TO ${d};
      GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA domain TO ${d};
      REVOKE UPDATE, DELETE, TRUNCATE ON domain.inventory_ledger, domain.audit_events, domain.attribution_changes,
        domain.serial_replacements, domain.service_ticket_events, domain.service_diagnoses, domain.rma_inspections,
        domain.rma_actions, domain.service_outbox, domain.schema_migrations FROM ${d};
      REVOKE INSERT ON domain.schema_migrations FROM ${d};
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA domain TO ${d};
      GRANT DELETE ON domain.rate_limits TO ${d};
      REVOKE ALL ON SCHEMA domain FROM ${ROLE_NAMES.cms};
    `);
  } finally {
    await c.end();
  }
  return { applied, alreadyApplied: already };
}

if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  ensureRoles()
    .then(migrate)
    .then((r) => {
      console.log(JSON.stringify(r));
      process.exit(0);
    })
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
