import type { CollectionConfig, FieldAccess } from 'payload';
import { can } from '@otonom/domain';
import { exposeDomainErrorCodes } from '../lib/errors.ts';
import { mfaOk, nobody, perm } from '../lib/access.ts';
import { auditRow } from '../lib/audit.ts';
import { LEAD_LIMITS, LEAD_PACKAGES, LEAD_SOURCES, LEAD_STATUSES } from '../lib/leads.ts';
import { failAfterChangeForTests } from '../lib/test-failures.ts';
import { LEAD_FIELDS as F, LEAD_PACKAGE_COPY, LEAD_SECTIONS, LEAD_SOURCE_COPY, LOCALE_COPY, PAGE } from '../admin-ui/copy.ts';

const ownerField: FieldAccess = ({ req }) => !!req.user && mfaOk(req.user as any) && can((req.user as any).role, 'leads.export');
const noClientWrite: FieldAccess = () => false;

/**
 * Booking requests from the site (final release, owner 2026-11-04). Created only by POST /api/booking (server-side,
 * validated, consent required); never by the REST API. SALES/ADMIN/OWNER work the lead (status, assignee, notes);
 * personal fields can only be corrected by the OWNER; delete = OWNER (a data-subject request) or the retention job.
 * Versions are the timeline; every status/assignee change and every note is also written to the audit trail.
 */
