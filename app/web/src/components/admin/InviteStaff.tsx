'use client';
import { useState, type FormEvent } from 'react';
import { useTranslation } from '@payloadcms/ui';
import { INVITE_V, langOf, pick } from '@/admin-ui/copy.ts';
import s from './staff.module.css';

/**
 * OWNER-only staff invitation (final release, owner 2026-11-04). Each person gets their own account and role; the
 * invitation goes to their own e-mail, or, without an e-mail provider, a one-time link is shown here once. Nobody
 * (OWNER included) ever chooses or sees the new person's password, and MFA enrollment is required at first sign-in.
 */
export function InviteStaff() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'shown' | 'exists' | 'invalid' | 'error'>('idle');
  const [link, setLink] = useState<string | null>(null);
  const { i18n } = useTranslation();
  const lang = langOf(i18n.language);
  const t = (k: Exclude<keyof typeof INVITE_V, 'roles'>) => pick(INVITE_V[k], lang);
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
      <h2>{t('title')}</h2>
      <p className={s.muted}>{t('line')}</p>
      <form className={s.form} onSubmit={submit}>
        <label>{t('email')} <input name="email" type="email" dir="ltr" required maxLength={254} autoComplete="off" /></label>
        <label>
          {t('role')}{' '}
          <select name="role" required defaultValue="SALES">
            {(['SALES', 'EDITOR', 'ADMIN', 'ENGINEER', 'STORE'] as const).map((r) => <option key={r} value={r}>{pick(INVITE_V.roles[r], lang)}</option>)}
          </select>
        </label>
        <label><input name="shownOnce" type="checkbox" /> {t('shownOnce')}</label>
        <button className={s.btn} type="submit" disabled={state === 'sending'}>{state === 'sending' ? t('inviting') : t('invite')}</button>
      </form>
      <div role="status" aria-live="polite">
        {state === 'sent' ? <p className={`${s.result} ${s.ok}`}>{t('sent')}</p> : null}
        {state === 'shown' && link ? (
          <div className={`${s.result} ${s.ok}`} data-testid="invite-link">
            <p>{t('shown')}</p>
            <p><code dir="ltr" style={{ overflowWrap: 'anywhere' }}>{link}</code></p>
          </div>
        ) : null}
        {state === 'exists' ? <p className={`${s.result} ${s.err}`}>{t('exists')}</p> : null}
        {state === 'invalid' ? <p className={`${s.result} ${s.err}`}>{t('invalid')}</p> : null}
        {state === 'error' ? <p className={`${s.result} ${s.err}`}>{t('error')}</p> : null}
      </div>
    </section>
  );
}
