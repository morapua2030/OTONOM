import type { AdminViewServerProps } from 'payload';
import { LEAD_STATUSES } from '@/lib/leads.ts';
import { metricsSummary, type MetricEvent } from '@/lib/metrics.ts';
import { domainDb } from '@/lib/server.ts';
import { EVENT_COPY, LEAD_PACKAGE_COPY, LEAD_STATUS_COPY, PAGE, pick, SALES_V } from '@/admin-ui/copy.ts';
import { count as fmt } from '@/admin-ui/format.ts';
import { NoAccess, StaffShell, staffOf, viewLang } from './shell.tsx';
import s from './staff.module.css';

const EVENTS = Object.keys(EVENT_COPY) as MetricEvent[];

/**
 * Sales overview (final release, owner 2026-11-04): booking-request cards (new today, waiting > 24 h, by status), the
 * privacy-first site metrics (today / 7 / 30 days, top packages, simulator funnel) and the OWNER-only CSV export.
 * Leads need `leads.read`; metrics need `metrics.read`; the export link is shown to `leads.export` only and the export
 * endpoint re-checks it.
 */
export async function SalesView(props: AdminViewServerProps) {
  const staff = staffOf(props);
  const lang = viewLang(props);
  const t = (k: keyof typeof SALES_V) => pick(SALES_V[k], lang);
  const shell = { ...props, title: pick(PAGE.siteNumbers.name, lang), subtitle: pick(PAGE.siteNumbers.line, lang) };
  if (!staff || !(staff.can('leads.read') || staff.can('metrics.read'))) return <StaffShell {...shell}><NoAccess need="leads.read" lang={lang} /></StaffShell>;
  const payload = props.initPageResult.req.payload;
  let leads: { newToday: number; waiting: number; byStatus: Array<[string, number]> } | null = null;
  if (staff.can('leads.read')) {
    const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = async (where: any) => (await payload.count({ collection: 'leads' as any, where, overrideAccess: true })).totalDocs;
    const [newToday, waiting, ...byStatus] = await Promise.all([
      count({ createdAt: { greater_than_equal: today.toISOString() } }),
      count({ and: [{ status: { equals: 'NEW' } }, { createdAt: { less_than: since24 } }] }),
      ...LEAD_STATUSES.map((st) => count({ status: { equals: st.value } })),
    ]);
    leads = { newToday, waiting, byStatus: LEAD_STATUSES.map((st, i) => [pick(LEAD_STATUS_COPY[st.value].label, lang), byStatus[i] ?? 0]) };
  }
  const metrics = staff.can('metrics.read') ? await metricsSummary(domainDb()).catch(() => null) : null;
  return (
    <StaffShell {...shell}>
      {leads ? (
        <section className={s.section} data-testid="sales-leads">
          <h2>{t('bookings')}</h2>
          <div className={s.grid}>
            <div className={s.card}><span className={s.muted}>{t('newToday')}</span><strong className={s.securityValue} data-testid="sales-new-today">{leads.newToday}</strong></div>
            <div className={s.card}><span className={s.muted}>{t('waiting')}</span><strong className={s.securityValue} data-testid="sales-waiting">{leads.waiting}</strong></div>
          </div>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <caption className={s.srOnly}>{t('byStatus')}</caption>
              <thead><tr><th scope="col">{t('status')}</th><th scope="col">{t('requests')}</th></tr></thead>
              <tbody>{leads.byStatus.map(([label, n]) => <tr key={label}><td data-label={t('status')}>{label}</td><td data-label={t('requests')}>{fmt(Number(n))}</td></tr>)}</tbody>
            </table>
          </div>
          <div className={s.actions}>
            <a className={s.btn} href="/admin/collections/leads">{t('openBookings')}</a>
            {staff.can('leads.export') ? <a className={`${s.btn} ${s.btnSecondary}`} href="/api/leads-export" data-testid="sales-export">{t('export')}</a> : null}
          </div>
        </section>
      ) : null}
      {metrics ? (
        <section className={s.section} data-testid="sales-metrics">
          <h2>{t('metrics')}</h2>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <caption className={s.srOnly}>{t('metricsCaption')}</caption>
              <thead><tr><th scope="col">{t('event')}</th><th scope="col">{t('today')}</th><th scope="col">{t('days7')}</th><th scope="col">{t('days30')}</th></tr></thead>
              <tbody>
                {EVENTS.map((e) => (
                  <tr key={e}><td data-label={t('event')}>{pick(EVENT_COPY[e], lang)}</td><td data-label={t('today')}>{fmt(metrics.totals.today[e] ?? 0)}</td><td data-label={t('days7')}>{fmt(metrics.totals.days7[e] ?? 0)}</td><td data-label={t('days30')}>{fmt(metrics.totals.days30[e] ?? 0)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>{t('funnel')}</h3>
          <ol data-testid="sales-funnel">{metrics.funnel.map((f) => <li key={f.event}>{pick(EVENT_COPY[f.event], lang)}: <strong>{fmt(f.count)}</strong></li>)}</ol>
          <h3>{t('topPackages')}</h3>
          <ol>{metrics.topPackages.length ? metrics.topPackages.map((p) => <li key={p.pkg}>{p.pkg in LEAD_PACKAGE_COPY ? pick(LEAD_PACKAGE_COPY[p.pkg as keyof typeof LEAD_PACKAGE_COPY], lang) : p.pkg}: <strong>{fmt(p.count)}</strong></li>) : <li>—</li>}</ol>
          <h3>{t('topPages')}</h3>
          <ol>{metrics.topRoutes.length ? metrics.topRoutes.map((r) => <li key={r.route}><bdi dir="ltr">{r.route}</bdi>: <strong>{r.count}</strong></li>) : <li>—</li>}</ol>
        </section>
      ) : null}
    </StaffShell>
  );
}
