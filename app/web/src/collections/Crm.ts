import { BusinessRuleError } from '../lib/errors.ts';
import { Forbidden, type CollectionConfig } from 'payload';
import { can } from '@otonom/domain';
import { exposeDomainErrorCodes } from '../lib/errors.ts';
import { nobody, perm } from '../lib/access.ts';

const crmRead = perm('crm.read');
/** Relationship value → id (originalDoc may hold a populated object or a bare id). */
const relId = (v: any) => (v && typeof v === 'object' ? (v.id ?? null) : (v ?? null));
const crmWrite = perm('crm.write');

export const Organisations: CollectionConfig = {
  slug: 'organisations',
  versions: { maxPerDoc: 50 },
  admin: { group: 'Projects', useAsTitle: 'legalName' },
  access: { read: crmRead, create: crmWrite, update: crmWrite, delete: nobody },
  fields: [
    { name: 'legalName', type: 'text', required: true },
    { name: 'tradeName', type: 'text' },
    { name: 'taxRegistrationNo', type: 'text', unique: true },
    { name: 'commercialRegistryNo', type: 'text', unique: true },
    { name: 'governorate', type: 'text' },
    { name: 'groupOf', type: 'relationship', relationTo: 'organisations', admin: { description: 'Human-confirmed group link (cohort rule OPEN, PD-07)' } },
    { name: 'mergedInto', type: 'relationship', relationTo: 'organisations', admin: { readOnly: true } },
  ],
};

export const Contacts: CollectionConfig = {
  slug: 'contacts',
  versions: { maxPerDoc: 50 },
  admin: { group: 'Projects', useAsTitle: 'fullName' },
  access: { read: crmRead, create: crmWrite, update: crmWrite, delete: nobody },
  fields: [
    { name: 'fullName', type: 'text', required: true },
    { name: 'email', type: 'email', index: true },
    { name: 'phone', type: 'text', index: true },
    { name: 'role', type: 'text' },
    { name: 'organisation', type: 'relationship', relationTo: 'organisations' },
    { name: 'preferredLanguage', type: 'select', options: ['ar', 'en'] },
    { name: 'marketingConsent', type: 'checkbox', defaultValue: false },
  ],
};

// ---------------- RFQ triage (doc 06 §2, first part) ----------------
export const RFQ_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['INITIAL_QUALIFICATION', 'CANCELLED'],
  INITIAL_QUALIFICATION: ['NEEDS_INFO', 'QUALIFIED', 'LOST', 'CANCELLED'],
  NEEDS_INFO: ['INITIAL_QUALIFICATION', 'LOST'],
  QUALIFIED: [],
  LOST: ['INITIAL_QUALIFICATION'],
  CANCELLED: [],
};
export const REASON_REQUIRED = new Set(['LOST', 'CANCELLED']);

export const Rfqs: CollectionConfig = {
  slug: 'rfqs',
  admin: { group: 'Projects', useAsTitle: 'ref', defaultColumns: ['ref', 'status', 'customerType', 'projectType', 'governorate', 'createdAt'] },
  versions: { maxPerDoc: 100 }, // revision history = status history audit trail
  access: { read: crmRead, create: nobody /* public intake only through /api/rfq */, update: crmWrite, delete: nobody },
  fields: [
    { name: 'ref', type: 'text', required: true, unique: true, admin: { readOnly: true } },
    { name: 'status', type: 'select', required: true, defaultValue: 'SUBMITTED', options: Object.keys(RFQ_TRANSITIONS) },
    { name: 'statusReason', type: 'text' },
    { name: 'kind', type: 'select', defaultValue: 'RFQ', options: ['RFQ', 'CONSULTATION', 'PARTNER'], admin: { readOnly: true } },
    {
      name: 'submitted',
      type: 'group',
      admin: { readOnly: true, description: 'Immutable submission payload' },
      fields: [
        { name: 'fullName', type: 'text' },
        { name: 'email', type: 'text', index: true }, // duplicate check on every public submission
        { name: 'phone', type: 'text', index: true },
        { name: 'organisationName', type: 'text' },
        { name: 'contactRole', type: 'text' },
        { name: 'customerType', type: 'text' },
        { name: 'projectType', type: 'text' },
        { name: 'governorate', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'units', type: 'number' },
        { name: 'circuits', type: 'number' },
        { name: 'systems', type: 'json' },
        { name: 'engagementModel', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'phase', type: 'text' },
        { name: 'timeline', type: 'text' },
        { name: 'budgetBand', type: 'text' },
        { name: 'preferredChannel', type: 'text' },
        { name: 'howHeard', type: 'text' },
        { name: 'locale', type: 'text' },
        { name: 'marketingConsent', type: 'checkbox' },
        { name: 'attribution', type: 'json' },
      ],
    },
    { name: 'customerType', type: 'text', admin: { readOnly: true } },
    { name: 'projectType', type: 'text', admin: { readOnly: true } },
    { name: 'governorate', type: 'text', admin: { readOnly: true } },
    { name: 'idempotencyKey', type: 'text', unique: true, index: true, admin: { hidden: true }, access: { read: () => false, update: () => false } },
    { name: 'possibleDuplicateOf', type: 'relationship', relationTo: 'rfqs', admin: { readOnly: true } },
    { name: 'organisation', type: 'relationship', relationTo: 'organisations' },
    { name: 'contact', type: 'relationship', relationTo: 'contacts' },
    { name: 'assignedEngineer', type: 'relationship', relationTo: 'users' },
    { name: 'qualificationScore', type: 'number', min: 0, max: 5, admin: { description: 'Advisory only — never an automatic rejection' } },
    { name: 'opportunity', type: 'relationship', relationTo: 'opportunities' },
  ],
  hooks: {
    afterError: [exposeDomainErrorCodes],
    beforeChange: [
      async ({ data, originalDoc, operation, context, req }) => {
        if (operation === 'create' || (context as any)?.system) return data;
        // the RFQ→opportunity link is set only by the convert endpoint (prevents faking website sourcing)
        data.opportunity = relId(originalDoc?.opportunity);
        // an RFQ can only be assigned to active staff who may work on CRM records
        if ('assignedEngineer' in data && relId(data.assignedEngineer) !== relId(originalDoc?.assignedEngineer) && data.assignedEngineer) {
          const target: any = await req.payload.findByID({ collection: 'users', id: relId(data.assignedEngineer), overrideAccess: true, depth: 0, req, disableErrors: true });
          if (!target || !can(target.role, 'crm.write')) throw new BusinessRuleError('ILLEGAL_TRANSITION:ASSIGNEE_NOT_ELIGIBLE', 422);
        }
        // submission payload is immutable after submit
        if (data.submitted && JSON.stringify(data.submitted) !== JSON.stringify(originalDoc?.submitted)) data.submitted = originalDoc?.submitted;
        const from = originalDoc?.status ?? 'SUBMITTED';
        const to = data.status ?? from;
        if (to !== from) {
          if (!(RFQ_TRANSITIONS[from] ?? []).includes(to)) throw new BusinessRuleError('ILLEGAL_TRANSITION', 409);
          if (REASON_REQUIRED.has(to) && !String(data.statusReason ?? '').trim()) throw new BusinessRuleError('ILLEGAL_TRANSITION:REASON_REQUIRED', 409);
        }
        return data;
      },
    ],
  },
};

