import type { AdminViewServerProps } from 'payload';
import { randomUUID } from 'node:crypto';
import { domainDb } from '@/lib/server.ts';
import { ActionForm } from './ActionForm.tsx';
import { CommerceLab } from './CommerceLab.tsx';
import { NoAccess, StaffShell, minorToEgp, staffOf, when } from './shell.tsx';
import { internalCommerceLabEnabled } from '@/lib/server.ts';
import s from './staff.module.css';

/** Store back office. Customer-facing store routes stay gated by the stage (404 in PREVIEW); this view is staff-only. */
export async function StoreView(props: AdminViewServerProps) {
  const staff = staffOf(props);
  const req = props.initPageResult.req;
  const shell = { ...props, title: 'Store operations', subtitle: 'Orders, payments (manual), serial allocation, stock and prices. No price or tariff is ever pre-filled.' };
  if (!staff || !(staff.can('order.confirm') || staff.can('price.approve'))) return <StaffShell {...shell}>{<NoAccess need="order.confirm" />}</StaffShell>;
  const db = domainDb();
  const settings: any = await req.payload.findGlobal({ slug: 'settings', req, overrideAccess: true });
  const search = req.searchParams;
  const allowedStatuses = ['QUOTE_PENDING', 'QUOTED', 'PENDING_REVIEW', 'CONFIRMED', 'ALLOCATED', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
  const status = allowedStatuses.includes(search.get('status') ?? '') ? search.get('status')! : '';
  const query = (search.get('q') ?? '').trim().slice(0, 80);
  const sku = (search.get('sku') ?? '').trim().slice(0, 64);
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  const from = validDate(search.get('from') ?? '') ? search.get('from')! : '';
  const to = validDate(search.get('to') ?? '') ? search.get('to')! : '';
  const page = Math.max(1, Math.min(10_000, Number.parseInt(search.get('page') ?? '1', 10) || 1));
  const pageSize = 25;
  const where: string[] = [];
  const values: unknown[] = [];
  if (status) { values.push(status); where.push(`orders.status=$${values.length}`); }
  if (query) { values.push(`%${query}%`); where.push(`(orders.ref ILIKE $${values.length} OR orders.customer_name ILIKE $${values.length})`); }
  if (sku) {
    values.push(`%${sku}%`);
    where.push(`EXISTS (SELECT 1 FROM domain.order_lines filter_line JOIN domain.skus filter_sku ON filter_sku.id=filter_line.sku_id WHERE filter_line.order_id=orders.id AND filter_sku.code ILIKE $${values.length})`);
  }
  if (from) { values.push(from); where.push(`orders.created_at >= $${values.length}::date`); }
  if (to) { values.push(to); where.push(`orders.created_at < ($${values.length}::date + interval '1 day')`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const totalOrders = Number((await db.query(`SELECT count(*)::int n FROM domain.orders ${whereSql}`, values)).rows[0].n);
  const orderParams = [...values, pageSize, (page - 1) * pageSize];
  const orders = (await db.query(`SELECT * FROM domain.orders ${whereSql} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, orderParams)).rows;
  const pages = Math.max(1, Math.ceil(totalOrders / pageSize));
  const ids = orders.map((o) => o.id);
  const lines = ids.length ? (await db.query(`SELECT l.id, l.order_id, l.qty, l.unit_price_minor, s.code, s.serialised FROM domain.order_lines l JOIN domain.skus s ON s.id=l.sku_id WHERE l.order_id = ANY($1) ORDER BY s.code`, [ids])).rows : [];
  const pays = ids.length ? (await db.query(`SELECT id, order_id, method, amount_minor, status, external_ref FROM domain.payments WHERE order_id = ANY($1) ORDER BY created_at`, [ids])).rows : [];
  const stock = (await db.query(
    `SELECT s.id, s.code, s.kind, s.model, s.status, coalesce(l.on_hand,0) on_hand, coalesce(l.reserved,0) reserved, coalesce(l.allocated,0) allocated,
            (SELECT p.price_minor FROM domain.sku_prices p WHERE p.sku_id=s.id AND p.status='APPROVED') AS approved_price,
            (SELECT count(*)::int FROM domain.sku_prices p WHERE p.sku_id=s.id AND p.status='DRAFT') AS draft_prices,
            (SELECT count(*)::int FROM domain.serial_units u WHERE u.sku_id=s.id AND u.status='IN_STOCK') AS serials_in_stock
       FROM domain.skus s LEFT JOIN domain.stock_levels l ON l.sku_id=s.id AND l.location_id='MAIN' ORDER BY s.code`,
  )).rows;
  const drafts = (await db.query(`SELECT p.id, s.code, p.price_minor, p.vat_included, p.proposed_by FROM domain.sku_prices p JOIN domain.skus s ON s.id=p.sku_id WHERE p.status='DRAFT' ORDER BY p.created_at`)).rows;
  const linesOf = (id: string) => lines.filter((l) => l.order_id === id);
  const paysOf = (id: string) => pays.filter((p) => p.order_id === id);
  return (
    <StaffShell {...shell}>
      <p className={s.banner} data-testid="store-stage">
        Site stage: <strong>{settings?.stage ?? 'PREVIEW'}</strong>
        {settings?.stage !== 'COMMERCIAL' ? ' — the customer-facing store, cart and checkout are CLOSED (server returns 404).' : ' — customer store routes are open.'}
      </p>

      {internalCommerceLabEnabled() && staff.can('order.confirm') && (
        <CommerceLab skus={stock.map((sku) => ({ id: sku.id, code: sku.code, model: sku.model, available: Number(sku.on_hand) - Number(sku.reserved) - Number(sku.allocated), approvedPrice: sku.approved_price === null ? null : Number(sku.approved_price) }))} />
      )}

      <section className={s.section} data-testid="orders">
        <h2>Orders ({totalOrders})</h2>
        <form className={s.search} method="get" action="/admin/store-ops">
          <label>Search / بحث <input name="q" defaultValue={query} maxLength={80} /></label>
          <label>SKU / الصنف <input name="sku" defaultValue={sku} maxLength={64} /></label>
          <label>Status / الحالة <select name="status" defaultValue={status}><option value="">All / الكل</option>{allowedStatuses.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
          <label>From / من <input name="from" type="date" defaultValue={from} /></label>
          <label>To / إلى <input name="to" type="date" defaultValue={to} /></label>
          <button className={s.btn} type="submit">Filter / تصفية</button>
        </form>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Status</th>
                <th>Customer</th>
                <th>Lines</th>
                <th className={s.num}>Subtotal</th>
                <th className={s.num}>Shipping</th>
                <th>Payments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && <tr><td colSpan={8}>No synthetic orders match this filter / لا توجد طلبات اصطناعية مطابقة.</td></tr>}
              {orders.map((o) => (
                <tr key={o.id} data-ref={o.ref}>
                  <td data-label="Ref" className={s.mono}>
                    <bdi dir="ltr">{o.ref}</bdi>
                    <div className={s.muted}>
                      {o.type} · {o.channel} · {when(o.created_at)}
                    </div>
                  </td>
                  <td data-label="Status">
                    <span className={s.badge}>{o.status}</span>
                  </td>
                  <td data-label="Customer">
                    <bdi>{o.customer_name ?? '—'}</bdi>
                    <div className={s.muted}>
                      {o.governorate ?? ''} {o.payment_method ?? ''}
                    </div>
                  </td>
                  <td data-label="Lines">
                    {linesOf(o.id).map((l) => (
                      <div key={l.id} className={s.mono}>
                        {l.qty} × {l.code} {l.unit_price_minor ? `@ ${minorToEgp(l.unit_price_minor)}` : ''}
                      </div>
                    ))}
                    {o.quote_requirements && <div className={s.muted}>Requirements: {String(o.quote_requirements).slice(0, 80)}</div>}
                  </td>
                  <td data-label="Subtotal" className={s.num}>{minorToEgp(o.quote_minor ?? o.subtotal_minor)}</td>
                  <td data-label="Shipping" className={s.num}>{o.shipping_status === 'TO_BE_QUOTED' ? 'to be quoted' : minorToEgp(o.shipping_minor)}</td>
                  <td data-label="Payments">
                    {paysOf(o.id).map((p) => (
                      <div key={p.id} className={s.mono}>
                        {p.method} {minorToEgp(p.amount_minor)} <span className={s.badge}>{p.status}</span>
                        {p.status === 'PENDING' && staff.can('payment.verify') && (
                          <div className={s.actions}>
                            <ActionForm testId={`pay-${p.id}-verify`} endpoint={`/api/admin/payments/${p.id}/verify`} label="Verify" confirm="Verify this synthetic payment record?" fields={[{ name: 'externalRef', label: 'Bank/wallet/receipt ref', type: 'text', required: true }]} />
                            <ActionForm testId={`pay-${p.id}-reject`} endpoint={`/api/admin/payments/${p.id}/reject`} label="Reject" secondary confirm="Reject this payment record?" fields={[{ name: 'reason', label: 'Reason', type: 'text', required: true }]} />
                          </div>
                        )}
                      </div>
                    ))}
                  </td>
                  <td data-label="Actions">
                    <div className={s.actions}>
                      {o.status === 'QUOTE_PENDING' && staff.can('quote.issue') && (
                        <ActionForm testId={`order-${o.ref}-quote`} endpoint={`/api/admin/orders/${o.id}/quote`} label="Issue quote" fields={[{ name: 'quoteMinor', label: 'Quote (EGP)', type: 'money', required: true }, { name: 'validUntil', label: 'Valid until', type: 'date', required: true }]} />
                      )}
                      {o.status === 'PENDING_REVIEW' && staff.can('order.confirm') && (
                        <ActionForm testId={`order-${o.ref}-confirm`} endpoint={`/api/admin/orders/${o.id}/confirm`} label="Confirm (reserve stock)" fixed={{ idempotencyKey: randomUUID(), expectedRevision: o.revision }} />
                      )}
                      {['PENDING_REVIEW', 'CONFIRMED'].includes(o.status) && staff.can('order.fulfil') && (
                        <ActionForm testId={`order-${o.ref}-shipping`} endpoint={`/api/admin/orders/${o.id}/shipping`} label="Set shipping" secondary fields={[{ name: 'shippingMinor', label: 'Shipping (EGP)', type: 'money', required: true }]} />
                      )}
                      {['CONFIRMED', 'ALLOCATED', 'SHIPPED'].includes(o.status) && staff.can('payment.record') && (
                        <ActionForm testId={`order-${o.ref}-payment`} endpoint={`/api/admin/orders/${o.id}/payments`} label="Record payment" secondary fields={[{ name: 'method', label: 'Method', type: 'select', options: ['COD', 'BANK_TRANSFER', 'EWALLET'], required: true }, { name: 'amountMinor', label: 'Amount (EGP)', type: 'money', required: true }]} />
                      )}
                      {o.status === 'CONFIRMED' && staff.can('order.fulfil') && (
                        <ActionForm
                          testId={`order-${o.ref}-allocate`}
                          endpoint={`/api/admin/orders/${o.id}/allocate`}
                          label="Allocate serials"
                          nestUnder="serialsByLine"
                          fields={linesOf(o.id)
                            .filter((l) => l.serialised)
                            .map((l) => ({ name: l.id, label: `${l.code} × ${l.qty}`, type: 'list' as const, required: true, placeholder: 'SERIAL-1, SERIAL-2' }))}
                        />
                      )}
                      {o.status === 'ALLOCATED' && staff.can('order.fulfil') && <ActionForm testId={`order-${o.ref}-ship`} endpoint={`/api/admin/orders/${o.id}/ship`} label="Mark shipped" confirm="Mark this synthetic order as shipped?" />}
                      {o.status === 'SHIPPED' && staff.can('order.fulfil') && <ActionForm testId={`order-${o.ref}-complete`} endpoint={`/api/admin/orders/${o.id}/complete`} label="Complete" confirm="Complete this synthetic order?" />}
                      {['QUOTE_PENDING', 'QUOTED', 'PENDING_REVIEW', 'CONFIRMED', 'ALLOCATED'].includes(o.status) && staff.can('order.cancel') && (
                        <ActionForm testId={`order-${o.ref}-cancel`} endpoint={`/api/admin/orders/${o.id}/cancel`} label="Cancel" secondary confirm="Cancel this order and release stock?" fields={[{ name: 'reason', label: 'Reason', type: 'text', required: true }]} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <nav className={s.pager} aria-label="Order pages">
          {page > 1 && <a href={`/admin/store-ops?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(sku ? { sku } : {}), ...(status ? { status } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}), page: String(page - 1) })}`}>Previous / السابق</a>}
          <span>Page {Math.min(page, pages)} of {pages}</span>
          {page < pages && <a href={`/admin/store-ops?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(sku ? { sku } : {}), ...(status ? { status } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}), page: String(page + 1) })}`}>Next / التالي</a>}
        </nav>
      </section>

      <section className={s.section} data-testid="stock">
        <h2>Catalogue, stock and prices</h2>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Kind</th>
                <th className={s.num}>On hand</th>
                <th className={s.num}>Reserved</th>
                <th className={s.num}>Allocated</th>
                <th className={s.num}>Available</th>
                <th className={s.num}>Serials in stock</th>
                <th>Approved price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((k) => (
                <tr key={k.id}>
                  <td data-label="SKU" className={s.mono}>{k.code}</td>
                  <td data-label="Kind">{k.kind}{k.model ? ` · ${k.model}` : ''}</td>
                  <td data-label="On hand" className={s.num}>{k.on_hand}</td>
                  <td data-label="Reserved" className={s.num}>{k.reserved}</td>
                  <td data-label="Allocated" className={s.num}>{k.allocated}</td>
                  <td data-label="Available" className={s.num}>{k.on_hand - k.reserved - k.allocated}</td>
                  <td data-label="Serials in stock" className={s.num}>{k.serials_in_stock}</td>
                  <td data-label="Approved price">{k.approved_price ? minorToEgp(k.approved_price) : <span className={s.muted}>none — orders refused (BLOCKED, owner pricing)</span>}</td>
                  <td data-label="Actions">
                    <div className={s.actions}>
                      {staff.can('price.propose') && (
                        <ActionForm testId={`sku-${k.code}-propose`} endpoint="/api/admin/prices" label="Propose price" secondary fixed={{ skuId: k.id }} fields={[{ name: 'priceMinor', label: 'Price (EGP)', type: 'money', required: true }, { name: 'vatIncluded', label: 'VAT included', type: 'checkbox' }]} />
                      )}
                      {staff.can('stock.adjust') && (
                        <ActionForm testId={`sku-${k.code}-adjust`} endpoint="/api/admin/stock/adjust" label="Adjust stock" secondary fixed={{ skuId: k.id, idempotencyKey: randomUUID() }} fields={[{ name: 'delta', label: '± units', type: 'number', required: true }, { name: 'reason', label: 'Reason', type: 'text', required: true }]} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {drafts.length > 0 && (
          <div className={s.section}>
            <h2>Price proposals awaiting owner approval</h2>
            {drafts.map((d) => (
              <div key={d.id} className={s.actions}>
                <span className={s.mono}>
                  {d.code} {minorToEgp(d.price_minor)} {d.vat_included ? 'incl. VAT' : 'excl. VAT'} — proposed by user {d.proposed_by}
                </span>
                {staff.can('price.approve') && <ActionForm testId={`price-${d.id}-approve`} endpoint={`/api/admin/prices/${d.id}/approve`} label="Approve (owner)" confirm="Approve this price? Orders will use it." />}
              </div>
            ))}
          </div>
        )}
        {staff.can('serial.register') && (
          <div className={s.section}>
            <h2>Register a serial</h2>
            <ActionForm testId="serial-register" endpoint="/api/admin/serials" label="Register" fields={[{ name: 'serial', label: 'Serial', type: 'text', required: true }, { name: 'skuId', label: 'SKU id', type: 'select', options: stock.map((k) => k.id), required: true }, { name: 'status', label: 'Status', type: 'select', options: ['IN_STOCK', 'INSTALLED'], required: true }]} />
          </div>
        )}
      </section>
    </StaffShell>
  );
}
