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
import { failAfterChangeForTests } from '../lib/test-failures.ts';
import {
  ACTIVE_COPY, ANNOUNCEMENT_F, BOOKING_FORM_F, CONTACT_F, CONTROLLER_F, FAQ_F, GROUP, INTERNAL, ITEM_KEY_COPY, LEAD_PACKAGE_COPY,
  MODEL_COPY, NETWORK_COPY, NOT_ON_SITE, optionsOf, ORDER_COPY, PACKAGE_F, PAGE, pairLabels, PRIVACY_F, REVIEW_COPY, ROUTINE_COPY,
  ROUTINE_F, SERVICE_COPY, SIM_RULES_F, type Pair,
} from '../admin-ui/copy.ts';

/**
 * Admin-managed site content (final release, owner 2026-11-04). Every text is an explicit Arabic + English pair
 * (both required), every collection keeps versions with drafts, saving a draft needs `content.edit`, publishing needs
 * `content.publish` (or an editor the OWNER allowed to publish), every publish is audited and expires the public cache.
 * The public site falls back to the built-in values when nothing is published or the database is unreachable
 * (lib/site-content.ts), and production is seeded with exactly those values (scripts/seed-site-content.ts).
 */

// R3: each pair is shown side by side (a layout `row`; the two stored fields are unchanged), labelled
// «الاسم (عربي)» / «الاسم (English)», with optional help under both.
const pair = (name: string, opts: { max?: number; textarea?: boolean; required?: boolean; label?: Pair; help?: Pair } = {}): Field[] => [
  {
    type: 'row',
    fields: (['Ar', 'En'] as const).map((suffix) => ({
      name: `${name}${suffix}`,
      ...(opts.label ? { label: pairLabels(opts.label)[suffix === 'Ar' ? 'ar' : 'en'] } : {}),
      type: opts.textarea ? 'textarea' : 'text',
      required: opts.required ?? true,
      maxLength: opts.max ?? 200,
      admin: { rtl: suffix === 'Ar', width: '50%', ...(opts.help ? { description: opts.help } : {}) },
      validate: (value: unknown) => (opts.required === false || (typeof value === 'string' && value.trim().length > 0) ? true : `${name}${suffix} is required (Arabic and English)`),
    }) as Field),
  } as Field,
];

/** The review-state field with { ar, en } words (values and rules unchanged; lib/content-workflow.ts). */
const review = {
  ...REVIEW_FIELD,
  label: REVIEW_COPY.label,
  options: REVIEW_FIELD.options.map((value) => ({ value, label: REVIEW_COPY.options[value] })),
  admin: { ...REVIEW_FIELD.admin, description: REVIEW_COPY.help },
} as unknown as Field;

/** Published content is public (it is shown on the site); staff with MFA also see drafts. */
const publishedOrStaff: Access = ({ req }) => (req.user && mfaOk(req.user as any) && staffOnly({ req } as any) ? true : { _status: { equals: 'published' } });

const contentAccess = {
  read: publishedOrStaff,
  readVersions: staffOnly,
  create: perm('content.edit'),
  update: perm('content.edit'),
  delete: nobody,
};

const order: Field = { name: 'order', label: ORDER_COPY.label, type: 'number', required: true, defaultValue: 0, admin: { position: 'sidebar', description: ORDER_COPY.help } };
const active: Field = { name: 'active', label: ACTIVE_COPY.label, type: 'checkbox', defaultValue: true, admin: { position: 'sidebar', description: ACTIVE_COPY.help } };

