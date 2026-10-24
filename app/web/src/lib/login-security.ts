import { createHmac } from 'node:crypto';

/** Exact REST login route; local Payload API calls are intentionally not treated as browser requests. */
export function isUsersLoginRequest(method: string | undefined, url: string | undefined): boolean {
  if (method !== 'POST' || !url) return false;
  try {
    return new URL(url, 'http://otonom.invalid').pathname.replace(/\/$/, '') === '/api/users/login';
  } catch {
    return false;
  }
}

export function normalizeLoginIdentity(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/** Pseudonymous identifier for rate-limit/audit correlation; never stores the submitted e-mail. */
export function loginIdentityDigest(value: unknown, secret: string): string {
  return createHmac('sha256', secret).update(`otonom-login-identity-v1:${normalizeLoginIdentity(value) || 'missing'}`).digest('base64url');
}
