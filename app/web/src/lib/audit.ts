import { randomUUID } from 'node:crypto';
import type { PayloadRequest } from 'payload';
import { domainDb } from './server.ts';

/**
 * Append-only audit row for CMS-side decisions (workflow, consent, claims, stage, role), written to the same
 * `domain.audit_events` trail as transactional actions (UPDATE/DELETE revoked from the application role, trigger-protected).
 * LIMITATION: separate connection → not in the same transaction as Payload's write (documented).
 */
export async function auditRow(req: PayloadRequest | undefined, action: string, entityType: string, entityId: string | number, before: unknown, after: unknown) {
  const cid = req?.headers?.get?.('x-correlation-id')?.slice(0, 80) || randomUUID();
  await domainDb().query(
    `INSERT INTO domain.audit_events(actor_type, actor_id, action, entity_type, entity_id, before, after, correlation_id) VALUES ('user',$1,$2,$3,$4,$5,$6,$7)`,
    [String(req?.user?.id ?? 'system'), action, entityType, String(entityId), before === undefined ? null : JSON.stringify(before), after === undefined ? null : JSON.stringify(after), cid],
  );
}
