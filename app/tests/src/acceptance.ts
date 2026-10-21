// Black-box acceptance suite for the local M2 preview build (synthetic data). Server: http://127.0.0.1:3301 started with
// OTONOM_TRUST_PROXY=1 so that tests can emulate distinct clients through X-Forwarded-For.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { generate } from 'otplib';
import pg from 'pg';
import { APP_ROOT, connConfig, SECRETS_DIR } from '@otonom/domain';
import { Client, Recorder, sleep } from './http-client.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const rec = new Recorder();
const su = new pg.Pool({ ...connConfig('superuser'), max: 2 });
type U = { id: number; email: string; role: string; password: string; totp: string; recovery: string[] };
const users: U[] = JSON.parse(readFileSync(path.join(SECRETS_DIR, 'dev_users.json'), 'utf8'));
const byRole = (r: string) => users.find((u) => u.role === r)!;
const lastStep = new Map<number, number>();
const START_STEP = Math.floor(Date.now() / 30000);
// distinct synthetic client per call (the server keeps rate-limit windows across runs)
const ip = () => `10.${Array.from(randomBytes(3)).join('.')}`;

async function code(u: U) {
  for (;;) {
    const s = Math.floor(Date.now() / 30000);
    // a previous run may have used the current step for this user: the first code always waits for a fresh step
    if (s > (lastStep.get(u.id) ?? START_STEP)) {
      lastStep.set(u.id, s);
      return generate({ secret: u.totp });
    }
    await sleep(1000);
  }
}
async function login(u: U, mfa = true) {
  const c = new Client(BASE, u.role, true);
  const r = await c.post('/api/users/login', { email: u.email, password: u.password });
  if (r.status !== 200) throw new Error(`login ${u.role} ${r.status}`);
  if (mfa) {
    const v = await c.post('/api/mfa/verify', { code: await code(u) });
    if (v.status !== 200) throw new Error(`mfa ${u.role} ${v.status}`);
  }
  return c;
}
const rfqBody = (over: Record<string, unknown> = {}) => ({
  kind: 'RFQ',
  idempotencyKey: randomUUID().replace(/-/g, ''),
  locale: 'ar',
  fullName: 'عميل تجريبي',
  email: `synthetic+${randomUUID().slice(0, 8)}@example.com`,
  phone: '01001234567',
  customerType: 'DEVELOPER',
  projectType: 'COMPOUND',
  governorate: 'CAIRO',
  units: 120,
  systems: ['LIGHTING', 'CLIMATE'],
  engagementModel: 'SUPPLY_INSTALL_PROGRAM',
  description: 'مشروع تجريبي لاختبار النظام — بيانات اصطناعية فقط.',
  consentProcessing: true,
  attribution: { landingPage: '/ar/business/developers', utm: { source: 'synthetic', medium: 'test' } },
  ...over,
});