export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: PAGE.lead.name, plural: PAGE.leads.name },
  // R3 (presentation only): the menu is the custom Nav (admin-ui/nav-model.ts); `group: false` keeps every route
  admin: {
    group: false,
    useAsTitle: 'ref',
    description: PAGE.leads.line,
    defaultColumns: ['ref', 'name', 'phone', 'package', 'status', 'createdAt'],
    listSearchableFields: ['ref', 'name', 'phone'],
    components: { beforeListTable: ['/admin-ui/leads/QuickFilters#LeadQuickFilters'] },
  },
  versions: { maxPerDoc: 100 },
  access: {
    read: perm('leads.read'),
    readVersions: perm('leads.read'),
    create: nobody,
    update: perm('leads.write'),
    delete: perm('leads.export'),
  },
  // R3 layout (presentation only): sections built from collapsible / row / ui fields. The stored fields keep their
  // names, order, rules and access exactly as before (so the database and the generated types do not change).
  fields: [
    { name: 'leadSummary', type: 'ui', admin: { components: { Field: '/admin-ui/leads/LeadSummary#LeadSummary' } } },
    // the code is shown in the title and the summary above
    { name: 'ref', label: F.ref.label, type: 'text', required: true, unique: true, index: true, access: { update: noClientWrite }, admin: { hidden: true } },
    {
      type: 'collapsible',
      label: LEAD_SECTIONS.customer,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', label: F.name.label, type: 'text', required: true, minLength: LEAD_LIMITS.nameMin, maxLength: LEAD_LIMITS.name, access: { update: ownerField } },
            { name: 'phone', label: F.phone.label, type: 'text', required: true, index: true, access: { update: ownerField }, admin: { description: F.phone.help, components: { Cell: '/admin-ui/leads/cells#PhoneCell' } } },
          ],
        },
        { name: 'contactButtons', type: 'ui', admin: { components: { Field: '/admin-ui/leads/LeadSummary#ContactButtons' } } },
      ],
    },
    {
      type: 'collapsible',
      label: LEAD_SECTIONS.request,
      fields: [
        { name: 'package', label: F.package.label, type: 'select', required: true, options: LEAD_PACKAGES.map((v) => ({ value: v, label: LEAD_PACKAGE_COPY[v] })), access: { update: ownerField } },
        { name: 'message', label: F.message.label, type: 'textarea', maxLength: LEAD_LIMITS.message, access: { update: ownerField }, admin: { description: F.message.help, rows: 3 } },
        { name: 'plan', label: F.plan.label, type: 'textarea', maxLength: LEAD_LIMITS.plan, access: { update: ownerField }, admin: { description: F.plan.help, rows: 4 } },
        {
          type: 'row',
          fields: [
            { name: 'source', label: F.source.label, type: 'select', required: true, options: LEAD_SOURCES.map((v) => ({ value: v, label: LEAD_SOURCE_COPY[v] })), access: { update: noClientWrite } },
            { name: 'locale', label: F.locale.label, type: 'select', required: true, options: (['ar', 'en'] as const).map((v) => ({ value: v, label: LOCALE_COPY[v] })), access: { update: noClientWrite } },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: LEAD_SECTIONS.consent,
      admin: { initCollapsed: true, position: 'sidebar' },
      fields: [
        {
          name: 'consent',
          label: false,
          type: 'group',
          access: { update: noClientWrite },
          fields: [
            { name: 'given', label: F.consentGiven.label, type: 'checkbox', required: true },
            { name: 'at', label: F.consentAt.label, type: 'date', required: true, admin: { components: { Field: '/admin-ui/leads/ReadOnlyDate#ReadOnlyDate' } } },
            { name: 'privacyVersion', label: F.privacyVersion.label, type: 'text', required: true, admin: { description: F.privacyVersion.help } },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: LEAD_SECTIONS.followUp,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'status',
              label: F.status.label,
              type: 'select',
              required: true,
              defaultValue: 'NEW',
              options: LEAD_STATUSES.map((s) => ({ value: s.value, label: { ar: s.ar, en: s.en } })),
              admin: { components: { Cell: '/admin-ui/leads/cells#StatusCell' } },
            },
            { name: 'assignee', label: F.assignee.label, type: 'relationship', relationTo: 'users', admin: { description: F.assignee.help } },
          ],
        },
        { name: 'statusHint', type: 'ui', admin: { components: { Field: '/admin-ui/leads/StatusHint#StatusHint' } } },
        {
          name: 'notes',
          label: F.notes.label,
          labels: { singular: F.note.label, plural: F.notes.label },
          type: 'array',
          admin: { description: F.notes.help },
          fields: [
            { name: 'text', label: F.noteText.label, type: 'textarea', required: true, maxLength: 1000 },
            { name: 'by', label: F.noteBy.label, type: 'text', admin: { readOnly: true } },
            { name: 'at', label: F.noteAt.label, type: 'date', admin: { readOnly: true, components: { Field: '/admin-ui/leads/ReadOnlyDate#ReadOnlyDate' } } },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: LEAD_SECTIONS.technical,
      admin: { initCollapsed: true, position: 'sidebar' },
      fields: [
        { name: 'lastActivityAt', label: F.lastActivityAt.label, type: 'date', index: true, admin: { readOnly: true, components: { Field: '/admin-ui/leads/ReadOnlyDate#ReadOnlyDate' } }, access: { update: noClientWrite } },
        { name: 'idempotencyKey', type: 'text', unique: true, index: true, admin: { hidden: true }, access: { read: noClientWrite, update: noClientWrite } },
      ],
    },
  ],
  hooks: {
    afterError: [exposeDomainErrorCodes],
    beforeChange: [
      ({ data, originalDoc, req, operation }) => {
        if (operation === 'create') return data;
        // notes are append-only: previous notes are kept as they were, new ones are stamped server-side
        const before: any[] = Array.isArray(originalDoc?.notes) ? originalDoc.notes : [];
        const incoming: any[] = Array.isArray(data?.notes) ? data.notes : before;
        const added = incoming.slice(before.length).filter((n) => String(n?.text ?? '').trim());
        data.notes = [...before, ...added.map((n) => ({ text: String(n.text).slice(0, 1000), by: String(req.user?.id ?? 'system'), at: new Date().toISOString() }))];
        if (data.assignee !== undefined && data.assignee !== null) {
          const id = typeof data.assignee === 'object' ? data.assignee.id : data.assignee;
          data.assignee = id;
        }
        data.lastActivityAt = new Date().toISOString();
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        if (operation === 'create') return doc;
        if (previousDoc?.status !== doc.status) await auditRow(req, 'lead.status', 'lead', doc.id, { status: previousDoc?.status }, { status: doc.status });
        const a = (v: any) => (v && typeof v === 'object' ? v.id : v) ?? null;
        if (a(previousDoc?.assignee) !== a(doc.assignee)) await auditRow(req, 'lead.assign', 'lead', doc.id, { assignee: a(previousDoc?.assignee) }, { assignee: a(doc.assignee) });
        const added = (doc.notes?.length ?? 0) - (previousDoc?.notes?.length ?? 0);
        if (added > 0) await auditRow(req, 'lead.note', 'lead', doc.id, undefined, { notes: added });
        return doc;
      },
      failAfterChangeForTests,
    ],
    afterDelete: [
      async ({ doc, req, context }) => {
        await auditRow(req, (context as any)?.retention ? 'lead.retention_delete' : 'lead.delete', 'lead', doc.id, { ref: doc.ref }, undefined);
      },
    ],
  },
};
