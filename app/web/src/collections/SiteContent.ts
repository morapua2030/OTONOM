import type { Access, CollectionConfig, Field, GlobalConfig } from 'payload';
import { exposeDomainErrorCodes } from '../lib/errors.ts';
import { mfaOk, nobody, perm, staffOnly } from '../lib/access.ts';
import { auditRow } from '../lib/audit.ts';
import {
  invalid,
  REVIEW_FIELD,
  revalidateSiteContent,
  siteContentAfterChange,
  siteContentBeforeChange,
  siteContentGlobalAfterChange,
  siteContentGlobalBeforeChange,
} from '../lib/content-workflow.ts';
import { PACKAGE_ITEM_KEYS, SMART_HOME_PACKAGE_IDS } from '../lib/smart-home-packages.ts';
import { PRODUCT_MODELS } from '../lib/products.ts';
import { RORDER } from '../lib/simulator/rules.ts';
import { can } from '@otonom/domain';

/**
 * Admin-managed site content (final release, owner 2026-11-04). Every text is an explicit Arabic + English pair
 * (both required), every collection keeps versions with drafts, saving a draft needs `content.edit`, publishing needs
 * `content.publish` (or an editor the OWNER allowed to publish), every publish is audited and expires the public cache.
 * The public site falls back to the built-in values when nothing is published or the database is unreachable
 * (lib/site-content.ts), and production is seeded with exactly those values (scripts/seed-site-content.ts).
 */

const pair = (name: string, opts: { max?: number; textarea?: boolean; required?: boolean } = {}): Field[] =>
  (['Ar', 'En'] as const).map((suffix) => ({
    name: `${name}${suffix}`,
    type: opts.textarea ? 'textarea' : 'text',
    required: opts.required ?? true,
    maxLength: opts.max ?? 200,
    admin: { rtl: suffix === 'Ar' },
    validate: (value: unknown) => (opts.required === false || (typeof value === 'string' && value.trim().length > 0) ? true : `${name}${suffix} is required (Arabic and English)`),
  }) as Field);

/** Published content is public (it is shown on the site); staff with MFA also see drafts. */
const publishedOrStaff: Access = ({ req }) => (req.user && mfaOk(req.user as any) && staffOnly({ req } as any) ? true : { _status: { equals: 'published' } });

const contentAccess = {
  read: publishedOrStaff,
  readVersions: staffOnly,
  create: perm('content.edit'),
  update: perm('content.edit'),
  delete: nobody,
};

const order: Field = { name: 'order', type: 'number', required: true, defaultValue: 0, admin: { position: 'sidebar' } };
const active: Field = { name: 'active', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } };

const intIn = (min: number, max: number, label: string) => (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? true : `${label} must be a whole number from ${min} to ${max}`;

const hooks = (entity: string) => ({
  afterError: [exposeDomainErrorCodes],
  beforeChange: [siteContentBeforeChange],
  afterChange: [siteContentAfterChange(entity)],
});

export const CatalogPackages: CollectionConfig = {
  slug: 'catalog-packages',
  labels: { singular: 'Package', plural: 'Packages' },
  admin: { group: 'Site content', useAsTitle: 'nameEn', defaultColumns: ['nameEn', 'priceEgp', 'order', 'active', '_status'] },
  versions: { drafts: true, maxPerDoc: 50 },
  access: contentAccess,
  fields: [
    { name: 'packageId', type: 'select', required: true, unique: true, options: [...SMART_HOME_PACKAGE_IDS], access: { update: () => false } },
    ...pair('name', { max: 40 }),
    { name: 'priceEgp', type: 'number', required: true, validate: intIn(1000, 1_000_000, 'Price (EGP)') },
    { name: 'mostComplete', type: 'checkbox', defaultValue: false, admin: { description: 'Shows the "most complete" badge' } },
    ...pair('badge', { max: 40, required: false }),
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      maxRows: 12,
      fields: [
        { name: 'key', type: 'select', required: true, options: [...PACKAGE_ITEM_KEYS] },
        ...pair('name', { max: 60 }),
        { name: 'quantity', type: 'number', required: true, defaultValue: 1, validate: intIn(1, 20, 'Quantity') },
        { name: 'model', type: 'select', options: [...PRODUCT_MODELS], admin: { description: 'Links the item to its OTONOM controller page' } },
        { name: 'photo', type: 'upload', relationTo: 'media' },
      ],
    },
    order,
    active,
    REVIEW_FIELD as unknown as Field,
  ],
  hooks: hooks('catalog_package'),
};

