// W1 store: price approval and website order submission (guest checkout). Behind the PREVIEW/COMMERCIAL gate in the web layer.
// No price is ever invented: an order line needs an OWNER-approved price, otherwise PRICE_NOT_APPROVED.
// Stock is NOT reserved at submission; staff confirmation (confirmOrder) reserves atomically (spike V-1).
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { IdempotencyKeyReuseError } from './inventory.ts';
import { orderAccessToken } from './orders.ts';
import { addMinor, minorUnits, multiplyMinor } from './money.ts';
import { audit, DomainError, tx, type Ctx } from './tx.ts';

const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const randomRef = (prefix: string) => `${prefix}-${new Date().getUTCFullYear()}-${Array.from(randomBytes(6), (b) => B32[b % 32]).join('')}`;

export async function proposePrice(pool: pg.Pool, ctx: Ctx, skuId: string, priceMinor: number, vatIncluded: boolean) {
  priceMinor = minorUnits(priceMinor, 'INVALID_PRICE');
  if (typeof vatIncluded !== 'boolean') throw new DomainError('VAT_FLAG_REQUIRED');
  return tx(pool, async (c) => {
    const s = await c.query(`SELECT 1 FROM domain.skus WHERE id=$1`, [skuId]);
    if (!s.rowCount) throw new DomainError('NOT_FOUND');
    const id = randomUUID();
    await c.query(`INSERT INTO domain.sku_prices(id, sku_id, price_minor, vat_included, status, proposed_by) VALUES ($1,$2,$3,$4,'DRAFT',$5)`, [id, skuId, priceMinor, vatIncluded, ctx.actor.id]);
    await audit(c, ctx, { action: 'price.propose', entityType: 'sku_price', entityId: id, after: { skuId, priceMinor, vatIncluded } });
    return { id };
  });
}

/** OWNER approval; the proposer cannot approve their own price (four-eyes, PROPOSED control). Retires the previous approved price. */
export async function approvePrice(pool: pg.Pool, ctx: Ctx, priceId: string) {
  return tx(pool, async (c) => {
    const p = await c.query(`SELECT sku_id, status, proposed_by FROM domain.sku_prices WHERE id=$1 FOR UPDATE`, [priceId]);
    if (!p.rowCount) throw new DomainError('NOT_FOUND');
    if (p.rows[0].status !== 'DRAFT') throw new DomainError('INVALID_STATE');
    if (p.rows[0].proposed_by === ctx.actor.id) throw new DomainError('FOUR_EYES_REQUIRED');
    await c.query(`UPDATE domain.sku_prices SET status='RETIRED' WHERE sku_id=$1 AND status='APPROVED'`, [p.rows[0].sku_id]);
    await c.query(`UPDATE domain.sku_prices SET status='APPROVED', approved_by=$2, approved_at=now() WHERE id=$1`, [priceId, ctx.actor.id]);
    await audit(c, ctx, { action: 'price.approve', entityType: 'sku_price', entityId: priceId, after: { status: 'APPROVED' } });
    return { ok: true };
  });
}

export type SubmitOrderInput = {
  idempotencyKey: string;
  lines: Array<{ skuId: string; qty: number }>;
  customer: { name: string; email?: string; phone?: string };
  governorate: string;
  paymentMethod: 'COD' | 'BANK_TRANSFER' | 'EWALLET';
};

