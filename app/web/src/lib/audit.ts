import { randomUUID } from 'node:crypto';
import type { PayloadRequest } from 'payload';
import { afterCommit } from './after-commit.ts';
import { domainDb } from './server.ts';

/**
 * The one audit writer for the web layer (audit 2026-11-18, AI7-01 / X-04). Rows go to the append-only
 * `domain.audit_events` trail (UPDATE/DELETE revoked from the application role, trigger-protected).
 *
 * - `auditChange` (and `auditRow`, kept for existing call sites) records an admin CHANGE. Inside a Payload save the row
 *   is written only when that save's transaction commits, so a failed or rolled-back change leaves no audit row, and a
 *   successful one leaves exactly one. (The trail lives in the domain schema, which the CMS role cannot write, so the
 *   row cannot share Payload's own connection; it follows the commit instead.)
 * - `writeAudit` records an EVENT at once, also when the operation then fails (for example a refused sign-in).
 * - The actor type is explicit: 'user' with a signed-in user, otherwise 'system' (cron, retention), or as given.
 * - One correlation id per request: the caller's x-correlation-id, or one generated once and reused.
 */
export type AuditEvent = {
  action: string;
  entityType: string;
  entityId: string | number;
  before?: unknown;
  after?: unknown;
  actorType?: 'user' | 'system' | 'anonymous';
  actorId?: string;
};

export function correlationId(req?: PayloadRequest): string {
  if (!req) return randomUUID();
  const context = (req.context ??= {}) as Record<string, unknown>;
  if (typeof context.correlationId !== 'string') context.correlationId = req.headers?.get?.('x-correlation-id')?.slice(0, 80) || randomUUID();
  return context.correlationId as string;
}

export async function writeAudit(req: PayloadRequest | undefined, e: AuditEvent): Promise<void> {
  const userId = req?.user?.id;
  const actorType = e.actorType ?? (userId !== undefined ? 'user' : 'system');
  const actorId = e.actorId ?? (userId !== undefined ? String(userId) : actorType);
  await domainDb().query(
    `INSERT INTO domain.audit_events(actor_type, actor_id, action, entity_type, entity_id, before, after, correlation_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [actorType, actorId, e.action, e.entityType, String(e.entityId), e.before === undefined ? null : JSON.stringify(e.before), e.after === undefined ? null : JSON.stringify(e.after), correlationId(req)],
  );
}

export async function auditChange(req: PayloadRequest | undefined, e: AuditEvent): Promise<void> {
  // no transaction (a custom endpoint): write now, and let a failure reach the caller as before
  if (!req?.transactionID) return writeAudit(req, e);
  correlationId(req); // fix the id while the request is still in hand
  await afterCommit(req, async () => {
    try {
      await writeAudit(req, e);
    } catch (error) {
      // The change is already committed: report the lost audit row loudly instead of failing a done request.
      console.error(`[audit] could not write "${e.action}" for ${e.entityType} ${e.entityId} after the commit`, error);
    }
  });
}

/** An admin change (see auditChange). */
export async function auditRow(req: PayloadRequest | undefined, action: string, entityType: string, entityId: string | number, before: unknown, after: unknown) {
  return auditChange(req, { action, entityType, entityId, before, after });
}