const intIn = (min: number, max: number, label: string) => (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? true : `${label} must be a whole number from ${min} to ${max}`;

const hooks = (entity: string) => ({
  afterError: [exposeDomainErrorCodes],
  beforeChange: [siteContentBeforeChange],
  afterChange: [siteContentAfterChange(entity), failAfterChangeForTests],
});

export const CatalogPackages: CollectionConfig = {
  slug: 'catalog-packages',
  labels: { singular: PAGE.packages.one, plural: PAGE.packages.name },
  admin: { group: GROUP.catalog, description: PAGE.packages.line, useAsTitle: 'nameEn', defaultColumns: ['nameAr', 'nameEn', 'priceEgp', 'active', '_status'] },
  versions: { drafts: { validate: true }, maxPerDoc: 50 },
  access: contentAccess,
  fields: [
    { name: 'packageId', label: PACKAGE_F.packageId.label, type: 'select', required: true, unique: true, options: optionsOf(SMART_HOME_PACKAGE_IDS, LEAD_PACKAGE_COPY), access: { update: () => false }, admin: { description: PACKAGE_F.packageId.help } },
    ...pair('name', { max: 40, label: PACKAGE_F.name.label }),
    { name: 'priceEgp', label: PACKAGE_F.price.label, type: 'number', required: true, validate: intIn(1000, 1_000_000, 'Price (EGP)'), admin: { description: PACKAGE_F.price.help } },
    { name: 'mostComplete', label: PACKAGE_F.mostComplete.label, type: 'checkbox', defaultValue: false, admin: { description: PACKAGE_F.mostComplete.help } },
    ...pair('badge', { max: 40, required: false, label: PACKAGE_F.badge.label, help: PACKAGE_F.badge.help }),
    {
      name: 'items',
      label: PACKAGE_F.items.label,
      labels: { singular: PACKAGE_F.items.one, plural: PACKAGE_F.items.many },
      type: 'array',
      minRows: 1,
      maxRows: 12,
      fields: [
        { name: 'key', label: PACKAGE_F.itemKey.label, type: 'select', required: true, options: optionsOf(PACKAGE_ITEM_KEYS, ITEM_KEY_COPY) },
        ...pair('name', { max: 60, label: PACKAGE_F.itemName.label }),
        { name: 'quantity', label: PACKAGE_F.quantity.label, type: 'number', required: true, defaultValue: 1, validate: intIn(1, 20, 'Quantity') },
        { name: 'model', label: PACKAGE_F.model.label, type: 'select', options: optionsOf(PRODUCT_MODELS, MODEL_COPY), admin: { description: PACKAGE_F.model.help } },
        { name: 'photo', label: PACKAGE_F.photo.label, type: 'upload', relationTo: 'media', admin: { description: NOT_ON_SITE } },
      ],
    },
    order,
    active,
    review,
  ],
  hooks: hooks('catalog_package'),
};

const DEFAULT_CHANNELS: Record<string, number> = { '4r': 4, '6r': 6, '16r': 16 };

export const CatalogControllers: CollectionConfig = {
  slug: 'catalog-controllers',
  labels: { singular: PAGE.controllers.one, plural: PAGE.controllers.name },
  admin: { group: GROUP.catalog, description: PAGE.controllers.line, useAsTitle: 'nameEn', defaultColumns: ['model', 'channels', '_status'] },
  versions: { drafts: { validate: true }, maxPerDoc: 50 },
  access: contentAccess,
  fields: [
    { name: 'model', label: CONTROLLER_F.model.label, type: 'select', required: true, unique: true, options: optionsOf(PRODUCT_MODELS, MODEL_COPY), access: { update: () => false }, admin: { description: CONTROLLER_F.model.help } },
    ...pair('name', { max: 60, label: CONTROLLER_F.name.label, help: INTERNAL }),
    { name: 'channels', label: CONTROLLER_F.channels.label, type: 'number', required: true, validate: intIn(1, 64, 'Channels'), admin: { description: CONTROLLER_F.channels.help } },
    {
      name: 'channelsOwnerOverride',
      label: CONTROLLER_F.override.label,
      type: 'checkbox',
      defaultValue: false,
      access: { create: ({ req }) => !!req.user && can((req.user as any).role, 'settings.stage'), update: ({ req }) => !!req.user && can((req.user as any).role, 'settings.stage') },
      admin: { description: CONTROLLER_F.override.help },
    },
    { name: 'photo', label: CONTROLLER_F.photo.label, type: 'upload', relationTo: 'media', admin: { description: CONTROLLER_F.photo.help } },
    ...pair('note', { max: 400, textarea: true, required: false, label: CONTROLLER_F.note.label, help: INTERNAL }),
    { name: 'inPackages', label: CONTROLLER_F.inPackages.label, type: 'checkbox', defaultValue: false, admin: { description: INTERNAL } },
    review,
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
  labels: { singular: PAGE.simRoutines.one, plural: PAGE.simRoutines.name },
  admin: { group: GROUP.site, description: PAGE.simRoutines.line, useAsTitle: 'titleEn', defaultColumns: ['routineId', 'titleAr', 'titleEn', 'premium', '_status'] },
  versions: { drafts: { validate: true }, maxPerDoc: 50 },
  access: contentAccess,
  fields: [
    { name: 'routineId', label: ROUTINE_F.routineId.label, type: 'select', required: true, unique: true, options: optionsOf(RORDER, ROUTINE_COPY), access: { update: () => false }, admin: { description: ROUTINE_F.routineId.help } },
    ...pair('title', { max: 60, label: ROUTINE_F.title.label }),
    ...pair('trigger', { max: 120, label: ROUTINE_F.trigger.label }),
    ...pair('actions', { max: 400, textarea: true, label: ROUTINE_F.actions.label, help: ROUTINE_F.actions.help }),
    { name: 'premium', label: ROUTINE_F.premium.label, type: 'checkbox', defaultValue: false },
    order,
    active,
    review,
  ],
  hooks: hooks('sim_routine'),
};

export const ServiceFaqs: CollectionConfig = {
  slug: 'service-faqs',
  labels: { singular: PAGE.faqs.one, plural: PAGE.faqs.name },
  admin: { group: GROUP.site, description: PAGE.faqs.line, useAsTitle: 'questionEn', defaultColumns: ['service', 'questionAr', 'questionEn', '_status'] },
  versions: { drafts: { validate: true }, maxPerDoc: 50 },
  access: contentAccess,
  fields: [
    { name: 'service', label: FAQ_F.service.label, type: 'select', required: true, options: optionsOf(['iot', 'soft', 'custom'] as const, SERVICE_COPY) },
    ...pair('question', { max: 200, label: FAQ_F.question.label }),
    ...pair('answer', { max: 1200, textarea: true, label: FAQ_F.answer.label }),
    order,
    active,
    review,
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
  label: PAGE.contact.name,
  admin: { group: GROUP.site, description: PAGE.contact.line },
  versions: { drafts: { validate: true }, max: 50 },
  access: globalContentAccess,
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'phoneE164', label: CONTACT_F.phone.label, type: 'text', required: true, validate: e164, admin: { width: '50%', description: CONTACT_F.phone.help } },
        { name: 'whatsappE164', label: CONTACT_F.whatsapp.label, type: 'text', required: true, validate: e164, admin: { width: '50%', description: CONTACT_F.whatsapp.help } },
      ],
    },
    { name: 'email', label: CONTACT_F.email.label, type: 'email', admin: { description: CONTACT_F.email.help } },
    ...pair('address', { max: 200, label: CONTACT_F.address.label }),
    ...pair('hours', { max: 120, required: false, label: CONTACT_F.hours.label, help: NOT_ON_SITE }),
    {
      name: 'socials',
      label: CONTACT_F.socials.label,
      labels: { singular: CONTACT_F.socials.one, plural: CONTACT_F.socials.many },
      type: 'array',
      maxRows: 8,
      admin: { description: CONTACT_F.socials.help },
      fields: [
        { name: 'network', label: CONTACT_F.network.label, type: 'select', required: true, options: optionsOf(['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok', 'x'] as const, NETWORK_COPY) },
        { name: 'url', label: CONTACT_F.url.label, type: 'text', validate: (v: unknown) => (v == null || v === '' || (typeof v === 'string' && /^https:\/\/[^\s]+$/.test(v)) ? true : 'https:// links only'), admin: { description: CONTACT_F.url.help } },
      ],
    },
    review,
  ],
  hooks: globalHooks('contact_settings'),
};

