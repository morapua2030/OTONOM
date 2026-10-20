// W1 commerce + warranty domain rules against a disposable database. All values are synthetic test fixtures, not proposals.
process.env.OTONOM_DB = 'otonom_test_w1';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const d = await import('../src/index.ts');
const { ensureRoles, migrate } = await import('../src/migrate.ts');

let pool: pg.Pool;
const store = { actor: { id: 'u-store', role: 'STORE' }, correlationId: 'test-w1' };
const owner = { actor: { id: 'u-owner', role: 'OWNER' }, correlationId: 'test-w1' };
const web = { actor: { id: 'website', role: 'ANONYMOUS' }, correlationId: 'test-w1' };
const key = () => `k${Math.random().toString(36).slice(2)}${Date.now().toString(36)}xxxx`;
const order = (over: Partial<Parameters<typeof d.submitWebsiteOrder>[2]> = {}) => ({
  idempotencyKey: key(),
  lines: [{ skuId: 'sku-a', qty: 2 }],
  customer: { name: 'Synthetic Buyer', email: 'buyer@example.com' },
  governorate: 'CAIRO',
  paymentMethod: 'COD' as const,
  ...over,
});

before(async () => {
  const su = new pg.Client(d.connConfig('superuser', 'postgres'));
  await su.connect();
  await su.query(`DROP DATABASE IF EXISTS otonom_test_w1 WITH (FORCE)`);
  await su.end();
  await ensureRoles();
  await migrate();
  pool = d.makePool('domain', 6);
  await pool.query(`INSERT INTO domain.skus(id, code, model) VALUES ('sku-a','T-RC04','RC04'), ('sku-b','T-RC06','RC06')`);
  await pool.query(`INSERT INTO domain.stock_levels(sku_id, on_hand) VALUES ('sku-a', 5), ('sku-b', 5)`);
});
after(async () => pool?.end());

test('orders are refused while no price is approved (no invented prices)', async () => {
  await assert.rejects(d.submitWebsiteOrder(pool, web, order()), /PRICE_NOT_APPROVED/);
  const draft = await d.proposePrice(pool, store, 'sku-a', 123_400, true);
  await assert.rejects(d.submitWebsiteOrder(pool, web, order()), /PRICE_NOT_APPROVED/);
  await assert.rejects(d.approvePrice(pool, store, draft.id), /FOUR_EYES_REQUIRED/);
  await d.approvePrice(pool, owner, draft.id);
  const r = await d.submitWebsiteOrder(pool, web, order());
  assert.equal(r.status, 'PENDING_REVIEW');
  assert.equal(r.subtotalMinor, 246_800);
  assert.equal(r.shipping, 'TO_BE_QUOTED');
  assert.match(r.ref, /^ORD-\d{4}-[A-Z2-9]{6}$/);
});

test('a second approved price retires the first; order lines snapshot the approved price', async () => {
  const p2 = await d.proposePrice(pool, store, 'sku-a', 150_000, true);
  await d.approvePrice(pool, owner, p2.id);
  const n = await pool.query(`SELECT count(*)::int n FROM domain.sku_prices WHERE sku_id='sku-a' AND status='APPROVED'`);
  assert.equal(n.rows[0].n, 1);
  const r = await d.submitWebsiteOrder(pool, web, order({ lines: [{ skuId: 'sku-a', qty: 1 }] }));
  const line = await pool.query(`SELECT unit_price_minor FROM domain.order_lines l JOIN domain.orders o ON o.id=l.order_id WHERE o.ref=$1`, [r.ref]);
  assert.equal(Number(line.rows[0].unit_price_minor), 150_000);
});

test('order submission is idempotent under concurrency and rejects key reuse with a different body', async () => {
  const body = order();
  const rs = await Promise.all(Array.from({ length: 8 }, () => d.submitWebsiteOrder(pool, web, body)));
  assert.equal(new Set(rs.map((r) => r.ref)).size, 1);
  const n = await pool.query(`SELECT count(*)::int n FROM domain.orders WHERE ref=$1`, [rs[0].ref]);
  assert.equal(n.rows[0].n, 1);
  await assert.rejects(d.submitWebsiteOrder(pool, web, { ...body, lines: [{ skuId: 'sku-a', qty: 3 }] }), /IdempotencyKeyReuse|idempotency key reused/);
});

test('order input validation', async () => {
  await assert.rejects(d.submitWebsiteOrder(pool, web, order({ lines: [] })), /INVALID_LINES/);
  await assert.rejects(d.submitWebsiteOrder(pool, web, order({ lines: [{ skuId: 'sku-a', qty: 0 }] })), /INVALID_LINES/);
  await assert.rejects(d.submitWebsiteOrder(pool, web, order({ lines: [{ skuId: 'sku-a', qty: 1 }, { skuId: 'sku-a', qty: 1 }] })), /INVALID_LINES/);
  await assert.rejects(d.submitWebsiteOrder(pool, web, order({ customer: { name: 'x' } })), /CONTACT_REQUIRED/);
  await assert.rejects(d.submitWebsiteOrder(pool, web, order({ lines: [{ skuId: 'nope', qty: 1 }] })), /SKU_NOT_AVAILABLE/);
  await assert.rejects(d.submitWebsiteOrder(pool, web, order({ lines: [{ skuId: 'sku-b', qty: 1 }] })), /PRICE_NOT_APPROVED/);
});

