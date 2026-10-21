'use client';
import { useState, type FormEvent } from 'react';

/** Password login followed by required TOTP verification or first-login enrollment. */
export function StaffLogin() {
  const [step, setStep] = useState<'password' | 'enroll' | 'totp' | 'done'>('password');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [enrollmentSecret, setEnrollmentSecret] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  async function login(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setBusy(true);
    setErr(null);
    const f = new FormData(ev.currentTarget);
    const r = await fetch('/api/users/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: f.get('email'), password: f.get('password') }) }).catch(() => null);
    setBusy(false);
    if (!r?.ok) {
      setErr('Sign-in failed. Check your email and password.');
      return;
    }
    const status = await fetch('/api/mfa/status', { cache: 'no-store' }).catch(() => null);
    const data = status?.ok ? await status.json().catch(() => null) : null;
    if (!status?.ok || typeof data?.enrolled !== 'boolean') setErr('Unable to check authenticator status.');
    else setStep(data.enrolled ? 'totp' : 'enroll');
  }

  async function beginEnrollment() {
    setBusy(true);
    setErr(null);
    const r = await fetch('/api/mfa/enroll', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => null);
    const data = r?.ok ? await r.json().catch(() => null) : null;
    setBusy(false);
    if (r?.ok && typeof data?.secret === 'string') setEnrollmentSecret(data.secret);
    else setErr('Authenticator enrollment could not be started.');
  }

  async function finishEnrollment(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setBusy(true);
    setErr(null);
    const code = String(new FormData(ev.currentTarget).get('code') ?? '').trim();
    const r = await fetch('/api/mfa/enroll/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) }).catch(() => null);
    const data = r?.ok ? await r.json().catch(() => null) : null;
    setBusy(false);
    if (r?.ok && Array.isArray(data?.recoveryCodes)) {
      setRecoveryCodes(data.recoveryCodes);
      setStep('done');
    } else setErr('Code not accepted. Wait for the next code and try again.');
  }

  async function verify(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setBusy(true);
    setErr(null);
    const code = String(new FormData(ev.currentTarget).get('code') ?? '').trim();
    const r = await fetch(useRecovery ? '/api/mfa/recovery' : '/api/mfa/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) }).catch(() => null);
    setBusy(false);
    if (r?.ok) {
      setStep('done');
      window.location.assign('/admin');
    } else setErr(useRecovery ? 'Recovery code not accepted.' : 'Code not accepted. Wait for the next code and try again.');
  }

  return (
    <section>
      <h1>OTONOM staff sign-in</h1>
      {step === 'password' && (
        <form className="rfq" onSubmit={login}>
          <label>
            Email
            <input name="email" type="email" dir="ltr" autoComplete="username" required />
          </label>
          <label>
            Password
            <input name="password" type="password" dir="ltr" autoComplete="current-password" required />
          </label>
          <button className="btn" disabled={busy}>Continue</button>
        </form>
      )}
      {step === 'enroll' && !enrollmentSecret && (
        <div className="rfq">
          <p>This staff account must enroll an authenticator before admin access is allowed.</p>
          <button className="btn" disabled={busy} onClick={beginEnrollment}>Create authenticator key</button>
        </div>
      )}
      {step === 'enroll' && enrollmentSecret && (
        <form className="rfq" onSubmit={finishEnrollment}>
          <p>Add this one-time setup key to your authenticator. It is shown only during enrollment.</p>
          <output dir="ltr" aria-label="Authenticator setup key">{enrollmentSecret}</output>
          <label>
            Authenticator code
            <input name="code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" required />
          </label>
          <button className="btn" disabled={busy}>Verify and finish</button>
        </form>
      )}
      {step === 'totp' && (
        <form className="rfq" onSubmit={verify}>
          <label>
            {useRecovery ? 'Recovery code' : 'Authenticator code'}
            <input name="code" dir="ltr" inputMode={useRecovery ? 'text' : 'numeric'} autoComplete="one-time-code" required />
          </label>
          <button className="btn" disabled={busy}>Verify</button>
          <button type="button" className="btn secondary" onClick={() => setUseRecovery(!useRecovery)}>
            {useRecovery ? 'Use authenticator code' : 'Use a recovery code'}
          </button>
        </form>
      )}
      {step === 'done' && recoveryCodes.length === 0 && <p>Verified. Opening the admin panel...</p>}
      {step === 'done' && recoveryCodes.length > 0 && (
        <div className="rfq">
          <p>Save these one-time recovery codes securely. They will not be shown again.</p>
          <output dir="ltr" aria-label="Recovery codes">{recoveryCodes.join('\n')}</output>
          <button className="btn" onClick={() => window.location.assign('/admin')}>Continue to admin</button>
        </div>
      )}
      {err && <p className="err" role="alert">{err}</p>}
    </section>
  );
}
