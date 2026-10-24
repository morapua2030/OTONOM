export const PRODUCTION_OWNER_EMAIL = 'team@otonomiot.com';

export type ProductionOwnerSubject = {
  id: number | string;
  email?: unknown;
  role?: unknown;
};

/**
 * Owner-approved password-only exception for one immutable Production identity.
 *
 * This is an authorization policy evaluated only after Payload has authenticated a
 * real session. Every input is matched exactly so a copied flag, case variant,
 * role change, deleted/recreated user, Preview, or local runtime fails closed.
 */
export function productionOwnerPasswordOnly(
  user: ProductionOwnerSubject | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!user) return false;
  const configuredId = env.OTONOM_PRODUCTION_OWNER_ID?.trim();
  return (
    env.OTONOM_PRODUCTION_OWNER_PASSWORD_ONLY === '1' &&
    env.VERCEL === '1' &&
    env.VERCEL_ENV === 'production' &&
    env.OTONOM_FORCE_PREVIEW !== '1' &&
    env.OTONOM_PUBLIC_MARKETING_ONLY !== '1' &&
    !!configuredId &&
    env.OTONOM_PRODUCTION_OWNER_EMAIL === PRODUCTION_OWNER_EMAIL &&
    String(user.id) === configuredId &&
    user.email === PRODUCTION_OWNER_EMAIL &&
    user.role === 'OWNER'
  );
}
