// KPI computation from authoritative contract records (planning doc 07). Amounts in EGP minor units (pre-tax; PROPOSED policy).
import type pg from 'pg';

export type KpiPeriod = { from: string; to: string }; // [from, to)
type Bucket = { signed: number; amendments: number; cancellations: number; total: number };
const empty = (): Bucket => ({ signed: 0, amendments: 0, cancellations: 0, total: 0 });
const CLASSES = ['WEBSITE_SOURCED', 'WEBSITE_ASSISTED', 'NON_WEBSITE', 'UNKNOWN'] as const;
const COHORTS = ['NEW', 'EXISTING'] as const;

export const KPI_IDS = ['KPI-001_websiteSourced', 'KPI-002_websiteAssisted', 'KPI-003_totalWebsiteInfluenced', 'KPI-004_nonWebsite', 'KPI-005_unknown', 'KPI-006_totalEligible', 'KPI-015_attributionCoveragePct', 'KPI-016_overrideRatePct'] as const;

export type KpiReport = {
  period: KpiPeriod;
  view: 'AS_RECORDED';
  byClass: Record<(typeof CLASSES)[number], Bucket>;
  byCohort: Record<(typeof COHORTS)[number], Bucket>;
  /** Class × cohort cross-tab: the two dimensions are independent (NEW/EXISTING never changes the attribution class). */
  byClassCohort: Record<(typeof CLASSES)[number], Record<(typeof COHORTS)[number], number>>;
  kpi: {
    'KPI-001_websiteSourced': number;
    'KPI-002_websiteAssisted': number;
    'KPI-003_totalWebsiteInfluenced': number;
    'KPI-004_nonWebsite': number;
    'KPI-005_unknown': number;
    'KPI-006_totalEligible': number;
    'KPI-015_attributionCoveragePct': number | null;
    'KPI-016_overrideRatePct': number | null;
  };
  contractsSignedInPeriod: number;
  identities: { classesSumToTotal: boolean; cohortsSumToTotal: boolean; influencedEqualsSourcedPlusAssisted: boolean; crossTabConsistent: boolean };
  vintage: { signedInPeriodCurrentNetMinor: number };
  generatedAt: string;
};

// Rounding rule (PROPOSED, documented in W05/S4): every contract / adjustment is converted to EGP minor units and rounded
// individually, then summed — so every total equals the sum of its drill-down rows exactly.
const egp = `CASE WHEN k.currency = 'EGP' THEN 1 ELSE k.fx_rate_to_egp END`;

export async function computeKpis(pool: pg.Pool, p: KpiPeriod): Promise<KpiReport> {
  if (Number.isNaN(Date.parse(p.from)) || Number.isNaN(Date.parse(p.to)) || Date.parse(p.to) <= Date.parse(p.from)) throw new Error('INVALID_PERIOD');
  const byClassCohort = Object.fromEntries(CLASSES.map((c) => [c, { NEW: 0, EXISTING: 0 }])) as KpiReport['byClassCohort'];
  const byClass = Object.fromEntries(CLASSES.map((c) => [c, empty()])) as KpiReport['byClass'];
  const byCohort = Object.fromEntries(COHORTS.map((c) => [c, empty()])) as KpiReport['byCohort'];
  const signed = await pool.query(
    `SELECT a.class, k.cohort, sum(round(k.signed_value_minor * ${egp}))::bigint AS v, count(*)::int AS n
       FROM domain.contracts k JOIN domain.attribution a ON a.contract_id = k.id
      WHERE k.signed_at >= $1 AND k.signed_at < $2 GROUP BY 1,2`,
    [p.from, p.to],
  );
  let n = 0;
  for (const r of signed.rows) {
    byClass[r.class as keyof typeof byClass].signed += Number(r.v);
    byCohort[r.cohort as keyof typeof byCohort].signed += Number(r.v);
    byClassCohort[r.class as keyof typeof byClassCohort][r.cohort as 'NEW' | 'EXISTING'] += Number(r.v);
    n += r.n;
  }
  const adj = await pool.query(
    `SELECT a.class, k.cohort, j.kind, sum(round(j.delta_minor * ${egp}))::bigint AS v
       FROM domain.contract_adjustments j JOIN domain.contracts k ON k.id = j.contract_id JOIN domain.attribution a ON a.contract_id = k.id
      WHERE j.effective_at >= $1 AND j.effective_at < $2 GROUP BY 1,2,3`,
    [p.from, p.to],
  );
  for (const r of adj.rows) {
    const key = r.kind === 'AMENDMENT' ? 'amendments' : 'cancellations';
    byClass[r.class as keyof typeof byClass][key] += Number(r.v);
    byCohort[r.cohort as keyof typeof byCohort][key] += Number(r.v);
    byClassCohort[r.class as keyof typeof byClassCohort][r.cohort as 'NEW' | 'EXISTING'] += Number(r.v);
  }
  for (const b of [...Object.values(byClass), ...Object.values(byCohort)]) b.total = b.signed + b.amendments + b.cancellations;
  const total = CLASSES.reduce((s, c) => s + byClass[c].total, 0);
  const cohortTotal = COHORTS.reduce((s, c) => s + byCohort[c].total, 0);
  const known = await pool.query(
    `SELECT count(*) FILTER (WHERE a.class <> 'UNKNOWN')::int AS known, count(*)::int AS all,
            count(*) FILTER (WHERE EXISTS (SELECT 1 FROM domain.attribution_changes c WHERE c.contract_id = k.id))::int AS overridden
       FROM domain.contracts k JOIN domain.attribution a ON a.contract_id = k.id WHERE k.signed_at >= $1 AND k.signed_at < $2`,
    [p.from, p.to],
  );
  const kn = known.rows[0];
  const vintage = await pool.query(
    `SELECT coalesce(sum(round(k.current_net_value_minor * ${egp})),0)::bigint AS v FROM domain.contracts k WHERE k.signed_at >= $1 AND k.signed_at < $2`,
    [p.from, p.to],
  );
  const kpi = {
    'KPI-001_websiteSourced': byClass.WEBSITE_SOURCED.total,
    'KPI-002_websiteAssisted': byClass.WEBSITE_ASSISTED.total,
    'KPI-003_totalWebsiteInfluenced': byClass.WEBSITE_SOURCED.total + byClass.WEBSITE_ASSISTED.total,
    'KPI-004_nonWebsite': byClass.NON_WEBSITE.total,
    'KPI-005_unknown': byClass.UNKNOWN.total,
    'KPI-006_totalEligible': total,
    'KPI-015_attributionCoveragePct': kn.all ? Math.round((kn.known / kn.all) * 1000) / 10 : null,
    'KPI-016_overrideRatePct': kn.all ? Math.round((kn.overridden / kn.all) * 1000) / 10 : null,
  };
  return {
    period: p,
    view: 'AS_RECORDED',
    byClass,
    byCohort,
    byClassCohort,
    kpi,
    contractsSignedInPeriod: n,
    identities: {
      classesSumToTotal: kpi['KPI-001_websiteSourced'] + kpi['KPI-002_websiteAssisted'] + kpi['KPI-004_nonWebsite'] + kpi['KPI-005_unknown'] === total,
      cohortsSumToTotal: cohortTotal === total,
      influencedEqualsSourcedPlusAssisted: kpi['KPI-003_totalWebsiteInfluenced'] === kpi['KPI-001_websiteSourced'] + kpi['KPI-002_websiteAssisted'],
      crossTabConsistent:
        CLASSES.every((c) => byClassCohort[c].NEW + byClassCohort[c].EXISTING === byClass[c].total) &&
        COHORTS.every((h) => CLASSES.reduce((s, c) => s + byClassCohort[c][h], 0) === byCohort[h].total),
    },
    vintage: { signedInPeriodCurrentNetMinor: Number(vintage.rows[0].v) },
    generatedAt: new Date().toISOString(),
  };
}

