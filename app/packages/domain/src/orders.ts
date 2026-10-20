// W1 order lifecycle after submission (local development, behind the PREVIEW/COMMERCIAL gate):
// cart pricing, custom-firmware quotes, shipping quote, payment records (manual — no gateway), serial allocation,
// shipping, completion and cancellation with stock release. Every amount comes from approved prices or authorised staff.
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type pg from 'pg';
import { SECRETS_DIR } from './db.ts';
import { IdempotencyKeyReuseError } from './inventory.ts';
import { randomRef } from './commerce.ts';
import { audit, DomainError, tx, type Ctx } from './tx.ts';

// ---------- customer access token for guest orders (HMAC of the order id; nothing secret is stored per order) ----------
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

type Line = { skuId: string; qty: number };
function validLines(lines: Line[]) {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 20) throw new DomainError('INVALID_LINES');
  const seen = new Set<string>();
  for (const l of lines) {
    if (typeof l?.skuId !== 'string' || !Number.isInteger(l.qty) || l.qty < 1 || l.qty > 100 || seen.has(l.skuId)) throw new DomainError('INVALID_LINES');
    seen.add(l.skuId);
  }
  return [...seen];
}

/** Server-side cart pricing (read-only): approved prices only; nothing is invented or cached client-side. */
export async function priceCart(pool: pg.Pool | pg.PoolClient, lines: Line[]) {
  const ids = validLines(lines);
  const r = await pool.query(
    `SELECT s.id, s.status, s.kind, s.variant_of, s.attributes, p.id AS price_id, p.price_minor, p.vat_included
       FROM domain.skus s LEFT JOIN domain.sku_prices p ON p.sku_id = s.id AND p.status = 'APPROVED' WHERE s.id = ANY($1)`,
    [ids],
  );
  const by = new Map(r.rows.map((x) => [x.id, x]));
  const out = lines.map((l) => {
    const s = by.get(l.skuId);
    if (!s || s.status !== 'ACTIVE') throw new DomainError('SKU_NOT_AVAILABLE');
    if (!s.price_id) throw new DomainError('PRICE_NOT_APPROVED');
    return { skuId: l.skuId, qty: l.qty, kind: s.kind, unitPriceMinor: Number(s.price_minor), lineMinor: Number(s.price_minor) * l.qty, vatIncluded: s.vat_included };
  });
  // a standard addition is only sold together with a controller
  if (out.every((l) => l.kind === 'ADDITION')) throw new DomainError('ADDITION_REQUIRES_CONTROLLER');
  return { lines: out, subtotalMinor: out.reduce((s, l) => s + l.lineMinor, 0), shipping: 'TO_BE_QUOTED' as const };
}

// ---------- custom firmware / non-standard quotation ----------
export type QuoteRequest = { idempotencyKey: string; lines: Line[]; requirements: string; customer: { name: string; email?: string; phone?: string }; governorate: string };

export async function requestCustomQuote(pool: pg.Pool, ctx: Ctx, i: QuoteRequest) {
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(i.idempotencyKey ?? '')) throw new DomainError('INVALID_IDEMPOTENCY_KEY');
  validLines(i.lines);
  if (String(i.requirements ?? '').trim().length < 20) throw new DomainError('REQUIREMENTS_TOO_SHORT');
  if (!String(i.customer?.name ?? '').trim() || !(i.customer.email || i.customer.phone)) throw new DomainError('CONTACT_REQUIRED');
  const hash = createHash('sha256').update(JSON.stringify({ l: i.lines, r: i.requirements, c: i.customer, g: i.governorate })).digest('hex');
  return tx(pool, async (c) => {
    const k = await c.query(`INSERT INTO domain.idempotency_keys(scope, key, request_hash) VALUES ('quote.request',$1,$2) ON CONFLICT DO NOTHING RETURNING key`, [i.idempotencyKey, hash]);
    if (!k.rowCount) {
      const prev = (await c.query(`SELECT request_hash, result FROM domain.idempotency_keys WHERE scope='quote.request' AND key=$1`, [i.idempotencyKey])).rows[0];
      if (prev.request_hash !== hash) throw new IdempotencyKeyReuseError('idempotency key reused with a different request');
      return { ...prev.result, accessToken: orderAccessToken(prev.result.orderId), replay: true };
    }
    const skus = await c.query(`SELECT id FROM domain.skus WHERE id = ANY($1) AND status='ACTIVE'`, [i.lines.map((l) => l.skuId)]);
    if (skus.rowCount !== i.lines.length) throw new DomainError('SKU_NOT_AVAILABLE');
    const orderId = randomUUID();
    const ref = randomRef('QTE');
    await c.query(
      `INSERT INTO domain.orders(id, ref, type, status, channel, customer_name, customer_email, customer_phone, governorate, quote_requirements)
       VALUES ($1,$2,'CUSTOM_QUOTED','QUOTE_PENDING','WEBSITE',$3,$4,$5,$6,$7)`,
      [orderId, ref, i.customer.name.trim(), i.customer.email ?? null, i.customer.phone ?? null, i.governorate ?? null, i.requirements.trim()],
    );
    for (const l of i.lines) await c.query(`INSERT INTO domain.order_lines(id, order_id, sku_id, qty) VALUES ($1,$2,$3,$4)`, [randomUUID(), orderId, l.skuId, l.qty]);
    const result = { orderId, ref, status: 'QUOTE_PENDING' };
    await c.query(`UPDATE domain.idempotency_keys SET result=$2 WHERE scope='quote.request' AND key=$1`, [i.idempotencyKey, result]);
    await audit(c, ctx, { action: 'quote.request', entityType: 'order', entityId: orderId, after: { ref, lines: i.lines } });
    return { ...result, accessToken: orderAccessToken(orderId) };
  });
}

