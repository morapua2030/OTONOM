import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(here, '..', '..', '..');
export const SECRETS_DIR = path.join(APP_ROOT, '.local-secrets');

export const PG_HOST = process.env.OTONOM_PG_HOST ?? '127.0.0.1';
export const PG_PORT = Number(process.env.OTONOM_PG_PORT ?? 5433);
export const DB_NAME = process.env.OTONOM_DB ?? 'otonom_dev';
// used as an SQL identifier in setup statements: accept plain lowercase identifiers only (defence in depth)
if (!/^[a-z_][a-z0-9_]{0,62}$/.test(DB_NAME)) throw new Error('OTONOM_DB must be a plain lowercase identifier');

/** Local development cluster superuser password file (portable PostgreSQL started by the spike). */
const SUPERUSER_PW_FILE =
  process.env.OTONOM_PG_SUPERUSER_PW_FILE ?? path.resolve(APP_ROOT, '..', 'spike', 'architecture-feasibility-20261014', '.local-secrets', 'pg_superuser_pw.txt');

const DATABASE_URL_ENV: Record<DbRole, string> = {
  superuser: 'OTONOM_ADMIN_DATABASE_URL',
  domain: 'OTONOM_DOMAIN_DATABASE_URL',
  cms: 'OTONOM_CMS_DATABASE_URL',
};

function databaseUrl(role: DbRole): string | undefined {
  const value = process.env[DATABASE_URL_ENV[role]]?.trim();
  return value || undefined;
}

export type DatabaseTarget = { host: string; database: string; configuredUrl: boolean };

/** Resolve the real connection target without exposing credentials. */
export function databaseTarget(role: DbRole, database = DB_NAME): DatabaseTarget {
  const url = databaseUrl(role);
  if (url) {
    const parsed = new URL(url);
    const configuredDatabase = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    if (!parsed.hostname || !configuredDatabase) throw new Error(`${DATABASE_URL_ENV[role]} must include a host and database name`);
    return { host: parsed.hostname.toLowerCase(), database: configuredDatabase, configuredUrl: true };
  }
  return { host: PG_HOST.toLowerCase(), database, configuredUrl: false };
}

export function readSecret(file: string): string {
  const p = path.isAbsolute(file) ? file : path.join(SECRETS_DIR, file);
  if (!existsSync(p)) throw new Error(`missing local secret: ${path.basename(p)}`);
  return readFileSync(p, 'utf8').trim();
}

export type DbRole = 'superuser' | 'domain' | 'cms';
export const ROLE_NAMES = { domain: 'otonom_domain', cms: 'otonom_cms' } as const;

export function connConfig(role: DbRole, database = DB_NAME): pg.PoolConfig {
  const url = databaseUrl(role);
  if (url) return { connectionString: url };
  if (process.env.VERCEL === '1') throw new Error(`${DATABASE_URL_ENV[role]} is required on Vercel`);
  if (role === 'superuser') return { host: PG_HOST, port: PG_PORT, user: process.env.OTONOM_PG_SUPERUSER ?? 'spike_admin', password: readSecret(SUPERUSER_PW_FILE), database };
  return { host: PG_HOST, port: PG_PORT, user: ROLE_NAMES[role], password: readSecret(`pg_${role}_pw.txt`), database };
}

export function connString(role: DbRole, database = DB_NAME): string {
  const url = databaseUrl(role);
  if (url) return url;
  const c = connConfig(role, database);
  return `postgres://${encodeURIComponent(String(c.user))}:${encodeURIComponent(String(c.password))}@${c.host}:${c.port}/${database}`;
}

export function makePool(role: DbRole, max = 10, database = DB_NAME): pg.Pool {
  const configured = process.env.OTONOM_PG_POOL_MAX ?? (process.env.VERCEL === '1' ? '2' : undefined);
  const effectiveMax = configured === undefined ? max : Number(configured);
  if (!Number.isInteger(effectiveMax) || effectiveMax < 1 || (configured !== undefined && effectiveMax > 20)) {
    throw new Error('OTONOM_PG_POOL_MAX must be an integer from 1 to 20');
  }
  const pool = new pg.Pool({ ...connConfig(role, database), max: effectiveMax, idleTimeoutMillis: 5000 });
  // an idle client error (e.g. server restart) must not crash the process
  pool.on('error', (e) => console.error('[pg pool] idle client error:', e.message));
  return pool;
}
