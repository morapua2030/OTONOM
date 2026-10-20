import { StaffLogin } from '@/components/StaffLogin.tsx';

// Nonce-based CSP requires request-time rendering so Next.js can attach the
// per-request nonce to its bootstrap scripts.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <StaffLogin />;
}
