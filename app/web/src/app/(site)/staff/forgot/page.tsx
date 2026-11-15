import { StaffForgotPassword } from '@/components/StaffForgotPassword.tsx';
import { passwordResetEmailEnabled } from '@/lib/password-reset.ts';

// Nonce-based CSP requires request-time rendering so Next.js can attach the per-request nonce to its scripts.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <StaffForgotPassword enabled={passwordResetEmailEnabled()} />;
}
