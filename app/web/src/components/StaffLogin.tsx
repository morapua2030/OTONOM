'use client';
import { useState, type FormEvent } from 'react';

/** Two-step staff sign-in: Payload password login, then TOTP bound to that session; then the admin panel. */
export function StaffLogin() {
  const [step, setStep] = useState<'password' | 'totp' | 'done'>('password');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);

  async function login(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setBusy(true);
    setErr(null);
    const f = new FormData(ev.currentTarget);
    const r = await fetch('/api/users/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: f.get('email'), password: f.get('password') }) }).catch(() => null);
    setBusy(false);
    if (r?.ok) setStep('totp');
    else setErr('Sign-in failed. Check your email and password.');
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
          <button className="btn" disabled={busy}>
            Continue
          </button>
        </form>
      )}
      {step === 'totp' && (
        <form className="rfq" onSubmit={verify}>
          <label>
            {useRecovery ? 'Recovery code' : 'Authenticator code'}
            <input name="code" dir="ltr" inputMode={useRecovery ? 'text' : 'numeric'} autoComplete="one-time-code" required />
          </label>
          <button className="btn" disabled={busy}>
            Verify
          </button>
          <button type="button" className="btn secondary" onClick={() => setUseRecovery(!useRecovery)}>
            {useRecovery ? 'Use authenticator code' : 'Use a recovery code'}
          </button>
        </form>
      )}
      {step === 'done' && <p>Verified. Opening the admin panel…</p>}
      {err && (
        <p className="err" role="alert">
          {err}
        </p>
      )}
    </section>
  );
}
