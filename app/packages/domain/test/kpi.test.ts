// Reproduces the ILLUSTRATIVE dataset of planning doc 07 §11 against a disposable database and checks every expected figure.
process.env.OTONOM_DB = 'otonom_test_kpi';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const { connConfig, makePool, signContract, adjustContract, computeKpis, overrideAttribution, findContractByOpportunity } = await import('../src/index.ts');
const { ensureRoles, migrate } = await import('../src/migrate.ts');

let pool: pg.Pool;
const ctx = { actor: { id: 'test-owner', role: 'OWNER' }, correlationId: 'test-kpi' };
const M = (egp: number) => egp * 100; // minor units
const ids: Record<string, string> = {};

before(async () => {
  const su = new pg.Client(connConfig('superuser', 'postgres'));
  await su.connect();
  await su.query(`DROP DATABASE IF EXISTS otonom_test_kpi WITH (FORCE)`);
  await su.end();
  await ensureRoles();
  await migrate();
  pool = makePool('domain', 4);
  const sign = (ref: string, org: string, cls: any, egp: number, at: string) =>
    signContract(pool, ctx, { ref, opportunityRef: `OPP-${ref}`, organisationRef: org, contractType: 'PROJECT', signedAt: at, signedValueMinor: M(egp), evidenceRef: `file:${ref}`, attribution: cls });
  // prior history (Q4 2025) making Dev B and Dev E EXISTING customers
  await sign('PRIOR-B', 'org:dev-b', 'NON_WEBSITE', 10_000, '2025-11-01T10:00:00Z');
  await sign('PRIOR-E', 'org:dev-e', 'NON_WEBSITE', 10_000, '2025-12-01T10:00:00Z');
  // Q1 2026
  ids.C1 = (await sign('C1', 'org:dev-a', 'WEBSITE_SOURCED', 2_000_000, '2026-01-15T10:00:00Z')).id;
  ids.C2 = (await sign('C2', 'org:dev-b', 'WEBSITE_SOURCED', 1_200_000, '2026-02-01T10:00:00Z')).id;
  ids.C3 = (await sign('C3', 'org:contractor-c', 'WEBSITE_ASSISTED', 800_000, '2026-02-20T10:00:00Z')).id;
  ids.C4 = (await sign('C4', 'org:home-d', 'NON_WEBSITE', 350_000, '2026-03-05T10:00:00Z')).id;
  ids.C5 = (await sign('C5', 'org:dev-e', 'UNKNOWN', 600_000, '2026-03-20T10:00:00Z')).id;
  // Q2 2026
  ids.C6 = (await sign('C6', 'org:home-f', 'WEBSITE_ASSISTED', 250_000, '2026-04-10T10:00:00Z')).id;
  await adjustContract(pool, ctx, ids.C2, 'AMENDMENT', M(300_000), '2026-05-01T10:00:00Z', 'synthetic scope variation', 'file:amend-c2');
  await adjustContract(pool, ctx, ids.C5, 'CANCELLATION', -M(600_000), '2026-06-01T10:00:00Z', 'synthetic full cancellation', 'file:cancel-c5');
});

after(async () => {
  await pool?.end();
});

test('Q1 as-recorded figures match doc 07 §11', async () => {
  const r = await computeKpis(pool, { from: '2026-01-01T00:00:00Z', to: '2026-04-01T00:00:00Z' });
  assert.equal(r.kpi['KPI-001_websiteSourced'], M(3_200_000));
  assert.equal(r.kpi['KPI-002_websiteAssisted'], M(800_000));
  assert.equal(r.kpi['KPI-004_nonWebsite'], M(350_000));
  assert.equal(r.kpi['KPI-005_unknown'], M(600_000));
  assert.equal(r.kpi['KPI-006_totalEligible'], M(4_950_000));
  assert.equal(r.kpi['KPI-003_totalWebsiteInfluenced'], M(4_000_000));
  assert.equal(r.byCohort.NEW.total, M(3_150_000));
  assert.equal(r.byCohort.EXISTING.total, M(1_800_000));
  assert.equal(r.kpi['KPI-015_attributionCoveragePct'], 80);
  assert.deepEqual(r.identities, { classesSumToTotal: true, cohortsSumToTotal: true, influencedEqualsSourcedPlusAssisted: true, crossTabConsistent: true });
});

