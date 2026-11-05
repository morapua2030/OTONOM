'use client';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { Locale } from '@/lib/i18n.ts';
import { Bidi } from './bidi.tsx';
import { bookingFollowUpMessage, EXTERNAL_LINK, whatsappHref } from '@/lib/contact.ts';
import { LEAD_LIMITS, validateLead, type LeadErrors } from '@/lib/leads.ts';

type Pkg = { id: string; label: string };
type Field = 'name' | 'phone' | 'package' | 'message' | 'consent';
const tx = (locale: Locale, ar: string, en: string) => (locale === 'ar' ? ar : en);
/** Chip order as the owner wrote it: Premium / Plus / Essential / Not sure. */
const ORDER = ['premium', 'plus', 'essential'];

/** Friendly inline messages per field and code (Egyptian Arabic, English mirrored). */
const ERR: Record<string, Record<string, [string, string]>> = {
  name: {
    REQUIRED: ['اكتب اسمك.', 'Please enter your name.'],
    TOO_SHORT: ['الاسم لازم يكون حرفين على الأقل.', 'Your name needs at least 2 characters.'],
    TOO_LONG: ['الاسم طويل شوية، خلّيه 60 حرف بالكتير.', 'That is a bit long: 60 characters at most.'],
  },
  phone: {
    REQUIRED: ['اكتب رقم موبايلك علشان نكلمك.', 'Please enter your mobile number so we can call you.'],
    EGYPTIAN_MOBILE: ['الرقم ده مش رقم موبايل مصري. اكتبه كده: 01012345678', 'That is not an Egyptian mobile number. Write it like this: 01012345678'],
  },
  package: { REQUIRED: ['اختار باقة، أو «مش متأكد».', 'Pick a package, or “Not sure”.'] },
  message: { TOO_LONG: ['الملاحظة أطول من 500 حرف.', 'The note is longer than 500 characters.'] },
  consent: { REQUIRED: ['علّم على الموافقة علشان نقدر نكلمك.', 'Please tick the box so we can contact you.'] },
};
const FALLBACK: [string, string] = ['القيمة دي مش مظبوطة.', 'This value is not valid.'];