export type ContractFilter = { from: string; to: string; cohort?: 'NEW' | 'EXISTING'; attribution?: (typeof CLASSES)[number]; organisationRef?: string };
export type ContractRow = {
  ref: string;
  opportunityRef: string;
  organisationRef: string;
  contractType: string;
  signedAt: string;
  status: string;
  cohort: 'NEW' | 'EXISTING';
  attribution: (typeof CLASSES)[number];
  signedEgpMinor: number;
  currentNetEgpMinor: number;
};

/**
 * Contract drill-down behind the KPI figures (signed in [from, to)). Values converted to EGP at the contract's FX.
 * Deliberately excludes evidence references and any personal data (safe for the sanitized export).
 */
export async function listContracts(pool: pg.Pool, f: ContractFilter): Promise<ContractRow[]> {
  if (Number.isNaN(Date.parse(f.from)) || Number.isNaN(Date.parse(f.to)) || Date.parse(f.to) <= Date.parse(f.from)) throw new Error('INVALID_PERIOD');
  if (f.cohort && !COHORTS.includes(f.cohort)) throw new Error('INVALID_COHORT');
  if (f.attribution && !(CLASSES as readonly string[]).includes(f.attribution)) throw new Error('INVALID_ATTRIBUTION');
  const r = await pool.query(
    `SELECT k.ref, k.opportunity_ref, k.organisation_ref, k.contract_type, k.signed_at, k.status, k.cohort, a.class,
            round(k.signed_value_minor * ${egp})::bigint AS signed, round(k.current_net_value_minor * ${egp})::bigint AS net
       FROM domain.contracts k JOIN domain.attribution a ON a.contract_id = k.id
      WHERE k.signed_at >= $1 AND k.signed_at < $2
        AND ($3::text IS NULL OR k.cohort = $3) AND ($4::text IS NULL OR a.class = $4) AND ($5::text IS NULL OR k.organisation_ref = $5)
      ORDER BY k.signed_at DESC, k.ref`,
    [f.from, f.to, f.cohort ?? null, f.attribution ?? null, f.organisationRef ?? null],
  );
  return r.rows.map((x) => ({
    ref: x.ref,
    opportunityRef: x.opportunity_ref,
    organisationRef: x.organisation_ref,
    contractType: x.contract_type,
    signedAt: new Date(x.signed_at).toISOString(),
    status: x.status,
    cohort: x.cohort,
    attribution: x.class,
    signedEgpMinor: Number(x.signed),
    currentNetEgpMinor: Number(x.net),
  }));
}
