'use client';
import { useEffect, useState } from 'react';
import { useTranslation } from '@payloadcms/ui';
import { CLASS_COPY, COHORT_COPY, fillIn, KPI_V, langOf, pick, PROJECT_TYPE_COPY, type AdminLang, type Pair } from '@/admin-ui/copy.ts';
import { dateOnly } from '@/admin-ui/format.ts';
import s from './staff.module.css';

/** Money in Western digits: «12,500 جنيه» in Arabic, "EGP 12,500" in English. */
const egpIn = (lang: AdminLang) => (m: number | null | undefined) => {
  if (m === null || m === undefined) return '—';
  const n = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(m / 100);
  return lang === 'ar' ? `${n} جنيه` : `EGP ${n}`;
};
const pct = (p: number | null | undefined) => (p === null || p === undefined ? '—' : `${p}%`);
const CLASSES = ['WEBSITE_SOURCED', 'WEBSITE_ASSISTED', 'NON_WEBSITE', 'UNKNOWN'] as const;
const nameOf = (copy: Record<string, Pair>, code: string, lang: AdminLang) => (code in copy ? pick(copy[code], lang) : code);

/** The admin language and the dashboard's words (R3). */
function useKpiWords() {
  const { i18n } = useTranslation();
  const lang = langOf(i18n.language);
  return { lang, t: (k: keyof typeof KPI_V) => pick(KPI_V[k], lang), egp: egpIn(lang) };
}

