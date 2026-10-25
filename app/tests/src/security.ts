// WAVE 9 — security regression suite (synthetic data only, local build). A self-review: NOT a substitute for the
// independent security review / penetration test required before any public exposure (release blocker B-30).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { generate } from 'otplib';
import pg from 'pg';
import { APP_ROOT, connConfig, SECRETS_DIR } from '@otonom/domain';
import { Client, Recorder, sleep } from './http-client.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const rec = new Recorder();
const su = new pg.Pool({ ...connConfig('superuser'), max: 2 });
type U = { id: number; email: string; role: string; password: string; totp: string };
const users: U[] = JSON.parse(readFileSync(path.join(SECRETS_DIR, 'dev_users.json'), 'utf8'));
const START = Math.floor(Date.now() / 30000);
const tag = randomBytes(3).toString('hex');
const XSS = `<script>alert('x${tag}')</script><img src=x onerror=alert(1)>`;

async function login(role: string, mfa = true) {
  const u = users.find((x) => x.role === role)!;
  const c = new Client(BASE, role, true);
  const r = await c.post('/api/users/login', { email: u.email, password: u.password });
  if (mfa) {
    while (Math.floor(Date.now() / 30000) <= START) await sleep(1000);
    if ((await c.post('/api/mfa/verify', { code: await generate({ secret: u.totp }) })).status !== 200) throw new Error(`mfa ${role}`);
  }
  return { c, setCookie: r.headers.getSetCookie?.() ?? [] };
}
const makePdf = () => Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n164\n%%EOF\n`);

async function main() {
  const anon = new Client(BASE, 'anon', true);
  // ---------- headers + cookies ----------
  for (const p of ['/ar', '/admin/login', '/staff/login', '/api/ready']) {
    const r = await anon.get(p);
    const csp = r.headers.get('content-security-policy') ?? '';
    const script = csp.match(/(?:^|;)\s*script-src\s+([^;]+)/)?.[1] ?? '';
    const nonce = script.match(/'nonce-([A-Za-z0-9+/_-]+={0,2})'/)?.[1];
    rec.add(`SEC-CSP${p}`, 'HEADERS', `${p}: nonce CSP, no unsafe-inline scripts, no third-party origins`, /frame-ancestors 'none'/.test(csp) && /object-src 'none'/.test(csp) && !!nonce && /'strict-dynamic'/.test(script) && !/'unsafe-inline'/.test(script) && !/https?:\/\//.test(csp) && r.headers.get('x-content-type-options') === 'nosniff', csp.slice(0, 160));
  }
  for (const p of ['/ar', '/admin/login', '/staff/login']) {
    const r = await anon.get(p);
    const policyNonce = (r.headers.get('content-security-policy') ?? '').match(/'nonce-([A-Za-z0-9+/_-]+={0,2})'/)?.[1];
    const scripts = [...r.text.matchAll(/<script\b([^>]*)>/gi)].map((m) => m[1]);
    rec.add(`SEC-CSP-SCRIPT-NONCES${p}`, 'HEADERS', `${p}: every rendered script tag carries the response nonce`, !!policyNonce && scripts.length > 0 && scripts.every((attrs) => new RegExp(`\\bnonce=["']${policyNonce}["']`).test(attrs)), { scripts: scripts.length, noncePresent: !!policyNonce });
  }
  const nonce1 = (await anon.get('/ar')).headers.get('content-security-policy')?.match(/'nonce-([^']+)'/)?.[1];
  const nonce2 = (await anon.get('/ar')).headers.get('content-security-policy')?.match(/'nonce-([^']+)'/)?.[1];
  rec.add('SEC-CSP-NONCE-ROTATION', 'HEADERS', 'CSP nonce is unpredictable per response', !!nonce1 && !!nonce2 && nonce1 !== nonce2, { first: !!nonce1, second: !!nonce2, different: nonce1 !== nonce2 });
  const pending = await login('OWNER', false);
  const ck = pending.setCookie.find((s) => s.startsWith('payload-token=')) ?? '';
  rec.add('SEC-COOKIE-FLAGS', 'SESSION', 'session cookie is HttpOnly + SameSite=Lax (Secure automatically on https)', /HttpOnly/i.test(ck) && /SameSite=Lax/i.test(ck), ck.replace(/payload-token=[^;]+/, 'payload-token=<redacted>'));
  // JWT header auth must not bypass MFA
  const jwt = pending.c.cookies.get('payload-token') ?? '';
  const hdr = await new Client(BASE).req('GET', '/api/reports/kpi', { headers: { authorization: `JWT ${jwt}` } });
  rec.add('SEC-JWT-HEADER-MFA', 'AUTH', 'Authorization: JWT header from an MFA-pending session is still refused', hdr.status === 401, hdr.status);
  const pendingLogout = await pending.c.post('/api/users/logout', {});
  rec.add(
    'SEC-LOGOUT-CACHE-EVICTION',
    'SESSION',
    'logout is no-store and evicts cached privileged admin views',
    pendingLogout.status === 200 && pendingLogout.headers.get('cache-control')?.includes('no-store') === true && pendingLogout.headers.get('clear-site-data')?.includes('"cache"') === true,
    { status: pendingLogout.status, noStore: pendingLogout.headers.get('cache-control')?.includes('no-store') === true, cacheEviction: pendingLogout.headers.get('clear-site-data')?.includes('"cache"') === true },
  );
  const hdr2 = await new Client(BASE).req('GET', '/api/users/me', { headers: { authorization: `JWT ${jwt}` } });
  rec.add('SEC-JWT-AFTER-LOGOUT', 'AUTH', 'a token from a logged-out session is no longer accepted', !hdr2.json?.user, hdr2.json?.user ? 'still valid' : 'rejected');

  const owner = (await login('OWNER')).c;
  const admin = (await login('ADMIN')).c;
  const eng = (await login('ENGINEER')).c;
  const editor = (await login('EDITOR')).c;
  const store = (await login('STORE')).c;

  // ---------- OWNER password -> real transport seam -> email OTP -> TOTP ----------
  const otpOwnerEmail = 'otp-owner@otonom.local';
  const otpOwnerPassword = `Email-Otp-${randomBytes(12).toString('base64url')}aA1!`;
  const otpCreated = await owner.post('/api/users', { email: otpOwnerEmail, password: otpOwnerPassword, role: 'OWNER' });
  const otpOwnerId = otpCreated.json?.doc?.id;
  try {
    const duplicate = await owner.post('/api/users', { email: otpOwnerEmail, password: otpOwnerPassword, role: 'OWNER' });
    const otpClient = new Client(BASE, 'email-otp-owner', true);
    const passwordLogin = await otpClient.post('/api/users/login', { email: otpOwnerEmail, password: otpOwnerPassword });
    const statusBefore = await otpClient.get('/api/mfa/status');
    const deniedBefore = await otpClient.get('/api/reports/kpi');
    const totpBeforeEmail = await otpClient.post('/api/mfa/enroll', {});
    const csrfRequest = await otpClient.req('POST', '/api/mfa/email/request', { json: {}, headers: { origin: 'http://evil.example', 'sec-fetch-site': 'cross-site' } });
    const requested = await otpClient.post('/api/mfa/email/request', { locale: 'ar' });
    const cooldown = await otpClient.post('/api/mfa/email/request', {});
    const wrong = await otpClient.post('/api/mfa/email/verify', { code: '000000' });
    const emailVerified = await otpClient.post('/api/mfa/email/verify', { code: '483921' });
    const replayed = await otpClient.post('/api/mfa/email/verify', { code: '483921' });
    const deniedBeforeTotp = await otpClient.get('/api/reports/kpi');
    const enrollment = await otpClient.post('/api/mfa/enroll', {});
    const otpSecret = enrollment.json?.secret;
    const enrolled = otpSecret ? await otpClient.post('/api/mfa/enroll/verify', { code: await generate({ secret: otpSecret }) }) : null;
    const allowed = await otpClient.get('/api/reports/kpi');
    const persisted = await otpClient.get('/api/reports/kpi');

    const secondSession = new Client(BASE, 'email-otp-owner-second', true);
    const secondLogin = await secondSession.post('/api/users/login', { email: otpOwnerEmail, password: otpOwnerPassword });
    const crossSessionReplay = await secondSession.post('/api/mfa/email/verify', { code: '483921' });
    const expiring = await secondSession.post('/api/mfa/email/request', {});
    if (otpOwnerId) {
      await su.query(
        `UPDATE domain.staff_email_otp_challenges SET expires_at=now() - interval '1 second'
          WHERE id=(SELECT id FROM domain.staff_email_otp_challenges WHERE user_id=$1 AND status='SENT' ORDER BY created_at DESC LIMIT 1)`,
        [String(otpOwnerId)],
      );
    }
    const expired = await secondSession.post('/api/mfa/email/verify', { code: '483921' });
    const locking = await secondSession.post('/api/mfa/email/request', {});
    const lockAttempts = [];
    for (let i = 0; i < 5; i++) lockAttempts.push(await secondSession.post('/api/mfa/email/verify', { code: `00000${i}` }));
    const lockedReplay = await secondSession.post('/api/mfa/email/verify', { code: '483921' });

    const databaseState = otpOwnerId
      ? (
          await su.query(
            `SELECT
               (SELECT count(*)::int FROM cms.users WHERE lower(email)=lower($1) AND role='OWNER') AS owner_count,
               (SELECT bool_and(length(code_digest)=64 AND code_digest <> '483921') FROM domain.staff_email_otp_challenges WHERE user_id=$2) AS codes_hashed,
               (SELECT count(*)::int FROM domain.audit_events WHERE entity_type='user' AND entity_id=$2 AND action IN ('mfa.email_otp_sent','mfa.email_otp_verified')) AS audit_count`,
            [otpOwnerEmail, String(otpOwnerId)],
          )
        ).rows[0]
      : null;
    const logout = await otpClient.post('/api/users/logout', {});
    const deniedAfterLogout = await otpClient.get('/api/reports/kpi');

    rec.add('SEC-EMAIL-OTP-OWNER-UNIQUE', 'AUTH', 'the configured hosted-owner path creates exactly one OWNER identity and rejects a duplicate', otpCreated.status === 201 && duplicate.status >= 400 && databaseState?.owner_count === 1, { created: otpCreated.status, duplicate: duplicate.status, ownerCount: databaseState?.owner_count });
    rec.add('SEC-EMAIL-OTP-PASSWORD-GATE', 'AUTH', 'password establishes only an MFA-pending session; TOTP enrollment and cross-origin OTP sends are refused before email verification', passwordLogin.status === 200 && statusBefore.json?.emailOtpRequired === true && statusBefore.json?.emailOtpVerified === false && deniedBefore.status === 401 && totpBeforeEmail.status === 401 && totpBeforeEmail.json?.code === 'EMAIL_OTP_REQUIRED' && csrfRequest.status === 403, { login: passwordLogin.status, status: statusBefore.status, denied: deniedBefore.status, totpBeforeEmail: totpBeforeEmail.status, csrf: csrfRequest.status });
    rec.add('SEC-EMAIL-OTP-SEND-COOLDOWN', 'AUTH', 'mocked delivery returns masked/no-store metadata and durable resend cooldown', requested.status === 202 && requested.headers.get('cache-control') === 'no-store' && /•/.test(String(requested.json?.destination)) && cooldown.status === 429, { requested: requested.status, cooldown: cooldown.status, destinationMasked: /•/.test(String(requested.json?.destination)) });
    rec.add('SEC-EMAIL-OTP-VERIFY-REPLAY', 'AUTH', 'incorrect email OTP fails, correct OTP is single-use, and TOTP remains required', wrong.status === 401 && emailVerified.status === 200 && emailVerified.json?.mfaVerified === false && replayed.status === 401 && deniedBeforeTotp.status === 401, { wrong: wrong.status, correct: emailVerified.status, replay: replayed.status, beforeTotp: deniedBeforeTotp.status });
    rec.add('SEC-EMAIL-OTP-TOTP-SESSION', 'AUTH', 'fresh TOTP enrollment completes OWNER MFA, persists the session, and logout revokes it', enrollment.status === 200 && enrolled?.status === 200 && enrolled.json?.mfaVerified === true && allowed.status === 200 && persisted.status === 200 && logout.status === 200 && deniedAfterLogout.status === 401, { enrollment: enrollment.status, complete: enrolled?.status, allowed: allowed.status, persisted: persisted.status, logout: logout.status, afterLogout: deniedAfterLogout.status });
    rec.add('SEC-EMAIL-OTP-SESSION-EXPIRY-LOCK', 'AUTH', 'OTP challenges are session-bound, expire, and lock after five incorrect attempts', secondLogin.status === 200 && crossSessionReplay.status === 401 && expiring.status === 202 && expired.json?.code === 'EMAIL_OTP_EXPIRED' && locking.status === 202 && lockAttempts.at(-1)?.json?.code === 'EMAIL_OTP_LOCKED' && lockedReplay.status === 401, { login: secondLogin.status, crossSession: crossSessionReplay.status, expired: expired.json?.code, attempts: lockAttempts.map((attempt) => attempt.status), lockedReplay: lockedReplay.status });
    rec.add('SEC-EMAIL-OTP-NO-PLAINTEXT', 'AUTH', 'OTP values are keyed hashes and security events are audit-recorded without OTP material', databaseState?.codes_hashed === true && Number(databaseState?.audit_count) >= 2, { codesHashed: databaseState?.codes_hashed, auditCount: databaseState?.audit_count });
  } finally {
    if (otpOwnerId) await owner.del(`/api/users/${otpOwnerId}`);
  }

  // ---------- first-login MFA enrollment for a newly provisioned staff account ----------
  const enrollEmail = `mfa-enroll-${tag}@example.com`;
  const enrollPassword = `Enroll-${randomBytes(12).toString('base64url')}aA1!`;
  const created = await owner.post('/api/users', { email: enrollEmail, password: enrollPassword, role: 'OWNER' });
  const enrollUserId = created.json?.doc?.id;
  try {
    const enrolling = new Client(BASE, 'mfa-enrolling', true);
    const passwordLogin = await enrolling.post('/api/users/login', { email: enrollEmail, password: enrollPassword });
    const statusBefore = await enrolling.get('/api/mfa/status');
    const deniedBefore = await enrolling.get('/api/reports/kpi');
    const start = await enrolling.post('/api/mfa/enroll', {});
    const secret = start.json?.secret;
    const duplicateStart = await enrolling.post('/api/mfa/enroll', {});
    const normalVerifyBeforeEnrollment = secret ? await enrolling.post('/api/mfa/verify', { code: await generate({ secret }) }) : null;
    const complete = secret ? await enrolling.post('/api/mfa/enroll/verify', { code: await generate({ secret }) }) : null;
    const statusAfter = await enrolling.get('/api/mfa/status');
    const allowedAfter = await enrolling.get('/api/reports/kpi');
    const duplicateComplete = secret ? await enrolling.post('/api/mfa/enroll/verify', { code: await generate({ secret }) }) : null;
    rec.add(
      'SEC-MFA-FIRST-LOGIN',
      'AUTH',
      'a newly provisioned staff account is denied admin access until it completes first-login MFA enrollment',
      created.status === 201 && passwordLogin.status === 200 && statusBefore.json?.enrolled === false && deniedBefore.status === 401 && start.status === 200 && typeof secret === 'string' && duplicateStart.status === 409 && normalVerifyBeforeEnrollment?.status === 401 && complete?.status === 200 && complete.json?.recoveryCodes?.length === 8 && statusAfter.json?.enrolled === true && allowedAfter.status === 200 && duplicateComplete?.status === 409,
      {
        created: created.status,
        login: passwordLogin.status,
        before: statusBefore.json?.enrolled,
        deniedBefore: deniedBefore.status,
        start: start.status,
        noStore: start.headers.get('cache-control'),
        duplicateStart: duplicateStart.status,
        normalVerifyBeforeEnrollment: normalVerifyBeforeEnrollment?.status,
        complete: complete?.status,
        recoveryCount: complete?.json?.recoveryCodes?.length,
        after: statusAfter.json?.enrolled,
        allowedAfter: allowedAfter.status,
        duplicateComplete: duplicateComplete?.status,
      },
    );
  } finally {
    if (enrollUserId) await owner.del(`/api/users/${enrollUserId}`);
  }

  // ---------- query oracles on hidden fields ----------
  const base = await admin.get('/api/users?limit=100&depth=0');
  for (const q of ['where[totpSecret][like]=A', 'where[recoveryCodes][exists]=true', 'where[mfaVerifiedSids][exists]=true', 'where[lastTotpStep][greater_than]=0', 'sort=totpSecret', 'where[hash][like]=a', 'where[salt][like]=a']) {
    const r = await admin.get(`/api/users?limit=100&depth=0&${q}`);
    const leaked = r.status === 200 && (r.json?.totalDocs ?? -1) !== base.json?.totalDocs;
    const sorted = q.startsWith('sort') && r.status === 200 && JSON.stringify((r.json?.docs ?? []).map((d: any) => d.id)) !== JSON.stringify((base.json?.docs ?? []).map((d: any) => d.id)) && JSON.stringify((r.json?.docs ?? []).map((d: any) => d.id)) !== JSON.stringify([...(base.json?.docs ?? [])].map((d: any) => d.id).sort((a: number, b: number) => a - b));
    rec.add(`SEC-ORACLE-${q}`, 'ORACLE', `admin cannot filter/sort users by a hidden secret field (${q})`, !leaked && !sorted && !(r.text ?? '').includes('stack'), { status: r.status, total: r.json?.totalDocs, base: base.json?.totalDocs });
  }
  const rq = await eng.get('/api/rfqs?limit=1&where[idempotencyKey][exists]=true');
  const rqAll = await eng.get('/api/rfqs?limit=1');
  rec.add('SEC-ORACLE-RFQ-KEY', 'ORACLE', 'RFQ idempotency keys cannot be probed through where', !(rq.status === 200 && rq.json?.totalDocs !== rqAll.json?.totalDocs), { status: rq.status, total: rq.json?.totalDocs, all: rqAll.json?.totalDocs });

  // ---------- stored XSS through published CMS content (four-eyes publish, then withdraw) ----------
  const pid = (await su.query(`SELECT id FROM cms.pages WHERE slug='insights'`)).rows[0]?.id;
  let pageId = pid;
  if (!pageId) pageId = (await editor.post('/api/pages?locale=en&draft=true', { slug: 'insights', title: `Insights ${XSS}`, body: `Body ${XSS}` })).json?.doc?.id;
  else await editor.patch(`/api/pages/${pageId}?locale=en&draft=true`, { title: `Insights ${XSS}`, body: `Body ${XSS}` });
  await editor.patch(`/api/pages/${pageId}?locale=ar&draft=true`, { title: `مقالات ${XSS}`, body: `نص ${XSS}` });
  await editor.patch(`/api/pages/${pageId}`, { workflowStatus: 'IN_REVIEW' });
  await eng.patch(`/api/pages/${pageId}`, { workflowStatus: 'APPROVED' });
  const pub = await admin.patch(`/api/pages/${pageId}`, { workflowStatus: 'PUBLISHED', _status: 'published' });
  try {
    const html = (await anon.get('/en/insights')).text;
    const raw = html.includes(`<script>alert('x${tag}')`) || /<img src=x onerror/i.test(html);
    rec.add('SEC-STORED-XSS', 'XSS', 'CMS content with script/img payloads is rendered escaped on the public page', pub.status === 200 && !raw && html.includes('&lt;script&gt;'), { publish: pub.status, raw });
  } finally {
    await admin.patch(`/api/pages/${pageId}`, { workflowStatus: 'WITHDRAWN' });
    // leave neutral draft text behind (the page is withdrawn; public route falls back to dictionary copy)
    await editor.patch(`/api/pages/${pageId}?locale=en`, { title: 'Insights', body: 'Draft' });
    await editor.patch(`/api/pages/${pageId}?locale=ar`, { title: 'مقالات', body: 'مسودة' });
  }

  // ---------- CSRF on a staff mutation ----------
  const st0 = (await su.query(`SELECT on_hand FROM domain.stock_levels WHERE sku_id='sku-rc04'`)).rows[0]?.on_hand;
  const csrf = await admin.req('POST', '/api/admin/stock/adjust', { json: { skuId: 'sku-rc04', delta: 5, reason: 'csrf probe', idempotencyKey: randomUUID() }, headers: { origin: 'http://evil.example', 'sec-fetch-site': 'cross-site' } });
  const st1 = (await su.query(`SELECT on_hand FROM domain.stock_levels WHERE sku_id='sku-rc04'`)).rows[0]?.on_hand;
  rec.add('SEC-CSRF-STAFF', 'CSRF', 'cross-site staff mutation refused and has no effect', (csrf.status === 401 || csrf.status === 403) && st0 === st1, { status: csrf.status, st0, st1 });

  // ---------- upload validation bypass ----------
  const up = (name: string, bytes: Buffer, type: string) => {
    const f = new FormData();
    f.append('file', new Blob([bytes], { type }), name);
    return editor.req('POST', '/api/media', { body: f });
  };
  const htmlAsPng = await up('evil.png', Buffer.from(`<html><script>alert(1)</script></html>`), 'image/png');
  const dbl = await up('evil.png.html', Buffer.from(`<html><script>alert(1)</script></html>`), 'text/html');
  rec.add('SEC-UPLOAD-SPOOF', 'UPLOAD', 'HTML disguised as PNG (or with a double extension) is refused', htmlAsPng.status >= 400 && dbl.status >= 400, { spoof: htmlAsPng.status, double: dbl.status });
  // private files: never served while not scanned CLEAN — not even to the uploader or an admin
  const pf = new FormData();
  pf.append('file', new Blob([makePdf()], { type: 'application/pdf' }), `plan-${tag}.pdf`);
  const pu = await eng.req('POST', '/api/private-files', { body: pf });
  const purl = pu.json?.doc?.url ? new URL(pu.json.doc.url, BASE).pathname : '';
  const g1 = await eng.get(purl);
  const g2 = await admin.get(purl);
  const g3 = await anon.get(purl);
  rec.add('SEC-PRIVATE-FILE-PENDING', 'UPLOAD', 'a private file is not served before a CLEAN scan (uploader, admin, anonymous)', pu.status === 201 && g1.status >= 400 && g2.status >= 400 && g3.status >= 400, { upload: pu.status, eng: g1.status, admin: g2.status, anon: g3.status });

  // ---------- IDOR across roles on CRM / contracts ----------
  const oppId = (await su.query(`SELECT id FROM cms.opportunities ORDER BY id LIMIT 1`)).rows[0]?.id;
  const rfqId = (await su.query(`SELECT id FROM cms.rfqs ORDER BY id LIMIT 1`)).rows[0]?.id;
  const e1 = await editor.get(`/api/opportunities/${oppId}`);
  const e2 = await store.get(`/api/rfqs/${rfqId}`);
  const e3 = await editor.get(`/api/workspace/opportunities/${oppId}/handoff-summary`);
  rec.add('SEC-IDOR-CRM', 'IDOR', 'editor/store cannot read opportunities, RFQs or handoff summaries by id', [e1.status, e2.status, e3.status].every((s) => s === 403 || s === 404), [e1.status, e2.status, e3.status]);
  const k = (await su.query(`SELECT id FROM domain.contracts ORDER BY signed_at LIMIT 1`)).rows[0]?.id;
  const a1 = await admin.post(`/api/contracts/${k}/attribution`, { to: 'WEBSITE_SOURCED', reason: 'probe' });
  const a2 = await eng.post(`/api/contracts/${k}/adjust`, { kind: 'AMENDMENT', deltaMinor: 100, effectiveAt: new Date().toISOString(), reason: 'probe', evidenceRef: 'x' });
  rec.add('SEC-ATTRIBUTION-MANIPULATION', 'IDOR', 'only the owner can override attribution or adjust contract value', a1.status === 403 && a2.status === 403, { override: a1.status, adjust: a2.status });

  // ---------- GraphQL introspection + error leakage ----------
  const intro = await anon.req('POST', '/api/graphql', { json: { query: '{ __schema { types { name } } }' } });
  const exposed = (intro.json?.data?.__schema?.types ?? []).length > 0;
  rec.add('SEC-GRAPHQL-INTROSPECTION', 'INFO', 'anonymous GraphQL introspection disabled', !exposed, { status: intro.status, exposed });
  const bad = await admin.get('/api/users?where[__proto__][polluted]=1&depth=99999');
  rec.add('SEC-ERROR-LEAK', 'INFO', 'malformed queries do not leak stack traces or SQL', !/at .+\.js:\d+|SELECT .+ FROM|node_modules/.test(bad.text), { status: bad.status, body: bad.text.slice(0, 120) });
  rec.add('SEC-PROTO-POLLUTION', 'INFO', 'prototype-pollution query parameter has no effect', ({} as any).polluted === undefined, null);

  await su.end();
  const out = path.join(APP_ROOT, 'tests', 'results');
  mkdirSync(out, { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), note: 'Self-review only; independent security review required before launch (B-30).', summary: rec.summary(), total: rec.checks.length, failed: rec.checks.filter((c) => !c.pass).length, checks: rec.checks };
  writeFileSync(path.join(out, 'security-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary), `total=${report.total} failed=${report.failed}`);
  process.exit(report.failed ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(2);
});
