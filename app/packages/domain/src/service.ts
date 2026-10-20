// W1 warranty portal + service foundation (behind the PREVIEW/COMMERCIAL gate in the web layer).
// Rules: customers only ever see devices they verifiably own (IDOR-safe: every query is scoped by the server-side
// customer reference); no warranty dates are shown unless an OWNER-approved policy produced them; no automatic
// warranty decisions — staff decide with a written reason.
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { randomRef } from './commerce.ts';
import { checkOrderToken } from './orders.ts';
import { audit, DomainError, tx, type Ctx } from './tx.ts';
import { coverageStatus } from './warranty.ts';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const claimCode = () => {
  const s = Array.from(randomBytes(10), (b) => B32[b % 32]).join('');
  return `${s.slice(0, 5)}-${s.slice(5)}`;
};
const normCode = (s: string) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

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
  return tx(pool, async (c) => {
    const s = (await c.query(`SELECT status FROM domain.serial_units WHERE serial=$1 FOR UPDATE`, [i.serial])).rows[0];
    if (!s) throw new DomainError('NOT_FOUND');
    if (s.status === 'COMMISSIONED') throw new DomainError('ALREADY_COMMISSIONED');
    if (!['IN_STOCK', 'SHIPPED', 'INSTALLED'].includes(s.status)) throw new DomainError('INVALID_STATE');
    const code = claimCode();
    try {
      await c.query(
        `INSERT INTO domain.commissioning_records(id, serial, project_ref, installed_at, commissioned_at, technician, checklist, claim_code_hash, recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [randomUUID(), i.serial, i.projectRef ?? null, i.installedAt, i.commissionedAt, i.technician, JSON.stringify(i.checklist ?? {}), sha(normCode(code)), ctx.actor.id],
      );
    } catch (e: any) {
      if (e?.code === '23505') throw new DomainError('ALREADY_COMMISSIONED');
      if (e?.code === '23514') throw new DomainError('INVALID_DATE');
      throw e;
    }
    await c.query(`UPDATE domain.serial_units SET status='COMMISSIONED' WHERE serial=$1`, [i.serial]);
    await audit(c, ctx, { action: 'serial.commission', entityType: 'serial', entityId: i.serial, before: { status: s.status }, after: { status: 'COMMISSIONED', projectRef: i.projectRef ?? null } });
    // the code is shown ONCE to staff to hand to the resident; only its hash is stored
    return { serial: i.serial, claimCode: code };
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
  const serial = String(i.serial ?? '').trim().toUpperCase();
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
    return { status };
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
    `SELECT d.serial, u.status AS unit_status, s.code AS sku_code, s.model, cr.commissioned_at
       FROM domain.device_ownerships d JOIN domain.serial_units u ON u.serial = d.serial JOIN domain.skus s ON s.id = u.sku_id
       LEFT JOIN domain.commissioning_records cr ON cr.serial = d.serial
      WHERE d.customer_ref = $1 AND d.status = 'VERIFIED' ORDER BY d.created_at`,
    [cust],
  )).rows;
  const out = [];
  for (const r of rows) {
    const cov = await coverageStatus(pool, r.serial);
    const active = cov === 'COVERAGE_ACTIVE' || cov === 'COVERAGE_EXPIRED' ? (await pool.query(`SELECT starts_at, ends_at FROM domain.warranty_coverage WHERE serial=$1 ORDER BY starts_at DESC LIMIT 1`, [r.serial])).rows[0] : null;
    out.push({
      serial: r.serial,
      skuCode: r.sku_code,
      model: r.model,
      commissionedAt: r.commissioned_at,
      coverage: cov,
      // never an invented date: only dates computed from an approved policy
      coverageStartsAt: active?.starts_at ?? null,
      coverageEndsAt: active?.ends_at ?? null,
    });
  }
  return out;
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

export async function openTicket(pool: pg.Pool, ctx: Ctx, i: { serial: string; category: string; description: string }) {
  const cust = ctx.actor.id;
  if (!['FAULT', 'CONFIGURATION', 'INSTALLATION', 'SAFETY', 'OTHER'].includes(i.category)) throw new DomainError('INVALID_CATEGORY');
  const safety = i.category === 'SAFETY';
  if (String(i.description ?? '').trim().length < 20) throw new DomainError('DESCRIPTION_TOO_SHORT');
  return tx(pool, async (c) => {
    // IDOR guard: only for a device the signed-in customer verifiably owns; same answer as "unknown serial"
    if (!(await ownsVerified(c, cust, String(i.serial).toUpperCase()))) throw new DomainError('NOT_FOUND');
    const id = randomUUID();
    const ref = randomRef('SRV');
    // W-08: safety-related problems go straight to TRIAGE as URGENT and require a human callback before resolution
    const status = safety ? 'TRIAGE' : 'OPEN';
    await c.query(`INSERT INTO domain.service_tickets(id, ref, serial, customer_ref, category, description, status, priority) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [id, ref, String(i.serial).toUpperCase(), cust, i.category, i.description.trim(), status, safety ? 'URGENT' : 'NORMAL']);
    await audit(c, ctx, { action: safety ? 'ticket.safety_escalation' : 'ticket.open', entityType: 'service_ticket', entityId: id, after: { ref, serial: i.serial, category: i.category, priority: safety ? 'URGENT' : 'NORMAL' } });
    // the guidance code is rendered as localized text by the UI: isolate power at the breaker, keep away, call emergency
    // services for gas/fire; OTONOM will call back. The website is not an emergency service.
    return safety ? { ref, status, priority: 'URGENT', safetyGuidance: 'ISOLATE_POWER_CALL_EMERGENCY_SERVICES_AWAIT_CALLBACK', emergencyService: false } : { ref, status };
  });
}

