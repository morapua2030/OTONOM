// Unit tests for the 2026-11-15 fixes: operator reset (A), booking limits (B), authenticator re-enrollment (C),
// media storage (D) and password-reset e-mail gating (E). Synthetic values only; nothing here touches a database.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { can } from '@otonom/domain';
import { assertOperatorResetGate, mfaResetFields, OPERATOR_RESET_GATE, parseResetArgs } from '../src/lib/operator-reset.ts';
import { keepOnlySession, openReenrollToken, REENROLL_TOKEN_TTL_MS, reenrollToken } from '../src/lib/mfa-reenroll.ts';
import { blobImageOrigin, blobStorageEnabled, blobStoreId, MEDIA_MAX_BYTES, mediaUploadProblem, mediaUploadsEnabled, privateUploadsEnabled, sniffImageType } from '../src/lib/media-storage.ts';
import { contentSecurityPolicy } from '../src/lib/csp.ts';
import { parseFromAddress, passwordResetEmail, passwordResetEmailEnabled } from '../src/lib/password-reset.ts';
import { mediaImageFrom } from '../src/lib/site-content.ts';
import { BOOKING_IP_LIMIT, BOOKING_PHONE_LIMIT } from '../src/endpoints/final-release.ts';

const src = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

// ---------------- A: operator reset ----------------
const gate = { OTONOM_RESET_PRODUCTION_STAFF: OPERATOR_RESET_GATE, OTONOM_FORCE_PRODUCTION: '1', OTONOM_EXPECTED_NEON_PROJECT_ID: 'neon-x', NEON_PROJECT_ID: 'neon-x' } as NodeJS.ProcessEnv;

test('A: the operator reset refuses unless every Production confirmation is present', () => {
  assert.doesNotThrow(() => assertOperatorResetGate(gate));
  const cases: Array<[string, NodeJS.ProcessEnv, RegExp]> = [
    ['gate missing', { ...gate, OTONOM_RESET_PRODUCTION_STAFF: undefined }, /RESET_GATE_CLOSED/],
    ['gate wrong', { ...gate, OTONOM_RESET_PRODUCTION_STAFF: 'yes' }, /RESET_GATE_CLOSED/],
    ['not forced production', { ...gate, OTONOM_FORCE_PRODUCTION: '0' }, /NOT_PRODUCTION_TARGET/],
    ['preview forced', { ...gate, OTONOM_FORCE_PREVIEW: '1' }, /NOT_PRODUCTION_TARGET/],
    ['no expected project', { ...gate, OTONOM_EXPECTED_NEON_PROJECT_ID: '' }, /WRONG_NEON_PROJECT/],
    ['other project', { ...gate, NEON_PROJECT_ID: 'neon-y' }, /WRONG_NEON_PROJECT/],
  ];
  for (const [label, env, code] of cases) assert.throws(() => assertOperatorResetGate(env), code, label);
});

test('A: arguments need a confirmed e-mail; --reset-mfa is optional; nothing else is accepted', () => {
  assert.deepEqual(parseResetArgs(['--email', 'Owner@Example.test', '--confirm-email', 'owner@example.test']), { email: 'owner@example.test', resetMfa: false });
  assert.deepEqual(parseResetArgs(['--email', 'a@b.test', '--confirm-email', 'a@b.test', '--reset-mfa']), { email: 'a@b.test', resetMfa: true });
  assert.throws(() => parseResetArgs(['--email', 'a@b.test']), /EMAIL_CONFIRMATION_MISMATCH/);
  assert.throws(() => parseResetArgs(['--email', 'a@b.test', '--confirm-email', 'c@b.test']), /EMAIL_CONFIRMATION_MISMATCH/);
  assert.throws(() => parseResetArgs(['--confirm-email', 'a@b.test']), /EMAIL_REQUIRED/);
  // a password can never be passed as an argument
  assert.throws(() => parseResetArgs(['--email', 'a@b.test', '--confirm-email', 'a@b.test', '--password', 'x']), /UNKNOWN_ARGUMENT/);
});

