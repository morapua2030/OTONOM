import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Endpoint, PayloadRequest } from 'payload';
import { generateSecret, generateURI, verify as totpVerify } from 'otplib';
import {
  adjustContract,
  adjustStock,
  assignTicket,
  acceptQuote,
  recordCallback,
  recordDiagnosis,
  recordStructuredDiagnosis,
  recordRmaAction,
  recordRmaInspection,
  requestOwnershipTransfer,
  acceptOwnershipTransfer,
  claimDevice,
  customerRef,
  decideOwnership,
  listMyDevices,
  listMyTickets,
  getMyTicketTimeline,
  openRma,
  openTicket,
  recordCommissioning,
  rmaTransition,
  updateTicket,
  activateCoverage,
  allocateSerials,
  cancelOrder,
  completeOrder,
  issueQuote,
  orderStatusForCustomer,
  priceCart,
  reviewSyntheticCheckout,
  recordPayment,
  recordStockMovement,
  rejectPayment,
  requestCustomQuote,
  setShipping,
  shipOrder,
  approvePrice,
  computeKpis,
  listContracts,
  confirmOrder,
  decideWarrantyClaim,
  proposePrice,
  registerSerial,
  submitWarrantyClaim,
  submitWebsiteOrder,
  DomainError,
  findContractByOpportunity,
  IdempotencyKeyReuseError,
  overrideAttribution,
  signContract,
  verifyPayment,
  type Permission,
  passwordPolicyError,
  createProductDraft,
  transitionProductDraft,
  STAFF_ROLES,
} from '@otonom/domain';
import { body, guard, jsonRes, mfaOk, mutationOriginGuard } from '../lib/access.ts';
import { commercialOperationsEnabled, domainDb, internalCommerceLabEnabled, publicRfqEnabled } from '../lib/server.ts';
import { validateRfq } from '../lib/rfq-validate.ts';
import { clientIp, rateLimit } from '../lib/ratelimit.ts';
import { chunksOf, collectPages } from '../lib/pagination.ts';
import {
  EMAIL_OTP_FACTOR_TTL_SECONDS,
  EMAIL_OTP_MAX_ATTEMPTS,
  EMAIL_OTP_RESEND_SECONDS,
  EMAIL_OTP_TTL_SECONDS,
  emailOtpCodeDigest,
  emailOtpDigestMatches,
  emailOtpIpDigest,
  emailOtpRequiredForUser,
  emailOtpSessionDigest,
  generateEmailOtp,
  sendOwnerEmailOtp,
} from '../lib/email-otp.ts';
import { maskEmail } from '../lib/security-display.ts';

const cid = (req: PayloadRequest) => req.headers.get('x-correlation-id')?.slice(0, 80) || randomUUID();
const param = (req: PayloadRequest, k: string) => String((req.routeParams as any)?.[k] ?? '');

function mapError(e: unknown): Response {
  if (e instanceof IdempotencyKeyReuseError) return jsonRes(409, { code: e.code });
  if (e instanceof DomainError) {
    const status = e.code === 'NOT_FOUND' ? 404 : ['STALE_REVISION', 'IDEMPOTENCY_KEY_REUSED', 'TRANSFER_ALREADY_PENDING'].includes(e.code) ? 409 : 422;
    return jsonRes(status, { code: e.code });
  }
  console.error(e);
  return jsonRes(500, { code: 'INTERNAL_ERROR' });
}

function domainOp(p: Permission, fn: (req: PayloadRequest, b: Record<string, unknown>, ctx: { actor: { id: string; role: string }; correlationId: string }) => Promise<unknown>) {
  return async (req: PayloadRequest) => {
    const g = guard(req, p);
    if (g) return g;
    try {
      const b = await body(req);
      return jsonRes(200, (await fn(req, b, { actor: { id: String(req.user!.id), role: (req.user as any).role }, correlationId: cid(req) })) ?? { ok: true });
    } catch (e) {
      return mapError(e);
    }
  };
}

function localCommerceLabOp(p: Permission, fn: (req: PayloadRequest, b: Record<string, unknown>) => Promise<unknown>) {
  const guarded = domainOp(p, async (req, body) => fn(req, body));
  return async (req: PayloadRequest) => {
    if (!internalCommerceLabEnabled()) return jsonRes(404, { code: 'NOT_AVAILABLE' });
    return guarded(req);
  };
}

/** Public W1 handler: 404 unless the site is COMMERCIAL (G-1), domain errors mapped to stable codes. */
function gatedPublic(fn: (req: PayloadRequest, b: Record<string, unknown>) => Promise<Response>) {
  return async (req: PayloadRequest) => {
    if ((await stage(req)) !== 'COMMERCIAL') return jsonRes(404, { code: 'NOT_AVAILABLE_IN_PREVIEW' });
    try {
      return await fn(req, req.method === 'GET' ? {} : await body(req));
    } catch (e) {
      return mapError(e);
    }
  };
}

const median = (a: number[]) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pctOf = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : null);

async function systemFindAll(req: PayloadRequest, query: Record<string, unknown>): Promise<any[]> {
  return collectPages((page, limit) => req.payload.find({ ...query, overrideAccess: true, depth: 0, req, page, limit } as any) as any);
}

async function systemFindAllVersions(req: PayloadRequest, query: Record<string, unknown>): Promise<any[]> {
  return collectPages((page, limit) => req.payload.findVersions({ ...query, overrideAccess: true, depth: 0, req, page, limit } as any) as any);
}

async function systemFindAllByChunks(req: PayloadRequest, collection: string, field: string, values: readonly unknown[]): Promise<any[]> {
  const docs: any[] = [];
  for (const chunk of chunksOf(values)) docs.push(...await systemFindAll(req, { collection, where: { [field]: { in: chunk } } }));
  return docs;
}

async function reconciliationContracts(db: ReturnType<typeof domainDb>): Promise<any[]> {
  const contracts: any[] = [];
  let after = '';
  for (;;) {
    const page = (await db.query(
      `SELECT ref, opportunity_ref FROM domain.contracts WHERE ref > $1 ORDER BY ref LIMIT 500`,
      [after],
    )).rows;
    contracts.push(...page);
    if (page.length < 500) return contracts;
    after = page.at(-1).ref;
  }
}

/**
 * Funnel KPIs (planning doc 07): KPI-010 qualification rate, KPI-011 proposal-to-signed, KPI-013 average/median signed value,
 * KPI-014 median sales cycle. KPI-009 (margin) and KPI-012 (capacity) need cost/capacity data that does not exist (BLOCKED).
 */
async function funnelKpis(req: PayloadRequest, from: string, to: string) {
  const inP = { and: [{ createdAt: { greater_than_equal: from } }, { createdAt: { less_than: to } }] };
  const rfqs = await systemFindAll(req, { collection: 'rfqs', where: inP });
  // valid = not cancelled and not flagged as a possible duplicate (spam never reaches the table: honeypot drops it)
  const valid = rfqs.filter((r) => r.status !== 'CANCELLED' && !r.possibleDuplicateOf);
  const qualified = valid.filter((r) => r.status === 'QUALIFIED');
  // KPI-011 cohort: opportunities qualified in P that EVER reached PROPOSAL_SENT (from the revision history)
  const cohort = await systemFindAll(req, { collection: 'opportunities', where: { and: [{ qualifiedAt: { greater_than_equal: from } }, { qualifiedAt: { less_than: to } }] } });
  const sentVersionDocs: any[] = [];
  for (const ids of chunksOf(cohort.map((o) => o.id))) {
    sentVersionDocs.push(...await systemFindAllVersions(req, { collection: 'opportunities', where: { and: [{ parent: { in: ids } }, { 'version.stage': { equals: 'PROPOSAL_SENT' } }] } }));
  }
  const sent = new Set(sentVersionDocs.map((v) => (typeof v.parent === 'object' ? v.parent.id : v.parent)));
  const won = cohort.filter((o) => sent.has(o.id) && ['WON_SIGNED', 'DELIVERY_HANDOFF'].includes(o.stage));
  // KPI-013 / KPI-014 from authoritative contracts signed in P (EGP equivalent)
  const ks = (
    await domainDb().query(
      `SELECT opportunity_ref, signed_at, round(signed_value_minor * CASE WHEN currency='EGP' THEN 1 ELSE fx_rate_to_egp END)::bigint AS v
         FROM domain.contracts WHERE signed_at >= $1 AND signed_at < $2`,
      [from, to],
    )
  ).rows;
  const values = ks.map((k) => Number(k.v));
  const refs = ks.map((k) => k.opportunity_ref);
  const opps = await systemFindAllByChunks(req, 'opportunities', 'ref', refs);
  const qualifiedAt = new Map(opps.map((o) => [o.ref, o.qualifiedAt]));
  const cycles = ks.filter((k) => qualifiedAt.get(k.opportunity_ref)).map((k) => (new Date(k.signed_at).getTime() - new Date(qualifiedAt.get(k.opportunity_ref)).getTime()) / 86400_000);
  return {
    'KPI-010_rfqQualificationRatePct': pctOf(qualified.length, valid.length),
    'KPI-011_proposalToSignedPct': pctOf(won.length, sent.size),
    'KPI-013_averageSignedValueMinor': values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : null,
    'KPI-013_medianSignedValueMinor': median(values),
    'KPI-014_medianSalesCycleDays': cycles.length ? Math.round(median(cycles)! * 10) / 10 : null,
    counts: { rfqs: rfqs.length, validRfqs: valid.length, qualifiedRfqs: qualified.length, opportunitiesQualifiedInPeriod: cohort.length, proposalsSent: sent.size, wonFromSent: won.length, contracts: ks.length, contractsWithCycle: cycles.length },
    blocked: { 'KPI-009_grossMarginPct': 'BLOCKED: no cost estimates', 'KPI-012_deliveryCapacityRisk': 'BLOCKED: capacity data OPEN' },
  };
}

