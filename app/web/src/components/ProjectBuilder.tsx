'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { Locale } from '@/lib/i18n.ts';
import { isSmartHomePackageId, packageText, smartHomePackage, type SmartHomePackageId } from '@/lib/smart-home-packages.ts';

type ClientKind = 'INDIVIDUAL' | 'BUSINESS' | 'PREFER_NOT';
type ProjectStage = 'IDEA' | 'PROTOTYPE' | 'EXISTING' | 'UNSURE';
type Discipline = 'SOFTWARE' | 'IOT_EMBEDDED' | 'CUSTOM_ENGINEERING' | 'SMART_HOME' | 'INTEGRATED' | 'UNSURE';
type Choice<T extends string> = { value: T; ar: string; en: string; bodyAr?: string; bodyEn?: string };

const CLIENTS: Choice<ClientKind>[] = [
  { value: 'INDIVIDUAL', ar: 'فرد', en: 'Individual', bodyAr: 'منزل أو فكرة أو مشروع شخصي', bodyEn: 'A home, personal idea or independent project' },
  { value: 'BUSINESS', ar: 'شركة أو فريق', en: 'Business or team', bodyAr: 'منتج أو عملية أو مشروع مؤسسي', bodyEn: 'A product, operation or organisational project' },
  { value: 'PREFER_NOT', ar: 'أفضل عدم التحديد', en: 'Prefer not to say' },
];
const STAGES: Choice<ProjectStage>[] = [
  { value: 'IDEA', ar: 'فكرة', en: 'Idea', bodyAr: 'أحتاج تحديد المشكلة وأقرب مسار', bodyEn: 'I need to frame the problem and a sensible path' },
  { value: 'PROTOTYPE', ar: 'نموذج أولي', en: 'Prototype', bodyAr: 'هناك تجربة أو مكونات أو كود مبدئي', bodyEn: 'There is an experiment, hardware or early code' },
  { value: 'EXISTING', ar: 'نظام قائم', en: 'Existing system', bodyAr: 'أحتاج تحسينًا أو تكاملًا أو إنقاذًا', bodyEn: 'I need an improvement, integration or recovery' },
  { value: 'UNSURE', ar: 'غير متأكد بعد', en: 'Not sure yet' },
];
const DISCIPLINES: Choice<Discipline>[] = [
  { value: 'SOFTWARE', ar: 'برمجيات ومنصات', en: 'Software & platforms' },
  { value: 'IOT_EMBEDDED', ar: 'إنترنت الأشياء والأنظمة المدمجة', en: 'IoT & embedded systems' },
  { value: 'CUSTOM_ENGINEERING', ar: 'هندسة مخصصة', en: 'Custom engineering' },
  { value: 'SMART_HOME', ar: 'منزل ذكي وأتمتة', en: 'Smart home & automation' },
  { value: 'INTEGRATED', ar: 'مشروع متكامل متعدد التخصصات', en: 'Integrated multi-discipline project' },
  { value: 'UNSURE', ar: 'أحتاج مساعدة في الاختيار', en: 'I need help choosing' },
];

const SERVICE_DISCIPLINE: Record<string, Discipline> = {
  software: 'SOFTWARE',
  'software-engineering': 'SOFTWARE',
  iot: 'IOT_EMBEDDED',
  'iot-embedded': 'IOT_EMBEDDED',
  custom: 'CUSTOM_ENGINEERING',
  'custom-engineering': 'CUSTOM_ENGINEERING',
  'smart-home': 'SMART_HOME',
  integrated: 'INTEGRATED',
};