const DEFAULT_CHANNELS: Record<string, number> = { '4r': 4, '6r': 6, '16r': 16 };

export const CatalogControllers: CollectionConfig = {
  slug: 'catalog-controllers',
  labels: { singular: 'Controller', plural: 'Controllers' },
  admin: { group: 'Site content', useAsTitle: 'nameEn', defaultColumns: ['model', 'nameEn', 'channels', '_status'] },
  versions: { drafts: true, maxPerDoc: 50 },
  access: contentAccess,
  fields: [
    { name: 'model', type: 'select', required: true, unique: true, options: [...PRODUCT_MODELS], access: { update: () => false } },
    ...pair('name', { max: 60 }),
    { name: 'channels', type: 'number', required: true, validate: intIn(1, 64, 'Channels') },
    {
      name: 'channelsOwnerOverride',
      type: 'checkbox',
      defaultValue: false,
      access: { create: ({ req }) => !!req.user && can((req.user as any).role, 'settings.stage'), update: ({ req }) => !!req.user && can((req.user as any).role, 'settings.stage') },
      admin: { description: 'OWNER only: allow a channel count other than 4 / 6 / 16' },
    },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    ...pair('note', { max: 400, textarea: true, required: false }),
    { name: 'inPackages', type: 'checkbox', defaultValue: false },
    REVIEW_FIELD as unknown as Field,
  ],
  hooks: {
    ...hooks('catalog_controller'),
    beforeChange: [
      ({ data, originalDoc }) => {
        const model = data?.model ?? originalDoc?.model;
        const override = data?.channelsOwnerOverride ?? originalDoc?.channelsOwnerOverride;
        if (model && data?.channels !== undefined && !override && data.channels !== DEFAULT_CHANNELS[model]) {
          invalid('CHANNELS_FIXED');
        }
        return data;
      },
      siteContentBeforeChange,
    ],
  },
};

export const SimRoutines: CollectionConfig = {
  slug: 'sim-routines',
  labels: { singular: 'Simulator routine', plural: 'Simulator routines' },
  admin: { group: 'Site content', useAsTitle: 'titleEn', defaultColumns: ['routineId', 'titleEn', 'premium', 'order', '_status'] },
  versions: { drafts: true, maxPerDoc: 50 },
  access: contentAccess,
  fields: [
    { name: 'routineId', type: 'select', required: true, unique: true, options: [...RORDER], access: { update: () => false }, admin: { description: 'The routine steps on the demo house are built in; this record holds its texts' } },
    ...pair('title', { max: 60 }),
    ...pair('trigger', { max: 120 }),
    ...pair('actions', { max: 400, textarea: true }),
    { name: 'premium', type: 'checkbox', defaultValue: false, admin: { description: 'Needs the smart lock (Premium)' } },
    order,
    active,
    REVIEW_FIELD as unknown as Field,
  ],
  hooks: hooks('sim_routine'),
};

export const ServiceFaqs: CollectionConfig = {
  slug: 'service-faqs',
  labels: { singular: 'Service FAQ', plural: 'Service FAQs' },
  admin: { group: 'Site content', useAsTitle: 'questionEn', defaultColumns: ['service', 'questionEn', 'order', '_status'] },
  versions: { drafts: true, maxPerDoc: 50 },
  access: contentAccess,
  fields: [
    { name: 'service', type: 'select', required: true, options: ['iot', 'soft', 'custom'] },
    ...pair('question', { max: 200 }),
    ...pair('answer', { max: 1200, textarea: true }),
    order,
    active,
    REVIEW_FIELD as unknown as Field,
  ],
  hooks: hooks('service_faq'),
};

