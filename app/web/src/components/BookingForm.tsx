'use client';
import { useId, useRef, useState, type FormEvent } from 'react';
import type { Locale } from '@/lib/i18n.ts';
import { Bidi } from './bidi.tsx';
import { bookVisitMessage, EXTERNAL_LINK, telHref, whatsappHref } from '@/lib/contact.ts';
import { LEAD_LIMITS, type LeadErrors, type LeadPackage } from '@/lib/leads.ts';

type Pkg = { id: string; label: string };
const tx = (locale: Locale, ar: string, en: string) => (locale === 'ar' ? ar : en);

const ERR: Record<string, [string, string]> = {
  REQUIRED: ['الخانة دي مطلوبة.', 'This field is required.'],
  TOO_LONG: ['الكلام أطول من المسموح.', 'This is longer than allowed.'],
  EGYPTIAN_MOBILE: ['اكتب رقم موبايل مصري، مثلًا 01012345678.', 'Enter an Egyptian mobile number, e.g. 01012345678.'],
  INVALID: ['القيمة دي مش صحيحة.', 'This value is not valid.'],
};

/**
 * Booking request form (final release, owner 2026-11-04). Rendered ONLY when the OWNER approved the privacy text and
 * enabled intake in the admin; otherwise the page shows the WhatsApp/phone cards alone. Consent is required, a hidden
 * honeypot and a server-signed timing token keep bots out, and one idempotency key per form prevents double requests
 * (a retry after a network error returns the same reference). Nothing is kept in the browser.
 */
