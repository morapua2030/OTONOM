// Rate limiting backed by the shared PostgreSQL store (domain.rate_limits) — works across processes and instances.
// (Replaced the earlier in-memory limiter; release blocker B-21.)
import { consumeRateLimit, rateLimitStatus as readRateLimitStatus } from '@otonom/domain';
import { domainDb } from './server.ts';

export function rateLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; retryAfterSec: number }> {
  return consumeRateLimit(domainDb(), key, limit, windowMs);
}

export function rateLimitStatus(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; retryAfterSec: number }> {
  return readRateLimitStatus(domainDb(), key, limit, windowMs);
}

/**
 * Client address for rate limiting. X-Forwarded-For is trusted ONLY when OTONOM_TRUST_PROXY=1
 * (i.e. behind a known reverse proxy); otherwise a client could spoof it to bypass limits.
 */
export function clientIp(headers: Headers): string {
  if (process.env.OTONOM_TRUST_PROXY === '1') {
    const xff = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (xff) return xff;
  }
  return 'direct';
}
