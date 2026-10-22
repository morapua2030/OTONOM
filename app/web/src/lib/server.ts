import path from 'node:path';
import { createHash } from 'node:crypto';
import type pg from 'pg';
import { APP_ROOT, connString, makePool, readSecret } from '@otonom/domain';

export const PRIVATE_UPLOAD_DIR = path.join(APP_ROOT, 'web', '.private-uploads');
/** Public-site media (images only, approval + consent gated). Local disk in development; object storage is BLOCKED (B-19). */
export const MEDIA_UPLOAD_DIR = path.join(APP_ROOT, 'web', '.media-uploads');

export function resolveSiteUrl(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.OTONOM_SITE_URL?.trim();
  if (configured) return configured;
  const vercelHost = env.VERCEL_URL?.trim().replace(/^https?:\/\//, '');
  if (env.VERCEL === '1' && vercelHost) return `https://${vercelHost}`;
  return 'http://127.0.0.1:3301';
}

export const siteUsesHttps = (env: NodeJS.ProcessEnv = process.env) => resolveSiteUrl(env).startsWith('https://');
export const SITE_URL = resolveSiteUrl();

const g = globalThis as unknown as { __otonomDomainPool?: pg.Pool };
/** Domain services use the least-privilege role otonom_domain, separate from the CMS role. */
export function domainDb(): pg.Pool {
  if (!g.__otonomDomainPool) g.__otonomDomainPool = makePool('domain', 20);
  return g.__otonomDomainPool;
}

export const payloadSecret = () => {
  const configured = process.env.PAYLOAD_SECRET?.trim();
  if (configured) return configured;
  if (process.env.VERCEL === '1') throw new Error('PAYLOAD_SECRET is required on Vercel');
  return readSecret('payload_secret.txt');
};
export const cmsConnString = () => connString('cms');
export const fileLinkSecret = () => createHash('sha256').update('file-links:' + payloadSecret()).digest('base64url');
export const previewLocked = (env: NodeJS.ProcessEnv = process.env) => env.OTONOM_FORCE_PREVIEW === '1';
export const uploadsDisabled = (env: NodeJS.ProcessEnv = process.env) => env.OTONOM_DISABLE_UPLOADS === '1';
/** Local-only synthetic commerce lab. It cannot be enabled on Vercel or a forced Preview runtime. */
export const internalCommerceLabEnabled = (env: NodeJS.ProcessEnv = process.env) =>
  env.OTONOM_TEST_PAGES === '1' && env.VERCEL !== '1' && !previewLocked(env);

/**
 * Public order, warranty and customer-operation routes are executable only in the isolated local synthetic harness.
 * Vercel is hard-denied even if an environment variable is accidentally copied to a hosted target.
 */
export const commercialOperationsEnabled = (env: NodeJS.ProcessEnv = process.env) =>
  env.OTONOM_ENABLE_SYNTHETIC_COMMERCIAL_TESTS === '1' &&
  env.OTONOM_TEST_PAGES === '1' &&
  env.VERCEL !== '1' &&
  !previewLocked(env);

/** Personal-data RFQ writes remain local and synthetic until privacy/retention/consent are owner-approved. */
export const publicRfqEnabled = (env: NodeJS.ProcessEnv = process.env) =>
  env.OTONOM_ENABLE_SYNTHETIC_RFQ_TESTS === '1' &&
  env.OTONOM_TEST_PAGES === '1' &&
  env.VERCEL !== '1' &&
  !previewLocked(env);
