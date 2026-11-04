import { createHmac, timingSafeEqual } from 'node:crypto';
import { LEAD_MAX_FILL_MS, LEAD_MIN_FILL_MS } from './leads.ts';
import { payloadSecret } from './server.ts';

/**
 * Minimum-fill-time token for the booking form: the server renders `<issuedAt>.<hmac>` into the form, and the booking
 * endpoint accepts it only between LEAD_MIN_FILL_MS and LEAD_MAX_FILL_MS after issue. A browser cannot forge an older
 * timestamp without the server secret. It identifies nobody and is not stored.
 */
const sign = (ts: number, key: string) => createHmac('sha256', key).update(`otonom-booking-v1:${ts}`).digest('base64url');

export function issueBookingToken(now = Date.now(), key = payloadSecret()): string {
  return `${now}.${sign(now, key)}`;
}

export function checkBookingToken(token: unknown, now = Date.now(), key = payloadSecret()): 'OK' | 'INVALID' | 'TOO_FAST' | 'EXPIRED' {
  if (typeof token !== 'string' || !/^\d{13}\.[A-Za-z0-9_-]{43}$/.test(token)) return 'INVALID';
  const [tsRaw, mac] = token.split('.') as [string, string];
  const ts = Number(tsRaw);
  const expected = Buffer.from(sign(ts, key));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return 'INVALID';
  if (now - ts < LEAD_MIN_FILL_MS) return 'TOO_FAST';
  if (now - ts > LEAD_MAX_FILL_MS) return 'EXPIRED';
  return 'OK';
}
