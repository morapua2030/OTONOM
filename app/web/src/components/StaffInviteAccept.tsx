'use client';
import { useEffect, useState, type FormEvent } from 'react';

/**
 * Staff invitation acceptance (final release, owner 2026-11-04). The one-time token arrives in the URL fragment (never
 * sent to a server log), the invited person chooses their own password here (the password policy applies on the
 * server), and the first sign-in then requires MFA enrollment as for every staff account.
 */
export function StaffInviteAccept() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'invalid' | 'policy' | 'mismatch' | 'limited'>('idle');
  const [policy, setPolicy] = useState('');
  useEffect(() => {
    const t = location.hash.replace(/^#/, '');
    setToken(/^[A-Za-z0-9_-]{43}$/.test(t) ? t : null);
    // the token is no longer needed in the address bar or the history once read
    history.replaceState(null, '', location.pathname);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    if (password !== String(form.get('confirm') ?? '')) return setState('mismatch');
    setState('sending');
    const res = await fetch('/api/staff/invite/accept', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password }), credentials: 'same-origin' }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.status === 200) return setState('done');
    if (res?.status === 422) {
      setPolicy(String(data?.fieldErrors?.password ?? ''));
      return setState('policy');
    }
    if (res?.status === 429) return setState('limited');
    setState('invalid');
  }
  if (state === 'done') {
    return (
      <section data-testid="invite-done">
        <h1>Password set</h1>
        <p>Sign in now. You will be asked to set up two-step verification (MFA) before you can use the admin.</p>
        <p><a className="btn" href="/staff/login">Go to staff sign-in</a></p>
      </section>
    );
  }
  if (token === undefined) return <p role="status">Checking the invitation…</p>;
  if (token === null) {
    return (
      <section data-testid="invite-missing">
        <h1>Invitation link not valid</h1>
        <p>Open the exact link from your invitation, or ask the OWNER for a new one. Each link works once and expires after 72 hours.</p>
      </section>
    );
  }
  const message =
    state === 'invalid' ? 'This invitation link is not valid any more (used, expired or revoked). Ask the OWNER for a new one.'
    : state === 'policy' ? `The password does not meet the policy: ${policy || 'use 14 to 128 characters and do not reuse your e-mail address.'}`
    : state === 'mismatch' ? 'The two passwords are different.'
    : state === 'limited' ? 'Too many attempts. Try again in a few minutes.'
    : '';
  return (
    <form onSubmit={submit} data-testid="invite-form">
      <h1>Set your OTONOM staff password</h1>
      <p>Choose a password of 14 to 128 characters that you do not use anywhere else. Nobody else sees it.</p>
      <p><label htmlFor="invite-password">New password</label><br /><input id="invite-password" name="password" type="password" minLength={14} maxLength={128} required autoComplete="new-password" /></p>
      <p><label htmlFor="invite-confirm">Repeat the password</label><br /><input id="invite-confirm" name="confirm" type="password" minLength={14} maxLength={128} required autoComplete="new-password" /></p>
      <p role="status" aria-live="polite">{message}</p>
      <button className="btn" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Saving…' : 'Set password'}</button>
    </form>
  );
}