/** KPI dashboard: reads the server report (authorisation and all figures are computed server-side). */
export function KpiDashboard({ canReconcile }: { canReconcile: boolean }) {
  const { lang, t, egp } = useKpiWords();
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
          {t('from')} <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} dir="ltr" />
        </label>
        <label className={s.muted}>
          {t('to')} <input type="date" value={to} onChange={(e) => setTo(e.target.value)} dir="ltr" />
        </label>
        <button className={s.btn} onClick={load} data-testid="kpi-load">
          {t('load')}
        </button>
      </div>
      {err && <p className={s.err}>{err}</p>}
      {data && (
        <>
          <section className={s.section} data-testid="north-star">
            <h2>{fillIn(t('northStar'), { x: data.northStar?.status === 'OWNER_SELECTED' ? fillIn(t('selected'), { x: data.northStar.selected }) : t('pending') })}</h2>
            <div className={s.grid}>
              <div className={s.card} data-testid="ns-sourced">
                {t('sourced')}
                <strong>{egp(data.kpi['KPI-001_websiteSourced'])}</strong>
              </div>
              <div className={s.card} data-testid="ns-influenced">
                {t('influenced')}
                <strong>{egp(data.kpi['KPI-003_totalWebsiteInfluenced'])}</strong>
              </div>
              <div className={s.card}>
                {t('eligible')}
                <strong>{egp(data.kpi['KPI-006_totalEligible'])}</strong>
              </div>
              <div className={s.card}>
                {t('coverage')}
                <strong>
                  {pct(data.kpi['KPI-015_attributionCoveragePct'])} / {pct(data.kpi['KPI-016_overrideRatePct'])}
                </strong>
              </div>
            </div>
          </section>
          <section className={s.section}>
            <h2>{t('byClass')}</h2>
            <div className={s.tableWrap}>
              <table className={s.table} data-testid="kpi-crosstab">
                <thead>
                  <tr>
                    <th>{t('colClass')}</th>
                    <th className={s.num}>{t('colSigned')}</th>
                    <th className={s.num}>{t('colAmend')}</th>
                    <th className={s.num}>{t('colCancel')}</th>
                    <th className={s.num}>{t('colNet')}</th>
                    <th className={s.num}>{t('colNew')}</th>
                    <th className={s.num}>{t('colExisting')}</th>
                  </tr>
                </thead>
                <tbody>
                  {CLASSES.map((c) => (
                    <tr key={c}>
                      <td>{nameOf(CLASS_COPY, c, lang)}</td>
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
              {t('identities')}: <bdi dir="ltr">{Object.entries(data.identities ?? {}).map(([k, v]) => `${k}=${v ? 'OK' : 'BROKEN'}`).join(' · ')}</bdi> · {t('signedInPeriod')}: {data.contractsSignedInPeriod} · {t('vintage')}: {egp(data.vintage?.signedInPeriodCurrentNetMinor)}
            </p>
          </section>
          <section className={s.section}>
            <h2>{t('funnel')}</h2>
            <div className={s.grid}>
              <div className={s.card}>
                {t('rfqRate')}<strong>{pct(data.funnel?.['KPI-010_rfqQualificationRatePct'])}</strong>
              </div>
              <div className={s.card}>
                {t('proposalSigned')}<strong>{pct(data.funnel?.['KPI-011_proposalToSignedPct'])}</strong>
              </div>
              <div className={s.card}>
                {t('medianValue')}<strong>{egp(data.funnel?.['KPI-013_medianSignedValueMinor'])}</strong>
              </div>
              <div className={s.card}>
                {t('medianCycle')}<strong>{data.funnel?.['KPI-014_medianSalesCycleDays'] ?? '—'} {t('days')}</strong>
              </div>
              <div className={s.card}>
                {t('pipeline')}<strong>{egp(Number(data.pipeline?.['KPI-008_qualifiedOpenPipelineEgp'] ?? 0) * 100)}</strong>
              </div>
            </div>
            <p className={s.muted}>{Object.values(data.funnel?.blocked ?? {}).join(' · ')}</p>
          </section>
          <ContractDrillDown from={from} to={to} />
        </>
      )}
      {canReconcile && (
        <section className={s.section} data-testid="reconcile">
          <h2>{t('reconcile')}</h2>
          <div className={s.actions}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => reconcile(false)} data-testid="reconcile-check">
              {t('check')}
            </button>
            <button className={s.btn} onClick={() => window.confirm(t('confirmFix')) && reconcile(true)} data-testid="reconcile-fix">
              {t('checkFix')}
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
  const { lang, t, egp } = useKpiWords();
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
  const sel = (key: keyof typeof f, label: string, opts: readonly string[], copy: Record<string, Pair>) => (
    <label className={s.muted}>
      {label}{' '}
      <select value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} data-testid={`drill-${key}`}>
        <option value="">{t('all')}</option>
        {opts.map((o) => (
          <option key={o} value={o}>
            {nameOf(copy, o, lang)}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section className={s.section} data-testid="contract-drilldown">
      <h2>{t('drill')}</h2>
      <div className={s.filters}>
        {sel('cohort', t('cohort'), ['NEW', 'EXISTING'], COHORT_COPY)}
        {sel('attribution', t('attribution'), CLASSES, CLASS_COPY)}
        {sel('projectType', t('projectType'), PROJECT_TYPES, PROJECT_TYPE_COPY)}
        <button className={s.btn} onClick={load} data-testid="drill-apply">
          {t('apply')}
        </button>
        <a className={`${s.btn} ${s.btnSecondary}`} href={`/api/reports/contracts?${qs()}&format=csv`} data-testid="drill-csv">
          {t('csv')}
        </a>
      </div>
      {err && <p className={s.err}>{err}</p>}
      {res && (
        <>
          <p data-testid="drill-totals">
            {fillIn(t('totals'), { n: res.totals.contracts, signed: egp(res.totals.signedEgpMinor), net: egp(res.totals.currentNetEgpMinor) })}
          </p>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>{t('colContract')}</th>
                  <th>{t('colSignedAt')}</th>
                  <th>{t('cohort')}</th>
                  <th>{t('attribution')}</th>
                  <th>{t('projectType')}</th>
                  <th className={s.num}>{t('colValue')}</th>
                  <th className={s.num}>{t('colCurrentNet')}</th>
                </tr>
              </thead>
              <tbody>
                {res.rows.slice(0, 200).map((r: any) => (
                  <tr key={r.ref}>
                    <td data-label={t('colContract')} className={s.mono}>
                      <bdi dir="ltr">{r.ref}</bdi>
                      <div className={s.muted}><bdi dir="ltr">{r.opportunityRef}</bdi></div>
                    </td>
                    <td data-label={t('colSignedAt')}>{dateOnly(r.signedAt, lang)}</td>
                    <td data-label={t('cohort')}>{nameOf(COHORT_COPY, r.cohort, lang)}</td>
                    <td data-label={t('attribution')}>{nameOf(CLASS_COPY, r.attribution, lang)}</td>
                    <td data-label={t('projectType')}>{r.projectType ? nameOf(PROJECT_TYPE_COPY, r.projectType, lang) : '—'}</td>
                    <td data-label={t('colValue')} className={s.num}>{egp(r.signedEgpMinor)}</td>
                    <td data-label={t('colCurrentNet')} className={s.num}>{egp(r.currentNetEgpMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {res.rows.length > 200 && <p className={s.muted}>{fillIn(t('showing'), { n: res.rows.length })}</p>}
        </>
      )}
    </section>
  );
}