/** OWNER issues the quote (a price decision): amount + validity. Never automatic. */
export async function issueQuote(pool: pg.Pool, ctx: Ctx, orderId: string, quoteMinor: number, validUntil: string) {
  if (!Number.isInteger(quoteMinor) || quoteMinor <= 0) throw new DomainError('INVALID_AMOUNT');
  if (Number.isNaN(Date.parse(validUntil)) || Date.parse(validUntil) <= Date.now()) throw new DomainError('INVALID_VALIDITY');
  return tx(pool, async (c) => {
    const o = await lockOrder(c, orderId);
    if (o.status !== 'QUOTE_PENDING') throw new DomainError('INVALID_STATE');
    await c.query(`UPDATE domain.orders SET status='QUOTED', quote_minor=$2, quote_valid_until=$3, quoted_by=$4, revision=revision+1 WHERE id=$1`, [orderId, quoteMinor, validUntil, ctx.actor.id]);
    await audit(c, ctx, { action: 'quote.issue', entityType: 'order', entityId: orderId, before: { status: o.status }, after: { status: 'QUOTED', quoteMinor, validUntil } });
    return { status: 'QUOTED' };
  });
}

/** Customer accepts a valid quote with the order access token → normal review/confirmation path. */
export async function acceptQuote(pool: pg.Pool, ctx: Ctx, ref: string, token: string) {
  return tx(pool, async (c) => {
    const o = (await c.query(`SELECT * FROM domain.orders WHERE ref=$1 FOR UPDATE`, [ref])).rows[0];
    if (!o || !checkOrderToken(o.id, token)) throw new DomainError('NOT_FOUND'); // no oracle: same answer for wrong ref or token
    if (o.status !== 'QUOTED') throw new DomainError('INVALID_STATE');
    if (new Date(o.quote_valid_until) <= new Date()) throw new DomainError('QUOTE_EXPIRED');
    await c.query(`UPDATE domain.orders SET status='PENDING_REVIEW', subtotal_minor=quote_minor, revision=revision+1 WHERE id=$1`, [o.id]);
    await audit(c, ctx, { action: 'quote.accept', entityType: 'order', entityId: o.id, after: { status: 'PENDING_REVIEW' } });
    return { status: 'PENDING_REVIEW' };
  });
}

// ---------- staff operations ----------
async function lockOrder(c: pg.PoolClient, orderId: string) {
  const o = (await c.query(`SELECT * FROM domain.orders WHERE id=$1 FOR UPDATE`, [orderId])).rows[0];
  if (!o) throw new DomainError('NOT_FOUND');
  return o;
}
const total = (o: any) => Number(o.subtotal_minor ?? 0) + Number(o.shipping_minor ?? 0);

