import type { Access, PayloadRequest } from 'payload';
import { can, isStaff, type Permission } from '@otonom/domain';

type U = { id: string | number; role?: string; _sid?: string; mfaVerifiedSids?: unknown } | null | undefined;

/** Staff sessions are usable only after TOTP verification bound to the Payload session id (req.user._sid). */
export function mfaOk(user: U): boolean {
  if (!user) return false;
  if (!isStaff(user.role)) return true;
  const sids = Array.isArray(user.mfaVerifiedSids) ? (user.mfaVerifiedSids as string[]) : [];
  return !!user._sid && sids.includes(user._sid);
}

export const perm =
  (p: Permission): Access =>
  ({ req }) =>
    !!req.user && mfaOk(req.user as U) && can((req.user as any).role, p);

export const anyPerm =
  (...ps: Permission[]): Access =>
  ({ req }) =>
    !!req.user && mfaOk(req.user as U) && ps.some((p) => can((req.user as any).role, p));

export const staffOnly: Access = ({ req }) => !!req.user && isStaff((req.user as any).role) && mfaOk(req.user as U);
export const nobody: Access = () => false;

export function jsonRes(status: number, body: unknown) {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

/** Reject cross-origin state changes while allowing non-browser clients that omit Origin. */
export function mutationOriginGuard(req: PayloadRequest): Response | null {
  const origin = req.headers.get('origin');
  if (!origin || req.method === 'GET') return null;
  try {
    if (new URL(origin).host !== req.headers.get('host')) return jsonRes(403, { code: 'CSRF_ORIGIN_MISMATCH' });
  } catch {
    return jsonRes(403, { code: 'CSRF_ORIGIN_MISMATCH' });
  }
  return null;
}

/** Guard for custom endpoints: 401 (no session / MFA pending) or 403 (role). */
export function guard(req: PayloadRequest, p: Permission): Response | null {
  const u = req.user as U;
  if (!u) return jsonRes(401, { code: 'UNAUTHENTICATED' });
  if (!mfaOk(u)) return jsonRes(401, { code: 'MFA_REQUIRED' });
  if (!can((u as any).role, p)) return jsonRes(403, { code: 'FORBIDDEN' });
  return mutationOriginGuard(req);
}

export async function body(req: PayloadRequest): Promise<Record<string, unknown>> {
  try {
    return ((await req.json?.()) ?? {}) as Record<string, unknown>;
  } catch {
    return {};
  }
}
