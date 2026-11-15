/**
 * Forgot-password by e-mail (owner 2026-11-15): built now, switched on later. It turns on only when Resend is the
 * provider, an API key exists, a from-address is set AND the operator confirms that address is verified in Resend
 * (OTONOM_EMAIL_FROM_VERIFIED=1, set after the DNS records pass). Until then the reset request answers 503 with a
 * "contact the operator" code instead of a silent fake success, and no link to it is shown. See docs/ai/PASSWORD_RESET_EMAIL.md.
 */
export const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60_000;

export type ParsedFrom = { name: string; address: string };

/** `Name <address>` or a bare address; null when it is not a single plausible address. */
export function parseFromAddress(value: string | undefined | null): ParsedFrom | null {
  const v = (value ?? '').trim();
  const m = /^(?:([^<>\r\n"]{1,80}?)\s*<([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)>|([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+))$/.exec(v);
  if (!m) return null;
  return { name: (m[1] ?? '').trim() || 'OTONOM', address: (m[2] ?? m[3]).toLowerCase() };
}

export function passwordResetEmailEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    env.OTONOM_EMAIL_PROVIDER === 'resend' &&
    (env.RESEND_API_KEY?.trim().length ?? 0) >= 20 &&
    parseFromAddress(env.OTONOM_EMAIL_FROM) !== null &&
    env.OTONOM_EMAIL_FROM_VERIFIED === '1'
  );
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The reset message (no personal data in the subject; the link is the only dynamic value and is escaped). */
export function passwordResetEmail(link: string): { subject: string; html: string } {
  const href = esc(link);
  return {
    subject: 'OTONOM: reset your password / إعادة تعيين كلمة المرور',
    html: `<div dir="ltr" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5">
<p>Someone asked to reset the password of your OTONOM staff account. The link works once and expires in 30 minutes:</p>
<p><a href="${href}">${href}</a></p>
<p>If this was not you, ignore this e-mail; your password stays the same. You will still need your authenticator after the reset.</p>
</div>
<div dir="rtl" lang="ar" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7">
<p>طُلبت إعادة تعيين كلمة مرور حساب فريق OTONOM الخاص بك. الرابط يعمل مرة واحدة وينتهي خلال 30 دقيقة:</p>
<p><a href="${href}" dir="ltr">${href}</a></p>
<p>إن لم تطلب ذلك فتجاهل الرسالة، ولن تتغير كلمة المرور. ستحتاج تطبيق المصادقة بعد إعادة التعيين.</p>
</div>`,
  };
}