/** Staff records the human callback for an urgent (safety) ticket. */
export async function recordCallback(pool: pg.Pool, ctx: Ctx, ticketId: string, note: string) {
  if (!String(note ?? '').trim()) throw new DomainError('NOTE_REQUIRED');
  return tx(pool, async (c) => {
    const t = (await c.query(`SELECT priority FROM domain.service_tickets WHERE id=$1 FOR UPDATE`, [ticketId])).rows[0];
    if (!t) throw new DomainError('NOT_FOUND');
    await c.query(`UPDATE domain.service_tickets SET callback_done_at=now(), callback_by=$2, updated_at=now() WHERE id=$1`, [ticketId, ctx.actor.id]);
    await audit(c, ctx, { action: 'ticket.callback', entityType: 'service_ticket', entityId: ticketId, after: { priority: t.priority }, reason: note });
    return { callbackRecorded: true };
  });
}

export async function listMyTickets(pool: pg.Pool, cust: string) {
  return (await pool.query(`SELECT ref, serial, category, priority, status, resolution, created_at, updated_at FROM domain.service_tickets WHERE customer_ref=$1 ORDER BY created_at DESC`, [cust])).rows;
}

export async function updateTicket(pool: pg.Pool, ctx: Ctx, ticketId: string, i: { status: string; assignedTo?: string; resolution?: string }) {
  return tx(pool, async (c) => {
    const t = (await c.query(`SELECT status FROM domain.service_tickets WHERE id=$1 FOR UPDATE`, [ticketId])).rows[0];
    if (!t) throw new DomainError('NOT_FOUND');
    if (!(TICKET_TRANSITIONS[t.status] ?? []).includes(i.status)) throw new DomainError('ILLEGAL_TRANSITION');
    if (['RESOLVED', 'CLOSED'].includes(i.status) && !String(i.resolution ?? '').trim()) {
      const existing = (await c.query(`SELECT resolution FROM domain.service_tickets WHERE id=$1`, [ticketId])).rows[0]?.resolution;
      if (!existing) throw new DomainError('RESOLUTION_REQUIRED');
    }
    try {
      await c.query(`UPDATE domain.service_tickets SET status=$2, assigned_to=coalesce($3, assigned_to), resolution=coalesce($4, resolution), updated_at=now() WHERE id=$1`, [ticketId, i.status, i.assignedTo ?? null, i.resolution ?? null]);
    } catch (e: any) {
      if (e?.constraint === 'safety_needs_callback') throw new DomainError('SAFETY_CALLBACK_REQUIRED');
      throw e;
    }
    await audit(c, ctx, { action: 'ticket.status', entityType: 'service_ticket', entityId: ticketId, before: { status: t.status }, after: { status: i.status } });
    return { status: i.status };
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
    return { id, ref, coverageAtRequest: cov };
  });
}

