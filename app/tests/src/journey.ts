// WAVE 3 — full B2B preview journey against the running local build (synthetic data only):
// website RFQ → triage → qualification → conversion (org/contact matching, duplicate guard) → consultation → paid survey →
// proposal → owner approval → sent → signature → attribution + cohort in the KPI report. Every skip attempt must be refused.
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
type U = { id: number; email: string; role: string; password: string; totp: string };
const users: U[] = JSON.parse(readFileSync(path.join(SECRETS_DIR, 'dev_users.json'), 'utf8'));
const START = Math.floor(Date.now() / 30000);
const ip = () => `10.${Array.from(randomBytes(3)).join('.')}`;
const tag = randomBytes(3).toString('hex');

async function staff(role: string) {
  const u = users.find((x) => x.role === role)!;
  const c = new Client(BASE, role, true);
  await c.post('/api/users/login', { email: u.email, password: u.password });
  while (Math.floor(Date.now() / 30000) <= START) await sleep(1000);
  const v = await c.post('/api/mfa/verify', { code: await generate({ secret: u.totp }) });
  if (v.status !== 200) throw new Error(`mfa ${role} ${v.status}`);
  return c;
}

async function main() {
  const anon = new Client(BASE, 'anon', true);
  const eng = await staff('ENGINEER');
  const owner = await staff('OWNER');
  const editor = await staff('EDITOR');
  const org = `Synthetic Developments ${tag}`;
  const email = `journey+${tag}@example.com`;
  const rfq = (over: Record<string, unknown> = {}) => ({
    kind: 'RFQ', idempotencyKey: randomUUID().replace(/-/g, ''), locale: 'ar', fullName: 'عميل رحلة تجريبي', email, phone: `0100${String(parseInt(tag, 16) % 10_000_000).padStart(7, '0')}`,
    organisationName: org, customerType: 'DEVELOPER', projectType: 'COMPOUND', governorate: 'GIZA', units: 80, systems: ['LIGHTING'],
    engagementModel: 'SUPPLY_INSTALL_PROGRAM', description: 'مشروع تجريبي لرحلة العميل الكاملة — بيانات اصطناعية.', consentProcessing: true,
    attribution: { landingPage: '/ar/business/developers', utm: { source: 'synthetic', medium: 'journey' } }, ...over,
  });

  // ---- 1. public pages along the journey ----
  for (const p of ['/ar', '/ar/solutions', '/ar/projects', '/ar/business/request-a-proposal']) rec.add(`J-PAGE${p}`, 'JOURNEY', `${p} reachable`, (await anon.get(p)).status === 200, null);

  // ---- 2. intake protections ----
  const mp = await anon.req('POST', '/api/rfq', { body: (() => { const f = new FormData(); f.append('file', new Blob(['%PDF-1.4 synthetic'], { type: 'application/pdf' }), 'plan.pdf'); f.append('fullName', 'x'); return f; })(), headers: { 'x-forwarded-for': ip() } });
  rec.add('J-NO-UPLOAD-RFQ', 'P-A', 'multipart/file submission to the RFQ endpoint is refused (variant P-A: no uploads)', mp.status >= 400 && mp.status < 500, mp.status);
  const pf = await anon.req('POST', '/api/private-files', { body: (() => { const f = new FormData(); f.append('file', new Blob(['%PDF-1.4 synthetic'], { type: 'application/pdf' }), 'plan.pdf'); return f; })() });
  rec.add('J-NO-UPLOAD-ANON', 'P-A', 'anonymous upload to private files refused', pf.status === 401 || pf.status === 403, pf.status);
  const broken = await anon.req('POST', '/api/rfq', { body: '{"fullName": "x", ', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip() } });
  rec.add('J-MALFORMED', 'RFQ', 'malformed JSON gets a clean 4xx (no 500, nothing stored)', broken.status >= 400 && broken.status < 500, broken.status);

  // ---- 3. submission + recovery (client retry with the same key after a lost response) ----
  const body1 = rfq();
  const r1 = await anon.req('POST', '/api/rfq', { json: body1, headers: { 'x-forwarded-for': ip() } });
  const retry = await anon.req('POST', '/api/rfq', { json: body1, headers: { 'x-forwarded-for': ip() } });
  rec.add('J-RFQ-SUBMIT', 'RFQ', 'website RFQ accepted; a retry after a lost response returns the same reference', r1.status === 201 && retry.json?.ref === r1.json?.ref, { r1: r1.json, retry: retry.json });
  const rid = (await su.query(`SELECT id FROM cms.rfqs WHERE ref=$1`, [r1.json.ref])).rows[0].id;

  // ---- 4. triage: no skipping, no conversion before qualification ----
  const early = await eng.post(`/api/workspace/rfqs/${rid}/convert`, {});
  rec.add('J-CONVERT-UNQUALIFIED', 'JOURNEY', 'an unqualified RFQ cannot become an opportunity', early.status === 409 && early.json?.code === 'RFQ_NOT_QUALIFIED', early.json);
  const edConv = await editor.post(`/api/workspace/rfqs/${rid}/convert`, {});
  rec.add('J-CONVERT-ROLE', 'JOURNEY', 'editor cannot convert RFQs', edConv.status === 403, edConv.status);
  const forgeLink = await eng.patch(`/api/rfqs/${rid}`, { opportunity: 1 });
  const linkRow = (await su.query(`SELECT opportunity_id FROM cms.rfqs WHERE id=$1`, [rid])).rows[0];
  rec.add('J-RFQ-LINK-SYSTEM-ONLY', 'JOURNEY', 'RFQ→opportunity link cannot be set through the generated API', linkRow.opportunity_id === null, { status: forgeLink.status, linkRow });
  rec.add('J-TRIAGE-1', 'JOURNEY', 'SUBMITTED → INITIAL_QUALIFICATION', (await eng.patch(`/api/rfqs/${rid}`, { status: 'INITIAL_QUALIFICATION' })).status === 200, null);
  rec.add('J-TRIAGE-NEEDS-INFO', 'JOURNEY', 'INITIAL_QUALIFICATION → NEEDS_INFO → back', (await eng.patch(`/api/rfqs/${rid}`, { status: 'NEEDS_INFO' })).status === 200 && (await eng.patch(`/api/rfqs/${rid}`, { status: 'INITIAL_QUALIFICATION' })).status === 200, null);
  rec.add('J-TRIAGE-QUALIFIED', 'JOURNEY', '→ QUALIFIED', (await eng.patch(`/api/rfqs/${rid}`, { status: 'QUALIFIED' })).status === 200, null);
  const reopen = await eng.patch(`/api/rfqs/${rid}`, { status: 'SUBMITTED' });
  rec.add('J-QUALIFIED-FINAL', 'JOURNEY', 'QUALIFIED is terminal for triage (no silent reopening)', reopen.status === 409, reopen.status);

  // ---- 5. conversion with organisation matching ----
  await owner.post('/api/organisations', { legalName: `${org} S.A.E.` }); // a pre-existing record with a similar name
  const needChoice = await eng.post(`/api/workspace/rfqs/${rid}/convert`, {});
  rec.add('J-ORG-MATCH', 'JOURNEY', 'similar organisation found → explicit human choice required (no auto-merge)', needChoice.status === 409 && needChoice.json?.code === 'ORGANISATION_MATCH_REQUIRED' && needChoice.json.candidates?.length >= 1, needChoice.json);
  const orgId = needChoice.json?.candidates?.[0]?.id;
  const conv = await eng.post(`/api/workspace/rfqs/${rid}/convert`, { organisationId: orgId });
  rec.add('J-CONVERT', 'JOURNEY', 'qualified RFQ converted into an opportunity linked to the chosen organisation', conv.status === 201 && conv.json.organisationId === orgId && !!conv.json.contactId, conv.json);
  const again = await eng.post(`/api/workspace/rfqs/${rid}/convert`, { organisationId: orgId });
  rec.add('J-CONVERT-IDEMPOTENT', 'JOURNEY', 'second conversion returns the same opportunity', again.json?.opportunityId === conv.json?.opportunityId && again.json?.replay === true, again.json);
  const oid = conv.json.opportunityId;
  const opp = (await eng.get(`/api/opportunities/${oid}?depth=0`)).json;
  rec.add('J-OPP-ORIGIN', 'ATTRIBUTION', 'opportunity carries the RFQ link and website origin evidence (landing page, utm)', opp.stage === 'ENGINEERING_REVIEW' && opp.rfq === rid && opp.attributionProposal === 'WEBSITE_SOURCED' && /landing \/ar\/business\/developers/.test(opp.attributionEvidence ?? '') && /utm/.test(opp.attributionEvidence ?? ''), { stage: opp.stage, rfq: opp.rfq, ev: opp.attributionEvidence });
  const audit = (await su.query(`SELECT count(*)::int n FROM domain.audit_events WHERE action='rfq.convert' AND entity_id=$1`, [String(rid)])).rows[0].n;
  rec.add('J-CONVERT-AUDIT', 'AUDIT', 'conversion is audited exactly once', audit === 1, audit);

  // ---- 6. duplicate guard: a second RFQ from the same person ----
  const r2 = await anon.req('POST', '/api/rfq', { json: rfq({ description: 'طلب ثاني لنفس المشروع من نفس الشخص — بيانات اصطناعية.' }), headers: { 'x-forwarded-for': ip() } });
  const rid2 = (await su.query(`SELECT id FROM cms.rfqs WHERE ref=$1`, [r2.json.ref])).rows[0].id;
  await eng.patch(`/api/rfqs/${rid2}`, { status: 'INITIAL_QUALIFICATION' });
  await eng.patch(`/api/rfqs/${rid2}`, { status: 'QUALIFIED' });
  const dup = await eng.post(`/api/workspace/rfqs/${rid2}/convert`, { organisationId: orgId });
  rec.add('J-DUP-OPP', 'JOURNEY', 'possible duplicate opportunity detected before creating another', dup.status === 409 && dup.json?.code === 'POSSIBLE_DUPLICATE_OPPORTUNITY' && dup.json.candidates?.[0]?.id === oid, dup.json);
  const noReason = await eng.post(`/api/workspace/rfqs/${rid2}/convert`, { organisationId: orgId, confirmNotDuplicate: true });
  rec.add('J-DUP-REASON', 'JOURNEY', 'overriding the duplicate warning needs a reason', noReason.status === 422, noReason.json);
  const link = await eng.post(`/api/workspace/rfqs/${rid2}/convert`, { linkToOpportunityId: oid });
  rec.add('J-DUP-LINK', 'JOURNEY', 'the duplicate RFQ is attached to the existing opportunity instead', link.status === 200 && link.json.opportunityId === oid, link.json);

  // ---- 7. opportunity pipeline with consultation + paid survey ----
  const step = (c: Client, d: any) => c.patch(`/api/opportunities/${oid}`, d);
  rec.add('J-OPP-CONSULT', 'JOURNEY', '→ FREE_CONSULTATION', (await step(eng, { stage: 'FREE_CONSULTATION' })).status === 200, null);
  rec.add('J-OPP-SKIP-SIGN', 'JOURNEY', 'consultation cannot jump to PROPOSAL_SENT', (await step(eng, { stage: 'PROPOSAL_SENT' })).status === 409, null);
  rec.add('J-OPP-SURVEY', 'JOURNEY', '→ PAID_SITE_SURVEY with fee agreement', (await step(eng, { stage: 'PAID_SITE_SURVEY', surveyFeeAgreed: true, surveyInvoiceRef: `INV-SYN-${tag}` })).status === 200, null);
  rec.add('J-OPP-DRAFT', 'JOURNEY', '→ PROPOSAL_DRAFT (version increments)', (await step(eng, { stage: 'PROPOSAL_DRAFT' })).status === 200, null);
  const valid = new Date(Date.now() + 30 * 86400_000).toISOString();
  rec.add('J-OPP-APPROVE', 'JOURNEY', 'owner approves the complete proposal', (await step(owner, { stage: 'PROPOSAL_APPROVED', proposalDocumentRef: `doc:proposal-${tag}`, proposalValidUntil: valid, capacityCheckNote: 'Synthetic capacity check' })).status === 200, null);
  rec.add('J-OPP-SENT', 'JOURNEY', '→ PROPOSAL_SENT', (await step(eng, { stage: 'PROPOSAL_SENT' })).status === 200, null);
  const fakeRfq = await eng.patch(`/api/opportunities/${oid}`, { rfq: rid2, attributionProposal: 'NON_WEBSITE' });
  const after = (await eng.get(`/api/opportunities/${oid}?depth=0`)).json;
  rec.add('J-OPP-RFQ-SYSTEM-ONLY', 'ATTRIBUTION', 'opportunity→RFQ link cannot be rewritten through the API', after.rfq === rid, { status: fakeRfq.status, rfq: after.rfq });
  await eng.patch(`/api/opportunities/${oid}`, { attributionProposal: 'WEBSITE_SOURCED' }); // restore the evidenced proposal

  // ---- 8. direct (non-RFQ) opportunity claiming website origin without evidence ----
  const direct = await eng.post('/api/opportunities', { ref: `OPP-DIRECT-${tag}`, attributionProposal: 'WEBSITE_SOURCED' });
  rec.add('J-ATTR-EVIDENCE', 'ATTRIBUTION', 'website attribution without RFQ link or evidence is refused', direct.status === 422 && direct.text.includes('ATTRIBUTION_EVIDENCE_REQUIRED'), direct.text.slice(0, 160));

  // ---- 9. signature → attribution + cohort ----
  const k0 = (await owner.get('/api/reports/kpi')).json;
  const sign = await owner.post(`/api/workspace/opportunities/${oid}/sign-contract`, { signedValueMinor: 123_400_00, evidenceRef: `file:signed-${tag}` });
  rec.add('J-SIGN', 'CONTRACT', 'owner signs; attribution WEBSITE_SOURCED locked; first contract of the organisation is NEW', sign.status === 200 && sign.json.attribution === 'WEBSITE_SOURCED' && sign.json.cohort === 'NEW', sign.json);
  const frozen = await eng.patch(`/api/opportunities/${oid}`, { attributionProposal: 'NON_WEBSITE' });
  const fz = (await eng.get(`/api/opportunities/${oid}?depth=0`)).json;
  rec.add('J-ATTR-FROZEN', 'ATTRIBUTION', 'after signature the CMS attribution proposal is frozen', fz.attributionProposal === 'WEBSITE_SOURCED', { status: frozen.status, value: fz.attributionProposal });
  const k1 = (await owner.get('/api/reports/kpi')).json;
  const d = k1.kpi['KPI-001_websiteSourced'] - k0.kpi['KPI-001_websiteSourced'];
  rec.add('J-KPI', 'KPI', 'KPI-001 increased by exactly the signed value; identities hold', d === 123_400_00 && Object.values(k1.identities).every(Boolean), { delta: d, identities: k1.identities });

  // a NEW request from the same person after the deal is signed is a new project, not a duplicate (regression W4)
  const r3 = await anon.req('POST', '/api/rfq', { json: rfq({ description: 'مشروع جديد لنفس العميل بعد التوقيع — بيانات اصطناعية.' }), headers: { 'x-forwarded-for': ip() } });
  const rid3 = (await su.query(`SELECT id FROM cms.rfqs WHERE ref=$1`, [r3.json.ref])).rows[0].id;
  await eng.patch(`/api/rfqs/${rid3}`, { status: 'INITIAL_QUALIFICATION' });
  await eng.patch(`/api/rfqs/${rid3}`, { status: 'QUALIFIED' });
  const conv3 = await eng.post(`/api/workspace/rfqs/${rid3}/convert`, { organisationId: orgId });
  rec.add('J-AFTER-SIGN-NOT-DUP', 'JOURNEY', 'after signature, a new RFQ from the same customer converts without a duplicate warning', conv3.status === 201, conv3.json);

  // second opportunity for the same organisation → EXISTING cohort
  const opp2 = await eng.post('/api/opportunities', { ref: `OPP-REPEAT-${tag}`, organisation: orgId, attributionProposal: 'NON_WEBSITE' });
  const o2 = opp2.json?.doc?.id;
  for (const st of ['PROPOSAL_DRAFT']) await eng.patch(`/api/opportunities/${o2}`, { stage: st });
  await owner.patch(`/api/opportunities/${o2}`, { stage: 'PROPOSAL_APPROVED', proposalDocumentRef: 'doc:p2', proposalValidUntil: valid, capacityCheckNote: 'Synthetic' });
  await eng.patch(`/api/opportunities/${o2}`, { stage: 'PROPOSAL_SENT' });
  const sign2 = await owner.post(`/api/workspace/opportunities/${o2}/sign-contract`, { signedValueMinor: 10_000_00, evidenceRef: `file:signed2-${tag}` });
  rec.add('J-COHORT-EXISTING', 'KPI', 'second contract of the same organisation is EXISTING and NON_WEBSITE', sign2.status === 200 && sign2.json.cohort === 'EXISTING' && sign2.json.attribution === 'NON_WEBSITE', sign2.json);

  await su.end();
  const out = path.join(APP_ROOT, 'tests', 'results');
  mkdirSync(out, { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), summary: rec.summary(), total: rec.checks.length, failed: rec.checks.filter((c) => !c.pass).length, checks: rec.checks };
  writeFileSync(path.join(out, 'journey-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary), `total=${report.total} failed=${report.failed}`);
  process.exit(report.failed ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(2);
});
