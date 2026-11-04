import { StaffInviteAccept } from '@/components/StaffInviteAccept.tsx';

// Nonce-based CSP requires request-time rendering so Next.js can attach the per-request nonce to its scripts.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <StaffInviteAccept />;
}
