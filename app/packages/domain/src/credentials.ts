/** Local password acceptance policy. Never logs, hashes or returns the candidate. */
export function passwordPolicyError(password: unknown, email?: unknown): string | null {
  if (typeof password !== 'string' || password.length < 14) return 'PASSWORD_TOO_SHORT';
  if (password.length > 128) return 'PASSWORD_TOO_LONG';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) return 'PASSWORD_COMPLEXITY';
  const folded = password.toLocaleLowerCase('en-US');
  const localPart = String(email ?? '').split('@')[0]?.toLocaleLowerCase('en-US') ?? '';
  const denied = ['password', 'qwerty', 'letmein', 'admin123', 'welcome123', 'otonom'];
  if (denied.some((fragment) => folded.includes(fragment)) || (localPart.length >= 4 && folded.includes(localPart))) return 'PASSWORD_TOO_PREDICTABLE';
  return null;
}
