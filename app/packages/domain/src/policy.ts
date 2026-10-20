// Framework-agnostic policy helpers shared by Option A and Option C (synthetic spike).
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const STAFF_ROLES = ['OWNER', 'ADMIN', 'ENGINEER', 'STORE', 'EDITOR'] as const;
export type Role = (typeof STAFF_ROLES)[number] | 'CUSTOMER';

/** Server-side permission matrix (doc 14 §2, M3P role names). */
export const PERMISSIONS = {
  'order.confirm': ['OWNER', 'ADMIN', 'STORE'],
  'order.fulfil': ['OWNER', 'ADMIN', 'STORE'],
  'order.cancel': ['OWNER', 'ADMIN', 'STORE'],
  'quote.issue': ['OWNER'],
  'payment.record': ['OWNER', 'ADMIN', 'STORE'],
  'payment.verify': ['OWNER', 'ADMIN', 'STORE'],
  'stock.adjust': ['OWNER', 'ADMIN'],
  'contract.sign': ['OWNER'],
  'contract.amend': ['OWNER'],
  'attribution.override': ['OWNER'],
  'warranty_policy.approve': ['OWNER'],
  'coverage.activate': ['OWNER', 'ADMIN', 'ENGINEER'],
  'content.edit': ['OWNER', 'ADMIN', 'EDITOR'],
  'content.review': ['OWNER', 'ADMIN', 'ENGINEER'],
  'content.publish': ['OWNER', 'ADMIN'],
  'consent.revoke': ['OWNER', 'ADMIN'],
  'file.read_any': ['OWNER', 'ADMIN', 'ENGINEER'],
  'file.scan_result': ['OWNER', 'ADMIN'],
  'user.role_change': ['OWNER'],
  'settings.stage': ['OWNER'],
  'crm.read': ['OWNER', 'ADMIN', 'ENGINEER'],
  'crm.write': ['OWNER', 'ADMIN', 'ENGINEER'],
  'proposal.approve': ['OWNER'],
  'contract.adjust': ['OWNER'],
  'kpi.read': ['OWNER', 'ADMIN'],
  'claims.review': ['OWNER', 'ADMIN', 'ENGINEER'],
  'claims.approve': ['OWNER'],
  'price.propose': ['OWNER', 'ADMIN', 'STORE'],
  'price.approve': ['OWNER'],
  'serial.register': ['OWNER', 'ADMIN', 'STORE'],
  'warranty_claim.decide': ['OWNER', 'ADMIN', 'ENGINEER'],
  'system.reconcile': ['OWNER', 'ADMIN'],
  'commissioning.record': ['OWNER', 'ADMIN', 'ENGINEER'],
  'ownership.verify': ['OWNER', 'ADMIN', 'ENGINEER'],
  'service.manage': ['OWNER', 'ADMIN', 'ENGINEER'],
  'rma.decide': ['OWNER', 'ADMIN', 'ENGINEER'],
} as const satisfies Record<string, readonly Role[]>;
export type Permission = keyof typeof PERMISSIONS;

export function can(role: string | undefined | null, perm: Permission): boolean {
  return !!role && (PERMISSIONS[perm] as readonly string[]).includes(role);
}
export const isStaff = (role?: string | null) => !!role && (STAFF_ROLES as readonly string[]).includes(role);

// ---------- passwords (scrypt, no extra dependency) ----------
export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const dk = scryptSync(pw, salt, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${salt.toString('base64url')}$${dk.toString('base64url')}`;
}
export function verifyPassword(pw: string, stored: string): boolean {
  const [alg, s, h] = stored.split('$');
  if (alg !== 'scrypt' || !s || !h) return false;
  const dk = scryptSync(pw, Buffer.from(s, 'base64url'), 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  const want = Buffer.from(h, 'base64url');
  return want.length === dk.length && timingSafeEqual(want, dk);
}

// ---------- signed, expiring file tokens ----------
export type FileToken = { fid: string; uid: string; exp: number };
export function signFileToken(t: FileToken, secret: string): string {
  const body = Buffer.from(JSON.stringify(t)).toString('base64url');
  const mac = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${mac}`;
}
export function verifyFileToken(token: string, secret: string, now = Date.now()): FileToken | null {
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const want = createHmac('sha256', secret).update(body).digest();
  const got = Buffer.from(mac, 'base64url');
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const t = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as FileToken;
    if (typeof t.exp !== 'number' || t.exp < now) return null;
    return t;
  } catch {
    return null;
  }
}

