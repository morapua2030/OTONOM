// Shared fixed-window rate limiter in PostgreSQL (works across processes/instances — release blocker B-21).
// One atomic upsert per hit; keys are salted hashes so client IPs / identifiers are never stored in clear.
import { createHmac, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type pg from 'pg';
import { SECRETS_DIR } from './db.ts';

let salt: Buffer | null = null;

export function hostedRateLimitSalt(env: {
  OTONOM_RATE_LIMIT_SALT?: string;
  PAYLOAD_SECRET?: string;
  VERCEL?: string;
}): Buffer | null {
  const dedicated = env.OTONOM_RATE_LIMIT_SALT?.trim();
  if (dedicated) {
    if (dedicated.length < 32) throw new Error('OTONOM_RATE_LIMIT_SALT must contain at least 32 characters');
    return Buffer.from(dedicated);
  }

  const payloadSecret = env.PAYLOAD_SECRET?.trim();
  if (payloadSecret) {
    if (payloadSecret.length < 32) throw new Error('PAYLOAD_SECRET must contain at least 32 characters');
    return createHmac('sha256', Buffer.from(payloadSecret)).update('otonom-rate-limit-salt-v1').digest();
  }

  if (env.VERCEL === '1') throw new Error('OTONOM_RATE_LIMIT_SALT or PAYLOAD_SECRET is required on Vercel');
  return null;
}

function keySalt(): Buffer {
  if (salt) return salt;
  const hosted = hostedRateLimitSalt({
    OTONOM_RATE_LIMIT_SALT: process.env.OTONOM_RATE_LIMIT_SALT,
    PAYLOAD_SECRET: process.env.PAYLOAD_SECRET,
    VERCEL: process.env.VERCEL,
  });
  if (hosted) return (salt = hosted);
  mkdirSync(SECRETS_DIR, { recursive: true });
  const p = path.join(SECRETS_DIR, 'ratelimit_salt.txt');
  if (!existsSync(p)) writeFileSync(p, randomBytes(32).toString('base64url'));
  salt = Buffer.from(readFileSync(p, 'utf8').trim());
  return salt;
}

export async function consumeRateLimit(pool: pg.Pool, key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const bucket = createHmac('sha256', keySalt()).update(key).digest('base64url');
  const r = await pool.query(
    `INSERT INTO domain.rate_limits(bucket, window_start, hits) VALUES ($1, now(), 1)
     ON CONFLICT (bucket) DO UPDATE SET
       hits = CASE WHEN domain.rate_limits.window_start <= now() - make_interval(secs => $2) THEN 1 ELSE domain.rate_limits.hits + 1 END,
       window_start = CASE WHEN domain.rate_limits.window_start <= now() - make_interval(secs => $2) THEN now() ELSE domain.rate_limits.window_start END
     RETURNING hits, extract(epoch FROM (window_start + make_interval(secs => $2) - now()))::int AS remaining`,
    [bucket, windowMs / 1000],
  );
  // opportunistic clean-up of stale buckets (~1 % of calls)
  if (Math.random() < 0.01) await pool.query(`DELETE FROM domain.rate_limits WHERE window_start < now() - interval '1 day'`).catch(() => {});
  const hits = Number(r.rows[0].hits);
  return hits > limit ? { allowed: false, retryAfterSec: Math.max(1, Number(r.rows[0].remaining)) } : { allowed: true, retryAfterSec: 0 };
}
