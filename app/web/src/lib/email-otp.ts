import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export const EMAIL_OTP_TTL_SECONDS = 5 * 60;
export const EMAIL_OTP_RESEND_SECONDS = 60;
export const EMAIL_OTP_MAX_ATTEMPTS = 5;
export const EMAIL_OTP_FACTOR_TTL_SECONDS = 8 * 60 * 60;

type StaffIdentity = { email?: unknown; role?: unknown } | null | undefined;

export type EmailOtpDelivery = {
  to: string;
  code: string;
  challengeId: string;
  locale?: 'ar' | 'en';
};

type FetchLike = typeof fetch;

function normalizedEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase('en-US') : '';
}

export function emailOtpRequiredForUser(user: StaffIdentity, env: NodeJS.ProcessEnv = process.env): boolean {
  const account = normalizedEmail(env.OTONOM_OWNER_EMAIL_OTP_ACCOUNT);
  return env.OTONOM_OWNER_EMAIL_OTP_REQUIRED === '1' && account.length > 0 && user?.role === 'OWNER' && normalizedEmail(user.email) === account;
}

export function emailOtpPepper(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.OTONOM_EMAIL_OTP_PEPPER?.trim();
  if (!value || value.length < 32) throw new Error('OTONOM_EMAIL_OTP_PEPPER must contain at least 32 characters');
  return value;
}

export function generateEmailOtp(env: NodeJS.ProcessEnv = process.env): string {
  if (env.OTONOM_EMAIL_PROVIDER === 'test' && env.OTONOM_EMAIL_TEST_MODE === '1' && env.VERCEL !== '1') {
    const fixed = env.OTONOM_EMAIL_OTP_TEST_CODE?.trim();
    if (fixed) {
      if (!/^\d{6}$/.test(fixed)) throw new Error('OTONOM_EMAIL_OTP_TEST_CODE must be six digits');
      return fixed;
    }
  }
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function hmacHex(value: string, env: NodeJS.ProcessEnv): string {
  return createHmac('sha256', emailOtpPepper(env)).update(value, 'utf8').digest('hex');
}

export function emailOtpSessionDigest(sessionId: string, env: NodeJS.ProcessEnv = process.env): string {
  if (!sessionId) throw new Error('A session id is required');
  return hmacHex(`session:${sessionId}`, env);
}

export function emailOtpIpDigest(ip: string, env: NodeJS.ProcessEnv = process.env): string {
  return hmacHex(`ip:${ip || 'direct'}`, env);
}

export function emailOtpCodeDigest(input: { challengeId: string; userId: string; sessionDigest: string; code: string }, env: NodeJS.ProcessEnv = process.env): string {
  return hmacHex(`code:${input.challengeId}:${input.userId}:${input.sessionDigest}:${input.code}`, env);
}

export function emailOtpDigestMatches(expectedHex: string, input: { challengeId: string; userId: string; sessionDigest: string; code: string }, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!/^[a-f0-9]{64}$/.test(expectedHex) || !/^\d{6}$/.test(input.code)) return false;
  const actual = Buffer.from(emailOtpCodeDigest(input, env), 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function parseSender(value: string): string | null {
  const match = value.match(/^(?:[^<>\r\n]{1,80}\s*)?(?:<)?([^<>\s]+@[^<>\s]+)(?:>)?$/);
  return match?.[1] ?? null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function ownerOtpEmail(input: Pick<EmailOtpDelivery, 'code' | 'locale'>): { subject: string; text: string; html: string } {
  const code = escapeHtml(input.code);
  const subject = input.locale === 'ar' ? 'رمز تسجيل دخول OTONOM' : 'Your OTONOM sign-in code';
  const text = input.locale === 'ar'
    ? `رمز تسجيل الدخول إلى OTONOM: ${input.code}\n\nينتهي الرمز خلال خمس دقائق ويُستخدم مرة واحدة. إذا لم تطلبه فلا تشاركه مع أي شخص.`
    : `OTONOM sign-in code: ${input.code}\n\nThis code expires in 5 minutes and can be used once. If you did not request it, do not share it.`;
  const html = `<!doctype html><html lang="${input.locale === 'ar' ? 'ar' : 'en'}" dir="${input.locale === 'ar' ? 'rtl' : 'ltr'}"><body style="font-family:Arial,sans-serif;color:#0b1f35"><main style="max-width:560px;margin:auto;padding:32px"><h1 style="color:#0066cc">OTONOM</h1><p>${input.locale === 'ar' ? 'رمز التحقق لتسجيل الدخول هو:' : 'Your sign-in verification code is:'}</p><p style="font-size:32px;letter-spacing:8px;font-weight:700" dir="ltr">${code}</p><p>${input.locale === 'ar' ? 'ينتهي الرمز خلال خمس دقائق ويُستخدم مرة واحدة. لا تشاركه مع أي شخص.' : 'The code expires in five minutes and can be used once. Do not share it.'}</p></main></body></html>`;
  return { subject, text, html };
}

export async function sendOwnerEmailOtp(input: EmailOtpDelivery, env: NodeJS.ProcessEnv = process.env, fetcher: FetchLike = fetch): Promise<{ providerMessageId: string }> {
  const allowedRecipient = normalizedEmail(env.OTONOM_EMAIL_OTP_ALLOWED_RECIPIENT);
  if (!allowedRecipient || normalizedEmail(input.to) !== allowedRecipient) throw new Error('EMAIL_RECIPIENT_NOT_ALLOWED');

  if (env.OTONOM_EMAIL_PROVIDER === 'test') {
    if (env.OTONOM_EMAIL_TEST_MODE !== '1' || env.VERCEL === '1') throw new Error('EMAIL_TEST_PROVIDER_FORBIDDEN');
    if (env.OTONOM_EMAIL_TEST_FAIL === '1') throw new Error('EMAIL_PROVIDER_FAILED');
    return { providerMessageId: `test-${input.challengeId}` };
  }

  if (env.OTONOM_EMAIL_PROVIDER !== 'resend') throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.OTONOM_EMAIL_FROM?.trim();
  if (!apiKey || apiKey.length < 20 || !from || !parseSender(from)) throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');

  const message = ownerOtpEmail(input);
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'idempotency-key': `otonom-owner-otp-${input.challengeId}`,
    },
    body: JSON.stringify({ from, to: [input.to], subject: message.subject, text: message.text, html: message.html }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);

  if (!response?.ok) throw new Error('EMAIL_PROVIDER_FAILED');
  const result = await response.json().catch(() => null) as { id?: unknown } | null;
  if (typeof result?.id !== 'string' || result.id.length < 8) throw new Error('EMAIL_PROVIDER_FAILED');
  return { providerMessageId: result.id.slice(0, 200) };
}
