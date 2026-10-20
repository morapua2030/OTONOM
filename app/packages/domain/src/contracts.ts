// Signed contracts, adjustments and attribution (doc 07 / ledger OD-02). Exclusive class per contract by construction.
import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { audit, DomainError, tx, type Ctx } from './tx.ts';

export const ATTRIBUTION_CLASSES = ['WEBSITE_SOURCED', 'WEBSITE_ASSISTED', 'NON_WEBSITE', 'UNKNOWN'] as const;
export type AttributionClass = (typeof ATTRIBUTION_CLASSES)[number];
const BASIS: Record<AttributionClass, string> = { WEBSITE_SOURCED: 'R-S', WEBSITE_ASSISTED: 'R-A', NON_WEBSITE: 'R-N', UNKNOWN: 'R-U' };

export type SignContractInput = {
  ref: string;
  opportunityRef: string;
  organisationRef: string;
  contractType: 'PROJECT' | 'SUPPLY' | 'SERVICE' | 'MAINTENANCE';
  signedAt: string;
  signedValueMinor: number;
  currency?: string;
  fxRateToEgp?: number;
  fxDate?: string;
  evidenceRef: string;
  attribution: AttributionClass;
  attributionEvidence?: string;
};

/**
 * Records a signed contract. Cohort is evaluated and frozen at signature:
 * EXISTING if the same organisation already had a signed contract before signedAt (entity matching beyond the
 * organisation reference is an OPEN business rule — see decision PD-07/D-Q17).
 */
export async function signContract(pool: pg.Pool, ctx: Ctx, i: SignContractInput) {
  if (!i.evidenceRef) throw new DomainError('SIGNATURE_EVIDENCE_REQUIRED');
  if (!Number.isInteger(i.signedValueMinor) || i.signedValueMinor <= 0) throw new DomainError('INVALID_VALUE');
  if (!(ATTRIBUTION_CLASSES as readonly string[]).includes(i.attribution)) throw new DomainError('INVALID_ATTRIBUTION');
  return tx(pool, async (c) => {
    const prior = await c.query(`SELECT 1 FROM domain.contracts WHERE organisation_ref=$1 AND signed_at < $2 LIMIT 1`, [i.organisationRef, i.signedAt]);
    const cohort = prior.rowCount ? 'EXISTING' : 'NEW';
    const id = randomUUID();
    try {
      await c.query(
        `INSERT INTO domain.contracts(id, ref, opportunity_ref, organisation_ref, contract_type, signed_at, signed_value_minor, current_net_value_minor,
                                      currency, fx_rate_to_egp, fx_date, evidence_ref, cohort, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,$11,$12,'ACTIVE',$13)`,
        [id, i.ref, i.opportunityRef, i.organisationRef, i.contractType, i.signedAt, i.signedValueMinor, i.currency ?? 'EGP', i.fxRateToEgp ?? null, i.fxDate ?? null, i.evidenceRef, cohort, ctx.actor.id],
      );
    } catch (e: any) {
      if (e?.code === '23505') throw new DomainError(e?.constraint === 'contracts_opportunity_ref_key' ? 'OPPORTUNITY_ALREADY_CONTRACTED' : 'CONTRACT_REF_EXISTS');
      if (e?.code === '23514') throw new DomainError('FX_REQUIRED_FOR_FOREIGN_CURRENCY');
      throw e;
    }
    await c.query(`INSERT INTO domain.attribution(contract_id, class, basis_rule, evidence_note, locked, classified_by) VALUES ($1,$2,$3,$4,true,$5)`, [
      id,
      i.attribution,
      BASIS[i.attribution],
      i.attributionEvidence ?? null,
      ctx.actor.id,
    ]);
    await audit(c, ctx, { action: 'contract.sign', entityType: 'contract', entityId: id, after: { ...i, cohort } });
    return { id, cohort };
  });
}

