// Store/operations domain operations. Authorisation is enforced by the calling layer; every write is audited in-transaction.
import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { IdempotencyKeyReuseError } from './inventory.ts';
import { audit, DomainError, tx, type Ctx } from './tx.ts';

export async function verifyPayment(pool: pg.Pool, ctx: Ctx, paymentId: string, externalRef: string) {
  if (!externalRef) throw new DomainError('EXTERNAL_REF_REQUIRED');
  return tx(pool, async (c) => {
    const p = await c.query(`SELECT status FROM domain.payments WHERE id=$1 FOR UPDATE`, [paymentId]);
    if (!p.rowCount) throw new DomainError('NOT_FOUND');
    if (p.rows[0].status !== 'PENDING') throw new DomainError('INVALID_STATE');
    try {
      await c.query(`UPDATE domain.payments SET status='VERIFIED', external_ref=$2, verified_by=$3, verified_at=now() WHERE id=$1`, [paymentId, externalRef, ctx.actor.id]);
    } catch (e: any) {
      if (e?.code === '23505') throw new DomainError('EXTERNAL_REF_ALREADY_USED');
      throw e;
    }
    await audit(c, ctx, { action: 'payment.verify', entityType: 'payment', entityId: paymentId, before: { status: 'PENDING' }, after: { status: 'VERIFIED', externalRef } });
    return { ok: true };
  });
}

export async function adjustStock(pool: pg.Pool, ctx: Ctx, skuId: string, delta: number, reason: string, idempotencyKey: string) {
  if (!String(reason ?? '').trim()) throw new DomainError('REASON_REQUIRED');
  if (reason.trim().length > 240) throw new DomainError('INVALID_REASON');
  if (!Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 1_000_000_000) throw new DomainError('INVALID_DELTA');
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(idempotencyKey ?? '')) throw new DomainError('INVALID_IDEMPOTENCY_KEY');
  const requestHash = createHash('sha256').update(JSON.stringify({ skuId, delta, reason: reason.trim() })).digest('hex');
  return tx(pool, async (c) => {
    const key = await c.query(
      `INSERT INTO domain.idempotency_keys(scope, key, request_hash) VALUES ('stock.adjust',$1,$2)
       ON CONFLICT DO NOTHING RETURNING key`,
      [idempotencyKey, requestHash],
    );
    if (!key.rowCount) {
      const previous = (await c.query(`SELECT request_hash, result FROM domain.idempotency_keys WHERE scope='stock.adjust' AND key=$1`, [idempotencyKey])).rows[0];
      if (!previous || previous.request_hash !== requestHash) throw new IdempotencyKeyReuseError('idempotency key reused with a different stock adjustment');
      if (!previous.result) throw new DomainError('IDEMPOTENCY_INCOMPLETE');
      return { ...previous.result, replay: true };
    }
    const u = await c.query(
      `UPDATE domain.stock_levels SET on_hand = on_hand + $2 WHERE sku_id=$1 AND location_id='MAIN' RETURNING on_hand, reserved, allocated`,
      [skuId, delta],
    ).catch((e: any) => {
      if (e?.code === '23514') throw new DomainError('STOCK_WOULD_BE_NEGATIVE');
      throw e;
    });
    if (!u.rowCount) throw new DomainError('NOT_FOUND');
    await c.query(
      `INSERT INTO domain.inventory_ledger(sku_id, location_id, type, qty, reference_type, reference_id, actor, reason, correlation_id)
       VALUES ($1,'MAIN','ADJUSTMENT',$2,'adjustment',$3,$4,$5,$6)`,
      [skuId, delta, idempotencyKey, ctx.actor.id, reason.trim(), ctx.correlationId ?? randomUUID()],
    );
    const result = { ...u.rows[0], replay: false };
    await audit(c, ctx, { action: 'stock.adjust', entityType: 'stock_level', entityId: skuId, after: result, reason: reason.trim() });
    await c.query(`UPDATE domain.idempotency_keys SET result=$2 WHERE scope='stock.adjust' AND key=$1`, [idempotencyKey, result]);
    return result;
  });
}

