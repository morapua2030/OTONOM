export type AccountSecurityProjection = {
  id: string;
  email: string;
  role: string;
  mfaEnabled: boolean;
};

/** Mask staff identity for shared operational screens and screenshot evidence. */
export function maskEmail(value: unknown): string {
  const email = String(value ?? '').trim();
  const split = email.lastIndexOf('@');
  if (split <= 0 || split === email.length - 1) return 'unavailable';
  const local = email.slice(0, split);
  const domain = email.slice(split + 1);
  const dot = domain.lastIndexOf('.');
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const suffix = dot > 0 ? domain.slice(dot) : '';
  const maskedLocal = `${local.slice(0, 1)}${'•'.repeat(Math.min(Math.max(local.length - 1, 2), 4))}`;
  const maskedHost = `${host.slice(0, 1)}${'•'.repeat(Math.min(Math.max(host.length - 1, 2), 4))}`;
  return `${maskedLocal}@${maskedHost}${suffix}`;
}

/** Explicit allow-list: authentication secrets and session material can never enter the view model. */
export function accountSecurityProjection(user: Record<string, unknown>): AccountSecurityProjection {
  return {
    id: String(user.id ?? ''),
    email: maskEmail(user.email),
    role: String(user.role ?? 'UNKNOWN').replaceAll('_', ' '),
    mfaEnabled: user.mfaEnabled === true,
  };
}