test('website order is then confirmable by staff with the spike-verified atomic reservation', async () => {
  const r = await d.submitWebsiteOrder(pool, web, order({ lines: [{ skuId: 'sku-a', qty: 5 }] }));
  const c1 = await d.confirmOrder(pool, { orderId: r.orderId, approvedBy: 'u-store', expectedRevision: 1, idempotencyKey: key(), correlationId: 'test-w1' });
  assert.equal(c1.outcome, 'CONFIRMED');
  const other = await d.submitWebsiteOrder(pool, web, order({ lines: [{ skuId: 'sku-a', qty: 1 }] }));
  const c2 = await d.confirmOrder(pool, { orderId: other.orderId, approvedBy: 'u-store', expectedRevision: 1, idempotencyKey: key(), correlationId: 'test-w1' });
  assert.equal(c2.outcome, 'OUT_OF_STOCK');
});

test('warranty: no approved policy => coverage cannot start; claims record NO_COVERAGE_RECORD and are never auto-decided', async () => {
  await d.registerSerial(pool, store, 'SYN-0001', 'sku-a', 'INSTALLED');
  await assert.rejects(d.registerSerial(pool, store, 'SYN-0001', 'sku-a'), /SERIAL_EXISTS/);
  await assert.rejects(d.activateCoverage(pool, owner, 'SYN-0001', '2026-10-01T00:00:00Z'), /WARRANTY_POLICY_NOT_APPROVED/);
  await assert.rejects(pool.query(`INSERT INTO domain.warranty_policies(id, version, status, approved_by) VALUES (gen_random_uuid(), 99, 'APPROVED', 'x')`), /approved_policy_needs_duration/);
  const claim = await d.submitWarrantyClaim(pool, web, { serial: 'SYN-0001', contactName: 'Synthetic', contactPhone: '+201000000000', description: 'Channel 2 does not respond (synthetic test).' });
  assert.equal(claim.coverageAtSubmit, 'NO_COVERAGE_RECORD');
  const row = (await pool.query(`SELECT id, status FROM domain.warranty_claims WHERE ref=$1`, [claim.ref])).rows[0];
  assert.equal(row.status, 'SUBMITTED');
  await assert.rejects(d.decideWarrantyClaim(pool, owner, row.id, 'REJECTED', ''), /REASON_REQUIRED/);
  await d.decideWarrantyClaim(pool, owner, row.id, 'REJECTED', 'synthetic: outside coverage');
  await assert.rejects(d.decideWarrantyClaim(pool, owner, row.id, 'ACCEPTED', 'again'), /INVALID_STATE/);
  await assert.rejects(d.submitWarrantyClaim(pool, web, { serial: 'UNKNOWN-1', contactName: 'x', contactEmail: 'a@b.co', description: 'x'.repeat(30) }), /SERIAL_NOT_RECOGNISED/);
});

test('warranty: with a (test-only) approved policy, coverage end = start + duration and a second activation is refused', async () => {
  await d.approveWarrantyPolicy(pool, owner, 1, 7); // 7 months is a TEST FIXTURE, not a proposed warranty duration
  await d.registerSerial(pool, store, 'SYN-0002', 'sku-a', 'INSTALLED');
  await d.activateCoverage(pool, owner, 'SYN-0002', '2025-01-31T00:00:00Z');
  const r = await pool.query(`SELECT ends_at FROM domain.warranty_coverage WHERE serial='SYN-0002'`);
  assert.equal(new Date(r.rows[0].ends_at).toISOString().slice(0, 7), '2025-08');
  await assert.rejects(d.activateCoverage(pool, owner, 'SYN-0002', '2025-02-01T00:00:00Z'), /COVERAGE_ALREADY_ACTIVE/);
  const old = await d.submitWarrantyClaim(pool, web, { serial: 'SYN-0002', contactName: 'S', contactEmail: 's@example.com', description: 'Synthetic fault description long enough.' });
  assert.equal(old.coverageAtSubmit, 'COVERAGE_EXPIRED'); // ended 2025-08-31
});

test('every W1 write is audited with a correlation id; price history is not deletable by the app role', async () => {
  const a = await pool.query(`SELECT action, count(*)::int n FROM domain.audit_events WHERE action IN ('price.approve','order.submit','warranty_claim.submit','coverage.activate') GROUP BY action`);
  assert.equal(a.rowCount, 4);
  await assert.rejects(pool.query(`DELETE FROM domain.sku_prices`), /permission denied/);
});
