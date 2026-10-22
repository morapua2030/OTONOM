// W1 warranty portal + service foundation (behind the PREVIEW/COMMERCIAL gate in the web layer).
// Rules: customers only ever see devices they verifiably own (IDOR-safe: every query is scoped by the server-side
// customer reference); no warranty dates are shown unless an OWNER-approved policy produced them; no automatic
// warranty decisions — staff decide with a written reason.
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type pg from 'pg';
import { randomRef } from './commerce.ts';
import { checkOrderToken } from './orders.ts';
import { audit, DomainError, tx, type Ctx } from './tx.ts';
import { coverageStatus, normalizeSerial } from './warranty.ts';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const claimCode = () => {
  const s = Array.from(randomBytes(10), (b) => B32[b % 32]).join('');
  return `${s.slice(0, 5)}-${s.slice(5)}`;
};
const normCode = (s: string) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const requestHash = (value: unknown) => sha(JSON.stringify(value));
const equalHash = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

async function outbox(c: pg.PoolClient, aggregateType: 'TICKET' | 'RMA' | 'OWNERSHIP', aggregateId: string, eventType: string, dedupeKey: string) {
  await c.query(
    `INSERT INTO domain.service_outbox(id, aggregate_type, aggregate_id, event_type, locale, payload, dedupe_key)
     VALUES ($1,$2,$3,$4,'en',$5,$6) ON CONFLICT (dedupe_key) DO NOTHING`,
    [randomUUID(), aggregateType, aggregateId, eventType, JSON.stringify({ previewOnly: true }), dedupeKey],
  );
}

/** The only accepted customer identity: derived server-side from the authenticated session. */
export const customerRef = (userId: string | number) => `user:${userId}`;

// ---------- commissioning ----------
export async function recordCommissioning(
  pool: pg.Pool,
  ctx: Ctx,
  i: { serial: string; projectRef?: string; installedAt: string; commissionedAt: string; technician: string; checklist?: Record<string, unknown> },
) {
  if (Number.isNaN(Date.parse(i.installedAt)) || Number.isNaN(Date.parse(i.commissionedAt))) throw new DomainError('INVALID_DATE');
  if (!String(i.technician ?? '').trim()) throw new DomainError('TECHNICIAN_REQUIRED');
  const serial = normalizeSerial(i.serial);
  return tx(pool, async (c) => {
    const s = (await c.query(`SELECT status FROM domain.serial_units WHERE serial=$1 FOR UPDATE`, [serial])).rows[0];
    if (!s) throw new DomainError('NOT_FOUND');
    if (s.status === 'COMMISSIONED') throw new DomainError('ALREADY_COMMISSIONED');
    if (!['IN_STOCK', 'SHIPPED', 'INSTALLED'].includes(s.status)) throw new DomainError('INVALID_STATE');
    const code = claimCode();
    try {
      await c.query(
        `INSERT INTO domain.commissioning_records(id, serial, project_ref, installed_at, commissioned_at, technician, checklist, claim_code_hash, recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [randomUUID(), serial, i.projectRef ?? null, i.installedAt, i.commissionedAt, i.technician, JSON.stringify(i.checklist ?? {}), sha(normCode(code)), ctx.actor.id],
      );
    } catch (e: any) {
      if (e?.code === '23505') throw new DomainError('ALREADY_COMMISSIONED');
      if (e?.code === '23514') throw new DomainError('INVALID_DATE');
      throw e;
    }
    await c.query(`UPDATE domain.serial_units SET status='COMMISSIONED' WHERE serial=$1`, [serial]);
    await audit(c, ctx, { action: 'serial.commission', entityType: 'serial', entityId: serial, before: { status: s.status }, after: { status: 'COMMISSIONED', projectRef: i.projectRef ?? null } });
    // the code is shown ONCE to staff to hand to the resident; only its hash is stored
    return { serial, claimCode: code };
  });
}

// ---------- device ownership ----------
export type DeviceClaimInput = { serial: string; orderRef?: string; orderToken?: string; commissioningCode?: string; evidence?: string };

/**
 * Register a device to the signed-in customer. Proof: (a) website order ref + access token for an order that shipped this
 * serial, or (b) the one-time commissioning code; otherwise a PENDING claim for staff review (evidence text required).
 * Every failure returns the same CLAIM_NOT_ACCEPTED (no serial/ownership oracle).
 */
export async function claimDevice(pool: pg.Pool, ctx: Ctx, i: DeviceClaimInput) {
  const cust = ctx.actor.id;
  if (!cust.startsWith('user:')) throw new DomainError('UNAUTHENTICATED');
  let serial: string;
  try { serial = normalizeSerial(i.serial); } catch { throw new DomainError('CLAIM_NOT_ACCEPTED'); }
  return tx(pool, async (c) => {
    const s = (await c.query(`SELECT serial, status FROM domain.serial_units WHERE serial=$1 FOR UPDATE`, [serial])).rows[0];
    if (!s) throw new DomainError('CLAIM_NOT_ACCEPTED');
    const verifiedOwner = (await c.query(`SELECT customer_ref FROM domain.device_ownerships WHERE serial=$1 AND status='VERIFIED'`, [serial])).rows[0];
    if (verifiedOwner) {
      if (verifiedOwner.customer_ref === cust) return { status: 'VERIFIED', replay: true };
      throw new DomainError('CLAIM_NOT_ACCEPTED');
    }
    let method: 'ORDER_TOKEN' | 'COMMISSIONING_CODE' | 'STAFF_REVIEW' = 'STAFF_REVIEW';
    if (i.orderRef && i.orderToken) {
      const o = (await c.query(
        `SELECT o.id FROM domain.orders o JOIN domain.order_lines l ON l.order_id = o.id JOIN domain.serial_units u ON u.order_line_id = l.id
          WHERE o.ref=$1 AND u.serial=$2 AND o.status IN ('SHIPPED','COMPLETED')`,
        [i.orderRef, serial],
      )).rows[0];
      if (!o || !checkOrderToken(o.id, i.orderToken)) throw new DomainError('CLAIM_NOT_ACCEPTED');
      method = 'ORDER_TOKEN';
    } else if (i.commissioningCode) {
      const r = await c.query(`UPDATE domain.commissioning_records SET claim_code_hash=NULL WHERE serial=$1 AND claim_code_hash=$2 RETURNING id`, [serial, sha(normCode(i.commissioningCode))]);
      if (!r.rowCount) throw new DomainError('CLAIM_NOT_ACCEPTED');
      method = 'COMMISSIONING_CODE';
    } else if (String(i.evidence ?? '').trim().length < 20) {
      throw new DomainError('EVIDENCE_REQUIRED');
    }
    const status = method === 'STAFF_REVIEW' ? 'PENDING' : 'VERIFIED';
    const id = randomUUID();
    try {
      await c.query(
        `INSERT INTO domain.device_ownerships(id, serial, customer_ref, status, method, evidence, decided_by, decided_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, serial, cust, status, method, i.evidence ?? null, status === 'VERIFIED' ? 'system:' + method.toLowerCase() : null, status === 'VERIFIED' ? new Date().toISOString() : null],
      );
    } catch (e: any) {
      if (e?.code === '23505') throw new DomainError('CLAIM_NOT_ACCEPTED'); // concurrent claim or duplicate pending claim
      throw e;
    }
    await audit(c, ctx, { action: 'device.claim', entityType: 'device_ownership', entityId: id, after: { serial, status, method } });
    await outbox(c, 'OWNERSHIP', id, status === 'VERIFIED' ? 'OWNERSHIP_VERIFIED' : 'OWNERSHIP_REVIEW_REQUESTED', `ownership:${id}:${status}`);
    return { status };
  });
}

