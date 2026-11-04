'use client';
import { useState, type FormEvent } from 'react';
import s from './staff.module.css';

/**
 * OWNER-only staff invitation (final release, owner 2026-11-04). Each person gets their own account and role; the
 * invitation goes to their own e-mail, or, without an e-mail provider, a one-time link is shown here once. Nobody
 * (OWNER included) ever chooses or sees the new person's password, and MFA enrollment is required at first sign-in.
 */
export function InviteStaff() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'shown' | 'exists' | 'invalid' | 'error'>('idle');
  const [link, setLink] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState('sending');
    setLink(null);
    const res = await fetch('/api/staff/invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email: form.get('email'), role: form.get('role'), delivery: form.get('shownOnce') === 'on' ? 'shown_once' : 'email' }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.status === 201 && data.delivery === 'EMAIL') return setState('sent');
    if (res?.status === 201 && typeof data.link === 'string') {
      setLink(data.link);
      return setState('shown');
    }
    if (res?.status === 409) return setState('exists');
    if (res?.status === 422) return setState('invalid');
    setState('error');
  }
  return (
    <section className={s.section} data-testid="invite-staff">
      <h2>Invite a team member</h2>
      <p className={s.muted}>One personal account per person. The team mailbox receives notifications; it is never a shared sign-in.</p>
      <form className={s.form} onSubmit={submit}>
        <label>E-mail <input name="email" type="email" required maxLength={254} autoComplete="off" /></label>
        <label>
          Role{' '}
          <select name="role" required defaultValue="SALES">
            <option value="SALES">SALES — booking requests and metrics</option>
            <option value="EDITOR">CONTENT (EDITOR) — drafts and review</option>
            <option value="ADMIN">ADMIN</option>
            <option value="ENGINEER">ENGINEER</option>
            <option value="STORE">STORE</option>
          </select>
        </label>
        <label><input name="shownOnce" type="checkbox" /> Show the link here instead of e-mailing it</label>
        <button className={s.btn} type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Inviting…' : 'Invite'}</button>
      </form>
      <div role="status" aria-live="polite">
        {state === 'sent' ? <p className={`${s.result} ${s.ok}`}>Invitation e-mail sent. The link works once and expires in 72 hours.</p> : null}
        {state === 'shown' && link ? (
          <div className={`${s.result} ${s.ok}`} data-testid="invite-link">
            <p>Give this one-time link to the person directly (it is shown only now, works once and expires in 72 hours):</p>
            <p><code style={{ overflowWrap: 'anywhere' }}>{link}</code></p>
          </div>
        ) : null}
        {state === 'exists' ? <p className={`${s.result} ${s.err}`}>An account with this e-mail already exists.</p> : null}
        {state === 'invalid' ? <p className={`${s.result} ${s.err}`}>Check the e-mail address and the role.</p> : null}
        {state === 'error' ? <p className={`${s.result} ${s.err}`}>The invitation could not be created.</p> : null}
      </div>
    </section>
  );
}
