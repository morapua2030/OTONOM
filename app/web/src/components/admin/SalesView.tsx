import type { AdminViewServerProps } from 'payload';
import { LEAD_STATUSES } from '@/lib/leads.ts';
import { metricsSummary, type MetricEvent } from '@/lib/metrics.ts';
import { domainDb } from '@/lib/server.ts';
import { NoAccess, StaffShell, staffOf } from './shell.tsx';
import s from './staff.module.css';

const EVENT_LABEL: Record<MetricEvent, string> = {
  page_view: 'Page views / مشاهدات',
  whatsapp_click: 'WhatsApp clicks / واتساب',
  call_click: 'Call clicks / اتصال',
  package_premium: 'Premium chosen',
  package_plus: 'Plus chosen',
  package_essential: 'Essential chosen',
  sim_start: 'Simulator started',
  sim_stage_2: 'Simulator: rooms',
  sim_stage_3: 'Simulator: try it',
  sim_stage_4: 'Simulator: plan',
  plan_sent: 'Plan sent',
};

/**
 * Sales overview (final release, owner 2026-11-04): booking-request cards (new today, waiting > 24 h, by status), the
 * privacy-first site metrics (today / 7 / 30 days, top packages, simulator funnel) and the OWNER-only CSV export.
 * Leads need `leads.read`; metrics need `metrics.read`; the export link is shown to `leads.export` only and the export
 * endpoint re-checks it.
 */
export async function SalesView(props: AdminViewServerProps) {
  const staff = staffOf(props);
  const shell = { ...props, title: 'Sales & site metrics', subtitle: 'Booking requests from the site and aggregated site metrics (no visitor is identified).' };
  if (!staff || !(staff.can('leads.read') || staff.can('metrics.read'))) return <StaffShell {...shell}><NoAccess need="leads.read" /></StaffShell>;
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
    leads = { newToday, waiting, byStatus: LEAD_STATUSES.map((st, i) => [`${st.ar} — ${st.en}`, byStatus[i] ?? 0]) };
  }
  const metrics = staff.can('metrics.read') ? await metricsSummary(domainDb()).catch(() => null) : null;
  return (
    <StaffShell {...shell}>
      {leads ? (
        <section className={s.section} data-testid="sales-leads">
          <h2>Booking requests</h2>
          <div className={s.grid}>
            <div className={s.card}><span className={s.muted}>New today</span><strong className={s.securityValue} data-testid="sales-new-today">{leads.newToday}</strong></div>
            <div className={s.card}><span className={s.muted}>New, waiting &gt; 24 h</span><strong className={s.securityValue} data-testid="sales-waiting">{leads.waiting}</strong></div>
          </div>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <caption className={s.srOnly}>Booking requests by status</caption>
              <thead><tr><th scope="col">Status</th><th scope="col">Requests</th></tr></thead>
              <tbody>{leads.byStatus.map(([label, n]) => <tr key={label}><td data-label="Status">{label}</td><td data-label="Requests">{n}</td></tr>)}</tbody>
            </table>
          </div>
          <div className={s.actions}>
            <a className={s.btn} href="/admin/collections/leads">Open booking requests</a>
            {staff.can('leads.export') ? <a className={`${s.btn} ${s.btnSecondary}`} href="/api/leads-export" data-testid="sales-export">Export CSV (OWNER)</a> : null}
          </div>
        </section>
      ) : null}
      {metrics ? (
        <section className={s.section} data-testid="sales-metrics">
          <h2>Site metrics</h2>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <caption className={s.srOnly}>Site events today, last 7 days and last 30 days</caption>
              <thead><tr><th scope="col">Event</th><th scope="col">Today</th><th scope="col">7 days</th><th scope="col">30 days</th></tr></thead>
              <tbody>
                {(Object.keys(EVENT_LABEL) as MetricEvent[]).map((e) => (
                  <tr key={e}><td data-label="Event">{EVENT_LABEL[e]}</td><td data-label="Today">{metrics.totals.today[e] ?? 0}</td><td data-label="7 days">{metrics.totals.days7[e] ?? 0}</td><td data-label="30 days">{metrics.totals.days30[e] ?? 0}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Simulator funnel (30 days)</h3>
          <ol data-testid="sales-funnel">{metrics.funnel.map((f) => <li key={f.event}>{EVENT_LABEL[f.event]}: <strong>{f.count}</strong></li>)}</ol>
          <h3>Top packages (30 days)</h3>
          <ol>{metrics.topPackages.length ? metrics.topPackages.map((p) => <li key={p.pkg}>{p.pkg}: <strong>{p.count}</strong></li>) : <li>—</li>}</ol>
          <h3>Top pages (30 days)</h3>
          <ol>{metrics.topRoutes.length ? metrics.topRoutes.map((r) => <li key={r.route}><bdi dir="ltr">{r.route}</bdi>: <strong>{r.count}</strong></li>) : <li>—</li>}</ol>
        </section>
      ) : null}
    </StaffShell>
  );
}
