import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';

export type ConfirmOrderCommand = {
  orderId: string;
  approvedBy: string;
  expectedRevision: number;
  idempotencyKey: string;
  reservationTtlSeconds?: number;
  /** Correlates audit/ledger rows with the originating request (V-8 gap closed). */
  correlationId?: string;
  /** Fault injection for tests only: throw after reservation + ledger writes, before commit. */
  failAfterReserve?: boolean;
};

export type ConfirmOrderResult =
  | { outcome: 'CONFIRMED'; orderId: string; reservationIds: string[]; revision: number }
  | { outcome: 'OUT_OF_STOCK'; orderId: string; skuId: string }
  | { outcome: 'CONFLICT'; orderId: string; reason: 'status' | 'revision' | 'not_found' };

export class IdempotencyKeyReuseError extends Error {
  code = 'IDEMPOTENCY_KEY_REUSE';
}
export class InjectedFaultError extends Error {
  code = 'INJECTED_FAULT';
}

const SCOPE_CONFIRM = 'order.confirm';

function hashRequest(cmd: ConfirmOrderCommand): string {
  return createHash('sha256')
    .update(JSON.stringify({ orderId: cmd.orderId, expectedRevision: cmd.expectedRevision }))
    .digest('hex');
}

async function audit(
  c: pg.PoolClient,
  e: { actorType: string; actorId: string; action: string; entityType: string; entityId: string; before?: unknown; after?: unknown; reason?: string; correlationId: string },
) {
  await c.query(
    `INSERT INTO domain.audit_events(actor_type, actor_id, action, entity_type, entity_id, before, after, reason, correlation_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [e.actorType, e.actorId, e.action, e.entityType, e.entityId, e.before ?? null, e.after ?? null, e.reason ?? null, e.correlationId],
  );
}

/**
 * Confirm an order and reserve stock atomically.
 * Isolation: READ COMMITTED. Correctness relies on
 *  (1) a conditional UPDATE on stock_levels (row lock + predicate re-check after the competing commit),
 *  (2) SELECT ... FOR UPDATE on the order row,
 *  (3) the idempotency key's primary key (a concurrent duplicate insert blocks until the first transaction ends),
 *  (4) CHECK constraints as a last line of defence.
 */
export async function confirmOrder(pool: pg.Pool, cmd: ConfirmOrderCommand): Promise<ConfirmOrderResult> {
  const c = await pool.connect();
  const requestHash = hashRequest(cmd);
  const correlationId = cmd.correlationId ?? randomUUID();
  try {
    await c.query('BEGIN');

    const ins = await c.query(
      `INSERT INTO domain.idempotency_keys(scope, key, request_hash) VALUES ($1,$2,$3)
       ON CONFLICT (scope, key) DO NOTHING RETURNING key`,
      [SCOPE_CONFIRM, cmd.idempotencyKey, requestHash],
    );
    if (ins.rowCount === 0) {
      const prev = await c.query(`SELECT request_hash, result FROM domain.idempotency_keys WHERE scope=$1 AND key=$2`, [
        SCOPE_CONFIRM,
        cmd.idempotencyKey,
      ]);
      await c.query('ROLLBACK');
      const row = prev.rows[0];
      if (!row || row.request_hash !== requestHash) throw new IdempotencyKeyReuseError('idempotency key reused with a different payload');
      if (row.result) return row.result as ConfirmOrderResult;
      // committed key without result cannot happen (result is written in the same tx); treat as conflict
      return { outcome: 'CONFLICT', orderId: cmd.orderId, reason: 'status' };
    }

    const o = await c.query(`SELECT id, status, revision FROM domain.orders WHERE id=$1 FOR UPDATE`, [cmd.orderId]);
    if (o.rowCount === 0) {
      await c.query('ROLLBACK');
      return { outcome: 'CONFLICT', orderId: cmd.orderId, reason: 'not_found' };
    }
    const order = o.rows[0];
    if (order.status !== 'PENDING_REVIEW') {
      await c.query('ROLLBACK');
      return { outcome: 'CONFLICT', orderId: cmd.orderId, reason: 'status' };
    }
    if (order.revision !== cmd.expectedRevision) {
      await c.query('ROLLBACK');
      return { outcome: 'CONFLICT', orderId: cmd.orderId, reason: 'revision' };
    }

    const lines = await c.query(`SELECT id, sku_id, qty FROM domain.order_lines WHERE order_id=$1 ORDER BY sku_id, id`, [cmd.orderId]);
    const reservationIds: string[] = [];
    const ttl = cmd.reservationTtlSeconds ?? 3 * 24 * 3600;
    for (const line of lines.rows) {
      const upd = await c.query(
        `UPDATE domain.stock_levels SET reserved = reserved + $3
          WHERE sku_id=$1 AND location_id=$2 AND on_hand - reserved - allocated >= $3
          RETURNING on_hand, reserved, allocated`,
        [line.sku_id, 'MAIN', line.qty],
      );
      if (upd.rowCount === 0) {
        await c.query('ROLLBACK');
        return { outcome: 'OUT_OF_STOCK', orderId: cmd.orderId, skuId: line.sku_id };
      }
      const rid = randomUUID();
      reservationIds.push(rid);
      await c.query(
        `INSERT INTO domain.reservations(id, order_line_id, sku_id, location_id, qty, status, expires_at)
         VALUES ($1,$2,$3,'MAIN',$4,'ACTIVE', now() + make_interval(secs => $5))`,
        [rid, line.id, line.sku_id, line.qty, ttl],
      );
      await c.query(
        `INSERT INTO domain.inventory_ledger(sku_id, location_id, type, qty, reference_type, reference_id, actor, correlation_id)
         VALUES ($1,'MAIN','RESERVE',$2,'reservation',$3,$4,$5)`,
        [line.sku_id, line.qty, rid, cmd.approvedBy, correlationId],
      );
    }

    if (cmd.failAfterReserve) throw new InjectedFaultError('injected fault after reserve, before commit');

    const newRev = order.revision + 1;
    await c.query(
      `UPDATE domain.orders SET status='CONFIRMED', revision=$2, confirmed_at=now(), confirmed_by=$3 WHERE id=$1`,
      [cmd.orderId, newRev, cmd.approvedBy],
    );
    await audit(c, {
      actorType: 'user',
      actorId: cmd.approvedBy,
      action: 'order.confirm',
      entityType: 'order',
      entityId: cmd.orderId,
      before: { status: 'PENDING_REVIEW', revision: order.revision },
      after: { status: 'CONFIRMED', revision: newRev, reservationIds },
      correlationId,
    });
    const result: ConfirmOrderResult = { outcome: 'CONFIRMED', orderId: cmd.orderId, reservationIds, revision: newRev };
    // Return the stored (JSONB-canonical) representation so the first caller and every replay receive byte-identical bodies.
    const stored = await c.query(`UPDATE domain.idempotency_keys SET result=$3 WHERE scope=$1 AND key=$2 RETURNING result`, [
      SCOPE_CONFIRM,
      cmd.idempotencyKey,
      result,
    ]);
    await c.query('COMMIT');
    return stored.rows[0].result as ConfirmOrderResult;
  } catch (err) {
    try {
      await c.query('ROLLBACK');
    } catch {
      /* connection may already be aborted */
    }
    throw err;
  } finally {
    c.release();
  }
}

/**
 * Release expired ACTIVE reservations. Safe to run concurrently / twice:
 * candidates are locked with SKIP LOCKED and the status transition is guarded.
 */
export async function releaseExpiredReservations(pool: pg.Pool, actor = 'job:reservation-expiry', correlationId = randomUUID()): Promise<number> {
  const c = await pool.connect();
  let released = 0;
  try {
    await c.query('BEGIN');
    const due = await c.query(
      `SELECT r.id, r.sku_id, r.location_id, r.qty, l.order_id
         FROM domain.reservations r JOIN domain.order_lines l ON l.id = r.order_line_id
        WHERE r.status='ACTIVE' AND r.expires_at < now()
        ORDER BY r.id FOR UPDATE OF r SKIP LOCKED`,
    );
    for (const r of due.rows) {
      const g = await c.query(`UPDATE domain.reservations SET status='RELEASED', released_at=now() WHERE id=$1 AND status='ACTIVE'`, [r.id]);
      if (g.rowCount !== 1) continue;
      await c.query(`UPDATE domain.stock_levels SET reserved = reserved - $3 WHERE sku_id=$1 AND location_id=$2`, [r.sku_id, r.location_id, r.qty]);
      await c.query(
        `INSERT INTO domain.inventory_ledger(sku_id, location_id, type, qty, reference_type, reference_id, actor, reason, correlation_id)
         VALUES ($1,$2,'RELEASE',$3,'reservation',$4,$5,'expired',$6)`,
        [r.sku_id, r.location_id, r.qty, r.id, actor, correlationId],
      );
      await c.query(`UPDATE domain.orders SET status='EXPIRED', revision = revision + 1 WHERE id=$1 AND status='CONFIRMED'`, [r.order_id]);
      await audit(c, { actorType: 'system', actorId: actor, action: 'reservation.release', entityType: 'reservation', entityId: r.id, reason: 'expired', correlationId });
      released++;
    }
    await c.query('COMMIT');
    return released;
  } catch (err) {
    await c.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    c.release();
  }
}
