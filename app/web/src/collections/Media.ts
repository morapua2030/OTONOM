import { BusinessRuleError } from '../lib/errors.ts';
import { Forbidden, type CollectionConfig } from 'payload';
import { can } from '@otonom/domain';
import { exposeDomainErrorCodes } from '../lib/errors.ts';
import { auditRow } from '../lib/audit.ts';
import { mfaOk, nobody, perm, staffOnly } from '../lib/access.ts';
import { MEDIA_UPLOAD_DIR, uploadsDisabled } from '../lib/server.ts';

/**
 * Public-site media (WAVE 4). Rules:
 * - images only (PNG/JPEG/WebP, ≤ 5 MB); SVG excluded (script risk); VIDEO is BLOCKED (hosting + consent decisions pending)
 * - bilingual alt text required before approval
 * - photos of a client's property need a VALID signed consent covering PHOTOS and a privacy screening
 *   (keypads/locks, addresses, faces/children, Wi-Fi names, serials — planning doc 14 §5)
 * - nothing is publicly readable until approved by a publisher (content.publish), and approval can be withdrawn
 */
const PUBLIC_STATUS = 'APPROVED';

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'Content', useAsTitle: 'filename', defaultColumns: ['filename', 'status', 'depictsClientProperty', 'updatedAt'] },
  versions: { maxPerDoc: 50 },
  upload: {
    staticDir: MEDIA_UPLOAD_DIR,
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    filesRequiredOnCreate: true,
    modifyResponseHeaders: ({ headers }) => {
      headers.set('x-content-type-options', 'nosniff');
      return headers;
    },
  },
  access: {
    read: ({ req }) => (req.user && mfaOk(req.user as any) && staffOnly({ req } as any) ? true : { status: { equals: PUBLIC_STATUS } }),
    create: ({ req }) => !uploadsDisabled() && !!req.user && mfaOk(req.user as any) && can((req.user as any).role, 'content.edit'),
    update: ({ req }) => !!req.user && mfaOk(req.user as any) && (can((req.user as any).role, 'content.edit') || can((req.user as any).role, 'content.publish')),
    delete: nobody,
  },
  fields: [
    { name: 'alt', type: 'text', localized: true, admin: { description: 'Required in Arabic and English before approval' } },
    { name: 'status', type: 'select', defaultValue: 'DRAFT', options: ['DRAFT', 'APPROVED', 'WITHDRAWN'], admin: { position: 'sidebar' } },
    { name: 'depictsClientProperty', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'consent', type: 'relationship', relationTo: 'consents', admin: { position: 'sidebar' } },
    { name: 'privacyScreened', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar', description: 'Keypads/locks, addresses, faces/children, Wi-Fi names, serials removed or blurred' } },
    { name: 'approvedBy', type: 'text', admin: { position: 'sidebar', readOnly: true } },
  ],
  hooks: {
    afterError: [exposeDomainErrorCodes],
    beforeOperation: [
      async ({ req, operation }) => {
        if (uploadsDisabled() && (operation === 'create' || req.file)) throw new BusinessRuleError('UPLOADS_DISABLED_IN_PREVIEW', 503);
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, req, operation, context }) => {
        if ((context as any)?.systemWithdraw) return data;
        data.approvedBy = originalDoc?.approvedBy ?? null;
        if (operation === 'create') {
          data.status = 'DRAFT';
          return data;
        }
        const to = data.status ?? originalDoc?.status ?? 'DRAFT';
        // any change to an approved item sends it back to DRAFT (re-approval needed)
        const contentChanged = ['alt', 'depictsClientProperty', 'consent', 'privacyScreened', 'filename'].some((f) => f in data && JSON.stringify(data[f]) !== JSON.stringify(originalDoc?.[f]));
        if (originalDoc?.status === 'APPROVED' && to === 'APPROVED' && contentChanged) {
          data.status = 'DRAFT';
          return data;
        }
        if (to === 'APPROVED' && originalDoc?.status !== 'APPROVED') {
          if (!can((req.user as any)?.role, 'content.publish')) throw new Forbidden(req.t);
          const full: any = await req.payload.findByID({ collection: 'media', id: originalDoc.id, locale: 'all' as any, overrideAccess: true, depth: 0, req });
          const alt = (l: string) => (String(req.locale) === l && data.alt !== undefined ? data.alt : full?.alt?.[l]);
          const blockers: string[] = [];
          if (!String(alt('ar') ?? '').trim()) blockers.push('ALT_AR_MISSING');
          if (!String(alt('en') ?? '').trim()) blockers.push('ALT_EN_MISSING');
          const depicts = data.depictsClientProperty ?? full?.depictsClientProperty;
          if (depicts) {
            if (!(data.privacyScreened ?? full?.privacyScreened)) blockers.push('MEDIA_NOT_SCREENED');
            const cid = data.consent ?? full?.consent;
            const c: any = cid ? await req.payload.findByID({ collection: 'consents', id: typeof cid === 'object' ? cid.id : cid, overrideAccess: true, depth: 0, req, disableErrors: true }) : null;
            if (!c || c.status !== 'VALID' || !(c.scope ?? []).includes('PHOTOS')) blockers.push('CONSENT_NOT_VALID');
          }
          if (blockers.length) throw new BusinessRuleError(`PUBLISH_BLOCKED:${blockers.join(',')}`, 422);
          data.approvedBy = String(req.user!.id);
        }
        if (to === 'WITHDRAWN' && !can((req.user as any)?.role, 'content.publish')) throw new Forbidden(req.t);
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        if (operation === 'create' || previousDoc?.status !== doc.status) await auditRow(req, `media.${String(doc.status).toLowerCase()}`, 'media', doc.id, previousDoc ? { status: previousDoc.status } : undefined, { status: doc.status });
        return doc;
      },
    ],
  },
};
