import type { CollectionConfig, FieldAccess } from 'payload';
import { can } from '@otonom/domain';
import { exposeDomainErrorCodes } from '../lib/errors.ts';
import { mfaOk, nobody, perm } from '../lib/access.ts';
import { auditRow } from '../lib/audit.ts';
import { LEAD_LIMITS, LEAD_PACKAGES, LEAD_SOURCES, LEAD_STATUSES } from '../lib/leads.ts';

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
  labels: { singular: 'Booking request', plural: 'Booking requests' },
  admin: { group: 'Sales', useAsTitle: 'ref', defaultColumns: ['ref', 'name', 'phone', 'package', 'source', 'status', 'assignee', 'createdAt'], listSearchableFields: ['ref', 'name', 'phone'] },
  versions: { maxPerDoc: 100 },
  access: {
    read: perm('leads.read'),
    readVersions: perm('leads.read'),
    create: nobody,
    update: perm('leads.write'),
    delete: perm('leads.export'),
  },
  fields: [
    { name: 'ref', type: 'text', required: true, unique: true, index: true, access: { update: noClientWrite } },
    { name: 'name', type: 'text', required: true, minLength: LEAD_LIMITS.nameMin, maxLength: LEAD_LIMITS.name, access: { update: ownerField } },
    { name: 'phone', type: 'text', required: true, index: true, access: { update: ownerField }, admin: { description: 'Egyptian mobile, stored as +20…' } },
    { name: 'package', type: 'select', required: true, options: [...LEAD_PACKAGES], access: { update: ownerField } },
    { name: 'message', label: 'Note', type: 'textarea', maxLength: LEAD_LIMITS.message, access: { update: ownerField }, admin: { description: 'Optional note the visitor added (up to 500 characters)' } },
    { name: 'plan', type: 'textarea', maxLength: LEAD_LIMITS.plan, access: { update: ownerField }, admin: { description: 'Simulator plan sent with the request (text only, attached automatically from the simulator)' } },
    { name: 'source', type: 'select', required: true, options: [...LEAD_SOURCES], access: { update: noClientWrite } },
    { name: 'locale', type: 'select', required: true, options: ['ar', 'en'], access: { update: noClientWrite } },
    {
      name: 'consent',
      type: 'group',
      access: { update: noClientWrite },
      fields: [
        { name: 'given', type: 'checkbox', required: true },
        { name: 'at', type: 'date', required: true },
        { name: 'privacyVersion', type: 'text', required: true, admin: { description: 'Date of the approved privacy text the visitor accepted' } },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'NEW',
      options: LEAD_STATUSES.map((s) => ({ value: s.value, label: `${s.ar} — ${s.en}` })),
      admin: { position: 'sidebar' },
    },
    { name: 'assignee', type: 'relationship', relationTo: 'users', admin: { position: 'sidebar' } },
    {
      name: 'notes',
      type: 'array',
      admin: { description: 'Notes are added, never edited or removed' },
      fields: [
        { name: 'text', type: 'textarea', required: true, maxLength: 1000 },
        { name: 'by', type: 'text', admin: { readOnly: true } },
        { name: 'at', type: 'date', admin: { readOnly: true } },
      ],
    },
    { name: 'lastActivityAt', type: 'date', index: true, admin: { position: 'sidebar', readOnly: true }, access: { update: noClientWrite } },
    { name: 'idempotencyKey', type: 'text', unique: true, index: true, admin: { hidden: true }, access: { read: noClientWrite, update: noClientWrite } },
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
    ],
    afterDelete: [
      async ({ doc, req, context }) => {
        await auditRow(req, (context as any)?.retention ? 'lead.retention_delete' : 'lead.delete', 'lead', doc.id, { ref: doc.ref }, undefined);
      },
    ],
  },
};