/** Two-party ownership transfer. The acceptance token is returned once and only its hash is stored. */
export async function requestOwnershipTransfer(pool: pg.Pool, ctx: Ctx, serialValue: string, toCustomerRef: string, ttlMinutes = 60) {
  const serial = normalizeSerial(serialValue);
  const from = ctx.actor.id;
  if (!/^user:[A-Za-z0-9_-]{1,80}$/.test(from) || !/^user:[A-Za-z0-9_-]{1,80}$/.test(toCustomerRef) || from === toCustomerRef) throw new DomainError('TRANSFER_NOT_ACCEPTED');
  if (!Number.isInteger(ttlMinutes) || ttlMinutes < 5 || ttlMinutes > 24 * 60) throw new DomainError('INVALID_EXPIRY');
  return tx(pool, async (c) => {
    const owner = (await c.query(`SELECT id FROM domain.device_ownerships WHERE serial=$1 AND customer_ref=$2 AND status='VERIFIED' FOR UPDATE`, [serial, from])).rows[0];
    if (!owner) throw new DomainError('TRANSFER_NOT_ACCEPTED');
    await c.query(`UPDATE domain.ownership_transfers SET status='EXPIRED', token_hash='' WHERE serial=$1 AND status='PENDING' AND expires_at <= now()`, [serial]);
    const id = randomUUID();
    const token = claimCode();
    try {
      await c.query(
        `INSERT INTO domain.ownership_transfers(id, serial, from_customer_ref, to_customer_ref, token_hash, status, expires_at)
         VALUES ($1,$2,$3,$4,$5,'PENDING',now() + make_interval(mins => $6))`,
        [id, serial, from, toCustomerRef, sha(normCode(token)), ttlMinutes],
      );
    } catch (e: any) {
      if (e?.code === '23505') throw new DomainError('TRANSFER_ALREADY_PENDING');
      throw e;
    }
    await audit(c, ctx, { action: 'device.transfer_requested', entityType: 'ownership_transfer', entityId: id, after: { serial, toCustomerRef } });
    return { id, token, expiresInMinutes: ttlMinutes };
  });
}

