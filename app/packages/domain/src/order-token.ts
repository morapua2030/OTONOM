// Customer access token for guest orders: an HMAC of the order id, so nothing secret is stored per order.
// It lives in its own module so commerce.ts (order submission) and orders.ts (order lifecycle) can both use it
// without importing each other.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { SECRETS_DIR } from './db.ts';

let tokenKey: Buffer | null = null;
function key(): Buffer {
  if (tokenKey) return tokenKey;
  mkdirSync(SECRETS_DIR, { recursive: true });
  const p = path.join(SECRETS_DIR, 'order_token_secret.txt');
  if (!existsSync(p)) writeFileSync(p, randomBytes(32).toString('base64url'));
  tokenKey = Buffer.from(readFileSync(p, 'utf8').trim());
  return tokenKey;
}
export const orderAccessToken = (orderId: string) => createHmac('sha256', key()).update(`order:${orderId}`).digest('base64url');
export function checkOrderToken(orderId: string, token: string): boolean {
  const a = Buffer.from(orderAccessToken(orderId));
  const b = Buffer.from(String(token ?? ''));
  return a.length === b.length && timingSafeEqual(a, b);
}
