import type { CollectionConfig } from 'payload';
import { exposeDomainErrorCodes } from '../lib/errors.ts';
import { anyPerm, nobody, perm, staffOnly, mfaOk } from '../lib/access.ts';
import { auditWorkflow, editorialWorkflow, WORKFLOW_FIELDS } from '../lib/workflow.ts';

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: { group: 'Content', useAsTitle: 'title', defaultColumns: ['title', 'slug', 'workflowStatus', '_status'] },
  versions: { drafts: true, maxPerDoc: 50 },
  access: {
    read: ({ req }) => (req.user && mfaOk(req.user as any) && staffOnly({ req } as any) ? true : { _status: { equals: 'published' } }),
    readVersions: staffOnly,
    create: perm('content.edit'),
    update: anyPerm('content.edit', 'content.review', 'content.publish'),
    delete: nobody,
  },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'title', type: 'text', localized: true },
    { name: 'summary', type: 'textarea', localized: true },
    { name: 'body', type: 'textarea', localized: true },
    { name: 'seoTitle', type: 'text', localized: true, maxLength: 70 },
    { name: 'seoDescription', type: 'textarea', localized: true, maxLength: 170 },
    { name: 'requiresConsent', type: 'checkbox', defaultValue: false },
    { name: 'consent', type: 'relationship', relationTo: 'consents' },
    ...(WORKFLOW_FIELDS as any),
  ],
  hooks: {
    afterError: [exposeDomainErrorCodes],
    beforeChange: [editorialWorkflow({ slug: 'pages', contentFields: ['title', 'summary', 'body', 'requiresConsent', 'consent', 'claimsUsed', 'slug', 'seoTitle', 'seoDescription'] })],
    afterChange: [auditWorkflow('page')],
  },
};