export async function acceptOwnershipTransfer(pool: pg.Pool, ctx: Ctx, transferId: string, token: string) {
  const recipient = ctx.actor.id;
  if (!recipient.startsWith('user:')) throw new DomainError('TRANSFER_NOT_ACCEPTED');
  return tx(pool, async (c) => {
    const transfer = (await c.query(`SELECT * FROM domain.ownership_transfers WHERE id=$1 FOR UPDATE`, [transferId])).rows[0];
    if (!transfer || transfer.status !== 'PENDING' || transfer.to_customer_ref !== recipient || transfer.expires_at <= new Date() || !equalHash(transfer.token_hash, sha(normCode(token))))
      throw new DomainError('TRANSFER_NOT_ACCEPTED');
    const revoked = await c.query(
      `UPDATE domain.device_ownerships SET status='REVOKED', decided_by=$3, decided_at=now()
       WHERE serial=$1 AND customer_ref=$2 AND status='VERIFIED' RETURNING id`,
      [transfer.serial, transfer.from_customer_ref, recipient],
    );
    if (!revoked.rowCount) throw new DomainError('TRANSFER_NOT_ACCEPTED');
    const ownershipId = randomUUID();
    await c.query(
      `INSERT INTO domain.device_ownerships(id, serial, customer_ref, status, method, evidence, decided_by, decided_at)
       VALUES ($1,$2,$3,'VERIFIED','TRANSFER','two-party transfer',$3,now())`,
      [ownershipId, transfer.serial, recipient],
    );
    await c.query(`UPDATE domain.ownership_transfers SET status='ACCEPTED', accepted_at=now(), token_hash='' WHERE id=$1`, [transferId]);
    await audit(c, ctx, { action: 'device.transfer_accepted', entityType: 'ownership_transfer', entityId: transferId, after: { serial: transfer.serial } });
    await outbox(c, 'OWNERSHIP', transferId, 'OWNERSHIP_TRANSFERRED', `ownership-transfer:${transferId}:accepted`);
    return { status: 'ACCEPTED', serial: transfer.serial };
  });
}

export async function decideOwnership(pool: pg.Pool, ctx: Ctx, ownershipId: string, decision: 'VERIFIED' | 'REJECTED', reason: string) {
  if (!['VERIFIED', 'REJECTED'].includes(decision)) throw new DomainError('INVALID_DECISION');
  if (!String(reason ?? '').trim()) throw new DomainError('REASON_REQUIRED');
  return tx(pool, async (c) => {
    const o = (await c.query(`SELECT serial, status FROM domain.device_ownerships WHERE id=$1 FOR UPDATE`, [ownershipId])).rows[0];
    if (!o) throw new DomainError('NOT_FOUND');
    if (o.status !== 'PENDING') throw new DomainError('INVALID_STATE');
    try {
      await c.query(`UPDATE domain.device_ownerships SET status=$2, decided_by=$3, decided_at=now(), evidence=coalesce(evidence,'') || $4 WHERE id=$1`, [ownershipId, decision, ctx.actor.id, `\n[decision] ${reason}`]);
    } catch (e: any) {
      if (e?.code === '23505') throw new DomainError('DEVICE_ALREADY_REGISTERED');
      throw e;
    }
    await audit(c, ctx, { action: 'device.ownership_decision', entityType: 'device_ownership', entityId: ownershipId, after: { status: decision }, reason });
    return { status: decision };
  });
}

/** The customer's own devices. Coverage end dates are shown only when a coverage row exists (approved policy). */
export async function listMyDevices(pool: pg.Pool, cust: string) {
  const rows = (await pool.query(
    `SELECT d.serial, u.status AS unit_status, s.code AS sku_code, s.model, cr.commissioned_at,
            cov.status AS coverage_status, cov.starts_at AS coverage_starts_at, cov.ends_at AS coverage_ends_at
       FROM domain.device_ownerships d JOIN domain.serial_units u ON u.serial = d.serial JOIN domain.skus s ON s.id = u.sku_id
       LEFT JOIN domain.commissioning_records cr ON cr.serial = d.serial
       LEFT JOIN LATERAL (
         SELECT status, starts_at, ends_at FROM domain.warranty_coverage w
          WHERE w.serial=d.serial ORDER BY starts_at DESC NULLS LAST LIMIT 1
       ) cov ON true
      WHERE d.customer_ref = $1 AND d.status = 'VERIFIED' ORDER BY d.created_at`,
    [cust],
  )).rows;
  return rows.map((r) => {
    const coverage = !r.coverage_status
      ? 'NO_COVERAGE_RECORD'
      : r.coverage_status === 'COVERAGE_ACTIVE' && r.coverage_ends_at && new Date(r.coverage_ends_at) < new Date()
        ? 'COVERAGE_EXPIRED'
        : r.coverage_status;
    const dated = coverage === 'COVERAGE_ACTIVE' || coverage === 'COVERAGE_EXPIRED';
    return {
      serial: r.serial,
      skuCode: r.sku_code,
      model: r.model,
      commissionedAt: r.commissioned_at,
      coverage,
      // never an invented date: only dates computed from an approved policy
      coverageStartsAt: dated ? r.coverage_starts_at : null,
      coverageEndsAt: dated ? r.coverage_ends_at : null,
    };
  });
}

const ownsVerified = async (c: pg.Pool | pg.PoolClient, cust: string, serial: string) =>
  !!(await c.query(`SELECT 1 FROM domain.device_ownerships WHERE customer_ref=$1 AND serial=$2 AND status='VERIFIED'`, [cust, serial])).rowCount;

// ---------- service tickets ----------
export const TICKET_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['TRIAGE', 'CLOSED'],
  TRIAGE: ['IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED'],
  IN_PROGRESS: ['WAITING_CUSTOMER', 'RESOLVED'],
  WAITING_CUSTOMER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
};