const GOVERNORATES = [
  ['UNSURE', 'غير محدد بعد', 'Not decided yet'], ['CAIRO', 'القاهرة', 'Cairo'], ['GIZA', 'الجيزة', 'Giza'],
  ['ALEXANDRIA', 'الإسكندرية', 'Alexandria'], ['QALYUBIA', 'القليوبية', 'Qalyubia'], ['SHARQIA', 'الشرقية', 'Sharqia'],
  ['DAKAHLIA', 'الدقهلية', 'Dakahlia'], ['GHARBIA', 'الغربية', 'Gharbia'], ['MONUFIA', 'المنوفية', 'Monufia'],
  ['BEHEIRA', 'البحيرة', 'Beheira'], ['KAFR_EL_SHEIKH', 'كفر الشيخ', 'Kafr El Sheikh'], ['DAMIETTA', 'دمياط', 'Damietta'],
  ['PORT_SAID', 'بورسعيد', 'Port Said'], ['ISMAILIA', 'الإسماعيلية', 'Ismailia'], ['SUEZ', 'السويس', 'Suez'],
  ['NORTH_SINAI', 'شمال سيناء', 'North Sinai'], ['SOUTH_SINAI', 'جنوب سيناء', 'South Sinai'], ['RED_SEA', 'البحر الأحمر', 'Red Sea'],
  ['MATROUH', 'مطروح', 'Matrouh'], ['FAYOUM', 'الفيوم', 'Fayoum'], ['BENI_SUEF', 'بني سويف', 'Beni Suef'],
  ['MINYA', 'المنيا', 'Minya'], ['ASSIUT', 'أسيوط', 'Assiut'], ['SOHAG', 'سوهاج', 'Sohag'], ['QENA', 'قنا', 'Qena'],
  ['LUXOR', 'الأقصر', 'Luxor'], ['ASWAN', 'أسوان', 'Aswan'], ['NEW_VALLEY', 'الوادي الجديد', 'New Valley'],
  ['OUTSIDE_EGYPT', 'خارج مصر', 'Outside Egypt'],
] as const;

const labelFor = <T extends string>(items: Choice<T>[], value: T | '', locale: Locale) =>
  items.find((item) => item.value === value)?.[locale] ?? '—';

