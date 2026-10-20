// W1 warranty: serial registry, policy approval, coverage activation and claims. The warranty DURATION is an owner/legal
// decision (DR-024, BLOCKED): no policy is seeded, so coverage cannot be activated and claims record NO_COVERAGE_RECORD.
// Claims are never auto-decided; a staff decision needs a reason.
import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { randomRef } from './commerce.ts';
import { audit, DomainError, tx, type Ctx } from './tx.ts';

export async function registerSerial(pool: pg.Pool, ctx: Ctx, serial: string, skuId: string, status = 'IN_STOCK') {
  if (!/^[A-Z0-9-]{6,40}$/.test(serial ?? '')) throw new DomainError('INVALID_SERIAL');
  return tx(pool, async (c) => {
    try {
      await c.query(`INSERT INTO domain.serial_units(serial, sku_id, status) VALUES ($1,$2,$3)`, [serial, skuId, status]);
    } catch (e: any) {
      if (e?.code === '23505') throw new DomainError('SERIAL_EXISTS');
      if (e?.code === '23503') throw new DomainError('NOT_FOUND');
      throw e;
    }
    await audit(c, ctx, { action: 'serial.register', entityType: 'serial', entityId: serial, after: { skuId, status } });
    return { serial };
  });
}

export async function approveWarrantyPolicy(pool: pg.Pool, ctx: Ctx, version: number, durationMonths: number) {
  if (!Number.isInteger(durationMonths) || durationMonths <= 0) throw new DomainError('DURATION_REQUIRED');
  return tx(pool, async (c) => {
    await c.query(`UPDATE domain.warranty_policies SET status='RETIRED' WHERE status='APPROVED'`);
    const id = randomUUID();
    await c.query(`INSERT INTO domain.warranty_policies(id, version, duration_months, status, approved_by, approved_at) VALUES ($1,$2,$3,'APPROVED',$4,now())`, [id, version, durationMonths, ctx.actor.id]);
    await audit(c, ctx, { action: 'warranty_policy.approve', entityType: 'warranty_policy', entityId: id, after: { version, durationMonths } });
    return { id };
  });
}

export async function activateCoverage(pool: pg.Pool, ctx: Ctx, serial: string, startsAt: string) {
  if (Number.isNaN(Date.parse(startsAt))) throw new DomainError('INVALID_START');
  return tx(pool, async (c) => {
    const pol = await c.query(`SELECT id, duration_months FROM domain.warranty_policies WHERE status='APPROVED' ORDER BY version DESC LIMIT 1`);
    if (!pol.rowCount) throw new DomainError('WARRANTY_POLICY_NOT_APPROVED');
    const s = await c.query(`SELECT status FROM domain.serial_units WHERE serial=$1 FOR UPDATE`, [serial]);
    if (!s.rowCount) throw new DomainError('NOT_FOUND');
    const id = randomUUID();
    try {
      await c.query(
        `INSERT INTO domain.warranty_coverage(id, serial, policy_id, status, starts_at, ends_at)
         VALUES ($1,$2,$3,'COVERAGE_ACTIVE',$4::timestamptz, $4::timestamptz + make_interval(months => $5))`,
        [id, serial, pol.rows[0].id, startsAt, pol.rows[0].duration_months],
      );
    } catch (e: any) {
      if (e?.code === '23505') throw new DomainError('COVERAGE_ALREADY_ACTIVE');
      throw e;
    }
    await audit(c, ctx, { action: 'coverage.activate', entityType: 'serial', entityId: serial, after: { coverageId: id, policyId: pol.rows[0].id, startsAt } });
    return { id };
  });
}

/** Coverage status as of now, computed from the stored row (expiry is derived, never silently extended). */
export async function coverageStatus(c: pg.Pool | pg.PoolClient, serial: string): Promise<string> {
  const r = await c.query(`SELECT status, ends_at FROM domain.warranty_coverage WHERE serial=$1 ORDER BY starts_at DESC NULLS LAST LIMIT 1`, [serial]);
  if (!r.rowCount) return 'NO_COVERAGE_RECORD';
  const row = r.rows[0];
  if (row.status === 'COVERAGE_ACTIVE' && row.ends_at && new Date(row.ends_at) < new Date()) return 'COVERAGE_EXPIRED';
  return row.status;
}

export type ClaimInput = { serial: string; contactName: string; contactEmail?: string; contactPhone?: string; description: string };

export async function submitWarrantyClaim(pool: pg.Pool, ctx: Ctx, i: ClaimInput) {
  if (!String(i.contactName ?? '').trim()) throw new DomainError('CONTACT_REQUIRED');
  if (!i.contactEmail && !i.contactPhone) throw new DomainError('CONTACT_REQUIRED');
  if (String(i.description ?? '').trim().length < 20) throw new DomainError('DESCRIPTION_TOO_SHORT');
  return tx(pool, async (c) => {
    const s = await c.query(`SELECT 1 FROM domain.serial_units WHERE serial=$1`, [i.serial]);
    if (!s.rowCount) throw new DomainError('SERIAL_NOT_RECOGNISED');
    const coverage = await coverageStatus(c, i.serial);
    const id = randomUUID();
    const ref = randomRef('WCL');
    await c.query(
      `INSERT INTO domain.warranty_claims(id, ref, serial, contact_name, contact_email, contact_phone, description, coverage_at_submit, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'SUBMITTED')`,
      [id, ref, i.serial, i.contactName.trim(), i.contactEmail ?? null, i.contactPhone ?? null, i.description.trim(), coverage],
    );
    await audit(c, ctx, { action: 'warranty_claim.submit', entityType: 'warranty_claim', entityId: id, after: { ref, serial: i.serial, coverage } });
    return { ref, coverageAtSubmit: coverage };
  });
}

export async function decideWarrantyClaim(pool: pg.Pool, ctx: Ctx, claimId: string, decision: 'ACCEPTED' | 'REJECTED', reason: string) {
  if (!['ACCEPTED', 'REJECTED'].includes(decision)) throw new DomainError('INVALID_DECISION');
  if (!String(reason ?? '').trim()) throw new DomainError('REASON_REQUIRED');
  return tx(pool, async (c) => {
    const k = await c.query(`SELECT status FROM domain.warranty_claims WHERE id=$1 FOR UPDATE`, [claimId]);
    if (!k.rowCount) throw new DomainError('NOT_FOUND');
    if (!['SUBMITTED', 'TRIAGE'].includes(k.rows[0].status)) throw new DomainError('INVALID_STATE');
    await c.query(`UPDATE domain.warranty_claims SET status=$2, decision_reason=$3, decided_by=$4 WHERE id=$1`, [claimId, decision, reason, ctx.actor.id]);
    await audit(c, ctx, { action: 'warranty_claim.decide', entityType: 'warranty_claim', entityId: claimId, before: k.rows[0], after: { status: decision }, reason });
    return { status: decision };
  });
}