export async function openTicket(pool: pg.Pool, ctx: Ctx, i: { serial: string; category: string; description: string; idempotencyKey?: string }) {
  const cust = ctx.actor.id;
  if (!['FAULT', 'CONFIGURATION', 'INSTALLATION', 'SAFETY', 'OTHER'].includes(i.category)) throw new DomainError('INVALID_CATEGORY');
  const safety = i.category === 'SAFETY';
  const description = String(i.description ?? '').trim();
  if (description.length < 20) throw new DomainError('DESCRIPTION_TOO_SHORT');
  if (description.length > 4000) throw new DomainError('DESCRIPTION_TOO_LONG');
  let serial: string;
  try { serial = normalizeSerial(i.serial); } catch { throw new DomainError('NOT_FOUND'); }
  const idempotencyKey = i.idempotencyKey ? String(i.idempotencyKey).trim() : null;
  if (idempotencyKey && !/^[A-Za-z0-9._:-]{12,128}$/.test(idempotencyKey)) throw new DomainError('INVALID_IDEMPOTENCY_KEY');
  const hash = requestHash({ serial, category: i.category, description });
  return tx(pool, async (c) => {
    if (idempotencyKey) {
      const prior = (await c.query(`SELECT ref, status, priority, request_hash FROM domain.service_tickets WHERE customer_ref=$1 AND idempotency_key=$2`, [cust, idempotencyKey])).rows[0];
      if (prior) {
        if (prior.request_hash !== hash) throw new DomainError('IDEMPOTENCY_KEY_REUSED');
        return { ref: prior.ref, status: prior.status, ...(prior.priority === 'URGENT' ? { priority: 'URGENT', safetyGuidance: 'ISOLATE_POWER_CALL_EMERGENCY_SERVICES_AWAIT_CALLBACK', emergencyService: false } : {}), replay: true };
      }
    }
    // IDOR guard: only for a device the signed-in customer verifiably owns; same answer as "unknown serial"
    if (!(await ownsVerified(c, cust, serial))) throw new DomainError('NOT_FOUND');
    const id = randomUUID();
    const ref = randomRef('SRV');
    // W-08: safety-related problems go straight to TRIAGE as URGENT and require a human callback before resolution
    const status = safety ? 'TRIAGE' : 'OPEN';
    const inserted = await c.query(
      `INSERT INTO domain.service_tickets(id, ref, serial, customer_ref, category, description, status, priority, idempotency_key, request_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (customer_ref,idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING RETURNING id`,
      [id, ref, serial, cust, i.category, description, status, safety ? 'URGENT' : 'NORMAL', idempotencyKey, hash],
    );
    if (!inserted.rowCount) {
      const prior = (await c.query(`SELECT ref,status,priority,request_hash FROM domain.service_tickets WHERE customer_ref=$1 AND idempotency_key=$2`, [cust, idempotencyKey])).rows[0];
      if (!prior || prior.request_hash !== hash) throw new DomainError('IDEMPOTENCY_KEY_REUSED');
      return { ref: prior.ref, status: prior.status, ...(prior.priority === 'URGENT' ? { priority: 'URGENT', safetyGuidance: 'ISOLATE_POWER_CALL_EMERGENCY_SERVICES_AWAIT_CALLBACK', emergencyService: false } : {}), replay: true };
    }
    await c.query(`INSERT INTO domain.service_ticket_events(ticket_id,event_type,actor,to_status,note,revision) VALUES ($1,'OPENED',$2,$3,$4,1)`, [id, cust, status, description]);
    await audit(c, ctx, { action: safety ? 'ticket.safety_escalation' : 'ticket.open', entityType: 'service_ticket', entityId: id, after: { ref, serial, category: i.category, priority: safety ? 'URGENT' : 'NORMAL' } });
    await outbox(c, 'TICKET', id, 'TICKET_OPENED', `ticket:${id}:opened`);
    // the guidance code is rendered as localized text by the UI: isolate power at the breaker, keep away, call emergency
    // services for gas/fire; OTONOM will call back. The website is not an emergency service.
    return safety ? { ref, status, priority: 'URGENT', safetyGuidance: 'ISOLATE_POWER_CALL_EMERGENCY_SERVICES_AWAIT_CALLBACK', emergencyService: false } : { ref, status };
  });
}

/** Staff records the human callback for an urgent (safety) ticket. */
export async function recordCallback(pool: pg.Pool, ctx: Ctx, ticketId: string, note: string) {
  if (!String(note ?? '').trim() || String(note).trim().length > 2000) throw new DomainError('NOTE_REQUIRED');
  return tx(pool, async (c) => {
    const t = (await c.query(`SELECT priority, revision FROM domain.service_tickets WHERE id=$1 FOR UPDATE`, [ticketId])).rows[0];
    if (!t) throw new DomainError('NOT_FOUND');
    await c.query(`UPDATE domain.service_tickets SET callback_done_at=now(), callback_by=$2, updated_at=now(), revision=revision+1 WHERE id=$1`, [ticketId, ctx.actor.id]);
    await c.query(`INSERT INTO domain.service_ticket_events(ticket_id,event_type,actor,note,revision) VALUES ($1,'CALLBACK',$2,$3,$4)`, [ticketId, ctx.actor.id, note.trim(), t.revision + 1]);
    await audit(c, ctx, { action: 'ticket.callback', entityType: 'service_ticket', entityId: ticketId, after: { priority: t.priority }, reason: note });
    return { callbackRecorded: true };
  });
}

export async function listMyTickets(pool: pg.Pool, cust: string, limit = 50) {
  const bounded = Math.max(1, Math.min(100, Number.isInteger(limit) ? limit : 50));
  return (await pool.query(`SELECT ref, serial, category, priority, status, resolution, revision, created_at, updated_at FROM domain.service_tickets WHERE customer_ref=$1 ORDER BY created_at DESC LIMIT $2`, [cust, bounded])).rows;
}

