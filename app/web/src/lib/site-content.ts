/**
 * Admin-managed site content with a built-in fallback (final release, owner 2026-11-04).
 *
 * `DEFAULT_SITE_CONTENT` is exactly what the site showed before the admin integration (the code registries), and the
 * production seed publishes exactly these values, so nothing visible changes at release. `loadSiteContent()` reads
 * the PUBLISHED admin content through Payload's Local API (read access applies: published only), validates it, and
 * falls back per section to the built-in values when nothing is published, when a value is invalid, or when the
 * database is unreachable or slow. The result is cached under the `site-content` tag that every publish expires.
 */
import type { Locale } from './i18n.ts';
import { ADDRESS, PHONE_E164, setActiveContact } from './contact.ts';
import { PRODUCTS, PRODUCT_MODELS, type ProductModel } from './products.ts';
import { PACKAGE_ITEM_KEYS, SMART_HOME_PACKAGE_IDS, SMART_HOME_PACKAGES, type PackageItemKey, type SmartHomePackage, type SmartHomePackageId } from './smart-home-packages.ts';
import { SITE_COPY } from './site-copy.ts';
import { SIMD } from './simulator/copy.ts';
import { AC_CHANNELS, CHANNELS_PER_DEVICE, ENGINEER_REVIEW_ABOVE, RORDER, routine, type RoutineId } from './simulator/rules.ts';
import { PRIVACY_DRAFT } from './privacy-draft.ts';
import { SITE_CONTENT_TAG } from './content-workflow.ts';

export type Pair = { ar: string; en: string };
export type ServiceKey = 'iot' | 'soft' | 'custom';
export const SERVICE_KEYS: readonly ServiceKey[] = ['iot', 'soft', 'custom'];

export type SiteContent = {
  packages: SmartHomePackage[];
  controllers: Record<ProductModel, { name: Pair; channels: number; note: Pair | null; inPackages: boolean }>;
  contact: { phoneE164: string; whatsappE164: string; email: string | null; address: Pair; hours: Pair | null; socials: Array<{ network: string; url: string }> };
  announcement: { text: Pair; link: string | null } | null;
  routines: Array<{ id: RoutineId; title: Pair; trigger: Pair; actions: { ar: string[]; en: string[] }; premium: boolean }>;
  faqs: Record<ServiceKey, Array<{ q: Pair; a: Pair }>>;
  simRules: { acChannels: number; channelsPerDevice: number; engineerReviewAbove: number };
  privacy: { approved: boolean; body: Pair; lastUpdated: string };
  intakeEnabled: boolean;
  /** Which sections came from the admin (the rest are the built-in values). */
  fromAdmin: string[];
};

const faqOf = (locale: Locale, key: ServiceKey) => ((SITE_COPY as any)[locale].svc[key].faq as Array<[string, string]>) ?? [];

/** Exactly the values the site showed before the admin integration. */
export const DEFAULT_SITE_CONTENT: SiteContent = Object.freeze({
  packages: SMART_HOME_PACKAGES.map((p) => ({ ...p, items: p.items.map((i) => ({ ...i })) })),
  controllers: Object.fromEntries(
    PRODUCTS.map((p) => [p.model, { name: { ar: p.name, en: p.name }, channels: p.channels, note: null, inPackages: p.model === '16r' }]),
  ) as SiteContent['controllers'],
  contact: { phoneE164: PHONE_E164, whatsappE164: PHONE_E164, email: null, address: { ar: ADDRESS.ar, en: ADDRESS.en }, hours: null, socials: [] },
  announcement: null,
  routines: RORDER.map((id) => ({
    id,
    title: { ar: SIMD.ar.routines[id].t, en: SIMD.en.routines[id].t },
    trigger: { ar: SIMD.ar.routines[id].tr, en: SIMD.en.routines[id].tr },
    actions: { ar: [...SIMD.ar.routines[id].a], en: [...SIMD.en.routines[id].a] },
    premium: routine(id).lock === 'all',
  })),
  faqs: Object.fromEntries(
    SERVICE_KEYS.map((k) => [k, faqOf('ar', k).map(([q, a], i) => ({ q: { ar: q, en: faqOf('en', k)[i]?.[0] ?? '' }, a: { ar: a, en: faqOf('en', k)[i]?.[1] ?? '' } }))]),
  ) as SiteContent['faqs'],
  simRules: { acChannels: AC_CHANNELS, channelsPerDevice: CHANNELS_PER_DEVICE, engineerReviewAbove: ENGINEER_REVIEW_ABOVE },
  privacy: { approved: false, body: { ar: PRIVACY_DRAFT.ar, en: PRIVACY_DRAFT.en }, lastUpdated: '2026-11-04' },
  intakeEnabled: false,
  fromAdmin: [],
}) as SiteContent;

