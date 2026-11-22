import { passwordResetEmailEnabled } from '@/lib/password-reset.ts';
import { ADMIN_LOGIN_NOTICE, langOf, pick } from '@/admin-ui/copy.ts';

/**
 * Shown above Payload's own sign-in form at /admin/login. Payload 3.90.2 always renders a "Forgot password?" link
 * there; until reset e-mails can really be sent (lib/password-reset.ts) that link is hidden here as well, the same
 * way /staff/login hides it (owner 2026-11-15). /admin/forgot itself still leads to the "contact the operator" page.
 */
export function StaffLoginNotice({ i18n }: { i18n?: { language?: string } }) {
  const lang = langOf(i18n?.language);
  return (
    <>
      {passwordResetEmailEnabled() ? null : <style data-testid="hide-forgot-link">{'a[href$="/admin/forgot"]{display:none!important}'}</style>}
      <div className="otn-login-notice" role="note">
        <p>{pick(ADMIN_LOGIN_NOTICE.text, lang)}</p>
        <a className="btn btn--style-primary btn--size-medium" href="/staff/login">{pick(ADMIN_LOGIN_NOTICE.link, lang)}</a>
      </div>
    </>
  );
}