async function main() {
  const anon = new Client(BASE, 'anon', true);
  // ---------- site, i18n, security headers ----------
  for (const l of ['ar', 'en']) {
    const r = await anon.get(`/${l}`);
    rec.add(`APP-WEB-HOME-${l}`, 'WEB', `/${l} renders with lang/dir and preview banner`, r.status === 200 && r.text.includes(`lang="${l}"`) && r.text.includes(`dir="${l === 'ar' ? 'rtl' : 'ltr'}"`) && r.text.includes('/preview'), r.status);
  }
  {
    const r = await new Client(BASE).req('GET', '/', { headers: { 'accept-language': 'en-US,en;q=0.9' } });
    rec.add('APP-WEB-ROOT-NEGOTIATION', 'WEB', '/ redirects by Accept-Language', r.status === 307 && r.headers.get('location') === '/en', r.headers.get('location'));
    const h = await anon.get('/ar');
    rec.add('APP-SEC-HEADERS', 'SEC', 'security headers present', h.headers.get('x-content-type-options') === 'nosniff' && h.headers.get('x-frame-options') === 'DENY' && !!h.headers.get('referrer-policy') && !h.headers.get('x-powered-by'), Object.fromEntries(h.headers));
  }
  for (const p of ['about', 'solutions', 'solutions/villas', 'solutions/apartments', 'solutions/scenarios', 'business/developers', 'business/contractors', 'business/partners', 'technology', 'technology/controllers', 'technology/integrations', 'technology/documentation', 'projects', 'consultation', 'business/request-a-proposal', 'support', 'support/service', 'preview', 'legal/privacy', 'contact']) {
    const r = await anon.get(`/en/${p}`);
    rec.add(`APP-WEB-PAGE-${p}`, 'WEB', `/en/${p} renders`, r.status === 200, r.status);
  }
  {
    const r = await anon.get('/en/technology/integrations');
    rec.add('APP-CLAIMS-NONE-PUBLISHED', 'CLAIMS', 'no unverified compatibility claim rendered', r.status === 200 && !/Works with Alexa|Apple Home|certified/i.test(r.text), null);
    const api = await anon.get('/api/claims?limit=100');
    rec.add('APP-CLAIMS-API-ANON', 'CLAIMS', 'anonymous claims API returns only publishable (none)', (api.json?.docs?.length ?? 0) === 0, api.json?.docs?.length);
  }
  {
    const robots = await anon.get('/robots.txt');
    rec.add('APP-SEO-ROBOTS', 'SEO', 'robots disallows everything while not launched', robots.text.includes('Disallow: /'), robots.text);
    const sm = await anon.get('/sitemap.xml');
    rec.add('APP-SEO-SITEMAP', 'SEO', 'sitemap has reciprocal hreflang', sm.status === 200 && sm.text.includes('hreflang="ar"') && sm.text.includes('hreflang="en"') && sm.text.includes('x-default'), sm.status);
  }
  // ---------- G-1 / G-2 preview gating ----------
  for (const [m, p] of [['POST', '/api/shop/orders'], ['POST', '/api/warranty/claims'], ['POST', '/api/service-tickets'], ['GET', '/api/account/devices']] as const) {
    const r = await anon.req(m, p, m === 'POST' ? { json: {} } : {});
    rec.add(`APP-G1-${p}`, 'G-1', `${p} disabled server-side in PREVIEW`, r.status === 404, r.status);
  }
  for (const p of ['shop', 'cart', 'checkout', 'account', 'support/warranty'])
    for (const l of ['ar', 'en']) {
      const r = await anon.get(`/${l}/${p}`);
      rec.add(`APP-G2-${l}-${p}`, 'G-2', `/${l}/${p} informational, noindex, no form`, r.status === 200 && r.text.includes('data-stage="PREVIEW"') && /noindex/.test(r.text) && !/<form/i.test(r.text), r.status);
    }
  // ---------- RFQ intake (P-A) ----------
  const okBody = rfqBody();
  const c1 = await anon.req('POST', '/api/rfq', { json: okBody, headers: { 'x-forwarded-for': ip() } });
  rec.add('APP-RFQ-CREATE', 'RFQ', 'valid Arabic RFQ accepted with non-sequential reference', c1.status === 201 && /^RFQ-\d{4}-[A-Z2-9]{6}$/.test(c1.json?.ref), c1.json);
  const c2 = await anon.req('POST', '/api/rfq', { json: okBody, headers: { 'x-forwarded-for': ip() } });
  rec.add('APP-RFQ-IDEMPOTENT', 'RFQ', 'replay with same key returns same reference', c2.json?.ref === c1.json?.ref && c2.json?.replay === true, c2.json);
  {
    const parallel = rfqBody();
    const rs = await Promise.all(Array.from({ length: 5 }, () => anon.req('POST', '/api/rfq', { json: parallel, headers: { 'x-forwarded-for': ip() } })));
    const refs = new Set(rs.map((r) => r.json?.ref));
    const n = Number((await su.query(`SELECT count(*)::int n FROM cms.rfqs WHERE idempotency_key=$1`, [parallel.idempotencyKey])).rows[0].n);
    rec.add('APP-RFQ-IDEMPOTENT-PARALLEL', 'RFQ', '5 parallel submissions with one key create exactly one RFQ', refs.size === 1 && n === 1, { refs: [...refs], n });
  }
  {
    const bad = await anon.req('POST', '/api/rfq', { json: rfqBody({ fullName: '', email: 'not-an-email', phone: '', description: 'short', consentProcessing: false, units: undefined }), headers: { 'x-forwarded-for': ip() } });
    const fe = bad.json?.fieldErrors ?? {};
    rec.add('APP-RFQ-VALIDATION', 'RFQ', 'invalid submission returns field errors', bad.status === 422 && fe.fullName && fe.email && fe.description && fe.consentProcessing && fe.size, fe);
  }
  {
    const n0 = Number((await su.query(`SELECT count(*)::int n FROM cms.rfqs`)).rows[0].n);
    const hp = await anon.req('POST', '/api/rfq', { json: rfqBody({ website: 'http://spam.example' }), headers: { 'x-forwarded-for': ip() } });
    const n1 = Number((await su.query(`SELECT count(*)::int n FROM cms.rfqs`)).rows[0].n);
    rec.add('APP-RFQ-HONEYPOT', 'RFQ', 'honeypot submission silently dropped', hp.status === 202 && n1 === n0, { status: hp.status, n0, n1 });
  }
  {
    const fixed = ip();
    let last = 0;
    for (let i = 0; i < 6; i++) last = (await anon.req('POST', '/api/rfq', { json: rfqBody(), headers: { 'x-forwarded-for': fixed } })).status;
    rec.add('APP-RFQ-RATE-LIMIT', 'RFQ', '6th submission from one client within the window is rate-limited', last === 429, last);
    const rl = (await su.query(`SELECT count(*)::int n, count(*) FILTER (WHERE bucket LIKE '%' || $1 || '%' OR bucket LIKE 'rfq:%')::int raw FROM domain.rate_limits`, [fixed])).rows[0];
    rec.add('APP-RATE-LIMIT-SHARED', 'RFQ', 'rate limits live in the shared PostgreSQL store with hashed keys only (no raw IPs at rest)', rl.n > 0 && rl.raw === 0, rl);
  }
  {
    const email = `dup+${randomUUID().slice(0, 6)}@example.com`;
    await anon.req('POST', '/api/rfq', { json: rfqBody({ email }), headers: { 'x-forwarded-for': ip() } });
    const second = await anon.req('POST', '/api/rfq', { json: rfqBody({ email }), headers: { 'x-forwarded-for': ip() } });
    const row = (await su.query(`SELECT possible_duplicate_of_id FROM cms.rfqs WHERE ref=$1`, [second.json?.ref])).rows[0];
    rec.add('APP-RFQ-DEDUPE', 'RFQ', 'second RFQ from same email flagged as possible duplicate (no auto-merge)', !!row?.possible_duplicate_of_id, row);
  }
  {
    const r = await anon.req('POST', '/api/rfq', { json: rfqBody({ phone: '٠١٠٠١٢٣٤٥٦٧', email: '' }), headers: { 'x-forwarded-for': ip() } });
    const row = (await su.query(`SELECT submitted_phone FROM cms.rfqs WHERE ref=$1`, [r.json?.ref])).rows[0];
    rec.add('APP-RFQ-PHONE-NORMALISE', 'RFQ', 'Arabic-Indic digits normalised to E.164', row?.submitted_phone === '+201001234567', row);
  }
  // ---------- staff sessions ----------
  const s: Record<string, Client> = {};
  for (const r of ['OWNER', 'ADMIN', 'ENGINEER', 'STORE', 'EDITOR']) s[r] = await login(byRole(r));
  {
    const pending = await login(byRole('OWNER'), false);
    const r1 = await pending.get('/api/rfqs');
    const r2 = await pending.get('/api/reports/kpi');
    rec.add('APP-MFA-PENDING', 'MFA', 'password-only staff session cannot read CRM or KPI', (r1.status === 403 || (r1.json?.docs?.length ?? 0) === 0) && r2.status === 401, { rfqs: r1.status, kpi: r2.status });
    const pa = await pending.get('/admin');
    rec.add('APP-MFA-ADMIN-PENDING', 'MFA', 'admin panel refused to a password-only session', pa.status === 307 && pa.headers.get('location') === '/admin/unauthorized', { status: pa.status, location: pa.headers.get('location') });
    const fa = await s.ADMIN.get('/admin/collections/rfqs');
    rec.add('APP-MFA-ADMIN-OK', 'MFA', 'admin panel usable after MFA', fa.status === 200, fa.status);
    const ui = await new Client(BASE).get('/staff/login');
    rec.add('APP-MFA-STAFF-LOGIN-PAGE', 'MFA', 'staff login page available', ui.status === 200 && ui.text.includes('staff sign-in'), ui.status);
  }
  // ---------- CRM read access ----------
  {
    const a = await anon.get('/api/rfqs');
    const ed = await s.EDITOR.get('/api/rfqs');
    const en = await s.ENGINEER.get('/api/rfqs?limit=5');
    rec.add('APP-CRM-READ-ANON', 'CRM', 'anonymous cannot read RFQs', a.status === 403 || (a.json?.docs?.length ?? 0) === 0, a.status);
    rec.add('APP-CRM-READ-EDITOR', 'CRM', 'editor cannot read RFQs (PII)', ed.status === 403 || (ed.json?.docs?.length ?? 0) === 0, ed.status);
    rec.add('APP-CRM-READ-ENGINEER', 'CRM', 'engineer reads RFQs; idempotency key never exposed', en.status === 200 && en.json.docs.length > 0 && !en.text.includes('idempotencyKey'), en.status);
    const create = await s.ENGINEER.post('/api/rfqs', { ref: 'RFQ-FAKE', status: 'QUALIFIED' });
    rec.add('APP-CRM-NO-DIRECT-RFQ-CREATE', 'CRM', 'RFQs cannot be created through the generated API', create.status === 403, create.status);
  }
  // ---------- RFQ triage transitions ----------
  {
    const id = (await su.query(`SELECT id FROM cms.rfqs WHERE ref=$1`, [c1.json.ref])).rows[0].id;
    const skip = await s.ENGINEER.patch(`/api/rfqs/${id}`, { status: 'QUALIFIED' });
    rec.add('APP-RFQ-ILLEGAL-SKIP', 'CRM', 'SUBMITTED → QUALIFIED skip refused', skip.status === 409, skip.status);
    await s.ENGINEER.patch(`/api/rfqs/${id}`, { status: 'INITIAL_QUALIFICATION' });
    const lost = await s.ENGINEER.patch(`/api/rfqs/${id}`, { status: 'LOST' });
    rec.add('APP-RFQ-LOST-NEEDS-REASON', 'CRM', 'LOST without reason refused', lost.status === 409, lost.status);
    const tamper = await s.ENGINEER.patch(`/api/rfqs/${id}`, { submitted: { email: 'tampered@example.com' } });
    const row = (await su.query(`SELECT submitted_email FROM cms.rfqs WHERE id=$1`, [id])).rows[0];
    rec.add('APP-RFQ-PAYLOAD-IMMUTABLE', 'CRM', 'submission payload immutable after submit', row.submitted_email !== 'tampered@example.com', { status: tamper.status, row });
    const q = await s.ENGINEER.patch(`/api/rfqs/${id}`, { status: 'QUALIFIED' });
    rec.add('APP-RFQ-QUALIFY', 'CRM', 'INITIAL_QUALIFICATION → QUALIFIED allowed', q.status === 200, q.status);
  }
  // ---------- opportunity pipeline + contract signature ----------
  const oppRef = `OPP-SYN-${randomUUID().slice(0, 6)}`;
  const opp = await s.ENGINEER.post('/api/opportunities', { ref: oppRef, stage: 'NEGOTIATION', qualifiedAt: new Date().toISOString(), estimatedValueEgp: 2500000, attributionProposal: 'WEBSITE_SOURCED', attributionEvidence: 'RFQ submitted via website (synthetic)' });
  const oid = opp.json?.doc?.id;
  rec.add('APP-OPP-CREATE-STARTS-AT-REVIEW', 'CRM', 'new opportunity always starts at ENGINEERING_REVIEW', opp.status === 201 && opp.json.doc.stage === 'ENGINEERING_REVIEW', opp.json?.doc?.stage);
  const step = (c: Client, data: any) => c.patch(`/api/opportunities/${oid}`, data);
  rec.add('APP-OPP-SURVEY-NEEDS-FEE', 'CRM', 'paid survey without fee agreement refused', (await step(s.ENGINEER, { stage: 'PAID_SITE_SURVEY' })).status === 409, null);
  rec.add('APP-OPP-SURVEY-OK', 'CRM', 'paid survey with fee agreement + invoice ref', (await step(s.ENGINEER, { stage: 'PAID_SITE_SURVEY', surveyFeeAgreed: true, surveyInvoiceRef: 'INV-SYN-1' })).status === 200, null);
  await step(s.ENGINEER, { stage: 'PROPOSAL_DRAFT' });
  rec.add('APP-OPP-APPROVE-ENGINEER', 'CRM', 'engineer cannot approve proposal', (await step(s.ENGINEER, { stage: 'PROPOSAL_APPROVED' })).status === 403, null);
  rec.add('APP-OPP-APPROVE-INCOMPLETE', 'CRM', 'owner approval requires document, validity and capacity note', (await step(s.OWNER, { stage: 'PROPOSAL_APPROVED' })).status === 409, null);
  const valid = new Date(Date.now() + 30 * 86400_000).toISOString();
  rec.add('APP-OPP-APPROVE-OK', 'CRM', 'owner approves complete proposal', (await step(s.OWNER, { stage: 'PROPOSAL_APPROVED', proposalDocumentRef: 'doc:proposal-v1', proposalValidUntil: valid, capacityCheckNote: 'Synthetic: within capacity' })).status === 200, null);
  await step(s.ENGINEER, { stage: 'PROPOSAL_SENT' });
  rec.add('APP-OPP-NO-DIRECT-WIN', 'CRM', 'WON_SIGNED cannot be set directly', (await step(s.OWNER, { stage: 'WON_SIGNED' })).status === 409, null);
  const signEng = await s.ENGINEER.post(`/api/workspace/opportunities/${oid}/sign-contract`, { signedValueMinor: 250000000, evidenceRef: 'file:signed-contract' });
  rec.add('APP-CONTRACT-SIGN-ROLE', 'CONTRACT', 'engineer cannot sign contract', signEng.status === 403, signEng.status);
  const noEvidence = await s.OWNER.post(`/api/workspace/opportunities/${oid}/sign-contract`, { signedValueMinor: 250000000 });
  rec.add('APP-CONTRACT-NEEDS-EVIDENCE', 'CONTRACT', 'signature evidence required', noEvidence.status === 422 && noEvidence.json?.code === 'SIGNATURE_EVIDENCE_REQUIRED', noEvidence.json);
  const signed = await s.OWNER.post(`/api/workspace/opportunities/${oid}/sign-contract`, { signedValueMinor: 250000000, evidenceRef: 'file:signed-contract', contractType: 'PROJECT' });
  rec.add('APP-CONTRACT-SIGN-OK', 'CONTRACT', 'owner signs; attribution locked from opportunity; cohort evaluated', signed.status === 200 && signed.json.attribution === 'WEBSITE_SOURCED' && ['NEW', 'EXISTING'].includes(signed.json.cohort), signed.json);
  {
    const o = await s.ENGINEER.get(`/api/opportunities/${oid}`);
    rec.add('APP-OPP-WON-AFTER-SIGN', 'CRM', 'opportunity moved to WON_SIGNED with contract ref', o.json?.stage === 'WON_SIGNED' && o.json?.contractRef === signed.json.contractRef, { stage: o.json?.stage });
    await s.OWNER.patch(`/api/opportunities/${oid}`, { contractRef: 'CTR-FORGED', proposalApprovedBy: 'someone-else' });
    const after = await s.ENGINEER.get(`/api/opportunities/${oid}`);
    rec.add('APP-OPP-SYSTEM-FIELDS', 'CRM', 'contractRef / proposalApprovedBy cannot be forged through the API', after.json?.contractRef === signed.json.contractRef && after.json?.proposalApprovedBy !== 'someone-else', { contractRef: after.json?.contractRef });
    const again = await s.OWNER.post(`/api/workspace/opportunities/${oid}/sign-contract`, { signedValueMinor: 1, evidenceRef: 'x' });
    rec.add('APP-CONTRACT-NO-DOUBLE-SIGN', 'CONTRACT', 'cannot sign twice from the same opportunity', again.status === 422, again.json);
    const ho = await s.ENGINEER.get(`/api/workspace/opportunities/${oid}/handoff-summary`);
    rec.add('APP-HANDOFF-SUMMARY', 'CRM', 'ClickUp handoff summary has no file links', ho.status === 200 && ho.text.includes(signed.json.contractRef) && !/https?:\/\/|\/api\/|file:/.test(ho.text), ho.text.slice(0, 200));
    // B-31 reconciliation: simulate the partial failure "contract committed, CMS stage update lost"
    await su.query(`UPDATE cms.opportunities SET stage='PROPOSAL_SENT' WHERE id=$1`, [oid]);
    const stockBefore = Number((await su.query(`SELECT on_hand FROM domain.stock_levels WHERE sku_id='sku-rc04' AND location_id='MAIN'`)).rows[0].on_hand);
    await su.query(`UPDATE domain.stock_levels SET on_hand=on_hand+3 WHERE sku_id='sku-rc04' AND location_id='MAIN'`);
    const recEd = await s.EDITOR.post('/api/admin/reconcile', {});
    const rep1 = await s.OWNER.post('/api/admin/reconcile', {});
    const found = (rep1.json?.issues ?? []).find((i: any) => i.kind === 'OPPORTUNITY_STAGE_BEHIND_CONTRACT' && i.ref === signed.json.contractRef);
    const stockDrift = (rep1.json?.issues ?? []).find((i: any) => i.kind === 'ON_HAND_LEDGER_DRIFT' && i.ref === 'sku-rc04');
    const rep2 = await s.OWNER.post('/api/admin/reconcile', { fix: true });
    await su.query(`UPDATE domain.stock_levels SET on_hand=$1 WHERE sku_id='sku-rc04' AND location_id='MAIN'`, [stockBefore]);
    const stNow = (await su.query(`SELECT stage FROM cms.opportunities WHERE id=$1`, [oid])).rows[0].stage;
    rec.add('APP-RECONCILE', 'CONSISTENCY', 'reconciliation detects a contract whose opportunity stage is behind and repairs it on request (editor refused)', recEd.status === 403 && !!found && found.fixed === false && rep2.status === 200 && stNow === 'WON_SIGNED', { editor: recEd.status, found, stNow });
    rec.add('APP-RECONCILE-LEDGER', 'CONSISTENCY', 'reconciliation detects on-hand stock that cannot be explained by receipts, adjustments and shipments', !!stockDrift && stockDrift.detail?.onHand === stockBefore + 3 && stockDrift.detail?.ledgerOnHand === stockBefore, stockDrift);
  }
  // ---------- KPI ----------
  {
    const k = await s.OWNER.get('/api/reports/kpi');
    rec.add('APP-KPI-OWNER', 'KPI', 'owner KPI report: identities hold, pipeline separate', k.status === 200 && Object.values(k.json.identities).every(Boolean) && typeof k.json.pipeline['KPI-008_qualifiedOpenPipelineEgp'] === 'number' && k.json.kpi['KPI-001_websiteSourced'] >= 250000000, { kpi: k.json?.kpi, identities: k.json?.identities });
    const ke = await s.EDITOR.get('/api/reports/kpi');
    rec.add('APP-KPI-EDITOR', 'KPI', 'editor cannot read KPI report', ke.status === 403, ke.status);
    const ko = (await s.OWNER.get('/api/reports/kpi')).json;
    rec.add('APP-KPI-CROSSTAB', 'KPI', 'class × cohort cross-tab present and consistent', !!ko?.byClassCohort?.WEBSITE_SOURCED && ko.identities.crossTabConsistent === true, ko?.identities);
    rec.add('APP-KPI-NORTHSTAR-PENDING', 'KPI', 'North Star not hardcoded: pending owner decision', ko?.northStar?.selected === 'UNSELECTED' && ko.northStar.status === 'PENDING_OWNER_DECISION' && ko.northStar.value === null, ko?.northStar);
    const nsAdmin = await s.ADMIN.post('/api/globals/settings', { northStarKpi: 'KPI-001_websiteSourced' });
    const nsRow = (await su.query(`SELECT north_star_kpi FROM cms.settings LIMIT 1`)).rows[0];
    rec.add('APP-KPI-NORTHSTAR-OWNER-ONLY', 'KPI', 'only the owner can select the North Star', nsAdmin.status === 403 && (nsRow?.north_star_kpi ?? 'UNSELECTED') === 'UNSELECTED', { status: nsAdmin.status, nsRow });
    const f = ko?.funnel ?? {};
    rec.add('APP-KPI-FUNNEL', 'KPI', 'funnel KPIs 010/011/013/014 reported with their counts; 009/012 explicitly BLOCKED', 'KPI-010_rfqQualificationRatePct' in f && 'KPI-011_proposalToSignedPct' in f && 'KPI-013_medianSignedValueMinor' in f && 'KPI-014_medianSalesCycleDays' in f && typeof f.counts?.validRfqs === 'number' && /BLOCKED/.test(f.blocked?.['KPI-009_grossMarginPct'] ?? ''), f);
    const bad = await s.OWNER.get('/api/reports/kpi?from=2026-05-01T00:00:00Z&to=2026-04-01T00:00:00Z');
    rec.add('APP-KPI-PERIOD', 'KPI', 'reversed period refused', bad.status === 400, bad.status);
    const ov = await s.OWNER.post(`/api/contracts/${signed.json.contractId}/attribution`, { to: 'WEBSITE_ASSISTED' });
    rec.add('APP-ATTR-OVERRIDE-REASON', 'KPI', 'attribution override without reason refused', ov.status === 422 && ov.json?.code === 'REASON_REQUIRED', ov.json);
  }
  // ---------- claims governance (WAVE 1 finding W1-F1): owner + evidence only; synthetic claim, always withdrawn ----------
  {
    const code = `TEST-${randomUUID().slice(0, 6)}`;
    const mk = await s.ENGINEER.post('/api/claims?locale=en', { code, claim: 'Synthetic test claim (not a product claim)', status: 'REVIEW_PENDING' });
    const id = mk.json?.doc?.id;
    try {
      const eng = await s.ENGINEER.patch(`/api/claims/${id}?locale=en`, { status: 'CERTIFIED', evidenceRef: 'x', evidenceNote: 'x', certificateRef: 'x' });
      const adm = await s.ADMIN.patch(`/api/claims/${id}?locale=en`, { status: 'INDEPENDENTLY_DEMONSTRATED', evidenceRef: 'x', evidenceNote: 'x' });
      rec.add('APP-CLAIM-APPROVE-ROLE', 'CLAIMS', 'engineer/admin cannot make a claim publishable', eng.status === 403 && adm.status === 403, { eng: eng.status, adm: adm.status });
      const noEv = await s.OWNER.patch(`/api/claims/${id}?locale=en`, { status: 'INDEPENDENTLY_DEMONSTRATED' });
      rec.add('APP-CLAIM-EVIDENCE', 'CLAIMS', 'owner needs evidence reference + note', noEv.status === 422 && noEv.text.includes('CLAIM_EVIDENCE_REQUIRED'), noEv.text.slice(0, 120));
      const noCert = await s.OWNER.patch(`/api/claims/${id}?locale=en`, { status: 'CERTIFIED', evidenceRef: 'TR-SYN-1', evidenceNote: 'synthetic' });
      rec.add('APP-CLAIM-CERTIFICATE', 'CLAIMS', 'CERTIFIED needs a certificate reference', noCert.status === 422 && noCert.text.includes('CLAIM_CERTIFICATE_REQUIRED'), noCert.text.slice(0, 120));
      const ok = await s.OWNER.patch(`/api/claims/${id}?locale=en`, { status: 'INDEPENDENTLY_DEMONSTRATED', evidenceRef: 'TR-SYN-1', evidenceNote: 'synthetic', approvedBy: 'forged' });
      const row = (await su.query(`SELECT approved_by, status FROM cms.claims WHERE id=$1`, [id])).rows[0];
      rec.add('APP-CLAIM-OWNER-APPROVE', 'CLAIMS', 'owner approval with evidence records the real approver', ok.status === 200 && row.approved_by === String(byRole('OWNER').id), row);
      const edit = await s.ENGINEER.patch(`/api/claims/${id}?locale=en`, { claim: 'Reworded by engineer' });
      rec.add('APP-CLAIM-LOCKED', 'CLAIMS', 'non-owner cannot reword a publishable claim', edit.status === 403, edit.status);
      const p = await su.query(`SELECT id FROM cms.claims WHERE code='CL-09'`);
      const proh = await s.OWNER.patch(`/api/claims/${p.rows[0].id}?locale=en`, { status: 'INDEPENDENTLY_DEMONSTRATED', evidenceRef: 'x', evidenceNote: 'x' });
      rec.add('APP-CLAIM-PROHIBITED', 'CLAIMS', 'a PROHIBITED claim can never become publishable', proh.status === 409, proh.status);
    } finally {
      await s.OWNER.patch(`/api/claims/${id}?locale=en`, { status: 'LEGALLY_BARRED' });
      const left = (await su.query(`SELECT count(*)::int n FROM cms.claims WHERE status IN ('INDEPENDENTLY_DEMONSTRATED','CERTIFIED')`)).rows[0].n;
      rec.add('APP-CLAIM-CLEANUP', 'CLAIMS', 'no publishable claim left behind by the test', left === 0, left);
    }
  }
  // ---------- W1 behind the gate: flip to COMMERCIAL only inside try/finally, always restore PREVIEW ----------
  {
    const flipEd = await s.EDITOR.post('/api/globals/settings', { stage: 'COMMERCIAL' });
    const st0 = (await su.query(`SELECT stage FROM cms.settings LIMIT 1`)).rows[0]?.stage;
    rec.add('APP-W1-STAGE-FLIP-ROLE', 'W1', 'editor cannot switch the site to COMMERCIAL', flipEd.status === 403 && st0 === 'PREVIEW', { status: flipEd.status, st0 });
    // WAVE 7 public store routes are closed in PREVIEW
    const closed = await Promise.all([
      anon.req('POST', '/api/shop/cart/price', { json: { lines: [{ skuId: 'sku-rc04', qty: 1 }] } }),
      anon.req('POST', '/api/shop/quotes', { json: {} }),
      anon.get('/api/shop/orders/QTE-2026-XXXXXX'),
      anon.req('POST', '/api/shop/orders/QTE-2026-XXXXXX/accept-quote', { json: {} }),
    ]);
    rec.add('APP-W7-PREVIEW-CLOSED', 'W7', 'cart pricing, quote request, order status and quote acceptance are 404 in PREVIEW', closed.every((r) => r.status === 404), closed.map((r) => r.status));
    const fake = randomUUID();
    const roleChecks = await Promise.all([
      s.EDITOR.post(`/api/admin/orders/${fake}/allocate`, {}),
      s.EDITOR.post(`/api/admin/orders/${fake}/cancel`, { reason: 'x' }),
      s.STORE.post(`/api/admin/orders/${fake}/quote`, { quoteMinor: 1, validUntil: '2099-01-01T00:00:00Z' }),
      s.ENGINEER.post(`/api/admin/orders/${fake}/payments`, { method: 'COD', amountMinor: 1 }),
    ]);
    rec.add('APP-W7-STAFF-ROLES', 'W7', 'editor cannot allocate/cancel; store cannot issue quotes; engineer cannot record payments', roleChecks.every((r) => r.status === 403), roleChecks.map((r) => r.status));
    const labAnon = await anon.req('POST', '/api/admin/commerce-lab/review', { json: { lines: [{ skuId: 'sku-rc04', qty: 1 }] } });
    const labEditor = await s.EDITOR.post('/api/admin/commerce-lab/review', { lines: [{ skuId: 'sku-rc04', qty: 1 }] });
    const labStore = await s.STORE.post('/api/admin/commerce-lab/review', { lines: [{ skuId: 'sku-rc04', qty: 1 }] });
    rec.add('APP-S10-COMMERCE-LAB-RBAC', 'S10', 'local synthetic cart review requires MFA staff permission and cannot bypass missing price approval', labAnon.status === 401 && labEditor.status === 403 && labStore.status === 422 && labStore.json?.code === 'PRICE_NOT_APPROVED', { anonymous: labAnon.status, editor: labEditor.status, store: labStore.status });
    const nf = await s.OWNER.post(`/api/admin/orders/${fake}/quote`, { quoteMinor: 1, validUntil: '2099-01-01T00:00:00Z' });
    rec.add('APP-W7-QUOTE-NOT-FOUND', 'W7', 'owner quote on an unknown order → 404', nf.status === 404, nf.status);
    try {
      const flip = await s.OWNER.post('/api/globals/settings', { stage: 'COMMERCIAL' });
      rec.add('APP-W1-STAGE-FLIP-OWNER', 'W1', 'owner (MFA) can switch stage (local test only)', flip.status === 200, flip.status);
      const ord = { idempotencyKey: randomUUID().replace(/-/g, ''), lines: [{ skuId: 'sku-rc04', qty: 1 }], customer: { name: 'Synthetic Buyer', email: 'buyer@example.com' }, governorate: 'CAIRO', paymentMethod: 'COD' };
      const o = await anon.req('POST', '/api/shop/orders', { json: ord, headers: { 'x-forwarded-for': ip() } });
      rec.add('APP-W1-ORDER-NO-PRICE', 'W1', 'COMMERCIAL order refused while no price is approved (no invented prices)', o.status === 422 && o.json?.code === 'PRICE_NOT_APPROVED', o.json);
      const badLines = await anon.req('POST', '/api/shop/orders', { json: { ...ord, idempotencyKey: randomUUID().replace(/-/g, ''), lines: [] }, headers: { 'x-forwarded-for': ip() } });
      rec.add('APP-W1-ORDER-VALIDATION', 'W1', 'empty order refused', badLines.status === 422 && badLines.json?.code === 'INVALID_LINES', badLines.json);
      const pe = await s.EDITOR.post('/api/admin/prices', { skuId: 'sku-rc04', priceMinor: 1, vatIncluded: true });
      const pa = await s.STORE.post(`/api/admin/prices/${randomUUID()}/approve`, {});
      rec.add('APP-W1-PRICE-ROLES', 'W1', 'editor cannot propose prices; store cannot approve prices', pe.status === 403 && pa.status === 403, { editor: pe.status, store: pa.status });
      const unknown = await anon.req('POST', '/api/warranty/claims', { json: { serial: 'NOPE-0000', contactName: 'S', contactEmail: 's@example.com', description: 'Synthetic description that is long enough.' }, headers: { 'x-forwarded-for': ip() } });
      rec.add('APP-W1-CLAIM-UNKNOWN-SERIAL', 'W1', 'claim for unknown serial refused', unknown.status === 422 && unknown.json?.code === 'SERIAL_NOT_RECOGNISED', unknown.json);
      const serial = `SYN-ACC-${randomUUID().slice(0, 6).toUpperCase()}`;
      const reg = await s.STORE.post('/api/admin/serials', { serial, skuId: 'sku-rc04', status: 'INSTALLED' });
      rec.add('APP-W1-SERIAL-REGISTER', 'W1', 'store registers a (synthetic) serial', reg.status === 200, reg.json);
      const cov = await s.ENGINEER.post(`/api/admin/serials/${serial}/coverage`, { startsAt: new Date().toISOString() });
      rec.add('APP-W1-COVERAGE-BLOCKED', 'W1', 'coverage cannot start: warranty policy/duration not approved (DR-024 BLOCKED)', cov.status === 422 && cov.json?.code === 'WARRANTY_POLICY_NOT_APPROVED', cov.json);
      const cl = await anon.req('POST', '/api/warranty/claims', { json: { serial: serial.toLowerCase(), contactName: 'Synthetic', contactPhone: '+201000000000', description: 'Channel 3 relay does not switch (synthetic).' }, headers: { 'x-forwarded-for': ip() } });
      rec.add('APP-W1-CLAIM-SUBMIT', 'W1', 'claim accepted for triage; no coverage decision disclosed', cl.status === 201 && /^WCL-\d{4}-/.test(cl.json?.ref) && !('coverageAtSubmit' in (cl.json ?? {})), cl.json);
      const cid2 = (await su.query(`SELECT id, coverage_at_submit FROM domain.warranty_claims WHERE ref=$1`, [cl.json?.ref])).rows[0];
      const noReason = await s.ENGINEER.post(`/api/admin/warranty-claims/${cid2?.id}/decision`, { decision: 'REJECTED' });
      const edDecide = await s.EDITOR.post(`/api/admin/warranty-claims/${cid2?.id}/decision`, { decision: 'ACCEPTED', reason: 'x' });
      const ok = await s.ENGINEER.post(`/api/admin/warranty-claims/${cid2?.id}/decision`, { decision: 'REJECTED', reason: 'Synthetic: test decision' });
      // WAVE 7 in COMMERCIAL: cart refuses unpriced SKUs; a custom-quote request gives a token-protected status; staff cancel it
      const cart = await anon.req('POST', '/api/shop/cart/price', { json: { lines: [{ skuId: 'sku-rc04', qty: 1 }] }, headers: { 'x-forwarded-for': ip() } });
      rec.add('APP-W7-CART-NO-PRICE', 'W7', 'cart pricing refuses SKUs without an approved price', cart.status === 422 && cart.json?.code === 'PRICE_NOT_APPROVED', cart.json);
      const qr = await anon.req('POST', '/api/shop/quotes', { json: { idempotencyKey: randomUUID().replace(/-/g, ''), lines: [{ skuId: 'sku-rc16', qty: 2 }], requirements: 'Synthetic test: custom scene firmware for a demo — not a real request.', customer: { name: 'Synthetic', email: 's@example.com' }, governorate: 'CAIRO' }, headers: { 'x-forwarded-for': ip() } });
      rec.add('APP-W7-QUOTE-REQUEST', 'W7', 'custom-firmware quote request accepted with an access token', qr.status === 201 && /^QTE-\d{4}-/.test(qr.json?.ref) && (qr.json?.accessToken ?? '').length >= 40, { status: qr.status, ref: qr.json?.ref });
      const wrong = await anon.req('GET', `/api/shop/orders/${qr.json?.ref}`, { headers: { 'x-order-token': 'forged', 'x-forwarded-for': ip() } });
      const right = await anon.req('GET', `/api/shop/orders/${qr.json?.ref}`, { headers: { 'x-order-token': qr.json?.accessToken ?? '', 'x-forwarded-for': ip() } });
      rec.add('APP-W7-ORDER-STATUS-TOKEN', 'W7', 'order status needs the access token (no oracle for wrong token)', wrong.status === 404 && right.status === 200 && right.json?.status === 'QUOTE_PENDING' && right.json?.quote === null, { wrong: wrong.status, right: right.json });
      const qid = (await su.query(`SELECT id FROM domain.orders WHERE ref=$1`, [qr.json?.ref])).rows[0]?.id;
      const cancel = await s.STORE.post(`/api/admin/orders/${qid}/cancel`, { reason: 'synthetic test request' });
      rec.add('APP-W7-CANCEL', 'W7', 'store cancels the synthetic quote request with a reason', cancel.status === 200 && cancel.json?.status === 'CANCELLED', cancel.json);
      rec.add('APP-W1-CLAIM-DECISION', 'W1', 'decision needs a reason and an authorised role', noReason.status === 422 && edDecide.status === 403 && ok.status === 200 && cid2?.coverage_at_submit === 'NO_COVERAGE_RECORD', { noReason: noReason.status, editor: edDecide.status, ok: ok.status });
    } finally {
      await s.OWNER.post('/api/globals/settings', { stage: 'PREVIEW' });
      const back = await anon.req('POST', '/api/shop/orders', { json: {} });
      rec.add('APP-W1-ROLLBACK', 'W1', 'back to PREVIEW: order endpoint disabled again', back.status === 404, back.status);
    }
  }
  // ---------- editorial workflow + consent gate (case studies) ----------
  {
    const cs = await s.EDITOR.post('/api/case-studies?locale=ar&draft=true', { slug: `case-${randomUUID().slice(0, 6)}`, title: 'دراسة حالة تجريبية', body: 'وصف تجريبي' });
    const id = cs.json?.doc?.id;
    await s.EDITOR.patch(`/api/case-studies/${id}?locale=en&draft=true`, { title: 'Synthetic case', body: 'Synthetic body' });
    await s.EDITOR.patch(`/api/case-studies/${id}`, { workflowStatus: 'IN_REVIEW' });
    await s.ENGINEER.patch(`/api/case-studies/${id}`, { workflowStatus: 'APPROVED' });
    const pub = await s.ADMIN.patch(`/api/case-studies/${id}`, { workflowStatus: 'PUBLISHED', _status: 'published' });
    rec.add('APP-CASE-NO-CONSENT', 'CMS', 'case study cannot be published without written consent', pub.status === 422 && pub.text.includes('CONSENT_NOT_VALID'), pub.text.slice(0, 160));
    const list = await anon.get('/en/projects');
    rec.add('APP-CASE-NOT-PUBLIC', 'CMS', 'unpublished case study not shown publicly', !list.text.includes('Synthetic case'), null);
  }
  await su.end();
  const out = path.join(APP_ROOT, 'tests', 'results');
  mkdirSync(out, { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), summary: rec.summary(), total: rec.checks.length, failed: rec.checks.filter((c) => !c.pass).length, checks: rec.checks };
  writeFileSync(path.join(out, 'acceptance-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary), `total=${report.total} failed=${report.failed}`);
  process.exit(report.failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
