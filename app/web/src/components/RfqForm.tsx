'use client';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Bidi, isolateText } from './bidi.tsx';

type Locale = 'ar' | 'en';
type Kind = 'RFQ' | 'CONSULTATION' | 'PARTNER';

const GOV: Array<[string, string, string]> = [
  ['CAIRO', 'القاهرة', 'Cairo'], ['GIZA', 'الجيزة', 'Giza'], ['ALEXANDRIA', 'الإسكندرية', 'Alexandria'], ['QALYUBIA', 'القليوبية', 'Qalyubia'],
  ['SHARQIA', 'الشرقية', 'Sharqia'], ['DAKAHLIA', 'الدقهلية', 'Dakahlia'], ['GHARBIA', 'الغربية', 'Gharbia'], ['MONUFIA', 'المنوفية', 'Monufia'],
  ['BEHEIRA', 'البحيرة', 'Beheira'], ['KAFR_EL_SHEIKH', 'كفر الشيخ', 'Kafr El Sheikh'], ['DAMIETTA', 'دمياط', 'Damietta'], ['PORT_SAID', 'بورسعيد', 'Port Said'],
  ['ISMAILIA', 'الإسماعيلية', 'Ismailia'], ['SUEZ', 'السويس', 'Suez'], ['NORTH_SINAI', 'شمال سيناء', 'North Sinai'], ['SOUTH_SINAI', 'جنوب سيناء', 'South Sinai'],
  ['RED_SEA', 'البحر الأحمر', 'Red Sea'], ['MATROUH', 'مطروح', 'Matrouh'], ['FAYOUM', 'الفيوم', 'Fayoum'], ['BENI_SUEF', 'بني سويف', 'Beni Suef'],
  ['MINYA', 'المنيا', 'Minya'], ['ASSIUT', 'أسيوط', 'Assiut'], ['SOHAG', 'سوهاج', 'Sohag'], ['QENA', 'قنا', 'Qena'], ['LUXOR', 'الأقصر', 'Luxor'],
  ['ASWAN', 'أسوان', 'Aswan'], ['NEW_VALLEY', 'الوادي الجديد', 'New Valley'], ['OUTSIDE_EGYPT', 'خارج مصر', 'Outside Egypt'],
];
const OPTS = {
  customerType: [['DEVELOPER', 'مطور عقاري', 'Developer'], ['CONTRACTOR', 'مقاول', 'Contractor'], ['CONSULTANT', 'استشاري', 'Consultant'], ['PARTNER', 'شريك/موزع', 'Partner'], ['HOMEOWNER', 'مالك منزل', 'Homeowner'], ['OTHER', 'أخرى', 'Other']],
  projectType: [['COMPOUND', 'مجمع سكني', 'Compound'], ['MULTI_UNIT_BUILDING', 'مبنى متعدد الوحدات', 'Multi-unit building'], ['VILLA', 'فيلا', 'Villa'], ['APARTMENT', 'شقة', 'Apartment'], ['COMMERCIAL', 'تجاري', 'Commercial'], ['OTHER', 'أخرى', 'Other']],
  engagementModel: [['UNSURE', 'غير محدد بعد', 'Not sure yet'], ['SUPPLY_ONLY', 'توريد فقط', 'Supply only'], ['SUPPLY_INSTALL_PROGRAM', 'توريد وتركيب وبرمجة', 'Supply + installation + programming'], ['DESIGN_BUILD', 'تصميم وتنفيذ متكامل', 'Design-build']],
  systems: [['LIGHTING', 'الإضاءة', 'Lighting'], ['CLIMATE', 'التكييف', 'Climate/HVAC'], ['AV', 'الشاشات والصوتيات', 'AV/TV'], ['AUDIO', 'صوت متعدد المناطق', 'Multi-zone audio'], ['DOORS_GARAGE', 'الأبواب والجراج', 'Doors/garage'], ['ALARM_INTEGRATION', 'تكامل الإنذار', 'Alarm integration'], ['SCENES', 'المشاهد', 'Scenes'], ['OTHER', 'أخرى', 'Other']],
} as const;
const ERR: Record<string, [string, string]> = {
  required: ['هذا الحقل مطلوب', 'This field is required'],
  invalid: ['القيمة غير صحيحة', 'Invalid value'],
  email_or_phone_required: ['أدخل البريد الإلكتروني أو رقم الهاتف', 'Enter an email or a phone number'],
  units_or_circuits_required: ['أدخل عدد الوحدات أو عدد الدوائر التقريبي', 'Enter the approximate number of units or circuits'],
  min_20_chars: ['اكتب وصفًا لا يقل عن 20 حرفًا', 'Please write at least 20 characters'],
  RATE_LIMITED: ['عدد كبير من المحاولات، حاول لاحقًا', 'Too many attempts, please try later'],
  NETWORK: ['تعذر الإرسال. بياناتك ما زالت هنا، حاول مرة أخرى.', 'Could not send. Your data is still here — please retry.'],
};

