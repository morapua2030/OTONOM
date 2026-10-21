'use client';

import { useState, type FormEvent } from 'react';
import s from './staff.module.css';

type Sku = { id: string; code: string; model?: string | null; available: number; approvedPrice: number | null };
type Line = { skuId: string; qty: number };
type Review = {
  mode: 'SYNTHETIC_INTERNAL_REVIEW';
  subtotalMinor: number;
  canCreateOrder: false;
  blockers: string[];
  lines: Array<Line & { unitPriceMinor: number; lineMinor: number; available: number; stockSufficient: boolean }>;
};

const money = (minor: number) => new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(minor / 100);

export function CommerceLab({ skus }: { skus: Sku[] }) {
  const [lines, setLines] = useState<Line[]>(skus[0] ? [{ skuId: skus[0].id, qty: 1 }] : []);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState('');

  const update = (index: number, patch: Partial<Line>) => {
    setReview(null);
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setReview(null);
    setError('');
    try {
      const response = await fetch('/api/admin/commerce-lab/review', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-correlation-id': crypto.randomUUID() },
        body: JSON.stringify({ lines }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.code ?? `HTTP_${response.status}`);
      setReview(result as Review);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'REVIEW_FAILED');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={s.card} data-testid="commerce-lab" aria-labelledby="commerce-lab-title">
      <h2 id="commerce-lab-title">Synthetic cart review / مراجعة سلة اصطناعية</h2>
      <p className={s.muted}>Local test tool only. It never creates an order, reserves stock, captures payment or stores customer data.</p>
      <p className={s.muted} lang="ar" dir="rtl">أداة اختبار محلية فقط؛ لا تنشئ طلبًا ولا تحجز مخزونًا ولا تسجل دفعًا أو بيانات عميل.</p>
      <form onSubmit={submit} className={s.labForm} aria-busy={busy}>
        {lines.map((line, index) => (
          <div className={s.labLine} key={`${index}-${line.skuId}`}>
            <label>
              SKU / الصنف
              <select value={line.skuId} onChange={(event) => update(index, { skuId: event.target.value })}>
                {skus.map((sku) => <option key={sku.id} value={sku.id}>{sku.code}{sku.model ? ` · ${sku.model}` : ''} · available {sku.available}</option>)}
              </select>
            </label>
            <label>
              Quantity / الكمية
              <input type="number" min={1} max={100} value={line.qty} onChange={(event) => update(index, { qty: Number(event.target.value) })} />
            </label>
            <button className={`${s.btn} ${s.btnSecondary}`} type="button" onClick={() => { setLines((current) => current.filter((_, i) => i !== index)); setReview(null); }} disabled={lines.length === 1}>Remove / حذف</button>
          </div>
        ))}
        <div className={s.actions}>
          <button className={`${s.btn} ${s.btnSecondary}`} type="button" disabled={!skus.length || lines.length >= 20} onClick={() => { if (skus[0]) setLines((current) => [...current, { skuId: skus[0].id, qty: 1 }]); setReview(null); }}>Add line / إضافة</button>
          <button className={s.btn} type="submit" disabled={busy || !lines.length}>{busy ? 'Reviewing…' : 'Server review / مراجعة خادمية'}</button>
        </div>
      </form>
      <div role="status" aria-live="polite" className={s.labResult}>
        {error && <p className={s.err}>{error === 'PRICE_NOT_APPROVED' ? 'No approved price: checkout remains blocked / لا يوجد سعر معتمد: المسار مغلق' : error}</p>}
        {review && (
          <>
            <p><strong>{money(review.subtotalMinor)}</strong> — synthetic approved fixture prices only.</p>
            <ul>{review.lines.map((line) => <li key={line.skuId}>{line.skuId}: {line.qty} × {money(line.unitPriceMinor)}; available {line.available}; {line.stockSufficient ? 'stock check passed' : 'insufficient stock'}</li>)}</ul>
            <p className={s.err}>Blocked: {review.blockers.join(', ')}. No order was created.</p>
          </>
        )}
      </div>
    </section>
  );
}
