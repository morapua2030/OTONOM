import { BusinessRuleError } from './errors.ts';
import { Forbidden, type CollectionAfterChangeHook, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload';
import { auditRow } from './audit.ts';

const PUBLISHABLE = ['INDEPENDENTLY_DEMONSTRATED', 'CERTIFIED'];
/** Claim status of a content item = derived from the registry claims it uses (never self-declared by the editor). */
export async function deriveClaimStatus(req: PayloadRequest, claimsUsed: unknown): Promise<string> {
  const ids = (Array.isArray(claimsUsed) ? claimsUsed : []).map((c: any) => (c && typeof c === 'object' ? c.id : c)).filter(Boolean);
  if (!ids.length) return 'NONE';
  const found = await req.payload.find({ collection: 'claims', where: { id: { in: ids } }, overrideAccess: true, depth: 0, limit: 200, req });
  if (found.docs.length !== ids.length) return 'REVIEW_PENDING';
  const bad = (found.docs as any[]).find((c) => !PUBLISHABLE.includes(c.status));
  if (bad) return bad.status;
  return (found.docs as any[]).some((c) => c.status === 'INDEPENDENTLY_DEMONSTRATED') ? 'INDEPENDENTLY_DEMONSTRATED' : 'CERTIFIED';
}
import { can, publishGate, CONTENT_TRANSITIONS } from '@otonom/domain';

function localized(full: any, data: any, field: string, locale: string, reqLocale: string) {
  if (reqLocale === locale && data[field] !== undefined) return data[field];
  const v = full?.[field];
  return v && typeof v === 'object' ? v[locale] : undefined;
}

/**
 * Server-enforced Draft → In Review → Approved → Published → Withdrawn workflow on top of Payload drafts/versions.
 * Verified in the spike (V-4). `consentAlwaysRequired` is used for identified case studies (written consent, G-2/DR-032).
 */
export function editorialWorkflow(opts: { slug: string; contentFields: string[]; titleField?: string; bodyField?: string; consentAlwaysRequired?: boolean }): CollectionBeforeChangeHook {
  const titleField = opts.titleField ?? 'title';
  const bodyField = opts.bodyField ?? 'body';
  return async ({ data, originalDoc, req, operation, context }) => {
    if ((context as any)?.systemWithdraw) return data;
    const role = (req.user as any)?.role;
    data.reviewedBy = originalDoc?.reviewedBy ?? null;
    // system-derived fields are never client-controlled
    data.claimStatus = originalDoc?.claimStatus ?? 'NONE';
    data.lastEditedBy = originalDoc?.lastEditedBy ?? null;
    if (opts.consentAlwaysRequired) data.requiresConsent = true;
    if (operation === 'create') {
      if (data._status === 'published') throw new Forbidden(req.t);
      data.workflowStatus = 'DRAFT';
      data.reviewedBy = null;
      data.lastEditedBy = req.user ? String(req.user.id) : null;
      data.claimStatus = await deriveClaimStatus(req, data.claimsUsed);
      return data;
    }
    const from: string = originalDoc?.workflowStatus ?? 'DRAFT';
    const to: string = data.workflowStatus ?? from;
    const publishing = data._status === 'published';
    // review notes are recorded only together with a status transition (never edited silently afterwards)
    const note = String(data.reviewNote ?? '').trim();
    data.reviewNote = originalDoc?.reviewNote ?? null;
    data.reviewNoteBy = originalDoc?.reviewNoteBy ?? null;
    if (to !== from) {
      const rule = (CONTENT_TRANSITIONS[from] ?? []).find((t) => t.to === to);
      if (!rule) throw new BusinessRuleError('ILLEGAL_TRANSITION', 409);
      if (!can(role, rule.perm)) throw new Forbidden(req.t);
      // a reviewer sending content back must say why (the author sees the note; history is kept in versions + audit)
      if (from === 'IN_REVIEW' && to === 'DRAFT' && !note) throw new BusinessRuleError('ILLEGAL_TRANSITION:REVIEW_NOTE_REQUIRED', 422);
      if (note) {
        data.reviewNote = note.slice(0, 2000);
        data.reviewNoteBy = String(req.user!.id);
      }
      // four-eyes: the last person who changed the content cannot approve it (PROPOSED control, see WAVE 4 report)
      if (to === 'APPROVED' && originalDoc?.lastEditedBy && String(originalDoc.lastEditedBy) === String(req.user!.id)) throw new BusinessRuleError('ILLEGAL_TRANSITION:SELF_REVIEW', 409);
      if (to === 'APPROVED') data.reviewedBy = String(req.user!.id);
      if (to === 'DRAFT' || to === 'IN_REVIEW') data.reviewedBy = null;
      if (to === 'PUBLISHED' && !publishing) throw new BusinessRuleError('PUBLISH_REQUIRES_STATUS', 400);
      if (to === 'WITHDRAWN') data._status = 'draft';
    } else {
      if (publishing && from !== 'PUBLISHED') throw new BusinessRuleError('ILLEGAL_TRANSITION', 409);
      const changed = opts.contentFields.some((f) => f in data && JSON.stringify(data[f]) !== JSON.stringify(originalDoc?.[f]));
      if (changed) data.lastEditedBy = req.user ? String(req.user.id) : null;
      if (changed && from !== 'DRAFT') {
        if (!can(role, 'content.edit')) throw new Forbidden(req.t);
        data.workflowStatus = 'DRAFT';
        data.reviewedBy = null;
        if (from === 'PUBLISHED' && !publishing) data._status = 'draft';
      }
    }
    if (publishing && to === 'PUBLISHED') {
      const full: any = await req.payload.findByID({ collection: opts.slug as any, id: originalDoc.id, locale: 'all' as any, draft: true, overrideAccess: true, depth: 0, req });
      const reqLocale = String(req.locale ?? 'ar');
      const consentId = data.consent ?? full?.consent;
      let consentStatus: string | null = 'MISSING';
      if (consentId) {
        const c: any = await req.payload.findByID({ collection: 'consents', id: typeof consentId === 'object' ? consentId.id : consentId, overrideAccess: true, req }).catch(() => null);
        consentStatus = c?.status ?? 'MISSING';
      }
      const blockers = publishGate({
        status: from,
        reviewedBy: originalDoc?.reviewedBy ?? null,
        titleAr: localized(full, data, titleField, 'ar', reqLocale),
        titleEn: localized(full, data, titleField, 'en', reqLocale),
        bodyAr: localized(full, data, bodyField, 'ar', reqLocale),
        bodyEn: localized(full, data, bodyField, 'en', reqLocale),
        requiresConsent: opts.consentAlwaysRequired ? true : (data.requiresConsent ?? full?.requiresConsent ?? false),
        consentStatus,
        claimStatus: (data.claimStatus = await deriveClaimStatus(req, data.claimsUsed ?? full?.claimsUsed)),
      });
      if (blockers.length) throw new BusinessRuleError(`PUBLISH_BLOCKED:${blockers.join(',')}`, 422);
    }
    return data;
  };
}

export const WORKFLOW_FIELDS = [
  { name: 'workflowStatus', type: 'select', defaultValue: 'DRAFT', options: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'WITHDRAWN'], admin: { position: 'sidebar' } },
  { name: 'reviewedBy', type: 'text', admin: { position: 'sidebar', readOnly: true } },
  { name: 'aiAssisted', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar', description: 'AI-drafted copy must be human-reviewed before publication' } },
  { name: 'claimsUsed', type: 'relationship', relationTo: 'claims', hasMany: true, admin: { position: 'sidebar', description: 'Registry claims this content relies on — publication requires every one to be publishable' } },
  { name: 'claimStatus', type: 'select', defaultValue: 'NONE', options: ['NONE', 'OWNER_REPORTED', 'REVIEW_PENDING', 'INDEPENDENTLY_DEMONSTRATED', 'CERTIFIED', 'LEGALLY_BARRED', 'PROHIBITED'], admin: { position: 'sidebar', readOnly: true, description: 'Derived from the claims used (system)' } },
  { name: 'lastEditedBy', type: 'text', admin: { position: 'sidebar', readOnly: true } },
  { name: 'reviewNote', type: 'textarea', admin: { position: 'sidebar', description: 'Reviewer comment, recorded with a status change (required when returning content to draft)' } },
  { name: 'reviewNoteBy', type: 'text', admin: { position: 'sidebar', readOnly: true } },
] as const;

/** Audit every workflow status change of an editorial collection. */
export const auditWorkflow =
  (entityType: string): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, operation, req, context }) => {
    if (operation === 'create') await auditRow(req, 'content.create', entityType, doc.id, undefined, { workflowStatus: doc.workflowStatus });
    else if (previousDoc?.workflowStatus !== doc.workflowStatus)
      await auditRow(req, `content.${String(doc.workflowStatus).toLowerCase()}`, entityType, doc.id, { workflowStatus: previousDoc?.workflowStatus }, { workflowStatus: doc.workflowStatus, system: !!(context as any)?.systemWithdraw, reviewNote: doc.reviewNote !== previousDoc?.reviewNote ? doc.reviewNote : undefined });
    return doc;
  };
