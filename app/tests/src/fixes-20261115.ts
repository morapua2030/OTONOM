// 2026-11-15 fixes (owner-approved) — HTTP suite against the local production build on a disposable clone (harness
// flags). Covers: the operator reset script (A, run against the CLONE with synthetic gate values), authenticator
// re-enrollment after a lost phone and the OWNER's MFA reset (C), the forgot-password behaviour without e-mail (E)
// and admin-uploaded images on the public product page (D, local disk). Booking limits (B) live in final-release.ts.
// Synthetic data only; no password, secret or code is ever printed or stored in the report.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
import { generate } from 'otplib';
import pg from 'pg';
import { APP_ROOT, connConfig, SECRETS_DIR } from '@otonom/domain';
import { Client, Recorder, sleep } from './http-client.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const CLONE = process.env.OTONOM_DB ?? '';
const rec = new Recorder();
const su = new pg.Pool({ ...connConfig('superuser'), max: 2 });
type U = { id: number; email: string; role: string; password: string; totp: string };
const users: U[] = JSON.parse(readFileSync(path.join(SECRETS_DIR, 'dev_users.json'), 'utf8'));
const byRole = (r: string) => users.find((u) => u.role === r)!;
const lastStep = new Map<string, number>();
const START_STEP = Math.floor(Date.now() / 30000);
const pw = () => `Syn-${randomBytes(12).toString('base64url')}-Pw1!`;

/** A TOTP code for `secret`, never reusing a time step for the same user (the server refuses replays). */
async function code(user: string, secret: string) {
  for (;;) {
    const s = Math.floor(Date.now() / 30000);
    if (s > (lastStep.get(user) ?? START_STEP)) {
      lastStep.set(user, s);
      return generate({ secret });
    }
    await sleep(1000);
  }
}
async function login(u: U) {
  const c = new Client(BASE, u.role, true);
  const r = await c.post('/api/users/login', { email: u.email, password: u.password });
  if (r.status !== 200) throw new Error(`login ${u.role} ${r.status}`);
  const v = await c.post('/api/mfa/verify', { code: await code(u.email, u.totp) });
  if (v.status !== 200) throw new Error(`mfa ${u.role} ${v.status}`);
  return c;
}
const audit = async (action: string, since: Date, entity?: string) =>
  Number((await su.query(`SELECT count(*) FROM domain.audit_events WHERE action=$1 AND at >= $2 ${entity ? 'AND entity_id=$3' : ''}`, entity ? [action, since, entity] : [action, since])).rows[0].count);

/** Invites a staff member as the OWNER, accepts with a fresh password and enrolls an authenticator. */
async function newStaff(owner: Client, role: string) {
  const email = `${role.toLowerCase()}-${randomBytes(4).toString('hex')}@otonom.local`;
  const invite = await owner.post('/api/staff/invite', { email, role, delivery: 'shown_once' });
  const token = String(invite.json?.link ?? '').split('#')[1] ?? '';
  const password = pw();
  const accept = await new Client(BASE, 'anon', true).post('/api/staff/invite/accept', { token, password });
  const c = new Client(BASE, role, true);
  const l = await c.post('/api/users/login', { email, password });
  const e = await c.post('/api/mfa/enroll', {});
  const secret = String(e.json?.secret ?? '');
  const v = await c.post('/api/mfa/enroll/verify', { code: await code(email, secret) });
  const id = String((await su.query(`SELECT id FROM cms.users WHERE email=$1`, [email])).rows[0]?.id ?? '');
  if (invite.status !== 201 || accept.status !== 200 || l.status !== 200 || v.status !== 200) throw new Error(`staff setup ${role}: ${invite.status}/${accept.status}/${l.status}/${e.status}/${v.status}`);
  return { email, password, secret, id, recovery: v.json.recoveryCodes as string[], client: c };
}
const signIn = async (email: string, password: string) => {
  const c = new Client(BASE, 'staff', true);
  const r = await c.post('/api/users/login', { email, password });
  return { c, status: r.status };
};

