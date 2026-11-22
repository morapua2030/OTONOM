import { BusinessRuleError } from '../lib/errors.ts';
import { Forbidden, type CollectionConfig } from 'payload';
import { can } from '@otonom/domain';
import { exposeDomainErrorCodes } from '../lib/errors.ts';
import { auditRow } from '../lib/audit.ts';
import { mfaOk, nobody, perm, staffOnly } from '../lib/access.ts';
import { MEDIA_UPLOAD_DIR } from '../lib/server.ts';
import { blobStorageEnabled, MEDIA_MIME_TYPES, mediaUploadProblem, mediaUploadsEnabled } from '../lib/media-storage.ts';
import { blobFileName } from '../lib/deferred-upload.ts';
import { cleanUploadedFile } from '../lib/image-metadata.ts';
import { revalidateSiteContent } from '../lib/content-workflow.ts';
import { failAfterChangeForTests } from '../lib/test-failures.ts';
import { GROUP, MEDIA_F, MEDIA_STATUS_COPY, optionsOf, PAGE } from '../admin-ui/copy.ts';

/**
 * Public-site media (WAVE 4). Rules:
 * - images only (PNG/JPEG/WebP checked by their first bytes, ≤ 4 MB: Vercel's request limit); SVG excluded (script risk);
 *   VIDEO is BLOCKED (hosting + consent decisions pending)
 * - stored in Vercel Blob on Vercel (owner 2026-11-15, payload.config.ts), on local disk in development and tests
 * - bilingual alt text required before approval
 * - photos of a client's property need a VALID signed consent covering PHOTOS and a privacy screening
 *   (keypads/locks, addresses, faces/children, Wi-Fi names, serials — planning doc 14 §5)
 * - nothing is publicly readable until approved by a publisher (content.publish), and approval can be withdrawn
 */
const PUBLIC_STATUS = 'APPROVED';

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: PAGE.media.one, plural: PAGE.media.name },
  admin: { group: GROUP.photos, description: PAGE.media.line, useAsTitle: 'filename', defaultColumns: ['filename', 'alt', 'status', 'updatedAt'] },
  versions: { maxPerDoc: 50 },
  upload: {
    staticDir: MEDIA_UPLOAD_DIR,
    mimeTypes: [...MEDIA_MIME_TYPES],
    filesRequiredOnCreate: true,
    modifyResponseHeaders: ({ headers }) => {
      headers.set('x-content-type-options', 'nosniff');
      return headers;
    },
  },
  access: {
    read: ({ req }) => (req.user && mfaOk(req.user as any) && staffOnly({ req } as any) ? true : { status: { equals: PUBLIC_STATUS } }),
    create: ({ req }) => mediaUploadsEnabled() && !!req.user && mfaOk(req.user as any) && can((req.user as any).role, 'content.edit'),
    update: ({ req }) => !!req.user && mfaOk(req.user as any) && (can((req.user as any).role, 'content.edit') || can((req.user as any).role, 'content.publish')),
    delete: nobody,
  },
  fields: [
    { name: 'alt', label: MEDIA_F.alt.label, type: 'text', localized: true, admin: { description: MEDIA_F.alt.help } },
    { name: 'status', label: MEDIA_F.status.label, type: 'select', defaultValue: 'DRAFT', options: optionsOf(['DRAFT', 'APPROVED', 'WITHDRAWN'] as const, MEDIA_STATUS_COPY), admin: { position: 'sidebar', description: MEDIA_F.status.help } },
    { name: 'depictsClientProperty', label: MEDIA_F.client.label, type: 'checkbox', defaultValue: false, admin: { position: 'sidebar', description: MEDIA_F.client.help } },
    { name: 'consent', label: MEDIA_F.consent.label, type: 'relationship', relationTo: 'consents', admin: { position: 'sidebar' } },
    { name: 'privacyScreened', label: MEDIA_F.privacy.label, type: 'checkbox', defaultValue: false, admin: { position: 'sidebar', description: MEDIA_F.privacy.help } },
    { name: 'approvedBy', label: MEDIA_F.approvedBy.label, type: 'text', admin: { position: 'sidebar', readOnly: true } },
  ],
  hooks: {
    afterError: [exposeDomainErrorCodes],
    beforeOperation: [
      async ({ req, operation }) => {
        if (!mediaUploadsEnabled() && (operation === 'create' || req.file)) throw new BusinessRuleError('UPLOADS_DISABLED_IN_PREVIEW', 503);
        const problem = req.file ? mediaUploadProblem(req.file as any) : null;
        if (problem === 'TOO_LARGE') throw new BusinessRuleError('UPLOAD_REJECTED:TOO_LARGE', 413);
        if (problem) throw new BusinessRuleError('UPLOAD_REJECTED:TYPE', 415);
        // Phone photos carry GPS, serial numbers and thumbnails: strip them before the file is stored (audit 2026-11-18).
        cleanUploadedFile(req.file as { data?: Buffer; size?: number; mimetype?: string } | undefined);
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, req, operation, context }) => {
        if ((context as any)?.systemWithdraw || (context as any)?.fileRevert) return data;
        // A new Blob object gets its unique name here, inside the save (lib/deferred-upload.ts uploads after the commit).
        if (req.file && typeof data.filename === 'string' && blobStorageEnabled()) data.filename = blobFileName(data.filename);
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
        // Public pages show approved images only: approving or withdrawing one refreshes them on the next request.
        if (operation === 'update' && (previousDoc?.status === 'APPROVED' || doc.status === 'APPROVED')) revalidateSiteContent();
        return doc;
      },
      failAfterChangeForTests,
    ],
  },
};
