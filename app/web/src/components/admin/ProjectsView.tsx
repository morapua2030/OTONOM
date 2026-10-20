import type { AdminViewServerProps } from 'payload';
import { OPP_TRANSITIONS, RFQ_TRANSITIONS, REASON_REQUIRED } from '@/collections/Crm.ts';
import { ActionForm, type Field } from './ActionForm.tsx';
import { NoAccess, StaffShell, staffOf, when } from './shell.tsx';
import s from './staff.module.css';

// Fields each target stage needs (mirrors the server-side guards in collections/Crm.ts — the server still enforces them).
const STAGE_FIELDS: Record<string, Field[]> = {
  PAID_SITE_SURVEY: [
    { name: 'surveyFeeAgreed', label: 'Fee agreed', type: 'checkbox' },
    { name: 'surveyInvoiceRef', label: 'Invoice ref', type: 'text' },
  ],
  PROPOSAL_APPROVED: [
    { name: 'proposalDocumentRef', label: 'Proposal document ref', type: 'text', required: true },
    { name: 'proposalValidUntil', label: 'Valid until', type: 'date', required: true },
    { name: 'capacityCheckNote', label: 'Capacity check', type: 'text', required: true },
  ],
  LOST: [{ name: 'lostReason', label: 'Reason', type: 'text', required: true }],
  ON_HOLD: [
    { name: 'onHoldReason', label: 'Reason', type: 'text', required: true },
    { name: 'followUpDate', label: 'Follow-up', type: 'date', required: true },
  ],
  DELIVERY_HANDOFF: [{ name: 'handoffOwner', label: 'Handoff owner', type: 'text', required: true }],
};
const OPEN_RFQ = ['SUBMITTED', 'INITIAL_QUALIFICATION', 'NEEDS_INFO', 'QUALIFIED'];
const PIPELINE = ['ENGINEERING_REVIEW', 'FREE_CONSULTATION', 'PAID_SITE_SURVEY', 'PROPOSAL_DRAFT', 'PROPOSAL_APPROVED', 'PROPOSAL_SENT', 'NEGOTIATION', 'ON_HOLD', 'WON_SIGNED', 'DELIVERY_HANDOFF'];