/** Customer portal handler: gated + signed-in CUSTOMER + same-origin for writes; identity = customerRef(session user). */
function customerOp(fn: (req: PayloadRequest, b: Record<string, unknown>, ctx: { actor: { id: string; role: string }; correlationId: string }) => Promise<Response>) {
  return gatedPublic(async (req, b) => {
    const u = req.user as any;
    if (!u) return jsonRes(401, { code: 'UNAUTHENTICATED' });
    if (u.role !== 'CUSTOMER') return jsonRes(403, { code: 'CUSTOMERS_ONLY' });
    const origin = req.headers.get('origin');
    if (req.method !== 'GET' && origin && new URL(origin).host !== req.headers.get('host')) return jsonRes(403, { code: 'CSRF_ORIGIN_MISMATCH' });
    return fn(req, b, { actor: { id: customerRef(u.id), role: 'CUSTOMER' }, correlationId: cid(req) });
  });
}

async function stage(req: PayloadRequest): Promise<string> {
  if (!commercialOperationsEnabled()) return 'PREVIEW';
  const s: any = await req.payload.findGlobal({ slug: 'settings', overrideAccess: true, req });
  return s?.stage ?? 'PREVIEW';
}
/** Append-only audit row for workspace (CMS-side) decisions, in the same domain audit trail as transactional actions. */
async function auditCms(req: PayloadRequest, action: string, entityType: string, entityId: string | number, after: unknown) {
  await domainDb().query(
    `INSERT INTO domain.audit_events(actor_type, actor_id, action, entity_type, entity_id, after, correlation_id) VALUES ('user',$1,$2,$3,$4,$5,$6)`,
    [String(req.user?.id ?? 'system'), action, entityType, String(entityId), JSON.stringify(after), cid(req)],
  );
}

const normOrg = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b(company|co|ltd|llc|inc|group|for|and)\b|شركة|مجموعة|ش\.م\.م|للتطوير|العقاري/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** Candidate organisations, contacts and existing opportunities for an RFQ. Suggestions only — never auto-merged. */
async function matchesFor(req: PayloadRequest, rfq: any) {
  const sub = rfq.submitted ?? {};
  const organisations: Array<{ id: number; legalName: string }> = [];
  const name = normOrg(String(sub.organisationName ?? ''));
  if (name) {
    const words = name.split(' ').filter((w) => w.length > 2);
    const cand = await req.payload.find({ collection: 'organisations', overrideAccess: true, depth: 0, limit: 50, req, where: { or: words.map((w) => ({ legalName: { like: w } })).concat(words.map((w) => ({ tradeName: { like: w } })) as any) } as any });
    for (const o of cand.docs as any[]) {
      const n = normOrg(`${o.legalName ?? ''}`);
      const t = normOrg(`${o.tradeName ?? ''}`);
      if (n === name || t === name || (name.length > 4 && (n.includes(name) || name.includes(n) || (t && (t.includes(name) || name.includes(t))))))
        organisations.push({ id: o.id, legalName: o.legalName });
    }
  }
  const or: any[] = [];
  if (sub.email) or.push({ email: { equals: sub.email } });
  if (sub.phone) or.push({ phone: { equals: sub.phone } });
  const contacts = or.length ? ((await req.payload.find({ collection: 'contacts', overrideAccess: true, depth: 0, limit: 10, req, where: { or } })).docs as any[]).map((c) => ({ id: c.id, fullName: c.fullName })) : [];
  const ror: any[] = [];
  if (sub.email) ror.push({ 'submitted.email': { equals: sub.email } });
  if (sub.phone) ror.push({ 'submitted.phone': { equals: sub.phone } });
  const related = ror.length
    ? ((await req.payload.find({ collection: 'rfqs', overrideAccess: true, depth: 0, limit: 50, req, where: { and: [{ or: ror }, { id: { not_equals: rfq.id } }, { opportunity: { exists: true } }] } })).docs as any[])
    : [];
  const oppIds = [...new Set(related.map((r) => r.opportunity).filter(Boolean))];
  const opps = oppIds.length ? ((await req.payload.find({ collection: 'opportunities', overrideAccess: true, depth: 0, limit: 50, req, where: { id: { in: oppIds } } })).docs as any[]) : [];
  return {
    organisations,
    contacts,
    // only OPEN opportunities are duplicates: a new RFQ after a signed/lost deal is a new project
    duplicateOpportunities: opps.filter((o) => !['LOST', 'WON_SIGNED', 'DELIVERY_HANDOFF'].includes(o.stage)).map((o) => ({ id: o.id, ref: o.ref, stage: o.stage })),
    possibleDuplicateOfRfq: rfq.possibleDuplicateOf ?? null,
  };
}

const loadUserSecrets =(req: PayloadRequest, id: string | number): Promise<any> =>
  req.payload.findByID({ collection: 'users', id, overrideAccess: true, showHiddenFields: true, depth: 0, req });

type StaffFactor = 'EMAIL_OTP' | 'TOTP' | 'RECOVERY';

async function staffFactors(req: PayloadRequest, user: any): Promise<Set<StaffFactor>> {
  const sessionDigest = emailOtpSessionDigest(String(user._sid ?? ''));
  const result = await domainDb().query(
    `SELECT factor FROM domain.staff_auth_factors
      WHERE user_id=$1 AND session_digest=$2 AND expires_at > now()`,
    [String(user.id), sessionDigest],
  );
  return new Set(result.rows.map((row) => row.factor as StaffFactor));
}

async function recordStaffFactor(req: PayloadRequest, user: any, factor: StaffFactor): Promise<void> {
  const sessionDigest = emailOtpSessionDigest(String(user._sid ?? ''));
  await domainDb().query(
    `INSERT INTO domain.staff_auth_factors(user_id, session_digest, factor, expires_at)
     VALUES ($1,$2,$3,now() + ($4 * interval '1 second'))
     ON CONFLICT (user_id, session_digest, factor)
     DO UPDATE SET verified_at=now(), expires_at=excluded.expires_at`,
    [String(user.id), sessionDigest, factor, EMAIL_OTP_FACTOR_TTL_SECONDS],
  );
}

async function authorizeStaffSession(req: PayloadRequest, user: any): Promise<boolean> {
  const factors = await staffFactors(req, user);
  const strongSecondFactor = factors.has('TOTP') || factors.has('RECOVERY');
  if (!strongSecondFactor || (emailOtpRequiredForUser(user) && !factors.has('EMAIL_OTP'))) return false;
  const full = await loadUserSecrets(req, user.id);
  const sids = Array.isArray(full?.mfaVerifiedSids) ? full.mfaVerifiedSids : [];
  if (!sids.includes(user._sid)) {
    await req.payload.update({
      collection: 'users',
      id: user.id,
      data: { mfaVerifiedSids: [...sids, user._sid].slice(-20) } as any,
      overrideAccess: true,
      req,
    });
  }
  return true;
}

async function requireEmailFactor(req: PayloadRequest, user: any): Promise<Response | null> {
  if (!emailOtpRequiredForUser(user)) return null;
  const factors = await staffFactors(req, user);
  return factors.has('EMAIL_OTP') ? null : jsonRes(401, { code: 'EMAIL_OTP_REQUIRED' });
}

async function completeStrongFactor(req: PayloadRequest, user: any, factor: Exclude<StaffFactor, 'EMAIL_OTP'>, existingSids: unknown): Promise<boolean> {
  if (!emailOtpRequiredForUser(user)) {
    const sids = Array.isArray(existingSids) ? existingSids : [];
    await req.payload.update({ collection: 'users', id: user.id, data: { mfaVerifiedSids: [...sids, user._sid].slice(-20) } as any, overrideAccess: true, req });
    return true;
  }
  await recordStaffFactor(req, user, factor);
  return authorizeStaffSession(req, user);
}

const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomRef = (prefix: string) => `${prefix}-${new Date().getUTCFullYear()}-${Array.from(randomBytes(6), (b) => B32[b % 32]).join('')}`;