/** Runs the operator reset script against the CLONE (synthetic gate values; the password goes in on stdin). */
function resetScript(args: string[], stdin: string, gate = true) {
  const env: NodeJS.ProcessEnv = { ...process.env, OTONOM_DB: CLONE };
  for (const k of ['OTONOM_RESET_PRODUCTION_STAFF', 'OTONOM_FORCE_PRODUCTION', 'OTONOM_EXPECTED_NEON_PROJECT_ID', 'NEON_PROJECT_ID', 'OTONOM_FORCE_PREVIEW']) delete env[k];
  if (gate) Object.assign(env, { OTONOM_RESET_PRODUCTION_STAFF: 'ISOLATED_PRODUCTION_STAFF_RESET_ONLY', OTONOM_FORCE_PRODUCTION: '1', OTONOM_EXPECTED_NEON_PROJECT_ID: 'local-clone-only', NEON_PROJECT_ID: 'local-clone-only' });
  const r = spawnSync('npx', ['--no-install', 'tsx', 'scripts/reset-production-staff.ts', ...args], { cwd: path.join(APP_ROOT, 'web'), env, input: stdin, encoding: 'utf8', shell: true, timeout: 180_000 });
  const lines = `${r.stdout}\n${r.stderr}`.split(/\r?\n/).filter((l) => l.startsWith('{'));
  let out: any = null;
  for (const l of lines) try { out = JSON.parse(l); } catch { /* ignore */ }
  return { exit: r.status, out, leaked: stdin.split('\n').filter(Boolean).some((p) => `${r.stdout}${r.stderr}`.includes(p)) };
}

/** A real PNG (solid colour, 64×48) built with zlib; no image library needed. */
function png(width = 64, height = 48): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const t = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x3c)]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const upload = (c: Client, name: string, bytes: Buffer, type: string) => {
  const f = new FormData();
  f.append('file', new Blob([new Uint8Array(bytes)], { type }), name);
  return c.req('POST', '/api/media', { body: f });
};

