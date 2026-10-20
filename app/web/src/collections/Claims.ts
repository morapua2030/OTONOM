import { BusinessRuleError } from '../lib/errors.ts';
import { Forbidden, type CollectionConfig } from 'payload';
import { can } from '@otonom/domain';
import { exposeDomainErrorCodes } from '../lib/errors.ts';
import { auditRow } from '../lib/audit.ts';
import { nobody, perm, staffOnly, mfaOk } from '../lib/access.ts';

export const PUBLISHABLE_CLAIM_STATUSES = ['INDEPENDENTLY_DEMONSTRATED', 'CERTIFIED'];
const NEVER_PUBLISHABLE = ['PROHIBITED'];

/**
 * Claim-to-evidence registry (planning doc 11). The public site only ever reads publishable claims.
 * Governance (WAVE 1 finding W1-F1): only an OWNER (`claims.approve`) can make a claim publishable, and only with an
 * evidence reference (CERTIFIED also needs a certificate reference). PROHIBITED claims can never become publishable.
 * A publishable claim can only be changed by an OWNER (wording changes would otherwise bypass the review).
 */
export const Claims: CollectionConfig = {
  slug: 'claims',
  admin: { group: 'Content', useAsTitle: 'code', defaultColumns: ['code', 'status', 'impact', 'reviewBy'] },
  versions: { maxPerDoc: 100 },
  access: {
    read: ({ req }) => (req.user && mfaOk(req.user as any) && staffOnly({ req } as any) ? true : { status: { in: PUBLISHABLE_CLAIM_STATUSES } }),
    create: perm('claims.review'),
    update: perm('claims.review'),
    delete: nobody,
  },
  fields: [
    { name: 'code', type: 'text', required: true, unique: true },
    { name: 'claim', type: 'textarea', localized: true, required: true },
    { name: 'safeCopy', type: 'textarea', localized: true, admin: { description: 'Wording to use while the claim is not publishable' } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'OWNER_REPORTED',
      options: ['OWNER_REPORTED', 'REVIEW_PENDING', 'INDEPENDENTLY_DEMONSTRATED', 'CERTIFIED', 'LEGALLY_BARRED', 'PROHIBITED'],
    },
    { name: 'impact', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], defaultValue: 'MEDIUM' },
    { name: 'evidenceRequired', type: 'textarea' },
    { name: 'evidenceNote', type: 'textarea' },
    { name: 'evidenceRef', type: 'text', admin: { description: 'Reference to the reviewed evidence (test report id, document id)' } },
    { name: 'certificateRef', type: 'text', admin: { description: 'Certificate id + issuer + scope (required for CERTIFIED)' } },
    { name: 'approvedBy', type: 'text', admin: { readOnly: true } },
    { name: 'approvedAt', type: 'date', admin: { readOnly: true } },
    { name: 'reviewBy', type: 'date' },
  ],
  hooks: {
    afterError: [exposeDomainErrorCodes],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'update' && previousDoc?.status === doc.status) return doc;
        await auditRow(req, 'claim.status', 'claim', doc.id, { status: previousDoc?.status ?? null }, { status: doc.status, evidenceRef: doc.evidenceRef ?? null });
        // a claim that stops being publishable withdraws every published item relying on it (same as consent revocation)
        if (PUBLISHABLE_CLAIM_STATUSES.includes(previousDoc?.status) && !PUBLISHABLE_CLAIM_STATUSES.includes(doc.status)) {
          for (const collection of ['pages', 'case-studies'] as const) {
            const found = await req.payload.find({ collection, where: { claimsUsed: { in: [doc.id] } }, overrideAccess: true, depth: 0, limit: 1000, req });
            for (const p of found.docs as any[])
              if (p._status === 'published')
                await req.payload.update({ collection, id: p.id, data: { _status: 'draft', workflowStatus: 'WITHDRAWN' } as any, overrideAccess: true, req, context: { systemWithdraw: true } });
          }
        }
        return doc;
      },
    ],
    beforeChange: [
      ({ data, originalDoc, req, operation }) => {
        const role = (req.user as any)?.role;
        // system fields: never client-controlled
        data.approvedBy = originalDoc?.approvedBy ?? null;
        data.approvedAt = originalDoc?.approvedAt ?? null;
        const from = originalDoc?.status ?? null;
        const to = data.status ?? from ?? 'OWNER_REPORTED';
        const wasPublishable = PUBLISHABLE_CLAIM_STATUSES.includes(from);
        const willBePublishable = PUBLISHABLE_CLAIM_STATUSES.includes(to);
        if ((wasPublishable || willBePublishable) && !can(role, 'claims.approve')) throw new Forbidden(req.t);
        if (willBePublishable && (to !== from || operation === 'create')) {
          if (NEVER_PUBLISHABLE.includes(from)) throw new BusinessRuleError('CLAIM_PROHIBITED', 409);
          const v = { ...originalDoc, ...data };
          if (!String(v.evidenceRef ?? '').trim() || !String(v.evidenceNote ?? '').trim()) throw new BusinessRuleError('CLAIM_EVIDENCE_REQUIRED', 422);
          if (to === 'CERTIFIED' && !String(v.certificateRef ?? '').trim()) throw new BusinessRuleError('CLAIM_CERTIFICATE_REQUIRED', 422);
          data.approvedBy = String(req.user!.id);
          data.approvedAt = new Date().toISOString();
        }
        if (!willBePublishable) {
          data.approvedBy = null;
          data.approvedAt = null;
        }
        return data;
      },
    ],
  },
};
