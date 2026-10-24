'use client';
import { useEffect, useState, type FormEvent } from 'react';

type Step = 'password' | 'email' | 'enroll' | 'totp' | 'done';
type Locale = 'ar' | 'en';

const copy = {
  en: {
    title: 'OTONOM staff sign-in', language: 'العربية', email: 'Email', password: 'Password', continue: 'Continue', working: 'Please wait…',
    signInFailed: 'Sign-in failed. Check your email and password.', statusFailed: 'Unable to check verification status.',
    emailTitle: 'Check your email', emailSent: (destination: string) => `We sent a six-digit code to ${destination}.`, emailCode: 'Email verification code',
    verifyEmail: 'Verify email code', resend: 'Resend code', resendIn: (seconds: number) => `Resend in ${seconds}s`, expiresIn: (seconds: number) => `Code expires in ${seconds}s.`,
    emailInvalid: 'That code is not valid. Check the latest email and try again.', emailExpired: 'That code expired. Request a new one.', emailLocked: 'Too many incorrect attempts. Request a new code.',
    emailUnavailable: 'Email verification is temporarily unavailable. Try again shortly.',
    enrollText: 'This staff account must enroll an authenticator before admin access is allowed.', createKey: 'Create authenticator key',
    setupText: 'Add this one-time setup key to your authenticator. It is shown only during enrollment.', setupKey: 'Authenticator setup key',
    authenticatorCode: 'Authenticator code', recoveryCode: 'Recovery code', verifyFinish: 'Verify and finish', verify: 'Verify',
    useAuthenticator: 'Use authenticator code', useRecovery: 'Use a recovery code', mfaInvalid: 'Code not accepted. Wait for the next code and try again.', recoveryInvalid: 'Recovery code not accepted.',
    verified: 'Verified. Opening the admin panel…', saveRecovery: 'Save these one-time recovery codes securely. They will not be shown again.', recoveryCodes: 'Recovery codes', admin: 'Continue to admin',
  },
  ar: {
    title: 'تسجيل دخول فريق OTONOM', language: 'English', email: 'البريد الإلكتروني', password: 'كلمة المرور', continue: 'متابعة', working: 'جارٍ التنفيذ…',
    signInFailed: 'تعذر تسجيل الدخول. راجع البريد وكلمة المرور.', statusFailed: 'تعذر التحقق من حالة الحماية.',
    emailTitle: 'راجع بريدك الإلكتروني', emailSent: (destination: string) => `أرسلنا رمزاً من ستة أرقام إلى ${destination}.`, emailCode: 'رمز التحقق من البريد',
    verifyEmail: 'تحقق من رمز البريد', resend: 'إعادة إرسال الرمز', resendIn: (seconds: number) => `إعادة الإرسال خلال ${seconds}ث`, expiresIn: (seconds: number) => `ينتهي الرمز خلال ${seconds}ث.`,
    emailInvalid: 'الرمز غير صحيح. استخدم أحدث رسالة وحاول مرة أخرى.', emailExpired: 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.', emailLocked: 'تجاوزت عدد المحاولات. اطلب رمزاً جديداً.',
    emailUnavailable: 'التحقق عبر البريد غير متاح مؤقتاً. حاول بعد قليل.',
    enrollText: 'يجب ربط تطبيق مصادقة بهذا الحساب قبل دخول لوحة الإدارة.', createKey: 'إنشاء مفتاح المصادقة',
    setupText: 'أضف مفتاح الإعداد لمرة واحدة إلى تطبيق المصادقة. لن يظهر بعد إتمام الربط.', setupKey: 'مفتاح إعداد تطبيق المصادقة',
    authenticatorCode: 'رمز تطبيق المصادقة', recoveryCode: 'رمز الاسترداد', verifyFinish: 'تحقق وأكمل', verify: 'تحقق',
    useAuthenticator: 'استخدام تطبيق المصادقة', useRecovery: 'استخدام رمز استرداد', mfaInvalid: 'الرمز غير مقبول. انتظر الرمز التالي وحاول مرة أخرى.', recoveryInvalid: 'رمز الاسترداد غير مقبول.',
    verified: 'تم التحقق. جارٍ فتح لوحة الإدارة…', saveRecovery: 'احفظ رموز الاسترداد أحادية الاستخدام بأمان. لن تظهر مرة أخرى.', recoveryCodes: 'رموز الاسترداد', admin: 'متابعة إلى لوحة الإدارة',
  },
} as const;

