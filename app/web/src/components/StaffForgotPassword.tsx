'use client';
import { useState, type FormEvent } from 'react';

/**
 * Forgot password (owner 2026-11-15). Without a configured e-mail provider it says plainly that the operator resets
 * passwords, instead of pretending an e-mail was sent. With one, it asks Payload to send the reset link and always
 * gives the same answer, whether or not the account exists.
 */
export function StaffForgotPassword({ enabled }: { enabled: boolean }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'limited' | 'unavailable'>(enabled ? 'idle' : 'unavailable');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
    const res = await fetch('/api/users/forgot-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) }).catch(() => null);
    setState(res?.ok ? 'sent' : res?.status === 429 ? 'limited' : res?.status === 503 ? 'unavailable' : 'sent');
  }
  return (
    <section className="staff-auth" data-testid="staff-forgot">
      <h1>Forgot your password? / نسيت كلمة المرور؟</h1>
      {state === 'unavailable' ? (
        <div className="auth-card" role="status" data-testid="staff-forgot-unavailable">
          <p>Password reset by e-mail is not available yet. Contact the operator (the OTONOM owner): they can reset your password and, if you lost your phone, your authenticator.</p>
          <p dir="rtl" lang="ar">إعادة تعيين كلمة المرور بالبريد غير متاحة حالياً. تواصل مع المسؤول عن التشغيل (مالك OTONOM)؛ يمكنه إعادة تعيين كلمة المرور، وتطبيق المصادقة إن فقدت هاتفك.</p>
        </div>
      ) : state === 'sent' ? (
        <div role="status">
          <p>If this e-mail belongs to a staff account, a reset link is on its way. It works once and expires in 30 minutes.</p>
          <p dir="rtl" lang="ar">لو البريد ده تبع حساب في الفريق، رابط إعادة التعيين في الطريق. بيشتغل مرة واحدة وينتهي خلال 30 دقيقة.</p>
        </div>
      ) : (
        <form className="rfq" onSubmit={submit}>
          <label>Email<input name="email" type="email" dir="ltr" autoComplete="username" required maxLength={254} /></label>
          <button className="btn" disabled={state === 'sending'}>{state === 'sending' ? 'Please wait…' : 'Send reset link'}</button>
          {state === 'limited' ? <p className="err" role="alert">Too many requests. Try again later. / طلبات كتير، حاول بعد شوية.</p> : null}
        </form>
      )}
      <p><a href="/staff/login">Back to sign-in / العودة لتسجيل الدخول</a></p>
    </section>
  );
}
