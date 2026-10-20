// W1 order lifecycle against a disposable database. ALL amounts are SYNTHETIC TEST FIXTURES (not proposed prices).
process.env.OTONOM_DB = 'otonom_test_lifecycle';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const d = await import('../src/index.ts');
const { ensureRoles, migrate } = await import('../src/migrate.ts');

let pool: pg.Pool;
const web = { actor: { id: 'website', role: 'ANONYMOUS' }, correlationId: 'lc' };
const store = { actor: { id: 'u-store', role: 'STORE' }, correlationId: 'lc' };
const owner = { actor: { id: 'u-owner', role: 'OWNER' }, correlationId: 'lc' };
const key = () => `k${Math.random().toString(36).slice(2)}${Date.now().toString(36)}yyyy`;
const cust = { name: 'Synthetic Buyer', email: 'buyer@example.com' };
const stock = async (sku: string) => (await pool.query(`SELECT on_hand, reserved, allocated FROM domain.stock_levels WHERE sku_id=$1`, [sku])).rows[0];
const lineIds = async (orderId: string) => (await pool.query(`SELECT id, sku_id FROM domain.order_lines WHERE order_id=$1 ORDER BY sku_id`, [orderId])).rows;

before(async () => {
  const su = new pg.Client(d.connConfig('superuser', 'postgres'));
  await su.connect();
  await su.query(`DROP DATABASE IF EXISTS otonom_test_lifecycle WITH (FORCE)`);
  await su.end();
  await ensureRoles();
  await migrate();
  pool = d.makePool('domain', 6);
  // synthetic catalogue: one controller, one variant of it, one standard addition (non-serialised)
  await pool.query(`INSERT INTO domain.skus(id, code, model, kind) VALUES ('c16','T-RC16-STD','RC16','CONTROLLER')`);
  await pool.query(`INSERT INTO domain.skus(id, code, model, kind, variant_of, attributes) VALUES ('c16w','T-RC16-WHITE','RC16','CONTROLLER','c16','{"finish":"white"}')`);
  await pool.query(`INSERT INTO domain.skus(id, code, kind, serialised) VALUES ('add1','T-ADDITION-1','ADDITION', false)`);
  await pool.query(`INSERT INTO domain.stock_levels(sku_id, on_hand) VALUES ('c16', 3), ('c16w', 1), ('add1', 10)`);
  for (const [sku, minor] of [['c16', 1000_00], ['c16w', 1100_00], ['add1', 50_00]] as const) {
    const p = await d.proposePrice(pool, store, sku, minor, true);
    await d.approvePrice(pool, owner, p.id);
  }
  for (const s of ['SYN-A-0001', 'SYN-A-0002', 'SYN-A-0003']) await d.registerSerial(pool, store, s, 'c16');
  await d.registerSerial(pool, store, 'SYN-W-0001', 'c16w');
});
after(async () => pool?.end());

test('database rejects a controller without a model (catalogue integrity)', async () => {
  await assert.rejects(pool.query(`INSERT INTO domain.skus(id, code, kind) VALUES ('bad','T-BAD','CONTROLLER')`), /controller_has_model/);
});

test('cart pricing: approved prices only, variants priced independently, additions need a controller', async () => {
  const q = await d.priceCart(pool, [{ skuId: 'c16w', qty: 1 }, { skuId: 'add1', qty: 2 }]);
  assert.equal(q.subtotalMinor, 1100_00 + 2 * 50_00);
  assert.equal(q.shipping, 'TO_BE_QUOTED');
  await assert.rejects(d.priceCart(pool, [{ skuId: 'add1', qty: 1 }]), /ADDITION_REQUIRES_CONTROLLER/);
  await assert.rejects(d.priceCart(pool, [{ skuId: 'nope', qty: 1 }]), /SKU_NOT_AVAILABLE/);
});

