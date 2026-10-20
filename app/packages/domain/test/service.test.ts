// W1 warranty portal + service foundation against a disposable database (synthetic data only).
process.env.OTONOM_DB = 'otonom_test_service';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const d = await import('../src/index.ts');
const { ensureRoles, migrate } = await import('../src/migrate.ts');

let pool: pg.Pool;
const eng = { actor: { id: 'u-eng', role: 'ENGINEER' }, correlationId: 'svc' };
const store = { actor: { id: 'u-store', role: 'STORE' }, correlationId: 'svc' };
const owner = { actor: { id: 'u-owner', role: 'OWNER' }, correlationId: 'svc' };
const alice = { actor: { id: d.customerRef(101), role: 'CUSTOMER' }, correlationId: 'svc' };
const bob = { actor: { id: d.customerRef(102), role: 'CUSTOMER' }, correlationId: 'svc' };
const web = { actor: { id: 'website', role: 'ANONYMOUS' }, correlationId: 'svc' };
const key = () => `k${Math.random().toString(36).slice(2)}${Date.now().toString(36)}zzzz`;
let aliceCode = '';

before(async () => {
  const su = new pg.Client(d.connConfig('superuser', 'postgres'));
  await su.connect();
  await su.query(`DROP DATABASE IF EXISTS otonom_test_service WITH (FORCE)`);
  await su.end();
  await ensureRoles();
  await migrate();
  pool = d.makePool('domain', 6);
  await pool.query(`INSERT INTO domain.skus(id, code, model) VALUES ('c06','T-RC06','RC06')`);
  await pool.query(`INSERT INTO domain.stock_levels(sku_id, on_hand) VALUES ('c06', 4)`);
  for (const s of ['SVC-0001', 'SVC-0002', 'SVC-0003', 'SVC-0004']) await d.registerSerial(pool, store, s, 'c06');
});
after(async () => pool?.end());