// ---- Validation of published admin data (anything invalid keeps the built-in section) ----------------------------
const s = (v: unknown, max = 2000) => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null);
const pairOf = (doc: any, name: string, max?: number): Pair | null => {
  const ar = s(doc?.[`${name}Ar`], max), en = s(doc?.[`${name}En`], max);
  return ar && en ? { ar, en } : null;
};
const int = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null);
const E164 = /^\+[1-9]\d{7,14}$/;
const SAFE_LINK = /^(\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/;

export function packagesFrom(docs: any[]): SmartHomePackage[] | null {
  const out: Array<SmartHomePackage & { order: number }> = [];
  for (const d of docs) {
    if (d?.active === false) continue;
    const id = d?.packageId as SmartHomePackageId;
    const name = pairOf(d, 'name', 40);
    const price = int(d?.priceEgp, 1000, 1_000_000);
    if (!(SMART_HOME_PACKAGE_IDS as readonly string[]).includes(id) || !name || !price) return null;
    const items: SmartHomePackage['items'] = [];
    for (const it of Array.isArray(d.items) ? d.items : []) {
      const key = it?.key as PackageItemKey;
      const iname = pairOf(it, 'name', 60);
      const qty = int(it?.quantity, 1, 20);
      if (!(PACKAGE_ITEM_KEYS as readonly string[]).includes(key) || !iname || !qty) return null;
      const model = (PRODUCT_MODELS as readonly string[]).includes(it?.model) ? (it.model as ProductModel) : undefined;
      items.push(model ? { key, name: iname, quantity: qty, model } : { key, name: iname, quantity: qty });
    }
    if (!items.length) return null;
    const badge = d.mostComplete ? pairOf(d, 'badge', 40) : null;
    out.push({ id, name, priceEgp: price, ...(badge ? { badge } : {}), items, order: typeof d.order === 'number' ? d.order : 0 });
  }
  if (!out.length || new Set(out.map((p) => p.id)).size !== out.length) return null;
  return out.sort((a, b) => a.order - b.order).map(({ order: _order, ...p }) => p);
}

export function controllersFrom(docs: any[]): SiteContent['controllers'] | null {
  const base = { ...DEFAULT_SITE_CONTENT.controllers };
  let any = false;
  for (const d of docs) {
    const model = d?.model as ProductModel;
    if (!(PRODUCT_MODELS as readonly string[]).includes(model)) return null;
    const name = pairOf(d, 'name', 60);
    const channels = int(d?.channels, 1, 64);
    if (!name || !channels) return null;
    base[model] = { name, channels, note: pairOf(d, 'note', 400), inPackages: !!d.inPackages };
    any = true;
  }
  return any ? base : null;
}

export function routinesFrom(docs: any[]): SiteContent['routines'] | null {
  const out: Array<SiteContent['routines'][number] & { order: number }> = [];
  for (const d of docs) {
    if (d?.active === false) continue;
    const id = d?.routineId as RoutineId;
    if (!(RORDER as readonly string[]).includes(id)) return null;
    const title = pairOf(d, 'title', 60), trigger = pairOf(d, 'trigger', 120), actions = pairOf(d, 'actions', 400);
    if (!title || !trigger || !actions) return null;
    const lines = (t: string) => t.split(/\n+/).map((x) => x.trim()).filter(Boolean);
    out.push({ id, title, trigger, actions: { ar: lines(actions.ar), en: lines(actions.en) }, premium: !!d.premium, order: typeof d.order === 'number' ? d.order : 0 });
  }
  if (!out.length) return null;
  return out.sort((a, b) => a.order - b.order).map(({ order: _o, ...r }) => r);
}

export function faqsFrom(docs: any[]): SiteContent['faqs'] | null {
  const out: Record<ServiceKey, Array<{ q: Pair; a: Pair; order: number }>> = { iot: [], soft: [], custom: [] };
  for (const d of docs) {
    if (d?.active === false) continue;
    const key = d?.service as ServiceKey;
    const q = pairOf(d, 'question', 200), a = pairOf(d, 'answer', 1200);
    if (!SERVICE_KEYS.includes(key) || !q || !a) return null;
    out[key].push({ q, a, order: typeof d.order === 'number' ? d.order : 0 });
  }
  if (!SERVICE_KEYS.some((k) => out[k].length)) return null;
  // a service with no published FAQ keeps its built-in questions
  return Object.fromEntries(
    SERVICE_KEYS.map((k) => [k, out[k].length ? out[k].sort((x, y) => x.order - y.order).map(({ q, a }) => ({ q, a })) : DEFAULT_SITE_CONTENT.faqs[k]]),
  ) as SiteContent['faqs'];
}

export function contactFrom(g: any): SiteContent['contact'] | null {
  if (!g || !E164.test(g.phoneE164 ?? '') || !E164.test(g.whatsappE164 ?? '')) return null;
  const address = pairOf(g, 'address', 200);
  if (!address) return null;
  const email = typeof g.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email) ? g.email : null;
  const socials = (Array.isArray(g.socials) ? g.socials : [])
    .filter((x: any) => typeof x?.url === 'string' && /^https:\/\/[^\s]+$/.test(x.url) && typeof x?.network === 'string')
    .map((x: any) => ({ network: x.network, url: x.url }));
  return { phoneE164: g.phoneE164, whatsappE164: g.whatsappE164, email, address, hours: pairOf(g, 'hours', 120), socials };
}

