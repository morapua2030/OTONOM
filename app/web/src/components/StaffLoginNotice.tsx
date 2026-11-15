import { passwordResetEmailEnabled } from '@/lib/password-reset.ts';

/**
 * Shown above Payload's own sign-in form at /admin/login. Payload 3.90.2 always renders a "Forgot password?" link
 * there; until reset e-mails can really be sent (lib/password-reset.ts) that link is hidden here as well, the same
 * way /staff/login hides it (owner 2026-11-15). /admin/forgot itself still leads to the "contact the operator" page.
 */
export function StaffLoginNotice() {
  return (
    <>
      {passwordResetEmailEnabled() ? null : <style data-testid="hide-forgot-link">{'a[href$="/admin/forgot"]{display:none!important}'}</style>}
      {/* an explicit dark text colour: in Payload's dark theme the inherited light text was unreadable on this yellow box */}
      <div style={{ border: '1px solid #e0b100', background: '#fff8e1', color: '#3d2e00', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
        Staff accounts require two-factor authentication. Please sign in through <a href="/staff/login" style={{ color: '#5c3d00' }}>/staff/login</a> (password + authenticator code),
        then you will be redirected to the admin panel.
      </div>
    </>
  );
}