test('A: the MFA reset removes the secret, the recovery codes and every verified session', () => {
  assert.deepEqual(mfaResetFields(), { totpSecret: null, mfaEnabled: false, recoveryCodes: [], mfaVerifiedSids: [], lastTotpStep: 0 });
});

test('A: the script reads the password from stdin only, targets OWNER/ADMIN, revokes sessions and audits', () => {
  const script = src('../scripts/reset-production-staff.ts');
  assert.match(script, /assertOperatorResetGate\(\)/);
  assert.match(script, /process\.stdin/);
  assert.match(script, /setRawMode\(true\)/);
  assert.match(script, /passwordPolicyError\(password, email\)/);
  assert.match(script, /RESETTABLE_ROLES/);
  assert.match(script, /sessions: \[\]/);
  assert.match(script, /SESSIONS_NOT_REVOKED/);
  assert.match(script, /user\.password_reset_by_operator/);
  assert.match(script, /user\.mfa_reset_by_operator/);
  assert.doesNotMatch(script, /console\.(log|error)\([^)]*password\b/i);
  assert.doesNotMatch(script, /process\.env\.[A-Z_]*PASSWORD/);
  assert.doesNotMatch(script, /lively-silence|nameless-wave|store_[A-Za-z0-9]+/);
});

// ---------------- B: booking limits ----------------
test('B: booking limits are a generous IP ceiling plus a per-phone limit counted after validation', () => {
  assert.equal(BOOKING_IP_LIMIT, 30);
  assert.equal(BOOKING_PHONE_LIMIT, 3);
  const endpoint = src('../src/endpoints/final-release.ts');
  const ip = endpoint.indexOf('booking-ip:');
  const token = endpoint.indexOf('checkBookingToken(b.t)', ip);
  const validate = endpoint.indexOf('validateLead(b)', token);
  const replay = endpoint.indexOf('idempotencyKey: { equals: i.idempotencyKey }', validate);
  const phone = endpoint.indexOf('booking-phone:', replay);
  assert.ok(ip > 0 && token > ip && validate > token && replay > validate && phone > replay, 'phone key only after token, validation and the idempotent replay');
  assert.match(endpoint, /PHONE_LIMITED/);
  // the phone number itself is never used as a key (only a digest)
  assert.match(endpoint, /booking-phone:\$\{createHash\('sha256'\)\.update\(i\.phone\)/);
});

test('B: limited customers see a WhatsApp way out and never a raw code', () => {
  const form = src('../src/components/BookingForm.tsx');
  assert.match(form, /طلبات كتير من نفس الشبكة\. ابعتلنا على واتساب دلوقتي/);
  assert.match(form, /Too many requests from this network\. Message us on WhatsApp now/);
  assert.match(form, /data-testid="booking-limited-whatsapp"/);
  assert.match(form, /contact\.whatsappE164/);
  assert.doesNotMatch(form, />\s*\{?\s*['"`]?(RATE_LIMITED|PHONE_LIMITED)/);
});

// ---------------- C: re-enrollment ----------------
const key = 'synthetic-payload-secret-for-unit-tests-0000000000';
const totp = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

test('C: the re-enrollment token is bound to the user, the session and a 10-minute window', () => {
  const now = 1_800_000_000_000;
  const token = reenrollToken(key, 'u1', 'sid-1', totp, now);
  assert.equal(openReenrollToken(key, 'u1', 'sid-1', token, now + 60_000), totp);
  assert.equal(openReenrollToken(key, 'u2', 'sid-1', token, now), null, 'other user');
  assert.equal(openReenrollToken(key, 'u1', 'sid-2', token, now), null, 'other session');
  assert.equal(openReenrollToken('another-secret-entirely-000000000000000000', 'u1', 'sid-1', token, now), null, 'other server secret');
  assert.equal(openReenrollToken(key, 'u1', 'sid-1', token, now + REENROLL_TOKEN_TTL_MS + 1), null, 'expired');
  const [exp, , mac] = token.split('.');
  assert.equal(openReenrollToken(key, 'u1', 'sid-1', `${exp}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.${mac}`, now), null, 'swapped secret');
  assert.equal(openReenrollToken(key, 'u1', 'sid-1', `${Number(exp) + 3_600_000}.${totp}.${mac}`, now), null, 'extended expiry');
  for (const bad of [undefined, null, 42, '', 'a.b.c', `${token}x`]) assert.equal(openReenrollToken(key, 'u1', 'sid-1', bad, now), null);
});

test('C: re-enrollment keeps only the current session', () => {
  const sessions = [{ id: 'a', expiresAt: 'x' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(keepOnlySession(sessions, 'b'), [{ id: 'b' }]);
  assert.deepEqual(keepOnlySession(sessions, 'zzz'), []);
  assert.deepEqual(keepOnlySession(undefined, 'b'), []);
});

test('C: only the OWNER may reset another staff member\'s authenticator', () => {
  for (const role of ['OWNER']) assert.equal(can(role, 'staff.mfa_reset'), true, role);
  for (const role of ['ADMIN', 'ENGINEER', 'STORE', 'EDITOR', 'SALES', 'CUSTOMER', '', undefined]) assert.equal(can(role as any, 'staff.mfa_reset'), false, String(role));
  const endpoints = src('../src/endpoints/index.ts');
  assert.match(endpoints, /path: '\/mfa\/reenroll'/);
  assert.match(endpoints, /path: '\/mfa\/reenroll\/verify'/);
  assert.match(endpoints, /RECOVERY_SESSION_REQUIRED/);
  assert.match(endpoints, /guard\(req, 'staff\.mfa_reset'\)/);
  assert.match(endpoints, /SELF_RESET_NOT_ALLOWED/);
  assert.match(endpoints, /'mfa\.reenrolled_after_recovery'/);
  assert.match(endpoints, /'user\.mfa_reset_by_owner'/);
});

// ---------------- D: media storage ----------------
const blobEnv = { VERCEL: '1', BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_AbC123def_SyntheticRandomPart0000' } as NodeJS.ProcessEnv;

test('D: Blob storage is on for Vercel with a valid token, and locally only on purpose', () => {
  assert.equal(blobStoreId(blobEnv), 'abc123def');
  assert.equal(blobStorageEnabled(blobEnv), true);
  assert.equal(blobStorageEnabled({ ...blobEnv, VERCEL: undefined }), false, 'a token copied to a laptop is not used by accident');
  assert.equal(blobStorageEnabled({ ...blobEnv, VERCEL: undefined, OTONOM_BLOB_STORAGE_LOCAL: '1' }), true);
  assert.equal(blobStorageEnabled({ VERCEL: '1', BLOB_READ_WRITE_TOKEN: 'not-a-token' }), false);
  assert.equal(blobStorageEnabled({ VERCEL: '1' }), false);
});

test('D: media uploads need Blob on Vercel; private files are never accepted on Vercel', () => {
  assert.equal(mediaUploadsEnabled({}), true, 'local development: disk');
  assert.equal(mediaUploadsEnabled({ OTONOM_DISABLE_UPLOADS: '1' }), false);
  assert.equal(mediaUploadsEnabled({ VERCEL: '1' }), false, 'no Blob store: refused, never ephemeral disk');
  assert.equal(mediaUploadsEnabled(blobEnv), true);
  assert.equal(mediaUploadsEnabled({ ...blobEnv, OTONOM_DISABLE_UPLOADS: '1' }), false);
  assert.equal(privateUploadsEnabled({}), true);
  assert.equal(privateUploadsEnabled(blobEnv), false);
  assert.equal(privateUploadsEnabled({ OTONOM_DISABLE_UPLOADS: '1' }), false);
});

test('D: only real PNG/JPEG/WebP files up to 4 MB pass; SVG and disguised files are refused', () => {
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48]);
  const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
  const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50]);
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');
  assert.equal(sniffImageType(png), 'image/png');
  assert.equal(sniffImageType(jpg), 'image/jpeg');
  assert.equal(sniffImageType(webp), 'image/webp');
  assert.equal(sniffImageType(svg), null);
  assert.equal(mediaUploadProblem({ data: png, size: png.length, mimetype: 'image/png' }), null);
  assert.equal(mediaUploadProblem({ data: svg, size: svg.length, mimetype: 'image/png' }), 'TYPE', 'SVG renamed to .png');
  assert.equal(mediaUploadProblem({ data: svg, size: svg.length, mimetype: 'image/svg+xml' }), 'TYPE');
  assert.equal(mediaUploadProblem({ data: jpg, size: jpg.length, mimetype: 'image/png' }), 'TYPE', 'declared type must match');
  assert.equal(mediaUploadProblem({ data: png, size: MEDIA_MAX_BYTES + 1, mimetype: 'image/png' }), 'TOO_LARGE');
  assert.equal(mediaUploadProblem({ data: png, size: MEDIA_MAX_BYTES, mimetype: 'image/png' }), null);
});

test('D: the CSP allows exactly this project\'s Blob store for images, nothing else', () => {
  const nonce = 'AbCdEf0123_-';
  const imgSrc = (env: NodeJS.ProcessEnv) => contentSecurityPolicy(nonce, env).match(/(?:^|;)\s*img-src\s+([^;]+)/)?.[1] ?? '';
  assert.equal(imgSrc({}), "'self' data: blob:");
  assert.equal(imgSrc(blobEnv), "'self' data: blob: https://abc123def.public.blob.vercel-storage.com");
  assert.equal(blobImageOrigin({ ...blobEnv, VERCEL: undefined }), null);
  assert.doesNotMatch(contentSecurityPolicy(nonce, blobEnv), /\*\.public\.blob|vercel-storage\.com(?!\/)\s*\*/);
  const other = contentSecurityPolicy(nonce, blobEnv).replace(/img-src[^;]+/, '');
  assert.doesNotMatch(other, /blob\.vercel-storage/, 'no other directive widened');
});

test('D: public pages only show APPROVED images from this Blob store (or the local file route) with both alt texts', () => {
  const ok = { status: 'APPROVED', url: 'https://abc123def.public.blob.vercel-storage.com/media/photo-x1y2.jpg', alt: { ar: 'وحدة تحكم', en: 'Controller' }, width: 800, height: 600 };
  assert.deepEqual(mediaImageFrom(ok), { url: ok.url, alt: ok.alt, width: 800, height: 600 });
  assert.equal(mediaImageFrom({ ...ok, status: 'DRAFT' }), null);
  assert.equal(mediaImageFrom({ ...ok, status: 'WITHDRAWN' }), null);
  assert.equal(mediaImageFrom({ ...ok, alt: { ar: 'وحدة', en: '' } }), null);
  assert.equal(mediaImageFrom({ ...ok, url: 'https://evil.example/x.jpg' }), null);
  assert.equal(mediaImageFrom({ ...ok, url: 'javascript:alert(1)' }), null);
  assert.equal(mediaImageFrom({ ...ok, url: 'https://abc.public.blob.vercel-storage.com/x" onerror="a' }), null);
  assert.equal(mediaImageFrom({ ...ok, url: '/api/media/file/photo.jpg' })?.url, '/api/media/file/photo.jpg');
  assert.equal(mediaImageFrom({ ...ok, url: 'http://127.0.0.1:3301/api/media/file/photo.jpg' })?.url, '/api/media/file/photo.jpg', 'local route kept same-origin');
  assert.equal(mediaImageFrom({ ...ok, url: 'https://evil.example/api/media/file/photo.jpg' })?.url, '/api/media/file/photo.jpg', 'a foreign origin is never used');
  assert.equal(mediaImageFrom({ ...ok, url: 'https://abc.public.blob.vercel-storage.com.evil.example/x.jpg' }), null);
  assert.equal(mediaImageFrom(42), null, 'an unpopulated id');
  assert.deepEqual(mediaImageFrom({ ...ok, width: undefined, height: 'x' }), { url: ok.url, alt: ok.alt, width: 1254, height: 1254 });
});

test('D: Blob storage is configured for media only, with access control off for public URLs and random names', () => {
  const config = src('../src/payload.config.ts');
  assert.match(config, /vercelBlobStorage\(\{/);
  assert.match(config, /collections: \{ media: \{ disablePayloadAccessControl: true \} \}/);
  assert.match(config, /addRandomSuffix: true/);
  assert.match(config, /alwaysInsertFields: true/);
  assert.doesNotMatch(config, /'private-files'\s*:/);
  const pkg = JSON.parse(src('../package.json'));
  assert.equal(pkg.dependencies['@payloadcms/storage-vercel-blob'], '3.90.2');
  assert.equal(pkg.dependencies['@payloadcms/email-resend'], '3.90.2');
});

// ---------------- E: password-reset e-mail ----------------
const mailEnv = { OTONOM_EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_synthetic_key_0000000000', OTONOM_EMAIL_FROM: 'OTONOM <no-reply@example.test>', OTONOM_EMAIL_FROM_VERIFIED: '1' } as NodeJS.ProcessEnv;

test('E: reset e-mail turns on only with Resend, a key, a sender and the operator\'s "verified" confirmation', () => {
  assert.equal(passwordResetEmailEnabled(mailEnv), true);
  assert.equal(passwordResetEmailEnabled({}), false);
  assert.equal(passwordResetEmailEnabled({ ...mailEnv, OTONOM_EMAIL_FROM_VERIFIED: '0' }), false);
  assert.equal(passwordResetEmailEnabled({ ...mailEnv, OTONOM_EMAIL_FROM_VERIFIED: undefined }), false);
  assert.equal(passwordResetEmailEnabled({ ...mailEnv, RESEND_API_KEY: 'short' }), false);
  assert.equal(passwordResetEmailEnabled({ ...mailEnv, OTONOM_EMAIL_FROM: 'not an address' }), false);
  assert.equal(passwordResetEmailEnabled({ ...mailEnv, OTONOM_EMAIL_PROVIDER: 'test' }), false);
  assert.deepEqual(parseFromAddress('OTONOM <No-Reply@Example.test>'), { name: 'OTONOM', address: 'no-reply@example.test' });
  assert.deepEqual(parseFromAddress('team@example.test'), { name: 'OTONOM', address: 'team@example.test' });
  assert.equal(parseFromAddress('a <b@c.test>, d@e.test'), null);
});

test('E: the reset e-mail escapes the link and keeps personal data out of the subject', () => {
  const mail = passwordResetEmail('https://admin.example.test/admin/reset/abc"><script>');
  assert.doesNotMatch(mail.html, /<script>/);
  assert.match(mail.html, /&quot;&gt;&lt;script&gt;/);
  assert.doesNotMatch(mail.subject, /@/);
});

test('E: without e-mail the reset request is refused with a clear code, and the link stays hidden', () => {
  const users = src('../src/collections/Users.ts');
  assert.match(users, /operation === 'forgotPassword'/);
  assert.match(users, /PASSWORD_RESET_EMAIL_NOT_CONFIGURED/);
  assert.match(users, /password-reset-account:/);
  const login = src('../src/app/(site)/staff/login/page.tsx');
  assert.match(login, /forgotPasswordEnabled=\{passwordResetEmailEnabled\(\)\}/);
  const staffLogin = src('../src/components/StaffLogin.tsx');
  assert.match(staffLogin, /\{forgotPasswordEnabled \? <a href="\/staff\/forgot"/);
  const proxy = src('../src/proxy.ts');
  assert.match(proxy, /'\/admin\/forgot'/);
  assert.match(proxy, /destination\.pathname = '\/staff\/forgot'/);
});
