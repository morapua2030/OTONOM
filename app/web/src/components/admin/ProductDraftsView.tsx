import type { AdminViewServerProps } from 'payload';
import { domainDb } from '@/lib/server.ts';
import { ActionForm } from './ActionForm.tsx';
import { EmptyState, NoAccess, StaffShell, staffOf, when } from './shell.tsx';
import s from './staff.module.css';

/** Review-only merchandising drafts. Approval never mutates the public product registry. */
export async function ProductDraftsView(props: AdminViewServerProps) {
  const staff = staffOf(props);
  const shell = { ...props, title: 'Product drafts / مسودات المنتجات', subtitle: 'Bilingual review queue only. Approval does not publish specifications, prices, warranty or availability.' };
  if (!staff || !(staff.can('product.draft') || staff.can('product.approve'))) return <StaffShell {...shell}><NoAccess need="product.draft" /></StaffShell>;
  const db = domainDb();
  const skus = (await db.query(`SELECT id,code,model FROM domain.skus ORDER BY code`)).rows;
  const drafts = (await db.query(`SELECT d.*,s.code,s.model FROM domain.product_merchandising_drafts d JOIN domain.skus s ON s.id=d.sku_id ORDER BY (d.status='IN_REVIEW') DESC,d.sort_order,d.created_at DESC LIMIT 100`)).rows;
  return (
    <StaffShell {...shell}>
      <p className={s.banner} data-testid="product-draft-warning">Review-only / للمراجعة فقط — public product facts remain unchanged until a separately governed publication step exists.</p>
      {staff.can('product.draft') && <section className={s.section} data-testid="product-draft-create">
        <h2>New bilingual draft / مسودة ثنائية اللغة</h2>
        <ActionForm endpoint="/api/admin/product-drafts" label="Create draft / إنشاء" fields={[
          { name: 'skuId', label: 'SKU', type: 'select', options: skus.map((item) => item.id), required: true },
          { name: 'titleAr', label: 'العنوان العربي', type: 'text', required: true },
          { name: 'titleEn', label: 'English title', type: 'text', required: true },
          { name: 'summaryAr', label: 'الملخص العربي', type: 'text', required: true },
          { name: 'summaryEn', label: 'English summary', type: 'text', required: true },
          { name: 'sortOrder', label: 'Sort order', type: 'number' },
        ]} />
      </section>}
      <section className={s.section} data-testid="product-draft-queue">
        <h2>Draft queue ({drafts.length})</h2>
        {drafts.length === 0 && <EmptyState title="No product drafts / لا توجد مسودات" detail="Create a bilingual draft above. Public product facts remain unchanged until the governed publication step." />}
        {drafts.map((draft) => <article className={s.card} key={draft.id} data-status={draft.status}>
          <h3><bdi>{draft.code}</bdi> · <span className={s.badge}>{draft.status}</span></h3>
          <p lang="ar" dir="rtl"><strong>{draft.title_ar}</strong> — {draft.summary_ar}</p>
          <p lang="en" dir="ltr"><strong>{draft.title_en}</strong> — {draft.summary_en}</p>
          <p className={s.muted}>rev {draft.revision} · sort {draft.sort_order} · {when(draft.updated_at)}</p>
          <div className={s.actions}>
            {draft.status === 'DRAFT' && staff.can('product.draft') && <ActionForm endpoint={`/api/admin/product-drafts/${draft.id}/submit`} label="Submit review" secondary fixed={{ expectedRevision: draft.revision }} />}
            {draft.status === 'IN_REVIEW' && staff.can('product.approve') && <ActionForm endpoint={`/api/admin/product-drafts/${draft.id}/decision`} label="Decide" fixed={{ expectedRevision: draft.revision }} fields={[{ name: 'decision', label: 'Decision', type: 'select', options: ['APPROVED','REJECTED','DRAFT'], required: true }, { name: 'reason', label: 'Review note', type: 'text', required: true }]} />}
          </div>
        </article>)}
      </section>
    </StaffShell>
  );
}
