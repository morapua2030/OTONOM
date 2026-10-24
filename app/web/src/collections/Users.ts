import { randomUUID } from 'node:crypto';
import { APIError, ValidationError, type CollectionConfig, type FieldAccess } from 'payload';
import { STAFF_ROLES, can, passwordPolicyError } from '@otonom/domain';
import { mfaOk, mutationOriginGuard, nobody, perm, staffOnly } from '../lib/access.ts';
import { domainDb, payloadSecret, siteUsesHttps } from '../lib/server.ts';
import { clientIp, rateLimit, rateLimitStatus } from '../lib/ratelimit.ts';
import { isUsersLoginRequest, loginIdentityDigest, normalizeLoginIdentity } from '../lib/login-security.ts';
import { productionOwnerPasswordOnly } from '../lib/production-owner-auth.ts';

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
    beforeOperation: [
      async ({ args, operation, req }) => {
        if (operation !== 'login' || !isUsersLoginRequest(req.method, req.url)) return args;

        if (mutationOriginGuard(req)) {
          throw new APIError('Authentication failed.', 403, { code: 'AUTHENTICATION_FAILED' }, true);
        }

        const submittedEmail = normalizeLoginIdentity((args as any).data?.email ?? (req as any).data?.email);
        const accountDigest = loginIdentityDigest(submittedEmail, payloadSecret());
        const ip = clientIp(req.headers);
        const limits = await Promise.all([
          rateLimitStatus(`staff-login-account-fast:${accountDigest}`, 12, 60_000),
          rateLimitStatus(`staff-login-account-cooldown:${accountDigest}`, 25, 10 * 60_000),
          rateLimitStatus(`staff-login-ip:${ip}`, 60, 10 * 60_000),
        ]);
        const denied = limits.filter((limit) => !limit.allowed);
        if (denied.length) {
          const retryAfterSec = Math.max(...denied.map((limit) => limit.retryAfterSec));
          req.responseHeaders?.set('retry-after', String(retryAfterSec));
          req.responseHeaders?.set('cache-control', 'no-store');
          throw new APIError('Authentication failed.', 429, { code: 'AUTH_RATE_LIMITED', retryAfterSec }, true);
        }
        return args;
      },
    ],
    afterLogin: [
      async ({ req, user }) => {
        await domainDb().query(
          `INSERT INTO domain.audit_events(actor_type, actor_id, action, entity_type, entity_id, after, correlation_id)
           VALUES ('user',$1,'user.login_succeeded','authentication',$1,$2,$3)`,
          [
            String(user.id),
            JSON.stringify({ policy: productionOwnerPasswordOnly(user as any) ? 'PRODUCTION_OWNER_PASSWORD_ONLY' : 'MFA_PENDING' }),
            req.headers.get('x-correlation-id')?.slice(0, 80) || randomUUID(),
          ],
        );
        return user;
      },
    ],
    afterLogout: [
      async ({ req }) => {
        await domainDb().query(
          `INSERT INTO domain.audit_events(actor_type, actor_id, action, entity_type, entity_id, after, correlation_id)
           VALUES ('user',$1,'user.logout_requested','authentication',$1,$2,$3)`,
          [
            String(req.user?.id ?? 'unknown'),
            JSON.stringify({ allSessions: req.searchParams.get('allSessions') === 'true' }),
            req.headers.get('x-correlation-id')?.slice(0, 80) || randomUUID(),
          ],
        );
      },
    ],
    afterError: [
      async ({ error, req }) => {
        if (!isUsersLoginRequest(req.method, req.url)) return;
        const submittedEmail = (req as any).data?.email;
        const identity = loginIdentityDigest(submittedEmail, payloadSecret());
        const ip = clientIp(req.headers);
        try {
          await Promise.all([
            rateLimit(`staff-login-account-fast:${identity}`, 12, 60_000),
            rateLimit(`staff-login-account-cooldown:${identity}`, 25, 10 * 60_000),
            rateLimit(`staff-login-ip:${ip}`, 60, 10 * 60_000),
            domainDb().query(
              `INSERT INTO domain.audit_events(actor_type, actor_id, action, entity_type, entity_id, after, correlation_id)
               VALUES ('anonymous','anonymous','user.login_failed','authentication',$1,$2,$3)`,
              [
                identity,
                JSON.stringify({ outcome: 'DENIED', category: error.name === 'LockedAuth' ? 'LOCKED' : (error as Error & { status?: number }).status === 429 ? 'RATE_LIMITED' : 'AUTHENTICATION_FAILED' }),
                req.headers.get('x-correlation-id')?.slice(0, 80) || randomUUID(),
              ],
            ),
          ]);
        } catch (auditError) {
          req.payload.logger.error({ err: auditError, msg: 'Failed to append login denial audit event' });
        }
      },
    ],
    beforeValidate: [
      ({ data, req }) => {
        if (data?.password !== undefined) {
          const code = passwordPolicyError(data.password, data.email);
          if (code) throw new ValidationError({ collection: 'users', req, errors: [{ path: 'password', label: 'Password', message: code }] });
        }
        return data;
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, operation, context }) => {
        if (operation === 'update' && originalDoc && data.password !== undefined) {
          data.sessions = [];
          data.mfaVerifiedSids = [];
          if (context) (context as Record<string, unknown>).passwordChanged = true;
        }
        // Role change must invalidate every existing session of that user (not done by Payload itself)
        if (operation === 'update' && originalDoc && data.role && data.role !== originalDoc.role) {
          data.sessions = [];
          data.mfaVerifiedSids = [];
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req, context }) => {
        if (operation === 'update' && context && (context as Record<string, unknown>).passwordChanged === true) {
          await domainDb().query(`UPDATE domain.staff_auth_factors SET expires_at=now() WHERE user_id=$1`, [String(doc.id)]);
          await domainDb().query(
            `UPDATE domain.staff_email_otp_challenges SET status='SUPERSEDED'
              WHERE user_id=$1 AND status IN ('PENDING','SENT')`,
            [String(doc.id)],
          );
          await domainDb().query(
            `INSERT INTO domain.audit_events(actor_type, actor_id, action, entity_type, entity_id, correlation_id)
             VALUES ('user',$1,'user.password_changed','user',$2,$3)`,
            [String(req.user?.id ?? doc.id), String(doc.id), randomUUID()],
          );
        }
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
