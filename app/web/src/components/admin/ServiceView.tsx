import type { AdminViewServerProps } from 'payload';
import { RMA_TRANSITIONS, TICKET_TRANSITIONS } from '@otonom/domain';
import { domainDb } from '@/lib/server.ts';
import { ActionForm, type Field } from './ActionForm.tsx';
import { NoAccess, StaffShell, staffOf, when } from './shell.tsx';
import s from './staff.module.css';

const RMA_FIELDS: Record<string, Field[]> = {
  APPROVED: [{ name: 'reason', label: 'Decision reason', type: 'text', required: true }],
  REJECTED: [{ name: 'reason', label: 'Decision reason', type: 'text', required: true }],
  REPLACED: [{ name: 'replacementSerial', label: 'Replacement serial (in stock)', type: 'text', required: true }],
};

/** Service desk: safety tickets first, ownership claims, commissioning, RMA. The customer portal itself stays gated. */
export async function ServiceView(props: AdminViewServerProps) {
  const staff = staffOf(props);
  const shell = { ...props, title: 'Service desk', subtitle: 'Urgent safety tickets first. Warranty decisions are never automatic — every decision needs a written reason.' };
  if (!staff || !staff.can('service.manage')) return <StaffShell {...shell}>{<NoAccess need="service.manage" />}</StaffShell>;
  const db = domainDb();
  const tickets = (await db.query(`SELECT * FROM domain.service_tickets ORDER BY (priority='URGENT') DESC, (status IN ('RESOLVED','CLOSED')), created_at DESC LIMIT 80`)).rows;
  const rmas = (await db.query(`SELECT * FROM domain.rmas WHERE status NOT IN ('CLOSED') ORDER BY created_at DESC LIMIT 50`)).rows;
  const claims = (await db.query(`SELECT * FROM domain.device_ownerships WHERE status='PENDING' ORDER BY created_at LIMIT 50`)).rows;
  const policy = (await db.query(`SELECT version, duration_months FROM domain.warranty_policies WHERE status='APPROVED' ORDER BY version DESC LIMIT 1`)).rows[0];
  const openRmaTickets = new Set(rmas.map((r) => r.ticket_id));
  return (
    <StaffShell {...shell}>
      <p className={s.banner} data-testid="warranty-policy">
        {policy ? `Approved warranty policy v${policy.version}.` : 'No approved warranty policy (BLOCKED — owner/legal). Coverage cannot start; no customer sees coverage dates.'}
      </p>

      <section className={s.section} data-testid="tickets">
        <h2>Tickets ({tickets.length})</h2>
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
                  <td data-label="Serial" className={s.mono}>{t.serial}</td>
                  <td data-label="Description">
                    <bdi>{String(t.description).slice(0, 140)}</bdi>
                    {t.resolution && <div className={s.muted}>Resolution: {t.resolution}</div>}
                  </td>
                  <td data-label="Status">
                    <span className={s.badge}>{t.status}</span>
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
                          fixed={{ status: to }}
                          fields={['RESOLVED', 'CLOSED'].includes(to) && !t.resolution ? [{ name: 'resolution', label: 'Resolution', type: 'text', required: true }] : []}
                        />
                      ))}
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
      </section>

      <section className={s.section} data-testid="rmas">
        <h2>Open RMAs ({rmas.length})</h2>
        {rmas.map((r) => (
          <div key={r.id} className={s.card} data-ref={r.ref}>
            <span className={s.mono}>{r.ref}</span> · serial <span className={s.mono}>{r.serial}</span> · <span className={s.badge}>{r.status}</span>
            <div className={s.muted}>
              Coverage at request: {r.coverage_at_request}
              {r.decision_reason ? ` · decision: ${r.decision_reason}` : ''}
            </div>
            {staff.can('rma.decide') && (
              <div className={s.actions}>
                {(RMA_TRANSITIONS[r.status] ?? []).map((to) => (
                  <ActionForm key={to} testId={`rma-${r.ref}-to-${to}`} endpoint={`/api/admin/rmas/${r.id}/transition`} label={`→ ${to}`} secondary fixed={{ to }} fields={RMA_FIELDS[to] ?? []} />
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className={s.section} data-testid="ownership-claims">
        <h2>Ownership claims awaiting review ({claims.length})</h2>
        {claims.map((c) => (
          <div key={c.id} className={s.card}>
            Serial <span className={s.mono}>{c.serial}</span> · customer {c.customer_ref}
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