/** Shipping amount entered by staff for this order (fees are not a published tariff — BLOCKED B-02). */
export async function setShipping(pool: pg.Pool, ctx: Ctx, orderId: string, shippingMinor: number) {
  if (!Number.isInteger(shippingMinor) || shippingMinor < 0) throw new DomainError('INVALID_AMOUNT');
  return tx(pool, async (c) => {
    const o = await lockOrder(c, orderId);
    if (!['PENDING_REVIEW', 'CONFIRMED'].includes(o.status)) throw new DomainError('INVALID_STATE');
    await c.query(`UPDATE domain.orders SET shipping_minor=$2, shipping_status='QUOTED', revision=revision+1 WHERE id=$1`, [orderId, shippingMinor]);
    await audit(c, ctx, { action: 'order.shipping', entityType: 'order', entityId: orderId, before: { shippingMinor: o.shipping_minor }, after: { shippingMinor } });
    return { totalMinor: Number(o.subtotal_minor ?? 0) + shippingMinor };
  });
}

/** Records an expected manual payment (bank transfer / e-wallet / COD). Verification stays a separate staff step. */
export async function recordPayment(pool: pg.Pool, ctx: Ctx, orderId: string, method: 'COD' | 'BANK_TRANSFER' | 'EWALLET', amountMinor: number) {
  if (!['COD', 'BANK_TRANSFER', 'EWALLET'].includes(method)) throw new DomainError('INVALID_PAYMENT_METHOD');
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) throw new DomainError('INVALID_AMOUNT');
  return tx(pool, async (c) => {
    const o = await lockOrder(c, orderId);
    if (!['CONFIRMED', 'ALLOCATED', 'SHIPPED'].includes(o.status)) throw new DomainError('INVALID_STATE');
    if (o.shipping_status === 'TO_BE_QUOTED') throw new DomainError('SHIPPING_NOT_QUOTED');
    const open = Number((await c.query(`SELECT coalesce(sum(amount_minor),0) s FROM domain.payments WHERE order_id=$1 AND status IN ('PENDING','VERIFIED')`, [orderId])).rows[0].s);
    if (open + amountMinor > total(o)) throw new DomainError('PAYMENT_EXCEEDS_TOTAL');
    const id = randomUUID();
    await c.query(`INSERT INTO domain.payments(id, order_id, method, amount_minor, status) VALUES ($1,$2,$3,$4,'PENDING')`, [id, orderId, method, amountMinor]);
    await audit(c, ctx, { action: 'payment.record', entityType: 'payment', entityId: id, after: { orderId, method, amountMinor } });
    return { paymentId: id };
  });
}

export async function rejectPayment(pool: pg.Pool, ctx: Ctx, paymentId: string, reason: string) {
  if (!String(reason ?? '').trim()) throw new DomainError('REASON_REQUIRED');
  return tx(pool, async (c) => {
    const p = (await c.query(`SELECT status FROM domain.payments WHERE id=$1 FOR UPDATE`, [paymentId])).rows[0];
    if (!p) throw new DomainError('NOT_FOUND');
    if (p.status !== 'PENDING') throw new DomainError('INVALID_STATE');
    await c.query(`UPDATE domain.payments SET status='REJECTED', rejected_reason=$2 WHERE id=$1`, [paymentId, reason]);
    await audit(c, ctx, { action: 'payment.reject', entityType: 'payment', entityId: paymentId, after: { status: 'REJECTED' }, reason });
    return { status: 'REJECTED' };
  });
}

/**
 * Allocate serial-numbered units to a confirmed order: consumes the reservation, moves stock reserved → allocated.
 * PROPOSED rule: prepaid methods need verified payments covering the total; COD may be allocated before payment.
 */