export function RfqForm({ locale, kind }: { locale: Locale; kind: Kind }) {
  const i = locale === 'ar' ? 1 : 2;
  const L = (a: string, e: string) => (locale === 'ar' ? a : e);
  // <option> cannot hold <bdi>: Latin/number runs get Unicode isolates instead (e.g. '3–6 أشهر' must not render as '6–3')
  const O = (a: string, e: string) => isolateText(L(a, e), locale);
  const idempotencyKey = useMemo(() => (globalThis.crypto?.randomUUID?.() ?? String(Math.random()).slice(2) + Date.now()).replace(/-/g, ''), []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [ref, setRef] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const msg = (k: string) => (ERR[errors[k]] ?? ERR.invalid)[i - 1];
  const e = (k: string) => (errors[k] ? <span className="err" id={`err-${k}`}>{msg(k)}</span> : null);
  // accessible field wiring: id for the error summary links, aria-invalid + aria-describedby to the inline error(s)
  const fp = (name: string, ...extra: string[]) => {
    const keys = [name, ...extra].filter((k) => errors[k]);
    return { id: `f-${name}`, name, 'aria-invalid': keys.length ? true : undefined, 'aria-describedby': keys.length ? keys.map((k) => `err-${k}`).join(' ') : undefined } as const;
  };
  const summaryRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (Object.keys(errors).length) {
      const firstStep = ['fullName', 'email', 'phone', 'contact', 'customerType', 'projectType', 'governorate'].some((k) => errors[k]);
      setStep(firstStep ? 1 : 2);
      summaryRef.current?.focus();
    }
  }, [errors]);
  const FIELD_OF: Record<string, string> = { contact: 'email', size: 'units' };
  // the summary names each field so repeated generic messages stay meaningful
  const NAME_OF: Record<string, [string, string]> = {
    fullName: ['الاسم بالكامل', 'Full name'], email: ['البريد الإلكتروني', 'Email'], phone: ['رقم الهاتف', 'Phone'], contact: ['وسيلة التواصل', 'Contact'],
    customerType: ['نوع العميل', 'Customer type'], projectType: ['نوع المشروع', 'Project type'], governorate: ['المحافظة', 'Governorate'],
    units: ['عدد الوحدات', 'Units'], circuits: ['عدد الدوائر', 'Circuits'], size: ['حجم المشروع', 'Project size'], description: ['وصف المشروع', 'Description'],
    consentProcessing: ['الموافقة على معالجة البيانات', 'Data-processing consent'], engagementModel: ['نموذج التعاون', 'Engagement model'],
  };

  function nextStep() {
    if (!formRef.current) return;
    const f = new FormData(formRef.current);
    const next: Record<string, string> = {};
    if (String(f.get('fullName') ?? '').trim().length < 2) next.fullName = 'required';
    const email = String(f.get('email') ?? '').trim();
    const phone = String(f.get('phone') ?? '').trim();
    if (!email && !phone) next.contact = 'email_or_phone_required';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'invalid';
    for (const k of ['customerType', 'projectType', 'governorate']) if (!String(f.get(k) ?? '')) next[k] = 'required';
    if (Object.keys(next).length) setErrors(next);
    else {
      setErrors({});
      setStep(2);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function submit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (busy) return; // double-click protection (server is idempotent too)
    setBusy(true);
    setFormErr(null);
    const f = new FormData(ev.currentTarget);
    const qs = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const k of ['source', 'medium', 'campaign', 'term', 'content']) {
      const v = qs.get(`utm_${k}`);
      if (v) utm[k] = v;
    }
    const payload = {
      kind,
      idempotencyKey,
      locale,
      website: f.get('website'),
      fullName: f.get('fullName'),
      email: f.get('email'),
      phone: f.get('phone'),
      organisationName: f.get('organisationName'),
      contactRole: f.get('contactRole'),
      customerType: f.get('customerType'),
      projectType: f.get('projectType'),
      governorate: f.get('governorate'),
      city: f.get('city'),
      units: f.get('units'),
      circuits: f.get('circuits'),
      systems: f.getAll('systems'),
      engagementModel: f.get('engagementModel'),
      description: f.get('description'),
      phase: f.get('phase'),
      timeline: f.get('timeline'),
      budgetBand: f.get('budgetBand'),
      preferredChannel: f.get('preferredChannel'),
      howHeard: f.get('howHeard'),
      consentProcessing: f.get('consentProcessing') === 'on',
      consentMarketing: f.get('consentMarketing') === 'on',
      attribution: { landingPage: window.location.pathname, referrer: document.referrer || undefined, utm },
    };
    try {
      const r = await fetch('/api/rfq', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 201 || r.status === 200) setRef(j.ref);
      else if (r.status === 422) setErrors(j.fieldErrors ?? {});
      else if (r.status === 429) setFormErr(ERR.RATE_LIMITED[i - 1]);
      else setFormErr(ERR.NETWORK[i - 1]);
    } catch {
      setFormErr(ERR.NETWORK[i - 1]);
    } finally {
      setBusy(false);
    }
  }

  if (ref)
    return (
      <div className="ok" role="status">
        <strong>{L('تم استلام طلبك.', 'Your request has been received.')}</strong>{' '}
        {L('رقمك المرجعي:', 'Your reference:')} <bdi dir="ltr">{ref}</bdi>.{' '}
        {L('سيتواصل معك أحد مهندسينا خلال أيام العمل.', 'One of our engineers will contact you during business days.')}
      </div>
    );

  const opt = (list: readonly (readonly [string, string, string])[]) => list.map((o) => <option key={o[0]} value={o[0]}>{o[i]}</option>);
  return (
    <form className="rfq" onSubmit={submit} noValidate aria-busy={busy} ref={formRef}>
      <div className="hp" aria-hidden="true">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {Object.keys(errors).length > 0 && (
        <div className="err-summary" role="alert" tabIndex={-1} ref={summaryRef}>
          <strong>{L('يرجى تصحيح الحقول التالية:', 'Please correct the following fields:')}</strong>
          <ul>
            {Object.keys(errors).map((k) => (
              <li key={k}>
                <a href={`#f-${FIELD_OF[k] ?? k}`}>
                  {NAME_OF[k] ? `${NAME_OF[k][i - 1]}: ` : ''}
                  {msg(k)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ol className="rfq-progress" aria-label={L('خطوات الطلب', 'Request steps')}>
        <li data-active={step === 1} aria-current={step === 1 ? 'step' : undefined}>{L('بيانات التواصل', 'Contact')}</li>
        <li data-active={step === 2} aria-current={step === 2 ? 'step' : undefined}>{L('ملخص المشروع', 'Project brief')}</li>
      </ol>
      <fieldset className="rfq-step" hidden={step !== 1}>
        <legend>{L('نبدأ ببيانات التواصل', 'Start with contact details')}</legend>
        <p className="muted">{L('لن نطلب ملفات في هذه المرحلة.', 'No files are requested at this stage.')}</p>
        <div className="rfq-grid">
      <label>
        {L('الاسم بالكامل *', 'Full name *')}
        <input {...fp('fullName')} required autoComplete="name" />
        {e('fullName')}
      </label>
      <label>
        {L('البريد الإلكتروني', 'Email')}
        <input {...fp('email', 'contact')} type="email" dir="ltr" autoComplete="email" />
        {e('email')}
      </label>
      <label>
        {L('رقم الهاتف', 'Phone')}
        <input {...fp('phone', 'contact')} type="tel" dir="ltr" autoComplete="tel" placeholder="+20 1XX XXX XXXX" />
        {e('phone')}
        {e('contact')}
      </label>
      <label>
        {L('الشركة / الجهة', 'Organisation')}
        <input {...fp('organisationName')} autoComplete="organization" />
      </label>
      <label>
        {L('نوع العميل *', 'Customer type *')}
        <select {...fp('customerType')} required defaultValue="">
          <option value="" disabled>—</option>
          {opt(OPTS.customerType)}
        </select>
        {e('customerType')}
      </label>
      <label>
        {L('نوع المشروع *', 'Project type *')}
        <select {...fp('projectType')} required defaultValue="">
          <option value="" disabled>—</option>
          {opt(OPTS.projectType)}
        </select>
        {e('projectType')}
      </label>
      <label>
        {L('المحافظة *', 'Governorate *')}
        <select {...fp('governorate')} required defaultValue="">
          <option value="" disabled>—</option>
          {opt(GOV)}
        </select>
        {e('governorate')}
      </label>
      <label>
        {L('المدينة / المنطقة', 'City / area')}
        <input {...fp('city')} />
      </label>
        </div>
        <div className="rfq-nav">
          <span className="muted">{L('* حقول مطلوبة', '* Required fields')}</span>
          <button className="btn" type="button" onClick={nextStep}>{L('التالي: تفاصيل المشروع', 'Next: project details')}</button>
        </div>
      </fieldset>
      <fieldset className="rfq-step" hidden={step !== 2}>
        <legend>{L('عرّفنا بالمشروع', 'Tell us about the project')}</legend>
        <p className="muted">{L('يمكن تعديل البيانات قبل الإرسال.', 'You can review the details before submitting.')}</p>
        <div className="rfq-grid">
      <label>
        {L('عدد الوحدات التقريبي', 'Approximate number of units')}
        <input {...fp('units', 'size')} type="number" min={1} inputMode="numeric" dir="ltr" />
        {e('units')}
      </label>
      <label>
        {L('أو عدد الدوائر التقريبي', 'Or approximate number of circuits')}
        <input {...fp('circuits', 'size')} type="number" min={1} inputMode="numeric" dir="ltr" />
        {e('circuits')}
        {e('size')}
      </label>
      <fieldset className="wide">
        <legend>{L('الأنظمة المطلوبة', 'Requested systems')}</legend>
        {OPTS.systems.map((s) => (
          <label key={s[0]} style={{ display: 'inline-flex', gap: 6, marginInlineEnd: 14, fontWeight: 400 }}>
            <input type="checkbox" name="systems" value={s[0]} style={{ width: 'auto' }} /> {s[i]}
          </label>
        ))}
      </fieldset>
      <label>
        {L('نموذج التعاون', 'Engagement model')}
        <select {...fp('engagementModel')} defaultValue="UNSURE">
          {opt(OPTS.engagementModel)}
        </select>
      </label>
      <label className="wide">
        {L('وصف مختصر للمشروع *', 'Brief description *')}
        <textarea {...fp('description')} rows={5} required minLength={20} maxLength={2000} />
        {e('description')}
      </label>
      <details className="wide">
        <summary>{L('تفاصيل إضافية (اختياري)', 'Additional details (optional)')}</summary>
        <label>
          {L('مرحلة المشروع', 'Project phase')}
          <select name="phase" defaultValue="">
            <option value="">—</option>
            <option value="PLANNING">{L('تخطيط', 'Planning')}</option>
            <option value="DESIGN">{L('تصميم', 'Design')}</option>
            <option value="STRUCTURE">{L('هيكل خرساني', 'Structure')}</option>
            <option value="FINISHING">{L('تشطيب', 'Finishing')}</option>
            <option value="OCCUPIED">{L('مسكون', 'Occupied')}</option>
          </select>
        </label>
        <label>
          {L('الإطار الزمني', 'Timeline')}
          <select name="timeline" defaultValue="">
            <option value="">—</option>
            <option value="LT_3M">{O('أقل من 3 أشهر', '< 3 months')}</option>
            <option value="3_6M">{O('3–6 أشهر', '3–6 months')}</option>
            <option value="6_12M">{O('6–12 شهرًا', '6–12 months')}</option>
            <option value="GT_12M">{O('أكثر من 12 شهرًا', '> 12 months')}</option>
          </select>
        </label>
        <label>
          <Bidi text={L('كيف عرفت OTONOM؟', 'How did you hear about OTONOM?')} locale={locale} />
          <input name="howHeard" />
        </label>
      </details>
      <label className="wide" style={{ fontWeight: 400 }}>
        <span>
          <input type="checkbox" {...fp('consentProcessing')} style={{ width: 'auto' }} />{' '}
          {L('أوافق على معالجة بياناتي للرد على طلبي وفقًا لـ', 'I agree to the processing of my data to answer this request per the')}{' '}
          <a href={`/${locale}/legal/privacy`}>{L('سياسة الخصوصية', 'privacy policy')}</a> *
        </span>
        {e('consentProcessing')}
      </label>
      <label className="wide" style={{ fontWeight: 400 }}>
        <span>
          <input type="checkbox" name="consentMarketing" style={{ width: 'auto' }} /> <Bidi text={L('أرغب في تلقي أخبار OTONOM (اختياري)', 'I would like to receive OTONOM news (optional)')} locale={locale} />
        </span>
      </label>
      {formErr && <p className="err wide" role="alert">{formErr}</p>}
      <p className="wide" style={{ fontSize: 13, color: 'var(--c-muted)' }}>
        {L('لا يتم رفع ملفات في هذه المرحلة. سيطلب منك المهندس المخططات عند الحاجة عبر قناة آمنة.', 'No file uploads at this stage. An engineer will request drawings through a secure channel if needed.')}
      </p>
        </div>
        <div className="rfq-nav">
          <button className="btn secondary" type="button" onClick={() => setStep(1)}>{L('رجوع', 'Back')}</button>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? L('جارٍ الإرسال…', 'Sending…') : L('إرسال الطلب', 'Submit request')}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