export async function ProjectsView(props: AdminViewServerProps) {
  const staff = staffOf(props);
  const req = props.initPageResult.req;
  const shell = { ...props, title: 'Projects workspace', subtitle: 'RFQ triage → qualification → conversion → pipeline → contract. Every action is re-checked by the server.' };
  if (!staff || !staff.can('crm.read')) return <StaffShell {...shell}>{<NoAccess need="crm.read" />}</StaffShell>;
  const write = staff.can('crm.write');
  // access-controlled reads (no overrideAccess): the collection rules decide what this user may see
  const sp = (props.searchParams ?? {}) as Record<string, string | undefined>;
  const want = OPEN_RFQ.includes(String(sp.status)) ? [String(sp.status)] : OPEN_RFQ;
  const q = String(sp.q ?? '').trim().slice(0, 80);
  const mine = sp.mine === '1';
  const page = Math.max(1, Math.min(1000, Number.parseInt(String(sp.page ?? '1'), 10) || 1));
  const and: any[] = [{ status: { in: want } }];
  if (mine) and.push({ assignedEngineer: { equals: staff.id } });
  if (q) and.push({ or: [{ ref: { like: q } }, { 'submitted.organisationName': { like: q } }, { 'submitted.fullName': { like: q } }, { governorate: { like: q } }] });
  const rfqPage = await req.payload.find({ collection: 'rfqs', where: { and }, sort: '-createdAt', limit: 25, page, depth: 0, req, overrideAccess: false });
  const rfqs = rfqPage.docs as any[];
  const link = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status: want.length === 1 ? want[0] : undefined, q: q || undefined, mine: mine ? '1' : undefined, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s0 = p.toString();
    return `/admin/workspace${s0 ? `?${s0}` : ''}`;
  };
  const opps = (await req.payload.find({ collection: 'opportunities', where: { stage: { in: PIPELINE } }, sort: '-updatedAt', limit: 100, depth: 0, req, overrideAccess: false })).docs as any[];
  return (
    <StaffShell {...shell}>
      <section className={s.section} data-testid="rfq-queue">
        <h2>RFQ queue ({rfqPage.totalDocs})</h2>
        <nav className={s.filters} aria-label="Filter RFQs by status">
          <a href={link({ status: undefined, page: undefined })} aria-current={want.length > 1}>
            All open
          </a>
          {OPEN_RFQ.map((st) => (
            <a key={st} href={link({ status: st, page: undefined })} aria-current={want.length === 1 && want[0] === st}>
              {st}
            </a>
          ))}
          <a href={link({ mine: mine ? undefined : '1', page: undefined })} aria-current={mine} data-testid="filter-mine">
            Assigned to me
          </a>
        </nav>
        <form className={s.search} method="get" action="/admin/workspace" role="search">
          {want.length === 1 && <input type="hidden" name="status" value={want[0]} />}
          {mine && <input type="hidden" name="mine" value="1" />}
          <label>
            <span className={s.muted}>Search ref / organisation / name / governorate </span>
            <input name="q" defaultValue={q} maxLength={80} data-testid="rfq-search" />
          </label>
          <button className={s.btn} type="submit">
            Search
          </button>
        </form>
        {rfqs.length === 0 && <p className={s.muted}>No RFQs match these filters.</p>}
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Status</th>
                <th>Customer / project</th>
                <th>Organisation</th>
                <th>Size</th>
                <th>Received</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rfqs.map((r) => (
                <tr key={r.id} data-ref={r.ref}>
                  <td data-label="Ref" className={s.mono}>
                    <bdi dir="ltr">{r.ref}</bdi>
                    {r.possibleDuplicateOf && <div className={s.muted}>possible duplicate</div>}
                    {r.assignedEngineer && <div className={s.muted}>{String(r.assignedEngineer) === staff.id ? 'assigned to you' : `assigned: user ${r.assignedEngineer}`}</div>}
                  </td>
                  <td data-label="Status">
                    <span className={s.badge}>{r.status}</span>
                  </td>
                  <td data-label="Customer / project">
                    {r.customerType} · {r.projectType}
                    <div className={s.muted}>{r.governorate}</div>
                  </td>
                  <td data-label="Organisation">
                    <bdi>{r.submitted?.organisationName ?? '—'}</bdi>
                  </td>
                  <td data-label="Size" className={s.num}>{r.submitted?.units ?? r.submitted?.circuits ?? '—'}</td>
                  <td data-label="Received" className={s.mono}>{when(r.createdAt)}</td>
                  <td data-label="Actions">
                    {write ? (
                      <div className={s.actions}>
                        {(RFQ_TRANSITIONS[r.status] ?? []).map((to) => (
                          <ActionForm
                            key={to}
                            testId={`rfq-${r.ref}-to-${to}`}
                            endpoint={`/api/rfqs/${r.id}`}
                            method="PATCH"
                            label={`→ ${to}`}
                            secondary
                            fixed={{ status: to }}
                            fields={REASON_REQUIRED.has(to) ? [{ name: 'statusReason', label: 'Reason', type: 'text', required: true }] : []}
                          />
                        ))}
                        {String(r.assignedEngineer ?? '') !== staff.id && !['QUALIFIED', 'LOST', 'CANCELLED'].includes(r.status) && (
                          <ActionForm testId={`rfq-${r.ref}-assign-me`} endpoint={`/api/rfqs/${r.id}`} method="PATCH" label="Assign to me" secondary fixed={{ assignedEngineer: Number(staff.id) }} />
                        )}
                        {r.status === 'QUALIFIED' && !r.opportunity && (
                          <>
                            <ActionForm testId={`rfq-${r.ref}-matches`} endpoint={`/api/workspace/rfqs/${r.id}/matches`} method="GET" label="Show matches" secondary showBody />
                            <ActionForm
                              testId={`rfq-${r.ref}-convert`}
                              endpoint={`/api/workspace/rfqs/${r.id}/convert`}
                              label="Convert to opportunity"
                              fields={[
                                { name: 'organisationId', label: 'Use organisation id', type: 'number' },
                                { name: 'createOrganisation', label: 'Create new org', type: 'checkbox' },
                                { name: 'linkToOpportunityId', label: 'Or attach to opportunity id', type: 'number' },
                                { name: 'confirmNotDuplicate', label: 'Not a duplicate', type: 'checkbox' },
                                { name: 'duplicateReason', label: 'Why', type: 'text' },
                              ]}
                            />
                          </>
                        )}
                      </div>
                    ) : (
                      <span className={s.muted}>read-only for your role</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rfqPage.totalPages > 1 && (
          <nav className={s.pager} aria-label="RFQ pages">
            {rfqPage.hasPrevPage && <a href={link({ page: String(page - 1) })}>← Previous</a>}
            <span className={s.muted}>
              Page {rfqPage.page} of {rfqPage.totalPages}
            </span>
            {rfqPage.hasNextPage && <a href={link({ page: String(page + 1) })}>Next →</a>}
          </nav>
        )}
      </section>

      <section className={s.section} data-testid="pipeline">
        <h2>Opportunity pipeline ({opps.length})</h2>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Stage</th>
                <th>Attribution (proposed)</th>
                <th className={s.num}>Est. value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {opps.map((o) => {
                const canSign = staff.can('contract.sign') && ['PROPOSAL_SENT', 'NEGOTIATION'].includes(o.stage);
                return (
                  <tr key={o.id} data-ref={o.ref}>
                    <td data-label="Ref" className={s.mono}>
                      <bdi dir="ltr">{o.ref}</bdi>
                      {o.contractRef && <div className={s.muted}>contract {o.contractRef}</div>}
                      {o.rfq && <div className={s.muted}>from website RFQ</div>}
                    </td>
                    <td data-label="Stage">
                      <span className={s.badge}>{o.stage}</span>
                    </td>
                    <td data-label="Attribution">
                      {o.attributionProposal}
                      {o.attributionEvidence && <div className={s.muted}>{String(o.attributionEvidence).slice(0, 90)}</div>}
                    </td>
                    <td data-label="Est. value" className={s.num}>{o.estimatedValueEgp ? `EGP ${Number(o.estimatedValueEgp).toLocaleString('en-GB')}` : '—'}</td>
                    <td data-label="Actions">
                      <div className={s.actions}>
                        {write &&
                          (OPP_TRANSITIONS[o.stage] ?? [])
                            .filter((to) => to !== 'PROPOSAL_APPROVED' || staff.can('proposal.approve'))
                            .map((to) => (
                              <ActionForm key={to} testId={`opp-${o.ref}-to-${to}`} endpoint={`/api/opportunities/${o.id}`} method="PATCH" label={`→ ${to}`} secondary fixed={{ stage: to }} fields={STAGE_FIELDS[to] ?? []} />
                            ))}
                        {canSign && (
                          <ActionForm
                            testId={`opp-${o.ref}-sign`}
                            endpoint={`/api/workspace/opportunities/${o.id}/sign-contract`}
                            label="Sign contract"
                            confirm="Record a signed contract? This locks attribution and cohort."
                            fields={[
                              { name: 'signedValueMinor', label: 'Signed value (EGP)', type: 'money', required: true },
                              { name: 'evidenceRef', label: 'Signed document ref', type: 'text', required: true },
                              { name: 'contractType', label: 'Type', type: 'select', options: ['PROJECT', 'SUPPLY', 'SERVICE', 'MAINTENANCE'], required: true },
                              { name: 'currency', label: 'Currency (if not EGP)', type: 'text' },
                              { name: 'fxRateToEgp', label: 'FX to EGP', type: 'number' },
                              { name: 'fxDate', label: 'FX date', type: 'date' },
                            ]}
                          />
                        )}
                        {['WON_SIGNED', 'DELIVERY_HANDOFF'].includes(o.stage) && (
                          <ActionForm testId={`opp-${o.ref}-handoff`} endpoint={`/api/workspace/opportunities/${o.id}/handoff-summary`} method="GET" label="Handoff summary" secondary showBody />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className={s.muted}>Signed values are recorded in the domain contracts ledger; the KPI dashboard reads them from there.</p>
      </section>
    </StaffShell>
  );
}