// ---------- upload allow-list with magic-byte checks ----------
const ALLOWED: Record<string, { mime: string; check: (b: Buffer) => boolean }> = {
  pdf: { mime: 'application/pdf', check: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
  png: { mime: 'image/png', check: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  jpg: { mime: 'image/jpeg', check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  dxf: { mime: 'image/vnd.dxf', check: (b) => /^\s*0\s*\r?\n\s*SECTION/.test(b.subarray(0, 64).toString('latin1')) },
};
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Strip any client-supplied path components (both separators) — the name is metadata only, never a path. */
export function uploadBaseName(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? '';
  return base.replace(/[^\w.\- ]+/g, '_').slice(0, 120);
}

export function classifyUpload(filename: string, bytes: Buffer): { ok: true; ext: string; mime: string } | { ok: false; reason: string } {
  const lower = uploadBaseName(filename).toLowerCase();
  if (!lower || lower.startsWith('.')) return { ok: false, reason: 'INVALID_NAME' };
  const parts = lower.split('.');
  if (parts.length > 2) return { ok: false, reason: 'DOUBLE_EXTENSION' };
  const ext = parts.length === 2 ? parts[1] : '';
  const rule = ALLOWED[ext === 'jpeg' ? 'jpg' : ext];
  if (!rule) return { ok: false, reason: 'TYPE_NOT_ALLOWED' };
  if (bytes.length === 0) return { ok: false, reason: 'EMPTY' };
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, reason: 'TOO_LARGE' };
  if (!rule.check(bytes)) return { ok: false, reason: 'MAGIC_MISMATCH' };
  return { ok: true, ext: ext === 'jpeg' ? 'jpg' : ext, mime: rule.mime };
}

// ---------- content publication gate (re-evaluated server-side at publish time) ----------
export type ContentGateInput = {
  status: string;
  reviewedBy: string | null;
  titleAr?: string | null;
  titleEn?: string | null;
  bodyAr?: string | null;
  bodyEn?: string | null;
  requiresConsent: boolean;
  consentStatus: string | null; // VALID | REVOKED | MISSING | null
  claimStatus: string | null; // NONE | OWNER_REPORTED | REVIEW_PENDING | INDEPENDENTLY_DEMONSTRATED | CERTIFIED | PROHIBITED
};
const PUBLISHABLE_CLAIMS = new Set(['NONE', 'INDEPENDENTLY_DEMONSTRATED', 'CERTIFIED']);

export function publishGate(i: ContentGateInput): string[] {
  const blockers: string[] = [];
  if (i.status !== 'APPROVED') blockers.push('NOT_APPROVED');
  if (!i.reviewedBy) blockers.push('NO_REVIEW_RECORD');
  if (!i.titleAr?.trim() || !i.bodyAr?.trim()) blockers.push('ARABIC_INCOMPLETE');
  if (!i.titleEn?.trim() || !i.bodyEn?.trim()) blockers.push('ENGLISH_INCOMPLETE');
  if (i.requiresConsent && i.consentStatus !== 'VALID') blockers.push('CONSENT_NOT_VALID');
  if (!PUBLISHABLE_CLAIMS.has(i.claimStatus ?? 'NONE')) blockers.push('CLAIM_NOT_PUBLISHABLE');
  return blockers;
}

export const CONTENT_TRANSITIONS: Record<string, { to: string; perm: Permission }[]> = {
  DRAFT: [{ to: 'IN_REVIEW', perm: 'content.edit' }],
  IN_REVIEW: [
    { to: 'APPROVED', perm: 'content.review' },
    { to: 'DRAFT', perm: 'content.review' },
  ],
  APPROVED: [
    { to: 'PUBLISHED', perm: 'content.publish' },
    { to: 'DRAFT', perm: 'content.edit' },
  ],
  PUBLISHED: [{ to: 'WITHDRAWN', perm: 'content.publish' }],
  WITHDRAWN: [{ to: 'DRAFT', perm: 'content.edit' }],
};
