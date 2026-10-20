import { randomUUID } from 'node:crypto';
import type { CollectionConfig, FieldAccess } from 'payload';
import { STAFF_ROLES, can } from '@otonom/domain';
import { mfaOk, nobody, perm, staffOnly } from '../lib/access.ts';
import { domainDb, siteUsesHttps } from '../lib/server.ts';

const ROLES = [...STAFF_ROLES, 'CUSTOMER'];
const ownerOnlyField: FieldAccess = ({ req }) => !!req.user && mfaOk(req.user as any) && can((req.user as any).role, 'user.role_change');
const hiddenField = { read: () => false, create: () => false, update: () => false };

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    useSessions: true,
    tokenExpiration: 8 * 3600,
    maxLoginAttempts: 10,
    lockTime: 10 * 60 * 1000,
    removeTokenFromResponses: true,
    // Secure cookies whenever the site runs over HTTPS (local development is plain HTTP on 127.0.0.1)
    cookies: { sameSite: 'Lax', secure: siteUsesHttps() },
  },
  admin: { useAsTitle: 'email', group: 'System' },
  access: {
    admin: ({ req }) => !!req.user && (STAFF_ROLES as readonly string[]).includes((req.user as any).role) && mfaOk(req.user as any),
    // self or owner/admin may read; customers only themselves
    read: ({ req }) => {
      if (!req.user) return false;
      if (mfaOk(req.user as any) && ['OWNER', 'ADMIN'].includes((req.user as any).role)) return true;
      return { id: { equals: req.user.id } };
    },
    create: perm('user.role_change'),
    update: ({ req }) => {
      if (!req.user || !mfaOk(req.user as any)) return false;
      if (can((req.user as any).role, 'user.role_change')) return true;
      return { id: { equals: req.user.id } };
    },
    delete: perm('user.role_change'),
    unlock: perm('user.role_change'),
  },
  fields: [
    { name: 'role', type: 'select', required: true, defaultValue: 'CUSTOMER', options: ROLES, access: { create: ownerOnlyField, update: ownerOnlyField } },
    { name: 'totpSecret', type: 'text', access: hiddenField, admin: { hidden: true } },
    { name: 'mfaEnabled', type: 'checkbox', defaultValue: false, access: { read: staffOnly as any, create: () => false, update: () => false } },
    { name: 'mfaVerifiedSids', type: 'json', access: hiddenField, admin: { hidden: true } },
    { name: 'lastTotpStep', type: 'number', defaultValue: 0, access: hiddenField, admin: { hidden: true } },
    { name: 'recoveryCodes', type: 'json', access: hiddenField, admin: { hidden: true } },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation }) => {
        // Role change must invalidate every existing session of that user (not done by Payload itself)
        if (operation === 'update' && originalDoc && data.role && data.role !== originalDoc.role) {
          data.sessions = [];
          data.mfaVerifiedSids = [];
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'update' && previousDoc && previousDoc.role !== doc.role) {
          // NOTE: separate pool => not in the same transaction as Payload's write (documented limitation)
          await domainDb().query(
            `INSERT INTO domain.audit_events(actor_type, actor_id, action, entity_type, entity_id, before, after, correlation_id) VALUES ('user',$1,'user.role_change','user',$2,$3,$4,$5)`,
            [String(req.user?.id ?? 'system'), String(doc.id), { role: previousDoc.role }, { role: doc.role }, randomUUID()],
          );
        }
      },
    ],
  },
};

export { nobody };