export const endpoints: Endpoint[] = [
  // ---------------- MFA bound to the Payload session id (spike V-5) ----------------
  {
    path: '/mfa/status',
    method: 'get',
    handler: async (req) => {
      const u = req.user as any;
      if (!u || !u._sid) return jsonRes(401, { code: 'UNAUTHENTICATED' });
      if (!(STAFF_ROLES as readonly string[]).includes(String(u.role))) return jsonRes(403, { code: 'FORBIDDEN' });
      const full = await loadUserSecrets(req, u.id);
      const emailOtpRequired = emailOtpRequiredForUser(u);
      const factors = emailOtpRequired ? await staffFactors(req, u) : new Set<StaffFactor>();
      return Response.json(
        {
          enrolled: full?.mfaEnabled === true && !!full?.totpSecret,
          emailOtpRequired,
          emailOtpVerified: factors.has('EMAIL_OTP'),
          mfaVerified: mfaOk(u),
        },
        { headers: { 'cache-control': 'no-store' } },
      );
    },
  },
  {
    path: '/mfa/email/request',
    method: 'post',
    handler: async (req) => {
      const csrf = mutationOriginGuard(req);
      if (csrf) return csrf;
      const u = req.user as any;
      if (!u || !u._sid) return jsonRes(401, { code: 'UNAUTHENTICATED' });
      if (!emailOtpRequiredForUser(u)) return jsonRes(404, { code: 'EMAIL_OTP_NOT_AVAILABLE' });

      const requestBody = await body(req);
      const locale = requestBody.locale === 'ar' ? 'ar' : 'en';
      const sessionDigest = emailOtpSessionDigest(String(u._sid));
      const requestIpDigest = emailOtpIpDigest(clientIp(req.headers));
      const [accountLimit, ipLimit] = await Promise.all([
        rateLimit(`email-otp-account:${u.id}`, 5, 15 * 60_000),
        rateLimit(`email-otp-ip:${requestIpDigest}`, 10, 15 * 60_000),
      ]);
      if (!accountLimit.allowed || !ipLimit.allowed) {
        const retryAfterSec = Math.max(accountLimit.retryAfterSec, ipLimit.retryAfterSec);
        return Response.json({ code: 'RATE_LIMITED', retryAfterSec }, { status: 429, headers: { 'cache-control': 'no-store', 'retry-after': String(retryAfterSec) } });
      }

      const recent = await domainDb().query(
        `SELECT greatest(1, ceil(extract(epoch from (created_at + ($3 * interval '1 second') - now()))))::int AS retry_after
           FROM domain.staff_email_otp_challenges
          WHERE user_id=$1 AND session_digest=$2 AND status IN ('PENDING','SENT')
            AND created_at > now() - ($3 * interval '1 second')
          ORDER BY created_at DESC LIMIT 1`,
        [String(u.id), sessionDigest, EMAIL_OTP_RESEND_SECONDS],
      );
      if (recent.rows[0]) {
        const retryAfterSec = Number(recent.rows[0].retry_after);
        return Response.json({ code: 'RESEND_COOLDOWN', retryAfterSec }, { status: 429, headers: { 'cache-control': 'no-store', 'retry-after': String(retryAfterSec) } });
      }

      const challengeId = randomUUID();
      const code = generateEmailOtp();
      const codeDigest = emailOtpCodeDigest({ challengeId, userId: String(u.id), sessionDigest, code });
      await domainDb().query(
        `INSERT INTO domain.staff_email_otp_challenges
          (id,user_id,session_digest,code_digest,request_ip_digest,status,max_attempts,expires_at)
         VALUES ($1,$2,$3,$4,$5,'PENDING',$6,now() + ($7 * interval '1 second'))`,
        [challengeId, String(u.id), sessionDigest, codeDigest, requestIpDigest, EMAIL_OTP_MAX_ATTEMPTS, EMAIL_OTP_TTL_SECONDS],
      );

      let providerMessageId: string;
      try {
        ({ providerMessageId } = await sendOwnerEmailOtp({ to: String(u.email), code, challengeId, locale }));
      } catch {
        await domainDb().query(`UPDATE domain.staff_email_otp_challenges SET status='FAILED' WHERE id=$1 AND status='PENDING'`, [challengeId]);
        await domainDb().query(
          `INSERT INTO domain.audit_events(actor_type,actor_id,action,entity_type,entity_id,correlation_id)
           VALUES ('user',$1,'mfa.email_otp_delivery_failed','user',$1,$2)`,
          [String(u.id), cid(req)],
        );
        return jsonRes(503, { code: 'EMAIL_OTP_UNAVAILABLE' });
      }

      const client = await domainDb().connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE domain.staff_email_otp_challenges SET status='SUPERSEDED'
            WHERE user_id=$1 AND session_digest=$2 AND id<>$3 AND status IN ('PENDING','SENT')`,
          [String(u.id), sessionDigest, challengeId],
        );
        await client.query(
          `UPDATE domain.staff_email_otp_challenges SET status='SENT', sent_at=now(), provider_message_id=$2
            WHERE id=$1 AND status='PENDING'`,
          [challengeId, providerMessageId],
        );
        await client.query('COMMIT');
      } catch {
        await client.query('ROLLBACK').catch(() => undefined);
        return jsonRes(503, { code: 'EMAIL_OTP_UNAVAILABLE' });
      } finally {
        client.release();
      }

      await domainDb().query(
        `INSERT INTO domain.audit_events(actor_type,actor_id,action,entity_type,entity_id,correlation_id)
         VALUES ('user',$1,'mfa.email_otp_sent','user',$1,$2)`,
        [String(u.id), cid(req)],
      );
      return Response.json(
        { sent: true, expiresInSec: EMAIL_OTP_TTL_SECONDS, resendAfterSec: EMAIL_OTP_RESEND_SECONDS, destination: maskEmail(String(u.email)) },
        { status: 202, headers: { 'cache-control': 'no-store' } },
      );
    },
  },
  {
    path: '/mfa/email/verify',
    method: 'post',
    handler: async (req) => {
      const csrf = mutationOriginGuard(req);
      if (csrf) return csrf;
      const u = req.user as any;
      if (!u || !u._sid) return jsonRes(401, { code: 'UNAUTHENTICATED' });
      if (!emailOtpRequiredForUser(u)) return jsonRes(404, { code: 'EMAIL_OTP_NOT_AVAILABLE' });
      const code = String((await body(req)).code ?? '').trim();
      const sessionDigest = emailOtpSessionDigest(String(u._sid));
      const requestIpDigest = emailOtpIpDigest(clientIp(req.headers));
      const [accountLimit, ipLimit] = await Promise.all([
        rateLimit(`email-otp-verify-account:${u.id}`, 15, 15 * 60_000),
        rateLimit(`email-otp-verify-ip:${requestIpDigest}`, 30, 15 * 60_000),
      ]);
      if (!accountLimit.allowed || !ipLimit.allowed) return jsonRes(429, { code: 'RATE_LIMITED' });

      const client = await domainDb().connect();
      let failure: 'EMAIL_OTP_INVALID' | 'EMAIL_OTP_EXPIRED' | 'EMAIL_OTP_LOCKED' | null = null;
      try {
        await client.query('BEGIN');
        const challenge = (
          await client.query(
            `SELECT id::text, code_digest, attempts, max_attempts, expires_at
               FROM domain.staff_email_otp_challenges
              WHERE user_id=$1 AND session_digest=$2 AND status='SENT' AND used_at IS NULL
              ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
            [String(u.id), sessionDigest],
          )
        ).rows[0];
        if (!challenge) {
          failure = 'EMAIL_OTP_INVALID';
        } else if (new Date(challenge.expires_at).getTime() <= Date.now()) {
          await client.query(`UPDATE domain.staff_email_otp_challenges SET status='EXPIRED' WHERE id=$1`, [challenge.id]);
          failure = 'EMAIL_OTP_EXPIRED';
        } else if (Number(challenge.attempts) >= Number(challenge.max_attempts)) {
          await client.query(`UPDATE domain.staff_email_otp_challenges SET status='LOCKED' WHERE id=$1`, [challenge.id]);
          failure = 'EMAIL_OTP_LOCKED';
        } else if (!emailOtpDigestMatches(String(challenge.code_digest), { challengeId: challenge.id, userId: String(u.id), sessionDigest, code })) {
          const attempts = Number(challenge.attempts) + 1;
          await client.query(
            `UPDATE domain.staff_email_otp_challenges SET attempts=$2, status=CASE WHEN $2 >= max_attempts THEN 'LOCKED' ELSE status END WHERE id=$1`,
            [challenge.id, attempts],
          );
          failure = attempts >= Number(challenge.max_attempts) ? 'EMAIL_OTP_LOCKED' : 'EMAIL_OTP_INVALID';
        } else {
          await client.query(
            `UPDATE domain.staff_email_otp_challenges SET status='VERIFIED', used_at=now() WHERE id=$1 AND status='SENT' AND used_at IS NULL`,
            [challenge.id],
          );
        }
        await client.query('COMMIT');
      } catch {
        await client.query('ROLLBACK').catch(() => undefined);
        return jsonRes(503, { code: 'EMAIL_OTP_UNAVAILABLE' });
      } finally {
        client.release();
      }

      if (failure) return jsonRes(401, { code: failure });
      await recordStaffFactor(req, u, 'EMAIL_OTP');
      const mfaVerified = await authorizeStaffSession(req, u);
      await domainDb().query(
        `INSERT INTO domain.audit_events(actor_type,actor_id,action,entity_type,entity_id,correlation_id)
         VALUES ('user',$1,'mfa.email_otp_verified','user',$1,$2)`,
        [String(u.id), cid(req)],
      );
      const full = await loadUserSecrets(req, u.id);
      return jsonRes(200, { emailOtpVerified: true, mfaVerified, next: mfaVerified ? 'done' : full?.mfaEnabled ? 'totp' : 'enroll' });
    },
  },
  {
    path: '/mfa/enroll',
    method: 'post',
    handler: async (req) => {
      const csrf = mutationOriginGuard(req);
      if (csrf) return csrf;
      const u = req.user as any;
      if (!u || !u._sid) return jsonRes(401, { code: 'UNAUTHENTICATED' });
      if (!(STAFF_ROLES as readonly string[]).includes(String(u.role))) return jsonRes(403, { code: 'FORBIDDEN' });
      const emailGate = await requireEmailFactor(req, u);
      if (emailGate) return emailGate;
      const rl = await rateLimit(`mfa-enroll:${u.id}`, 5, 10 * 60_000);
      if (!rl.allowed) return jsonRes(429, { code: 'RATE_LIMITED' });
      const full = await loadUserSecrets(req, u.id);
      if (full?.mfaEnabled || full?.totpSecret) return jsonRes(409, { code: 'MFA_ALREADY_CONFIGURED' });
      const secret = generateSecret();
      await req.payload.update({
        collection: 'users',
        id: u.id,
        data: { totpSecret: secret, mfaEnabled: false, mfaVerifiedSids: [], lastTotpStep: 0, recoveryCodes: [] } as any,
        overrideAccess: true,
        req,
      });
      await domainDb().query(
        `INSERT INTO domain.audit_events(actor_type, actor_id, action, entity_type, entity_id, correlation_id) VALUES ('user',$1,'mfa.enrollment_started','user',$1,$2)`,
        [String(u.id), cid(req)],
      );
      return Response.json(
        { secret, uri: generateURI({ issuer: 'OTONOM', label: String(u.email), secret }) },
        { headers: { 'cache-control': 'no-store' } },
      );
    },
  },
  {
    path: '/mfa/enroll/verify',
    method: 'post',
    handler: async (req) => {
      const csrf = mutationOriginGuard(req);
      if (csrf) return csrf;
      const u = req.user as any;
      if (!u || !u._sid) return jsonRes(401, { code: 'UNAUTHENTICATED' });
      if (!(STAFF_ROLES as readonly string[]).includes(String(u.role))) return jsonRes(403, { code: 'FORBIDDEN' });
      const emailGate = await requireEmailFactor(req, u);
      if (emailGate) return emailGate;
      const rl = await rateLimit(`mfa-enroll-verify:${u.id}`, 10, 10 * 60_000);
      if (!rl.allowed) return jsonRes(429, { code: 'RATE_LIMITED' });
      const full = await loadUserSecrets(req, u.id);
      if (full?.mfaEnabled) return jsonRes(409, { code: 'MFA_ALREADY_CONFIGURED' });
      if (!full?.totpSecret) return jsonRes(409, { code: 'MFA_ENROLLMENT_NOT_STARTED' });
      const res = await totpVerify({ secret: full.totpSecret, token: String((await body(req)).code ?? ''), epochTolerance: 30 }).catch(() => null);
      const step = res && res.valid && 'timeStep' in res ? Number(res.timeStep) : undefined;
      if (step === undefined || step <= Number(full.lastTotpStep ?? 0)) return jsonRes(401, { code: 'MFA_INVALID' });
      const recoveryCodes = Array.from({ length: 8 }, () => randomBytes(9).toString('base64url'));
      await req.payload.update({
        collection: 'users',
        id: u.id,
        data: {
          mfaEnabled: true,
          lastTotpStep: step,
          recoveryCodes: recoveryCodes.map((code) => createHash('sha256').update(code).digest('hex')),
        } as any,
        overrideAccess: true,
        req,
      });
      await domainDb().query(
        `INSERT INTO domain.audit_events(actor_type, actor_id, action, entity_type, entity_id, correlation_id) VALUES ('user',$1,'mfa.enrolled','user',$1,$2)`,
        [String(u.id), cid(req)],
      );
      const mfaVerified = await completeStrongFactor(req, u, 'TOTP', full.mfaVerifiedSids);
      return Response.json({ mfaVerified, recoveryCodes }, { headers: { 'cache-control': 'no-store' } });
    },
  },
  {
    path: '/mfa/verify',
    method: 'post',
    handler: async (req) => {
      const csrf = mutationOriginGuard(req);
      if (csrf) return csrf;
      const u = req.user as any;
      if (!u || !u._sid) return jsonRes(401, { code: 'UNAUTHENTICATED' });
      const emailGate = await requireEmailFactor(req, u);
      if (emailGate) return emailGate;
      const rl = await rateLimit(`mfa:${u.id}`, 10, 10 * 60_000);
      if (!rl.allowed) return jsonRes(429, { code: 'RATE_LIMITED' });
      const b = await body(req);
      const full = await loadUserSecrets(req, u.id);
      if (!full?.mfaEnabled || !full?.totpSecret) return jsonRes(401, { code: 'MFA_INVALID' });
      const res = await totpVerify({ secret: full.totpSecret, token: String(b.code ?? ''), epochTolerance: 30 }).catch(() => null);
      const step = res && res.valid && 'timeStep' in res ? Number(res.timeStep) : undefined;
      if (step === undefined || step <= Number(full.lastTotpStep ?? 0)) return jsonRes(401, { code: 'MFA_INVALID' });
      const sids = Array.isArray(full.mfaVerifiedSids) ? full.mfaVerifiedSids : [];
      await req.payload.update({ collection: 'users', id: u.id, data: { lastTotpStep: step } as any, overrideAccess: true, req });
      const mfaVerified = await completeStrongFactor(req, u, 'TOTP', sids);
      return jsonRes(200, { mfaVerified });
    },
  },
  {
    path: '/mfa/recovery',
    method: 'post',
    handler: async (req) => {
      const csrf = mutationOriginGuard(req);
      if (csrf) return csrf;
      const u = req.user as any;
      if (!u || !u._sid) return jsonRes(401, { code: 'UNAUTHENTICATED' });
      const emailGate = await requireEmailFactor(req, u);
      if (emailGate) return emailGate;
      const h = createHash('sha256').update(String((await body(req)).code ?? '').trim()).digest('hex');
      const full = await loadUserSecrets(req, u.id);
      const codes: string[] = Array.isArray(full.recoveryCodes) ? full.recoveryCodes : [];
      if (!codes.includes(h)) return jsonRes(401, { code: 'RECOVERY_CODE_INVALID' });
      const sids = Array.isArray(full.mfaVerifiedSids) ? full.mfaVerifiedSids : [];
      await req.payload.update({ collection: 'users', id: u.id, data: { recoveryCodes: codes.filter((c) => c !== h) } as any, overrideAccess: true, req });
      await domainDb().query(
        `INSERT INTO domain.audit_events(actor_type, actor_id, action, entity_type, entity_id, correlation_id) VALUES ('user',$1,'mfa.recovery_code_used','user',$1,$2)`,
        [String(u.id), cid(req)],
      );
      const mfaVerified = await completeStrongFactor(req, u, 'RECOVERY', sids);
      return jsonRes(200, { mfaVerified });
    },
  },
  // ---------------- Public intake: RFQ / consultation / partner inquiry (P-A, no files) ----------------
  {
    path: '/rfq',
    method: 'post',
    handler: async (req) => {
      if (!publicRfqEnabled()) return jsonRes(404, { code: 'PUBLIC_INTAKE_DISABLED' });
      const rl = await rateLimit(`rfq:${clientIp(req.headers)}`, 5, 10 * 60_000);
      if (!rl.allowed) return Response.json({ code: 'RATE_LIMITED', retryAfterSec: rl.retryAfterSec }, { status: 429, headers: { 'retry-after': String(rl.retryAfterSec) } });
      const b = await body(req);
      if (typeof b.website === 'string' && b.website.length > 0) return jsonRes(202, { ref: 'RFQ-ACCEPTED' }); // honeypot: silently drop bots
      const v = validateRfq(b as any);
      if (!v.ok) return jsonRes(422, { code: 'VALIDATION_FAILED', fieldErrors: v.errors });
      const i = v.value;
      // idempotent replay: same key returns the same reference, never a second RFQ
      const existing = await req.payload.find({ collection: 'rfqs', where: { idempotencyKey: { equals: i.idempotencyKey } }, overrideAccess: true, depth: 0, limit: 1, req });
      if (existing.docs[0]) return jsonRes(200, { ref: (existing.docs[0] as any).ref, replay: true });
      // duplicate suggestion (never auto-merge): same email or phone within 90 days
      const since = new Date(Date.now() - 90 * 86400_000).toISOString();
      const or: any[] = [];
      if (i.email) or.push({ 'submitted.email': { equals: i.email } });
      if (i.phone) or.push({ 'submitted.phone': { equals: i.phone } });
      const dup = await req.payload.find({ collection: 'rfqs', where: { and: [{ or }, { createdAt: { greater_than: since } }] }, overrideAccess: true, depth: 0, limit: 1, sort: '-createdAt', req });
      const ref = randomRef(i.kind === 'RFQ' ? 'RFQ' : i.kind === 'CONSULTATION' ? 'CON' : 'PRT');
      try {
        await req.payload.create({
          collection: 'rfqs',
          overrideAccess: true,
          req,
          context: { system: true },
          data: {
            ref,
            status: 'SUBMITTED',
            kind: i.kind,
            idempotencyKey: i.idempotencyKey,
            customerType: i.customerType,
            projectType: i.projectType,
            governorate: i.governorate,
            possibleDuplicateOf: dup.docs[0]?.id ?? null,
            submitted: {
              fullName: i.fullName,
              email: i.email,
              phone: i.phone,
              organisationName: i.organisationName,
              contactRole: i.contactRole,
              customerType: i.customerType,
              projectType: i.projectType,
              governorate: i.governorate,
              city: i.city,
              units: i.units,
              circuits: i.circuits,
              systems: i.systems,
              engagementModel: i.engagementModel,
              description: i.description,
              phase: i.phase,
              timeline: i.timeline,
              budgetBand: i.budgetBand,
              preferredChannel: i.preferredChannel,
              howHeard: i.howHeard,
              locale: i.locale,
              marketingConsent: i.consentMarketing,
              attribution: i.attribution,
            },
          } as any,
        });
      } catch (e: any) {
        // concurrent replay with the same key lost the unique race: return the winner's reference
        const again = await req.payload.find({ collection: 'rfqs', where: { idempotencyKey: { equals: i.idempotencyKey } }, overrideAccess: true, depth: 0, limit: 1, req });
        if (again.docs[0]) return jsonRes(200, { ref: (again.docs[0] as any).ref, replay: true });
        throw e;
      }
      // Acknowledgement email: NOT SENT (no email provider approved; local development only)
      return jsonRes(201, { ref });
    },
  },
  // ---------------- Projects workspace: sign contract from an opportunity ----------------
  {
    path: '/workspace/opportunities/:id/sign-contract',
    method: 'post',
    handler: domainOp('contract.sign', async (req, b, ctx) => {
      const opp: any = await req.payload.findByID({ collection: 'opportunities', id: param(req, 'id'), overrideAccess: true, depth: 0, req, disableErrors: true });
      if (!opp) throw new DomainError('NOT_FOUND');
      // recovery: the domain contract committed but the CMS stage update failed earlier -> re-sync, never sign twice
      const prior = await findContractByOpportunity(domainDb(), opp.ref);
      if (prior && opp.stage !== 'WON_SIGNED') {
        await req.payload.update({ collection: 'opportunities', id: opp.id, data: { stage: 'WON_SIGNED', contractRef: prior.ref } as any, overrideAccess: true, req, context: { contractSigned: true } });
        return { contractRef: prior.ref, contractId: prior.id, cohort: prior.cohort, attribution: prior.attribution, resynced: true };
      }
      if (!['PROPOSAL_SENT', 'NEGOTIATION'].includes(opp.stage)) throw new DomainError('OPPORTUNITY_NOT_READY_FOR_SIGNATURE');
      const contractRef = randomRef('CTR');
      const signed = await signContract(domainDb(), ctx, {
        ref: contractRef,
        opportunityRef: opp.ref,
        organisationRef: opp.organisation ? `org:${opp.organisation}` : `opp:${opp.ref}`,
        contractType: (String(b.contractType ?? 'PROJECT') as any),
        signedAt: String(b.signedAt ?? new Date().toISOString()),
        signedValueMinor: Number(b.signedValueMinor ?? 0),
        currency: b.currency ? String(b.currency) : undefined,
        fxRateToEgp: b.fxRateToEgp ? Number(b.fxRateToEgp) : undefined,
        fxDate: b.fxDate ? String(b.fxDate) : undefined,
        evidenceRef: String(b.evidenceRef ?? ''),
        attribution: opp.attributionProposal ?? 'UNKNOWN',
        attributionEvidence: opp.attributionEvidence ?? undefined,
      });
      // domain record is the source of truth; the CMS stage follows (no distributed transaction — see handoff limitation)
      await req.payload.update({ collection: 'opportunities', id: opp.id, data: { stage: 'WON_SIGNED', contractRef } as any, overrideAccess: true, req, context: { contractSigned: true } });
      return { contractRef, contractId: signed.id, cohort: signed.cohort, attribution: opp.attributionProposal ?? 'UNKNOWN' };
    }),
  },
  {
    path: '/contracts/:id/adjust',
    method: 'post',
    handler: domainOp('contract.adjust', (req, b, ctx) =>
      adjustContract(domainDb(), ctx, param(req, 'id'), b.kind === 'CANCELLATION' ? 'CANCELLATION' : 'AMENDMENT', Number(b.deltaMinor ?? 0), String(b.effectiveAt ?? new Date().toISOString()), String(b.reason ?? ''), String(b.evidenceRef ?? '')),
    ),
  },
  {
    path: '/contracts/:id/attribution',
    method: 'post',
    handler: domainOp('attribution.override', (req, b, ctx) => overrideAttribution(domainDb(), ctx, param(req, 'id'), String(b.to ?? '') as any, String(b.reason ?? ''), b.approverId ? String(b.approverId) : undefined)),
  },
  {
    path: '/workspace/opportunities/:id/handoff-summary',
    method: 'get',
    handler: async (req) => {
      const g = guard(req, 'crm.read');
      if (g) return g;
      const o: any = await req.payload.findByID({ collection: 'opportunities', id: param(req, 'id'), overrideAccess: true, depth: 1, req, disableErrors: true });
      if (!o) return jsonRes(404, { code: 'NOT_FOUND' });
      // copy-friendly text for manual ClickUp entry — deliberately contains NO file links or private document URLs
      const lines = [
        `Opportunity: ${o.ref}`,
        `Contract: ${o.contractRef ?? '—'}`,
        `Organisation: ${o.organisation?.legalName ?? '—'}`,
        `Engagement model: ${o.engagementModel ?? '—'}`,
        `Estimated value (EGP): ${o.estimatedValueEgp ?? '—'}`,
        `Owner engineer: ${o.ownerEngineer?.email ?? '—'}`,
        `Handoff owner: ${o.handoffOwner ?? '—'}`,
        `Capacity note: ${o.capacityCheckNote ?? '—'}`,
        `Documents: see Projects workspace (not linked here)`,
      ];
      return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
    },
  },
  // ---------------- Projects workspace: RFQ → opportunity (the only way to link a website RFQ) ----------------
  {
    path: '/workspace/rfqs/:id/matches',
    method: 'get',
    handler: async (req) => {
      const g = guard(req, 'crm.read');
      if (g) return g;
      const rfq: any = await req.payload.findByID({ collection: 'rfqs', id: param(req, 'id'), overrideAccess: true, depth: 0, req, disableErrors: true });
      if (!rfq) return jsonRes(404, { code: 'NOT_FOUND' });
      return jsonRes(200, await matchesFor(req, rfq));
    },
  },
  {
    path: '/workspace/rfqs/:id/convert',
    method: 'post',
    handler: async (req) => {
      const g = guard(req, 'crm.write');
      if (g) return g;
      const b = await body(req);
      const rfq: any = await req.payload.findByID({ collection: 'rfqs', id: param(req, 'id'), overrideAccess: true, depth: 0, req, disableErrors: true });
      if (!rfq) return jsonRes(404, { code: 'NOT_FOUND' });
      // idempotent: an RFQ is converted at most once
      if (rfq.opportunity) return jsonRes(200, { opportunityId: rfq.opportunity, replay: true });
      if (rfq.status !== 'QUALIFIED') return jsonRes(409, { code: 'RFQ_NOT_QUALIFIED', status: rfq.status });
      const sys = { overrideAccess: true, req, context: { system: true } } as const;
      // attach to an existing opportunity instead of creating a duplicate
      if (b.linkToOpportunityId) {
        const opp: any = await req.payload.findByID({ collection: 'opportunities', id: String(b.linkToOpportunityId), overrideAccess: true, depth: 0, req, disableErrors: true });
        if (!opp) return jsonRes(404, { code: 'OPPORTUNITY_NOT_FOUND' });
        await req.payload.update({ collection: 'rfqs', id: rfq.id, data: { opportunity: opp.id } as any, ...sys });
        await auditCms(req, 'rfq.link_opportunity', 'rfq', rfq.id, { opportunityId: opp.id });
        return jsonRes(200, { opportunityId: opp.id, linked: true });
      }
      const m = await matchesFor(req, rfq);
      if (m.duplicateOpportunities.length && b.confirmNotDuplicate !== true)
        return jsonRes(409, { code: 'POSSIBLE_DUPLICATE_OPPORTUNITY', candidates: m.duplicateOpportunities });
      if (b.confirmNotDuplicate === true && m.duplicateOpportunities.length && !String(b.duplicateReason ?? '').trim()) return jsonRes(422, { code: 'REASON_REQUIRED' });
      // organisation: explicit choice, explicit creation, or none when the RFQ named none (never auto-merged)
      let organisationId: number | null = null;
      if (b.organisationId) {
        const o = await req.payload.findByID({ collection: 'organisations', id: String(b.organisationId), overrideAccess: true, depth: 0, req, disableErrors: true });
        if (!o) return jsonRes(404, { code: 'ORGANISATION_NOT_FOUND' });
        organisationId = Number(o.id);
      } else if (rfq.submitted?.organisationName) {
        if (m.organisations.length && b.createOrganisation !== true) return jsonRes(409, { code: 'ORGANISATION_MATCH_REQUIRED', candidates: m.organisations });
        const o = await req.payload.create({ collection: 'organisations', data: { legalName: String(rfq.submitted.organisationName).trim(), governorate: rfq.governorate } as any, ...sys });
        organisationId = Number(o.id);
      }
      // contact: reuse an exact e-mail/phone match, otherwise create
      let contactId: number | null = m.contacts[0]?.id ?? null;
      if (!contactId) {
        const c = await req.payload.create({
          collection: 'contacts',
          data: { fullName: rfq.submitted?.fullName ?? '—', email: rfq.submitted?.email || undefined, phone: rfq.submitted?.phone || undefined, role: rfq.submitted?.contactRole || undefined, organisation: organisationId, preferredLanguage: rfq.submitted?.locale === 'en' ? 'en' : 'ar' } as any,
          ...sys,
        });
        contactId = Number(c.id);
      }
      const at = rfq.submitted?.attribution ?? {};
      const utm = at.utm ? Object.entries(at.utm).map(([k, v]) => `${k}=${v}`).join('&') : '';
      const engagement = ['SUPPLY_ONLY', 'SUPPLY_INSTALL_PROGRAM', 'DESIGN_BUILD'].includes(rfq.submitted?.engagementModel) ? rfq.submitted.engagementModel : undefined;
      const opp = await req.payload.create({
        collection: 'opportunities',
        data: {
          ref: randomRef('OPP'),
          rfq: rfq.id,
          organisation: organisationId,
          primaryContact: contactId,
          qualifiedAt: new Date().toISOString(),
          engagementModel: engagement,
          // a website intake RFQ is the first recorded touch → proposed WEBSITE_SOURCED; confirmed or overridden at signature
          attributionProposal: 'WEBSITE_SOURCED',
          attributionEvidence: `Website ${rfq.kind} ${rfq.ref} submitted ${rfq.createdAt}; landing ${at.landingPage ?? '—'}${utm ? `; utm ${utm}` : ''}${b.confirmNotDuplicate ? `; not a duplicate: ${String(b.duplicateReason)}` : ''}`,
        } as any,
        ...sys,
      });
      await req.payload.update({ collection: 'rfqs', id: rfq.id, data: { opportunity: opp.id, organisation: organisationId, contact: contactId } as any, ...sys });
      await auditCms(req, 'rfq.convert', 'rfq', rfq.id, { opportunityId: opp.id, organisationId, contactId, duplicateConfirmed: !!b.confirmNotDuplicate });
      return jsonRes(201, { opportunityId: opp.id, opportunityRef: (opp as any).ref, organisationId, contactId });
    },
  },
  // ---------------- KPI drill-down + sanitized export (kpi.read) ----------------
  {
    path: '/reports/contracts',
    method: 'get',
    handler: async (req) => {
      const g = guard(req, 'kpi.read');
      if (g) return g;
      const sp = req.searchParams;
      const from = sp.get('from') ?? `${new Date().getUTCFullYear()}-01-01T00:00:00Z`;
      const to = sp.get('to') ?? new Date(Date.now() + 86400_000).toISOString();
      let rows;
      try {
        rows = await listContracts(domainDb(), {
          from,
          to,
          cohort: (sp.get('cohort') || undefined) as any,
          attribution: (sp.get('attribution') || undefined) as any,
          organisationRef: sp.get('organisationRef') || undefined,
        });
      } catch (e: any) {
        return jsonRes(400, { code: String(e?.message ?? 'INVALID_FILTER') });
      }
      // CMS-side dimensions (project type from the originating RFQ, engagement model, owner engineer) — read with overrideAccess
      // only after the kpi.read guard; nothing personal is returned.
      const opps = rows.length ? ((await req.payload.find({ collection: 'opportunities', where: { ref: { in: rows.map((r) => r.opportunityRef) } }, overrideAccess: true, depth: 0, limit: 100000, pagination: false, req })).docs as any[]) : [];
      const rfqIds = [...new Set(opps.map((o) => o.rfq).filter(Boolean))];
      const rfqs = rfqIds.length ? ((await req.payload.find({ collection: 'rfqs', where: { id: { in: rfqIds } }, overrideAccess: true, depth: 0, limit: 100000, pagination: false, req })).docs as any[]) : [];
      const oppByRef = new Map(opps.map((o) => [o.ref, o]));
      const rfqById = new Map(rfqs.map((r) => [r.id, r]));
      const projectType = sp.get('projectType') || undefined;
      const ownerEngineer = sp.get('ownerEngineer') || undefined;
      const enriched = rows
        .map((r) => {
          const o = oppByRef.get(r.opportunityRef);
          return { ...r, projectType: o?.rfq ? (rfqById.get(o.rfq)?.projectType ?? null) : null, engagementModel: o?.engagementModel ?? null, ownerEngineer: o?.ownerEngineer ? String(o.ownerEngineer) : null };
        })
        .filter((r) => (!projectType || r.projectType === projectType) && (!ownerEngineer || r.ownerEngineer === ownerEngineer));
      const totals = { contracts: enriched.length, signedEgpMinor: enriched.reduce((s, r) => s + r.signedEgpMinor, 0), currentNetEgpMinor: enriched.reduce((s, r) => s + r.currentNetEgpMinor, 0) };
      if (sp.get('format') === 'csv') {
        const cols = ['ref', 'opportunityRef', 'organisationRef', 'contractType', 'signedAt', 'status', 'cohort', 'attribution', 'projectType', 'engagementModel', 'signedEgpMinor', 'currentNetEgpMinor'] as const;
        // neutralise spreadsheet formula injection and quote every cell
        const cell = (v: unknown) => `"${String(v ?? '').replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`;
        const csv = [cols.join(','), ...enriched.map((r: any) => cols.map((c) => cell(r[c])).join(','))].join('\r\n');
        return new Response('﻿' + csv, {
          headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="otonom-contracts-synthetic.csv"', 'cache-control': 'no-store' },
        });
      }
      return jsonRes(200, { period: { from, to }, filters: { cohort: sp.get('cohort'), attribution: sp.get('attribution'), projectType, ownerEngineer }, totals, rows: enriched });
    },
  },
  {
    path: '/reports/kpi',
    method: 'get',
    handler: async (req) => {
      const g = guard(req, 'kpi.read');
      if (g) return g;
      const from = req.searchParams.get('from') ?? `${new Date().getUTCFullYear()}-01-01T00:00:00Z`;
      const to = req.searchParams.get('to') ?? new Date(Date.now() + 86400_000).toISOString();
      if (Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to)) || Date.parse(to) <= Date.parse(from)) return jsonRes(400, { code: 'INVALID_PERIOD' });
      const kpis = await computeKpis(domainDb(), { from, to });
      // the North Star is configurable by the OWNER (pending decision); it only selects which KPI is highlighted
      const settings: any = await req.payload.findGlobal({ slug: 'settings', overrideAccess: true, req });
      const ns = settings?.northStarKpi ?? 'UNSELECTED';
      const northStar = { selected: ns, value: ns === 'UNSELECTED' ? null : (kpis.kpi as any)[ns] ?? null, status: ns === 'UNSELECTED' ? 'PENDING_OWNER_DECISION' : 'OWNER_SELECTED' };
      // KPI-008 pipeline: qualified open opportunities — shown separately, never added to signed value
      const open = await systemFindAll(req, {
        collection: 'opportunities',
        where: { and: [{ qualifiedAt: { exists: true } }, { stage: { not_in: ['WON_SIGNED', 'LOST', 'DELIVERY_HANDOFF'] } }] },
      });
      const pipelineEgp = open.reduce((s: number, d: any) => s + Number(d.estimatedValueEgp ?? 0), 0);
      const funnel = await funnelKpis(req, from, to);
      return jsonRes(200, { ...kpis, northStar, funnel, pipeline: { 'KPI-008_qualifiedOpenPipelineEgp': pipelineEgp, openOpportunities: open.length, note: 'not signed value' } });
    },
  },
  // ---------------- Store operations (commercial release; behind roles) ----------------
  {
    path: '/admin/commerce-lab/review',
    method: 'post',
    handler: localCommerceLabOp('order.confirm', (_req, b) =>
      reviewSyntheticCheckout(
        domainDb(),
        Array.isArray(b.lines) ? (b.lines as any[]).map((line) => ({ skuId: String(line?.skuId ?? ''), qty: Number(line?.qty) })) : [],
      ),
    ),
  },
  {
    path: '/admin/orders/:id/confirm',
    method: 'post',
    handler: domainOp('order.confirm', async (req, b, ctx) => {
      if (!b.idempotencyKey) throw new DomainError('IDEMPOTENCY_KEY_REQUIRED');
      return confirmOrder(domainDb(), { orderId: param(req, 'id'), approvedBy: ctx.actor.id, expectedRevision: Number(b.expectedRevision ?? 1), idempotencyKey: String(b.idempotencyKey), correlationId: ctx.correlationId });
    }),
  },
  { path: '/admin/payments/:id/verify', method: 'post', handler: domainOp('payment.verify', (req, b, ctx) => verifyPayment(domainDb(), ctx, param(req, 'id'), String(b.externalRef ?? ''))) },
  { path: '/admin/stock/adjust', method: 'post', handler: domainOp('stock.adjust', (_r, b, ctx) => adjustStock(domainDb(), ctx, String(b.skuId ?? ''), Number(b.delta ?? 0), String(b.reason ?? ''), String(b.idempotencyKey ?? ''))) },
  { path: '/admin/stock/movements', method: 'post', handler: domainOp('stock.adjust', (_r, b, ctx) => recordStockMovement(domainDb(), ctx, { skuId: String(b.skuId ?? ''), kind: String(b.kind ?? '') as any, qty: Number(b.qty), reference: String(b.reference ?? ''), reason: String(b.reason ?? ''), idempotencyKey: String(b.idempotencyKey ?? '') })) },
  { path: '/admin/product-drafts', method: 'post', handler: domainOp('product.draft', (_r, b, ctx) => createProductDraft(domainDb(), ctx, { skuId: String(b.skuId ?? ''), titleAr: String(b.titleAr ?? ''), titleEn: String(b.titleEn ?? ''), summaryAr: String(b.summaryAr ?? ''), summaryEn: String(b.summaryEn ?? ''), sortOrder: Number(b.sortOrder ?? 0) })) },
  { path: '/admin/product-drafts/:id/submit', method: 'post', handler: domainOp('product.draft', (req, b, ctx) => transitionProductDraft(domainDb(), ctx, param(req, 'id'), 'IN_REVIEW', Number(b.expectedRevision), '')) },
  { path: '/admin/product-drafts/:id/decision', method: 'post', handler: domainOp('product.approve', (req, b, ctx) => transitionProductDraft(domainDb(), ctx, param(req, 'id'), String(b.decision ?? ''), Number(b.expectedRevision), String(b.reason ?? ''))) },
  { path: '/admin/prices', method: 'post', handler: domainOp('price.propose', (_r, b, ctx) => proposePrice(domainDb(), ctx, String(b.skuId ?? ''), Number(b.priceMinor), b.vatIncluded as boolean)) },
  { path: '/admin/prices/:id/approve', method: 'post', handler: domainOp('price.approve', (req, _b, ctx) => approvePrice(domainDb(), ctx, param(req, 'id'))) },
  { path: '/admin/serials', method: 'post', handler: domainOp('serial.register', (_r, b, ctx) => registerSerial(domainDb(), ctx, String(b.serial ?? ''), String(b.skuId ?? ''), String(b.status ?? 'IN_STOCK'))) },
  { path: '/admin/serials/:serial/coverage', method: 'post', handler: domainOp('coverage.activate', (req, b, ctx) => activateCoverage(domainDb(), ctx, param(req, 'serial'), String(b.startsAt ?? ''))) },
  {
    path: '/admin/warranty-claims/:id/decision',
    method: 'post',
    handler: domainOp('warranty_claim.decide', (req, b, ctx) => decideWarrantyClaim(domainDb(), ctx, param(req, 'id'), b.decision as any, String(b.reason ?? ''))),
  },
  // ---------------- W1 public commerce/portal: server-side gate first (G-1), then rate limit, then domain ----------------
  {
    path: '/shop/orders',
    method: 'post',
    handler: async (req) => {
      if ((await stage(req)) !== 'COMMERCIAL') return jsonRes(404, { code: 'NOT_AVAILABLE_IN_PREVIEW' });
      const rl = await rateLimit(`order:${clientIp(req.headers)}`, 5, 10 * 60_000);
      if (!rl.allowed) return jsonRes(429, { code: 'RATE_LIMITED' });
      try {
        const b = await body(req);
        const r = await submitWebsiteOrder(domainDb(), { actor: { id: 'website', role: 'ANONYMOUS' }, correlationId: cid(req) }, {
          idempotencyKey: String(b.idempotencyKey ?? ''),
          lines: Array.isArray(b.lines) ? (b.lines as any[]).map((l) => ({ skuId: String(l?.skuId ?? ''), qty: Number(l?.qty) })) : [],
          customer: { name: String((b.customer as any)?.name ?? ''), email: (b.customer as any)?.email || undefined, phone: (b.customer as any)?.phone || undefined },
          governorate: String(b.governorate ?? ''),
          paymentMethod: b.paymentMethod as any,
        });
        // customer confirmation message: NOT SENT (no email provider approved)
        // the access token is the guest's only key to this order: returned to the submitter, never stored in clear
        return jsonRes((r as any).replay ? 200 : 201, { ref: r.ref, status: r.status, subtotalMinor: r.subtotalMinor, shipping: r.shipping, accessToken: (r as any).accessToken });
      } catch (e) {
        return mapError(e);
      }
    },
  },
  {
    path: '/warranty/claims',
    method: 'post',
    handler: async (req) => {
      if ((await stage(req)) !== 'COMMERCIAL') return jsonRes(404, { code: 'NOT_AVAILABLE_IN_PREVIEW' });
      // tighter limit: the serial check would otherwise allow serial enumeration
      const rl = await rateLimit(`wclaim:${clientIp(req.headers)}`, 5, 60 * 60_000);
      if (!rl.allowed) return jsonRes(429, { code: 'RATE_LIMITED' });
      try {
        const b = await body(req);
        const r = await submitWarrantyClaim(domainDb(), { actor: { id: 'website', role: 'ANONYMOUS' }, correlationId: cid(req) }, {
          serial: String(b.serial ?? '').trim().toUpperCase(),
          contactName: String(b.contactName ?? ''),
          contactEmail: b.contactEmail ? String(b.contactEmail) : undefined,
          contactPhone: b.contactPhone ? String(b.contactPhone) : undefined,
          description: String(b.description ?? ''),
        });
        // coverage status is NOT returned to the public: no warranty decision is communicated automatically
        return jsonRes(201, { ref: r.ref, status: 'SUBMITTED' });
      } catch (e) {
        return mapError(e);
      }
    },
  },
  // ---------------- W1 store (public, gated): cart pricing, custom quotes, guest order status ----------------
  {
    path: '/shop/cart/price',
    method: 'post',
    handler: gatedPublic(async (req, b) => jsonRes(200, await priceCart(domainDb(), Array.isArray(b.lines) ? (b.lines as any[]).map((l) => ({ skuId: String(l?.skuId ?? ''), qty: Number(l?.qty) })) : []))),
  },
  {
    path: '/shop/quotes',
    method: 'post',
    handler: gatedPublic(async (req, b) => {
      const rl = await rateLimit(`quote:${clientIp(req.headers)}`, 5, 10 * 60_000);
      if (!rl.allowed) return jsonRes(429, { code: 'RATE_LIMITED' });
      const r: any = await requestCustomQuote(domainDb(), { actor: { id: 'website', role: 'ANONYMOUS' }, correlationId: cid(req) }, {
        idempotencyKey: String(b.idempotencyKey ?? ''),
        lines: Array.isArray(b.lines) ? (b.lines as any[]).map((l) => ({ skuId: String(l?.skuId ?? ''), qty: Number(l?.qty) })) : [],
        requirements: String(b.requirements ?? ''),
        customer: { name: String((b.customer as any)?.name ?? ''), email: (b.customer as any)?.email || undefined, phone: (b.customer as any)?.phone || undefined },
        governorate: String(b.governorate ?? ''),
      });
      return jsonRes(r.replay ? 200 : 201, { ref: r.ref, status: r.status, accessToken: r.accessToken });
    }),
  },
  {
    path: '/shop/orders/:ref',
    method: 'get',
    handler: gatedPublic(async (req) => {
      const rl = await rateLimit(`ostatus:${clientIp(req.headers)}`, 30, 10 * 60_000);
      if (!rl.allowed) return jsonRes(429, { code: 'RATE_LIMITED' });
      return jsonRes(200, await orderStatusForCustomer(domainDb(), param(req, 'ref'), req.headers.get('x-order-token') ?? ''));
    }),
  },
  {
    path: '/shop/orders/:ref/accept-quote',
    method: 'post',
    handler: gatedPublic(async (req) => jsonRes(200, await acceptQuote(domainDb(), { actor: { id: 'website', role: 'ANONYMOUS' }, correlationId: cid(req) }, param(req, 'ref'), req.headers.get('x-order-token') ?? ''))),
  },
  // ---------------- W1 store operations (staff, MFA, role-checked; usable in PREVIEW for back-office preparation) ----------------
  { path: '/admin/orders/:id/quote', method: 'post', handler: domainOp('quote.issue', (req, b, ctx) => issueQuote(domainDb(), ctx, param(req, 'id'), Number(b.quoteMinor), String(b.validUntil ?? ''))) },
  { path: '/admin/orders/:id/shipping', method: 'post', handler: domainOp('order.fulfil', (req, b, ctx) => setShipping(domainDb(), ctx, param(req, 'id'), Number(b.shippingMinor))) },
  { path: '/admin/orders/:id/payments', method: 'post', handler: domainOp('payment.record', (req, b, ctx) => recordPayment(domainDb(), ctx, param(req, 'id'), b.method as any, Number(b.amountMinor))) },
  { path: '/admin/payments/:id/reject', method: 'post', handler: domainOp('payment.verify', (req, b, ctx) => rejectPayment(domainDb(), ctx, param(req, 'id'), String(b.reason ?? ''))) },
  { path: '/admin/orders/:id/allocate', method: 'post', handler: domainOp('order.fulfil', (req, b, ctx) => allocateSerials(domainDb(), ctx, param(req, 'id'), (b.serialsByLine ?? {}) as Record<string, string[]>)) },
  { path: '/admin/orders/:id/ship', method: 'post', handler: domainOp('order.fulfil', (req, _b, ctx) => shipOrder(domainDb(), ctx, param(req, 'id'))) },
  { path: '/admin/orders/:id/complete', method: 'post', handler: domainOp('order.fulfil', (req, _b, ctx) => completeOrder(domainDb(), ctx, param(req, 'id'))) },
  { path: '/admin/orders/:id/cancel', method: 'post', handler: domainOp('order.cancel', (req, b, ctx) => cancelOrder(domainDb(), ctx, param(req, 'id'), String(b.reason ?? ''))) },
  // ---------------- W1 customer portal (gated: 404 in PREVIEW; customers only; scoped by the session user) ----------------
  {
    path: '/account/register',
    method: 'post',
    handler: gatedPublic(async (req, b) => {
      const rl = await rateLimit(`register:${clientIp(req.headers)}`, 5, 60 * 60_000);
      if (!rl.allowed) return jsonRes(429, { code: 'RATE_LIMITED' });
      const email = String(b.email ?? '').trim().toLowerCase();
      const password = String(b.password ?? '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return jsonRes(422, { code: 'VALIDATION_FAILED', fieldErrors: { email: 'invalid' } });
      if (passwordPolicyError(password, email)) return jsonRes(422, { code: 'VALIDATION_FAILED', fieldErrors: { password: 'strong_password_required' } });
      const exists = await req.payload.find({ collection: 'users', where: { email: { equals: email } }, overrideAccess: true, depth: 0, limit: 1, req });
      // role is always CUSTOMER (never client-controlled); same answer whether or not the e-mail exists (no account oracle)
      if (!exists.docs[0]) await req.payload.create({ collection: 'users', data: { email, password, role: 'CUSTOMER' } as any, overrideAccess: true, req });
      // e-mail verification is NOT available (no e-mail provider approved) — documented release blocker
      return jsonRes(202, { code: 'ACCOUNT_REQUEST_RECEIVED' });
    }),
  },
  { path: '/account/devices', method: 'get', handler: customerOp(async (req, _b, ctx) => jsonRes(200, { devices: await listMyDevices(domainDb(), ctx.actor.id) })) },
  {
    path: '/account/devices/claim',
    method: 'post',
    handler: customerOp(async (req, b, ctx) => {
      const rl = await rateLimit(`claim:${ctx.actor.id}`, 10, 60 * 60_000); // per account: claim attempts are a guessing surface
      if (!rl.allowed) return jsonRes(429, { code: 'RATE_LIMITED' });
      const r = await claimDevice(domainDb(), ctx, {
        serial: String(b.serial ?? ''),
        orderRef: b.orderRef ? String(b.orderRef) : undefined,
        orderToken: b.orderToken ? String(b.orderToken) : undefined,
        commissioningCode: b.commissioningCode ? String(b.commissioningCode) : undefined,
        evidence: b.evidence ? String(b.evidence) : undefined,
      });
      return jsonRes(r.status === 'PENDING' ? 202 : 200, r);
    }),
  },
  { path: '/account/tickets', method: 'get', handler: customerOp(async (req, _b, ctx) => jsonRes(200, { tickets: await listMyTickets(domainDb(), ctx.actor.id) })) },
  { path: '/account/tickets/:ref/timeline', method: 'get', handler: customerOp(async (req, _b, ctx) => jsonRes(200, await getMyTicketTimeline(domainDb(), ctx.actor.id, param(req, 'ref')))) },
  {
    path: '/service-tickets',
    method: 'post',
    handler: customerOp(async (req, b, ctx) => {
      const result = await openTicket(domainDb(), ctx, { serial: String(b.serial ?? ''), category: String(b.category ?? ''), description: String(b.description ?? ''), idempotencyKey: b.idempotencyKey ? String(b.idempotencyKey) : undefined });
      return jsonRes((result as any).replay ? 200 : 201, result);
    }),
  },
  {
    path: '/account/devices/:serial/transfer',
    method: 'post',
    handler: customerOp(async (req, b, ctx) => jsonRes(201, await requestOwnershipTransfer(domainDb(), ctx, param(req, 'serial'), String(b.toCustomerRef ?? '')))),
  },
  {
    path: '/account/device-transfers/:id/accept',
    method: 'post',
    handler: customerOp(async (req, b, ctx) => jsonRes(200, await acceptOwnershipTransfer(domainDb(), ctx, param(req, 'id'), String(b.token ?? '')))),
  },
  // ---------------- W1 service operations (staff, MFA, role-checked) ----------------
  {
    path: '/admin/serials/:serial/commissioning',
    method: 'post',
    handler: domainOp('commissioning.record', (req, b, ctx) =>
      recordCommissioning(domainDb(), ctx, { serial: param(req, 'serial'), projectRef: b.projectRef ? String(b.projectRef) : undefined, installedAt: String(b.installedAt ?? ''), commissionedAt: String(b.commissionedAt ?? ''), technician: String(b.technician ?? ''), checklist: (b.checklist ?? {}) as any }),
    ),
  },
  { path: '/admin/ownerships/:id/decision', method: 'post', handler: domainOp('ownership.verify', (req, b, ctx) => decideOwnership(domainDb(), ctx, param(req, 'id'), b.decision as any, String(b.reason ?? ''))) },
  { path: '/admin/tickets/:id/status', method: 'post', handler: domainOp('service.manage', (req, b, ctx) => updateTicket(domainDb(), ctx, param(req, 'id'), { status: String(b.status ?? ''), assignedTo: b.assignedTo ? String(b.assignedTo) : undefined, resolution: b.resolution ? String(b.resolution) : undefined, expectedRevision: b.expectedRevision === undefined ? undefined : Number(b.expectedRevision) })) },
  { path: '/admin/tickets/:id/assign', method: 'post', handler: domainOp('service.manage', (req, b, ctx) => assignTicket(domainDb(), ctx, param(req, 'id'), { assignedTo: String(b.assignedTo ?? ''), reason: String(b.reason ?? ''), expectedRevision: Number(b.expectedRevision) })) },
  {
    path: '/admin/tickets/:id/diagnoses',
    method: 'post',
    handler: domainOp('service.manage', (req, b, ctx) =>
      b.observation !== undefined || b.reproduction !== undefined
        ? recordStructuredDiagnosis(domainDb(), ctx, param(req, 'id'), {
            observation: String(b.observation ?? ''),
            reproduction: String(b.reproduction ?? ''),
            hypothesis: b.hypothesis ? String(b.hypothesis) : undefined,
            finalDiagnosis: b.finalDiagnosis ? String(b.finalDiagnosis) : undefined,
            hardwareRevision: b.hardwareRevision ? String(b.hardwareRevision) : undefined,
            softwareInfo: b.softwareInfo ? String(b.softwareInfo) : undefined,
            diagnosticStatus: String(b.diagnosticStatus ?? '') as any,
            partsNote: b.partsNote ? String(b.partsNote) : undefined,
          })
        : recordDiagnosis(domainDb(), ctx, param(req, 'id'), String(b.diagnosis ?? ''), b.partsNote ? String(b.partsNote) : undefined),
    ),
  },
  // ---------------- consistency between the domain (source of truth) and the CMS (release blocker B-31) ----------------
  {
    path: '/admin/reconcile',
    method: 'post',
    handler: async (req) => {
      const g = guard(req, 'system.reconcile');
      if (g) return g;
      const b = await body(req);
      const fix = b.fix === true;
      const db = domainDb();
      const issues: Array<{ kind: string; ref: string; detail?: unknown; fixed?: boolean }> = [];
      const sys = { overrideAccess: true, req, depth: 0 } as const;
      // 1. every domain contract must have its CMS opportunity in WON_SIGNED / DELIVERY_HANDOFF (partial failure at signature)
      const contracts = await reconciliationContracts(db);
      const opps = await systemFindAllByChunks(req, 'opportunities', 'ref', contracts.map((k) => k.opportunity_ref));
      const oppByRef = new Map(opps.map((o) => [o.ref, o]));
      for (const k of contracts) {
        const o = oppByRef.get(k.opportunity_ref);
        if (!o) issues.push({ kind: 'CONTRACT_WITHOUT_OPPORTUNITY', ref: k.ref });
        else if (!['WON_SIGNED', 'DELIVERY_HANDOFF'].includes(o.stage)) {
          let fixed = false;
          if (fix) {
            await req.payload.update({ collection: 'opportunities', id: o.id, data: { stage: 'WON_SIGNED', contractRef: k.ref } as any, ...sys, context: { contractSigned: true } });
            fixed = true;
          }
          issues.push({ kind: 'OPPORTUNITY_STAGE_BEHIND_CONTRACT', ref: k.ref, detail: { opportunity: o.ref, stage: o.stage }, fixed });
        }
      }
      // 2. WON opportunities must have a domain contract (cannot be auto-fixed: needs signature evidence)
      const won = await systemFindAll(req, { collection: 'opportunities', where: { stage: { in: ['WON_SIGNED', 'DELIVERY_HANDOFF'] } } });
      const contracted = new Set(contracts.map((k) => k.opportunity_ref));
      for (const o of won) if (!contracted.has(o.ref)) issues.push({ kind: 'WON_WITHOUT_CONTRACT', ref: o.ref });
      // 3. RFQ ↔ opportunity links must agree
      const linked = await systemFindAll(req, { collection: 'rfqs', where: { opportunity: { exists: true } } });
      const oppIds = [...new Set(linked.map((r) => r.opportunity))];
      const linkedOpps = await systemFindAllByChunks(req, 'opportunities', 'id', oppIds);
      const oppById = new Map(linkedOpps.map((o) => [o.id, o]));
      for (const r of linked) if (!oppById.has(r.opportunity)) issues.push({ kind: 'RFQ_LINKS_MISSING_OPPORTUNITY', ref: r.ref });
      // 4. reserved stock must equal the sum of ACTIVE reservations (INV-T04 drift detection)
      const drift = (await db.query(`SELECT s.sku_id, s.reserved, coalesce(sum(r.qty) FILTER (WHERE r.status='ACTIVE'),0)::int AS active FROM domain.stock_levels s LEFT JOIN domain.reservations r ON r.sku_id=s.sku_id AND r.location_id=s.location_id GROUP BY s.sku_id, s.reserved HAVING s.reserved <> coalesce(sum(r.qty) FILTER (WHERE r.status='ACTIVE'),0)`)).rows;
      for (const d of drift) issues.push({ kind: 'RESERVED_STOCK_DRIFT', ref: d.sku_id, detail: { reserved: d.reserved, activeReservations: d.active } });
      // 5. physical on-hand stock must equal receipts + signed adjustments - shipments.
      const ledgerDrift = (await db.query(`
        WITH ledger AS (
          SELECT sku_id, location_id,
            coalesce(sum(CASE WHEN type IN ('RECEIPT','ADJUSTMENT','RESTOCK') THEN qty WHEN type IN ('SHIP','WRITE_OFF') THEN -qty ELSE 0 END), 0)::int AS expected
          FROM domain.inventory_ledger
          GROUP BY sku_id, location_id
        )
        SELECT coalesce(s.sku_id,l.sku_id) AS sku_id, coalesce(s.location_id,l.location_id) AS location_id,
          s.on_hand, coalesce(l.expected,0)::int AS ledger_on_hand
        FROM domain.stock_levels s
        FULL OUTER JOIN ledger l USING (sku_id, location_id)
        WHERE s.sku_id IS NULL OR s.on_hand <> coalesce(l.expected,0)
      `)).rows;
      for (const d of ledgerDrift) issues.push({ kind: 'ON_HAND_LEDGER_DRIFT', ref: d.sku_id, detail: { location: d.location_id, onHand: d.on_hand, ledgerOnHand: d.ledger_on_hand } });
      await db.query(
        `INSERT INTO domain.audit_events(actor_type, actor_id, action, entity_type, entity_id, after, correlation_id) VALUES ('user',$1,'system.reconcile','system','reconcile',$2,$3)`,
        [String(req.user!.id), JSON.stringify({ fix, issues: issues.length, fixed: issues.filter((i) => i.fixed).length }), cid(req)],
      );
      return jsonRes(200, { checkedContracts: contracts.length, checkedWonOpportunities: won.length, checkedLinkedRfqs: linked.length, issues });
    },
  },
  { path: '/admin/tickets/:id/callback', method: 'post', handler: domainOp('service.manage', (req, b, ctx) => recordCallback(domainDb(), ctx, param(req, 'id'), String(b.note ?? ''))) },
  { path: '/admin/tickets/:id/rma', method: 'post', handler: domainOp('rma.decide', (req, _b, ctx) => openRma(domainDb(), ctx, param(req, 'id'))) },
  { path: '/admin/rmas/:id/inspections', method: 'post', handler: domainOp('rma.decide', (req, b, ctx) => recordRmaInspection(domainDb(), ctx, param(req, 'id'), { condition: String(b.condition ?? '') as any, serialMatches: b.serialMatches === true, notes: String(b.notes ?? '') })) },
  { path: '/admin/rmas/:id/actions', method: 'post', handler: domainOp('rma.decide', (req, b, ctx) => recordRmaAction(domainDb(), ctx, param(req, 'id'), String(b.action ?? '') as any, String(b.note ?? ''))) },
  { path: '/admin/rmas/:id/transition', method: 'post', handler: domainOp('rma.decide', (req, b, ctx) => rmaTransition(domainDb(), ctx, param(req, 'id'), String(b.to ?? ''), { reason: b.reason ? String(b.reason) : undefined, replacementSerial: b.replacementSerial ? String(b.replacementSerial) : undefined, expectedRevision: b.expectedRevision === undefined ? undefined : Number(b.expectedRevision) })) },
  {
    path: '/ready',
    method: 'get',
    handler: async (req) => {
      try {
        await domainDb().query('SELECT 1');
        await req.payload.count({ collection: 'users', overrideAccess: true });
        return jsonRes(200, { ready: true });
      } catch {
        return jsonRes(503, { ready: false });
      }
    },
  },
];

export { mfaOk };