export async function allocateSerials(pool: pg.Pool, ctx: Ctx, orderId: string, serialsByLine: Record<string, string[]>) {
  return tx(pool, async (c) => {
    const o = await lockOrder(c, orderId);
    if (o.status === 'ALLOCATED') return { status: 'ALLOCATED', replay: true };
    if (o.status !== 'CONFIRMED') throw new DomainError('INVALID_STATE');
    if (o.payment_method !== 'COD') {
      const paid = Number((await c.query(`SELECT coalesce(sum(amount_minor),0) s FROM domain.payments WHERE order_id=$1 AND status='VERIFIED'`, [orderId])).rows[0].s);
      if (o.shipping_status === 'TO_BE_QUOTED' || paid < total(o)) throw new DomainError('PAYMENT_NOT_VERIFIED');
    }
    const lines = (await c.query(`SELECT l.id, l.sku_id, l.qty, s.serialised FROM domain.order_lines l JOIN domain.skus s ON s.id=l.sku_id WHERE l.order_id=$1 ORDER BY l.id`, [orderId])).rows;
    for (const l of lines) {
      const res = (await c.query(`SELECT id FROM domain.reservations WHERE order_line_id=$1 AND status='ACTIVE' FOR UPDATE`, [l.id])).rows[0];
      if (!res) throw new DomainError('RESERVATION_NOT_ACTIVE');
      if (l.serialised) {
        const serials = serialsByLine[l.id] ?? [];
        if (serials.length !== l.qty || new Set(serials).size !== serials.length) throw new DomainError('SERIAL_COUNT_MISMATCH');
        const u = await c.query(
          `UPDATE domain.serial_units SET status='ALLOCATED', order_line_id=$2 WHERE serial = ANY($1) AND sku_id=$3 AND status='IN_STOCK' RETURNING serial`,
          [serials, l.id, l.sku_id],
        );
        if (u.rowCount !== serials.length) throw new DomainError('SERIAL_NOT_AVAILABLE');
      }
      await c.query(`UPDATE domain.reservations SET status='CONSUMED' WHERE id=$1`, [res.id]);
      await c.query(`UPDATE domain.stock_levels SET reserved = reserved - $2, allocated = allocated + $2 WHERE sku_id=$1 AND location_id='MAIN'`, [l.sku_id, l.qty]);
      await c.query(
        `INSERT INTO domain.inventory_ledger(sku_id, location_id, type, qty, reference_type, reference_id, actor, correlation_id) VALUES ($1,'MAIN','ALLOCATE',$2,'order_line',$3,$4,$5)`,
        [l.sku_id, l.qty, l.id, ctx.actor.id, ctx.correlationId ?? randomUUID()],
      );
    }
    await c.query(`UPDATE domain.orders SET status='ALLOCATED', revision=revision+1 WHERE id=$1`, [orderId]);
    await audit(c, ctx, { action: 'order.allocate', entityType: 'order', entityId: orderId, after: { serialsByLine } });
    return { status: 'ALLOCATED' };
  });
}

export async function shipOrder(pool: pg.Pool, ctx: Ctx, orderId: string) {
  return tx(pool, async (c) => {
    const o = await lockOrder(c, orderId);
    if (o.status === 'SHIPPED') return { status: 'SHIPPED', replay: true };
    if (o.status !== 'ALLOCATED') throw new DomainError('INVALID_STATE');
    const lines = (await c.query(`SELECT id, sku_id, qty FROM domain.order_lines WHERE order_id=$1`, [orderId])).rows;
    for (const l of lines) {
      await c.query(`UPDATE domain.stock_levels SET allocated = allocated - $2, on_hand = on_hand - $2 WHERE sku_id=$1 AND location_id='MAIN'`, [l.sku_id, l.qty]);
      await c.query(`UPDATE domain.serial_units SET status='SHIPPED' WHERE order_line_id=$1 AND status='ALLOCATED'`, [l.id]);
      await c.query(
        `INSERT INTO domain.inventory_ledger(sku_id, location_id, type, qty, reference_type, reference_id, actor, correlation_id) VALUES ($1,'MAIN','SHIP',$2,'order_line',$3,$4,$5)`,
        [l.sku_id, l.qty, l.id, ctx.actor.id, ctx.correlationId ?? randomUUID()],
      );
    }
    await c.query(`UPDATE domain.orders SET status='SHIPPED', revision=revision+1 WHERE id=$1`, [orderId]);
    await audit(c, ctx, { action: 'order.ship', entityType: 'order', entityId: orderId, after: { status: 'SHIPPED' } });
    return { status: 'SHIPPED' };
  });
}

/** Delivered. Prepaid orders must be fully paid; COD payment must be verified at completion. */
export async function completeOrder(pool: pg.Pool, ctx: Ctx, orderId: string) {
  return tx(pool, async (c) => {
    const o = await lockOrder(c, orderId);
    if (o.status !== 'SHIPPED') throw new DomainError('INVALID_STATE');
    const paid = Number((await c.query(`SELECT coalesce(sum(amount_minor),0) s FROM domain.payments WHERE order_id=$1 AND status='VERIFIED'`, [orderId])).rows[0].s);
    if (paid < total(o)) throw new DomainError('PAYMENT_NOT_VERIFIED');
    await c.query(`UPDATE domain.orders SET status='COMPLETED', revision=revision+1 WHERE id=$1`, [orderId]);
    await audit(c, ctx, { action: 'order.complete', entityType: 'order', entityId: orderId, after: { status: 'COMPLETED' } });
    return { status: 'COMPLETED' };
  });
}