export async function submitWebsiteOrder(pool: pg.Pool, ctx: Ctx, i: SubmitOrderInput) {
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(i.idempotencyKey ?? '')) throw new DomainError('INVALID_IDEMPOTENCY_KEY');
  if (!Array.isArray(i.lines) || i.lines.length < 1 || i.lines.length > 20) throw new DomainError('INVALID_LINES');
  const seen = new Set<string>();
  for (const l of i.lines) {
    if (typeof l.skuId !== 'string' || !Number.isInteger(l.qty) || l.qty < 1 || l.qty > 100 || seen.has(l.skuId)) throw new DomainError('INVALID_LINES');
    seen.add(l.skuId);
  }
  const customer = normalizeCustomerContact(i.customer);
  if (!['COD', 'BANK_TRANSFER', 'EWALLET'].includes(i.paymentMethod)) throw new DomainError('INVALID_PAYMENT_METHOD');
  const governorate = String(i.governorate ?? '').trim();
  if (!governorate) throw new DomainError('GOVERNORATE_REQUIRED');
  if (governorate.length > 80) throw new DomainError('INVALID_GOVERNORATE');
  const requestHash = createHash('sha256').update(JSON.stringify({ lines: i.lines, customer, governorate, paymentMethod: i.paymentMethod })).digest('hex');

  return tx(pool, async (c) => {
    // the idempotency key's primary key serialises concurrent duplicates (second insert waits for the first commit)
    const k = await c.query(`INSERT INTO domain.idempotency_keys(scope, key, request_hash) VALUES ('order.submit',$1,$2) ON CONFLICT DO NOTHING RETURNING key`, [i.idempotencyKey, requestHash]);
    if (!k.rowCount) {
      const prev = (await c.query(`SELECT request_hash, result FROM domain.idempotency_keys WHERE scope='order.submit' AND key=$1`, [i.idempotencyKey])).rows[0];
      if (prev.request_hash !== requestHash) throw new IdempotencyKeyReuseError('idempotency key reused with a different request');
      return { ...prev.result, accessToken: orderAccessToken(prev.result.orderId), replay: true };
    }
    const prices = await c.query(
      `SELECT s.id AS sku_id, s.status AS sku_status, p.id AS price_id, p.price_minor
         FROM domain.skus s LEFT JOIN domain.sku_prices p ON p.sku_id = s.id AND p.status = 'APPROVED'
        WHERE s.id = ANY($1)`,
      [[...seen]],
    );
    const bySku = new Map(prices.rows.map((r) => [r.sku_id, r]));
    for (const l of i.lines) {
      const r = bySku.get(l.skuId);
      if (!r || r.sku_status !== 'ACTIVE') throw new DomainError('SKU_NOT_AVAILABLE');
      if (!r.price_id) throw new DomainError('PRICE_NOT_APPROVED');
    }
    const orderId = randomUUID();
    const ref = randomRef('ORD');
    const priced = i.lines.map((l) => ({ line: l, row: bySku.get(l.skuId), lineMinor: multiplyMinor(bySku.get(l.skuId).price_minor, l.qty) }));
    const subtotal = addMinor(priced.map((p) => p.lineMinor));
    await c.query(
      `INSERT INTO domain.orders(id, ref, type, status, channel, customer_name, customer_email, customer_phone, governorate, payment_method, subtotal_minor)
       VALUES ($1,$2,'STANDARD','PENDING_REVIEW','WEBSITE',$3,$4,$5,$6,$7,$8)`,
      [orderId, ref, customer.name, customer.email ?? null, customer.phone ?? null, governorate, i.paymentMethod, subtotal],
    );
    for (const { line: l, row: r } of priced) {
      const unitPriceMinor = minorUnits(r.price_minor, 'INVALID_PRICE');
      await c.query(`INSERT INTO domain.order_lines(id, order_id, sku_id, qty, unit_price_minor, price_id) VALUES ($1,$2,$3,$4,$5,$6)`, [randomUUID(), orderId, l.skuId, l.qty, unitPriceMinor, r.price_id]);
    }
    const result = { orderId, ref, status: 'PENDING_REVIEW', subtotalMinor: subtotal, shipping: 'TO_BE_QUOTED' };
    await c.query(`UPDATE domain.idempotency_keys SET result=$3 WHERE scope='order.submit' AND key=$1 AND request_hash=$2`, [i.idempotencyKey, requestHash, result]);
    await audit(c, ctx, { action: 'order.submit', entityType: 'order', entityId: orderId, after: { ref, lines: i.lines, subtotal } });
    return { ...result, accessToken: orderAccessToken(orderId) };
  });
}

export function normalizeCustomerContact(customer: SubmitOrderInput['customer']) {
  const name = String(customer?.name ?? '').trim();
  const email = customer?.email ? String(customer.email).trim().toLowerCase() : undefined;
  const phone = customer?.phone ? String(customer.phone).trim() : undefined;
  if (!name || (!email && !phone)) throw new DomainError('CONTACT_REQUIRED');
  if (name.length > 120) throw new DomainError('INVALID_CUSTOMER');
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new DomainError('INVALID_EMAIL');
  if (phone && (phone.length > 32 || !/^\+?[0-9 ()-]{7,32}$/.test(phone))) throw new DomainError('INVALID_PHONE');
  return { name, email, phone };
}
