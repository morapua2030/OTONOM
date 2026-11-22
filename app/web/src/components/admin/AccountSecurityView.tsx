import type { AdminViewServerProps } from 'payload';
import { STAFF_ROLES } from '@otonom/domain';
import { mfaOk } from '@/lib/access.ts';
import { productionOwnerPasswordOnly } from '@/lib/production-owner-auth.ts';
import { accountSecurityProjection } from '@/lib/security-display.ts';
import { PAGE, pick, ROLE_COPY, SECURITY_V } from '@/admin-ui/copy.ts';
import { StaffShell, staffOf, viewLang } from './shell.tsx';
import s from './staff.module.css';
import { InviteStaff } from './InviteStaff.tsx';
import { ResetStaffMfa } from './ResetStaffMfa.tsx';

/** Read-only security posture. Passwords, TOTP material, recovery codes and session tokens are never selected. */
export async function AccountSecurityView(props: AdminViewServerProps) {
  const staff = staffOf(props);
  const req = props.initPageResult.req;
  const currentRaw = req.user as unknown as Record<string, unknown>;
  const current = accountSecurityProjection(currentRaw);
  const isOwner = staff?.role === 'OWNER';
  const passwordOnlyOwner = productionOwnerPasswordOnly(req.user as any);
  const lang = viewLang(props);
  const t = (k: keyof typeof SECURITY_V) => pick(SECURITY_V[k], lang);
  // English keeps the raw role code (OWNER, SALES…); Arabic shows the role's name
  const roleName = (role: string) => (lang === 'en' || !(role in ROLE_COPY) ? role : pick(ROLE_COPY[role as keyof typeof ROLE_COPY], lang));
  const shell = { ...props, title: pick(PAGE.accountSecurity.name, lang), subtitle: pick(PAGE.accountSecurity.line, lang) };
  const directory = isOwner
    ? (
        await req.payload.find({
          collection: 'users',
          where: { role: { in: [...STAFF_ROLES] } },
          select: { email: true, role: true, mfaEnabled: true },
          sort: 'email',
          limit: 100,
          depth: 0,
          req,
          overrideAccess: false,
        })
      ).docs.map((user) => accountSecurityProjection(user as unknown as Record<string, unknown>))
    : [];

  return (
    <StaffShell {...shell}>
      <section className={s.section} data-testid="security-current">
        <h2>{t('current')}</h2>
        <div className={s.securityGrid}>
          <div className={s.card}><span className={s.muted}>{t('identity')}</span><strong className={s.securityValue}><bdi dir="ltr">{current.email}</bdi></strong></div>
          <div className={s.card}><span className={s.muted}>{t('role')}</span><strong className={s.securityValue}>{roleName(current.role)}</strong></div>
          <div className={s.card}><span className={s.muted}>{t('policy')}</span><strong className={s.securityValue}>{passwordOnlyOwner ? t('ownerPasswordOnly') : current.mfaEnabled ? t('enrolled') : t('actionRequired')}</strong></div>
          <div className={s.card}><span className={s.muted}>{t('session')}</span><strong className={s.securityValue}>{mfaOk(req.user as any) ? (passwordOnlyOwner ? t('authorized') : t('verified')) : t('notVerified')}</strong></div>
        </div>
        <div className={s.actions}>
          <a className={`${s.btn} ${s.btnSecondary}`} href="/admin/account">{t('accountSettings')}</a>
          <a className={`${s.btn} ${s.btnSecondary}`} href="/admin/logout">{t('signOut')}</a>
        </div>
      </section>

      <p className={s.banner} data-testid="security-notice">{t('notice')}</p>

      {isOwner ? <InviteStaff /> : null}

      {isOwner ? (
        <section className={s.section} data-testid="security-directory">
          <h2>{t('directory')} ({directory.length})</h2>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <caption className={s.srOnly}>{t('directoryCaption')}</caption>
              <thead><tr><th scope="col">{t('colIdentity')}</th><th scope="col">{t('colRole')}</th><th scope="col">{t('colMfa')}</th></tr></thead>
              <tbody>
                {directory.map((user) => (
                  <tr key={user.id}>
                    <td data-label={t('colIdentity')}><bdi dir="ltr">{user.email}</bdi></td>
                    <td data-label={t('colRole')}><span className={s.badge}>{roleName(user.role)}</span></td>
                    <td data-label={t('colMfa')}><span className={s.badge}>{user.mfaEnabled ? t('mfaOn') : t('mfaOff')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={s.actions}>
            <a className={s.btn} href="/admin/collections/users">{t('openUsers')}</a>
          </div>
        </section>
      ) : null}

      {isOwner ? <ResetStaffMfa users={directory.filter((user) => user.id !== String(currentRaw.id ?? ''))} /> : null}

      {isOwner ? null : (
        <section className={`${s.banner} ${s.denied}`} data-testid="security-directory-denied" role="status">
          <strong>{t('deniedTitle')}</strong>
          <p>{t('deniedLine')}</p>
        </section>
      )}
    </StaffShell>
  );
}
