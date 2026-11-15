'use client';
import { useState, type FormEvent } from 'react';
import s from './staff.module.css';

type Row = { id: string; email: string; role: string; mfaEnabled: boolean };

/**
 * OWNER-only (owner 2026-11-15): remove another staff member's authenticator after a lost phone. Their sessions end
 * and their next sign-in must enroll a new authenticator. The full e-mail must be typed to confirm; nothing secret is
 * shown or returned.
 */
export function ResetStaffMfa({ users }: { users: Row[] }) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'mismatch' | 'error'>('idle');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const id = String(form.get('userId') ?? '');
    if (!id) return;
    setState('working');
    const res = await fetch(`/api/staff/users/${encodeURIComponent(id)}/mfa-reset`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ confirmEmail: form.get('confirmEmail') }),
    }).catch(() => null);
    if (res?.status === 200) {
      element.reset();
      return setState('done');
    }
    setState(res?.status === 422 ? 'mismatch' : 'error');
  }
  return (
    <section className={s.section} data-testid="reset-staff-mfa">
      <h2>Reset a team member&apos;s authenticator / إعادة ضبط تطبيق المصادقة</h2>
      <p className={s.muted}>For a lost phone: their sessions end and their next sign-in asks them to set up a new authenticator. Recorded in the audit log.</p>
      <form className={s.form} onSubmit={submit}>
        <label>
          Team member{' '}
          <select name="userId" required defaultValue="">
            <option value="" disabled>Choose…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{`${u.email} · ${u.role}${u.mfaEnabled ? '' : ' · not enrolled'}`}</option>
            ))}
          </select>
        </label>
        <label>Type their full e-mail to confirm <input name="confirmEmail" type="email" required maxLength={254} autoComplete="off" /></label>
        <button className={s.btn} type="submit" disabled={state === 'working'}>{state === 'working' ? 'Resetting…' : 'Reset authenticator'}</button>
      </form>
      <div role="status" aria-live="polite">
        {state === 'done' ? <p className={`${s.result} ${s.ok}`}>Done. Their sessions ended; they will set up a new authenticator at their next sign-in.</p> : null}
        {state === 'mismatch' ? <p className={`${s.result} ${s.err}`}>The e-mail does not match the selected team member.</p> : null}
        {state === 'error' ? <p className={`${s.result} ${s.err}`}>The reset could not be completed.</p> : null}
      </div>
    </section>
  );
}
