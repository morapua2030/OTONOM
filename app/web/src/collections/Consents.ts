import type { CollectionConfig } from 'payload';
import { nobody, perm, staffOnly } from '../lib/access.ts';
import { auditRow } from '../lib/audit.ts';

export const Consents: CollectionConfig = {
  slug: 'consents',
  admin: { group: 'Content' },
  versions: { maxPerDoc: 100 },
  access: { read: staffOnly, create: perm('consent.revoke'), update: perm('consent.revoke'), delete: nobody },
  fields: [
    { name: 'subject', type: 'text', required: true },
    { name: 'status', type: 'select', required: true, defaultValue: 'VALID', options: ['VALID', 'REVOKED'] },
    { name: 'scope', type: 'select', hasMany: true, options: ['CASE_STUDY', 'CLIENT_NAME', 'LOGO', 'PHOTOS', 'VIDEO', 'QUOTE'], admin: { description: 'What the client agreed to publish' } },
    { name: 'evidenceRef', type: 'text', required: true, admin: { description: 'Reference to the SIGNED written consent (verbal consent is not sufficient)' } },
    { name: 'grantedAt', type: 'date' },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        // revocation is final: re-granting needs a new signed consent record (keeps the history unambiguous)
        if (originalDoc?.status === 'REVOKED') data.status = 'REVOKED';
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        if (operation === 'create' || previousDoc?.status !== doc.status)
          await auditRow(req, operation === 'create' ? 'consent.record' : `consent.${String(doc.status).toLowerCase()}`, 'consent', doc.id, previousDoc ? { status: previousDoc.status } : undefined, { status: doc.status, subject: doc.subject, evidenceRef: doc.evidenceRef });
        if (doc.status === 'REVOKED' && previousDoc?.status !== 'REVOKED') {
          // withdraw every published item depending on this consent (pages and case studies)
          // approved media relying on this consent is withdrawn too
          const media = await req.payload.find({ collection: 'media', where: { and: [{ consent: { equals: doc.id } }, { status: { equals: 'APPROVED' } }] }, overrideAccess: true, depth: 0, limit: 1000, req });
          for (const md of media.docs) await req.payload.update({ collection: 'media', id: md.id, data: { status: 'WITHDRAWN' } as any, overrideAccess: true, req, context: { systemWithdraw: true } });
          for (const collection of ['pages', 'case-studies'] as const) {
            const found = await req.payload.find({ collection, where: { consent: { equals: doc.id } }, overrideAccess: true, depth: 0, limit: 1000, req });
            for (const p of found.docs) {
              if ((p as any)._status === 'published') {
                await req.payload.update({ collection, id: p.id, data: { _status: 'draft', workflowStatus: 'WITHDRAWN' } as any, overrideAccess: true, req, context: { systemWithdraw: true } });
              }
            }
          }
        }
      },
    ],
  },
};