/** Customer-safe timeline: status facts only; internal diagnosis, staff notes and identifiers stay redacted. */
export async function getMyTicketTimeline(pool: pg.Pool, cust: string, ref: string, limit = 100) {
  const bounded = Math.max(1, Math.min(100, Number.isInteger(limit) ? limit : 100));
  const ticket = (await pool.query(`SELECT id,ref,serial,category,priority,status,created_at,updated_at FROM domain.service_tickets WHERE customer_ref=$1 AND ref=$2`, [cust, ref])).rows[0];
  if (!ticket) throw new DomainError('NOT_FOUND');
  const events = (await pool.query(
    `SELECT event_type,from_status,to_status,revision,created_at FROM domain.service_ticket_events
      WHERE ticket_id=$1 AND event_type IN ('OPENED','STATUS_CHANGED','CALLBACK') ORDER BY id LIMIT $2`,
    [ticket.id, bounded],
  )).rows;
  const rma = (await pool.query(`SELECT ref,status,created_at,received_at,inspected_at FROM domain.rmas WHERE ticket_id=$1 ORDER BY created_at DESC LIMIT 1`, [ticket.id])).rows[0] ?? null;
  return { ticket: { ref: ticket.ref, serial: ticket.serial, category: ticket.category, priority: ticket.priority, status: ticket.status, createdAt: ticket.created_at, updatedAt: ticket.updated_at }, events, rma };
}

