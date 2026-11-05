// Final release (owner 2026-11-04): security/CSP behaviour of the TWO Production hosts, against a local production
// build started in Production marketing-only mode (VERCEL=1, VERCEL_ENV=production, OTONOM_PUBLIC_MARKETING_ONLY=1,
// OTONOM_ADMIN_URL=https://otonom-admin.vercel.app). Requests carry the public Host or the admin Host header
// (node:http), exactly as Vercel routes the two domains to one deployment.
// Scope: the PROXY layer of both hosts (routing, closures, redirects, noindex, CSP and security headers, and whether a
// request reaches the application). In Vercel mode the app requires database URLs in its environment, which carry the
// credential the agent never handles, so application answers behind the proxy (database-backed endpoints) are verified
// by the final-release suite (harness) and by the post-release smoke on the real hosts (G16), not here.
import { mkdirSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import path from 'node:path';
import { APP_ROOT } from '@otonom/domain';
import { Recorder } from './http-client.ts';

const BASE = new URL(process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301');
const PUBLIC_HOST = BASE.host;
const ADMIN_HOST = process.env.OTONOM_TEST_ADMIN_HOST ?? 'otonom-admin.vercel.app';
const rec = new Recorder();
type R = { status: number; headers: Record<string, string | string[] | undefined>; body: string };

function call(method: string, pathname: string, host: string, body?: string, headers: Record<string, string> = {}): Promise<R> {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: BASE.hostname, port: BASE.port, method, path: pathname, headers: { host, 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0 Safari/537.36', ...(body ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : {}), ...headers } }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers as any, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
const h = (r: R, name: string) => String(r.headers[name] ?? '');
const cspOk = (r: R) => /script-src 'self' 'nonce-[a-f0-9]{32}' 'strict-dynamic'/.test(h(r, 'content-security-policy')) && !/https?:\/\//.test(h(r, 'content-security-policy')) && !/'unsafe-inline'[^;]*script|script-src[^;]*'unsafe-inline'/.test(h(r, 'content-security-policy'));
/** The request passed the proxy and reached the application (not the proxy's own 404 or a redirect). */
const reachesApp = (r: R) => !(r.status === 404 && r.body === 'Not Found') && ![301, 302, 307, 308].includes(r.status);
const securityHeaders = (r: R) => h(r, 'x-frame-options') === 'DENY' && h(r, 'x-content-type-options') === 'nosniff' && h(r, 'referrer-policy') === 'strict-origin-when-cross-origin';

async function main() {
  // ---------------- Public host ----------------
  const home = await call('GET', '/ar', PUBLIC_HOST);
  rec.add('H-PUBLIC-HOME', 'PUBLIC', 'public home answers 200 with a nonce CSP, the security headers, indexable, no preview banner', home.status === 200 && cspOk(home) && securityHeaders(home) && !/noindex/.test(h(home, 'x-robots-tag')) && !home.body.includes('class="banner"') && !/<meta name="robots" content="noindex/.test(home.body), { status: home.status, robots: h(home, 'x-robots-tag') });
  for (const p of ['/api/ready', '/api/users/me', '/api/leads', '/api/globals/intake-settings', '/api/metrics/summary', '/api/leads-export', '/graphql', '/ar/shop', '/en/account', '/ar/support/warranty', '/en/preview']) {
    const r = await call('GET', p, PUBLIC_HOST);
    rec.add(`H-PUBLIC-CLOSED${p}`, 'PUBLIC', `public host: GET ${p} answers 404 (noindex, no-store)`, r.status === 404 && /noindex/.test(h(r, 'x-robots-tag')) && /no-store/.test(h(r, 'cache-control')), r.status);
  }
  for (const [m, p] of [['POST', '/api/users/login'], ['POST', '/api/rfq'], ['POST', '/api/staff/invite'], ['POST', '/api/leads'], ['PATCH', '/api/globals/privacy-policy'], ['POST', '/ar/contact']]) {
    const r = await call(m, p, PUBLIC_HOST, '{}');
    rec.add(`H-PUBLIC-WRITE-CLOSED-${m}${p}`, 'PUBLIC', `public host: ${m} ${p} answers 404`, r.status === 404, r.status);
  }
  for (const p of ['/admin', '/admin/collections/leads', '/staff/login', '/staff/invite']) {
    const r = await call('GET', p, PUBLIC_HOST);
    rec.add(`H-PUBLIC-ADMIN-REDIRECT${p}`, 'PUBLIC', `public host: ${p} redirects to the admin host`, r.status === 307 && h(r, 'location') === `https://${ADMIN_HOST}${p}`, { status: r.status, location: h(r, 'location') });
  }
  const metric = await call('POST', '/api/e', PUBLIC_HOST, JSON.stringify({ e: 'page_view', r: '/ar', l: 'ar' }), { origin: `http://${PUBLIC_HOST}` });
  const booking = await call('POST', '/api/booking', PUBLIC_HOST, '{}', { origin: `http://${PUBLIC_HOST}` });
  const cron = await call('GET', '/api/cron/daily', PUBLIC_HOST);
  rec.add('H-PUBLIC-ALLOWLIST', 'PUBLIC', 'public host passes exactly the allow-listed endpoints to the application (POST /api/e, POST /api/booking, GET /api/cron/daily), noindex', [metric, booking, cron].every((r) => reachesApp(r) && /noindex/.test(h(r, 'x-robots-tag'))), { metric: metric.status, booking: booking.status, cron: cron.status });
  const getMetric = await call('GET', '/api/e', PUBLIC_HOST);
  const postCron = await call('POST', '/api/cron/daily', PUBLIC_HOST, '{}');
  rec.add('H-PUBLIC-ALLOWLIST-EXACT', 'PUBLIC', 'only the listed method is allowed (GET /api/e and POST /api/cron/daily are closed)', getMetric.status === 404 && getMetric.body === 'Not Found' && postCron.status === 404 && postCron.body === 'Not Found', { getMetric: getMetric.status, postCron: postCron.status });
  const robots = await call('GET', '/robots.txt', PUBLIC_HOST);
  rec.add('H-PUBLIC-ROBOTS', 'PUBLIC', 'robots.txt allows crawling and lists the sitemap in marketing-only mode', robots.status === 200 && /Allow: \//.test(robots.body) && /Sitemap: /.test(robots.body), robots.body.slice(0, 120));
  const links = (home.body.match(/href="[^"]*\/(?:admin|staff)[^"]*"/g) ?? []).length;
  rec.add('H-PUBLIC-NO-ADMIN-LINK', 'PUBLIC', 'no link to the admin or staff pages in public HTML', links === 0, links);

  // ---------------- Admin host ----------------
  const login = await call('GET', '/staff/login', ADMIN_HOST);
  rec.add('H-ADMIN-LOGIN', 'ADMIN', 'admin host: staff sign-in answers 200, noindex, nonce CSP and security headers', login.status === 200 && /noindex/.test(h(login, 'x-robots-tag')) && cspOk(login) && securityHeaders(login), { status: login.status, robots: h(login, 'x-robots-tag') });
  const adminNoCookie = await call('GET', '/admin', ADMIN_HOST);
  rec.add('H-ADMIN-SESSION', 'ADMIN', 'admin host: /admin without a session goes to the staff sign-in', adminNoCookie.status === 307 && /\/staff\/login$/.test(h(adminNoCookie, 'location')), { status: adminNoCookie.status, location: h(adminNoCookie, 'location') });
  const me = await call('GET', '/api/users/me', ADMIN_HOST);
  const leadsAnon = await call('GET', '/api/leads', ADMIN_HOST);
  const badLogin = await call('POST', '/api/users/login', ADMIN_HOST, JSON.stringify({ email: 'nobody@otonom.local', password: 'wrong-password-wrong' }), { origin: `https://${ADMIN_HOST}` });
  const graphql = await call('POST', '/api/graphql', ADMIN_HOST, '{}');
  rec.add('H-ADMIN-API', 'ADMIN', 'admin host: the API and the sign-in API reach the application (MFA, RBAC and CSRF apply there), noindex', [me, leadsAnon, badLogin, graphql].every((r) => reachesApp(r) && /noindex/.test(h(r, 'x-robots-tag'))), { me: me.status, leads: leadsAnon.status, login: badLogin.status, graphql: graphql.status });
  const page = await call('GET', '/ar/contact', ADMIN_HOST);
  rec.add('H-ADMIN-NO-SITE', 'ADMIN', 'admin host: public pages redirect to /admin (the site is never served from the admin host)', page.status === 307 && h(page, 'location') === `https://${ADMIN_HOST}/admin`, { status: page.status, location: h(page, 'location') });
  const icon = await call('GET', '/brand/otonom/assets/icons/favicon.ico', ADMIN_HOST);
  rec.add('H-ADMIN-STATIC', 'ADMIN', 'admin host: brand files used by the staff shell are served (noindex)', icon.status === 200 && /noindex/.test(h(icon, 'x-robots-tag')), icon.status);

  const out = path.join(APP_ROOT, 'tests', 'results');
  mkdirSync(out, { recursive: true });
  const report = { base: BASE.origin, adminHost: ADMIN_HOST, at: new Date().toISOString(), summary: rec.summary(), total: rec.checks.length, failed: rec.checks.filter((c) => !c.pass).length, checks: rec.checks };
  writeFileSync(path.join(out, 'hosts-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary), `total=${report.total} failed=${report.failed}`);
  process.exit(report.failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
