import { StaffInviteAccept } from '@/components/StaffInviteAccept.tsx';
import { staffLang } from '@/admin-ui/staff-lang.ts';

// Nonce-based CSP requires request-time rendering so Next.js can attach the per-request nonce to its scripts.
export const dynamic = 'force-dynamic';

export default async function Page() {
  return <StaffInviteAccept initialLocale={await staffLang()} />;
}