test('full prepaid lifecycle: submit → confirm (reserve) → shipping → payment verify → allocate serials → ship → complete', async () => {
  const o = await d.submitWebsiteOrder(pool, web, { idempotencyKey: key(), lines: [{ skuId: 'c16', qty: 2 }, { skuId: 'add1', qty: 1 }], customer: cust, governorate: 'CAIRO', paymentMethod: 'BANK_TRANSFER' });
  assert.ok(o.accessToken && d.checkOrderToken(o.orderId, o.accessToken));
  assert.ok(!d.checkOrderToken(o.orderId, o.accessToken.slice(0, -1) + 'x'));
  const conf = await d.confirmOrder(pool, { orderId: o.orderId, approvedBy: 'u-store', expectedRevision: 1, idempotencyKey: key(), correlationId: 'lc' });
  assert.equal(conf.outcome, 'CONFIRMED');
  assert.deepEqual(await stock('c16'), { on_hand: 3, reserved: 2, allocated: 0 });
  await assert.rejects(d.recordPayment(pool, store, o.orderId, 'BANK_TRANSFER', 100), /SHIPPING_NOT_QUOTED/);
  await d.setShipping(pool, store, o.orderId, 150_00);
  const lines = await lineIds(o.orderId);
  const ctl = lines.find((l) => l.sku_id === 'c16')!.id;
  await assert.rejects(d.allocateSerials(pool, store, o.orderId, { [ctl]: ['SYN-A-0001', 'SYN-A-0002'] }), /PAYMENT_NOT_VERIFIED/);
  const totalMinor = 2 * 1000_00 + 50_00 + 150_00;
  await assert.rejects(d.recordPayment(pool, store, o.orderId, 'BANK_TRANSFER', totalMinor + 1), /PAYMENT_EXCEEDS_TOTAL/);
  const p = await d.recordPayment(pool, store, o.orderId, 'BANK_TRANSFER', totalMinor);
  await d.verifyPayment(pool, store, p.paymentId, 'BANKREF-SYN-1');
  await assert.rejects(d.verifyPayment(pool, store, p.paymentId, 'BANKREF-SYN-1'), /INVALID_STATE/); // duplicate confirmation
  await assert.rejects(d.allocateSerials(pool, store, o.orderId, { [ctl]: ['SYN-A-0001'] }), /SERIAL_COUNT_MISMATCH/);
  await assert.rejects(d.allocateSerials(pool, store, o.orderId, { [ctl]: ['SYN-A-0001', 'SYN-W-0001'] }), /SERIAL_NOT_AVAILABLE/); // wrong SKU
  await d.allocateSerials(pool, store, o.orderId, { [ctl]: ['SYN-A-0001', 'SYN-A-0002'] });
  assert.equal((await d.allocateSerials(pool, store, o.orderId, {})).replay, true);
  assert.deepEqual(await stock('c16'), { on_hand: 3, reserved: 0, allocated: 2 });
  await d.shipOrder(pool, store, o.orderId);
  assert.deepEqual(await stock('c16'), { on_hand: 1, reserved: 0, allocated: 0 });
  const sh = (await pool.query(`SELECT status FROM domain.serial_units WHERE serial IN ('SYN-A-0001','SYN-A-0002')`)).rows;
  assert.ok(sh.every((r) => r.status === 'SHIPPED'));
  await d.completeOrder(pool, store, o.orderId);
  const cs = await d.orderStatusForCustomer(pool, o.ref, o.accessToken);
  assert.equal(cs.status, 'COMPLETED');
  assert.equal(cs.shippingMinor, 150_00);
  await assert.rejects(d.orderStatusForCustomer(pool, o.ref, 'wrong-token'), /NOT_FOUND/);
});

test('a second payment reference cannot be verified twice across payments (unique verified external ref)', async () => {
  const o = await d.submitWebsiteOrder(pool, web, { idempotencyKey: key(), lines: [{ skuId: 'c16', qty: 1 }], customer: cust, governorate: 'GIZA', paymentMethod: 'EWALLET' });
  await d.confirmOrder(pool, { orderId: o.orderId, approvedBy: 'u-store', expectedRevision: 1, idempotencyKey: key() });
  await d.setShipping(pool, store, o.orderId, 0);
  const p1 = await d.recordPayment(pool, store, o.orderId, 'EWALLET', 500_00);
  const p2 = await d.recordPayment(pool, store, o.orderId, 'EWALLET', 500_00);
  await d.verifyPayment(pool, store, p1.paymentId, 'WALLET-SYN-9');
  await assert.rejects(d.verifyPayment(pool, store, p2.paymentId, 'WALLET-SYN-9'), /EXTERNAL_REF_ALREADY_USED/);
  await assert.rejects(d.rejectPayment(pool, store, p2.paymentId, ''), /REASON_REQUIRED/);
  await d.rejectPayment(pool, store, p2.paymentId, 'synthetic duplicate');
  // cancellation after allocation returns serials and stock; verified money flagged for refund
  await d.verifyPayment(pool, store, (await d.recordPayment(pool, store, o.orderId, 'EWALLET', 500_00)).paymentId, 'WALLET-SYN-10');
  const line = (await lineIds(o.orderId))[0].id;
  await d.allocateSerials(pool, store, o.orderId, { [line]: ['SYN-A-0003'] });
  const before = await stock('c16');
  await assert.rejects(d.cancelOrder(pool, store, o.orderId, ''), /REASON_REQUIRED/);
  const c = await d.cancelOrder(pool, store, o.orderId, 'synthetic customer cancellation');
  assert.equal(c.refundRequired, true);
  const after = await stock('c16');
  assert.equal(after.allocated, before.allocated - 1);
  assert.equal(after.on_hand, before.on_hand);
  const s = (await pool.query(`SELECT status, order_line_id FROM domain.serial_units WHERE serial='SYN-A-0003'`)).rows[0];
  assert.deepEqual(s, { status: 'IN_STOCK', order_line_id: null });
  assert.equal((await d.cancelOrder(pool, store, o.orderId, 'again')).replay, true);
});

