// Randomised (seeded, reproducible) invariant test for attribution + KPI aggregation against a disposable database.
// The report is compared with an independent recomputation (oracle) from the raw rows; values are synthetic.
process.env.OTONOM_DB = 'otonom_test_kpi_inv';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const d = await import('../src/index.ts');
const { ensureRoles, migrate } = await import('../src/migrate.ts');

let pool: pg.Pool;
const ctx = { actor: { id: 'inv-owner', role: 'OWNER' }, correlationId: 'kpi-inv' };
// mulberry32 PRNG: same seed → same dataset → reproducible failures
function prng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = Number(process.env.KPI_SEED ?? 20261015);
const rnd = prng(SEED);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const CLASSES = ['WEBSITE_SOURCED', 'WEBSITE_ASSISTED', 'NON_WEBSITE', 'UNKNOWN'] as const;
const Y = '2026';
let overrides = 0;

before(async () => {
  const su = new pg.Client(d.connConfig('superuser', 'postgres'));
  await su.connect();
  await su.query(`DROP DATABASE IF EXISTS otonom_test_kpi_inv WITH (FORCE)`);
  await su.end();
  await ensureRoles();
  await migrate();
  pool = d.makePool('domain', 6);
  const orgs = Array.from({ length: 15 }, (_, i) => `org:inv-${i}`);
  // 80 contracts spread over 2026, some in USD with an FX rate
  const signedAt = Array.from({ length: 80 }, () => new Date(Date.UTC(2026, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27), Math.floor(rnd() * 23))).toISOString()).sort();
  const ids: string[] = [];
  for (let i = 0; i < signedAt.length; i++) {
    const usd = rnd() < 0.2;
    const r = await d.signContract(pool, ctx, {
      ref: `INV-${i}`,
      opportunityRef: `OPP-INV-${i}`,
      organisationRef: pick(orgs),
      contractType: pick(['PROJECT', 'SUPPLY', 'SERVICE'] as const),
      signedAt: signedAt[i],
      signedValueMinor: 100_00 + Math.floor(rnd() * 5_000_000_00),
      currency: usd ? 'USD' : undefined,
      fxRateToEgp: usd ? 47.5 + Math.round(rnd() * 400) / 100 : undefined,
      fxDate: usd ? signedAt[i].slice(0, 10) : undefined,
      evidenceRef: `file:inv-${i}`,
      attribution: pick(CLASSES),
    });
    ids.push(r.id);
  }
  // adjustments (amendments ±, partial and full cancellations) and attribution overrides
  for (const id of ids) {
    const k = (await pool.query(`SELECT signed_at, current_net_value_minor FROM domain.contracts WHERE id=$1`, [id])).rows[0];
    const later = (days: number) => new Date(Math.min(new Date(k.signed_at).getTime() + days * 86400_000, Date.UTC(2026, 11, 31))).toISOString();
    if (rnd() < 0.3) await d.adjustContract(pool, ctx, id, 'AMENDMENT', Math.floor((rnd() - 0.3) * Number(k.current_net_value_minor) * 0.5) || 1, later(20), 'synthetic amendment', 'file:amend');
    if (rnd() < 0.15) {
      const cur = Number((await pool.query(`SELECT current_net_value_minor FROM domain.contracts WHERE id=$1`, [id])).rows[0].current_net_value_minor);
      if (cur > 0) await d.adjustContract(pool, ctx, id, 'CANCELLATION', -(rnd() < 0.5 ? cur : Math.max(1, Math.floor(cur / 3))), later(45), 'synthetic cancellation', 'file:cancel');
    }
    if (rnd() < 0.1) {
      const cls = (await pool.query(`SELECT class FROM domain.attribution WHERE contract_id=$1`, [id])).rows[0].class;
      await d.overrideAttribution(pool, ctx, id, CLASSES.find((c) => c !== cls)!, 'synthetic evidence correction');
      overrides++;
    }
  }
});
after(async () => pool?.end());

/** Independent oracle: recompute the as-recorded figures from raw rows in plain JavaScript. */
async function oracle(from: string, to: string) {
  const ks = (await pool.query(`SELECT k.id, k.signed_at, k.signed_value_minor, k.current_net_value_minor, k.currency, k.fx_rate_to_egp, k.cohort, a.class FROM domain.contracts k JOIN domain.attribution a ON a.contract_id=k.id`)).rows;
  const adj = (await pool.query(`SELECT contract_id, delta_minor, effective_at FROM domain.contract_adjustments`)).rows;
  // same rule as PostgreSQL numeric round(): half away from zero, applied per contract / adjustment
  // exact integer arithmetic (BigInt): value × fx (6 decimals), rounded half away from zero like PostgreSQL numeric round()
  const toEgp = (minor: string | number, k: any): number => {
    if (k.currency === 'EGP') return Number(minor);
    const [i, f = ''] = String(k.fx_rate_to_egp).split('.');
    const micro = BigInt(i + (f + '000000').slice(0, 6));
    const p = BigInt(String(minor)) * micro;
    const a = p < 0n ? -p : p;
    let q = a / 1000000n;
    if ((a % 1000000n) * 2n >= 1000000n) q += 1n;
    return Number(p < 0n ? -q : q);
  };
  const inP = (t: string | Date) => new Date(t) >= new Date(from) && new Date(t) < new Date(to);
  const byClass: Record<string, number> = Object.fromEntries(CLASSES.map((c) => [c, 0]));
  const byCohort: Record<string, number> = { NEW: 0, EXISTING: 0 };
  let vintage = 0;
  for (const k of ks) {
    if (inP(k.signed_at)) {
      byClass[k.class] += toEgp(k.signed_value_minor, k);
      byCohort[k.cohort] += toEgp(k.signed_value_minor, k);
      vintage += toEgp(k.current_net_value_minor, k);
    }
  }
  for (const j of adj) {
    if (!inP(j.effective_at)) continue;
    const k = ks.find((x) => x.id === j.contract_id);
    byClass[k.class] += toEgp(j.delta_minor, k);
    byCohort[k.cohort] += toEgp(j.delta_minor, k);
  }
  return { byClass, byCohort, vintage };
}

