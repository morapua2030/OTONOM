'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { fillIn, pick, STAFF_INVITE, type AdminLang } from '@/admin-ui/copy.ts';
import { StaffHeader, useStaffLang } from '@/admin-ui/StaffHeader.tsx';

/**
 * Staff invitation acceptance (final release, owner 2026-11-04). The one-time token arrives in the URL fragment (never
 * sent to a server log), the invited person chooses their own password here (the password policy applies on the
 * server), and the first sign-in then requires MFA enrollment as for every staff account.
 */
export function StaffInviteAccept({ initialLocale = 'ar' }: { initialLocale?: AdminLang }) {
  const [lang, setLang] = useStaffLang(initialLocale);
  const t = (k: keyof typeof STAFF_INVITE) => pick(STAFF_INVITE[k], lang);
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
  const frame = (body: React.ReactNode) => (
    <section className="staff-auth" lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <StaffHeader lang={lang} onLang={setLang} />
      {body}
    </section>
  );
  if (state === 'done') {
    return frame(
      <section className="auth-card" data-testid="invite-done">
        <h1>{t('doneTitle')}</h1>
        <p>{t('doneText')}</p>
        <p><a className="btn" href="/staff/login">{t('goSignIn')}</a></p>
      </section>,
    );
  }
  if (token === undefined) return frame(<p role="status">{t('checking')}</p>);
  if (token === null) {
    return frame(
      <section className="auth-card" data-testid="invite-missing">
        <h1>{t('missingTitle')}</h1>
        <p>{t('missingText')}</p>
      </section>,
    );
  }
  const message =
    state === 'invalid' ? t('invalid')
    : state === 'policy' ? fillIn(t('policy'), { policy: policy || t('policyDefault') })
    : state === 'mismatch' ? t('mismatch')
    : state === 'limited' ? t('limited')
    : '';
  return frame(
    <form className="rfq" onSubmit={submit} data-testid="invite-form">
      <h1>{t('formTitle')}</h1>
      <p>{t('formText')}</p>
      <label htmlFor="invite-password">{t('newPassword')}<input id="invite-password" name="password" type="password" dir="ltr" minLength={14} maxLength={128} required autoComplete="new-password" /></label>
      <label htmlFor="invite-confirm">{t('repeat')}<input id="invite-confirm" name="confirm" type="password" dir="ltr" minLength={14} maxLength={128} required autoComplete="new-password" /></label>
      <p role="status" aria-live="polite">{message}</p>
      <button className="btn" type="submit" disabled={state === 'sending'}>{state === 'sending' ? t('saving') : t('save')}</button>
    </form>,
  );
}
