'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { staffLoginWords } from '@/admin-ui/copy.ts';

type Step = 'password' | 'email' | 'enroll' | 'totp' | 'reenroll' | 'done';
type Locale = 'ar' | 'en';


/** Password, email OTP and existing TOTP/recovery verification bound to one Payload session. */
export function StaffLogin({ forgotPasswordEnabled = false, initialLocale = 'ar' }: { forgotPasswordEnabled?: boolean; initialLocale?: Locale }) {
  const [step, setStep] = useState<Step>('password');
  // R3: Arabic unless the person chose English; the choice is remembered and carries into the admin
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [enrollmentSecret, setEnrollmentSecret] = useState<string | null>(null);
  const [reenrollToken, setReenrollToken] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [destination, setDestination] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const t = staffLoginWords(locale);

  // the UI-language preference only (Payload's `payload-lng`, not an auth cookie): saved on the first visit and on
  // every switch, so the admin opens in the same language after sign-in
  useEffect(() => {
    const secure = window.location.protocol === 'https:' ? '; secure' : '';
    document.cookie = `payload-lng=${locale}; path=/; max-age=31536000; samesite=lax${secure}`;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

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
    if (data.passwordOnlyAuthorized === true && data.authorized === true) {
      setStep('done');
      window.location.assign('/admin');
    } else if (data.emailOtpRequired && !data.emailOtpVerified) await requestEmailCode();
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
      if (useRecovery && data?.reenrollAvailable === true) {
        setStep('reenroll');
        return;
      }
      setStep('done');
      window.location.assign('/admin');
    } else setErr(useRecovery ? t.recoveryInvalid : t.mfaInvalid);
  }

  async function beginReenrollment() {
    setBusy(true);
    setErr(null);
    const response = await fetch('/api/mfa/reenroll', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => null);
    const data = response?.ok ? await response.json().catch(() => null) : null;
    setBusy(false);
    if (response?.ok && typeof data?.secret === 'string' && typeof data?.enrollToken === 'string') {
      setEnrollmentSecret(data.secret);
      setReenrollToken(data.enrollToken);
    } else setErr(t.statusFailed);
  }

  async function finishReenrollment(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setBusy(true);
    setErr(null);
    const code = String(new FormData(ev.currentTarget).get('code') ?? '').trim();
    const response = await fetch('/api/mfa/reenroll/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, enrollToken: reenrollToken }) }).catch(() => null);
    const data = response ? await response.json().catch(() => null) : null;
    setBusy(false);
    if (response?.ok && Array.isArray(data?.recoveryCodes)) {
      setRecoveryCodes(data.recoveryCodes);
      setEnrollmentSecret(null);
      setReenrollToken(null);
      setStep('done');
    } else if (data?.code === 'MFA_REENROLLMENT_EXPIRED') {
      setEnrollmentSecret(null);
      setReenrollToken(null);
      setErr(t.reenrollExpired);
    } else setErr(t.mfaInvalid);
  }

  return (
    <section className="staff-auth" lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="staff-auth-heading">
        {/* official Hybrid 03 lockup for light surfaces, byte-for-byte; never mirrored in RTL */}
        <img className="staff-logo" src="/brand/otonom/assets/svg/primary_light.svg" alt="OTONOM IoT Solutions" width={820} height={217} />
        <div className="otn-lang" role="group" aria-label={locale === 'ar' ? 'اللغة' : 'Language'}>
          <button type="button" lang="ar" className="otn-lang__btn staff-language" aria-pressed={locale === 'ar'} onClick={() => setLocale('ar')}>عربي</button>
          <button type="button" lang="en" className="otn-lang__btn staff-language" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>English</button>
        </div>
      </div>
      <div className="staff-auth-title">
        <h1>{t.title}</h1>
        <p>{t.line}</p>
      </div>
      {step === 'password' && (
        <form className="rfq" onSubmit={login}>
          <label>{t.email}<input name="email" type="email" dir="ltr" autoComplete="username" required /></label>
          <label>{t.password}<input name="password" type="password" dir="ltr" autoComplete="current-password" required /></label>
          <button className="btn" disabled={busy}>{busy ? t.working : t.continue}</button>
          {forgotPasswordEnabled ? <a href="/staff/forgot" data-testid="staff-forgot-link">{t.forgot}</a> : null}
        </form>
      )}
      {step === 'email' && (
        <form className="rfq" onSubmit={verifyEmail}>
          <h2>{t.emailTitle}</h2>
          <p>{t.emailSent(destination || t.yourInbox)}</p>
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
      {step === 'reenroll' && !enrollmentSecret && (
        <div className="auth-card" data-testid="staff-reenroll">
          <h2>{t.reenrollTitle}</h2>
          <p>{t.reenrollText}</p>
          <button className="btn" disabled={busy} onClick={beginReenrollment}>{busy ? t.working : t.reenrollStart}</button>
          <button type="button" className="btn secondary" onClick={() => window.location.assign('/admin')}>{t.reenrollLater}</button>
        </div>
      )}
      {step === 'reenroll' && enrollmentSecret && (
        <form className="rfq" onSubmit={finishReenrollment}>
          <p>{t.setupText}</p><output className="staff-secret" dir="ltr" aria-label={t.setupKey}>{enrollmentSecret}</output>
          <label>{t.authenticatorCode}<input name="code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required /></label>
          <button className="btn" disabled={busy}>{busy ? t.working : t.verifyFinish}</button>
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