// ---- Globals ---------------------------------------------------------------------------------------------------------
const E164 = /^\+[1-9]\d{7,14}$/;
const e164 = (value: unknown) => (typeof value === 'string' && E164.test(value) ? true : 'Use the international format, e.g. +201090721847');
const safeLink = (value: unknown) =>
  value == null || value === '' || (typeof value === 'string' && (/^\/(?!\/)[^\s]*$/.test(value) || /^https:\/\/[^\s]+$/.test(value))) ? true : 'Use a site path (/ar/…) or an https:// link';

const globalContentAccess = { read: () => true, readVersions: staffOnly, update: perm('content.edit') };
const globalHooks = (entity: string) => ({ beforeChange: [siteContentGlobalBeforeChange], afterChange: [siteContentGlobalAfterChange(entity)] });

export const ContactSettings: GlobalConfig = {
  slug: 'contact-settings',
  label: 'Contact settings',
  admin: { group: 'Site content' },
  versions: { drafts: true, max: 50 },
  access: globalContentAccess,
  fields: [
    { name: 'phoneE164', type: 'text', required: true, validate: e164 },
    { name: 'whatsappE164', type: 'text', required: true, validate: e164 },
    { name: 'email', type: 'email' },
    ...pair('address', { max: 200 }),
    ...pair('hours', { max: 120, required: false }),
    {
      name: 'socials',
      type: 'array',
      maxRows: 8,
      admin: { description: 'Empty links are hidden on the site' },
      fields: [
        { name: 'network', type: 'select', required: true, options: ['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok', 'x'] },
        { name: 'url', type: 'text', validate: (v: unknown) => (v == null || v === '' || (typeof v === 'string' && /^https:\/\/[^\s]+$/.test(v)) ? true : 'https:// links only') },
      ],
    },
    REVIEW_FIELD as unknown as Field,
  ],
  hooks: globalHooks('contact_settings'),
};

export const Announcement: GlobalConfig = {
  slug: 'announcement',
  label: 'Announcement bar',
  admin: { group: 'Site content' },
  versions: { drafts: true, max: 50 },
  access: globalContentAccess,
  fields: [
    { name: 'enabled', type: 'checkbox', defaultValue: false },
    ...pair('text', { max: 160, required: false }),
    { name: 'link', type: 'text', validate: safeLink },
    { name: 'activeFrom', type: 'date' },
    { name: 'activeTo', type: 'date' },
    REVIEW_FIELD as unknown as Field,
  ],
  hooks: {
    beforeChange: [
      ({ data }: any) => {
        if (data?.enabled && !(String(data.textAr ?? '').trim() && String(data.textEn ?? '').trim())) invalid('ANNOUNCEMENT_TEXT_REQUIRED');
        if (data?.activeFrom && data?.activeTo && new Date(data.activeTo) < new Date(data.activeFrom)) invalid('ANNOUNCEMENT_DATES');
        return data;
      },
      siteContentGlobalBeforeChange,
    ],
    afterChange: [siteContentGlobalAfterChange('announcement')],
  },
};

export const SimRules: GlobalConfig = {
  slug: 'sim-rules',
  label: 'Simulator rules (owner facts)',
  admin: { group: 'Site content' },
  versions: { drafts: true, max: 50 },
  access: { read: () => true, readVersions: staffOnly, update: perm('settings.stage') },
  fields: [
    { name: 'acChannels', type: 'number', required: true, defaultValue: 0, validate: intIn(0, 4, 'AC channels') },
    { name: 'channelsPerDevice', type: 'number', required: true, defaultValue: 1, validate: intIn(1, 4, 'Channels per device') },
    { name: 'engineerReviewAbove', type: 'number', required: true, defaultValue: 64, validate: intIn(16, 256, 'Engineer review threshold') },
    REVIEW_FIELD as unknown as Field,
  ],
  hooks: globalHooks('sim_rules'),
};

