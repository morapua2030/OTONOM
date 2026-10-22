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
const editor = { actor: { id: 'u-editor', role: 'EDITOR' }, correlationId: 'svc' };
const alice = { actor: { id: d.customerRef(101), role: 'CUSTOMER' }, correlationId: 'svc' };
const bob = { actor: { id: d.customerRef(102), role: 'CUSTOMER' }, correlationId: 'svc' };
const carol = { actor: { id: d.customerRef(103), role: 'CUSTOMER' }, correlationId: 'svc' };
const dan = { actor: { id: d.customerRef(104), role: 'CUSTOMER' }, correlationId: 'svc' };
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
  for (const s of ['SVC-0001', 'SVC-0002', 'SVC-0003', 'SVC-0004', 'SVC-0005']) await d.registerSerial(pool, store, s, 'c06');
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

test('parallel ownership decisions produce at most one verified owner', async () => {
  await Promise.all([
    d.claimDevice(pool, carol, { serial: 'SVC-0005', evidence: 'Synthetic ownership evidence supplied by Carol for review.' }),
    d.claimDevice(pool, dan, { serial: 'svc-0005', evidence: 'Synthetic ownership evidence supplied by Dan for review.' }),
  ]);
  const claims = (await pool.query(`SELECT id FROM domain.device_ownerships WHERE serial='SVC-0005' AND status='PENDING' ORDER BY id`)).rows;
  assert.equal(claims.length, 2);
  const decisions = await Promise.allSettled(claims.map((row) => d.decideOwnership(pool, owner, row.id, 'VERIFIED', 'synthetic concurrent review decision')));
  assert.equal(decisions.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal((await pool.query(`SELECT count(*)::int n FROM domain.device_ownerships WHERE serial='SVC-0005' AND status='VERIFIED'`)).rows[0].n, 1);
});

test('tickets: only for own devices (IDOR guard), transitions enforced, resolution required', async () => {
  await assert.rejects(d.openTicket(pool, bob, { serial: 'SVC-0001', category: 'FAULT', description: 'Synthetic: trying to open a ticket for someone else.' }), /NOT_FOUND/);
  await assert.rejects(d.openTicket(pool, alice, { serial: 'SVC-0001', category: 'FAULT', description: 'short' }), /DESCRIPTION_TOO_SHORT/);
  const ticketKey = `ticket:${key()}`;
  const t = await d.openTicket(pool, alice, { serial: 'SVC-0001', category: 'FAULT', description: 'Synthetic: channel 3 relay does not switch.', idempotencyKey: ticketKey });
  assert.match(t.ref, /^SRV-\d{4}-/);
  const replay = await d.openTicket(pool, alice, { serial: 'svc-0001', category: 'FAULT', description: 'Synthetic: channel 3 relay does not switch.', idempotencyKey: ticketKey });
  assert.equal(replay.replay, true);
  assert.equal(replay.ref, t.ref);
  await assert.rejects(d.openTicket(pool, alice, { serial: 'SVC-0001', category: 'OTHER', description: 'Synthetic: a different request using the same key.', idempotencyKey: ticketKey }), /IDEMPOTENCY_KEY_REUSED/);
  assert.equal((await d.listMyTickets(pool, bob.actor.id)).length, 0);
  assert.equal((await d.listMyTickets(pool, alice.actor.id)).length, 1);
  const concurrentKey = `ticket:${key()}`;
  const duplicateAttempts = await Promise.all(Array.from({ length: 10 }, () => d.openTicket(pool, alice, { serial: 'SVC-0003', category: 'OTHER', description: 'Synthetic concurrent duplicate ticket submission.', idempotencyKey: concurrentKey })));
  assert.equal(new Set(duplicateAttempts.map((result) => result.ref)).size, 1);
  assert.equal(duplicateAttempts.filter((result) => result.replay).length, 9);
  const tid = (await pool.query(`SELECT id FROM domain.service_tickets WHERE ref=$1`, [t.ref])).rows[0].id;
  await assert.rejects(d.updateTicket(pool, eng, tid, { status: 'RESOLVED' }), /ILLEGAL_TRANSITION/);
  await assert.rejects(d.updateTicket(pool, eng, tid, { status: 'TRIAGE', expectedRevision: 99 }), /STALE_REVISION/);
  const triage = await d.updateTicket(pool, eng, tid, { status: 'TRIAGE', assignedTo: 'u-eng', expectedRevision: 1 });
  assert.equal(triage.revision, 2);
  await d.recordDiagnosis(pool, eng, tid, 'Synthetic diagnosis: relay terminal requires bench inspection.', 'No parts committed.');
  await assert.rejects(d.updateTicket(pool, eng, tid, { status: 'RESOLVED' }), /RESOLUTION_REQUIRED/);
  assert.equal((await pool.query(`SELECT count(*)::int n FROM domain.service_ticket_events WHERE ticket_id=$1`, [tid])).rows[0].n, 3);
});

test('triage assignment is reasoned and revision-safe; diagnosis keeps observation separate from conclusions', async () => {
  const ticket = await d.openTicket(pool, bob, {
    serial: 'SVC-0002',
    category: 'FAULT',
    description: 'Synthetic: intermittent output observed during a controlled bench check.',
    idempotencyKey: `triage:${key()}`,
  });
  const id = (await pool.query(`SELECT id FROM domain.service_tickets WHERE ref=$1`, [ticket.ref])).rows[0].id;
  await d.updateTicket(pool, eng, id, { status: 'TRIAGE', expectedRevision: 1 });
  await assert.rejects(d.assignTicket(pool, eng, id, { assignedTo: 'u-eng', reason: 'short', expectedRevision: 2 }), /REASON_REQUIRED/);
  const assigned = await d.assignTicket(pool, eng, id, { assignedTo: 'u-eng', reason: 'Assigned for controlled diagnostic review.', expectedRevision: 2 });
  assert.deepEqual(assigned, { assignedTo: 'u-eng', revision: 3 });
  await assert.rejects(d.assignTicket(pool, eng, id, { assignedTo: 'u-owner', reason: 'Owner review requested after initial triage.', expectedRevision: 2 }), /STALE_REVISION/);
  await assert.rejects(d.assignTicket(pool, eng, id, { assignedTo: 'u-eng', reason: 'No effective assignment change requested.', expectedRevision: 3 }), /NO_CHANGE/);
  await assert.rejects(d.recordStructuredDiagnosis(pool, eng, id, {
    diagnosticStatus: 'CONFIRMED',
    observation: 'Synthetic output intermittently failed during the controlled check.',
    reproduction: 'Used an isolated fixture and repeated the safe low-energy test.',
  }), /FINAL_DIAGNOSIS_REQUIRED/);
  await d.recordStructuredDiagnosis(pool, eng, id, {
    diagnosticStatus: 'HYPOTHESIS',
    observation: 'Synthetic output intermittently failed during the controlled check.',
    reproduction: 'Used an isolated fixture and repeated the safe low-energy test.',
    hypothesis: 'A relay contact may require further bench inspection.',
    hardwareRevision: 'SYN-REV-A',
    softwareInfo: 'Synthetic fixture firmware only',
    partsNote: 'No part was consumed and no billing decision was made.',
  });
  const stored = (await pool.query(`SELECT diagnosis,parts_note FROM domain.service_diagnoses WHERE ticket_id=$1 ORDER BY created_at DESC LIMIT 1`, [id])).rows[0];
  const diagnosis = JSON.parse(stored.diagnosis);
  assert.equal(diagnosis.schema, 'OTONOM_SERVICE_DIAGNOSIS_V1');
  assert.equal(diagnosis.diagnosticStatus, 'HYPOTHESIS');
  assert.equal(diagnosis.finalDiagnosis, null);
  assert.match(stored.parts_note, /No part was consumed/);
  assert.equal((await pool.query(`SELECT count(*)::int n FROM domain.service_ticket_events WHERE ticket_id=$1 AND event_type='ASSIGNED'`, [id])).rows[0].n, 1);
  assert.equal((await pool.query(`SELECT count(*)::int n FROM domain.audit_events WHERE entity_id=$1 AND action='ticket.assigned'`, [id])).rows[0].n, 1);
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
  assert.equal((await pool.query(`SELECT status FROM domain.serial_units WHERE serial='SVC-0001'`)).rows[0].status, 'QUARANTINED');
  await assert.rejects(d.rmaTransition(pool, eng, r.id, 'INSPECTED'), /INSPECTION_REQUIRED/);
  await d.recordRmaInspection(pool, eng, r.id, { condition: 'REPAIRABLE', serialMatches: true, notes: 'Synthetic inspection: serial matched and unit remains quarantined.' });
  await d.rmaTransition(pool, eng, r.id, 'INSPECTED');
  await d.recordRmaAction(pool, eng, r.id, 'REFUND_REVIEW', 'Synthetic review only; no payment or refund side effect.');
  await assert.rejects(d.rmaTransition(pool, eng, r.id, 'REPLACED', { replacementSerial: 'SVC-0002' }), /REPLACEMENT_NOT_AVAILABLE/); // not in stock
  const onHand0 = (await pool.query(`SELECT on_hand FROM domain.stock_levels WHERE sku_id='c06'`)).rows[0].on_hand;
  await d.rmaTransition(pool, eng, r.id, 'REPLACED', { replacementSerial: 'SVC-0004' });
  const onHand1 = (await pool.query(`SELECT on_hand FROM domain.stock_levels WHERE sku_id='c06'`)).rows[0].on_hand;
  assert.equal(onHand1, onHand0 - 1);
  const devices = (await d.listMyDevices(pool, alice.actor.id)).map((x) => x.serial).sort();
  assert.deepEqual(devices, ['SVC-0003', 'SVC-0004']);
  assert.equal((await pool.query(`SELECT status FROM domain.serial_units WHERE serial='SVC-0001'`)).rows[0].status, 'QUARANTINED');
  assert.deepEqual((await d.replacementHistory(pool, 'SVC-0004')).map((h) => [h.old_serial, h.new_serial]), [['SVC-0001', 'SVC-0004']]);
  await assert.rejects(pool.query(`UPDATE domain.serial_replacements SET new_serial='SVC-0003'`), /permission denied|append-only/);
  // the replacement has no coverage row: coverage of replacements is a policy decision (not automatic)
  assert.equal((await d.listMyDevices(pool, alice.actor.id)).find((x) => x.serial === 'SVC-0004')?.coverage, 'NO_COVERAGE_RECORD');
  assert.equal((await pool.query(`SELECT count(*)::int n FROM domain.inventory_ledger WHERE reference_type='rma' AND reference_id=$1 AND type='RETURN_QUARANTINE'`, [r.id])).rows[0].n, 1);
  assert.equal((await pool.query(`SELECT count(*)::int n FROM domain.rma_actions WHERE rma_id=$1 AND action='REFUND_REVIEW'`, [r.id])).rows[0].n, 1);
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

test('ownership transfer requires both parties and revokes the former owner projection', async () => {
  const transfer = await d.requestOwnershipTransfer(pool, alice, ' svc-0003 ', bob.actor.id, 30);
  await assert.rejects(d.acceptOwnershipTransfer(pool, alice, transfer.id, transfer.token), /TRANSFER_NOT_ACCEPTED/);
  await assert.rejects(d.acceptOwnershipTransfer(pool, bob, transfer.id, 'WRONG-CODE1'), /TRANSFER_NOT_ACCEPTED/);
  assert.equal((await d.acceptOwnershipTransfer(pool, bob, transfer.id, transfer.token)).status, 'ACCEPTED');
  assert.ok(!(await d.listMyDevices(pool, alice.actor.id)).some((x) => x.serial === 'SVC-0003'));
  assert.ok((await d.listMyDevices(pool, bob.actor.id)).some((x) => x.serial === 'SVC-0003'));
  await assert.rejects(d.acceptOwnershipTransfer(pool, bob, transfer.id, transfer.token), /TRANSFER_NOT_ACCEPTED/);
});

test('pure warranty evaluation never invents a policy or start date', () => {
  assert.equal(d.evaluateWarranty({ policy: null, asOf: '2026-01-01T00:00:00Z' }).status, 'UNKNOWN_POLICY');
  assert.equal(d.evaluateWarranty({ policy: { version: 2, status: 'APPROVED', durationMonths: 12 } }).reason, 'OWNERSHIP_UNVERIFIED');
  assert.equal(d.evaluateWarranty({ policy: { version: 2, status: 'APPROVED', durationMonths: 12 }, ownershipVerified: true }).status, 'PENDING_START_EVIDENCE');
  const evidence = { ownershipVerified: true, verifiedStartAt: '2026-01-01T00:00:00Z', startEvidence: 'COMMISSIONING' as const };
  assert.equal(d.evaluateWarranty({ policy: { version: 2, status: 'APPROVED', durationMonths: 12 }, ...evidence, exclusionMatch: true, asOf: '2026-06-01T00:00:00Z' }).reason, 'POSSIBLE_EXCLUSION');
  assert.equal(d.evaluateWarranty({ policy: { version: 2, status: 'APPROVED', durationMonths: 12 }, ...evidence, asOf: '2026-06-01T00:00:00Z' }).status, 'ELIGIBLE');
  assert.equal(d.evaluateWarranty({ policy: { version: 2, status: 'APPROVED', durationMonths: 12 }, ...evidence, asOf: '2027-01-01T00:00:00Z' }).status, 'EXPIRED');
});

test('explicit receive, write-off and approved-return movements are conserved and replay-safe', async () => {
  const before = Number((await pool.query(`SELECT on_hand FROM domain.stock_levels WHERE sku_id='c06'`)).rows[0].on_hand);
  const receiveKey = `receive_${key()}`;
  const receive = { skuId: 'c06', kind: 'RECEIVE' as const, qty: 2, reference: 'SYN-GRN-01', reason: 'Synthetic goods receipt', idempotencyKey: receiveKey };
  await assert.rejects(d.recordStockMovement(pool, owner, { ...receive, kind: 'UNKNOWN' as any }), /INVALID_MOVEMENT_KIND/);
  assert.equal((await d.recordStockMovement(pool, owner, receive)).on_hand, before + 2);
  assert.equal((await d.recordStockMovement(pool, owner, receive)).replay, true);
  await assert.rejects(d.recordStockMovement(pool, owner, { ...receive, qty: 3 }), /idempotency key reused/);
  await d.recordStockMovement(pool, owner, { skuId: 'c06', kind: 'WRITE_OFF', qty: 1, reference: 'SYN-WO-01', reason: 'Synthetic damaged stock write-off', idempotencyKey: `writeoff_${key()}` });
  await d.recordStockMovement(pool, owner, { skuId: 'c06', kind: 'APPROVED_RETURN', qty: 1, reference: 'SYN-RET-01', reason: 'Synthetic inspected sellable return', idempotencyKey: `return_${key()}` });
  const after = Number((await pool.query(`SELECT on_hand FROM domain.stock_levels WHERE sku_id='c06'`)).rows[0].on_hand);
  assert.equal(after, before + 2);
  const movements = (await pool.query(`SELECT type,qty FROM domain.inventory_ledger WHERE reference_id IN ('SYN-GRN-01','SYN-WO-01','SYN-RET-01') ORDER BY reference_id`)).rows;
  assert.deepEqual(movements.map((r) => [r.type, r.qty]), [['RECEIPT', 2], ['RESTOCK', 1], ['WRITE_OFF', 1]]);
  await assert.rejects(d.recordStockMovement(pool, owner, { skuId: 'c06', kind: 'WRITE_OFF', qty: 999999, reference: 'SYN-WO-02', reason: 'Synthetic invalid excessive write-off', idempotencyKey: `writeoff_${key()}` }), /STOCK_WOULD_BE_NEGATIVE/);
});

test('bilingual product drafts use revisions and four-eyes review without publishing facts', async () => {
  await assert.rejects(d.createProductDraft(pool, editor, { skuId: 'c06', titleAr: '', titleEn: 'Synthetic RC06', summaryAr: 'ملخص اصطناعي', summaryEn: 'Synthetic review content.' }), /BILINGUAL_CONTENT_REQUIRED/);
  const draft = await d.createProductDraft(pool, editor, { skuId: 'c06', titleAr: 'وحدة اصطناعية', titleEn: 'Synthetic controller', summaryAr: 'محتوى اصطناعي للمراجعة فقط', summaryEn: 'Synthetic review-only merchandising copy.', sortOrder: 6 });
  const submitted = await d.transitionProductDraft(pool, editor, draft.id, 'IN_REVIEW', 1);
  assert.equal(submitted.revision, 2);
  await assert.rejects(d.transitionProductDraft(pool, editor, draft.id, 'APPROVED', 2, 'self approval attempt'), /FOUR_EYES_REQUIRED/);
  await assert.rejects(d.transitionProductDraft(pool, owner, draft.id, 'APPROVED', 1, 'stale'), /STALE_REVISION/);
  const approved = await d.transitionProductDraft(pool, owner, draft.id, 'APPROVED', 2, 'Bilingual synthetic copy reviewed; no public publication.');
  assert.equal(approved.status, 'APPROVED');
  const row = (await pool.query(`SELECT status,proposed_by,reviewed_by FROM domain.product_merchandising_drafts WHERE id=$1`, [draft.id])).rows[0];
  assert.deepEqual(row, { status: 'APPROVED', proposed_by: 'u-editor', reviewed_by: 'u-owner' });
});