export async function updateTicket(pool: pg.Pool, ctx: Ctx, ticketId: string, i: { status: string; assignedTo?: string; resolution?: string; expectedRevision?: number }) {
  return tx(pool, async (c) => {
    const t = (await c.query(`SELECT status, revision, assigned_to FROM domain.service_tickets WHERE id=$1 FOR UPDATE`, [ticketId])).rows[0];
    if (!t) throw new DomainError('NOT_FOUND');
    if (i.expectedRevision !== undefined && i.expectedRevision !== t.revision) throw new DomainError('STALE_REVISION');
    if (!(TICKET_TRANSITIONS[t.status] ?? []).includes(i.status)) throw new DomainError('ILLEGAL_TRANSITION');
    if (['RESOLVED', 'CLOSED'].includes(i.status) && !String(i.resolution ?? '').trim()) {
      const existing = (await c.query(`SELECT resolution FROM domain.service_tickets WHERE id=$1`, [ticketId])).rows[0]?.resolution;
      if (!existing) throw new DomainError('RESOLUTION_REQUIRED');
    }
    try {
      await c.query(`UPDATE domain.service_tickets SET status=$2, assigned_to=coalesce($3, assigned_to), resolution=coalesce($4, resolution), updated_at=now(), last_transition_at=now(), revision=revision+1 WHERE id=$1 AND revision=$5`, [ticketId, i.status, i.assignedTo ?? null, i.resolution ?? null, t.revision]);
    } catch (e: any) {
      if (e?.constraint === 'safety_needs_callback') throw new DomainError('SAFETY_CALLBACK_REQUIRED');
      throw e;
    }
    await c.query(
      `INSERT INTO domain.service_ticket_events(ticket_id,event_type,actor,from_status,to_status,note,revision) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [ticketId, i.assignedTo && i.assignedTo !== t.assigned_to ? 'ASSIGNED' : 'STATUS_CHANGED', ctx.actor.id, t.status, i.status, i.resolution ?? null, t.revision + 1],
    );
    await audit(c, ctx, { action: 'ticket.status', entityType: 'service_ticket', entityId: ticketId, before: { status: t.status }, after: { status: i.status } });
    await outbox(c, 'TICKET', ticketId, 'TICKET_STATUS_CHANGED', `ticket:${ticketId}:revision:${t.revision + 1}`);
    return { status: i.status, revision: t.revision + 1 };
  });
}

/** Reassign a ticket without smuggling an unchanged status through the transition table. */
export async function assignTicket(
  pool: pg.Pool,
  ctx: Ctx,
  ticketId: string,
  i: { assignedTo: string; reason: string; expectedRevision: number },
) {
  const assignedTo = String(i.assignedTo ?? '').trim();
  const reason = String(i.reason ?? '').trim();
  if (!/^[a-zA-Z0-9:@._-]{2,120}$/.test(assignedTo)) throw new DomainError('INVALID_ASSIGNEE');
  if (reason.length < 10 || reason.length > 1000) throw new DomainError('REASON_REQUIRED');
  if (!Number.isInteger(i.expectedRevision) || i.expectedRevision < 1) throw new DomainError('INVALID_REVISION');
  return tx(pool, async (c) => {
    const ticket = (await c.query(`SELECT status, revision, assigned_to FROM domain.service_tickets WHERE id=$1 FOR UPDATE`, [ticketId])).rows[0];
    if (!ticket) throw new DomainError('NOT_FOUND');
    if (ticket.revision !== i.expectedRevision) throw new DomainError('STALE_REVISION');
    if (ticket.assigned_to === assignedTo) throw new DomainError('NO_CHANGE');
    const updated = await c.query(
      `UPDATE domain.service_tickets SET assigned_to=$2, revision=revision+1, updated_at=now()
        WHERE id=$1 AND revision=$3 RETURNING revision`,
      [ticketId, assignedTo, ticket.revision],
    );
    if (!updated.rowCount) throw new DomainError('STALE_REVISION');
    await c.query(
      `INSERT INTO domain.service_ticket_events(ticket_id,event_type,actor,from_status,to_status,note,revision)
       VALUES ($1,'ASSIGNED',$2,$3,$3,$4,$5)`,
      [ticketId, ctx.actor.id, ticket.status, reason, ticket.revision + 1],
    );
    await audit(c, ctx, {
      action: 'ticket.assigned',
      entityType: 'service_ticket',
      entityId: ticketId,
      before: { assignedTo: ticket.assigned_to },
      after: { assignedTo },
      reason,
    });
    return { assignedTo, revision: ticket.revision + 1 };
  });
}

export type StructuredDiagnosis = {
  observation: string;
  reproduction: string;
  hypothesis?: string;
  finalDiagnosis?: string;
  hardwareRevision?: string;
  softwareInfo?: string;
  diagnosticStatus: 'OBSERVED' | 'REPRODUCED' | 'HYPOTHESIS' | 'CONFIRMED' | 'INCONCLUSIVE';
  partsNote?: string;
};

const boundedDiagnosisText = (value: unknown, name: string, min: number, max: number, required = false) => {
  const text = String(value ?? '').trim();
  if ((required && text.length < min) || text.length > max) throw new DomainError(`INVALID_${name}`);
  return text;
};

/** Stores a stable structured envelope in the existing append-only diagnosis record. */
export async function recordStructuredDiagnosis(pool: pg.Pool, ctx: Ctx, ticketId: string, input: StructuredDiagnosis) {
  const allowed = new Set<StructuredDiagnosis['diagnosticStatus']>(['OBSERVED', 'REPRODUCED', 'HYPOTHESIS', 'CONFIRMED', 'INCONCLUSIVE']);
  if (!allowed.has(input.diagnosticStatus)) throw new DomainError('INVALID_DIAGNOSTIC_STATUS');
  const document = {
    schema: 'OTONOM_SERVICE_DIAGNOSIS_V1',
    diagnosticStatus: input.diagnosticStatus,
    observation: boundedDiagnosisText(input.observation, 'OBSERVATION', 10, 2000, true),
    reproduction: boundedDiagnosisText(input.reproduction, 'REPRODUCTION', 10, 2000, true),
    hypothesis: boundedDiagnosisText(input.hypothesis, 'HYPOTHESIS', 0, 2000) || null,
    finalDiagnosis: boundedDiagnosisText(input.finalDiagnosis, 'FINAL_DIAGNOSIS', 0, 2000) || null,
    hardwareRevision: boundedDiagnosisText(input.hardwareRevision, 'HARDWARE_REVISION', 0, 120) || null,
    softwareInfo: boundedDiagnosisText(input.softwareInfo, 'SOFTWARE_INFO', 0, 240) || null,
  };
  if (input.diagnosticStatus === 'CONFIRMED' && !document.finalDiagnosis) throw new DomainError('FINAL_DIAGNOSIS_REQUIRED');
  const partsNote = boundedDiagnosisText(input.partsNote, 'PARTS_NOTE', 0, 4000) || undefined;
  return recordDiagnosis(pool, ctx, ticketId, JSON.stringify(document), partsNote);
}

export async function recordDiagnosis(pool: pg.Pool, ctx: Ctx, ticketId: string, diagnosis: string, partsNote?: string) {
  const text = String(diagnosis ?? '').trim();
  if (text.length < 10 || text.length > 8000 || String(partsNote ?? '').length > 4000) throw new DomainError('DIAGNOSIS_REQUIRED');
  return tx(pool, async (c) => {
    const t = (await c.query(`SELECT status, revision FROM domain.service_tickets WHERE id=$1 FOR UPDATE`, [ticketId])).rows[0];
    if (!t) throw new DomainError('NOT_FOUND');
    if (!['TRIAGE','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED'].includes(t.status)) throw new DomainError('INVALID_STATE');
    const id = randomUUID();
    await c.query(`INSERT INTO domain.service_diagnoses(id,ticket_id,diagnosis,parts_note,recorded_by) VALUES ($1,$2,$3,$4,$5)`, [id, ticketId, text, partsNote?.trim() || null, ctx.actor.id]);
    await c.query(`UPDATE domain.service_tickets SET revision=revision+1, updated_at=now() WHERE id=$1`, [ticketId]);
    await c.query(`INSERT INTO domain.service_ticket_events(ticket_id,event_type,actor,note,revision) VALUES ($1,'DIAGNOSIS',$2,$3,$4)`, [ticketId, ctx.actor.id, text, t.revision + 1]);
    await audit(c, ctx, { action: 'ticket.diagnosis', entityType: 'service_ticket', entityId: ticketId, after: { diagnosisId: id } });
    return { id, revision: t.revision + 1 };
  });
}

// ---------- RMA ----------
export const RMA_TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['RECEIVED'],
  RECEIVED: ['INSPECTED'],
  INSPECTED: ['REPAIRED', 'REPLACED', 'REJECTED'],
  REPAIRED: ['RETURNED'],
  REPLACED: ['CLOSED'],
  REJECTED: ['RETURNED', 'CLOSED'],
  RETURNED: ['CLOSED'],
  CLOSED: [],
};

export async function openRma(pool: pg.Pool, ctx: Ctx, ticketId: string) {
  return tx(pool, async (c) => {
    const t = (await c.query(`SELECT id, serial, status FROM domain.service_tickets WHERE id=$1 FOR UPDATE`, [ticketId])).rows[0];
    if (!t) throw new DomainError('NOT_FOUND');
    if (['RESOLVED', 'CLOSED'].includes(t.status)) throw new DomainError('INVALID_STATE');
    const cov = await coverageStatus(c, t.serial);
    const id = randomUUID();
    const ref = randomRef('RMA');
    try {
      await c.query(`INSERT INTO domain.rmas(id, ref, ticket_id, serial, status, coverage_at_request, created_by) VALUES ($1,$2,$3,$4,'REQUESTED',$5,$6)`, [id, ref, t.id, t.serial, cov, ctx.actor.id]);
    } catch (e: any) {
      if (e?.code === '23505') throw new DomainError('RMA_ALREADY_OPEN');
      throw e;
    }
    await audit(c, ctx, { action: 'rma.open', entityType: 'rma', entityId: id, after: { ref, serial: t.serial, coverage: cov } });
    await outbox(c, 'RMA', id, 'RMA_REQUESTED', `rma:${id}:requested`);
    return { id, ref, coverageAtRequest: cov };
  });
}

export async function recordRmaInspection(
  pool: pg.Pool,
  ctx: Ctx,
  rmaId: string,
  i: { condition: 'UNOPENED' | 'FUNCTIONAL' | 'REPAIRABLE' | 'DAMAGED' | 'UNSAFE' | 'UNKNOWN'; serialMatches: boolean; notes: string },
) {
  if (!['UNOPENED','FUNCTIONAL','REPAIRABLE','DAMAGED','UNSAFE','UNKNOWN'].includes(i.condition)) throw new DomainError('INVALID_CONDITION');
  if (typeof i.serialMatches !== 'boolean' || String(i.notes ?? '').trim().length < 10 || String(i.notes).trim().length > 4000) throw new DomainError('INSPECTION_REQUIRED');
  return tx(pool, async (c) => {
    const r = (await c.query(`SELECT status, revision, serial FROM domain.rmas WHERE id=$1 FOR UPDATE`, [rmaId])).rows[0];
    if (!r) throw new DomainError('NOT_FOUND');
    if (r.status !== 'RECEIVED') throw new DomainError('INVALID_STATE');
    const id = randomUUID();
    try {
      await c.query(`INSERT INTO domain.rma_inspections(id,rma_id,condition,serial_matches,notes,inspected_by) VALUES ($1,$2,$3,$4,$5,$6)`, [id, rmaId, i.condition, i.serialMatches, i.notes.trim(), ctx.actor.id]);
    } catch (e: any) {
      if (e?.code === '23505') throw new DomainError('INSPECTION_ALREADY_RECORDED');
      throw e;
    }
    await audit(c, ctx, { action: 'rma.inspection_recorded', entityType: 'rma', entityId: rmaId, after: { condition: i.condition, serialMatches: i.serialMatches } });
    return { id, revision: r.revision };
  });
}

/** Records a reviewed action only. REFUND_REVIEW is not a payment or refund instruction. */
export async function recordRmaAction(
  pool: pg.Pool,
  ctx: Ctx,
  rmaId: string,
  action: 'REPAIR' | 'REFUND_REVIEW' | 'RETURN_TO_CUSTOMER' | 'QUARANTINE',
  note: string,
) {
  if (!['REPAIR','REFUND_REVIEW','RETURN_TO_CUSTOMER','QUARANTINE'].includes(action)) throw new DomainError('INVALID_ACTION');
  if (String(note ?? '').trim().length < 10 || String(note).trim().length > 4000) throw new DomainError('NOTE_REQUIRED');
  return tx(pool, async (c) => {
    const r = (await c.query(`SELECT status FROM domain.rmas WHERE id=$1 FOR UPDATE`, [rmaId])).rows[0];
    if (!r) throw new DomainError('NOT_FOUND');
    if (!['INSPECTED','REPAIRED','REJECTED'].includes(r.status)) throw new DomainError('INVALID_STATE');
    const id = randomUUID();
    await c.query(`INSERT INTO domain.rma_actions(id,rma_id,action,note,recorded_by) VALUES ($1,$2,$3,$4,$5)`, [id, rmaId, action, note.trim(), ctx.actor.id]);
    await audit(c, ctx, { action: `rma.action.${action.toLowerCase()}`, entityType: 'rma', entityId: rmaId, after: { actionId: id } });
    return { id, action };
  });
}

/**
 * RMA state machine. Approval/rejection needs a reason (never automatic, whatever the coverage status).
 * REPLACED: an IN_STOCK unit of the same SKU leaves stock (ledgered), the faulty unit becomes RETURNED, the history row is
 * append-only, and ownership moves to the replacement for the same customer. Coverage of the replacement is NOT created
 * automatically (policy decision pending).
 */
export async function rmaTransition(pool: pg.Pool, ctx: Ctx, rmaId: string, to: string, i: { reason?: string; replacementSerial?: string; expectedRevision?: number } = {}) {
  return tx(pool, async (c) => {
    const r = (await c.query(`SELECT * FROM domain.rmas WHERE id=$1 FOR UPDATE`, [rmaId])).rows[0];
    if (!r) throw new DomainError('NOT_FOUND');
    if (i.expectedRevision !== undefined && i.expectedRevision !== r.revision) throw new DomainError('STALE_REVISION');
    if (!(RMA_TRANSITIONS[r.status] ?? []).includes(to)) throw new DomainError('ILLEGAL_TRANSITION');
    if (['APPROVED', 'REJECTED'].includes(to) && !String(i.reason ?? '').trim()) throw new DomainError('REASON_REQUIRED');
    if (to === 'INSPECTED') {
      const inspection = await c.query(`SELECT 1 FROM domain.rma_inspections WHERE rma_id=$1`, [rmaId]);
      if (!inspection.rowCount) throw new DomainError('INSPECTION_REQUIRED');
    }
    if (to === 'REPAIRED') {
      const repair = await c.query(`SELECT 1 FROM domain.rma_actions WHERE rma_id=$1 AND action='REPAIR'`, [rmaId]);
      if (!repair.rowCount) throw new DomainError('REPAIR_ACTION_REQUIRED');
    }
    let replacement: string | null = null;
    if (to === 'REPLACED') {
      replacement = normalizeSerial(String(i.replacementSerial ?? ''));
      const old = (await c.query(`SELECT sku_id FROM domain.serial_units WHERE serial=$1`, [r.serial])).rows[0];
      if (!old) throw new DomainError('NOT_FOUND');
      const u = await c.query(`UPDATE domain.serial_units SET status='SHIPPED' WHERE serial=$1 AND sku_id=$2 AND status='IN_STOCK' RETURNING serial`, [replacement, old.sku_id]);
      if (!u.rowCount) throw new DomainError('REPLACEMENT_NOT_AVAILABLE');
      const st = await c.query(`UPDATE domain.stock_levels SET on_hand = on_hand - 1 WHERE sku_id=$1 AND location_id='MAIN' AND on_hand - reserved - allocated >= 1 RETURNING on_hand`, [old.sku_id]);
      if (!st.rowCount) throw new DomainError('REPLACEMENT_NOT_AVAILABLE');
      await c.query(`INSERT INTO domain.inventory_ledger(sku_id, location_id, type, qty, reference_type, reference_id, actor, reason, correlation_id) VALUES ($1,'MAIN','SHIP',1,'rma',$2,$3,'warranty replacement',$4)`, [old.sku_id, rmaId, ctx.actor.id, ctx.correlationId ?? randomUUID()]);
      await c.query(`UPDATE domain.serial_units SET status='QUARANTINED' WHERE serial=$1`, [r.serial]);
      await c.query(`INSERT INTO domain.serial_replacements(old_serial, new_serial, rma_id, replaced_by) VALUES ($1,$2,$3,$4)`, [r.serial, replacement, rmaId, ctx.actor.id]);
      await c.query(`INSERT INTO domain.rma_actions(id,rma_id,action,note,recorded_by) VALUES ($1,$2,'REPLACEMENT',$3,$4)`, [randomUUID(), rmaId, `replacement serial ${replacement}; original remains quarantined`, ctx.actor.id]);
      const own = (await c.query(`UPDATE domain.device_ownerships SET status='REVOKED', decided_by=$2, decided_at=now() WHERE serial=$1 AND status='VERIFIED' RETURNING customer_ref`, [r.serial, ctx.actor.id])).rows[0];
      if (own)
        await c.query(`INSERT INTO domain.device_ownerships(id, serial, customer_ref, status, method, evidence, decided_by, decided_at) VALUES ($1,$2,$3,'VERIFIED','REPLACEMENT',$4,$5,now())`, [randomUUID(), replacement, own.customer_ref, `replacement for ${r.serial} (${r.ref})`, ctx.actor.id]);
    }
    await c.query(
      `UPDATE domain.rmas SET status=$2, decision_reason=coalesce($3, decision_reason), replacement_serial=coalesce($4, replacement_serial),
         received_at=CASE WHEN $2='RECEIVED' THEN now() ELSE received_at END,
         inspected_at=CASE WHEN $2='INSPECTED' THEN now() ELSE inspected_at END,
         revision=revision+1 WHERE id=$1 AND revision=$5`,
      [rmaId, to, i.reason ?? null, replacement, r.revision],
    );
    if (to === 'RECEIVED') {
      await c.query(`UPDATE domain.serial_units SET status='QUARANTINED' WHERE serial=$1`, [r.serial]);
      await c.query(
        `INSERT INTO domain.inventory_ledger(sku_id,location_id,type,qty,reference_type,reference_id,actor,reason,correlation_id)
         SELECT sku_id,'QUARANTINE','RETURN_QUARANTINE',1,'rma',$2,$3,'received pending inspection',$4 FROM domain.serial_units WHERE serial=$1`,
        [r.serial, rmaId, ctx.actor.id, ctx.correlationId ?? randomUUID()],
      );
    }
    await audit(c, ctx, { action: `rma.${to.toLowerCase()}`, entityType: 'rma', entityId: rmaId, before: { status: r.status }, after: { status: to, replacement }, reason: i.reason });
    await outbox(c, 'RMA', rmaId, `RMA_${to}`, `rma:${rmaId}:revision:${r.revision + 1}`);
    return { status: to, replacementSerial: replacement, revision: r.revision + 1 };
  });
}

/** Replacement history of a unit (both directions), for staff and for the owning customer. */
export async function replacementHistory(pool: pg.Pool, serial: string) {
  return (await pool.query(`SELECT old_serial, new_serial, replaced_at FROM domain.serial_replacements WHERE old_serial=$1 OR new_serial=$1 ORDER BY id`, [serial])).rows;
}