test('cancelling a confirmed order releases its reservation; shipped orders cannot be cancelled', async () => {
  const o = await d.submitWebsiteOrder(pool, web, { idempotencyKey: key(), lines: [{ skuId: 'c16w', qty: 1 }], customer: cust, governorate: 'CAIRO', paymentMethod: 'COD' });
  await d.confirmOrder(pool, { orderId: o.orderId, approvedBy: 'u-store', expectedRevision: 1, idempotencyKey: key() });
  assert.equal((await stock('c16w')).reserved, 1);
  // out of stock for anybody else while reserved
  const other = await d.submitWebsiteOrder(pool, web, { idempotencyKey: key(), lines: [{ skuId: 'c16w', qty: 1 }], customer: cust, governorate: 'CAIRO', paymentMethod: 'COD' });
  assert.equal((await d.confirmOrder(pool, { orderId: other.orderId, approvedBy: 'u-store', expectedRevision: 1, idempotencyKey: key() })).outcome, 'OUT_OF_STOCK');
  await d.cancelOrder(pool, store, o.orderId, 'synthetic');
  assert.equal((await stock('c16w')).reserved, 0);
  assert.equal((await d.confirmOrder(pool, { orderId: other.orderId, approvedBy: 'u-store', expectedRevision: 1, idempotencyKey: key() })).outcome, 'CONFIRMED');
  // COD: allocation allowed before payment, completion is not
  await d.setShipping(pool, store, other.orderId, 0);
  const l = (await lineIds(other.orderId))[0].id;
  await d.allocateSerials(pool, store, other.orderId, { [l]: ['SYN-W-0001'] });
  await d.shipOrder(pool, store, other.orderId);
  await assert.rejects(d.cancelOrder(pool, store, other.orderId, 'too late'), /INVALID_STATE/);
  await assert.rejects(d.completeOrder(pool, store, other.orderId), /PAYMENT_NOT_VERIFIED/);
  await d.verifyPayment(pool, store, (await d.recordPayment(pool, store, other.orderId, 'COD', 1100_00)).paymentId, 'COD-RECEIPT-SYN-1');
  assert.equal((await d.completeOrder(pool, store, other.orderId)).status, 'COMPLETED');
});

test('custom firmware quote: request → owner quote with validity → customer accepts with token → normal confirmation', async () => {
  const r = await d.requestCustomQuote(pool, web, { idempotencyKey: key(), lines: [{ skuId: 'c16', qty: 1 }], requirements: 'Synthetic custom firmware requirement: scene timing per channel.', customer: cust, governorate: 'CAIRO' });
  assert.equal(r.status, 'QUOTE_PENDING');
  await assert.rejects(d.acceptQuote(pool, web, r.ref, r.accessToken), /INVALID_STATE/);
  await assert.rejects(d.issueQuote(pool, owner, r.orderId, 1, '2020-01-01T00:00:00Z'), /INVALID_VALIDITY/);
  await d.issueQuote(pool, owner, r.orderId, 2500_00, new Date(Date.now() + 7 * 86400_000).toISOString());
  await assert.rejects(d.acceptQuote(pool, web, r.ref, 'forged'), /NOT_FOUND/);
  await d.acceptQuote(pool, web, r.ref, r.accessToken);
  const o = (await pool.query(`SELECT status, subtotal_minor, type FROM domain.orders WHERE id=$1`, [r.orderId])).rows[0];
  assert.deepEqual({ ...o, subtotal_minor: Number(o.subtotal_minor) }, { status: 'PENDING_REVIEW', subtotal_minor: 2500_00, type: 'CUSTOM_QUOTED' });
  await assert.rejects(d.requestCustomQuote(pool, web, { idempotencyKey: key(), lines: [{ skuId: 'c16', qty: 1 }], requirements: 'short', customer: cust, governorate: 'CAIRO' }), /REQUIREMENTS_TOO_SHORT/);
});