// ---------------- Opportunity pipeline (doc 06 §2, second part) ----------------
export const OPP_TRANSITIONS: Record<string, string[]> = {
  ENGINEERING_REVIEW: ['FREE_CONSULTATION', 'PAID_SITE_SURVEY', 'PROPOSAL_DRAFT', 'ON_HOLD', 'LOST'],
  FREE_CONSULTATION: ['PAID_SITE_SURVEY', 'PROPOSAL_DRAFT', 'ON_HOLD', 'LOST'],
  PAID_SITE_SURVEY: ['PROPOSAL_DRAFT', 'ON_HOLD', 'LOST'],
  PROPOSAL_DRAFT: ['PROPOSAL_APPROVED', 'ON_HOLD', 'LOST'],
  PROPOSAL_APPROVED: ['PROPOSAL_SENT', 'PROPOSAL_DRAFT'],
  PROPOSAL_SENT: ['NEGOTIATION', 'LOST', 'ON_HOLD'], // WON_SIGNED only through the contract endpoint
  NEGOTIATION: ['PROPOSAL_DRAFT', 'LOST', 'ON_HOLD'],
  WON_SIGNED: ['DELIVERY_HANDOFF'],
  ON_HOLD: ['ENGINEERING_REVIEW', 'FREE_CONSULTATION', 'PROPOSAL_DRAFT', 'NEGOTIATION', 'LOST'],
  LOST: ['ENGINEERING_REVIEW'],
  DELIVERY_HANDOFF: [],
};

