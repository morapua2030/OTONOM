// WAVE 8 — warranty portal + service foundation over HTTP (synthetic data; COMMERCIAL only inside try/finally).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
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
const tag = randomBytes(3).toString('hex').toUpperCase();
const ip = () => `10.${Array.from(randomBytes(3)).join('.')}`;

async function staff(role: string) {
  const u = users.find((x) => x.role === role)!;
  const c = new Client(BASE, role, true);
  await c.post('/api/users/login', { email: u.email, password: u.password });
  while (Math.floor(Date.now() / 30000) <= START) await sleep(1000);
  if ((await c.post('/api/mfa/verify', { code: await generate({ secret: u.totp }) })).status !== 200) throw new Error(`mfa ${role}`);
  return c;
}

async function main() {
  const anon = new Client(BASE, 'anon', true);
  const owner = await staff('OWNER');
  const store = await staff('STORE');
  const eng = await staff('ENGINEER');
  const closed = await Promise.all([anon.req('POST', '/api/account/register', { json: {} }), anon.get('/api/account/devices'), anon.req('POST', '/api/account/devices/claim', { json: {} }), anon.get('/api/account/tickets')]);
  rec.add('P-PREVIEW-CLOSED', 'PORTAL', 'portal routes are 404 in PREVIEW', closed.every((r) => r.status === 404), closed.map((r) => r.status));
  const emails = [`cust-a-${tag}@example.com`.toLowerCase(), `cust-b-${tag}@example.com`.toLowerCase()];
  const pw = `Syn-${randomBytes(9).toString('base64url')}aA1!`;
  const serial = `SYN-PRT-${tag}`;
  try {
    await owner.post('/api/globals/settings', { stage: 'COMMERCIAL' });
    // ---- registration ----
    const weak = await anon.req('POST', '/api/account/register', { json: { email: emails[0], password: 'short' }, headers: { 'x-forwarded-for': ip() } });
    rec.add('P-REGISTER-POLICY', 'PORTAL', 'weak password refused', weak.status === 422, weak.json);
    const regA = await anon.req('POST', '/api/account/register', { json: { email: emails[0], password: pw, role: 'OWNER' }, headers: { 'x-forwarded-for': ip() } });
    const regA2 = await anon.req('POST', '/api/account/register', { json: { email: emails[0], password: pw }, headers: { 'x-forwarded-for': ip() } });
    await anon.req('POST', '/api/account/register', { json: { email: emails[1], password: pw }, headers: { 'x-forwarded-for': ip() } });
    const roleRow = (await su.query(`SELECT role FROM cms.users WHERE email=$1`, [emails[0]])).rows[0];
    rec.add('P-REGISTER', 'PORTAL', 'registration creates a CUSTOMER (role not client-controlled); same answer for existing e-mail', regA.status === 202 && regA2.status === 202 && roleRow?.role === 'CUSTOMER', { a: regA.status, again: regA2.status, role: roleRow?.role });
    const A = new Client(BASE, 'A', true);
    const B = new Client(BASE, 'B', true);
    await A.post('/api/users/login', { email: emails[0], password: pw });
    await B.post('/api/users/login', { email: emails[1], password: pw });
    // ---- customer privilege limits ----
    const aId = (await su.query(`SELECT id FROM cms.users WHERE email=$1`, [emails[0]])).rows[0].id;
    await A.patch(`/api/users/${aId}`, { role: 'OWNER' });
    const listU = await A.get('/api/users?limit=50');
    const adm = await A.get('/admin');
    rec.add('P-CUSTOMER-LIMITS', 'PORTAL', 'customer cannot escalate role, sees only self, cannot open the admin panel', (await su.query(`SELECT role FROM cms.users WHERE id=$1`, [aId])).rows[0].role === 'CUSTOMER' && (listU.json?.docs ?? []).length === 1 && adm.status !== 200, { users: listU.json?.docs?.length, admin: adm.status });
    const staffOnCustomer = await eng.get('/api/account/devices');
    const customerOnStaff = await A.post(`/api/admin/tickets/00000000-0000-0000-0000-000000000000/status`, { status: 'TRIAGE' });
    rec.add('P-SEPARATION', 'PORTAL', 'staff cannot use customer routes; customers cannot use staff routes', staffOnCustomer.status === 403 && customerOnStaff.status === 403, { staff: staffOnCustomer.status, customer: customerOnStaff.status });
    // ---- commissioning + ownership claim ----
    await store.post('/api/admin/serials', { serial, skuId: 'sku-rc06', status: 'INSTALLED' });
    const com = await eng.post(`/api/admin/serials/${serial}/commissioning`, { projectRef: `PRJ-SYN-${tag}`, installedAt: '2026-10-01T08:00:00Z', commissionedAt: '2026-10-01T15:00:00Z', technician: 'Synthetic Technician', checklist: { lighting: 'ok' } });
    rec.add('P-COMMISSION', 'PORTAL', 'engineer records commissioning; one-time claim code returned once', com.status === 200 && /^[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(com.json?.claimCode ?? ''), { status: com.status });
    const csrf = await A.req('POST', '/api/account/devices/claim', { json: { serial, commissioningCode: com.json?.claimCode }, headers: { origin: 'http://evil.example' } });
    rec.add('P-CSRF', 'PORTAL', 'cross-origin claim refused (session cookie not honoured or origin rejected)', csrf.status === 401 || csrf.status === 403, csrf.status);
    const bWrong = await B.post('/api/account/devices/claim', { serial, commissioningCode: 'AAAAA-BBBBB' });
    const unknown = await B.post('/api/account/devices/claim', { serial: 'NOPE-UNKNOWN-1', commissioningCode: 'AAAAA-BBBBB' });
    rec.add('P-CLAIM-NO-ORACLE', 'PORTAL', 'wrong code and unknown serial give the same refusal', bWrong.status === 422 && unknown.status === 422 && bWrong.json?.code === unknown.json?.code, { wrong: bWrong.json, unknown: unknown.json });
    const aClaim = await A.post('/api/account/devices/claim', { serial: serial.toLowerCase(), commissioningCode: com.json?.claimCode });
    const bAfter = await B.post('/api/account/devices/claim', { serial, commissioningCode: com.json?.claimCode });
    rec.add('P-CLAIM', 'PORTAL', 'owner claims with the code; the used code cannot be reused by anyone', aClaim.status === 200 && aClaim.json?.status === 'VERIFIED' && bAfter.status === 422, { a: aClaim.json, b: bAfter.status });
    const devA = await A.get('/api/account/devices');
    const devB = await B.get('/api/account/devices');
    const mine = (devA.json?.devices ?? []).find((x: any) => x.serial === serial);
    rec.add('P-DEVICES-SCOPED', 'PORTAL', 'each customer sees only own devices', !!mine && (devB.json?.devices ?? []).length === 0, { a: devA.json?.devices?.length, b: devB.json?.devices?.length });
    rec.add('P-NO-INVENTED-DATES', 'PORTAL', 'no coverage dates without an approved warranty policy', mine?.coverage === 'NO_COVERAGE_RECORD' && mine?.coverageEndsAt === null && mine?.coverageStartsAt === null, mine);
    // ---- tickets + IDOR ----
    const bTicket = await B.post('/api/service-tickets', { serial, category: 'FAULT', description: 'Synthetic: attempt to open a ticket on a foreign device.' });
    const ticketKey = `portal-${tag}-ticket`;
    const aTicket = await A.post('/api/service-tickets', { serial, category: 'FAULT', description: 'Synthetic: channel 2 does not respond after power cut.', idempotencyKey: ticketKey });
    const aReplay = await A.post('/api/service-tickets', { serial: serial.toLowerCase(), category: 'FAULT', description: 'Synthetic: channel 2 does not respond after power cut.', idempotencyKey: ticketKey });
    const aTamper = await A.post('/api/service-tickets', { serial, category: 'OTHER', description: 'Synthetic: changed payload with an already used key.', idempotencyKey: ticketKey });
    rec.add('P-TICKET-IDOR', 'PORTAL', 'ticket on a foreign device refused as not found; own device accepted', bTicket.status === 404 && aTicket.status === 201 && /^SRV-/.test(aTicket.json?.ref ?? ''), { b: bTicket.status, a: aTicket.json });
    rec.add('P-TICKET-IDEMPOTENCY', 'PORTAL', 'ticket replay returns the same ref and changed payload is rejected', aReplay.status === 200 && aReplay.json?.replay === true && aReplay.json?.ref === aTicket.json?.ref && aTamper.status === 409 && aTamper.json?.code === 'IDEMPOTENCY_KEY_REUSED', { replay: aReplay.json, tamper: aTamper.json });
    const tA0 = await A.get('/api/account/tickets');
    const tB = await B.get('/api/account/tickets');
    rec.add('P-TICKETS-SCOPED', 'PORTAL', 'ticket lists are per customer', (tA0.json?.tickets ?? []).length === 1 && (tB.json?.tickets ?? []).length === 0, { a: tA0.json?.tickets?.length, b: tB.json?.tickets?.length });
    // ---- W-08 safety escalation ----
    const sTicket = await A.post('/api/service-tickets', { serial, category: 'SAFETY', description: 'Synthetic: burning smell near the distribution board.' });
    const sid = (await su.query(`SELECT id FROM domain.service_tickets WHERE ref=$1`, [sTicket.json?.ref])).rows[0]?.id;
    const early = await eng.post(`/api/admin/tickets/${sid}/status`, { status: 'RESOLVED', resolution: 'synthetic' });
    const cb = await eng.post(`/api/admin/tickets/${sid}/callback`, { note: 'synthetic: resident called back, power isolated' });
    const done = await eng.post(`/api/admin/tickets/${sid}/status`, { status: 'RESOLVED', resolution: 'synthetic: fixed' });
    rec.add('P-SAFETY', 'PORTAL', 'safety ticket: URGENT + guidance (not an emergency service); cannot be resolved before a human callback', sTicket.status === 201 && sTicket.json?.priority === 'URGENT' && sTicket.json?.emergencyService === false && early.status === 422 && early.json?.code === 'SAFETY_CALLBACK_REQUIRED' && cb.status === 200 && done.status === 200, { open: sTicket.json, early: early.json, cb: cb.status, done: done.status });
    // ---- staff service flow ----
    const tid = (await su.query(`SELECT id FROM domain.service_tickets WHERE ref=$1`, [aTicket.json?.ref])).rows[0]?.id;
    const tri = await eng.post(`/api/admin/tickets/${tid}/status`, { status: 'TRIAGE' });
    const forbiddenAssignment = await store.post(`/api/admin/tickets/${tid}/assign`, { assignedTo: 'u-eng', reason: 'Synthetic unauthorized assignment attempt.', expectedRevision: tri.json?.revision });
    const assignment = await eng.post(`/api/admin/tickets/${tid}/assign`, { assignedTo: 'u-eng', reason: 'Synthetic assignment after controlled triage.', expectedRevision: tri.json?.revision });
    const staleAssignment = await eng.post(`/api/admin/tickets/${tid}/assign`, { assignedTo: 'u-owner', reason: 'Synthetic stale reassignment must be rejected.', expectedRevision: tri.json?.revision });
    rec.add('P-TICKET-ASSIGN', 'PORTAL', 'assignment requires service permission, reason and current revision', forbiddenAssignment.status === 403 && assignment.status === 200 && assignment.json?.revision === tri.json?.revision + 1 && staleAssignment.status === 409, { forbidden: forbiddenAssignment.status, assigned: assignment.status, stale: staleAssignment.status });
    const diagnosis = await eng.post(`/api/admin/tickets/${tid}/diagnoses`, {
      diagnosticStatus: 'HYPOTHESIS',
      observation: 'Synthetic internal observation must not appear in the customer timeline.',
      reproduction: 'Controlled isolated fixture test repeated twice.',
      hypothesis: 'Synthetic hypothesis awaiting supervisor review.',
      hardwareRevision: 'SYN-REV-A',
      softwareInfo: 'Synthetic fixture firmware only',
      partsNote: 'No parts consumed and no billing decision.',
    });
    const ownTimeline = await A.get(`/api/account/tickets/${aTicket.json?.ref}/timeline`);
    const foreignTimeline = await B.get(`/api/account/tickets/${aTicket.json?.ref}/timeline`);
    rec.add('P-TICKET-TIMELINE', 'PORTAL', 'customer timeline is owner-scoped and excludes structured internal diagnosis text', diagnosis.status === 200 && ownTimeline.status === 200 && foreignTimeline.status === 404 && !JSON.stringify(ownTimeline.json).includes('internal observation'), { diagnosis: diagnosis.status, own: ownTimeline.status, foreign: foreignTimeline.status });
    const rma = await eng.post(`/api/admin/tickets/${tid}/rma`, {});
    const noReason = await eng.post(`/api/admin/rmas/${rma.json?.id}/transition`, { to: 'APPROVED' });
    const storeRma = await store.post(`/api/admin/rmas/${rma.json?.id}/transition`, { to: 'APPROVED', reason: 'x' });
    rec.add('P-RMA', 'PORTAL', 'engineer opens RMA (coverage recorded, no auto-decision); decision needs a reason; store cannot decide', tri.status === 200 && rma.status === 200 && rma.json?.coverageAtRequest === 'NO_COVERAGE_RECORD' && noReason.status === 422 && storeRma.status === 403, { tri: tri.status, rma: rma.json, noReason: noReason.status, store: storeRma.status });
    const approve = await eng.post(`/api/admin/rmas/${rma.json?.id}/transition`, { to: 'APPROVED', reason: 'synthetic test approval for inspection' });
    const receive = await eng.post(`/api/admin/rmas/${rma.json?.id}/transition`, { to: 'RECEIVED' });
    const earlyInspect = await eng.post(`/api/admin/rmas/${rma.json?.id}/transition`, { to: 'INSPECTED' });
    const inspection = await eng.post(`/api/admin/rmas/${rma.json?.id}/inspections`, { condition: 'DAMAGED', serialMatches: true, notes: 'Synthetic inspection confirms the serial and keeps it quarantined.' });
    const inspected = await eng.post(`/api/admin/rmas/${rma.json?.id}/transition`, { to: 'INSPECTED' });
    const refundReview = await eng.post(`/api/admin/rmas/${rma.json?.id}/actions`, { action: 'REFUND_REVIEW', note: 'Synthetic review only; no refund was issued.' });
    await eng.post(`/api/admin/rmas/${rma.json?.id}/transition`, { to: 'REJECTED', reason: 'synthetic test — closing after inspection' });
    await eng.post(`/api/admin/rmas/${rma.json?.id}/transition`, { to: 'CLOSED' });
    const unitAfter = (await su.query(`SELECT status FROM domain.serial_units WHERE serial=$1`, [serial])).rows[0]?.status;
    const rmaEffects = Number((await su.query(`SELECT count(*)::int n FROM domain.inventory_ledger WHERE reference_type='rma' AND reference_id=$1 AND type='RETURN_QUARANTINE'`, [rma.json?.id])).rows[0]?.n);
    rec.add('P-RMA-INSPECTION', 'PORTAL', 'received unit is quarantined; inspection is mandatory; review causes no refund or restock', approve.status === 200 && receive.status === 200 && earlyInspect.status === 422 && earlyInspect.json?.code === 'INSPECTION_REQUIRED' && inspection.status === 200 && inspected.status === 200 && refundReview.status === 200 && unitAfter === 'QUARANTINED' && rmaEffects === 1, { approve: approve.status, receive: receive.status, early: earlyInspect.json, inspection: inspection.status, action: refundReview.status, unitAfter, rmaEffects });

    // ---- two-party ownership transfer; former owner loses access ----
    const bId = (await su.query(`SELECT id FROM cms.users WHERE email=$1`, [emails[1]])).rows[0].id;
    const transfer = await A.post(`/api/account/devices/${serial}/transfer`, { toCustomerRef: `user:${bId}` });
    const wrongTransfer = await B.post(`/api/account/device-transfers/${transfer.json?.id}/accept`, { token: 'WRONG-CODE1' });
    const acceptTransfer = await B.post(`/api/account/device-transfers/${transfer.json?.id}/accept`, { token: transfer.json?.token });
    const aAfterTransfer = await A.get('/api/account/devices');
    const bAfterTransfer = await B.get('/api/account/devices');
    rec.add('P-OWNERSHIP-TRANSFER', 'PORTAL', 'transfer requires the intended recipient and one-time token; former owner loses projection', transfer.status === 201 && wrongTransfer.status === 422 && acceptTransfer.status === 200 && !(aAfterTransfer.json?.devices ?? []).some((x: any) => x.serial === serial) && (bAfterTransfer.json?.devices ?? []).some((x: any) => x.serial === serial), { request: transfer.status, wrong: wrongTransfer.status, accept: acceptTransfer.status });

    const auditActions = (await su.query(`SELECT DISTINCT action FROM domain.audit_events WHERE action IN ('serial.commission','device.claim','ticket.open','ticket.status','rma.open','rma.rejected','rma.closed')`)).rows.map((r) => r.action).sort();
    rec.add('P-AUDIT', 'AUDIT', 'commissioning, claim, ticket and RMA steps are audited', auditActions.length === 7, { auditActions });
  } finally {
    await owner.post('/api/globals/settings', { stage: 'PREVIEW' });
    for (const e of emails) {
      const id = (await su.query(`SELECT id FROM cms.users WHERE email=$1`, [e])).rows[0]?.id;
      if (id) await owner.del(`/api/users/${id}`);
    }
    const back = await anon.get('/api/account/devices');
    rec.add('P-ROLLBACK', 'PORTAL', 'back to PREVIEW: portal closed; synthetic customers removed', back.status === 404 && Number((await su.query(`SELECT count(*)::int n FROM cms.users WHERE email = ANY($1)`, [emails])).rows[0].n) === 0, back.status);
  }
  await su.end();
  const out = path.join(APP_ROOT, 'tests', 'results');
  mkdirSync(out, { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), summary: rec.summary(), total: rec.checks.length, failed: rec.checks.filter((c) => !c.pass).length, checks: rec.checks };
  writeFileSync(path.join(out, 'portal-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary), `total=${report.total} failed=${report.failed}`);
  process.exit(report.failed ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(2);
});
