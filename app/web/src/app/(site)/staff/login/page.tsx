import { StaffLogin } from '@/components/StaffLogin.tsx';
import { passwordResetEmailEnabled } from '@/lib/password-reset.ts';
import { staffLang } from '@/admin-ui/staff-lang.ts';

// Nonce-based CSP requires request-time rendering so Next.js can attach the
// per-request nonce to its bootstrap scripts.
export const dynamic = 'force-dynamic';

export default async function Page() {
  // The "forgot password" link appears only once reset e-mails can really be sent (owner 2026-11-15).
  return <StaffLogin forgotPasswordEnabled={passwordResetEmailEnabled()} initialLocale={await staffLang()} />;
}