export function ProjectBuilder({ locale, intakeEnabled }: { locale: Locale; intakeEnabled: boolean }) {
  const ar = locale === 'ar';
  const L = (arabic: string, english: string) => (ar ? arabic : english);
  const [step, setStep] = useState(1);
  const [clientKind, setClientKind] = useState<ClientKind | ''>('');
  const [stage, setStage] = useState<ProjectStage | ''>('');
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<SmartHomePackageId | ''>('');
  const [details, setDetails] = useState({
    projectName: '', organisation: '', outcome: '', constraints: '', timeline: 'UNSURE', governorate: 'UNSURE',
    propertyType: '', rooms: '', softwareUsers: '', hardwareState: '', existingSystem: '',
  });
  const [copyState, setCopyState] = useState('');
  const [submitState, setSubmitState] = useState<{ status: 'idle' | 'busy' | 'error' | 'done'; message?: string; ref?: string }>({ status: 'idle' });
  const topRef = useRef<HTMLDivElement>(null);
  const idempotencyKey = useMemo(() => globalThis.crypto?.randomUUID?.().replaceAll('-', '') ?? `${Date.now()}${Math.random().toString(36).slice(2)}`, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const packageValue = query.get('package')?.toLowerCase();
    const serviceValue = query.get('service')?.toLowerCase();
    if (isSmartHomePackageId(packageValue)) {
      setSelectedPackage(packageValue);
      setDisciplines((current) => current.includes('SMART_HOME') ? current : [...current.filter((item) => item !== 'UNSURE'), 'SMART_HOME']);
    }
    const inferred = serviceValue ? SERVICE_DISCIPLINE[serviceValue] : undefined;
    if (inferred) setDisciplines((current) => current.includes(inferred) ? current : [...current.filter((item) => item !== 'UNSURE'), inferred]);
  }, []);

  const includes = (value: Discipline) => disciplines.includes(value);
  const brief = useMemo(() => {
    const packageEntry = smartHomePackage(selectedPackage);
    const rows = [
      [L('نوع العميل', 'Client type'), clientKind ? labelFor(CLIENTS, clientKind, locale) : '—'],
      [L('مرحلة المشروع', 'Project stage'), stage ? labelFor(STAGES, stage, locale) : '—'],
      [L('التخصصات', 'Disciplines'), disciplines.length ? disciplines.map((value) => labelFor(DISCIPLINES, value, locale)).join('، ') : '—'],
      [L('اسم المشروع', 'Project name'), details.projectName || '—'],
      [L('النتيجة المطلوبة', 'Desired outcome'), details.outcome || '—'],
      [L('القيود المعروفة', 'Known constraints'), details.constraints || L('لم تُذكر', 'Not provided')],
      [L('التوقيت', 'Timeline'), details.timeline],
      [L('الموقع', 'Location'), GOVERNORATES.find((item) => item[0] === details.governorate)?.[ar ? 1 : 2] ?? '—'],
    ];
    if (clientKind === 'BUSINESS') rows.push([L('الجهة', 'Organisation'), details.organisation || '—']);
    if (includes('SMART_HOME')) {
      rows.push([L('نوع المساحة', 'Property type'), details.propertyType || '—']);
      rows.push([L('عدد الغرف التقريبي', 'Approximate rooms'), details.rooms || '—']);
      rows.push([L('الباقة محل الاهتمام', 'Package of interest'), packageEntry ? packageText(packageEntry.name, locale) : L('غير محددة', 'Not selected')]);
    }
    if (includes('SOFTWARE')) rows.push([L('المستخدمون أو النطاق', 'Users or scale'), details.softwareUsers || '—']);
    if (includes('IOT_EMBEDDED')) rows.push([L('حالة العتاد', 'Hardware state'), details.hardwareState || '—']);
    if (stage === 'EXISTING') rows.push([L('النظام الحالي', 'Current system'), details.existingSystem || '—']);
    return `${L('موجز مشروع OTONOM', 'OTONOM project brief')}\n\n${rows.map(([key, value]) => `${key}: ${value}`).join('\n')}`;
  }, [ar, clientKind, details, disciplines, locale, selectedPackage, stage]);

  const go = (next: number) => {
    setStep(Math.max(1, Math.min(6, next)));
    setCopyState('');
    requestAnimationFrame(() => topRef.current?.focus());
  };
  const toggleDiscipline = (value: Discipline) => {
    setDisciplines((current) => {
      if (value === 'UNSURE') return current.includes(value) ? [] : ['UNSURE'];
      const clean = current.filter((item) => item !== 'UNSURE');
      return clean.includes(value) ? clean.filter((item) => item !== value) : [...clean, value];
    });
  };
  const valid = step === 1 ? !!clientKind : step === 2 ? !!stage : step === 3 ? disciplines.length > 0 : step === 4 ? details.outcome.trim().length >= 20 : true;

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(brief);
      setCopyState(L('تم نسخ الموجز.', 'Brief copied.'));
    } catch {
      setCopyState(L('تعذر النسخ التلقائي. حدّد النص وانسخه يدويًا.', 'Automatic copy failed. Select the text and copy it manually.'));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!intakeEnabled || submitState.status === 'busy') return;
    const form = new FormData(event.currentTarget);
    setSubmitState({ status: 'busy' });
    const payload = {
      kind: 'RFQ', idempotencyKey, locale, source: 'PROJECT_BUILDER_V1', clientKind, projectStage: stage,
      disciplines, package: selectedPackage || undefined, details,
      fullName: form.get('fullName'), email: form.get('email'), phone: form.get('phone'),
      organisationName: details.organisation, customerType: clientKind, projectType: includes('SMART_HOME') ? 'SMART_HOME' : includes('INTEGRATED') ? 'INTEGRATED' : 'CUSTOM_PROJECT',
      governorate: details.governorate, systems: disciplines, engagementModel: 'UNSURE', description: brief,
      consentProcessing: form.get('consentProcessing') === 'on', consentMarketing: false,
      attribution: { landingPage: window.location.pathname },
    };
    try {
      const response = await fetch('/api/rfq', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.ref) setSubmitState({ status: 'done', ref: result.ref });
      else setSubmitState({ status: 'error', message: response.status === 429 ? L('محاولات كثيرة. حاول لاحقًا.', 'Too many attempts. Try again later.') : L('تعذر إرسال الطلب. راجع الحقول وحاول مرة أخرى.', 'The request could not be sent. Review the fields and try again.') });
    } catch {
      setSubmitState({ status: 'error', message: L('تعذر الاتصال. بياناتك ما زالت في هذه الصفحة.', 'Could not connect. Your data remains on this page.') });
    }
  }

  return (
    <div className="project-builder" ref={topRef} tabIndex={-1} data-testid="project-builder">
      <div className="builder-intro">
        <p>{L('لا تُحفظ إجاباتك أثناء بناء الموجز. يمكنك النسخ أو الطباعة قبل اختيار التواصل.', 'Your answers are not stored while you build the brief. You can copy or print it before choosing to contact us.')}</p>
      </div>
      <ol className="builder-progress" aria-label={L('خطوات بناء المشروع', 'Project Builder steps')}>
        {[L('العميل', 'Client'), L('المرحلة', 'Stage'), L('المجال', 'Discipline'), L('التفاصيل', 'Details'), L('الموجز', 'Brief'), L('التواصل', 'Contact')].map((label, index) => (
          <li key={label} data-active={step === index + 1} data-complete={step > index + 1} aria-current={step === index + 1 ? 'step' : undefined}><span>{index + 1}</span>{label}</li>
        ))}
      </ol>

      <section className="builder-panel" aria-live="polite">
        {step === 1 && <ChoiceStep title={L('من يبني هذا المشروع؟', 'Who is building this project?')} choices={CLIENTS} locale={locale} selected={[clientKind]} onChoose={(value) => setClientKind(value as ClientKind)} />}
        {step === 2 && <ChoiceStep title={L('أين وصل المشروع الآن؟', 'Where is the project today?')} choices={STAGES} locale={locale} selected={[stage]} onChoose={(value) => setStage(value as ProjectStage)} />}
        {step === 3 && <ChoiceStep title={L('ما المجالات الأقرب للمشروع؟', 'Which disciplines fit the project?')} hint={L('يمكن اختيار أكثر من مجال.', 'You may choose more than one.')} choices={DISCIPLINES} locale={locale} selected={disciplines} onChoose={(value) => toggleDiscipline(value as Discipline)} multiple />}
        {step === 4 && (
          <div>
            <h2>{L('أضف السياق الذي يغيّر القرار الهندسي', 'Add the context that changes the engineering decision')}</h2>
            <div className="builder-fields">
              <label>{L('اسم مختصر للمشروع (اختياري)', 'Short project name (optional)')}<input value={details.projectName} maxLength={100} onChange={(event) => setDetails({ ...details, projectName: event.target.value })} /></label>
              {clientKind === 'BUSINESS' && <label>{L('اسم الجهة (اختياري)', 'Organisation (optional)')}<input value={details.organisation} maxLength={160} onChange={(event) => setDetails({ ...details, organisation: event.target.value })} /></label>}
              <label className="wide">{L('ما النتيجة التي تريد الوصول إليها؟', 'What outcome do you want?')}<textarea required minLength={20} maxLength={1600} rows={5} value={details.outcome} onChange={(event) => setDetails({ ...details, outcome: event.target.value })} /><small>{L('اكتب 20 حرفًا على الأقل، ولا تضع كلمات مرور أو بيانات حساسة.', 'Write at least 20 characters and do not include passwords or sensitive data.')}</small></label>
              <label>{L('الموقع التقريبي', 'Approximate location')}<select value={details.governorate} onChange={(event) => setDetails({ ...details, governorate: event.target.value })}>{GOVERNORATES.map((item) => <option value={item[0]} key={item[0]}>{item[ar ? 1 : 2]}</option>)}</select></label>
              <label>{L('التوقيت المبدئي', 'Initial timeline')}<select value={details.timeline} onChange={(event) => setDetails({ ...details, timeline: event.target.value })}><option value="UNSURE">{L('غير محدد بعد', 'Not decided yet')}</option><option value="0_3_MONTHS">{L('خلال 3 أشهر', 'Within 3 months')}</option><option value="3_6_MONTHS">{L('من 3 إلى 6 أشهر', '3 to 6 months')}</option><option value="6_PLUS_MONTHS">{L('أكثر من 6 أشهر', 'More than 6 months')}</option></select></label>
              {includes('SMART_HOME') && <><label>{L('نوع المساحة', 'Property type')}<select value={details.propertyType} onChange={(event) => setDetails({ ...details, propertyType: event.target.value })}><option value="">{L('اختر', 'Choose')}</option><option value="APARTMENT">{L('شقة', 'Apartment')}</option><option value="VILLA">{L('فيلا', 'Villa')}</option><option value="COMMERCIAL">{L('تجاري', 'Commercial')}</option><option value="OTHER">{L('أخرى', 'Other')}</option></select></label><label>{L('عدد الغرف التقريبي', 'Approximate rooms')}<input inputMode="numeric" value={details.rooms} maxLength={4} onChange={(event) => setDetails({ ...details, rooms: event.target.value.replace(/\D/g, '') })} /></label><label className="wide">{L('الباقة محل الاهتمام (اختياري)', 'Package of interest (optional)')}<select value={selectedPackage} onChange={(event) => setSelectedPackage(event.target.value as SmartHomePackageId | '')}><option value="">{L('أحتاج مساعدة في الاختيار', 'I need help choosing')}</option><option value="premium">Premium</option><option value="plus">Plus</option><option value="essential">Essential</option></select></label></>}
              {includes('SOFTWARE') && <label className="wide">{L('من سيستخدم النظام وما حجمه المتوقع؟', 'Who will use the system and at what scale?')}<input value={details.softwareUsers} maxLength={300} onChange={(event) => setDetails({ ...details, softwareUsers: event.target.value })} /></label>}
              {includes('IOT_EMBEDDED') && <label className="wide">{L('ما حالة العتاد أو النموذج الحالي؟', 'What is the current hardware or prototype state?')}<input value={details.hardwareState} maxLength={300} onChange={(event) => setDetails({ ...details, hardwareState: event.target.value })} /></label>}
              {stage === 'EXISTING' && <label className="wide">{L('صف النظام الحالي وحدود تغييره', 'Describe the current system and change boundaries')}<textarea rows={3} value={details.existingSystem} maxLength={800} onChange={(event) => setDetails({ ...details, existingSystem: event.target.value })} /></label>}
              <label className="wide">{L('قيود أو أنظمة أو قرارات معروفة (اختياري)', 'Known constraints, systems or decisions (optional)')}<textarea rows={3} value={details.constraints} maxLength={800} onChange={(event) => setDetails({ ...details, constraints: event.target.value })} /></label>
            </div>
          </div>
        )}
        {step === 5 && (
          <div>
            <h2>{L('موجز مشروعك', 'Your project brief')}</h2>
            <p>{L('راجع النص وعدّل الخطوات السابقة عند الحاجة. هذا موجز اكتشاف وليس عرض سعر أو تأكيد جدوى.', 'Review the text and revisit earlier steps if needed. This is a discovery brief, not a quotation or feasibility confirmation.')}</p>
            <pre className="builder-brief" tabIndex={0}>{brief}</pre>
            <div className="actions"><button type="button" className="btn secondary" onClick={copyBrief}>{L('نسخ الموجز', 'Copy brief')}</button><button type="button" className="btn secondary" onClick={() => window.print()}>{L('طباعة / حفظ PDF', 'Print / save PDF')}</button></div>
            {copyState && <p role="status" className="small">{copyState}</p>}
          </div>
        )}
        {step === 6 && (
          <div>
            <h2>{L('الخطوة التالية', 'Next step')}</h2>
            {intakeEnabled ? (
              submitState.status === 'done' ? <div className="ok" role="status"><strong>{L('تم استلام طلبك.', 'Your request has been received.')}</strong> {L('الرقم المرجعي:', 'Reference:')} <bdi dir="ltr">{submitState.ref}</bdi></div> :
              <form className="builder-contact" onSubmit={submit}>
                <p>{L('لن نطلب ملفات في هذه المرحلة.', 'No files are requested at this stage.')}</p>
                <div className="builder-fields"><label>{L('الاسم', 'Name')}<input name="fullName" required minLength={2} autoComplete="name" /></label><label>{L('البريد الإلكتروني', 'Email')}<input name="email" type="email" autoComplete="email" dir="ltr" /></label><label>{L('الهاتف', 'Phone')}<input name="phone" type="tel" autoComplete="tel" dir="ltr" /></label></div>
                <label className="consent-row"><input type="checkbox" name="consentProcessing" required /> <span>{L('أوافق على معالجة بيانات هذا الطلب وفق ', 'I consent to processing this request under the ')}<a href={`/${locale}/legal/privacy`}>{L('سياسة الخصوصية', 'privacy policy')}</a>.</span></label>
                {submitState.status === 'error' && <p role="alert" className="err">{submitState.message}</p>}
                <button className="btn" disabled={submitState.status === 'busy'}>{submitState.status === 'busy' ? L('جاري الإرسال…', 'Sending…') : L('إرسال طلب المشروع', 'Send project request')}</button>
              </form>
            ) : (
              <div className="intake-locked" data-testid="project-intake-disabled">
                <strong>{L('الاستقبال الإلكتروني للبيانات غير مفعّل حاليًا.', 'Online personal-data intake is not currently enabled.')}</strong>
                <p>{L('يمكنك نسخ الموجز أو طباعته الآن. لن يطلب الموقع اسمك أو بريدك أو هاتفك حتى اعتماد إشعار الخصوصية وسياسة الاحتفاظ وتشغيل مسار المتابعة.', 'You can copy or print the brief now. The site will not request your name, email or phone until the privacy notice, retention policy and operational follow-up are approved.')}</p>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="builder-nav">
        {step > 1 && <button type="button" className="btn secondary" onClick={() => go(step - 1)}>{L('السابق', 'Back')}</button>}
        {step < 6 && <button type="button" className="btn" disabled={!valid} onClick={() => go(step + 1)}>{step === 5 ? L('اختيار التواصل', 'Choose contact') : L('التالي', 'Continue')}</button>}
      </div>
    </div>
  );
}

function ChoiceStep<T extends string>({ title, hint, choices, locale, selected, multiple = false, onChoose }: { title: string; hint?: string; choices: Choice<T>[]; locale: Locale; selected: string[]; multiple?: boolean; onChoose: (value: T) => void }) {
  return <div><h2>{title}</h2>{hint && <p>{hint}</p>}<div className="builder-choices">{choices.map((choice) => { const active = selected.includes(choice.value); return <button type="button" key={choice.value} className="builder-choice" data-selected={active} aria-pressed={multiple ? active : undefined} onClick={() => onChoose(choice.value)}><strong>{choice[locale]}</strong>{(choice.bodyAr || choice.bodyEn) && <span>{locale === 'ar' ? choice.bodyAr : choice.bodyEn}</span>}<span className="choice-mark" aria-hidden="true">{active ? '✓' : '→'}</span></button>; })}</div></div>;
}
