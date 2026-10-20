import type { AdminViewServerProps } from 'payload';
import { CONTENT_TRANSITIONS } from '@otonom/domain';
import { ActionForm, type Field } from './ActionForm.tsx';
import { NoAccess, StaffShell, staffOf, when } from './shell.tsx';
import s from './staff.module.css';

const COLLECTIONS = [
  { slug: 'pages', label: 'Pages', title: 'title', body: 'body' },
  { slug: 'case-studies', label: 'Case studies', title: 'title', body: 'body' },
] as const;
const ACTIVE = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'WITHDRAWN'];

/**
 * Editorial queue: what needs review, what is blocked and why. Every button is a normal PATCH on the collection,
 * so the server-side workflow hook (transitions, four-eyes, publish gates) remains the only authority.
 */
export async function ContentReviewView(props: AdminViewServerProps) {
  const staff = staffOf(props);
  const req = props.initPageResult.req;
  const shell = { ...props, title: 'Content review', subtitle: 'Draft → In review → Approved → Published. The last editor cannot approve their own change; returning content needs a note.' };
  if (!staff || !(staff.can('content.edit') || staff.can('content.review') || staff.can('content.publish')))
    return <StaffShell {...shell}>{<NoAccess need="content.edit / content.review" />}</StaffShell>;
  const sp = (props.searchParams ?? {}) as Record<string, string | undefined>;
  const status = ACTIVE.includes(String(sp.status)) ? String(sp.status) : 'IN_REVIEW';
  const sections = await Promise.all(
    COLLECTIONS.map(async (c) => ({
      ...c,
      docs: (await req.payload.find({ collection: c.slug, where: { workflowStatus: { equals: status } }, draft: true, locale: 'all' as any, sort: '-updatedAt', limit: 50, depth: 0, req, overrideAccess: false })).docs as any[],
    })),
  );
  const consentIds = [...new Set(sections.flatMap((x) => x.docs.map((d) => (typeof d.consent === 'object' ? d.consent?.id : d.consent)).filter(Boolean)))];
  const consents = consentIds.length ? ((await req.payload.find({ collection: 'consents', where: { id: { in: consentIds } }, depth: 0, limit: 200, req, overrideAccess: false })).docs as any[]) : [];
  const consentStatus = new Map(consents.map((c) => [c.id, c.status]));
  const has = (v: any, l: 'ar' | 'en') => !!String(v?.[l] ?? '').trim();
  return (
    <StaffShell {...shell}>
      <nav className={s.filters} aria-label="Filter by workflow status">
        {ACTIVE.map((st) => (
          <a key={st} href={`/admin/content-review?status=${st}`} aria-current={st === status}>
            {st}
          </a>
        ))}
      </nav>
      {sections.map((c) => (
        <section key={c.slug} className={s.section} data-testid={`review-${c.slug}`}>
          <h2>
            {c.label} — {status} ({c.docs.length})
          </h2>
          {c.docs.length === 0 && <p className={s.muted}>Nothing in this state.</p>}
          {c.docs.map((d) => {
            const cid = typeof d.consent === 'object' ? d.consent?.id : d.consent;
            const checks = [
              { k: 'Arabic title + body', ok: has(d[c.title], 'ar') && has(d[c.body], 'ar') },
              { k: 'English title + body', ok: has(d[c.title], 'en') && has(d[c.body], 'en') },
              { k: `Claims (${d.claimStatus ?? 'NONE'})`, ok: ['NONE', 'INDEPENDENTLY_DEMONSTRATED', 'CERTIFIED'].includes(d.claimStatus ?? 'NONE') },
              ...(d.requiresConsent ? [{ k: `Written consent (${cid ? (consentStatus.get(cid) ?? 'unknown') : 'missing'})`, ok: !!cid && consentStatus.get(cid) === 'VALID' }] : []),
              ...(c.slug === 'case-studies' ? [{ k: 'Media privacy screening', ok: !!d.mediaScreened }] : []),
            ];
            const selfEdited = String(d.lastEditedBy ?? '') === staff.id;
            const transitions = (CONTENT_TRANSITIONS[d.workflowStatus] ?? []).filter((t) => staff.can(t.perm));
            const title = d[c.title]?.en || d[c.title]?.ar || d.slug;
            return (
              <article key={d.id} className={s.card} data-slug={d.slug}>
                <strong>
                  <bdi>{title}</bdi>
                </strong>
                <div className={s.muted}>
                  /{d.slug} · updated {when(d.updatedAt)} · last edited by user {d.lastEditedBy ?? '—'} {selfEdited && '(you)'}
                </div>
                <ul className={s.checks}>
                  {checks.map((x) => (
                    <li key={x.k} data-ok={x.ok}>
                      {x.ok ? '✓' : '✗'} {x.k}
                    </li>
                  ))}
                </ul>
                {d.reviewNote && (
                  <p className={s.banner} data-testid="review-note">
                    Reviewer note (user {d.reviewNoteBy}): <bdi>{d.reviewNote}</bdi>
                  </p>
                )}
                {selfEdited && d.workflowStatus === 'IN_REVIEW' && <p className={s.muted}>You made the last change — another reviewer must approve it.</p>}
                <div className={s.actions}>
                  {transitions
                    .filter((t) => !(t.to === 'APPROVED' && selfEdited))
                    .map((t) => {
                      const fields: Field[] = d.workflowStatus === 'IN_REVIEW' && t.to === 'DRAFT' ? [{ name: 'reviewNote', label: 'What needs to change', type: 'text', required: true }] : [];
                      const fixed = t.to === 'PUBLISHED' ? { workflowStatus: 'PUBLISHED', _status: 'published' } : { workflowStatus: t.to };
                      const label = d.workflowStatus === 'IN_REVIEW' && t.to === 'DRAFT' ? 'Return to author' : `→ ${t.to}`;
                      return (
                        <ActionForm
                          key={t.to}
                          testId={`content-${d.slug}-to-${t.to}`}
                          endpoint={`/api/${c.slug}/${d.id}`}
                          method="PATCH"
                          label={label}
                          secondary={t.to !== 'APPROVED' && t.to !== 'PUBLISHED'}
                          fixed={fixed}
                          fields={fields}
                          confirm={t.to === 'PUBLISHED' ? 'Publish this content on the public site?' : t.to === 'WITHDRAWN' ? 'Withdraw this content from the public site?' : undefined}
                        />
                      );
                    })}
                  <a className={`${s.btn} ${s.btnSecondary}`} href={`/admin/collections/${c.slug}/${d.id}`}>
                    Edit
                  </a>
                  <a className={`${s.btn} ${s.btnSecondary}`} href={`/admin/collections/${c.slug}/${d.id}/versions`}>
                    Revision history
                  </a>
                </div>
              </article>
            );
          })}
        </section>
      ))}
    </StaffShell>
  );
}
