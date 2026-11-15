import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Re-enrolling the authenticator after a lost phone (owner 2026-11-15). The new secret is not stored until the person
 * proves it with a code, so an abandoned attempt never locks anyone out: it travels to the browser (it is shown there
 * anyway) inside a short-lived token bound to the user and to this exact session by an HMAC.
 */
export const REENROLL_TOKEN_TTL_MS = 10 * 60_000;
/** The recovery code must have been used in this same session within this window. */
export const REENROLL_RECOVERY_WINDOW_SECONDS = 15 * 60;

const mac = (key: string, userId: string, sid: string, body: string) =>
  createHmac('sha256', key).update(`otonom-mfa-reenroll-v1:${userId}:${sid}:${body}`).digest('base64url');

export function reenrollToken(key: string, userId: string, sid: string, totpSecret: string, now = Date.now()): string {
  const body = `${now + REENROLL_TOKEN_TTL_MS}.${totpSecret}`;
  return `${body}.${mac(key, userId, sid, body)}`;
}

/** Returns the pending secret, or null when the token is malformed, forged, for another user/session, or expired. */
export function openReenrollToken(key: string, userId: string, sid: string, token: unknown, now = Date.now()): string | null {
  const m = typeof token === 'string' ? /^(\d{13})\.([A-Z2-7]{16,128})\.([A-Za-z0-9_-]{43})$/.exec(token) : null;
  if (!m || !userId || !sid) return null;
  const expected = Buffer.from(mac(key, userId, sid, `${m[1]}.${m[2]}`));
  const given = Buffer.from(m[3]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(m[1]) < now) return null;
  return m[2];
}

/** Keeps only the current session; every other session of the user is revoked. */
export function keepOnlySession(sessions: unknown, sid: string): unknown[] {
  return Array.isArray(sessions) ? sessions.filter((s) => (s as { id?: unknown })?.id === sid) : [];
}
