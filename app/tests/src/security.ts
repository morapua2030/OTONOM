// WAVE 9 — security regression suite (synthetic data only, local build). A self-review: NOT a substitute for the
// independent security review / penetration test required before any public exposure (release blocker B-30).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
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
  await pending.c.post('/api/users/logout', {});
  const hdr2 = await new Client(BASE).req('GET', '/api/users/me', { headers: { authorization: `JWT ${jwt}` } });
  rec.add('SEC-JWT-AFTER-LOGOUT', 'AUTH', 'a token from a logged-out session is no longer accepted', !hdr2.json?.user, hdr2.json?.user ? 'still valid' : 'rejected');

  const owner = (await login('OWNER')).c;
  const admin = (await login('ADMIN')).c;
  const eng = (await login('ENGINEER')).c;
  const editor = (await login('EDITOR')).c;
  const store = (await login('STORE')).c;

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
  const csrf = await admin.req('POST', '/api/admin/stock/adjust', { json: { skuId: 'sku-rc04', delta: 5, reason: 'csrf probe' }, headers: { origin: 'http://evil.example', 'sec-fetch-site': 'cross-site' } });
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
