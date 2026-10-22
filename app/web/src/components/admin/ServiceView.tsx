import type { AdminViewServerProps } from 'payload';
import { RMA_TRANSITIONS, TICKET_TRANSITIONS } from '@otonom/domain';
import { domainDb } from '@/lib/server.ts';
import { ActionForm, type Field } from './ActionForm.tsx';
import { EmptyState, NoAccess, StaffShell, staffOf, when } from './shell.tsx';
import s from './staff.module.css';

const RMA_FIELDS: Record<string, Field[]> = {
  APPROVED: [{ name: 'reason', label: 'Decision reason', type: 'text', required: true }],
  REJECTED: [{ name: 'reason', label: 'Decision reason', type: 'text', required: true }],
  REPLACED: [{ name: 'replacementSerial', label: 'Replacement serial (in stock)', type: 'text', required: true }],
};

function diagnosisSummary(raw: unknown) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(String(raw));
    if (parsed?.schema === 'OTONOM_SERVICE_DIAGNOSIS_V1') return `${parsed.diagnosticStatus}: ${parsed.observation}`;
  } catch {
    // Legacy diagnosis rows remain readable to authorized service staff.
  }
  return String(raw);
}

/** Service desk: safety tickets first, ownership claims, commissioning, RMA. The customer portal itself stays gated. */
export async function ServiceView(props: AdminViewServerProps) {
  const staff = staffOf(props);
  const shell = { ...props, title: 'Service desk', subtitle: 'Urgent safety tickets first. Warranty decisions are never automatic — every decision needs a written reason.' };
  if (!staff || !staff.can('service.manage')) return <StaffShell {...shell}>{<NoAccess need="service.manage" />}</StaffShell>;
  const db = domainDb();
  const search = props.initPageResult.req.searchParams;
  const statuses = ['OPEN', 'TRIAGE', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];
  const priorities = ['URGENT', 'HIGH', 'NORMAL', 'LOW'];
  const status = statuses.includes(search.get('status') ?? '') ? search.get('status')! : '';
  const priority = priorities.includes(search.get('priority') ?? '') ? search.get('priority')! : '';
  const query = (search.get('q') ?? '').trim().slice(0, 80);
  const assignee = (search.get('assignee') ?? '').trim().slice(0, 120);
  const model = (search.get('model') ?? '').trim().slice(0, 40);
  const unassigned = search.get('unassigned') === '1';
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  const from = validDate(search.get('from') ?? '') ? search.get('from')! : '';
  const to = validDate(search.get('to') ?? '') ? search.get('to')! : '';
  const page = Math.max(1, Math.min(10_000, Number.parseInt(search.get('page') ?? '1', 10) || 1));
  const ticketWhere: string[] = [];
  const ticketValues: unknown[] = [];
  if (status) { ticketValues.push(status); ticketWhere.push(`t.status=$${ticketValues.length}`); }
  if (priority) { ticketValues.push(priority); ticketWhere.push(`t.priority=$${ticketValues.length}`); }
  if (query) { ticketValues.push(`%${query}%`); ticketWhere.push(`(t.ref ILIKE $${ticketValues.length} OR t.serial ILIKE $${ticketValues.length} OR t.category ILIKE $${ticketValues.length} OR t.description ILIKE $${ticketValues.length})`); }
  if (assignee) { ticketValues.push(assignee); ticketWhere.push(`t.assigned_to=$${ticketValues.length}`); }
  if (model) { ticketValues.push(model); ticketWhere.push(`sku.model=$${ticketValues.length}`); }
  if (unassigned) ticketWhere.push(`t.assigned_to IS NULL`);
  if (from) { ticketValues.push(from); ticketWhere.push(`t.created_at >= $${ticketValues.length}::date`); }
  if (to) { ticketValues.push(to); ticketWhere.push(`t.created_at < ($${ticketValues.length}::date + interval '1 day')`); }
  const ticketWhereSql = ticketWhere.length ? `WHERE ${ticketWhere.join(' AND ')}` : '';
  const ticketFromSql = `FROM domain.service_tickets t LEFT JOIN domain.serial_units unit ON unit.serial=t.serial LEFT JOIN domain.skus sku ON sku.id=unit.sku_id`;
  const totalTickets = Number((await db.query(`SELECT count(*)::int AS n ${ticketFromSql} ${ticketWhereSql}`, ticketValues)).rows[0].n);
  const pageSize = 25;
  const tickets = (await db.query(`SELECT t.*, sku.model,
      (SELECT diagnosis FROM domain.service_diagnoses d WHERE d.ticket_id=t.id ORDER BY d.created_at DESC LIMIT 1) AS latest_diagnosis
    ${ticketFromSql} ${ticketWhereSql}
    ORDER BY (t.priority='URGENT') DESC, (t.status IN ('RESOLVED','CLOSED')), t.created_at DESC
    LIMIT $${ticketValues.length + 1} OFFSET $${ticketValues.length + 2}`, [...ticketValues, pageSize, (page - 1) * pageSize])).rows;
  const ticketPages = Math.max(1, Math.ceil(totalTickets / pageSize));
  const rmas = (await db.query(`
    SELECT r.*, i.condition AS inspection_condition,
      EXISTS (SELECT 1 FROM domain.rma_actions a WHERE a.rma_id=r.id AND a.action='REPAIR') AS has_repair_action
      FROM domain.rmas r LEFT JOIN domain.rma_inspections i ON i.rma_id=r.id
     WHERE r.status NOT IN ('CLOSED') ORDER BY r.created_at DESC LIMIT 50
  `)).rows;
  const claims = (await db.query(`SELECT * FROM domain.device_ownerships WHERE status='PENDING' ORDER BY created_at LIMIT 50`)).rows;
  const policy = (await db.query(`SELECT version, duration_months FROM domain.warranty_policies WHERE status='APPROVED' ORDER BY version DESC LIMIT 1`)).rows[0];
  const openRmaTickets = new Set(rmas.map((r) => r.ticket_id));
  return (
    <StaffShell {...shell}>
      <p className={s.banner} data-testid="warranty-policy">
        {policy ? `Approved warranty policy v${policy.version}.` : 'No approved warranty policy (BLOCKED — owner/legal). Coverage cannot start; no customer sees coverage dates.'}
      </p>

      <section className={s.section} data-testid="tickets">
        <h2>Tickets ({totalTickets})</h2>
        <form className={s.search} method="get" action="/admin/service-desk" role="search">
          <label>Search / بحث <input name="q" defaultValue={query} maxLength={80} placeholder="Ref, serial, category…" /></label>
          <label>Status / الحالة <select name="status" defaultValue={status}><option value="">All / الكل</option>{statuses.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
          <label>Priority / الأولوية <select name="priority" defaultValue={priority}><option value="">All / الكل</option>{priorities.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
          <button className={s.btn} type="submit">Filter / تصفية</button>
          <label>Assignee <input name="assignee" defaultValue={assignee} maxLength={120} /></label>
          <label>Model <input name="model" defaultValue={model} maxLength={40} /></label>
          <label>From <input name="from" type="date" defaultValue={from} /></label>
          <label>To <input name="to" type="date" defaultValue={to} /></label>
          <label><input name="unassigned" type="checkbox" value="1" defaultChecked={unassigned} /> Unassigned only</label>
        </form>
        {tickets.length === 0 && <EmptyState title="No service tickets / لا توجد تذاكر" detail="New requests will appear here with urgent safety issues placed first." />}
        {tickets.length > 0 && (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Priority / category</th>
                <th>Serial</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} data-ref={t.ref}>
                  <td data-label="Ref" className={s.mono}>
                    {t.ref}
                    <div className={s.muted}>{when(t.created_at)}</div>
                  </td>
                  <td data-label="Priority / category">
                    <span className={`${s.badge} ${t.priority === 'URGENT' ? s.urgent : ''}`}>{t.priority}</span> {t.category}
                    {t.priority === 'URGENT' && <div className={s.muted}>{t.callback_done_at ? `callback ${when(t.callback_done_at)}` : 'callback REQUIRED'}</div>}
                  </td>
                  <td data-label="Serial" className={s.mono}>{t.serial}{t.model && <div className={s.muted}>{t.model}</div>}</td>
                  <td data-label="Description">
                    <bdi>{String(t.description).slice(0, 140)}</bdi>
                    {t.resolution && <div className={s.muted}>Resolution: {t.resolution}</div>}
                    {t.latest_diagnosis && <div className={s.muted}>Latest diagnosis: {diagnosisSummary(t.latest_diagnosis)?.slice(0, 180)}</div>}
                  </td>
                  <td data-label="Status">
                    <span className={s.badge}>{t.status}</span> <span className={s.muted}>rev {t.revision}</span>
                    <div className={s.muted}>Assigned: {t.assigned_to ?? 'unassigned'}</div>
                  </td>
                  <td data-label="Actions">
                    <div className={s.actions}>
                      {t.priority === 'URGENT' && !t.callback_done_at && (
                        <ActionForm testId={`ticket-${t.ref}-callback`} endpoint={`/api/admin/tickets/${t.id}/callback`} label="Record callback" fields={[{ name: 'note', label: 'Call note', type: 'text', required: true }]} />
                      )}
                      {(TICKET_TRANSITIONS[t.status] ?? []).map((to) => (
                        <ActionForm
                          key={to}
                          testId={`ticket-${t.ref}-to-${to}`}
                          endpoint={`/api/admin/tickets/${t.id}/status`}
                          label={`→ ${to}`}
                          secondary
                          fixed={{ status: to, expectedRevision: t.revision }}
                          fields={['RESOLVED', 'CLOSED'].includes(to) && !t.resolution ? [{ name: 'resolution', label: 'Resolution', type: 'text', required: true }] : []}
                        />
                      ))}
                      {['TRIAGE', 'IN_PROGRESS', 'WAITING_CUSTOMER'].includes(t.status) && (
                        <ActionForm testId={`ticket-${t.ref}-diagnosis`} endpoint={`/api/admin/tickets/${t.id}/diagnoses`} label="Record structured diagnosis" secondary fields={[{ name: 'diagnosticStatus', label: 'Diagnostic status', type: 'select', options: ['OBSERVED','REPRODUCED','HYPOTHESIS','CONFIRMED','INCONCLUSIVE'], required: true }, { name: 'observation', label: 'Observed symptom', type: 'text', required: true }, { name: 'reproduction', label: 'Safe reproduction steps', type: 'text', required: true }, { name: 'hypothesis', label: 'Hypothesis (not a final decision)', type: 'text' }, { name: 'finalDiagnosis', label: 'Final diagnosis (required if confirmed)', type: 'text' }, { name: 'hardwareRevision', label: 'Verified hardware revision', type: 'text' }, { name: 'softwareInfo', label: 'Verified firmware/app info', type: 'text' }, { name: 'partsNote', label: 'Parts note (no billing)', type: 'text' }]} />
                      )}
                      {!['RESOLVED', 'CLOSED'].includes(t.status) && (
                        <ActionForm testId={`ticket-${t.ref}-assign`} endpoint={`/api/admin/tickets/${t.id}/assign`} label="Assign / reassign" secondary fixed={{ expectedRevision: t.revision }} fields={[{ name: 'assignedTo', label: 'Staff ID', type: 'text', required: true }, { name: 'reason', label: 'Assignment reason', type: 'text', required: true }]} />
                      )}
                      {staff.can('rma.decide') && !['RESOLVED', 'CLOSED'].includes(t.status) && !openRmaTickets.has(t.id) && (
                        <ActionForm testId={`ticket-${t.ref}-rma`} endpoint={`/api/admin/tickets/${t.id}/rma`} label="Open RMA" secondary />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        {ticketPages > 1 && <nav className={s.pager} aria-label="Service ticket pages">
          {page > 1 && <a href={`/admin/service-desk?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(status ? { status } : {}), ...(priority ? { priority } : {}), ...(assignee ? { assignee } : {}), ...(model ? { model } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}), ...(unassigned ? { unassigned: '1' } : {}), page: String(page - 1) })}`}>Previous / السابق</a>}
          <span>Page {Math.min(page, ticketPages)} of {ticketPages}</span>
          {page < ticketPages && <a href={`/admin/service-desk?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(status ? { status } : {}), ...(priority ? { priority } : {}), ...(assignee ? { assignee } : {}), ...(model ? { model } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}), ...(unassigned ? { unassigned: '1' } : {}), page: String(page + 1) })}`}>Next / التالي</a>}
        </nav>}
      </section>

      <section className={s.section} data-testid="rmas">
        <h2>Open RMAs ({rmas.length})</h2>
        {rmas.length === 0 && <EmptyState title="No open RMAs / لا توجد حالات مفتوحة" detail="Eligible returns opened from a service ticket will appear in this controlled queue." />}
        {rmas.map((r) => (
          <div key={r.id} className={s.card} data-ref={r.ref}>
            <span className={s.mono}>{r.ref}</span> · serial <span className={s.mono}>{r.serial}</span> · <span className={s.badge}>{r.status}</span>
            <div className={s.muted}>
              Coverage at request: {r.coverage_at_request}
              {r.decision_reason ? ` · decision: ${r.decision_reason}` : ''}
              {r.inspection_condition ? ` · inspection: ${r.inspection_condition}` : ''} · rev {r.revision}
            </div>
            {staff.can('rma.decide') && (
              <div className={s.actions}>
                {r.status === 'RECEIVED' && !r.inspection_condition && (
                  <ActionForm testId={`rma-${r.ref}-inspection`} endpoint={`/api/admin/rmas/${r.id}/inspections`} label="Record inspection" fields={[{ name: 'condition', label: 'Condition', type: 'select', options: ['UNOPENED','FUNCTIONAL','REPAIRABLE','DAMAGED','UNSAFE','UNKNOWN'], required: true }, { name: 'serialMatches', label: 'Serial matches', type: 'checkbox' }, { name: 'notes', label: 'Inspection notes', type: 'text', required: true }]} />
                )}
                {r.status === 'INSPECTED' && !r.has_repair_action && (
                  <ActionForm testId={`rma-${r.ref}-repair-action`} endpoint={`/api/admin/rmas/${r.id}/actions`} label="Record repair action" secondary fixed={{ action: 'REPAIR' }} fields={[{ name: 'note', label: 'Repair/parts note', type: 'text', required: true }]} />
                )}
                {r.status === 'INSPECTED' && (
                  <ActionForm testId={`rma-${r.ref}-refund-review`} endpoint={`/api/admin/rmas/${r.id}/actions`} label="Record refund review only" secondary fixed={{ action: 'REFUND_REVIEW' }} fields={[{ name: 'note', label: 'Review note', type: 'text', required: true }]} />
                )}
                {(RMA_TRANSITIONS[r.status] ?? []).filter((to) => to !== 'INSPECTED' || !!r.inspection_condition).filter((to) => to !== 'REPAIRED' || !!r.has_repair_action).map((to) => (
                  <ActionForm key={to} testId={`rma-${r.ref}-to-${to}`} endpoint={`/api/admin/rmas/${r.id}/transition`} label={`→ ${to}`} secondary fixed={{ to, expectedRevision: r.revision }} fields={RMA_FIELDS[to] ?? []} />
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className={s.section} data-testid="ownership-claims">
        <h2>Ownership claims awaiting review ({claims.length})</h2>
        {claims.length === 0 && <EmptyState title="No pending claims / لا توجد مطالبات معلقة" detail="Ownership evidence requiring staff verification will appear here." />}
        {claims.map((c) => (
          <div key={c.id} className={s.card}>
            Serial <span className={s.mono}>{c.serial}</span> · customer <span className={s.mono}>…{String(c.customer_ref).slice(-4)}</span>
            <div className={s.muted}>{String(c.evidence ?? '').slice(0, 200)}</div>
            {staff.can('ownership.verify') && (
              <ActionForm testId={`claim-${c.id}-decide`} endpoint={`/api/admin/ownerships/${c.id}/decision`} label="Decide" fields={[{ name: 'decision', label: 'Decision', type: 'select', options: ['VERIFIED', 'REJECTED'], required: true }, { name: 'reason', label: 'Reason', type: 'text', required: true }]} />
            )}
          </div>
        ))}
      </section>

      {staff.can('commissioning.record') && (
        <section className={s.section}>
          <h2>Record commissioning</h2>
          <ActionForm
            testId="commissioning"
            endpoint="/api/admin/serials/__SERIAL__/commissioning"
            label="Record"
            fields={[
              { name: 'serial', label: 'Serial', type: 'text', required: true },
              { name: 'projectRef', label: 'Project ref', type: 'text' },
              { name: 'installedAt', label: 'Installed', type: 'datetime', required: true },
              { name: 'commissionedAt', label: 'Commissioned', type: 'datetime', required: true },
              { name: 'technician', label: 'Technician', type: 'text', required: true },
            ]}
          />
        </section>
      )}
    </StaffShell>
  );
}