/** Cancel before shipment: releases reservations/allocations and frees serials. After shipment → RMA (warranty module). */
export async function cancelOrder(pool: pg.Pool, ctx: Ctx, orderId: string, reason: string) {
  if (!String(reason ?? '').trim()) throw new DomainError('REASON_REQUIRED');
  return tx(pool, async (c) => {
    const o = await lockOrder(c, orderId);
    if (o.status === 'CANCELLED') return { status: 'CANCELLED', replay: true };
    if (!['QUOTE_PENDING', 'QUOTED', 'PENDING_REVIEW', 'CONFIRMED', 'ALLOCATED'].includes(o.status)) throw new DomainError('INVALID_STATE');
    const lines = (await c.query(`SELECT id, sku_id, qty FROM domain.order_lines WHERE order_id=$1`, [orderId])).rows;
    const cid = ctx.correlationId ?? randomUUID();
    for (const l of lines) {
      const r = await c.query(`UPDATE domain.reservations SET status='RELEASED', released_at=now() WHERE order_line_id=$1 AND status='ACTIVE' RETURNING id, qty`, [l.id]);
      for (const x of r.rows) {
        await c.query(`UPDATE domain.stock_levels SET reserved = reserved - $2 WHERE sku_id=$1 AND location_id='MAIN'`, [l.sku_id, x.qty]);
        await c.query(`INSERT INTO domain.inventory_ledger(sku_id, location_id, type, qty, reference_type, reference_id, actor, reason, correlation_id) VALUES ($1,'MAIN','RELEASE',$2,'reservation',$3,$4,'order cancelled',$5)`, [l.sku_id, x.qty, x.id, ctx.actor.id, cid]);
      }
      if (o.status === 'ALLOCATED') {
        await c.query(`UPDATE domain.serial_units SET status='IN_STOCK', order_line_id=NULL WHERE order_line_id=$1 AND status='ALLOCATED'`, [l.id]);
        await c.query(`UPDATE domain.stock_levels SET allocated = allocated - $2 WHERE sku_id=$1 AND location_id='MAIN'`, [l.sku_id, l.qty]);
        await c.query(`INSERT INTO domain.inventory_ledger(sku_id, location_id, type, qty, reference_type, reference_id, actor, reason, correlation_id) VALUES ($1,'MAIN','RELEASE',$2,'order_line',$3,$4,'allocation cancelled',$5)`, [l.sku_id, l.qty, l.id, ctx.actor.id, cid]);
      }
    }
    await c.query(`UPDATE domain.payments SET status='REJECTED', rejected_reason='order cancelled' WHERE order_id=$1 AND status='PENDING'`, [orderId]);
    await c.query(`UPDATE domain.orders SET status='CANCELLED', cancelled_reason=$2, cancelled_by=$3, revision=revision+1 WHERE id=$1`, [orderId, reason, ctx.actor.id]);
    await audit(c, ctx, { action: 'order.cancel', entityType: 'order', entityId: orderId, before: { status: o.status }, after: { status: 'CANCELLED' }, reason });
    return { status: 'CANCELLED', refundRequired: Number((await c.query(`SELECT coalesce(sum(amount_minor),0) s FROM domain.payments WHERE order_id=$1 AND status='VERIFIED'`, [orderId])).rows[0].s) > 0 };
  });
}

/** Guest order status (ref + access token). Minimal data; no internal notes, no other customers' data. */
export async function orderStatusForCustomer(pool: pg.Pool, ref: string, token: string) {
  const o = (await pool.query(`SELECT id, ref, status, subtotal_minor, shipping_minor, shipping_status, quote_minor, quote_valid_until FROM domain.orders WHERE ref=$1`, [ref])).rows[0];
  if (!o || !checkOrderToken(o.id, token)) throw new DomainError('NOT_FOUND');
  const lines = (await pool.query(`SELECT sku_id, qty, unit_price_minor FROM domain.order_lines WHERE order_id=$1 ORDER BY sku_id`, [o.id])).rows;
  return {
    ref: o.ref,
    status: o.status,
    subtotalMinor: o.subtotal_minor === null ? null : Number(o.subtotal_minor),
    shippingMinor: o.shipping_minor === null ? null : Number(o.shipping_minor),
    shipping: o.shipping_status,
    quote: o.quote_minor ? { amountMinor: Number(o.quote_minor), validUntil: o.quote_valid_until } : null,
    lines: lines.map((l) => ({ skuId: l.sku_id, qty: l.qty, unitPriceMinor: l.unit_price_minor === null ? null : Number(l.unit_price_minor) })),
  };
}
