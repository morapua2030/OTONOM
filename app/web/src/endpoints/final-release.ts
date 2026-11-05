import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Endpoint, PayloadRequest } from 'payload';
import { passwordPolicyError } from '@otonom/domain';
import { body, guard, jsonRes, mutationOriginGuard } from '../lib/access.ts';
import { auditRow } from '../lib/audit.ts';
import { checkBookingToken } from '../lib/booking-token.ts';
import { bookingVisible, LEAD_STATUSES, retentionCutoff, validateLead } from '../lib/leads.ts';
import { cairoDay, countMetric, isBotAgent, isMetricEvent, metricRoute, metricsSummary } from '../lib/metrics.ts';
import { digestEmail, inviteEmail, leadAlertEmail, leadsNotifyTo, notificationsConfigured, sendMail, weeklyEmail } from '../lib/notify-email.ts';
import { clientIp, rateLimit } from '../lib/ratelimit.ts';
import { domainDb, previewLocked, SITE_URL } from '../lib/server.ts';
import { protectedAdminOrigin, publicMarketingOnly } from '../lib/deployment.ts';

/**
 * Final release endpoints (owner 2026-11-04). The public host serves only POST /api/e and POST /api/booking (see
 * PUBLIC_HOST_ENDPOINTS); the scheduled job is reachable only with the CRON_SECRET bearer token; everything else here is
 * staff-only on the admin host (MFA + RBAC as every other staff endpoint).
 */
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomRef = (prefix: string) => `${prefix}-${new Date().getUTCFullYear()}-${Array.from(randomBytes(6), (b) => B32[b % 32]).join('')}`;
const noStore = { 'cache-control': 'no-store' };
const adminOrigin = () => (publicMarketingOnly() && protectedAdminOrigin()) || SITE_URL;

/** Both audited switches (privacy approved, intake enabled) read fresh from the database, never from a cache. */
async function bookingSettings(req: PayloadRequest) {
  const [privacy, intake]: any[] = await Promise.all([
    req.payload.findGlobal({ slug: 'privacy-policy' as any, overrideAccess: true, depth: 0 }).catch(() => null),
    req.payload.findGlobal({ slug: 'intake-settings' as any, overrideAccess: true, depth: 0 }).catch(() => null),
  ]);
  return {
    privacyApproved: privacy?.approved === true,
    intakeEnabled: intake?.enabled === true,
    privacyVersion: typeof privacy?.lastUpdated === 'string' ? cairoDay(new Date(privacy.lastUpdated)) : 'unknown',
    retentionMonths: typeof intake?.retentionMonths === 'number' ? intake.retentionMonths : 12,
  };
}

