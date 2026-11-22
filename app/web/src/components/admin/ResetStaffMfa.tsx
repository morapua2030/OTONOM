'use client';
import { useState, type FormEvent } from 'react';
import { useTranslation } from '@payloadcms/ui';
import { langOf, pick, RESET_V, ROLE_COPY } from '@/admin-ui/copy.ts';
import s from './staff.module.css';

type Row = { id: string; email: string; role: string; mfaEnabled: boolean };

/**
 * OWNER-only (owner 2026-11-15): remove another staff member's authenticator after a lost phone. Their sessions end
 * and their next sign-in must enroll a new authenticator. The full e-mail must be typed to confirm; nothing secret is
 * shown or returned.
 */
export function ResetStaffMfa({ users }: { users: Row[] }) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'mismatch' | 'error'>('idle');
  const { i18n } = useTranslation();
  const lang = langOf(i18n.language);
  const t = (k: keyof typeof RESET_V) => pick(RESET_V[k], lang);
  const roleName = (role: string) => (lang === 'en' || !(role in ROLE_COPY) ? role : pick(ROLE_COPY[role as keyof typeof ROLE_COPY], lang));
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
      <h2>{t('title')}</h2>
      <p className={s.muted}>{t('line')}</p>
      <form className={s.form} onSubmit={submit}>
        <label>
          {t('member')}{' '}
          <select name="userId" required defaultValue="">
            <option value="" disabled>{t('choose')}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{`${u.email} · ${roleName(u.role)}${u.mfaEnabled ? '' : ` · ${t('notEnrolled')}`}`}</option>
            ))}
          </select>
        </label>
        <label>{t('confirm')} <input name="confirmEmail" type="email" dir="ltr" required maxLength={254} autoComplete="off" /></label>
        <button className={s.btn} type="submit" disabled={state === 'working'}>{state === 'working' ? t('resetting') : t('reset')}</button>
      </form>
      <div role="status" aria-live="polite">
        {state === 'done' ? <p className={`${s.result} ${s.ok}`}>{t('done')}</p> : null}
        {state === 'mismatch' ? <p className={`${s.result} ${s.err}`}>{t('mismatch')}</p> : null}
        {state === 'error' ? <p className={`${s.result} ${s.err}`}>{t('error')}</p> : null}
      </div>
    </section>
  );
}
