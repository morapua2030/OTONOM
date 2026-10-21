import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { audit, DomainError, tx, type Ctx } from './tx.ts';

export type ProductDraftInput = {
  skuId: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  sortOrder?: number;
};

const clean = (value: string, max = 1000) => {
  const text = String(value ?? '').trim();
  if (!text || text.length > max) throw new DomainError('BILINGUAL_CONTENT_REQUIRED');
  return text;
};

export async function createProductDraft(pool: pg.Pool, ctx: Ctx, input: ProductDraftInput) {
  const sortOrder = input.sortOrder ?? 0;
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) throw new DomainError('INVALID_SORT_ORDER');
  const data = { titleAr: clean(input.titleAr, 160), titleEn: clean(input.titleEn, 160), summaryAr: clean(input.summaryAr), summaryEn: clean(input.summaryEn) };
  return tx(pool, async (c) => {
    const id = randomUUID();
    try {
      await c.query(
        `INSERT INTO domain.product_merchandising_drafts(id,sku_id,title_ar,title_en,summary_ar,summary_en,sort_order,status,proposed_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'DRAFT',$8)`,
        [id, input.skuId, data.titleAr, data.titleEn, data.summaryAr, data.summaryEn, sortOrder, ctx.actor.id],
      );
    } catch (e: any) {
      if (e?.code === '23503') throw new DomainError('NOT_FOUND');
      throw e;
    }
    await audit(c, ctx, { action: 'product_draft.create', entityType: 'product_draft', entityId: id, after: { skuId: input.skuId, sortOrder } });
    return { id, status: 'DRAFT', revision: 1 };
  });
}

const PRODUCT_DRAFT_TRANSITIONS: Record<string, string[]> = { DRAFT: ['IN_REVIEW'], IN_REVIEW: ['APPROVED','REJECTED','DRAFT'], APPROVED: [], REJECTED: ['DRAFT'] };

export async function transitionProductDraft(pool: pg.Pool, ctx: Ctx, id: string, to: string, expectedRevision: number, note = '') {
  return tx(pool, async (c) => {
    const draft = (await c.query(`SELECT status,revision,proposed_by FROM domain.product_merchandising_drafts WHERE id=$1 FOR UPDATE`, [id])).rows[0];
    if (!draft) throw new DomainError('NOT_FOUND');
    if (draft.revision !== expectedRevision) throw new DomainError('STALE_REVISION');
    if (!(PRODUCT_DRAFT_TRANSITIONS[draft.status] ?? []).includes(to)) throw new DomainError('ILLEGAL_TRANSITION');
    if (['APPROVED','REJECTED'].includes(to) && !String(note ?? '').trim()) throw new DomainError('REASON_REQUIRED');
    if (to === 'APPROVED' && draft.proposed_by === ctx.actor.id) throw new DomainError('FOUR_EYES_REQUIRED');
    await c.query(
      `UPDATE domain.product_merchandising_drafts SET status=$2,revision=revision+1,updated_at=now(),
       reviewed_by=CASE WHEN $2 IN ('APPROVED','REJECTED') THEN $3 ELSE reviewed_by END,
       review_note=CASE WHEN $2 IN ('APPROVED','REJECTED') THEN $4 ELSE review_note END WHERE id=$1`,
      [id, to, ctx.actor.id, note.trim() || null],
    );
    await audit(c, ctx, { action: 'product_draft.transition', entityType: 'product_draft', entityId: id, before: { status: draft.status, revision: draft.revision }, after: { status: to, revision: draft.revision + 1 }, reason: note.trim() || undefined });
    return { status: to, revision: draft.revision + 1 };
  });
}