export const Announcement: GlobalConfig = {
  slug: 'announcement',
  label: PAGE.announcement.name,
  admin: { group: GROUP.site, description: PAGE.announcement.line },
  versions: { drafts: { validate: true }, max: 50 },
  access: globalContentAccess,
  fields: [
    { name: 'enabled', label: ANNOUNCEMENT_F.enabled.label, type: 'checkbox', defaultValue: false, admin: { description: ANNOUNCEMENT_F.enabled.help } },
    ...pair('text', { max: 160, required: false, label: ANNOUNCEMENT_F.text.label }),
    { name: 'link', label: ANNOUNCEMENT_F.link.label, type: 'text', validate: safeLink, admin: { description: ANNOUNCEMENT_F.link.help } },
    {
      type: 'row',
      fields: [
        { name: 'activeFrom', label: ANNOUNCEMENT_F.from.label, type: 'date', admin: { width: '50%', description: ANNOUNCEMENT_F.from.help } },
        { name: 'activeTo', label: ANNOUNCEMENT_F.to.label, type: 'date', admin: { width: '50%', description: ANNOUNCEMENT_F.to.help } },
      ],
    },
    review,
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
  label: PAGE.simRules.name,
  admin: { group: GROUP.site, description: PAGE.simRules.line },
  versions: { drafts: { validate: true }, max: 50 },
  access: { read: () => true, readVersions: staffOnly, update: perm('settings.stage') },
  fields: [
    { name: 'acChannels', label: SIM_RULES_F.ac.label, type: 'number', required: true, defaultValue: 0, validate: intIn(0, 4, 'AC channels'), admin: { description: SIM_RULES_F.ac.help } },
    { name: 'channelsPerDevice', label: SIM_RULES_F.perDevice.label, type: 'number', required: true, defaultValue: 1, validate: intIn(1, 4, 'Channels per device'), admin: { description: SIM_RULES_F.perDevice.help } },
    { name: 'engineerReviewAbove', label: SIM_RULES_F.review.label, type: 'number', required: true, defaultValue: 64, validate: intIn(16, 256, 'Engineer review threshold'), admin: { description: SIM_RULES_F.review.help } },
    review,
  ],
  hooks: globalHooks('sim_rules'),
};

/** Privacy text (draft for owner approval, not legal advice). The site shows /legal/privacy only while approved. */
export const PrivacyPolicy: GlobalConfig = {
  slug: 'privacy-policy',
  label: PAGE.privacy.name,
  admin: { group: GROUP.site, description: PAGE.privacy.line },
  versions: { max: 100 },
  access: { read: () => true, readVersions: staffOnly, update: perm('content.edit') },
  fields: [
    ...pair('body', { max: 12000, textarea: true, label: PRIVACY_F.body.label, help: PRIVACY_F.body.help }),
    { name: 'lastUpdated', label: PRIVACY_F.lastUpdated.label, type: 'date', required: true, admin: { date: { pickerAppearance: 'dayOnly' } } },
    {
      name: 'approved',
      type: 'checkbox',
      defaultValue: false,
      label: PRIVACY_F.approved.label,
      access: { update: ({ req }) => !!req.user && mfaOk(req.user as any) && can((req.user as any).role, 'privacy.approve') },
      admin: { description: PRIVACY_F.approved.help },
    },
    {
      type: 'row',
      fields: [
        { name: 'approvedBy', label: PRIVACY_F.approvedBy.label, type: 'text', admin: { readOnly: true, width: '50%' } },
        { name: 'approvedAt', label: PRIVACY_F.approvedAt.label, type: 'date', admin: { readOnly: true, width: '50%', components: { Field: '/admin-ui/leads/ReadOnlyDate#ReadOnlyDate' } } },
      ],
    },
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
  label: PAGE.bookingForm.name,
  admin: { group: GROUP.settings, description: PAGE.bookingForm.line },
  versions: { max: 100 },
  access: { read: staffOnly, update: perm('intake.settings') },
  fields: [
    { name: 'enabled', type: 'checkbox', defaultValue: false, label: BOOKING_FORM_F.enabled.label, admin: { description: BOOKING_FORM_F.enabled.help } },
    { name: 'retentionMonths', label: BOOKING_FORM_F.retention.label, type: 'number', required: true, defaultValue: 12, validate: intIn(1, 36, 'Retention (months)'), admin: { description: BOOKING_FORM_F.retention.help } },
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