/**
 * Booking request form (final release; simplified by the owner, 2026-11-04): name, Egyptian mobile, package chips,
 * consent and one big «احجز زيارة» button, plus an optional collapsed note. From the simulator the plan text is
 * attached automatically and shown read-only. Rendered ONLY when the OWNER approved the privacy text and enabled intake
 * in the admin. Protections: a hidden honeypot, a server-signed minimum fill time, a per-device daily rate limit, the
 * same validation on the server, consent stored with the privacy version, and one idempotency key per form (a retry
 * after a network error returns the same reference). Nothing is kept in the browser.
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
  /** id of the visible heading that names this form (rendered by the page or the simulator). */
  labelledBy: string;
}) {
  const { locale, contact } = props;
  const id = useId();
  const f = (name: string) => `${id}-${name}`;
  const key = useRef<string>('');
  if (!key.current) key.current = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');
  const known = new Set([...props.packages.map((p) => p.id), 'unsure']);
  const [pkg, setPkg] = useState<string>(props.initialPackage && known.has(props.initialPackage) ? props.initialPackage : '');
  const [noteOpen, setNoteOpen] = useState(false);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed' | 'limited' | 'expired' | 'closed'>('idle');
  const [ref, setRef] = useState<string | null>(null);
  const refs = { name: useRef<HTMLInputElement>(null), phone: useRef<HTMLInputElement>(null), package: useRef<HTMLInputElement>(null), message: useRef<HTMLTextAreaElement>(null), consent: useRef<HTMLInputElement>(null) };
  const thanks = useRef<HTMLHeadingElement>(null);
  const noteRef = refs.message;
  const plan = props.source === 'simulator' && props.plan ? [...props.plan].slice(0, LEAD_LIMITS.plan).join('') : '';
  const packages = [...props.packages].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

  useEffect(() => { if (state === 'done') thanks.current?.focus(); }, [state]);
  useEffect(() => { if (noteOpen) noteRef.current?.focus(); }, [noteOpen, noteRef]);

  const msg = (name: Field) => {
    const code = errors[name];
    if (!code) return null;
    const pair = ERR[name]?.[code] ?? FALLBACK;
    return pair[locale === 'ar' ? 0 : 1];
  };
  const errorLine = (name: Field) => (msg(name) ? <p className="booking-error" id={f(`${name}-err`)}><Bidi text={msg(name)!} locale={locale} /></p> : null);
  const describedBy = (name: Field, hint?: string) => [hint, errors[name] ? f(`${name}-err`) : ''].filter(Boolean).join(' ') || undefined;
  const clear = (name: Field) => setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  const focusFirst = (e: LeadErrors) => {
    for (const name of ['name', 'phone', 'package', 'message', 'consent'] as Field[]) if (e[name]) return refs[name].current?.focus();
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'sending') return;
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get('name') ?? ''),
      phone: String(form.get('phone') ?? ''),
      package: pkg,
      message: noteOpen ? String(form.get('message') ?? '') : '',
      plan,
      consent: form.get('consent') === 'on',
      website: String(form.get('website') ?? ''),
      t: props.token,
      idempotencyKey: key.current,
      source: props.source,
      locale,
    };
    // the same rules the server applies, so people see every problem at once, next to its field
    const check = validateLead(payload);
    if (!check.ok) {
      const visible: LeadErrors = {};
      for (const name of ['name', 'phone', 'package', 'message', 'consent'] as Field[]) if (check.errors[name]) visible[name] = check.errors[name];
      setErrors(visible);
      if (Object.keys(visible).length) return focusFirst(visible);
    }
    setErrors({});
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
        focusFirst(data.fieldErrors ?? {});
      } else if (res.status === 422) setState('expired');
      else if (res.status === 429) setState('limited');
      else if (res.status === 404) setState('closed');
      else setState('failed');
    } catch {
      setState('failed');
    }
  }

  if (state === 'done') {
    return (
      <div className="booking-thanks" data-testid="booking-thanks">
        <h3 ref={thanks} tabIndex={-1}>{tx(locale, 'وصلنا طلبك! هنكلمك قريب.', 'We got your request! We’ll call you soon.')}</h3>
        {ref ? <p className="booking-ref">{tx(locale, 'رقم الطلب: ', 'Request number: ')}<bdi dir="ltr" data-testid="booking-ref">{ref}</bdi></p> : null}
        <a className="btn booking-wa" href={whatsappHref(bookingFollowUpMessage(locale, ref), contact.whatsappE164)} {...EXTERNAL_LINK} data-testid="booking-thanks-whatsapp">{tx(locale, 'كلّمنا على واتساب', 'Message us on WhatsApp')}</a>
      </div>
    );
  }

  const status =
    state === 'failed' ? tx(locale, 'حصلت مشكلة في الإرسال. جرّب تاني؛ الطلب مش هيتكرر.', 'Sending failed. Please try again; the request will not be duplicated.')
    : state === 'limited' ? tx(locale, 'طلبات كتير من نفس الجهاز. جرّب بعد شوية أو كلّمنا على واتساب.', 'Too many requests from this device. Try again later or message us on WhatsApp.')
    : state === 'expired' ? tx(locale, 'الصفحة فاتت عليها مدة طويلة. حدّث الصفحة وابعت تاني.', 'This page has been open too long. Reload it and send again.')
    : state === 'closed' ? tx(locale, 'الحجز من الموقع متوقف حاليًا. كلّمنا أو ابعتلنا على واتساب.', 'Online booking is paused right now. Call us or message us on WhatsApp.')
    : '';

  return (
    <form className="booking-form" onSubmit={submit} noValidate data-testid={`booking-form-${props.source}`} aria-labelledby={props.labelledBy}>
      {plan ? (
        <div className="booking-plan" data-testid="booking-plan">
          <p className="booking-label" id={f('plan-label')}>{tx(locale, 'خطتك (هتتبعت مع الطلب)', 'Your plan (sent with the request)')}</p>
          <div className="booking-plan-text" role="region" aria-labelledby={f('plan-label')} tabIndex={0}><Bidi text={plan} locale={locale} /></div>
        </div>
      ) : null}
      <div className="booking-field">
        <label htmlFor={f('name')}>{tx(locale, 'الاسم', 'Name')}<span aria-hidden="true"> *</span></label>
        <input ref={refs.name} id={f('name')} name="name" type="text" autoComplete="name" maxLength={LEAD_LIMITS.name} required aria-invalid={!!errors.name} aria-describedby={describedBy('name')} onChange={() => clear('name')} />
        {errorLine('name')}
      </div>
      <div className="booking-field">
        <label htmlFor={f('phone')}>{tx(locale, 'رقم الموبايل', 'Mobile number')}<span aria-hidden="true"> *</span></label>
        <p className="booking-hint" id={f('phone-hint')}><Bidi text={tx(locale, 'رقم مصري، مثلًا 01012345678', 'An Egyptian number, e.g. 01012345678')} locale={locale} /></p>
        <input ref={refs.phone} id={f('phone')} name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={24} required aria-invalid={!!errors.phone} aria-describedby={describedBy('phone', f('phone-hint'))} onChange={() => clear('phone')} />
        {errorLine('phone')}
      </div>
      <fieldset className="booking-field" aria-describedby={describedBy('package')} data-testid="booking-packages">
        <legend>{tx(locale, 'الباقة', 'Package')}<span aria-hidden="true"> *</span></legend>
        <div className="v2-chip-row">
          {[...packages, { id: 'unsure', label: tx(locale, 'مش متأكد', 'Not sure') }].map((p, i) => (
            <label className="booking-chip" key={p.id}>
              <input ref={i === 0 ? refs.package : undefined} type="radio" name="package" value={p.id} checked={pkg === p.id} onChange={() => { setPkg(p.id); clear('package'); }} aria-invalid={!!errors.package} />
              <span lang={p.id === 'unsure' ? locale : 'en'}>{p.label}</span>
            </label>
          ))}
        </div>
        {errorLine('package')}
      </fieldset>
      <div className="booking-more-wrap">
        <button type="button" className="booking-more" aria-expanded={noteOpen} aria-controls={f('note-panel')} onClick={() => setNoteOpen((o) => !o)} data-testid="booking-note-toggle">
          {tx(locale, 'عايز تضيف ملاحظة؟', 'Want to add a note?')}
        </button>
        <div className="booking-field" id={f('note-panel')} hidden={!noteOpen}>
          <label htmlFor={f('message')}>{tx(locale, 'ملاحظتك (اختياري)', 'Your note (optional)')}</label>
          <p className="booking-hint" id={f('message-hint')}>{tx(locale, 'لحد 500 حرف.', 'Up to 500 characters.')}</p>
          <textarea ref={refs.message} id={f('message')} name="message" maxLength={LEAD_LIMITS.message} rows={3} aria-invalid={!!errors.message} aria-describedby={describedBy('message', f('message-hint'))} onChange={() => clear('message')} />
          {errorLine('message')}
        </div>
      </div>
      {/* honeypot: hidden from people and assistive technology; bots that fill it are dropped silently */}
      <div className="booking-hp" aria-hidden="true">
        <label htmlFor={f('website')}>Website</label>
        <input id={f('website')} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="booking-consent">
        <div className="booking-check">
          <input ref={refs.consent} id={f('consent')} name="consent" type="checkbox" required aria-invalid={!!errors.consent} aria-describedby={describedBy('consent')} onChange={() => clear('consent')} />
          <label htmlFor={f('consent')}>{tx(locale, 'موافق إن OTONOM تتواصل معايا بخصوص طلبي', 'I agree that OTONOM may contact me about my request')}</label>
        </div>
        <a className="booking-privacy" href={props.privacyHref} target="_blank" rel="noopener">
          {tx(locale, 'سياسة الخصوصية', 'Privacy notice')}<span className="sr-only">{tx(locale, ' (بتفتح في صفحة جديدة)', ' (opens in a new tab)')}</span>
        </a>
        {errorLine('consent')}
      </div>
      <p className="booking-status" role="status" aria-live="polite">{status ? <Bidi text={status} locale={locale} /> : null}</p>
      <button type="submit" className="btn booking-submit" disabled={state === 'sending'} aria-busy={state === 'sending'} data-testid="booking-submit">
        {state === 'sending' ? tx(locale, 'بيتبعت…', 'Sending…') : tx(locale, 'احجز زيارة', 'Book a visit')}
      </button>
    </form>
  );
}