/** Constant-time check of `Authorization: Bearer <CRON_SECRET>` (a secret of at least 32 characters). */
export function cronAuthorized(header: string | null, env: NodeJS.ProcessEnv = process.env): boolean {
  const secret = env.CRON_SECRET?.trim() ?? '';
  if (secret.length < 32 || !header?.startsWith('Bearer ')) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** CSV cell safe from spreadsheet formula injection. */
export const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${guarded.replace(/"/g, '""')}"`;
};

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export const finalReleaseEndpoints: Endpoint[] = [
  // ---------------- Public: booking request (form shown only when privacy is approved AND intake is enabled) ----------
  {
    path: '/booking',
    method: 'post',
    handler: async (req) => {
      if (previewLocked()) return jsonRes(404, { code: 'BOOKING_DISABLED' });
      const settings = await bookingSettings(req);
      if (!bookingVisible(settings)) return jsonRes(404, { code: 'BOOKING_DISABLED' });
      const csrf = mutationOriginGuard(req);
      if (csrf) return csrf;
      const rl = await rateLimit(`booking:${cairoDay()}:${clientIp(req.headers)}`, 5, 60 * 60_000);
      if (!rl.allowed) return Response.json({ code: 'RATE_LIMITED', retryAfterSec: rl.retryAfterSec }, { status: 429, headers: { 'retry-after': String(rl.retryAfterSec), ...noStore } });
      const b = await body(req);
      // honeypot and too-fast submissions: answered like a success, nothing is stored or sent
      if (typeof b.website === 'string' && b.website.length > 0) return jsonRes(202, { ref: 'BK-ACCEPTED' });
      const timing = checkBookingToken(b.t);
      if (timing === 'TOO_FAST') return jsonRes(202, { ref: 'BK-ACCEPTED' });
      if (timing !== 'OK') return jsonRes(422, { code: 'FORM_EXPIRED' });
      const v = validateLead(b);
      if (!v.ok) return jsonRes(422, { code: 'VALIDATION_FAILED', fieldErrors: v.errors });
      const i = v.value;
      const existing = await req.payload.find({ collection: 'leads' as any, where: { idempotencyKey: { equals: i.idempotencyKey } }, overrideAccess: true, depth: 0, limit: 1, req });
      if (existing.docs[0]) return jsonRes(200, { ref: (existing.docs[0] as any).ref, replay: true });
      const ref = randomRef('BK');
      const now = new Date().toISOString();
      let created: any;
      try {
        created = await req.payload.create({
          collection: 'leads' as any,
          overrideAccess: true,
          req,
          context: { system: true },
          data: {
            ref, name: i.name, phone: i.phone, package: i.package, message: i.message, plan: i.plan,
            source: i.source, locale: i.locale, consent: { given: true, at: now, privacyVersion: settings.privacyVersion },
            status: 'NEW', lastActivityAt: now, idempotencyKey: i.idempotencyKey,
          } as any,
        });
      } catch (e) {
        const again = await req.payload.find({ collection: 'leads' as any, where: { idempotencyKey: { equals: i.idempotencyKey } }, overrideAccess: true, depth: 0, limit: 1, req });
        if (again.docs[0]) return jsonRes(200, { ref: (again.docs[0] as any).ref, replay: true });
        throw e;
      }
      await auditRow(req, 'lead.created', 'lead', created.id, undefined, { ref, source: i.source, package: i.package });
      const to = leadsNotifyTo();
      if (to) await sendMail({ to, idempotencyKey: `otonom-lead-${ref}`, ...leadAlertEmail({ ref, id: created.id, name: i.name, phone: i.phone, package: i.package, source: i.source, hasNote: !!i.message, hasPlan: !!i.plan }, adminOrigin()) }, to).catch(() => undefined);
      else console.warn('[notify] lead alert skipped: OTONOM_LEADS_NOTIFY_TO not set');
      return jsonRes(201, { ref });
    },
  },
  // ---------------- Public: privacy-first metrics counter (aggregates only) ----------------
  {
    path: '/e',
    method: 'post',
    handler: async (req) => {
      const done = new Response(null, { status: 204, headers: noStore });
      const csrf = mutationOriginGuard(req);
      if (csrf) return csrf;
      if (isBotAgent(req.headers.get('user-agent'))) return done;
      const length = Number(req.headers.get('content-length') ?? '0');
      if (length > 512) return jsonRes(413, { code: 'TOO_LARGE' });
      const b = await body(req);
      const r = metricRoute(b.r);
      if (!isMetricEvent(b.e) || !r || (b.l !== undefined && b.l !== r.locale)) return jsonRes(400, { code: 'INVALID_EVENT' });
      const rl = await rateLimit(`metric:${cairoDay()}:${clientIp(req.headers)}`, 240, 10 * 60_000);
      if (!rl.allowed) return done; // over the limit: silently not counted
      await countMetric(domainDb(), b.e, r.route, r.locale);
      return done;
    },
  },
  // ---------------- Scheduled: daily digest (9:00 Cairo), Sunday weekly summary, lead retention ----------------
  {
    path: '/cron/daily',
    method: 'get',
    handler: async (req) => {
      if (!cronAuthorized(req.headers.get('authorization'))) return jsonRes(401, { code: 'UNAUTHORIZED' });
      const result = await runDailyJobs(req);
      return jsonRes(200, result);
    },
  },
  // ---------------- Staff: KPI metrics and lead export ----------------
  {
    path: '/metrics/summary',
    method: 'get',
    handler: async (req) => {
      const g = guard(req, 'metrics.read');
      if (g) return g;
      return jsonRes(200, await metricsSummary(domainDb()));
    },
  },
  {
    path: '/leads-export',
    method: 'get',
    handler: async (req) => {
      const g = guard(req, 'leads.export');
      if (g) return g;
      const r = await req.payload.find({ collection: 'leads' as any, overrideAccess: true, depth: 0, limit: 5000, pagination: false, sort: '-createdAt', req } as any);
      const head = ['ref', 'createdAt', 'status', 'name', 'phone', 'package', 'note', 'plan', 'source', 'locale', 'consentAt', 'privacyVersion', 'assignee', 'lastActivityAt'];
      const rows = (r.docs as any[]).map((d) => [d.ref, d.createdAt, d.status, d.name, d.phone, d.package, d.message, d.plan, d.source, d.locale, d.consent?.at, d.consent?.privacyVersion, typeof d.assignee === 'object' ? d.assignee?.id : d.assignee, d.lastActivityAt]);
      await auditRow(req, 'lead.export', 'lead', 'all', undefined, { rows: rows.length });
      const csv = '﻿' + [head, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
      return new Response(csv, { status: 200, headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="otonom-leads-${cairoDay()}.csv"`, ...noStore } });
    },
  },
  // ---------------- Staff invitations (OWNER): one-time link by e-mail, or shown once ----------------
  {
    path: '/staff/invite',
    method: 'post',
    handler: async (req) => {
      const g = guard(req, 'staff.invite');
      if (g) return g;
      const b = await body(req);
      const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
      const role = typeof b.role === 'string' ? b.role : '';
      if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email)) return jsonRes(422, { code: 'VALIDATION_FAILED', fieldErrors: { email: 'INVALID' } });
      if (!['ADMIN', 'ENGINEER', 'STORE', 'EDITOR', 'SALES'].includes(role)) return jsonRes(422, { code: 'VALIDATION_FAILED', fieldErrors: { role: 'INVALID' } });
      const taken = await req.payload.find({ collection: 'users', where: { email: { equals: email } }, overrideAccess: true, depth: 0, limit: 1, req });
      if (taken.docs[0]) return jsonRes(409, { code: 'USER_EXISTS' });
      // a random password nobody ever sees: the account is unusable until the invited person sets their own password
      const unusable = randomBytes(48).toString('base64url') + 'Aa1!';
      const user: any = await req.payload.create({ collection: 'users', data: { email, password: unusable, role } as any, overrideAccess: true, req, context: { system: true } });
      const token = randomBytes(32).toString('base64url');
      const delivery = notificationsConfigured() && b.delivery !== 'shown_once' ? 'EMAIL' : 'SHOWN_ONCE';
      const id = randomUUID();
      await domainDb().query(`INSERT INTO domain.staff_invites(id, user_id, token_hash, created_by, expires_at, delivery) VALUES ($1,$2,$3,$4, now() + interval '72 hours', $5)`, [id, String(user.id), tokenHash(token), String(req.user!.id), delivery]);
      await auditRow(req, 'staff.invited', 'user', user.id, undefined, { role, delivery });
      const link = `${adminOrigin()}/staff/invite#${token}`;
      if (delivery === 'EMAIL') {
        const sent = await sendMail({ to: email, idempotencyKey: `otonom-invite-${id}`, ...inviteEmail(link) }, email);
        if (sent.sent) return jsonRes(201, { delivery: 'EMAIL' });
        // the e-mail could not be sent: the OWNER gets the link once instead
        await domainDb().query(`UPDATE domain.staff_invites SET delivery='SHOWN_ONCE' WHERE id=$1`, [id]);
      }
      return jsonRes(201, { delivery: 'SHOWN_ONCE', link });
    },
  },
  {
    path: '/staff/invite/accept',
    method: 'post',
    handler: async (req) => {
      const csrf = mutationOriginGuard(req);
      if (csrf) return csrf;
      const rl = await rateLimit(`invite-accept:${clientIp(req.headers)}`, 10, 15 * 60_000);
      if (!rl.allowed) return jsonRes(429, { code: 'RATE_LIMITED', retryAfterSec: rl.retryAfterSec });
      const b = await body(req);
      const token = typeof b.token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(b.token) ? b.token : null;
      if (!token) return jsonRes(400, { code: 'INVITE_INVALID' });
      const db = domainDb();
      const found = await db.query(`SELECT id, user_id FROM domain.staff_invites WHERE token_hash=$1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now()`, [tokenHash(token)]);
      const invite = found.rows[0];
      if (!invite) return jsonRes(400, { code: 'INVITE_INVALID' });
      const user: any = await req.payload.findByID({ collection: 'users', id: invite.user_id, overrideAccess: true, depth: 0, req }).catch(() => null);
      if (!user) return jsonRes(400, { code: 'INVITE_INVALID' });
      const policy = passwordPolicyError(b.password, user.email);
      if (policy) return jsonRes(422, { code: 'VALIDATION_FAILED', fieldErrors: { password: policy } });
      // single use: claim the invite before changing anything
      const claimed = await db.query(`UPDATE domain.staff_invites SET used_at=now() WHERE id=$1 AND used_at IS NULL RETURNING id`, [invite.id]);
      if (!claimed.rowCount) return jsonRes(400, { code: 'INVITE_INVALID' });
      await req.payload.update({ collection: 'users', id: user.id, data: { password: b.password } as any, overrideAccess: true, req, context: { system: true } });
      await auditRow(req, 'staff.invite_accepted', 'user', user.id, undefined, { mfaRequiredNext: true });
      return jsonRes(200, { ok: true, email: user.email });
    },
  },
];