export function BookingForm(props: {
  locale: Locale;
  token: string;
  packages: Pkg[];
  initialPackage?: string | null;
  source: 'contact' | 'simulator';
  plan?: string | null;
  contact: { phoneE164: string; whatsappE164: string };
  privacyHref: string;
}) {
  const { locale, contact } = props;
  const id = useId();
  const key = useRef<string>('');
  if (!key.current) key.current = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');
  const [pkg, setPkg] = useState<string>(props.initialPackage ?? '');
  const [attachPlan, setAttachPlan] = useState(true);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed' | 'limited' | 'expired' | 'closed'>('idle');
  const [ref, setRef] = useState<string | null>(null);
  const f = (name: string) => `${id}-${name}`;
  const err = (name: keyof LeadErrors) => (errors[name] ? (ERR[errors[name]!] ?? ERR.INVALID!)[locale === 'ar' ? 0 : 1] : null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'sending') return;
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get('name') ?? ''),
      phone: String(form.get('phone') ?? ''),
      area: String(form.get('area') ?? ''),
      package: pkg,
      preferredTime: String(form.get('preferredTime') ?? ''),
      message: String(form.get('message') ?? ''),
      plan: props.source === 'simulator' && attachPlan ? props.plan ?? '' : '',
      consent: form.get('consent') === 'on',
      website: String(form.get('website') ?? ''),
      t: props.token,
      idempotencyKey: key.current,
      source: props.source,
      locale,
    };
    const local: LeadErrors = {};
    if (payload.name.trim().length < 2) local.name = 'REQUIRED';
    if (!payload.phone.trim()) local.phone = 'REQUIRED';
    if (payload.area.trim().length < 2) local.area = 'REQUIRED';
    if (!payload.package) local.package = 'REQUIRED';
    if (!payload.consent) local.consent = 'REQUIRED';
    setErrors(local);
    if (Object.keys(local).length) return;
    setState('sending');
    try {
      const res = await fetch('/api/booking', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201 || res.status === 200 || res.status === 202) {
        setRef(typeof data.ref === 'string' && data.ref.startsWith('BK-2') ? data.ref : null);
        setState('done');
      } else if (res.status === 422 && data.code === 'VALIDATION_FAILED') {
        setErrors(data.fieldErrors ?? {});
        setState('idle');
      } else if (res.status === 422) setState('expired');
      else if (res.status === 429) setState('limited');
      else if (res.status === 404) setState('closed');
      else setState('failed');
    } catch {
      setState('failed');
    }
  }

  const wa = whatsappHref(bookVisitMessage(locale), contact.whatsappE164);
  if (state === 'done') {
    return (
      <div className="booking-thanks" role="status" data-testid="booking-thanks">
        <h2>{tx(locale, 'وصلنا طلبك، شكرًا!', 'We received your request. Thank you!')}</h2>
        <p>{tx(locale, 'هنتواصل معاك قريب علشان نحدد الزيارة. لو مستعجل كلّمنا أو ابعتلنا على واتساب.', 'We will contact you soon to arrange the visit. In a hurry? Call us or message us on WhatsApp.')}</p>
        {ref ? <p>{tx(locale, 'رقم الطلب: ', 'Request number: ')}<bdi dir="ltr" data-testid="booking-ref">{ref}</bdi></p> : null}
        <div className="booking-actions">
          <a className="btn" href={wa} {...EXTERNAL_LINK}>{tx(locale, 'واتساب', 'WhatsApp')}</a>
          <a className="btn secondary" href={telHref(contact.phoneE164)}>{tx(locale, 'كلّمنا', 'Call us')}</a>
        </div>
      </div>
    );
  }

  const status =
    state === 'failed' ? tx(locale, 'حصلت مشكلة في الإرسال. جرّب تاني؛ الطلب مش هيتكرر.', 'Sending failed. Please try again; the request will not be duplicated.')
    : state === 'limited' ? tx(locale, 'طلبات كتير من نفس الجهاز. جرّب بعد شوية أو كلّمنا على واتساب.', 'Too many requests from this device. Try again later or message us on WhatsApp.')
    : state === 'expired' ? tx(locale, 'الصفحة فاتت عليها مدة طويلة. حدّث الصفحة وابعت تاني.', 'This page has been open too long. Reload it and send again.')
    : state === 'closed' ? tx(locale, 'الحجز من الموقع متوقف حاليًا. كلّمنا أو ابعتلنا على واتساب.', 'Online booking is paused right now. Call us or message us on WhatsApp.')
    : '';

  const field = (name: 'name' | 'area' | 'preferredTime', label: string, opts: { required?: boolean; max: number; autoComplete?: string }) => (
    <div className="booking-field">
      <label htmlFor={f(name)}>{label}{opts.required ? <span aria-hidden="true"> *</span> : null}</label>
      <input id={f(name)} name={name} type="text" maxLength={opts.max} required={opts.required} autoComplete={opts.autoComplete} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? f(`${name}-err`) : undefined} />
      {err(name) ? <p className="booking-error" id={f(`${name}-err`)}>{err(name)}</p> : null}
    </div>
  );

  return (
    <form className="booking-form" onSubmit={submit} noValidate data-testid={`booking-form-${props.source}`} aria-labelledby={f('title')}>
      <h2 id={f('title')}>{props.source === 'simulator' ? tx(locale, 'ابعت خطتك للفريق', 'Send your plan to the team') : tx(locale, 'احجز زيارة', 'Book a visit')}</h2>
      {field('name', tx(locale, 'الاسم', 'Name'), { required: true, max: LEAD_LIMITS.name, autoComplete: 'name' })}
      <div className="booking-field">
        <label htmlFor={f('phone')}>{tx(locale, 'رقم الموبايل', 'Mobile number')}<span aria-hidden="true"> *</span></label>
        <input id={f('phone')} name="phone" type="tel" inputMode="tel" dir="ltr" maxLength={20} required autoComplete="tel" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? f('phone-err') : undefined} />
        {err('phone') ? <p className="booking-error" id={f('phone-err')}>{err('phone')}</p> : null}
      </div>
      {field('area', tx(locale, 'المنطقة / المحافظة', 'Area / governorate'), { required: true, max: LEAD_LIMITS.area, autoComplete: 'address-level2' })}
      <fieldset className="booking-field" aria-describedby={errors.package ? f('package-err') : undefined}>
        <legend>{tx(locale, 'الباقة', 'Package')}<span aria-hidden="true"> *</span></legend>
        <div className="v2-chip-row">
          {[...props.packages, { id: 'unsure', label: tx(locale, 'مش متأكد', 'Not sure') }].map((p) => (
            <button type="button" className="v2-chip" key={p.id} aria-pressed={pkg === p.id} onClick={() => setPkg(p.id as LeadPackage)} lang={p.id === 'unsure' ? locale : 'en'}>{p.label}</button>
          ))}
        </div>
        {err('package') ? <p className="booking-error" id={f('package-err')}>{err('package')}</p> : null}
      </fieldset>
      {field('preferredTime', tx(locale, 'الوقت المناسب (اختياري)', 'Preferred time (optional)'), { max: LEAD_LIMITS.preferredTime })}
      <div className="booking-field">
        <label htmlFor={f('message')}>{tx(locale, 'رسالتك (اختياري)', 'Your message (optional)')}</label>
        <textarea id={f('message')} name="message" maxLength={LEAD_LIMITS.message} rows={3} aria-invalid={!!errors.message} />
      </div>
      {props.source === 'simulator' && props.plan ? (
        <div className="booking-check">
          <input id={f('attach')} type="checkbox" checked={attachPlan} onChange={(e) => setAttachPlan(e.currentTarget.checked)} />
          <label htmlFor={f('attach')}>{tx(locale, 'إرفاق خطة المحاكاة (نص بس)', 'Attach my simulator plan (text only)')}</label>
        </div>
      ) : null}
      {/* honeypot: hidden from people and assistive technology; bots that fill it are dropped silently */}
      <div className="booking-hp" aria-hidden="true">
        <label htmlFor={f('website')}>Website</label>
        <input id={f('website')} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="booking-check">
        <input id={f('consent')} name="consent" type="checkbox" required aria-invalid={!!errors.consent} aria-describedby={errors.consent ? f('consent-err') : undefined} />
        <label htmlFor={f('consent')}>
          {tx(locale, 'موافق إن OTONOM تستخدم البيانات دي علشان تتواصل معايا بخصوص طلبي، زي ما هو مكتوب في ', 'I agree that OTONOM uses these details to contact me about my request, as described in the ')}
          <a href={props.privacyHref} target="_blank" rel="noopener">{tx(locale, 'سياسة الخصوصية', 'privacy notice')}</a>.
        </label>
      </div>
      {err('consent') ? <p className="booking-error" id={f('consent-err')}>{err('consent')}</p> : null}
      <p className="booking-status" role="status" aria-live="polite">{status ? <Bidi text={status} locale={locale} /> : null}</p>
      <button type="submit" className="btn" disabled={state === 'sending'} aria-busy={state === 'sending'}>
        {state === 'sending' ? tx(locale, 'بيتبعت…', 'Sending…') : props.source === 'simulator' ? tx(locale, 'ابعت خطتك للفريق', 'Send to the team') : tx(locale, 'ابعت الطلب', 'Send request')}
      </button>
    </form>
  );
}