const PERIODS: Array<[string, string]> = [
  [`${Y}-01-01T00:00:00Z`, '2027-02-01T00:00:00Z'], // full year + adjustment tail
  [`${Y}-01-01T00:00:00Z`, `${Y}-04-01T00:00:00Z`],
  [`${Y}-04-01T00:00:00Z`, `${Y}-07-01T00:00:00Z`],
  [`${Y}-07-01T00:00:00Z`, `${Y}-10-01T00:00:00Z`],
  [`${Y}-10-01T00:00:00Z`, `2027-02-01T00:00:00Z`],
];

test(`report equals the independent recomputation for every period (seed ${SEED})`, async () => {
  for (const [from, to] of PERIODS) {
    const r = await d.computeKpis(pool, { from, to });
    const o = await oracle(from, to);
    for (const c of CLASSES) assert.equal(r.byClass[c].total, o.byClass[c], `${from} ${c}`); // exact: per-row rounding rule
    for (const h of ['NEW', 'EXISTING'] as const) assert.equal(r.byCohort[h].total, o.byCohort[h], `${from} ${h}`);
    assert.equal(r.vintage.signedInPeriodCurrentNetMinor, o.vintage, `${from} vintage`);
    assert.deepEqual(r.identities, { classesSumToTotal: true, cohortsSumToTotal: true, influencedEqualsSourcedPlusAssisted: true, crossTabConsistent: true });
  }
});

test('quarterly reports add up to the full-year report (additivity, no double counting)', async () => {
  const full = await d.computeKpis(pool, { from: PERIODS[0][0], to: PERIODS[0][1] });
  const parts = await Promise.all(PERIODS.slice(1).map(([from, to]) => d.computeKpis(pool, { from, to })));
  for (const c of CLASSES) assert.equal(parts.reduce((s, p) => s + p.byClass[c].total, 0), full.byClass[c].total, c);
  assert.equal(parts.reduce((s, p) => s + p.contractsSignedInPeriod, 0), full.contractsSignedInPeriod);
  assert.equal(full.contractsSignedInPeriod, 80);
});

test('every contract has exactly one attribution class; sourced/assisted mutually exclusive', async () => {
  const r = (await pool.query(`SELECT count(*)::int n, count(DISTINCT contract_id)::int u FROM domain.attribution`)).rows[0];
  assert.equal(r.n, 80);
  assert.equal(r.u, 80);
});

test('cohort is EXISTING exactly when the organisation signed earlier', async () => {
  const rows = (await pool.query(`SELECT organisation_ref, signed_at, cohort FROM domain.contracts ORDER BY signed_at, ref`)).rows;
  const seen = new Set<string>();
  for (const k of rows) {
    assert.equal(k.cohort, seen.has(k.organisation_ref) ? 'EXISTING' : 'NEW', `${k.organisation_ref} @ ${k.signed_at.toISOString()}`);
    seen.add(k.organisation_ref);
  }
});

test('every override is recorded append-only and counted in the override rate', async () => {
  const ch = (await pool.query(`SELECT count(DISTINCT contract_id)::int n FROM domain.attribution_changes`)).rows[0].n;
  assert.equal(ch, overrides);
  const full = await d.computeKpis(pool, { from: PERIODS[0][0], to: PERIODS[0][1] });
  assert.equal(full.kpi['KPI-016_overrideRatePct'], Math.round((overrides / 80) * 1000) / 10);
  const audits = (await pool.query(`SELECT count(*)::int n FROM domain.audit_events WHERE action LIKE 'attribution.%'`)).rows[0].n;
  assert.ok(audits >= overrides);
});

test('invalid periods are refused', async () => {
  await assert.rejects(d.computeKpis(pool, { from: '2026-05-01T00:00:00Z', to: '2026-04-01T00:00:00Z' }), /INVALID_PERIOD/);
  await assert.rejects(d.computeKpis(pool, { from: 'x', to: '2026-04-01T00:00:00Z' }), /INVALID_PERIOD/);
});

test('contract drill-down rows reconcile with the KPI signed figures and filters partition them', async () => {
  const [from, to] = PERIODS[0];
  const r = await d.computeKpis(pool, { from, to });
  const all = await d.listContracts(pool, { from, to });
  assert.equal(all.length, r.contractsSignedInPeriod);
  for (const c of CLASSES) {
    const rows = await d.listContracts(pool, { from, to, attribution: c });
    assert.equal(rows.reduce((s, x) => s + x.signedEgpMinor, 0), r.byClass[c].signed, `signed ${c}`);
    assert.ok(rows.every((x) => x.attribution === c));
  }
  const n = await d.listContracts(pool, { from, to, cohort: 'NEW' });
  const e = await d.listContracts(pool, { from, to, cohort: 'EXISTING' });
  assert.equal(n.length + e.length, all.length);
  assert.equal(n.reduce((s, x) => s + x.signedEgpMinor, 0), r.byCohort.NEW.signed);
  // no personal data or evidence references in the drill-down
  assert.ok(all.every((x) => !('evidenceRef' in x)));
  await assert.rejects(d.listContracts(pool, { from, to, cohort: 'X' as any }), /INVALID_COHORT/);
  await assert.rejects(d.listContracts(pool, { from, to, attribution: 'X' as any }), /INVALID_ATTRIBUTION/);
});
