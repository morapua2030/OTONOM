import type { AdminViewServerProps } from 'payload';
import { commercialOperationsEnabled, domainDb } from '@/lib/server.ts';
import { NoAccess, StaffShell, minorToEgp, staffOf } from './shell.tsx';
import s from './staff.module.css';

const OPEN_STAGES = ['ENGINEERING_REVIEW', 'FREE_CONSULTATION', 'PAID_SITE_SURVEY', 'PROPOSAL_DRAFT', 'PROPOSAL_APPROVED', 'PROPOSAL_SENT', 'NEGOTIATION', 'ON_HOLD'];

function Tile({ label, value, href, testId, note }: { label: string; value: string | number; href?: string; testId?: string; note?: string }) {
  const inner = (
    <>
      {label}
      <strong>{value}</strong>
      {note && <span className={s.muted}>{note}</span>}
    </>
  );
  return href ? (
    <a className={s.card} href={href} data-testid={testId}>
      {inner}
    </a>
  ) : (
    <div className={s.card} data-testid={testId}>
      {inner}
    </div>
  );
}

/** Role-aware operational overview. Each block appears only for roles that hold the matching read permission; counts only, no invented money. */
export async function OverviewView(props: AdminViewServerProps) {
  const staff = staffOf(props);
  const req = props.initPageResult.req;
  const shell = { ...props, title: 'Overview', subtitle: 'What needs attention today. Figures come from the live local database (synthetic data).' };
  if (!staff) return <StaffShell {...shell}>{<NoAccess need="staff" />}</StaffShell>;
  const db = domainDb();
  const count = async (collection: any, where: any) => (await req.payload.count({ collection, where, req, overrideAccess: false })).totalDocs;
  const settings: any = await req.payload.findGlobal({ slug: 'settings', req, overrideAccess: true });
  const effectiveStage = settings?.stage === 'COMMERCIAL' && commercialOperationsEnabled() ? 'COMMERCIAL' : 'PREVIEW';
  const year = new Date().getUTCFullYear();

  const crm = staff.can('crm.read')
    ? {
        newRfqs: await count('rfqs', { status: { equals: 'SUBMITTED' } }),
        qualifying: await count('rfqs', { status: { in: ['INITIAL_QUALIFICATION', 'NEEDS_INFO'] } }),
        toConvert: await count('rfqs', { and: [{ status: { equals: 'QUALIFIED' } }, { opportunity: { exists: false } }] }),
        mine: await count('rfqs', { and: [{ assignedEngineer: { equals: staff.id } }, { status: { not_in: ['QUALIFIED', 'LOST', 'CANCELLED'] } }] }),
        open: await count('opportunities', { stage: { in: OPEN_STAGES } }),
        awaitingApproval: await count('opportunities', { stage: { equals: 'PROPOSAL_DRAFT' } }),
      }
    : null;
  const kpi = staff.can('kpi.read')
    ? (
        await db.query(
          `SELECT count(*)::int AS n, coalesce(sum(round(k.signed_value_minor * CASE WHEN k.currency='EGP' THEN 1 ELSE k.fx_rate_to_egp END)),0)::bigint AS v,
                  count(*) FILTER (WHERE a.class='UNKNOWN')::int AS unknown
             FROM domain.contracts k JOIN domain.attribution a ON a.contract_id=k.id WHERE k.signed_at >= $1`,
          [`${year}-01-01T00:00:00Z`],
        )
      ).rows[0]
    : null;
  const content =
    staff.can('content.review') || staff.can('content.publish') || staff.can('content.edit')
      ? { inReview: (await count('pages', { workflowStatus: { equals: 'IN_REVIEW' } })) + (await count('case-studies', { workflowStatus: { equals: 'IN_REVIEW' } })), approved: (await count('pages', { workflowStatus: { equals: 'APPROVED' } })) + (await count('case-studies', { workflowStatus: { equals: 'APPROVED' } })) }
      : null;
  const service = staff.can('service.manage')
    ? (await db.query(`SELECT count(*) FILTER (WHERE status NOT IN ('RESOLVED','CLOSED'))::int AS open, count(*) FILTER (WHERE priority='URGENT' AND callback_done_at IS NULL AND status NOT IN ('RESOLVED','CLOSED'))::int AS urgent FROM domain.service_tickets`)).rows[0]
    : null;
  const store =
    staff.can('order.confirm') || staff.can('price.approve')
      ? (await db.query(`SELECT (SELECT count(*) FROM domain.orders WHERE status IN ('PENDING_REVIEW','QUOTE_PENDING'))::int AS pending, (SELECT count(*) FROM domain.sku_prices WHERE status='DRAFT')::int AS prices, (SELECT count(*) FROM domain.sku_prices WHERE status='APPROVED')::int AS approved_prices`)).rows[0]
      : null;

  return (
    <StaffShell {...shell}>
      <p className={s.banner} data-testid="overview-stage">
        Effective operations stage: <strong>{effectiveStage}</strong> — customer store and warranty portal are {effectiveStage === 'COMMERCIAL' ? 'OPEN IN LOCAL SYNTHETIC TESTS' : 'CLOSED (server returns 404)'}.
      </p>
      {crm && (
        <section className={s.section} data-testid="overview-crm">
          <h2>Projects</h2>
          <div className={s.grid}>
            <Tile label="New RFQs" value={crm.newRfqs} href="/admin/workspace?status=SUBMITTED" />
            <Tile label="In qualification" value={crm.qualifying} href="/admin/workspace?status=INITIAL_QUALIFICATION" />
            <Tile label="Qualified, not yet converted" value={crm.toConvert} href="/admin/workspace?status=QUALIFIED" />
            <Tile label="Assigned to me (open)" value={crm.mine} href="/admin/workspace?mine=1" testId="overview-mine" />
            <Tile label="Open opportunities" value={crm.open} href="/admin/workspace" />
            <Tile label="Proposals awaiting owner approval" value={crm.awaitingApproval} href="/admin/workspace" />
          </div>
        </section>
      )}
      {kpi && (
        <section className={s.section} data-testid="overview-kpi">
          <h2>Signed contracts {year}</h2>
          <div className={s.grid}>
            <Tile label="Contracts" value={kpi.n} href="/admin/kpi" />
            <Tile label="Signed value (EGP equivalent)" value={minorToEgp(kpi.v)} href="/admin/kpi" />
            <Tile label="Unattributed (UNKNOWN)" value={kpi.unknown} note="needs attribution evidence review" href="/admin/kpi" testId="overview-unknown" />
          </div>
        </section>
      )}
      {content && (
        <section className={s.section} data-testid="overview-content">
          <h2>Content</h2>
          <div className={s.grid}>
            <Tile label="Waiting for review" value={content.inReview} href="/admin/content-review?status=IN_REVIEW" />
            <Tile label="Approved, not published" value={content.approved} href="/admin/content-review?status=APPROVED" />
          </div>
        </section>
      )}
      {service && (
        <section className={s.section} data-testid="overview-service">
          <h2>Service (internal)</h2>
          <div className={s.grid}>
            <Tile label="Open tickets" value={service.open} href="/admin/service-desk" />
            <Tile label="Urgent safety tickets without callback" value={service.urgent} href="/admin/service-desk" />
          </div>
        </section>
      )}
      {store && (
        <section className={s.section} data-testid="overview-store">
          <h2>Store (internal, gated)</h2>
          <div className={s.grid}>
            <Tile label="Orders / quotes pending" value={store.pending} href="/admin/store-ops" />
            <Tile label="Price proposals to review" value={store.prices} href="/admin/store-ops" />
            <Tile label="Approved prices" value={store.approved_prices} note="none until the owner approves a price list" href="/admin/store-ops" />
          </div>
        </section>
      )}
    </StaffShell>
  );
}