export const Opportunities: CollectionConfig = {
  slug: 'opportunities',
  admin: { group: 'Projects', useAsTitle: 'ref', defaultColumns: ['ref', 'stage', 'estimatedValueEgp', 'qualifiedAt', 'ownerEngineer'] },
  versions: { maxPerDoc: 200 },
  access: { read: crmRead, create: crmWrite, update: crmWrite, delete: nobody },
  fields: [
    { name: 'ref', type: 'text', required: true, unique: true },
    { name: 'stage', type: 'select', required: true, defaultValue: 'ENGINEERING_REVIEW', options: Object.keys(OPP_TRANSITIONS) },
    { name: 'rfq', type: 'relationship', relationTo: 'rfqs' },
    { name: 'organisation', type: 'relationship', relationTo: 'organisations' },
    { name: 'primaryContact', type: 'relationship', relationTo: 'contacts' },
    { name: 'ownerEngineer', type: 'relationship', relationTo: 'users' },
    { name: 'qualifiedAt', type: 'date' },
    { name: 'estimatedValueEgp', type: 'number', min: 0, admin: { description: 'Pipeline only — never added to signed value (KPI-008)' } },
    { name: 'engagementModel', type: 'select', options: ['SUPPLY_ONLY', 'SUPPLY_INSTALL_PROGRAM', 'DESIGN_BUILD'] },
    {
      name: 'attributionProposal',
      type: 'select',
      defaultValue: 'UNKNOWN',
      options: ['WEBSITE_SOURCED', 'WEBSITE_ASSISTED', 'NON_WEBSITE', 'UNKNOWN'],
      admin: { description: 'Proposed from origin evidence; locked into the contract at signature' },
    },
    { name: 'attributionEvidence', type: 'textarea' },
    { name: 'surveyFeeAgreed', type: 'checkbox', defaultValue: false },
    { name: 'surveyInvoiceRef', type: 'text' },
    { name: 'proposalVersion', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'proposalDocumentRef', type: 'text' },
    { name: 'proposalValidUntil', type: 'date' },
    { name: 'proposalApprovedBy', type: 'text', admin: { readOnly: true } },
    { name: 'capacityCheckNote', type: 'textarea', admin: { description: 'Required before proposal approval (installation capacity)' } },
    { name: 'lostReason', type: 'text' },
    { name: 'onHoldReason', type: 'text' },
    { name: 'followUpDate', type: 'date' },
    { name: 'contractRef', type: 'text', admin: { readOnly: true } },
    { name: 'handoffOwner', type: 'text' },
  ],
  hooks: {
    afterError: [exposeDomainErrorCodes],
    beforeChange: [
      async ({ data, originalDoc, operation, req, context }) => {
        const role = (req.user as any)?.role;
        if ((context as any)?.contractSigned) return data;
        // fields only the system may set
        data.proposalApprovedBy = originalDoc?.proposalApprovedBy ?? null;
        data.contractRef = originalDoc?.contractRef ?? null;
        data.proposalVersion = originalDoc?.proposalVersion ?? 0;
        if (!(context as any)?.system) data.rfq = relId(originalDoc?.rfq);
        // attribution is locked into the domain contract at signature: the CMS proposal is frozen afterwards
        if (['WON_SIGNED', 'DELIVERY_HANDOFF'].includes(originalDoc?.stage)) {
          data.attributionProposal = originalDoc.attributionProposal;
          data.attributionEvidence = originalDoc.attributionEvidence;
        }
        const proposal = data.attributionProposal ?? originalDoc?.attributionProposal ?? 'UNKNOWN';
        const linkedRfq = data.rfq ?? relId(originalDoc?.rfq);
        const evidence = String(data.attributionEvidence ?? originalDoc?.attributionEvidence ?? '').trim();
        // website attribution needs origin evidence: a linked website RFQ or a written evidence note
        if (['WEBSITE_SOURCED', 'WEBSITE_ASSISTED'].includes(proposal) && !linkedRfq && evidence.length < 10)
          throw new BusinessRuleError('ILLEGAL_TRANSITION:ATTRIBUTION_EVIDENCE_REQUIRED', 422);
        if (operation === 'create') {
          data.stage = 'ENGINEERING_REVIEW';
          return data;
        }
        const from = originalDoc?.stage;
        const to = data.stage ?? from;
        if (to === from) return data;
        if (!(OPP_TRANSITIONS[from] ?? []).includes(to)) throw new BusinessRuleError('ILLEGAL_TRANSITION', 409);
        const v = { ...originalDoc, ...data };
        if (to === 'PAID_SITE_SURVEY' && !(v.surveyFeeAgreed && String(v.surveyInvoiceRef ?? '').trim())) throw new BusinessRuleError('ILLEGAL_TRANSITION:SURVEY_FEE_AGREEMENT_REQUIRED', 409);
        if (to === 'PROPOSAL_DRAFT') data.proposalVersion = (originalDoc?.proposalVersion ?? 0) + 1;
        if (to === 'PROPOSAL_APPROVED') {
          if (!can(role, 'proposal.approve')) throw new Forbidden(req.t);
          if (!String(v.proposalDocumentRef ?? '').trim() || !v.proposalValidUntil || !String(v.capacityCheckNote ?? '').trim())
            throw new BusinessRuleError('ILLEGAL_TRANSITION:PROPOSAL_INCOMPLETE', 409);
          data.proposalApprovedBy = String(req.user!.id);
        }
        if (to === 'PROPOSAL_SENT' && v.proposalValidUntil && new Date(v.proposalValidUntil) < new Date()) throw new BusinessRuleError('ILLEGAL_TRANSITION:PROPOSAL_EXPIRED', 409);
        if (to === 'LOST' && !String(v.lostReason ?? '').trim()) throw new BusinessRuleError('ILLEGAL_TRANSITION:REASON_REQUIRED', 409);
        if (to === 'ON_HOLD' && !(String(v.onHoldReason ?? '').trim() && v.followUpDate)) throw new BusinessRuleError('ILLEGAL_TRANSITION:REASON_AND_FOLLOWUP_REQUIRED', 409);
        if (to === 'DELIVERY_HANDOFF' && !String(v.handoffOwner ?? '').trim()) throw new BusinessRuleError('ILLEGAL_TRANSITION:HANDOFF_OWNER_REQUIRED', 409);
        return data;
      },
    ],
  },
};
