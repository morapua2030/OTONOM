'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
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
const DRAFT_KEY = 'otonom:synthetic-commerce-lab:v1';
const DRAFT_TTL_MS = 2 * 60 * 60 * 1000;

export function CommerceLab({ skus }: { skus: Sku[] }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [lines, setLines] = useState<Line[]>(skus[0] ? [{ skuId: skus[0].id, qty: 1 }] : []);
  const [customerAlias, setCustomerAlias] = useState('Synthetic customer');
  const [governorate, setGovernorate] = useState('NOT_CONFIGURED');
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const stepFocus = useRef<HTMLParagraphElement>(null);
  const errorFocus = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null');
      if (saved?.expiresAt > Date.now() && Array.isArray(saved.lines)) {
        const allowed = new Set(skus.map((sku) => sku.id));
        const safeLines = saved.lines
          .filter((line: Line) => allowed.has(line?.skuId) && Number.isInteger(line?.qty) && line.qty >= 1 && line.qty <= 100)
          .slice(0, 20);
        if (safeLines.length) setLines(safeLines);
        if ([1, 2, 3, 4].includes(saved.step)) setStep(saved.step);
        if (saved.governorate === 'NOT_CONFIGURED') setGovernorate(saved.governorate);
      } else {
        sessionStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      sessionStorage.removeItem(DRAFT_KEY);
    } finally {
      setHydrated(true);
    }
  }, [skus]);

  useEffect(() => {
    if (!hydrated || step === 5) return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step, lines, governorate, expiresAt: Date.now() + DRAFT_TTL_MS }));
  }, [governorate, hydrated, lines, step]);

  useEffect(() => {
    stepFocus.current?.focus();
  }, [step]);

  useEffect(() => {
    if (error) errorFocus.current?.focus();
  }, [error]);

  const discardDraft = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    setLines(skus[0] ? [{ skuId: skus[0].id, qty: 1 }] : []);
    setCustomerAlias('Synthetic customer');
    setGovernorate('NOT_CONFIGURED');
    setReview(null);
    setError('');
    setStep(1);
  };

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
      sessionStorage.removeItem(DRAFT_KEY);
      setStep(5);
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
      <p ref={stepFocus} tabIndex={-1} className={s.muted} aria-live="polite">Step {step} of 5: {['Cart', 'Synthetic details', 'Fulfilment', 'Review', 'Blocked confirmation'][step - 1]}</p>
      <form onSubmit={submit} className={s.labForm} aria-busy={busy}>
        {step === 1 && lines.map((line, index) => (
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
        {step === 1 && <div className={s.actions}>
          <button className={`${s.btn} ${s.btnSecondary}`} type="button" disabled={!skus.length || lines.length >= 20} onClick={() => { if (skus[0]) setLines((current) => [...current, { skuId: skus[0].id, qty: 1 }]); setReview(null); }}>Add line / إضافة</button>
          <button className={s.btn} type="button" disabled={!lines.length} onClick={() => setStep(2)}>Continue / متابعة</button>
        </div>}
        {step === 2 && <fieldset>
          <legend>Synthetic details / بيانات اصطناعية</legend>
          <label>Alias only / اسم تجريبي<input value={customerAlias} maxLength={80} onChange={(event) => setCustomerAlias(event.target.value)} required /></label>
          <p className={s.muted}>Do not enter a real name, phone, email or address. Values stay in browser memory only.</p>
        </fieldset>}
        {step === 3 && <fieldset>
          <legend>Fulfilment review / مراجعة التسليم</legend>
          <label>Governorate policy<select value={governorate} onChange={(event) => setGovernorate(event.target.value)}><option value="NOT_CONFIGURED">Not configured / غير معتمد</option></select></label>
          <p className={s.err}>Shipping method, rate, tax and installation are not approved. This step cannot promise delivery.</p>
        </fieldset>}
        {step === 4 && <div>
          <p><strong>{customerAlias}</strong> · {lines.length} synthetic line(s) · fulfilment {governorate}</p>
          <p className={s.err}>Final server revalidation is required. Confirmation remains simulated and cannot create an order.</p>
        </div>}
        {step > 1 && step < 5 && <div className={s.actions}>
          <button className={`${s.btn} ${s.btnSecondary}`} type="button" onClick={() => setStep((step - 1) as 1 | 2 | 3 | 4)}>Back / رجوع</button>
          {step < 4
            ? <button className={s.btn} type="button" disabled={step === 2 && !customerAlias.trim()} onClick={() => setStep((step + 1) as 2 | 3 | 4)}>Continue / متابعة</button>
            : <button className={s.btn} type="submit" disabled={busy}>{busy ? 'Reviewing…' : 'Server review / مراجعة خادمية'}</button>}
        </div>}
      </form>
      <div ref={errorFocus} tabIndex={error ? -1 : undefined} role="status" aria-live="polite" className={s.labResult}>
        {error && <p className={s.err}>{error === 'PRICE_NOT_APPROVED' ? 'No approved price: checkout remains blocked / لا يوجد سعر معتمد: المسار مغلق' : error}</p>}
        {review && (
          <>
            <p><strong>Simulation complete.</strong> No order, reservation, payment or customer record was created.</p>
            <p><strong>{money(review.subtotalMinor)}</strong> — synthetic approved fixture prices only.</p>
            <ul>{review.lines.map((line) => <li key={line.skuId}>{line.skuId}: {line.qty} × {money(line.unitPriceMinor)}; available {line.available}; {line.stockSufficient ? 'stock check passed' : 'insufficient stock'}</li>)}</ul>
            <p className={s.err}>Blocked: {review.blockers.join(', ')}. No order was created.</p>
            <button className={`${s.btn} ${s.btnSecondary}`} type="button" onClick={() => { setStep(1); setReview(null); }}>Back to cart / العودة للسلة</button>
          </>
        )}
      </div>
      {step < 5 && <button className={`${s.btn} ${s.btnSecondary}`} type="button" onClick={discardDraft}>Discard synthetic draft</button>}
    </section>
  );
}