/** Privacy text (draft for owner approval, not legal advice). The site shows /legal/privacy only while approved. */
export const PrivacyPolicy: GlobalConfig = {
  slug: 'privacy-policy',
  label: 'Privacy text',
  admin: { group: 'Settings' },
  versions: { max: 100 },
  access: { read: () => true, readVersions: staffOnly, update: perm('content.edit') },
  fields: [
    ...pair('body', { max: 12000, textarea: true }),
    { name: 'lastUpdated', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayOnly' } } },
    {
      name: 'approved',
      type: 'checkbox',
      defaultValue: false,
      label: 'اعتماد نص الخصوصية — Approve the privacy text',
      access: { update: ({ req }) => !!req.user && mfaOk(req.user as any) && can((req.user as any).role, 'privacy.approve') },
      admin: { description: 'OWNER only. While off, /legal/privacy redirects to /contact and the booking form stays hidden.' },
    },
    { name: 'approvedBy', type: 'text', admin: { readOnly: true } },
    { name: 'approvedAt', type: 'date', admin: { readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }: any) => {
        const changedText = ['bodyAr', 'bodyEn'].some((f) => f in (data ?? {}) && data[f] !== originalDoc?.[f]);
        // editing the approved text withdraws the approval until the OWNER approves the new wording
        if (changedText && originalDoc?.approved && !(data?.approved && can((req.user as any)?.role, 'privacy.approve'))) data.approved = false;
        if (data?.approved && !originalDoc?.approved) {
          data.approvedBy = req.user ? String(req.user.id) : 'system';
          data.approvedAt = new Date().toISOString();
        }
        if (!data?.approved) {
          data.approvedBy = null;
          data.approvedAt = null;
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, context }: any) => {
        if (!context?.systemSeed && !!previousDoc?.approved !== !!doc.approved) await auditRow(req, doc.approved ? 'privacy.approved' : 'privacy.withdrawn', 'privacy_policy', 'privacy-policy', { approved: !!previousDoc?.approved }, { approved: !!doc.approved });
        else if (!context?.systemSeed) await auditRow(req, 'privacy.edited', 'privacy_policy', 'privacy-policy', undefined, { approved: !!doc.approved });
        revalidateSiteContent();
        return doc;
      },
    ],
  },
};

/** Booking intake switch and retention (OWNER only, audited). The form shows only when this AND the privacy approval are on. */
export const IntakeSettings: GlobalConfig = {
  slug: 'intake-settings',
  label: 'Booking requests',
  admin: { group: 'Settings' },
  versions: { max: 100 },
  access: { read: staffOnly, update: perm('intake.settings') },
  fields: [
    { name: 'enabled', type: 'checkbox', defaultValue: false, label: 'Accept booking requests on the site' },
    { name: 'retentionMonths', type: 'number', required: true, defaultValue: 12, validate: intIn(1, 36, 'Retention (months)'), admin: { description: 'Leads are deleted this many months after their last activity' } },
  ],
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req, context }: any) => {
        if (!context?.systemSeed) await auditRow(req, 'intake.settings', 'intake_settings', 'intake-settings', { enabled: !!previousDoc?.enabled, retentionMonths: previousDoc?.retentionMonths ?? null }, { enabled: !!doc.enabled, retentionMonths: doc.retentionMonths });
        revalidateSiteContent();
        return doc;
      },
    ],
  },
};

export const siteContentCollections: CollectionConfig[] = [CatalogPackages, CatalogControllers, SimRoutines, ServiceFaqs];
export const siteContentGlobals: GlobalConfig[] = [ContactSettings, Announcement, SimRules, PrivacyPolicy, IntakeSettings];
