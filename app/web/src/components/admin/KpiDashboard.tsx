'use client';
import { useEffect, useState } from 'react';
import s from './staff.module.css';

const egp = (m: number | null | undefined) => (m === null || m === undefined ? '—' : `EGP ${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(m / 100)}`);
const pct = (p: number | null | undefined) => (p === null || p === undefined ? '—' : `${p}%`);
const CLASSES = ['WEBSITE_SOURCED', 'WEBSITE_ASSISTED', 'NON_WEBSITE', 'UNKNOWN'] as const;

/** KPI dashboard: reads the server report (authorisation and all figures are computed server-side). */
export function KpiDashboard({ canReconcile }: { canReconcile: boolean }) {
  const year = new Date().getUTCFullYear();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(`${year + 1}-01-01`);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rec, setRec] = useState<any>(null);

  async function load() {
    setErr(null);
    const r = await fetch(`/api/reports/kpi?from=${from}T00:00:00Z&to=${to}T00:00:00Z`, { credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setData(j);
    else setErr(`${r.status} ${j.code ?? ''}`);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reconcile(fix: boolean) {
    const r = await fetch('/api/admin/reconcile', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fix }) });
    setRec({ status: r.status, ...(await r.json().catch(() => ({}))) });
  }

  return (
    <div data-testid="kpi-dashboard">
      <div className={s.actions}>
        <label className={s.muted}>
          From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} dir="ltr" />
        </label>
        <label className={s.muted}>
          To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} dir="ltr" />
        </label>
        <button className={s.btn} onClick={load} data-testid="kpi-load">
          Load
        </button>
      </div>
      {err && <p className={s.err}>{err}</p>}
      {data && (
        <>
          <section className={s.section} data-testid="north-star">
            <h2>North Star candidates (owner decision: {data.northStar?.status === 'OWNER_SELECTED' ? `selected ${data.northStar.selected}` : 'PENDING'})</h2>
            <div className={s.grid}>
              <div className={s.card} data-testid="ns-sourced">
                Website-Sourced only (KPI-001)
                <strong>{egp(data.kpi['KPI-001_websiteSourced'])}</strong>
              </div>
              <div className={s.card} data-testid="ns-influenced">
                Total website-influenced (KPI-003 = sourced + assisted)
                <strong>{egp(data.kpi['KPI-003_totalWebsiteInfluenced'])}</strong>
              </div>
              <div className={s.card}>
                Total eligible signed value (KPI-006)
                <strong>{egp(data.kpi['KPI-006_totalEligible'])}</strong>
              </div>
              <div className={s.card}>
                Attribution coverage (KPI-015) / override rate (KPI-016)
                <strong>
                  {pct(data.kpi['KPI-015_attributionCoveragePct'])} / {pct(data.kpi['KPI-016_overrideRatePct'])}
                </strong>
              </div>
            </div>
          </section>
          <section className={s.section}>
            <h2>By attribution class × cohort (as recorded)</h2>
            <div className={s.tableWrap}>
              <table className={s.table} data-testid="kpi-crosstab">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th className={s.num}>Signed</th>
                    <th className={s.num}>Amendments</th>
                    <th className={s.num}>Cancellations</th>
                    <th className={s.num}>Net</th>
                    <th className={s.num}>New customers</th>
                    <th className={s.num}>Existing customers</th>
                  </tr>
                </thead>
                <tbody>
                  {CLASSES.map((c) => (
                    <tr key={c}>
                      <td>{c}</td>
                      <td className={s.num}>{egp(data.byClass[c].signed)}</td>
                      <td className={s.num}>{egp(data.byClass[c].amendments)}</td>
                      <td className={s.num}>{egp(data.byClass[c].cancellations)}</td>
                      <td className={s.num}>{egp(data.byClass[c].total)}</td>
                      <td className={s.num}>{egp(data.byClassCohort?.[c]?.NEW)}</td>
                      <td className={s.num}>{egp(data.byClassCohort?.[c]?.EXISTING)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={s.muted}>
              Identities: {Object.entries(data.identities ?? {}).map(([k, v]) => `${k}=${v ? 'OK' : 'BROKEN'}`).join(' · ')} · contracts signed in period: {data.contractsSignedInPeriod} · vintage
              (current net of contracts signed in period): {egp(data.vintage?.signedInPeriodCurrentNetMinor)}
            </p>
          </section>
          <section className={s.section}>
            <h2>Funnel</h2>
            <div className={s.grid}>
              <div className={s.card}>
                RFQ qualification rate (KPI-010)<strong>{pct(data.funnel?.['KPI-010_rfqQualificationRatePct'])}</strong>
              </div>
              <div className={s.card}>
                Proposal → signed (KPI-011)<strong>{pct(data.funnel?.['KPI-011_proposalToSignedPct'])}</strong>
              </div>
              <div className={s.card}>
                Median signed value (KPI-013)<strong>{egp(data.funnel?.['KPI-013_medianSignedValueMinor'])}</strong>
              </div>
              <div className={s.card}>
                Median sales cycle (KPI-014)<strong>{data.funnel?.['KPI-014_medianSalesCycleDays'] ?? '—'} days</strong>
              </div>
              <div className={s.card}>
                Qualified open pipeline (KPI-008, not signed value)<strong>EGP {Number(data.pipeline?.['KPI-008_qualifiedOpenPipelineEgp'] ?? 0).toLocaleString('en-GB')}</strong>
              </div>
            </div>
            <p className={s.muted}>{Object.values(data.funnel?.blocked ?? {}).join(' · ')}</p>
          </section>
          <ContractDrillDown from={from} to={to} />
        </>
      )}
      {canReconcile && (
        <section className={s.section} data-testid="reconcile">
          <h2>Consistency check (domain ↔ CMS)</h2>
          <div className={s.actions}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => reconcile(false)} data-testid="reconcile-check">
              Check
            </button>
            <button className={s.btn} onClick={() => window.confirm('Repair the issues that can be repaired automatically?') && reconcile(true)} data-testid="reconcile-fix">
              Check and repair
            </button>
          </div>
          {rec && <pre className={s.result} data-testid="reconcile-result">{JSON.stringify(rec, null, 1).slice(0, 2000)}</pre>}
        </section>
      )}
    </div>
  );
}

const PROJECT_TYPES = ['COMPOUND', 'MULTI_UNIT_BUILDING', 'VILLA', 'APARTMENT', 'COMMERCIAL', 'OTHER'];

/** Contracts behind the figures, with filters; totals come from the same server rows (and reconcile with the report). */
function ContractDrillDown({ from, to }: { from: string; to: string }) {
  const [f, setF] = useState({ cohort: '', attribution: '', projectType: '' });
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const qs = () => {
    const p = new URLSearchParams({ from: `${from}T00:00:00Z`, to: `${to}T00:00:00Z` });
    for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
    return p.toString();
  };
  async function load() {
    setErr(null);
    const r = await fetch(`/api/reports/contracts?${qs()}`, { credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setRes(j);
    else setErr(`${r.status} ${j.code ?? ''}`);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);
  const sel = (key: keyof typeof f, label: string, opts: readonly string[]) => (
    <label className={s.muted}>
      {label}{' '}
      <select value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} data-testid={`drill-${key}`}>
        <option value="">All</option>
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section className={s.section} data-testid="contract-drilldown">
      <h2>Contracts behind the figures</h2>
      <div className={s.filters}>
        {sel('cohort', 'Cohort', ['NEW', 'EXISTING'])}
        {sel('attribution', 'Attribution', CLASSES)}
        {sel('projectType', 'Project type', PROJECT_TYPES)}
        <button className={s.btn} onClick={load} data-testid="drill-apply">
          Apply
        </button>
        <a className={`${s.btn} ${s.btnSecondary}`} href={`/api/reports/contracts?${qs()}&format=csv`} data-testid="drill-csv">
          Export CSV (synthetic, no personal data)
        </a>
      </div>
      {err && <p className={s.err}>{err}</p>}
      {res && (
        <>
          <p data-testid="drill-totals">
            {res.totals.contracts} contracts · signed {egp(res.totals.signedEgpMinor)} · current net {egp(res.totals.currentNetEgpMinor)}
          </p>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Signed</th>
                  <th>Cohort</th>
                  <th>Attribution</th>
                  <th>Project type</th>
                  <th className={s.num}>Signed value</th>
                  <th className={s.num}>Current net</th>
                </tr>
              </thead>
              <tbody>
                {res.rows.slice(0, 200).map((r: any) => (
                  <tr key={r.ref}>
                    <td data-label="Contract" className={s.mono}>
                      {r.ref}
                      <div className={s.muted}>{r.opportunityRef}</div>
                    </td>
                    <td data-label="Signed" className={s.mono}>{r.signedAt.slice(0, 10)}</td>
                    <td data-label="Cohort">{r.cohort}</td>
                    <td data-label="Attribution">{r.attribution}</td>
                    <td data-label="Project type">{r.projectType ?? '—'}</td>
                    <td data-label="Signed value" className={s.num}>{egp(r.signedEgpMinor)}</td>
                    <td data-label="Current net" className={s.num}>{egp(r.currentNetEgpMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {res.rows.length > 200 && <p className={s.muted}>Showing the 200 most recent of {res.rows.length}; the CSV export contains all rows.</p>}
        </>
      )}
    </section>
  );
}