/** Domain contract already recorded for an opportunity (used to re-sync the CMS stage after a partial failure). */
export async function findContractByOpportunity(pool: pg.Pool, opportunityRef: string) {
  const r = await pool.query(
    `SELECT c.id, c.ref, c.cohort, a.class AS attribution FROM domain.contracts c JOIN domain.attribution a ON a.contract_id = c.id WHERE c.opportunity_ref = $1`,
    [opportunityRef],
  );
  return r.rows[0] as { id: string; ref: string; cohort: 'NEW' | 'EXISTING'; attribution: AttributionClass } | undefined;
}

export async function adjustContract(pool: pg.Pool, ctx: Ctx, contractId: string, kind: 'AMENDMENT' | 'CANCELLATION', deltaMinor: number, effectiveAt: string, reason: string, evidenceRef: string) {
  if (!reason) throw new DomainError('REASON_REQUIRED');
  if (!evidenceRef) throw new DomainError('EVIDENCE_REQUIRED');
  if (!Number.isInteger(deltaMinor) || deltaMinor === 0) throw new DomainError('INVALID_DELTA');
  if (kind === 'CANCELLATION' && deltaMinor > 0) throw new DomainError('CANCELLATION_MUST_BE_NEGATIVE');
  return tx(pool, async (c) => {
    const k = await c.query(`SELECT current_net_value_minor, status FROM domain.contracts WHERE id=$1 FOR UPDATE`, [contractId]);
    if (!k.rowCount) throw new DomainError('NOT_FOUND');
    const next = Number(k.rows[0].current_net_value_minor) + deltaMinor;
    if (next < 0) throw new DomainError('NET_VALUE_NEGATIVE');
    await c.query(
      `INSERT INTO domain.contract_adjustments(id, contract_id, kind, delta_minor, effective_at, reason, evidence_ref, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [randomUUID(), contractId, kind, deltaMinor, effectiveAt, reason, evidenceRef, ctx.actor.id],
    );
    const status = kind === 'CANCELLATION' && next === 0 ? 'CANCELLED' : 'AMENDED';
    await c.query(`UPDATE domain.contracts SET current_net_value_minor=$2, status=$3 WHERE id=$1`, [contractId, next, status]);
    await audit(c, ctx, { action: `contract.${kind.toLowerCase()}`, entityType: 'contract', entityId: contractId, before: k.rows[0], after: { current_net_value_minor: next, status }, reason });
    return { currentNetValueMinor: next, status };
  });
}

/** Locked attribution may only change with a reason; single-actor approvals are flagged for the weekly digest (DR-051). */
export async function overrideAttribution(pool: pg.Pool, ctx: Ctx, contractId: string, to: AttributionClass, reason: string, approverId?: string) {
  if (!reason) throw new DomainError('REASON_REQUIRED');
  if (!(ATTRIBUTION_CLASSES as readonly string[]).includes(to)) throw new DomainError('INVALID_ATTRIBUTION');
  return tx(pool, async (c) => {
    const a = await c.query(`SELECT class FROM domain.attribution WHERE contract_id=$1 FOR UPDATE`, [contractId]);
    if (!a.rowCount) throw new DomainError('NOT_FOUND');
    const from = a.rows[0].class;
    if (from === to) throw new DomainError('NO_CHANGE');
    await c.query(`UPDATE domain.attribution SET class=$2, basis_rule='OVERRIDE', classified_by=$3, classified_at=now() WHERE contract_id=$1`, [contractId, to, ctx.actor.id]);
    await c.query(`INSERT INTO domain.attribution_changes(contract_id, before, after, reason, actor, approver, single_actor) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
      contractId,
      from,
      to,
      reason,
      ctx.actor.id,
      approverId ?? null,
      !approverId || approverId === ctx.actor.id,
    ]);
    await audit(c, ctx, { action: 'attribution.override', entityType: 'attribution', entityId: contractId, before: { class: from }, after: { class: to }, reason });
    return { from, to };
  });
}