export function announcementFrom(g: any, now = new Date()): SiteContent['announcement'] {
  if (!g?.enabled) return null;
  const text = pairOf(g, 'text', 160);
  if (!text) return null;
  if (g.activeFrom && now < new Date(g.activeFrom)) return null;
  if (g.activeTo && now > new Date(g.activeTo)) return null;
  const link = typeof g.link === 'string' && SAFE_LINK.test(g.link) ? g.link : null;
  return { text, link };
}

export function simRulesFrom(g: any): SiteContent['simRules'] | null {
  const ac = int(g?.acChannels, 0, 4), dev = int(g?.channelsPerDevice, 1, 4), eng = int(g?.engineerReviewAbove, 16, 256);
  return ac === null || dev === null || eng === null ? null : { acChannels: ac, channelsPerDevice: dev, engineerReviewAbove: eng };
}

/** A stored date as the Cairo calendar day (YYYY-MM-DD), whatever the server time zone. */
export function cairoDate(v: unknown): string | null {
  if (typeof v !== 'string' && !(v instanceof Date)) return null;
  const d = new Date(v as string);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function privacyFrom(g: any): SiteContent['privacy'] | null {
  const body = pairOf(g, 'body', 12000);
  if (!body) return null;
  const lastUpdated = cairoDate(g?.lastUpdated) ?? DEFAULT_SITE_CONTENT.privacy.lastUpdated;
  return { approved: g?.approved === true, body, lastUpdated };
}

// ---- Reading -----------------------------------------------------------------------------------------------------
const READ_TIMEOUT_MS = 2500;

async function readPublished(): Promise<SiteContent> {
  const [{ getPayload }, { default: config }] = await Promise.all([import('payload'), import('@payload-config')]);
  const payload = await getPayload({ config });
  const list = (collection: string) =>
    payload.find({ collection: collection as any, draft: false, overrideAccess: false, depth: 0, limit: 200, pagination: false } as any).then((r: any) => r.docs as any[]);
  const global = (slug: string, overrideAccess = false) => payload.findGlobal({ slug: slug as any, draft: false, overrideAccess, depth: 0 } as any).catch(() => null);
  const [pk, ct, rt, fq, contact, ann, rules, privacy, intake] = await Promise.all([
    list('catalog-packages'),
    list('catalog-controllers'),
    list('sim-routines'),
    list('service-faqs'),
    global('contact-settings'),
    global('announcement'),
    global('sim-rules'),
    global('privacy-policy'),
    global('intake-settings', true), // staff-only read access; only the on/off value is used
  ]);
  return mergeContent({ packages: pk, controllers: ct, routines: rt, faqs: fq, contact, announcement: ann, simRules: rules, privacy, intake });
}

/** Builds the site content from raw published data; every section falls back to the built-in value on its own. */
export function mergeContent(raw: { packages?: any[]; controllers?: any[]; routines?: any[]; faqs?: any[]; contact?: any; announcement?: any; simRules?: any; privacy?: any; intake?: any }, now = new Date()): SiteContent {
  const d = DEFAULT_SITE_CONTENT;
  const fromAdmin: string[] = [];
  const pick = <T,>(name: string, value: T | null | undefined, fallback: T): T => {
    if (value === null || value === undefined) return fallback;
    fromAdmin.push(name);
    return value;
  };
  const isPublished = (g: any) => g && (g._status === undefined || g._status === 'published');
  return {
    packages: pick('packages', raw.packages?.length ? packagesFrom(raw.packages) : null, d.packages),
    controllers: pick('controllers', raw.controllers?.length ? controllersFrom(raw.controllers) : null, d.controllers),
    routines: pick('routines', raw.routines?.length ? routinesFrom(raw.routines) : null, d.routines),
    faqs: pick('faqs', raw.faqs?.length ? faqsFrom(raw.faqs) : null, d.faqs),
    contact: pick('contact', isPublished(raw.contact) ? contactFrom(raw.contact) : null, d.contact),
    announcement: isPublished(raw.announcement) ? announcementFrom(raw.announcement, now) : null,
    simRules: pick('simRules', isPublished(raw.simRules) ? simRulesFrom(raw.simRules) : null, d.simRules),
    privacy: pick('privacy', raw.privacy ? privacyFrom(raw.privacy) : null, d.privacy),
    intakeEnabled: raw.intake?.enabled === true,
    fromAdmin,
  };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('SITE_CONTENT_TIMEOUT')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

let cachedLoader: (() => Promise<SiteContent>) | null = null;
/** After a failed read the site uses the built-in values for a minute instead of waiting on the database again. */
let failedAt = 0;
const BACKOFF_MS = 60_000;

/** Published site content, cached under the `site-content` tag (expired by every publish); never throws. */
export async function loadSiteContent(): Promise<SiteContent> {
  if (Date.now() - failedAt < BACKOFF_MS) return DEFAULT_SITE_CONTENT;
  try {
    if (!cachedLoader) {
      const { unstable_cache } = await import('next/cache');
      cachedLoader = unstable_cache(() => withTimeout(readPublished(), READ_TIMEOUT_MS), ['site-content-v1'], { tags: [SITE_CONTENT_TAG], revalidate: 300 });
    }
    const content = await cachedLoader();
    setActiveContact({ phoneE164: content.contact.phoneE164, whatsappE164: content.contact.whatsappE164, address: content.contact.address });
    return content;
  } catch {
    failedAt = Date.now();
    return DEFAULT_SITE_CONTENT;
  }
}

/** Text of a pair in the page locale. */
export const tx = (p: Pair, locale: Locale) => p[locale];