test('Q2 as-recorded shows components (signed 250k, amendment +300k, cancellation −600k ⇒ −50k)', async () => {
  const r = await computeKpis(pool, { from: '2026-04-01T00:00:00Z', to: '2026-07-01T00:00:00Z' });
  assert.equal(r.kpi['KPI-006_totalEligible'], M(-50_000));
  const sumSigned = Object.values(r.byClass).reduce((s, b) => s + b.signed, 0);
  const sumAmend = Object.values(r.byClass).reduce((s, b) => s + b.amendments, 0);
  const sumCancel = Object.values(r.byClass).reduce((s, b) => s + b.cancellations, 0);
  assert.equal(sumSigned, M(250_000));
  assert.equal(sumAmend, M(300_000));
  assert.equal(sumCancel, M(-600_000));
  assert.equal(r.byClass.WEBSITE_SOURCED.amendments, M(300_000)); // amendment keeps the original class
  assert.equal(r.byClass.UNKNOWN.cancellations, M(-600_000));
  assert.ok(r.identities.classesSumToTotal && r.identities.cohortsSumToTotal);
});

test('Q1 vintage (restated) view = 4,650,000', async () => {
  const r = await computeKpis(pool, { from: '2026-01-01T00:00:00Z', to: '2026-04-01T00:00:00Z' });
  assert.equal(r.vintage.signedInPeriodCurrentNetMinor, M(4_650_000));
});

test('cohort is evaluated from prior signed contracts of the same organisation', async () => {
  const r = await pool.query(`SELECT ref, cohort FROM domain.contracts WHERE ref IN ('C1','C2','C5','C6') ORDER BY ref`);
  assert.deepEqual(r.rows.map((x) => `${x.ref}:${x.cohort}`), ['C1:NEW', 'C2:EXISTING', 'C5:EXISTING', 'C6:NEW']);
});

test('a contract can carry exactly one attribution class (no double counting by construction)', async () => {
  await assert.rejects(pool.query(`INSERT INTO domain.attribution(contract_id, class, basis_rule, classified_by) VALUES ($1,'WEBSITE_ASSISTED','R-A','x')`, [ids.C1]), /duplicate key/);
});

test('attribution override requires a reason, is recorded append-only and flagged single-actor', async () => {
  await assert.rejects(overrideAttribution(pool, ctx, ids.C5, 'NON_WEBSITE', ''), /REASON_REQUIRED/);
  const r = await overrideAttribution(pool, ctx, ids.C5, 'NON_WEBSITE', 'synthetic evidence found');
  assert.deepEqual(r, { from: 'UNKNOWN', to: 'NON_WEBSITE' });
  const ch = await pool.query(`SELECT single_actor FROM domain.attribution_changes WHERE contract_id=$1`, [ids.C5]);
  assert.equal(ch.rows[0].single_actor, true);
  await assert.rejects(pool.query(`UPDATE domain.attribution_changes SET reason='x'`), /permission denied/);
});

test('signing without evidence or with foreign currency but no FX is refused', async () => {
  await assert.rejects(
    signContract(pool, ctx, { ref: 'X1', opportunityRef: 'O', organisationRef: 'org:x', contractType: 'PROJECT', signedAt: '2026-01-01T00:00:00Z', signedValueMinor: 100, evidenceRef: '', attribution: 'UNKNOWN' }),
    /SIGNATURE_EVIDENCE_REQUIRED/,
  );
  await assert.rejects(
    signContract(pool, ctx, { ref: 'X2', opportunityRef: 'O', organisationRef: 'org:x', contractType: 'SUPPLY', signedAt: '2026-01-01T00:00:00Z', signedValueMinor: 100, currency: 'USD', evidenceRef: 'f', attribution: 'UNKNOWN' }),
    /FX_REQUIRED_FOR_FOREIGN_CURRENCY/,
  );
});

test('an opportunity can be contracted only once; the existing contract is discoverable for re-sync', async () => {
  await assert.rejects(
    signContract(pool, ctx, { ref: 'C1-DUP', opportunityRef: 'OPP-C1', organisationRef: 'org:dev-a', contractType: 'PROJECT', signedAt: '2026-03-01T00:00:00Z', signedValueMinor: 100, evidenceRef: 'f', attribution: 'UNKNOWN' }),
    /OPPORTUNITY_ALREADY_CONTRACTED/,
  );
  const found = await findContractByOpportunity(pool, 'OPP-C1');
  assert.equal(found?.id, ids.C1);
  assert.equal(found?.attribution, 'WEBSITE_SOURCED');
});

test('audit rows always carry a correlation id', async () => {
  const r = await pool.query(`SELECT count(*)::int n FROM domain.audit_events WHERE correlation_id IS NULL OR correlation_id = ''`);
  assert.equal(r.rows[0].n, 0);
});
