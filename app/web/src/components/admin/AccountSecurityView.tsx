import type { AdminViewServerProps } from 'payload';
import { STAFF_ROLES } from '@otonom/domain';
import { mfaOk } from '@/lib/access.ts';
import { productionOwnerPasswordOnly } from '@/lib/production-owner-auth.ts';
import { accountSecurityProjection } from '@/lib/security-display.ts';
import { StaffShell, staffOf } from './shell.tsx';
import s from './staff.module.css';

/** Read-only security posture. Passwords, TOTP material, recovery codes and session tokens are never selected. */
export async function AccountSecurityView(props: AdminViewServerProps) {
  const staff = staffOf(props);
  const req = props.initPageResult.req;
  const currentRaw = req.user as unknown as Record<string, unknown>;
  const current = accountSecurityProjection(currentRaw);
  const isOwner = staff?.role === 'OWNER';
  const passwordOnlyOwner = productionOwnerPasswordOnly(req.user as any);
  const shell = {
    ...props,
    title: 'Account security / أمان الحساب',
    subtitle: 'Review your active role and MFA posture. Authentication secrets and recovery material are never displayed.',
  };
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
        <h2>Current account / الحساب الحالي</h2>
        <div className={s.securityGrid}>
          <div className={s.card}><span className={s.muted}>Masked identity</span><strong className={s.securityValue}><bdi>{current.email}</bdi></strong></div>
          <div className={s.card}><span className={s.muted}>Active role</span><strong className={s.securityValue}>{current.role}</strong></div>
          <div className={s.card}><span className={s.muted}>Authentication policy</span><strong className={s.securityValue}>{passwordOnlyOwner ? 'OWNER PASSWORD-ONLY EXCEPTION' : current.mfaEnabled ? 'MFA ENROLLED' : 'MFA ACTION REQUIRED'}</strong></div>
          <div className={s.card}><span className={s.muted}>This session</span><strong className={s.securityValue}>{mfaOk(req.user as any) ? (passwordOnlyOwner ? 'AUTHORIZED' : 'MFA VERIFIED') : 'NOT VERIFIED'}</strong></div>
        </div>
        <div className={s.actions}>
          <a className={`${s.btn} ${s.btnSecondary}`} href="/admin/account">Account settings</a>
          <a className={`${s.btn} ${s.btnSecondary}`} href="/admin/logout">Sign out securely</a>
        </div>
      </section>

      <p className={s.banner} data-testid="security-notice">
        Invitations are not configured. Staff creation, role changes and unlock operations remain OWNER-controlled in the protected Users collection.
      </p>

      {isOwner ? (
        <section className={s.section} data-testid="security-directory">
          <h2>Staff security directory ({directory.length})</h2>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <caption className={s.srOnly}>Masked staff identities, roles and MFA enrollment</caption>
              <thead><tr><th scope="col">Identity</th><th scope="col">Role</th><th scope="col">MFA</th></tr></thead>
              <tbody>
                {directory.map((user) => (
                  <tr key={user.id}>
                    <td data-label="Identity"><bdi>{user.email}</bdi></td>
                    <td data-label="Role"><span className={s.badge}>{user.role}</span></td>
                    <td data-label="MFA"><span className={s.badge}>{user.mfaEnabled ? 'ENROLLED' : 'ACTION REQUIRED'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={s.actions}>
            <a className={s.btn} href="/admin/collections/users">Open OWNER user management</a>
          </div>
        </section>
      ) : (
        <section className={`${s.banner} ${s.denied}`} data-testid="security-directory-denied" role="status">
          <strong>OWNER-only directory / دليل خاص بالمالك</strong>
          <p>Your own security state is visible above. Staff directory and role-management data were not exposed.</p>
        </section>
      )}
    </StaffShell>
  );
}