async function main() {
  if (!/^otonom_(test|e2e)_/.test(CLONE)) throw new Error('OTONOM_DB must name a disposable test clone');
  const t0 = new Date();
  const anon = new Client(BASE, 'anon', true);
  const owner = await login(byRole('OWNER'));
  const editor = await login(byRole('EDITOR'));

  // ---------------- A: operator reset script ----------------
  const target = await newStaff(owner, 'ADMIN');
  const newPassword = pw();
  const closed = resetScript(['--email', target.email, '--confirm-email', target.email], `${newPassword}\n${newPassword}\n`, false);
  const stillOld = await signIn(target.email, target.password);
  rec.add('A-RESET-GATE', 'OPERATOR', 'without the explicit Production confirmations the script refuses and changes nothing', closed.exit === 1 && closed.out?.code === 'RESET_GATE_CLOSED' && stillOld.status === 200, { exit: closed.exit, code: closed.out?.code, login: stillOld.status });
  const editorUser = byRole('EDITOR');
  const wrongRole = resetScript(['--email', editorUser.email, '--confirm-email', editorUser.email], `${newPassword}\n${newPassword}\n`);
  const editorStill = await signIn(editorUser.email, editorUser.password);
  const unknown = resetScript(['--email', 'nobody-here@otonom.local', '--confirm-email', 'nobody-here@otonom.local'], `${newPassword}\n${newPassword}\n`);
  const mismatch = resetScript(['--email', target.email, '--confirm-email', target.email], `${newPassword}\n${newPassword}x\n`);
  const weak = resetScript(['--email', target.email, '--confirm-email', target.email], 'short\nshort\n');
  const argPw = resetScript(['--email', target.email, '--confirm-email', target.email, '--password', newPassword], '');
  rec.add('A-RESET-TARGETS', 'OPERATOR', 'only an existing OWNER/ADMIN; matching passwords on stdin; the password policy applies; no password argument',
    wrongRole.out?.code === 'ROLE_NOT_RESETTABLE' && editorStill.status === 200 && unknown.out?.code === 'USER_NOT_FOUND' && mismatch.out?.code === 'PASSWORD_CONFIRMATION_MISMATCH' && /^PASSWORD_/.test(weak.out?.code ?? '') && argPw.out?.code === 'UNKNOWN_ARGUMENT',
    { role: wrongRole.out?.code, unknown: unknown.out?.code, mismatch: mismatch.out?.code, weak: weak.out?.code, arg: argPw.out?.code });
  const sessionsBefore = Number((await su.query(`SELECT count(*) FROM cms.users_sessions WHERE _parent_id=$1`, [target.id])).rows[0].count);
  const reset = resetScript(['--email', target.email, '--confirm-email', target.email, '--reset-mfa'], `${newPassword}\n${newPassword}\n`);
  const oldSession = await target.client.get('/api/mfa/status');
  const oldPw = await signIn(target.email, target.password);
  const fresh = await signIn(target.email, newPassword);
  const freshStatus = await fresh.c.get('/api/mfa/status');
  const oldTotp = await fresh.c.post('/api/mfa/verify', { code: await code(target.email, target.secret) });
  const oldRecovery = await fresh.c.post('/api/mfa/recovery', { code: target.recovery[0] });
  const reEnroll = await fresh.c.post('/api/mfa/enroll', {});
  const sessionsAfterReset = Number((await su.query(`SELECT count(*) FROM cms.users_sessions WHERE _parent_id=$1`, [target.id])).rows[0].count);
  rec.add('A-RESET-WORKS', 'OPERATOR', 'the reset sets the new password, ends every session, removes the authenticator and recovery codes, and the next sign-in must enroll',
    reset.exit === 0 && reset.out?.ok === true && reset.out?.sessionsRevoked === true && reset.out?.mfaReset === true && sessionsBefore >= 1 &&
    oldSession.status === 401 && oldPw.status === 401 && fresh.status === 200 && freshStatus.json?.enrolled === false && freshStatus.json?.authorized === false &&
    oldTotp.status === 401 && oldRecovery.status === 401 && reEnroll.status === 200 && sessionsAfterReset === 1,
    { exit: reset.exit, sessionsBefore, oldSession: oldSession.status, oldPw: oldPw.status, fresh: fresh.status, enrolled: freshStatus.json?.enrolled, oldTotp: oldTotp.status, oldRecovery: oldRecovery.status, reEnroll: reEnroll.status, sessionsAfterReset });
  rec.add('A-RESET-AUDITED', 'OPERATOR', 'the reset is audited (password + MFA) and the script output never contains the password',
    (await audit('user.password_reset_by_operator', t0, target.id)) === 1 && (await audit('user.mfa_reset_by_operator', t0, target.id)) === 1 && !reset.leaked && !mismatch.leaked && !closed.leaked, null);

  // ---------------- C: lost phone → recovery code → new authenticator ----------------
  const lost = await newStaff(owner, 'SALES');
  const other = await signIn(lost.email, lost.password);
  const otherMfa = await other.c.post('/api/mfa/verify', { code: await code(lost.email, lost.secret) });
  const totpOnlyReenroll = await other.c.post('/api/mfa/reenroll', {});
  const rec1 = await signIn(lost.email, lost.password);
  const recovery = await rec1.c.post('/api/mfa/recovery', { code: lost.recovery[0] });
  const crossOrigin = await new Client(BASE, 'evil').req('POST', '/api/mfa/reenroll', { json: {}, headers: { origin: 'https://evil.example', cookie: [...rec1.c.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ') } });
  const start = await rec1.c.post('/api/mfa/reenroll', {});
  const newSecret = String(start.json?.secret ?? '');
  const enrollToken = String(start.json?.enrollToken ?? '');
  const wrongCode = await rec1.c.post('/api/mfa/reenroll/verify', { code: '000000', enrollToken });
  const forged = await rec1.c.post('/api/mfa/reenroll/verify', { code: '123456', enrollToken: enrollToken.replace(/\.[^.]+$/, `.${'A'.repeat(43)}`) });
  const stillOldBeforeVerify = await new Client(BASE, 'probe', true).post('/api/users/login', { email: lost.email, password: lost.password });
  rec.add('C-REENROLL-GATED', 'MFA', 'only a session opened with password + recovery code may re-enroll; cross-origin, wrong codes and forged setup tokens are refused',
    otherMfa.status === 200 && totpOnlyReenroll.status === 403 && totpOnlyReenroll.json?.code === 'RECOVERY_SESSION_REQUIRED' && recovery.status === 200 && recovery.json?.reenrollAvailable === true &&
    crossOrigin.status === 403 && start.status === 200 && /^[A-Z2-7]{16,}$/.test(newSecret) && wrongCode.status === 401 && forged.status === 409 && stillOldBeforeVerify.status === 200,
    { otherMfa: otherMfa.status, totpOnly: totpOnlyReenroll.json?.code, recovery: recovery.status, available: recovery.json?.reenrollAvailable, cross: crossOrigin.status, start: start.status, wrong: wrongCode.status, forged: forged.status });
  const done = await rec1.c.post('/api/mfa/reenroll/verify', { code: await code(lost.email, newSecret), enrollToken });
  const newCodes: string[] = Array.isArray(done.json?.recoveryCodes) ? done.json.recoveryCodes : [];
  const otherAfter = await other.c.get('/api/mfa/status');
  const recAfter = await rec1.c.get('/api/mfa/status');
  const again = await rec1.c.post('/api/mfa/reenroll', {});
  rec.add('C-REENROLL-REPLACES', 'MFA', 'the new authenticator replaces the old one with 8 new recovery codes; other sessions end; this session stays signed in; the recovery permission is used up',
    done.status === 200 && newCodes.length === 8 && !newCodes.some((c) => lost.recovery.includes(c)) && otherAfter.status === 401 && recAfter.status === 200 && recAfter.json?.authorized === true && again.status === 403,
    { done: done.status, codes: newCodes.length, other: otherAfter.status, current: recAfter.status, again: again.status });
  const next = await signIn(lost.email, lost.password);
  const oldFactor = await next.c.post('/api/mfa/verify', { code: await code(lost.email, lost.secret) });
  const oldCode = await next.c.post('/api/mfa/recovery', { code: lost.recovery[1] });
  const newFactor = await next.c.post('/api/mfa/verify', { code: await code(lost.email, newSecret) });
  const next2 = await signIn(lost.email, lost.password);
  const newRecovery = await next2.c.post('/api/mfa/recovery', { code: newCodes[0] });
  rec.add('C-OLD-TOTP-DEAD', 'MFA', 'lost-phone flow end to end: the old authenticator and the old recovery codes stop working; the new ones work',
    oldFactor.status === 401 && oldCode.status === 401 && newFactor.status === 200 && newRecovery.status === 200, { oldTotp: oldFactor.status, oldRecovery: oldCode.status, newTotp: newFactor.status, newRecovery: newRecovery.status });
  rec.add('C-REENROLL-AUDITED', 'MFA', 'recovery use, re-enrollment start and completion are audited',
    (await audit('mfa.recovery_code_used', t0, lost.id)) >= 1 && (await audit('mfa.reenrollment_started', t0, lost.id)) >= 1 && (await audit('mfa.reenrolled_after_recovery', t0, lost.id)) === 1, null);

  // ---------------- C: the OWNER resets another staff member's authenticator ----------------
  const victim = await newStaff(owner, 'EDITOR');
  const adminUser = byRole('ADMIN');
  const admin = await login(adminUser);
  const byAdmin = await admin.post(`/api/staff/users/${victim.id}/mfa-reset`, { confirmEmail: victim.email });
  const byEditor = await editor.post(`/api/staff/users/${victim.id}/mfa-reset`, { confirmEmail: victim.email });
  const byAnon = await anon.post(`/api/staff/users/${victim.id}/mfa-reset`, { confirmEmail: victim.email });
  const self = await owner.post(`/api/staff/users/${byRole('OWNER').id}/mfa-reset`, { confirmEmail: byRole('OWNER').email });
  const wrongConfirm = await owner.post(`/api/staff/users/${victim.id}/mfa-reset`, { confirmEmail: 'someone-else@otonom.local' });
  const viaGet = await owner.get(`/api/staff/users/${victim.id}/mfa-reset`);
  rec.add('C-OWNER-RESET-RBAC', 'RBAC', 'only the OWNER resets another person\'s authenticator (ADMIN/EDITOR 403, anonymous 401); not their own; the full e-mail must be typed',
    byAdmin.status === 403 && byEditor.status === 403 && byAnon.status === 401 && self.status === 422 && wrongConfirm.status === 422 && viaGet.status === 404,
    { admin: byAdmin.status, editor: byEditor.status, anon: byAnon.status, self: self.status, wrong: wrongConfirm.status, get: viaGet.status });
  const ownerReset = await owner.post(`/api/staff/users/${victim.id}/mfa-reset`, { confirmEmail: victim.email.toUpperCase() });
  const victimOld = await victim.client.get('/api/mfa/status');
  const victimNew = await signIn(victim.email, victim.password);
  const victimStatus = await victimNew.c.get('/api/mfa/status');
  const victimOldTotp = await victimNew.c.post('/api/mfa/verify', { code: await code(victim.email, victim.secret) });
  const victimEnroll = await victimNew.c.post('/api/mfa/enroll', {});
  rec.add('C-OWNER-RESET-WORKS', 'MFA', 'after the OWNER\'s reset the person\'s sessions end, the old authenticator fails and the next sign-in must enroll a new one; audited',
    ownerReset.status === 200 && ownerReset.json?.enrollmentRequiredNext === true && victimOld.status === 401 && victimNew.status === 200 && victimStatus.json?.enrolled === false && victimOldTotp.status === 401 && victimEnroll.status === 200 && (await audit('user.mfa_reset_by_owner', t0, victim.id)) === 1,
    { reset: ownerReset.status, oldSession: victimOld.status, enrolled: victimStatus.json?.enrolled, oldTotp: victimOldTotp.status, enroll: victimEnroll.status });
  const securityOwner = await owner.get('/admin/account-security');
  const securityAdmin = await admin.get('/admin/account-security');
  rec.add('C-OWNER-RESET-UI', 'MFA', 'the Account security page shows the reset form to the OWNER only', securityOwner.status === 200 && securityOwner.text.includes('reset-staff-mfa') && securityAdmin.status === 200 && !securityAdmin.text.includes('reset-staff-mfa'), { owner: securityOwner.status, admin: securityAdmin.status });

  // ---------------- E: forgot password without e-mail ----------------
  const forgot = await anon.post('/api/users/forgot-password', { email: byRole('OWNER').email });
  const forgotUnknown = await anon.post('/api/users/forgot-password', { email: 'nobody-here@otonom.local' });
  const adminForgot = await anon.get('/admin/forgot');
  const staffForgot = await anon.get('/staff/forgot');
  const staffLogin = await anon.get('/staff/login');
  const noMail = (await su.query(`SELECT count(*) FROM cms.users WHERE reset_password_token IS NOT NULL`)).rows[0].count;
  rec.add('E-FORGOT-HONEST', 'AUTH', 'without e-mail: the reset request answers 503 "contact the operator" (same for unknown accounts), /admin/forgot leads to the explanation, no reset token is created and the sign-in page shows no forgot link',
    forgot.status === 503 && forgotUnknown.status === 503 && forgot.text.includes('Contact the operator') && adminForgot.status === 307 && (adminForgot.headers.get('location') ?? '').endsWith('/staff/forgot') &&
    staffForgot.status === 200 && staffForgot.text.includes('staff-forgot-unavailable') && staffForgot.text.includes('Contact the operator') && staffLogin.status === 200 && !staffLogin.text.includes('staff-forgot-link') && Number(noMail) === 0,
    { forgot: forgot.status, unknown: forgotUnknown.status, adminForgot: adminForgot.status, location: adminForgot.headers.get('location'), staffForgot: staffForgot.status, tokens: noMail });

  // ---------------- D: admin-uploaded image on the public product page (local disk) ----------------
  const svg = await upload(owner, 'x.svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'), 'image/svg+xml');
  const disguised = await upload(owner, 'x.png', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'), 'image/png');
  const big = await upload(owner, 'big.png', Buffer.concat([png(), Buffer.alloc(4 * 1024 * 1024)]), 'image/png');
  rec.add('D-UPLOAD-LIMITS', 'MEDIA', 'SVG (also renamed to .png) is refused and images over 4 MB are refused', svg.status >= 400 && disguised.status === 415 && big.status === 413, { svg: svg.status, disguised: disguised.status, big: big.status });
  const up = await upload(owner, `ctrl-${randomBytes(3).toString('hex')}.png`, png(), 'image/png');
  const mid = up.json?.doc?.id;
  await owner.patch(`/api/media/${mid}?locale=ar`, { alt: 'صورة اختبار لوحدة التحكم' });
  await owner.patch(`/api/media/${mid}?locale=en`, { alt: 'Synthetic controller test photo' });
  const ctrl = (await owner.get('/api/catalog-controllers?where[model][equals]=16r&draft=true&depth=0')).json?.docs?.[0];
  const draftPhoto = await owner.req('PATCH', `/api/catalog-controllers/${ctrl?.id}`, { json: { photo: mid, _status: 'published' } });
  const whileDraft = await anon.get('/ar/products/16r');
  rec.add('D-DRAFT-IMAGE-HIDDEN', 'MEDIA', 'an image that is not approved never shows on the public page, even when attached and published', up.status === 201 && draftPhoto.status === 200 && whileDraft.status === 200 && !whileDraft.text.includes('product-admin-photo'), { up: up.status, attach: draftPhoto.status });
  const approve = await owner.patch(`/api/media/${mid}`, { status: 'APPROVED' });
  const tApprove = Date.now();
  let ar = await anon.get('/ar/products/16r');
  for (let i = 0; i < 20 && !ar.text.includes('product-admin-photo'); i++) { await sleep(250); ar = await anon.get('/ar/products/16r'); }
  const delayMs = Date.now() - tApprove;
  const en = await anon.get('/en/products/16r');
  const imgUrl = (ar.text.match(/<img[^>]*data-testid="product-admin-photo"[^>]*>/)?.[0] ?? '').match(/src="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&') ?? '';
  const file = imgUrl ? await anon.get(imgUrl) : null;
  rec.add('D-IMAGE-ON-PUBLIC-PAGE', 'MEDIA', 'once approved, the uploaded image replaces the product photo on /ar and /en/products/16r with the right alt text, served as an image',
    approve.status === 200 && ar.text.includes('product-admin-photo') && ar.text.includes('صورة اختبار لوحدة التحكم') && en.text.includes('product-admin-photo') && en.text.includes('Synthetic controller test photo') && file?.status === 200 && (file?.headers.get('content-type') ?? '').startsWith('image/png'),
    { approve: approve.status, delayMs, url: imgUrl.replace(/[^/]+$/, '…'), file: file?.status, type: file?.headers.get('content-type') });
  const withdraw = await owner.patch(`/api/media/${mid}`, { status: 'WITHDRAWN' });
  let gone = await anon.get('/ar/products/16r');
  for (let i = 0; i < 20 && gone.text.includes('product-admin-photo'); i++) { await sleep(250); gone = await anon.get('/ar/products/16r'); }
  const goneFile = imgUrl ? await anon.get(imgUrl) : null;
  rec.add('D-WITHDRAW-HIDES', 'MEDIA', 'withdrawing the image puts the built-in product photo back at once and hides the file', withdraw.status === 200 && !gone.text.includes('product-admin-photo') && [403, 404].includes(goneFile?.status ?? 0), { withdraw: withdraw.status, file: goneFile?.status });
  await owner.req('PATCH', `/api/catalog-controllers/${ctrl?.id}`, { json: { photo: null, _status: 'published' } });

  await su.end();
  const out = path.join(APP_ROOT, 'tests', 'results');
  mkdirSync(out, { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), summary: rec.summary(), total: rec.checks.length, failed: rec.checks.filter((c) => !c.pass).length, checks: rec.checks };
  writeFileSync(path.join(out, 'fixes-20261115-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary), `total=${report.total} failed=${report.failed}`);
  process.exit(report.failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