test('ledger and stock stay consistent: no negative stock, every movement ledgered and audited', async () => {
  const bad = (await pool.query(`SELECT count(*)::int n FROM domain.stock_levels WHERE on_hand < 0 OR reserved < 0 OR allocated < 0 OR reserved + allocated > on_hand`)).rows[0].n;
  assert.equal(bad, 0);
  const types = (await pool.query(`SELECT DISTINCT type FROM domain.inventory_ledger ORDER BY 1`)).rows.map((r) => r.type);
  for (const t of ['ALLOCATE', 'RELEASE', 'RESERVE', 'SHIP']) assert.ok(types.includes(t), t);
  const actions = (await pool.query(`SELECT DISTINCT action FROM domain.audit_events`)).rows.map((r) => r.action);
  for (const a of ['order.submit', 'order.confirm', 'order.shipping', 'payment.record', 'payment.verify', 'payment.reject', 'order.allocate', 'order.ship', 'order.complete', 'order.cancel', 'quote.request', 'quote.issue', 'quote.accept']) assert.ok(actions.includes(a), a);
  await assert.rejects(pool.query(`DELETE FROM domain.inventory_ledger`), /permission denied/);
});

test('concurrent allocation of the same serial to two orders: exactly one wins', async () => {
  await d.adjustStock(pool, store, 'c16', 1, 'synthetic receipt for race test');
  const mk = async () => {
    const o = await d.submitWebsiteOrder(pool, web, { idempotencyKey: key(), lines: [{ skuId: 'c16', qty: 1 }], customer: cust, governorate: 'CAIRO', paymentMethod: 'COD' });
    assert.equal((await d.confirmOrder(pool, { orderId: o.orderId, approvedBy: 'u-store', expectedRevision: 1, idempotencyKey: key() })).outcome, 'CONFIRMED');
    return { id: o.orderId, line: (await lineIds(o.orderId))[0].id };
  };
  const [a, b] = [await mk(), await mk()];
  const rs = await Promise.allSettled([
    d.allocateSerials(pool, store, a.id, { [a.line]: ['SYN-A-0003'] }),
    d.allocateSerials(pool, store, b.id, { [b.line]: ['SYN-A-0003'] }),
  ]);
  assert.equal(rs.filter((r) => r.status === 'fulfilled').length, 1);
  assert.match(String((rs.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason), /SERIAL_NOT_AVAILABLE/);
  const owners = (await pool.query(`SELECT count(*)::int n FROM domain.serial_units WHERE serial='SYN-A-0003' AND status='ALLOCATED'`)).rows[0].n;
  assert.equal(owners, 1);
});

test('50 concurrent confirmations competing for the last unit: exactly one reservation (V-1 in the app domain)', async () => {
  await pool.query(`INSERT INTO domain.skus(id, code, model) VALUES ('race','T-RACE','RC04')`);
  await pool.query(`INSERT INTO domain.stock_levels(sku_id, on_hand) VALUES ('race', 1)`);
  const p = await d.proposePrice(pool, store, 'race', 10_00, true); // SYNTHETIC fixture price
  await d.approvePrice(pool, owner, p.id);
  const orders = [];
  for (let i = 0; i < 50; i++) orders.push((await d.submitWebsiteOrder(pool, web, { idempotencyKey: key(), lines: [{ skuId: 'race', qty: 1 }], customer: cust, governorate: 'CAIRO', paymentMethod: 'COD' })).orderId);
  const big = d.makePool('domain', 25); // many parallel connections → real database-level contention
  try {
    const rs = await Promise.all(orders.map((id) => d.confirmOrder(big, { orderId: id, approvedBy: 'u-store', expectedRevision: 1, idempotencyKey: key() })));
    assert.equal(rs.filter((r) => r.outcome === 'CONFIRMED').length, 1);
    assert.equal(rs.filter((r) => r.outcome === 'OUT_OF_STOCK').length, 49);
    assert.deepEqual(await stock('race'), { on_hand: 1, reserved: 1, allocated: 0 });
  } finally {
    await big.end();
  }
});