/** Daily job: digest of leads NEW for > 24h; on Sunday (Cairo) the weekly summary; lead retention. Each runs once. */
export async function runDailyJobs(req: PayloadRequest, now = new Date()) {
  const db = domainDb();
  const day = cairoDay(now);
  const once = async (job: string, key: string, fn: () => Promise<unknown>) => {
    const claimed = await db.query(`INSERT INTO domain.job_runs(job, run_key) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING job`, [job, key]);
    if (!claimed.rowCount) return { skipped: 'ALREADY_RAN' };
    const result = await fn();
    await db.query(`UPDATE domain.job_runs SET result=$3 WHERE job=$1 AND run_key=$2`, [job, key, JSON.stringify(result)]).catch(() => undefined);
    return result;
  };
  const to = leadsNotifyTo();
  const out: Record<string, unknown> = { day };

  out.digest = await once('daily_digest', day, async () => {
    const since = new Date(now.getTime() - 24 * 3600_000).toISOString();
    const r = await req.payload.find({ collection: 'leads' as any, where: { and: [{ status: { equals: 'NEW' } }, { createdAt: { less_than: since } }] }, overrideAccess: true, depth: 0, limit: 200, pagination: false, sort: 'createdAt', req } as any);
    const waiting = (r.docs as any[]).map((d) => ({ ref: d.ref, hours: Math.floor((now.getTime() - new Date(d.createdAt).getTime()) / 3600_000) }));
    if (!waiting.length) return { waiting: 0, sent: false };
    if (!to) return { waiting: waiting.length, sent: false, reason: 'NO_RECIPIENT' };
    const m = await sendMail({ to, idempotencyKey: `otonom-digest-${day}`, ...digestEmail(waiting, adminOrigin()) }, to);
    return { waiting: waiting.length, sent: m.sent, ...(m.sent ? {} : { reason: m.reason }) };
  });

  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', weekday: 'short' }).format(now);
  if (weekday === 'Sun') {
    out.weekly = await once('weekly_summary', day, async () => {
      const since = new Date(now.getTime() - 7 * 86400_000).toISOString();
      const r = await req.payload.find({ collection: 'leads' as any, where: { createdAt: { greater_than: since } }, overrideAccess: true, depth: 0, limit: 5000, pagination: false, req } as any);
      const leadsByStatus = Object.fromEntries(LEAD_STATUSES.map((s) => [s.ar, (r.docs as any[]).filter((d) => d.status === s.value).length]));
      const metrics = (await metricsSummary(db, day)).totals.days7 as Record<string, number>;
      if (!to) return { sent: false, reason: 'NO_RECIPIENT' };
      const m = await sendMail({ to, idempotencyKey: `otonom-weekly-${day}`, ...weeklyEmail({ leadsByStatus, newLeads: r.docs.length, metrics }, adminOrigin()) }, to);
      return { sent: m.sent, ...(m.sent ? {} : { reason: m.reason }) };
    });
  }

  out.retention = await once('lead_retention', day, async () => {
    const intake: any = await req.payload.findGlobal({ slug: 'intake-settings' as any, overrideAccess: true, depth: 0 }).catch(() => null);
    const cutoff = retentionCutoff(now, intake?.retentionMonths ?? 12).toISOString();
    const old = await req.payload.find({ collection: 'leads' as any, where: { lastActivityAt: { less_than: cutoff } }, overrideAccess: true, depth: 0, limit: 500, pagination: false, req } as any);
    for (const d of old.docs as any[]) await req.payload.delete({ collection: 'leads' as any, id: d.id, overrideAccess: true, req, context: { retention: true } });
    return { deleted: old.docs.length, cutoff };
  });
  return out;
}
