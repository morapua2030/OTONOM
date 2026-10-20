import type { AdminViewServerProps } from 'payload';
import { randomUUID } from 'node:crypto';
import { domainDb } from '@/lib/server.ts';
import { ActionForm } from './ActionForm.tsx';
import { NoAccess, StaffShell, minorToEgp, staffOf, when } from './shell.tsx';
import s from './staff.module.css';

/** Store back office. Customer-facing store routes stay gated by the stage (404 in PREVIEW); this view is staff-only. */
export async function StoreView(props: AdminViewServerProps) {
  const staff = staffOf(props);
  const req = props.initPageResult.req;
  const shell = { ...props, title: 'Store operations', subtitle: 'Orders, payments (manual), serial allocation, stock and prices. No price or tariff is ever pre-filled.' };
  if (!staff || !(staff.can('order.confirm') || staff.can('price.approve'))) return <StaffShell {...shell}>{<NoAccess need="order.confirm" />}</StaffShell>;
  const db = domainDb();
  const settings: any = await req.payload.findGlobal({ slug: 'settings', req, overrideAccess: true });
  const orders = (await db.query(`SELECT * FROM domain.orders ORDER BY created_at DESC LIMIT 60`)).rows;
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

      <section className={s.section} data-testid="orders">
        <h2>Orders ({orders.length})</h2>
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
                  <td data-label="" className={s.mono}>{k.code}</td>
                  <td data-label="SKU">{k.kind}{k.model ? ` · ${k.model}` : ''}</td>
                  <td data-label="Kind" className={s.num}>{k.on_hand}</td>
                  <td data-label="On hand" className={s.num}>{k.reserved}</td>
                  <td data-label="Reserved" className={s.num}>{k.allocated}</td>
                  <td data-label="Allocated" className={s.num}>{k.on_hand - k.reserved - k.allocated}</td>
                  <td data-label="Available" className={s.num}>{k.serials_in_stock}</td>
                  <td data-label="Serials in stock">{k.approved_price ? minorToEgp(k.approved_price) : <span className={s.muted}>none — orders refused (BLOCKED, owner pricing)</span>}</td>
                  <td data-label="Approved price">
                    <div className={s.actions}>
                      {staff.can('price.propose') && (
                        <ActionForm testId={`sku-${k.code}-propose`} endpoint="/api/admin/prices" label="Propose price" secondary fixed={{ skuId: k.id }} fields={[{ name: 'priceMinor', label: 'Price (EGP)', type: 'money', required: true }, { name: 'vatIncluded', label: 'VAT included', type: 'checkbox' }]} />
                      )}
                      {staff.can('stock.adjust') && (
                        <ActionForm testId={`sku-${k.code}-adjust`} endpoint="/api/admin/stock/adjust" label="Adjust stock" secondary fixed={{ skuId: k.id }} fields={[{ name: 'delta', label: '± units', type: 'number', required: true }, { name: 'reason', label: 'Reason', type: 'text', required: true }]} />
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
