/** Booking-request vocabulary (final release, owner 2026-11-04; form simplified by the owner the same day). */
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

/**
 * The simplified form (owner, 2026-11-04): name (2–60), Egyptian mobile, package, consent, an optional note (≤ 500)
 * and, from the simulator only, the plan text attached automatically (≤ 900). Area and preferred time were removed.
 */
export const LEAD_LIMITS = { nameMin: 2, name: 60, message: 500, plan: 900 } as const;
/** Minimum time between showing the form and submitting it; faster submissions are treated as bots. */
export const LEAD_MIN_FILL_MS = 3000;
/** A form older than this is stale (the visitor reloads); also bounds the timing token. */
export const LEAD_MAX_FILL_MS = 6 * 60 * 60 * 1000;

export type LeadInput = {
  name: string;
  phone: string;
  package: LeadPackage;
  message: string | null;
  plan: string | null;
  source: LeadSource;
  locale: 'ar' | 'en';
  consent: true;
  idempotencyKey: string;
};
export type LeadErrors = Partial<Record<keyof LeadInput | 'form', string>>;

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f‪-‮⁦-⁩]/g;
const text = (v: unknown) => (typeof v === 'string' ? v.replace(CONTROL, '').replace(/\s+/g, (s) => (s.includes('\n') ? s : ' ')).trim() : '');
/** Counts user-perceived characters (an Arabic letter or an emoji is one), so the limits match what people see. */
const chars = (s: string) => [...s].length;

/**
 * Egyptian mobile only: 010 / 011 / 012 / 015 + 8 digits. Accepts the forms people actually type and normalises them:
 * spaces, dashes, dots or brackets; Arabic-Indic or Persian digits; a +20 / 0020 / 20 prefix or none. Stored as +20….
 */
export function egyptianMobile(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 40) return null;
  const digits = raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\s‎‏\-–.()]/g, '');
  const m = /^(?:(?:\+|00)?20)?0?(1[0125]\d{8})$/.exec(digits);
  return m ? `+20${m[1]}` : null;
}

/**
 * Server-side validation of a booking request. Rejects (never truncates) over-long fields, requires consent, an
 * Egyptian mobile and an allow-listed package; strips control and bidi-override characters from free text. Unknown
 * fields (for example the removed area / preferred time) are ignored; a plan is kept only for simulator requests.
 */
export function validateLead(body: Record<string, unknown>): { ok: true; value: LeadInput } | { ok: false; errors: LeadErrors } {
  const errors: LeadErrors = {};
  const name = text(body.name).replace(/\s+/g, ' ');
  const message = text(body.message);
  const plan = typeof body.plan === 'string' ? body.plan.replace(CONTROL, '').trim() : '';
  if (!name) errors.name = 'REQUIRED';
  else if (chars(name) < LEAD_LIMITS.nameMin) errors.name = 'TOO_SHORT';
  else if (chars(name) > LEAD_LIMITS.name) errors.name = 'TOO_LONG';
  const phone = egyptianMobile(body.phone);
  if (!phone) errors.phone = typeof body.phone === 'string' && body.phone.trim() ? 'EGYPTIAN_MOBILE' : 'REQUIRED';
  const pkg = typeof body.package === 'string' && (LEAD_PACKAGES as readonly string[]).includes(body.package) ? (body.package as LeadPackage) : null;
  if (!pkg) errors.package = 'REQUIRED';
  if (chars(message) > LEAD_LIMITS.message) errors.message = 'TOO_LONG';
  if (chars(plan) > LEAD_LIMITS.plan) errors.plan = 'TOO_LONG';
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
    value: { name, phone: phone!, package: pkg!, message: message || null, plan: source === 'simulator' && plan ? plan : null, source: source!, locale: locale!, consent: true, idempotencyKey: idempotencyKey! },
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
