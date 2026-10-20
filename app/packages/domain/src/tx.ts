import { randomUUID } from 'node:crypto';
import type pg from 'pg';

export type Actor = { id: string; role: string };
export type Ctx = { actor: Actor; correlationId?: string };

export class DomainError extends Error {
  constructor(
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export async function tx<T>(pool: pg.Pool, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export async function audit(
  c: pg.PoolClient,
  ctx: Ctx,
  e: { action: string; entityType: string; entityId: string; before?: unknown; after?: unknown; reason?: string },
): Promise<void> {
  await c.query(
    `INSERT INTO domain.audit_events(actor_type, actor_id, action, entity_type, entity_id, before, after, reason, correlation_id)
     VALUES ('user',$1,$2,$3,$4,$5,$6,$7,$8)`,
    [ctx.actor.id, e.action, e.entityType, e.entityId, e.before ?? null, e.after ?? null, e.reason ?? null, ctx.correlationId ?? randomUUID()],
  );
}