export type StockMovementInput = {
  skuId: string;
  kind: 'RECEIVE' | 'WRITE_OFF' | 'APPROVED_RETURN';
  qty: number;
  reference: string;
  reason: string;
  idempotencyKey: string;
};

/** Explicit operational movement; APPROVED_RETURN is a human-approved sellable return, never an RMA receipt. */
export async function recordStockMovement(pool: pg.Pool, ctx: Ctx, input: StockMovementInput) {
  if (!['RECEIVE', 'WRITE_OFF', 'APPROVED_RETURN'].includes(input.kind)) throw new DomainError('INVALID_MOVEMENT_KIND');
  if (!Number.isSafeInteger(input.qty) || input.qty <= 0 || input.qty > 1_000_000_000) throw new DomainError('INVALID_QUANTITY');
  if (!/^[A-Za-z0-9._:/-]{3,120}$/.test(input.reference ?? '')) throw new DomainError('INVALID_REFERENCE');
  if (!String(input.reason ?? '').trim() || input.reason.trim().length > 240) throw new DomainError('REASON_REQUIRED');
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(input.idempotencyKey ?? '')) throw new DomainError('INVALID_IDEMPOTENCY_KEY');
  const requestHash = createHash('sha256').update(JSON.stringify({ skuId: input.skuId, kind: input.kind, qty: input.qty, reference: input.reference, reason: input.reason.trim() })).digest('hex');
  const delta = input.kind === 'WRITE_OFF' ? -input.qty : input.qty;
  const ledgerType = input.kind === 'RECEIVE' ? 'RECEIPT' : input.kind === 'WRITE_OFF' ? 'WRITE_OFF' : 'RESTOCK';
  return tx(pool, async (c) => {
    const key = await c.query(
      `INSERT INTO domain.idempotency_keys(scope,key,request_hash) VALUES ('stock.movement',$1,$2)
       ON CONFLICT DO NOTHING RETURNING key`,
      [input.idempotencyKey, requestHash],
    );
    if (!key.rowCount) {
      const previous = (await c.query(`SELECT request_hash,result FROM domain.idempotency_keys WHERE scope='stock.movement' AND key=$1`, [input.idempotencyKey])).rows[0];
      if (!previous || previous.request_hash !== requestHash) throw new IdempotencyKeyReuseError('idempotency key reused with a different stock movement');
      if (!previous.result) throw new DomainError('IDEMPOTENCY_INCOMPLETE');
      return { ...previous.result, replay: true };
    }
    const updated = await c.query(
      `UPDATE domain.stock_levels SET on_hand=on_hand+$2
        WHERE sku_id=$1 AND location_id='MAIN' AND on_hand+$2 >= reserved+allocated
        RETURNING on_hand,reserved,allocated`,
      [input.skuId, delta],
    );
    if (!updated.rowCount) {
      const exists = await c.query(`SELECT 1 FROM domain.stock_levels WHERE sku_id=$1 AND location_id='MAIN'`, [input.skuId]);
      throw new DomainError(exists.rowCount ? 'STOCK_WOULD_BE_NEGATIVE' : 'NOT_FOUND');
    }
    await c.query(
      `INSERT INTO domain.inventory_ledger(sku_id,location_id,type,qty,reference_type,reference_id,actor,reason,correlation_id)
       VALUES ($1,'MAIN',$2,$3,$4,$5,$6,$7,$8)`,
      [input.skuId, ledgerType, input.qty, input.kind.toLowerCase(), input.reference, ctx.actor.id, input.reason.trim(), ctx.correlationId ?? randomUUID()],
    );
    const result = { ...updated.rows[0], kind: input.kind, replay: false };
    await audit(c, ctx, { action: `stock.${input.kind.toLowerCase()}`, entityType: 'stock_level', entityId: input.skuId, after: result, reason: input.reason.trim() });
    await c.query(`UPDATE domain.idempotency_keys SET result=$2 WHERE scope='stock.movement' AND key=$1`, [input.idempotencyKey, result]);
    return result;
  });
}