/**
 * RMA state machine. Approval/rejection needs a reason (never automatic, whatever the coverage status).
 * REPLACED: an IN_STOCK unit of the same SKU leaves stock (ledgered), the faulty unit becomes RETURNED, the history row is
 * append-only, and ownership moves to the replacement for the same customer. Coverage of the replacement is NOT created
 * automatically (policy decision pending).
 */
export async function rmaTransition(pool: pg.Pool, ctx: Ctx, rmaId: string, to: string, i: { reason?: string; replacementSerial?: string } = {}) {
  return tx(pool, async (c) => {
    const r = (await c.query(`SELECT * FROM domain.rmas WHERE id=$1 FOR UPDATE`, [rmaId])).rows[0];
    if (!r) throw new DomainError('NOT_FOUND');
    if (!(RMA_TRANSITIONS[r.status] ?? []).includes(to)) throw new DomainError('ILLEGAL_TRANSITION');
    if (['APPROVED', 'REJECTED'].includes(to) && !String(i.reason ?? '').trim()) throw new DomainError('REASON_REQUIRED');
    let replacement: string | null = null;
    if (to === 'REPLACED') {
      replacement = String(i.replacementSerial ?? '').toUpperCase();
      const old = (await c.query(`SELECT sku_id FROM domain.serial_units WHERE serial=$1`, [r.serial])).rows[0];
      const u = await c.query(`UPDATE domain.serial_units SET status='SHIPPED' WHERE serial=$1 AND sku_id=$2 AND status='IN_STOCK' RETURNING serial`, [replacement, old.sku_id]);
      if (!u.rowCount) throw new DomainError('REPLACEMENT_NOT_AVAILABLE');
      const st = await c.query(`UPDATE domain.stock_levels SET on_hand = on_hand - 1 WHERE sku_id=$1 AND location_id='MAIN' AND on_hand - reserved - allocated >= 1 RETURNING on_hand`, [old.sku_id]);
      if (!st.rowCount) throw new DomainError('REPLACEMENT_NOT_AVAILABLE');
      await c.query(`INSERT INTO domain.inventory_ledger(sku_id, location_id, type, qty, reference_type, reference_id, actor, reason, correlation_id) VALUES ($1,'MAIN','SHIP',1,'rma',$2,$3,'warranty replacement',$4)`, [old.sku_id, rmaId, ctx.actor.id, ctx.correlationId ?? randomUUID()]);
      await c.query(`UPDATE domain.serial_units SET status='RETURNED' WHERE serial=$1`, [r.serial]);
      await c.query(`INSERT INTO domain.serial_replacements(old_serial, new_serial, rma_id, replaced_by) VALUES ($1,$2,$3,$4)`, [r.serial, replacement, rmaId, ctx.actor.id]);
      const own = (await c.query(`UPDATE domain.device_ownerships SET status='REVOKED', decided_by=$2, decided_at=now() WHERE serial=$1 AND status='VERIFIED' RETURNING customer_ref`, [r.serial, ctx.actor.id])).rows[0];
      if (own)
        await c.query(`INSERT INTO domain.device_ownerships(id, serial, customer_ref, status, method, evidence, decided_by, decided_at) VALUES ($1,$2,$3,'VERIFIED','REPLACEMENT',$4,$5,now())`, [randomUUID(), replacement, own.customer_ref, `replacement for ${r.serial} (${r.ref})`, ctx.actor.id]);
    }
    await c.query(`UPDATE domain.rmas SET status=$2, decision_reason=coalesce($3, decision_reason), replacement_serial=coalesce($4, replacement_serial) WHERE id=$1`, [rmaId, to, i.reason ?? null, replacement]);
    await audit(c, ctx, { action: `rma.${to.toLowerCase()}`, entityType: 'rma', entityId: rmaId, before: { status: r.status }, after: { status: to, replacement }, reason: i.reason });
    return { status: to, replacementSerial: replacement };
  });
}

/** Replacement history of a unit (both directions), for staff and for the owning customer. */
export async function replacementHistory(pool: pg.Pool, serial: string) {
  return (await pool.query(`SELECT old_serial, new_serial, replaced_at FROM domain.serial_replacements WHERE old_serial=$1 OR new_serial=$1 ORDER BY id`, [serial])).rows;
}