test('commissioning record issues a one-time claim code (hash stored only)', async () => {
  await assert.rejects(d.recordCommissioning(pool, eng, { serial: 'SVC-0001', installedAt: '2026-10-02T09:00:00Z', commissionedAt: '2026-10-01T09:00:00Z', technician: 'Synthetic Tech' }), /INVALID_DATE/);
  const r = await d.recordCommissioning(pool, eng, { serial: 'SVC-0001', projectRef: 'PRJ-SYN-1', installedAt: '2026-10-01T09:00:00Z', commissionedAt: '2026-10-02T09:00:00Z', technician: 'Synthetic Tech', checklist: { lighting: 'ok' } });
  aliceCode = r.claimCode;
  assert.match(aliceCode, /^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  const row = (await pool.query(`SELECT claim_code_hash FROM domain.commissioning_records WHERE serial='SVC-0001'`)).rows[0];
  assert.ok(row.claim_code_hash && !row.claim_code_hash.includes(aliceCode.replace('-', '')));
  await assert.rejects(d.recordCommissioning(pool, eng, { serial: 'SVC-0001', installedAt: '2026-10-01T09:00:00Z', commissionedAt: '2026-10-02T09:00:00Z', technician: 'x' }), /ALREADY_COMMISSIONED/);
});

test('ownership by commissioning code: verified once; code cannot be reused; no oracle for others', async () => {
  await assert.rejects(d.claimDevice(pool, bob, { serial: 'SVC-0001', commissioningCode: 'WRONG-CODE1' }), /CLAIM_NOT_ACCEPTED/);
  assert.equal((await d.claimDevice(pool, alice, { serial: 'svc-0001', commissioningCode: aliceCode.toLowerCase() })).status, 'VERIFIED');
  await assert.rejects(d.claimDevice(pool, bob, { serial: 'SVC-0001', commissioningCode: aliceCode }), /CLAIM_NOT_ACCEPTED/); // owned + code used
  await assert.rejects(d.claimDevice(pool, bob, { serial: 'NOPE-0000', evidence: 'x'.repeat(30) }), /CLAIM_NOT_ACCEPTED/); // unknown serial, same answer
  assert.equal((await d.claimDevice(pool, alice, { serial: 'SVC-0001' })).replay, true);
});

test('ownership by website order token (order that shipped this serial)', async () => {
  const p = await d.proposePrice(pool, store, 'c06', 900_00, true); // SYNTHETIC fixture price
  await d.approvePrice(pool, owner, p.id);
  const o = await d.submitWebsiteOrder(pool, web, { idempotencyKey: key(), lines: [{ skuId: 'c06', qty: 1 }], customer: { name: 'Bob', email: 'bob@example.com' }, governorate: 'CAIRO', paymentMethod: 'COD' });
  await d.confirmOrder(pool, { orderId: o.orderId, approvedBy: 'u-store', expectedRevision: 1, idempotencyKey: key() });
  await d.setShipping(pool, store, o.orderId, 0);
  const line = (await pool.query(`SELECT id FROM domain.order_lines WHERE order_id=$1`, [o.orderId])).rows[0].id;
  await d.allocateSerials(pool, store, o.orderId, { [line]: ['SVC-0002'] });
  await assert.rejects(d.claimDevice(pool, bob, { serial: 'SVC-0002', orderRef: o.ref, orderToken: o.accessToken }), /CLAIM_NOT_ACCEPTED/); // not shipped yet
  await d.shipOrder(pool, store, o.orderId);
  await assert.rejects(d.claimDevice(pool, bob, { serial: 'SVC-0002', orderRef: o.ref, orderToken: 'forged' }), /CLAIM_NOT_ACCEPTED/);
  assert.equal((await d.claimDevice(pool, bob, { serial: 'SVC-0002', orderRef: o.ref, orderToken: o.accessToken })).status, 'VERIFIED');
});

test('ownership by staff review: pending → decision with reason; a second claimant cannot take a verified device', async () => {
  await assert.rejects(d.claimDevice(pool, alice, { serial: 'SVC-0003' }), /EVIDENCE_REQUIRED/);
  assert.equal((await d.claimDevice(pool, alice, { serial: 'SVC-0003', evidence: 'Synthetic: installed by previous contractor, invoice attached' })).status, 'PENDING');
  const id = (await pool.query(`SELECT id FROM domain.device_ownerships WHERE serial='SVC-0003' AND status='PENDING'`)).rows[0].id;
  await assert.rejects(d.decideOwnership(pool, eng, id, 'VERIFIED', ''), /REASON_REQUIRED/);
  await d.decideOwnership(pool, eng, id, 'VERIFIED', 'synthetic invoice checked');
  await assert.rejects(d.claimDevice(pool, bob, { serial: 'SVC-0003', evidence: 'Synthetic: I also own this, honestly yes' }), /CLAIM_NOT_ACCEPTED/);
});

test('customer sees only own devices; no coverage dates without an approved policy (none exists)', async () => {
  const a = await d.listMyDevices(pool, alice.actor.id);
  assert.deepEqual(a.map((x) => x.serial).sort(), ['SVC-0001', 'SVC-0003']);
  assert.ok(a.every((x) => x.coverage === 'NO_COVERAGE_RECORD' && x.coverageEndsAt === null && x.coverageStartsAt === null));
  const b = await d.listMyDevices(pool, bob.actor.id);
  assert.deepEqual(b.map((x) => x.serial), ['SVC-0002']);
});

test('tickets: only for own devices (IDOR guard), transitions enforced, resolution required', async () => {
  await assert.rejects(d.openTicket(pool, bob, { serial: 'SVC-0001', category: 'FAULT', description: 'Synthetic: trying to open a ticket for someone else.' }), /NOT_FOUND/);
  await assert.rejects(d.openTicket(pool, alice, { serial: 'SVC-0001', category: 'FAULT', description: 'short' }), /DESCRIPTION_TOO_SHORT/);
  const t = await d.openTicket(pool, alice, { serial: 'SVC-0001', category: 'FAULT', description: 'Synthetic: channel 3 relay does not switch.' });
  assert.match(t.ref, /^SRV-\d{4}-/);
  assert.equal((await d.listMyTickets(pool, bob.actor.id)).length, 0);
  assert.equal((await d.listMyTickets(pool, alice.actor.id)).length, 1);
  const tid = (await pool.query(`SELECT id FROM domain.service_tickets WHERE ref=$1`, [t.ref])).rows[0].id;
  await assert.rejects(d.updateTicket(pool, eng, tid, { status: 'RESOLVED' }), /ILLEGAL_TRANSITION/);
  await d.updateTicket(pool, eng, tid, { status: 'TRIAGE', assignedTo: 'u-eng' });
  await assert.rejects(d.updateTicket(pool, eng, tid, { status: 'RESOLVED' }), /RESOLUTION_REQUIRED/);
});

test('RMA: never auto-decided; replacement moves ownership, ledgers stock and keeps append-only history', async () => {
  const tid = (await pool.query(`SELECT id FROM domain.service_tickets WHERE serial='SVC-0001'`)).rows[0].id;
  const r = await d.openRma(pool, eng, tid);
  assert.equal(r.coverageAtRequest, 'NO_COVERAGE_RECORD');
  await assert.rejects(d.openRma(pool, eng, tid), /RMA_ALREADY_OPEN/);
  await assert.rejects(d.rmaTransition(pool, eng, r.id, 'APPROVED', {}), /REASON_REQUIRED/);
  await assert.rejects(d.rmaTransition(pool, eng, r.id, 'REPLACED', { replacementSerial: 'SVC-0004' }), /ILLEGAL_TRANSITION/);
  await d.rmaTransition(pool, eng, r.id, 'APPROVED', { reason: 'synthetic: goodwill decision recorded by engineer' });
  await d.rmaTransition(pool, eng, r.id, 'RECEIVED');
  await d.rmaTransition(pool, eng, r.id, 'INSPECTED');
  await assert.rejects(d.rmaTransition(pool, eng, r.id, 'REPLACED', { replacementSerial: 'SVC-0002' }), /REPLACEMENT_NOT_AVAILABLE/); // not in stock
  const onHand0 = (await pool.query(`SELECT on_hand FROM domain.stock_levels WHERE sku_id='c06'`)).rows[0].on_hand;
  await d.rmaTransition(pool, eng, r.id, 'REPLACED', { replacementSerial: 'SVC-0004' });
  const onHand1 = (await pool.query(`SELECT on_hand FROM domain.stock_levels WHERE sku_id='c06'`)).rows[0].on_hand;
  assert.equal(onHand1, onHand0 - 1);
  const devices = (await d.listMyDevices(pool, alice.actor.id)).map((x) => x.serial).sort();
  assert.deepEqual(devices, ['SVC-0003', 'SVC-0004']);
  assert.equal((await pool.query(`SELECT status FROM domain.serial_units WHERE serial='SVC-0001'`)).rows[0].status, 'RETURNED');
  assert.deepEqual((await d.replacementHistory(pool, 'SVC-0004')).map((h) => [h.old_serial, h.new_serial]), [['SVC-0001', 'SVC-0004']]);
  await assert.rejects(pool.query(`UPDATE domain.serial_replacements SET new_serial='SVC-0003'`), /permission denied|append-only/);
  // the replacement has no coverage row: coverage of replacements is a policy decision (not automatic)
  assert.equal((await d.listMyDevices(pool, alice.actor.id)).find((x) => x.serial === 'SVC-0004')?.coverage, 'NO_COVERAGE_RECORD');
});

test('W-08 safety ticket: urgent, guidance returned, cannot be resolved before a human callback', async () => {
  const t = await d.openTicket(pool, alice, { serial: 'SVC-0003', category: 'SAFETY', description: 'Synthetic: burning smell near the controller panel.' });
  assert.equal(t.priority, 'URGENT');
  assert.equal(t.status, 'TRIAGE');
  assert.equal(t.emergencyService, false);
  assert.ok(t.safetyGuidance);
  const id = (await pool.query(`SELECT id FROM domain.service_tickets WHERE ref=$1`, [t.ref])).rows[0].id;
  await assert.rejects(d.updateTicket(pool, eng, id, { status: 'RESOLVED', resolution: 'synthetic' }), /SAFETY_CALLBACK_REQUIRED/);
  await assert.rejects(d.recordCallback(pool, eng, id, ''), /NOTE_REQUIRED/);
  await d.recordCallback(pool, eng, id, 'synthetic: called the resident, power isolated');
  assert.equal((await d.updateTicket(pool, eng, id, { status: 'RESOLVED', resolution: 'synthetic: loose terminal tightened' })).status, 'RESOLVED');
  const a = (await pool.query(`SELECT count(*)::int n FROM domain.audit_events WHERE action IN ('ticket.safety_escalation','ticket.callback') AND entity_id=$1`, [id])).rows[0].n;
  assert.equal(a, 2);
});
