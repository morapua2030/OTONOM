// Real-Edge CSP regression for B-38. Captures the evidence needed to distinguish
// a CSP/header problem from a Next hydration problem; no authentication or writes.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { APP_ROOT } from '@otonom/domain';
import { Browser } from './browser.ts';
import { Recorder, sleep } from './http-client.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const OUT = path.join(APP_ROOT, 'tests', 'results');
const EVIDENCE = path.resolve(APP_ROOT, '..', 'execution', 'evidence', 's7-working', 'csp');
const rec = new Recorder();

const nonceOf = (policy: string) => policy.match(/'nonce-([A-Za-z0-9+/_-]+={0,2})'/)?.[1] ?? '';

async function inspect(browser: Browser, ordinal: number) {
  const page = await browser.newPage(1280, 900);
  await page.goto('/staff/login');
  await sleep(700);
  const dom = await page.eval<any>(`(() => {
    const scripts = [...document.scripts].map(s => ({ src: s.src || '[inline]', nonce: s.nonce || s.getAttribute('nonce') || '', type: s.type || 'text/javascript' }));
    const form = document.querySelector('form');
    return { title: document.title, readyState: document.readyState, scripts, form: !!form, hydrated: !!form && Object.keys(form).some(k => k.startsWith('__reactProps')) };
  })()`);
  const documentResponse = page.responses.find((r) => r.type === 'Document' && new URL(r.url).pathname === '/staff/login');
  const policy = documentResponse?.headers['content-security-policy'] ?? '';
  const nonce = nonceOf(policy);
  const scriptResponses = page.responses.filter((r) => r.type === 'Script').map((r) => ({ status: r.status, url: r.url }));
  const blocked = page.issues.filter((i) => i.kind === 'request-failed' || /content security policy|refused to (load|execute)/i.test(i.text));
  const consoleErrors = page.issues.filter((i) => i.kind === 'console-error' || i.kind === 'exception');
  const nonceMismatch = dom.scripts.filter((s: any) => s.nonce !== nonce);
  const headerLooksDuplicated = /content-security-policy/i.test(policy) || (policy.match(/\bscript-src\b/g) ?? []).length !== 1;
  const report = {
    ordinal,
    url: `${BASE}/staff/login`,
    capturedAt: new Date().toISOString(),
    document: { status: documentResponse?.status ?? 0, headers: documentResponse?.headers ?? {} },
    policyNoncePresent: !!nonce,
    scriptNonceAttributes: dom.scripts,
    scriptResponses,
    blockedRequests: blocked,
    consoleErrors,
    hydration: { formPresent: dom.form, reactHydrated: dom.hydrated, readyState: dom.readyState },
    duplicateCspSuspected: headerLooksDuplicated,
  };
  rec.add(`CSP-EDGE-${ordinal}-HEADER`, 'B-38', 'one nonce-bearing strict CSP reaches /staff/login', !!nonce && /'strict-dynamic'/.test(policy) && !/'unsafe-inline'/.test(policy.match(/script-src[^;]*/)?.[0] ?? '') && !headerLooksDuplicated, policy);
  rec.add(`CSP-EDGE-${ordinal}-NONCES`, 'B-38', 'every Next script carries the response nonce', dom.scripts.length > 0 && nonceMismatch.length === 0, { scripts: dom.scripts.length, mismatch: nonceMismatch });
  rec.add(`CSP-EDGE-${ordinal}-LOADS`, 'B-38', 'Edge reports no CSP-blocked script request', blocked.length === 0 && scriptResponses.length > 0 && scriptResponses.every((s) => s.status < 400), { blocked, scriptResponses });
  rec.add(`CSP-EDGE-${ordinal}-CONSOLE`, 'B-38', 'Edge console has no CSP or hydration error', consoleErrors.length === 0, consoleErrors);
  rec.add(`CSP-EDGE-${ordinal}-HYDRATION`, 'B-38', 'staff login form is React-hydrated', dom.form && dom.hydrated, report.hydration);
  await page.screenshot(`s7-csp-staff-login-${ordinal}.png`);
  await page.close();
  return { report, nonce };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(EVIDENCE, { recursive: true });
  const browser = await Browser.launch(BASE, path.join(APP_ROOT, 'tests', '.edge-csp-profile'), EVIDENCE, 9338);
  try {
    const first = await inspect(browser, 1);
    const second = await inspect(browser, 2);
    rec.add('CSP-EDGE-NONCE-ROTATION', 'B-38', 'fresh navigations receive different nonces (no cached dynamic HTML)', !!first.nonce && !!second.nonce && first.nonce !== second.nonce, { first: !!first.nonce, second: !!second.nonce, different: first.nonce !== second.nonce });
    const report = { at: new Date().toISOString(), base: BASE, note: 'Local Microsoft Edge; B-38 focused regression.', summary: rec.summary(), total: rec.checks.length, failed: rec.checks.filter((c) => !c.pass).length, checks: rec.checks, navigations: [first.report, second.report] };
    writeFileSync(path.join(OUT, 'csp-edge-latest.json'), JSON.stringify(report, null, 2));
    writeFileSync(path.join(EVIDENCE, 'edge-csp-diagnostic.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report.summary), `total=${report.total} failed=${report.failed}`);
    process.exitCode = report.failed ? 1 : 0;
  } finally {
    browser.close();
  }
}
main().catch((e) => { console.error(e); process.exit(2); });
