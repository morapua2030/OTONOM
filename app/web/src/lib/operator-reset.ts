/**
 * Operator-run recovery of a Production OWNER/ADMIN account (owner decision 2026-11-15): a new password typed by the
 * account holder on stdin, and optionally a reset of the authenticator so the next sign-in enrolls a fresh one.
 * Pure helpers here (testable without a database); the script is scripts/reset-production-staff.ts.
 */
export const OPERATOR_RESET_GATE = 'ISOLATED_PRODUCTION_STAFF_RESET_ONLY';
export const RESETTABLE_ROLES = ['OWNER', 'ADMIN'] as const;

/** Throws unless every explicit Production confirmation is present (same gate style as the owner bootstrap). */
export function assertOperatorResetGate(env: NodeJS.ProcessEnv = process.env): void {
  if (env.OTONOM_RESET_PRODUCTION_STAFF !== OPERATOR_RESET_GATE) throw new Error('RESET_GATE_CLOSED');
  if (env.OTONOM_FORCE_PRODUCTION !== '1' || env.OTONOM_FORCE_PREVIEW === '1') throw new Error('NOT_PRODUCTION_TARGET');
  const expected = env.OTONOM_EXPECTED_NEON_PROJECT_ID?.trim();
  if (!expected || env.NEON_PROJECT_ID !== expected) throw new Error('WRONG_NEON_PROJECT');
}

export type ResetArgs = { email: string; resetMfa: boolean };

/** `--email <address> --confirm-email <address> [--reset-mfa]`; the two addresses must match exactly. */
export function parseResetArgs(argv: string[]): ResetArgs {
  let email = '';
  let confirm = '';
  let resetMfa = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--email') email = String(argv[++i] ?? '').trim().toLowerCase();
    else if (a === '--confirm-email') confirm = String(argv[++i] ?? '').trim().toLowerCase();
    else if (a === '--reset-mfa') resetMfa = true;
    else throw new Error('UNKNOWN_ARGUMENT');
  }
  if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email)) throw new Error('EMAIL_REQUIRED');
  if (confirm !== email) throw new Error('EMAIL_CONFIRMATION_MISMATCH');
  return { email, resetMfa };
}

/** Fields that remove the authenticator: the next sign-in must enroll a new one (and gets new recovery codes). */
export function mfaResetFields() {
  return { totpSecret: null, mfaEnabled: false, recoveryCodes: [], mfaVerifiedSids: [], lastTotpStep: 0 };
}
