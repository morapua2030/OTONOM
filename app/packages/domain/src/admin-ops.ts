// Store/operations domain operations. Authorisation is enforced by the calling layer; every write is audited in-transaction.
import { randomUUID } from 'node:crypto';
import type pg from 'pg';
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

export async function adjustStock(pool: pg.Pool, ctx: Ctx, skuId: string, delta: number, reason: string) {
  if (!reason) throw new DomainError('REASON_REQUIRED');
  if (!Number.isInteger(delta) || delta === 0) throw new DomainError('INVALID_DELTA');
  return tx(pool, async (c) => {
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
      [skuId, delta, randomUUID(), ctx.actor.id, reason, ctx.correlationId ?? randomUUID()],
    );
    await audit(c, ctx, { action: 'stock.adjust', entityType: 'stock_level', entityId: skuId, after: u.rows[0], reason });
    return u.rows[0];
  });
}