/** Password, email OTP and existing TOTP/recovery verification bound to one Payload session. */
export function StaffLogin() {
  const [step, setStep] = useState<Step>('password');
  const [locale, setLocale] = useState<Locale>('en');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [enrollmentSecret, setEnrollmentSecret] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [destination, setDestination] = useState('your inbox');
  const [expiresAt, setExpiresAt] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const t = copy[locale];

  useEffect(() => {
    if (step !== 'email') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [step]);

  const expiresIn = Math.max(0, Math.ceil((expiresAt - now) / 1_000));
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1_000));

  async function requestEmailCode(): Promise<boolean> {
    setBusy(true);
    setErr(null);
    const response = await fetch('/api/mfa/email/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale }),
    }).catch(() => null);
    const data = response ? await response.json().catch(() => null) : null;
    setBusy(false);
    if (response?.ok) {
      const at = Date.now();
      setNow(at);
      setExpiresAt(at + Number(data?.expiresInSec ?? 300) * 1_000);
      setResendAt(at + Number(data?.resendAfterSec ?? 60) * 1_000);
      if (typeof data?.destination === 'string') setDestination(data.destination);
      setStep('email');
      return true;
    }
    if (response?.status === 429 && Number(data?.retryAfterSec) > 0) {
      const at = Date.now();
      setNow(at);
      setResendAt(at + Number(data.retryAfterSec) * 1_000);
      setStep('email');
    }
    setErr(t.emailUnavailable);
    return false;
  }

  async function login(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setBusy(true);
    setErr(null);
    const form = new FormData(ev.currentTarget);
    const response = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    }).catch(() => null);
    if (!response?.ok) {
      setBusy(false);
      setErr(t.signInFailed);
      return;
    }
    const status = await fetch('/api/mfa/status', { cache: 'no-store' }).catch(() => null);
    const data = status?.ok ? await status.json().catch(() => null) : null;
    setBusy(false);
    if (!status?.ok || typeof data?.enrolled !== 'boolean') {
      setErr(t.statusFailed);
      return;
    }
    if (data.emailOtpRequired && !data.emailOtpVerified) await requestEmailCode();
    else setStep(data.enrolled ? 'totp' : 'enroll');
  }

  async function verifyEmail(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setBusy(true);
    setErr(null);
    const code = String(new FormData(ev.currentTarget).get('code') ?? '').trim();
    const response = await fetch('/api/mfa/email/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) }).catch(() => null);
    const data = response ? await response.json().catch(() => null) : null;
    setBusy(false);
    if (response?.ok) {
      if (data?.next === 'done' || data?.mfaVerified === true) {
        setStep('done');
        window.location.assign('/admin');
      } else setStep(data?.next === 'enroll' ? 'enroll' : 'totp');
      return;
    }
    setErr(data?.code === 'EMAIL_OTP_EXPIRED' ? t.emailExpired : data?.code === 'EMAIL_OTP_LOCKED' ? t.emailLocked : t.emailInvalid);
  }

  async function beginEnrollment() {
    setBusy(true);
    setErr(null);
    const response = await fetch('/api/mfa/enroll', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => null);
    const data = response?.ok ? await response.json().catch(() => null) : null;
    setBusy(false);
    if (response?.ok && typeof data?.secret === 'string') setEnrollmentSecret(data.secret);
    else setErr(t.statusFailed);
  }

  async function finishEnrollment(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setBusy(true);
    setErr(null);
    const code = String(new FormData(ev.currentTarget).get('code') ?? '').trim();
    const response = await fetch('/api/mfa/enroll/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) }).catch(() => null);
    const data = response?.ok ? await response.json().catch(() => null) : null;
    setBusy(false);
    if (response?.ok && data?.mfaVerified === true && Array.isArray(data?.recoveryCodes)) {
      setRecoveryCodes(data.recoveryCodes);
      setStep('done');
    } else setErr(t.mfaInvalid);
  }

  async function verifyStrongFactor(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setBusy(true);
    setErr(null);
    const code = String(new FormData(ev.currentTarget).get('code') ?? '').trim();
    const response = await fetch(useRecovery ? '/api/mfa/recovery' : '/api/mfa/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) }).catch(() => null);
    const data = response?.ok ? await response.json().catch(() => null) : null;
    setBusy(false);
    if (response?.ok && data?.mfaVerified === true) {
      setStep('done');
      window.location.assign('/admin');
    } else setErr(useRecovery ? t.recoveryInvalid : t.mfaInvalid);
  }

  return (
    <section className="staff-auth" lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="staff-auth-heading">
        <h1>{t.title}</h1>
        <button type="button" className="staff-language" onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}>{t.language}</button>
      </div>
      {step === 'password' && (
        <form className="rfq" onSubmit={login}>
          <label>{t.email}<input name="email" type="email" dir="ltr" autoComplete="username" required /></label>
          <label>{t.password}<input name="password" type="password" dir="ltr" autoComplete="current-password" required /></label>
          <button className="btn" disabled={busy}>{busy ? t.working : t.continue}</button>
        </form>
      )}
      {step === 'email' && (
        <form className="rfq" onSubmit={verifyEmail}>
          <h2>{t.emailTitle}</h2>
          <p>{t.emailSent(destination)}</p>
          <label>{t.emailCode}<input name="code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required aria-describedby="email-code-timing" /></label>
          <p id="email-code-timing" className="staff-auth-hint" aria-live="polite">{t.expiresIn(expiresIn)}</p>
          <button className="btn" disabled={busy || expiresIn === 0}>{busy ? t.working : t.verifyEmail}</button>
          <button type="button" className="btn secondary" disabled={busy || resendIn > 0} onClick={() => void requestEmailCode()}>{resendIn > 0 ? t.resendIn(resendIn) : t.resend}</button>
        </form>
      )}
      {step === 'enroll' && !enrollmentSecret && (
        <div className="auth-card"><p>{t.enrollText}</p><button className="btn" disabled={busy} onClick={beginEnrollment}>{busy ? t.working : t.createKey}</button></div>
      )}
      {step === 'enroll' && enrollmentSecret && (
        <form className="rfq" onSubmit={finishEnrollment}>
          <p>{t.setupText}</p><output className="staff-secret" dir="ltr" aria-label={t.setupKey}>{enrollmentSecret}</output>
          <label>{t.authenticatorCode}<input name="code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required /></label>
          <button className="btn" disabled={busy}>{busy ? t.working : t.verifyFinish}</button>
        </form>
      )}
      {step === 'totp' && (
        <form className="rfq" onSubmit={verifyStrongFactor}>
          <label>{useRecovery ? t.recoveryCode : t.authenticatorCode}<input name="code" dir="ltr" inputMode={useRecovery ? 'text' : 'numeric'} autoComplete="one-time-code" required /></label>
          <button className="btn" disabled={busy}>{busy ? t.working : t.verify}</button>
          <button type="button" className="btn secondary" onClick={() => setUseRecovery(!useRecovery)}>{useRecovery ? t.useAuthenticator : t.useRecovery}</button>
        </form>
      )}
      {step === 'done' && recoveryCodes.length === 0 && <p role="status">{t.verified}</p>}
      {step === 'done' && recoveryCodes.length > 0 && (
        <div className="auth-card"><p>{t.saveRecovery}</p><output className="staff-secret" dir="ltr" aria-label={t.recoveryCodes}>{recoveryCodes.join('\n')}</output><button className="btn" onClick={() => window.location.assign('/admin')}>{t.admin}</button></div>
      )}
      {err && <p className="err" role="alert" aria-live="assertive">{err}</p>}
    </section>
  );
}
