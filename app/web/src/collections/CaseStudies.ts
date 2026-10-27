import { BusinessRuleError } from '../lib/errors.ts';
import type { CollectionConfig, Where } from 'payload';
import { exposeDomainErrorCodes } from '../lib/errors.ts';
import { anyPerm, nobody, perm, staffOnly, mfaOk } from '../lib/access.ts';
import { auditWorkflow, editorialWorkflow, WORKFLOW_FIELDS } from '../lib/workflow.ts';
import { publicCaseRecord } from '../lib/portfolio-record.ts';
import { publicMarketingOnly } from '../lib/deployment.ts';
import { portfolioReleases } from '../lib/portfolio-release.ts';

/** Identified project case studies: publication ALWAYS requires a valid written consent record (DR-032, G-2). */
export const CaseStudies: CollectionConfig = {
  slug: 'case-studies',
  admin: { group: 'Content', useAsTitle: 'title', defaultColumns: ['title', 'slug', 'workflowStatus', '_status'] },
  versions: { drafts: true, maxPerDoc: 50 },
  access: {
    read: ({ req }) => (req.user && mfaOk(req.user as any) && staffOnly({ req } as any) ? true : publicMarketingOnly() && !portfolioReleases.length ? false : {
      and: [
        ...(publicMarketingOnly() ? [{ slug: { in: portfolioReleases.map((item) => item.slug) } }] : []),
        { _status: { equals: 'published' } },
        { workflowStatus: { equals: 'PUBLISHED' } },
        { mediaScreened: { equals: true } },
        { claimStatus: { in: ['NONE', 'CERTIFIED', 'INDEPENDENTLY_DEMONSTRATED'] } },
        { 'consent.status': { equals: 'VALID' } },
        { 'consent.scope': { contains: 'CASE_STUDY' } },
        { 'consent.evidenceRef': { exists: true } },
      ] as Where[],
    }),
    readVersions: staffOnly,
    create: perm('content.edit'),
    update: anyPerm('content.edit', 'content.review', 'content.publish'),
    delete: nobody,
  },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'title', type: 'text', localized: true },
    { name: 'projectType', type: 'select', options: ['COMPOUND', 'MULTI_UNIT_BUILDING', 'VILLA', 'APARTMENT', 'COMMERCIAL'] },
    { name: 'locationGranularity', type: 'text', localized: true, admin: { description: 'Only the level of location detail covered by the written consent' } },
    { name: 'objectives', type: 'textarea', localized: true },
    { name: 'body', type: 'textarea', localized: true, label: 'Solution / scope' },
    { name: 'outcomes', type: 'textarea', localized: true, admin: { description: 'Only measured outcomes covered by consent and evidence' } },
    { name: 'limitations', type: 'textarea', localized: true },
    { name: 'systems', type: 'select', hasMany: true, options: ['LIGHTING', 'CLIMATE', 'AV', 'AUDIO', 'DOORS_GARAGE', 'ALARM_INTEGRATION', 'SCENES'] },
    { name: 'seoTitle', type: 'text', localized: true, maxLength: 70 },
    { name: 'seoDescription', type: 'textarea', localized: true, maxLength: 170 },
    { name: 'mediaScreened', type: 'checkbox', defaultValue: false, admin: { description: 'Media screened for locks/keypads, addresses, faces/children, SSIDs, serials (doc 14 §5)' } },
    { name: 'requiresConsent', type: 'checkbox', defaultValue: true, admin: { readOnly: true } },
    { name: 'consent', type: 'relationship', relationTo: 'consents', admin: { description: 'Signed written consent (verbal consent is not sufficient)' } },
    ...(WORKFLOW_FIELDS as any),
  ],
  hooks: {
    afterRead: [({ doc, req, overrideAccess }) => overrideAccess || staffOnly({ req }) ? doc : publicCaseRecord(doc)],
    afterError: [exposeDomainErrorCodes],
    afterChange: [auditWorkflow('case_study')],
    beforeChange: [
      editorialWorkflow({
        slug: 'case-studies',
        consentAlwaysRequired: true,
        contentFields: ['title', 'objectives', 'body', 'outcomes', 'limitations', 'systems', 'consent', 'claimsUsed', 'slug', 'locationGranularity', 'mediaScreened', 'seoTitle', 'seoDescription'],
      }),
      async ({ data, originalDoc }) => {
        if (data._status === 'published' && !(data.mediaScreened ?? originalDoc?.mediaScreened)) {
          const { APIError } = await import('payload');
          throw new BusinessRuleError('PUBLISH_BLOCKED:MEDIA_NOT_SCREENED', 422);
        }
        return data;
      },
    ],
  },
};
