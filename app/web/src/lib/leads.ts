import { normalisePhone } from './rfq-validate.ts';

/** Booking-request vocabulary (final release, owner 2026-11-04). */
export const LEAD_PACKAGES = ['premium', 'plus', 'essential', 'unsure'] as const;
export type LeadPackage = (typeof LEAD_PACKAGES)[number];
export const LEAD_SOURCES = ['contact', 'simulator'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];
export const LEAD_STATUSES = [
  { value: 'NEW', ar: 'جديد', en: 'New' },
  { value: 'CONTACTED', ar: 'اتواصلنا', en: 'Contacted' },
  { value: 'VISIT_SCHEDULED', ar: 'زيارة متحددة', en: 'Visit scheduled' },
  { value: 'QUOTED', ar: 'عرض سعر', en: 'Quote sent' },
  { value: 'FOLLOW_UP', ar: 'اتباع', en: 'Follow up' },
  { value: 'NOT_INTERESTED', ar: 'مش مهتم', en: 'Not interested' },
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number]['value'];

export const LEAD_LIMITS = { name: 80, area: 80, preferredTime: 80, message: 500, plan: 900 } as const;
/** Minimum time between showing the form and submitting it; faster submissions are treated as bots. */
export const LEAD_MIN_FILL_MS = 3000;
/** A form older than this is stale (the visitor reloads); also bounds the timing token. */
export const LEAD_MAX_FILL_MS = 6 * 60 * 60 * 1000;

export type LeadInput = {
  name: string;
  phone: string;
  area: string;
  package: LeadPackage;
  preferredTime: string | null;
  message: string | null;
  plan: string | null;
  source: LeadSource;
  locale: 'ar' | 'en';
  consent: true;
  idempotencyKey: string;
};
export type LeadErrors = Partial<Record<keyof LeadInput | 'form', string>>;

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f‪-‮⁦-⁩]/g;
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(CONTROL, '').trim() : '');

/** Egyptian mobile only: 010 / 011 / 012 / 015 + 8 digits (Arabic-Indic digits accepted), stored as +20… */
export function egyptianMobile(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const e164 = normalisePhone(raw);
  return e164 && /^\+201[0125]\d{8}$/.test(e164) ? e164 : null;
}

/**
 * Server-side validation of a booking request. Rejects (never truncates) over-long fields, requires consent, an
 * Egyptian mobile and an allow-listed package; strips control and bidi-override characters from free text.
 */
export function validateLead(body: Record<string, unknown>): { ok: true; value: LeadInput } | { ok: false; errors: LeadErrors } {
  const errors: LeadErrors = {};
  const name = text(body.name, LEAD_LIMITS.name);
  const area = text(body.area, LEAD_LIMITS.area);
  const preferredTime = text(body.preferredTime, LEAD_LIMITS.preferredTime);
  const message = text(body.message, LEAD_LIMITS.message);
  const plan = text(body.plan, LEAD_LIMITS.plan);
  if (name.length < 2) errors.name = 'REQUIRED';
  else if (name.length > LEAD_LIMITS.name) errors.name = 'TOO_LONG';
  const phone = egyptianMobile(body.phone);
  if (!phone) errors.phone = 'EGYPTIAN_MOBILE';
  if (area.length < 2) errors.area = 'REQUIRED';
  else if (area.length > LEAD_LIMITS.area) errors.area = 'TOO_LONG';
  const pkg = typeof body.package === 'string' && (LEAD_PACKAGES as readonly string[]).includes(body.package) ? (body.package as LeadPackage) : null;
  if (!pkg) errors.package = 'REQUIRED';
  if (preferredTime.length > LEAD_LIMITS.preferredTime) errors.preferredTime = 'TOO_LONG';
  if (message.length > LEAD_LIMITS.message) errors.message = 'TOO_LONG';
  if (plan.length > LEAD_LIMITS.plan) errors.plan = 'TOO_LONG';
  const source = typeof body.source === 'string' && (LEAD_SOURCES as readonly string[]).includes(body.source) ? (body.source as LeadSource) : null;
  if (!source) errors.source = 'INVALID';
  const locale = body.locale === 'en' ? 'en' : body.locale === 'ar' ? 'ar' : null;
  if (!locale) errors.locale = 'INVALID';
  if (body.consent !== true) errors.consent = 'REQUIRED';
  const idempotencyKey = typeof body.idempotencyKey === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(body.idempotencyKey) ? body.idempotencyKey : null;
  if (!idempotencyKey) errors.idempotencyKey = 'INVALID';
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { name, phone: phone!, area, package: pkg!, preferredTime: preferredTime || null, message: message || null, plan: plan || null, source: source!, locale: locale!, consent: true, idempotencyKey: idempotencyKey! },
  };
}

/** Lead references are not guessable and carry no personal data: BK-<year>-<6 chars>. */
export const LEAD_REF = /^BK-\d{4}-[A-Z2-9]{6}$/;

/** The public booking form is shown only when BOTH audited switches are on (owner, 2026-11-04). */
export const bookingVisible = (s: { privacyApproved: boolean; intakeEnabled: boolean }) => s.privacyApproved === true && s.intakeEnabled === true;

/** Retention: a lead is deleted this many months after its last activity (owner-editable, default 12). */
export function retentionCutoff(now: Date, months: number): Date {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - Math.max(1, Math.min(36, Math.trunc(months) || 12)));
  return d;
}
