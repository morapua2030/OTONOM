// Pure server-side validation for the public RFQ / consultation intake (variant P-A: no file uploads).
export const CUSTOMER_TYPES = ['DEVELOPER', 'CONTRACTOR', 'CONSULTANT', 'PARTNER', 'HOMEOWNER', 'OTHER'] as const;
export const PROJECT_TYPES = ['COMPOUND', 'MULTI_UNIT_BUILDING', 'VILLA', 'APARTMENT', 'COMMERCIAL', 'OTHER'] as const;
export const SYSTEMS = ['LIGHTING', 'CLIMATE', 'AV', 'AUDIO', 'DOORS_GARAGE', 'ALARM_INTEGRATION', 'SCENES', 'OTHER'] as const;
export const ENGAGEMENT = ['SUPPLY_ONLY', 'SUPPLY_INSTALL_PROGRAM', 'DESIGN_BUILD', 'UNSURE'] as const;
export const GOVERNORATES = [
  'CAIRO', 'GIZA', 'ALEXANDRIA', 'QALYUBIA', 'SHARQIA', 'DAKAHLIA', 'GHARBIA', 'MONUFIA', 'BEHEIRA', 'KAFR_EL_SHEIKH', 'DAMIETTA', 'PORT_SAID',
  'ISMAILIA', 'SUEZ', 'NORTH_SINAI', 'SOUTH_SINAI', 'RED_SEA', 'MATROUH', 'FAYOUM', 'BENI_SUEF', 'MINYA', 'ASSIUT', 'SOHAG', 'QENA', 'LUXOR', 'ASWAN', 'NEW_VALLEY', 'OUTSIDE_EGYPT',
] as const;

export type RfqInput = {
  kind: 'RFQ' | 'CONSULTATION' | 'PARTNER';
  idempotencyKey: string;
  locale: 'ar' | 'en';
  fullName: string;
  email?: string;
  phone?: string;
  organisationName?: string;
  contactRole?: string;
  customerType: (typeof CUSTOMER_TYPES)[number];
  projectType: (typeof PROJECT_TYPES)[number];
  governorate: (typeof GOVERNORATES)[number];
  city?: string;
  units?: number;
  circuits?: number;
  systems: string[];
  engagementModel: (typeof ENGAGEMENT)[number];
  description: string;
  phase?: string;
  timeline?: string;
  budgetBand?: string;
  preferredChannel?: string;
  howHeard?: string;
  consentProcessing: boolean;
  consentMarketing: boolean;
  attribution?: { landingPage?: string; referrer?: string; utm?: Record<string, string> };
};

export type FieldErrors = Record<string, string>;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const oneOf = <T extends readonly string[]>(v: unknown, list: T): T[number] | null => (typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T[number]) : null);

/** Egyptian / international phone normalised to E.164 (+20 default). Returns null if implausible. */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-().]/g, '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  let e164: string;
  if (/^\+\d{8,15}$/.test(digits)) e164 = digits;
  else if (/^00\d{8,15}$/.test(digits)) e164 = '+' + digits.slice(2);
  else if (/^0\d{9,10}$/.test(digits)) e164 = '+20' + digits.slice(1);
  else return null;
  return e164;
}

export function validateRfq(body: Record<string, any>): { ok: true; value: RfqInput } | { ok: false; errors: FieldErrors } {
  const e: FieldErrors = {};
  const kind = oneOf(body.kind ?? 'RFQ', ['RFQ', 'CONSULTATION', 'PARTNER'] as const);
  if (!kind) e.kind = 'invalid';
  const idempotencyKey = str(body.idempotencyKey, 80);
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(idempotencyKey)) e.idempotencyKey = 'invalid';
  const locale = body.locale === 'en' ? 'en' : 'ar';
  const fullName = str(body.fullName, 100);
  if (fullName.length < 2) e.fullName = 'required';
  const email = str(body.email, 200).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = 'invalid';
  const phoneRaw = str(body.phone, 40);
  const phone = phoneRaw ? normalisePhone(phoneRaw) : null;
  if (phoneRaw && !phone) e.phone = 'invalid';
  if (!email && !phone) e.contact = 'email_or_phone_required';
  const customerType = oneOf(body.customerType, CUSTOMER_TYPES);
  if (!customerType) e.customerType = 'required';
  const projectType = oneOf(body.projectType, PROJECT_TYPES);
  if (!projectType) e.projectType = 'required';
  const governorate = oneOf(body.governorate, GOVERNORATES);
  if (!governorate) e.governorate = 'required';
  const units = body.units === undefined || body.units === '' ? undefined : Number(body.units);
  if (units !== undefined && !(Number.isInteger(units) && units >= 1 && units <= 100000)) e.units = 'invalid';
  const circuits = body.circuits === undefined || body.circuits === '' ? undefined : Number(body.circuits);
  if (circuits !== undefined && !(Number.isInteger(circuits) && circuits >= 1 && circuits <= 100000)) e.circuits = 'invalid';
  if (kind === 'RFQ' && units === undefined && circuits === undefined) e.size = 'units_or_circuits_required';
  const systems = Array.isArray(body.systems) ? body.systems.filter((s: unknown) => (SYSTEMS as readonly unknown[]).includes(s)).slice(0, SYSTEMS.length) : [];
  const engagementModel = oneOf(body.engagementModel ?? 'UNSURE', ENGAGEMENT);
  if (!engagementModel) e.engagementModel = 'invalid';
  const description = str(body.description, 2000);
  if (description.length < 20) e.description = 'min_20_chars';
  if (body.consentProcessing !== true) e.consentProcessing = 'required';
  const utmIn = body.attribution?.utm && typeof body.attribution.utm === 'object' ? body.attribution.utm : {};
  const utm: Record<string, string> = {};
  for (const k of ['source', 'medium', 'campaign', 'term', 'content']) if (typeof utmIn[k] === 'string') utm[k] = utmIn[k].slice(0, 120);
  if (Object.keys(e).length) return { ok: false, errors: e };
  return {
    ok: true,
    value: {
      kind: kind!,
      idempotencyKey,
      locale,
      fullName,
      email: email || undefined,
      phone: phone ?? undefined,
      organisationName: str(body.organisationName, 160) || undefined,
      contactRole: str(body.contactRole, 80) || undefined,
      customerType: customerType!,
      projectType: projectType!,
      governorate: governorate!,
      city: str(body.city, 80) || undefined,
      units,
      circuits,
      systems,
      engagementModel: engagementModel!,
      description,
      phase: str(body.phase, 40) || undefined,
      timeline: str(body.timeline, 40) || undefined,
      budgetBand: str(body.budgetBand, 40) || undefined,
      preferredChannel: str(body.preferredChannel, 40) || undefined,
      howHeard: str(body.howHeard, 80) || undefined,
      consentProcessing: true,
      consentMarketing: body.consentMarketing === true,
      attribution: { landingPage: str(body.attribution?.landingPage, 300) || undefined, referrer: str(body.attribution?.referrer, 300) || undefined, utm },
    },
  };
}
