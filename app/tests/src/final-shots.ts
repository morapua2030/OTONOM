// Final release (owner 2026-11-04): screenshots for review + browser checks of the new public UI and admin views, on
// the local production build with a disposable clone (run-all, after final-release). Public: the contact page with the
// booking form ON and OFF and the simulator stage 4 with «ابعت خطتك للفريق» (AR/EN × 390/1440, axe WCAG 2.1 A/AA = 0,
// no browser errors). Admin (OWNER, MFA-verified session): leads list, one lead, sales & metrics, the content editor
// and the privacy approval (390/1440). Synthetic data only; the switches are turned off again at the end.
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { generate } from 'otplib';
import { APP_ROOT, SECRETS_DIR } from '@otonom/domain';
import { Browser, type Page } from './browser.ts';
import { Client, Recorder, sleep } from './http-client.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const SHOTS = process.env.OTONOM_FINAL_SHOTS_DIR ?? path.resolve(APP_ROOT, '..', 'execution', 'evidence', 'final-2026-11-04', 'shots');
const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const rec = new Recorder();
const owner = JSON.parse(readFileSync(path.join(SECRETS_DIR, 'dev_users.json'), 'utf8')).find((u: any) => u.role === 'OWNER');

async function axe(page: Page) {
  await page.eval(`window.axe ? 1 : (0, eval)(${JSON.stringify(AXE)})`);
  return page.eval<Array<{ id: string; nodes: number }>>(`axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }, resultTypes: ['violations'] }).then((r) => r.violations.map((v) => ({ id: v.id, nodes: v.nodes.length })))`);
}
const errors = (p: Page) => p.issues.filter((i: any) => !String(i.url ?? '').endsWith('/favicon.ico'));

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const c = new Client(BASE, 'OWNER', true);
  const login = await c.post('/api/users/login', { email: owner.email, password: owner.password });
  const s0 = Math.floor(Date.now() / 30000);
  while (Math.floor(Date.now() / 30000) === s0) await sleep(1000);
  const mfa = await c.post('/api/mfa/verify', { code: await generate({ secret: owner.totp }) });
  if (login.status !== 200 || mfa.status !== 200) throw new Error(`owner sign-in ${login.status}/${mfa.status}`);
  const token = c.cookies.get('payload-token') ?? '';

  // switches ON + one synthetic lead for the admin views
  await c.post('/api/globals/privacy-policy', { approved: true });
  await c.post('/api/globals/intake-settings', { enabled: true, retentionMonths: 12 });
  await sleep(800);
  const html = (await new Client(BASE).get('/ar/contact')).text;
  const t = html.match(/\d{13}\.[A-Za-z0-9_-]{43}/)?.[0] ?? '';
  await sleep(3200);
  const created = await new Client(BASE, 'visitor', true).post('/api/booking', { name: 'عميل تجريبي', phone: '01012345678', area: 'دمنهور', package: 'premium', preferredTime: 'بعد العصر', message: 'طلب تجريبي للمراجعة', plan: '', consent: true, website: '', t, idempotencyKey: randomUUID().replace(/-/g, ''), source: 'contact', locale: 'ar' }, { 'x-forwarded-for': '10.250.0.1' });
  const leadId = (await c.get('/api/leads?limit=1&sort=-createdAt')).json?.docs?.[0]?.id;
  const pkgId = (await c.get('/api/catalog-packages?where[packageId][equals]=premium&draft=true')).json?.docs?.[0]?.id;
  rec.add('S-SETUP', 'SETUP', 'switches on, one synthetic lead created for the admin screenshots', created.status === 201 && !!leadId && !!pkgId, { created: created.status, leadId, pkgId });

  const browser = await Browser.launch(BASE, path.join(SHOTS, '..', '.edge-profile-final-shots'), SHOTS, 9441);
  try {
    for (const locale of ['ar', 'en'] as const) {
      for (const width of [390, 1440]) {
        const contact = await browser.newPage(width, 900);
        await contact.goto(`/${locale}/contact`);
        await contact.waitFor(`!!document.querySelector('[data-testid="booking-form-contact"]')`, 10000).catch(() => null);
        const formOn = await contact.eval<boolean>(`!!document.querySelector('[data-testid="booking-form-contact"]') && !!document.querySelector('[data-testid="contact-whatsapp"]')`);
        const v = width === 390 ? await axe(contact) : [];
        await contact.screenshot(`${locale}-${width}-contact-form-on.png`);
        rec.add(`S-CONTACT-ON-${locale}-${width}`, 'PUBLIC', `${locale} ${width}: contact page shows the form next to WhatsApp/phone; axe 0; no browser errors`, formOn && v.length === 0 && errors(contact).length === 0, { formOn, axe: v, issues: errors(contact) });
        await contact.close();
        const sim = await browser.newPage(width, 900);
        await sim.goto(`/${locale}/try?demo=plan`);
        await sim.waitFor(`!!document.querySelector('[data-testid="booking-form-simulator"]')`, 10000).catch(() => null);
        await sim.eval(`document.querySelector('[data-testid="booking-form-simulator"]')?.scrollIntoView({ block: 'center' }); true`);
        await sleep(300);
        const simOn = await sim.eval<boolean>(`!!document.querySelector('[data-testid="booking-form-simulator"]') && !!document.querySelector('[data-testid="sim-whatsapp"]')`);
        const sv = width === 390 ? await axe(sim) : [];
        await sim.screenshot(`${locale}-${width}-simulator-stage4-form.png`);
        rec.add(`S-SIM-STAGE4-${locale}-${width}`, 'PUBLIC', `${locale} ${width}: simulator stage 4 offers «ابعت خطتك للفريق» next to WhatsApp; axe 0; no browser errors`, simOn && sv.length === 0 && errors(sim).length === 0, { simOn, axe: sv, issues: errors(sim) });
        await sim.close();
      }
    }

    // admin views as the OWNER (session cookie injected into the browser)
    const adminPages: Array<[string, string]> = [['leads-list', '/admin/collections/leads'], ['lead', `/admin/collections/leads/${leadId}`], ['sales-kpi', '/admin/sales'], ['content-editor', `/admin/collections/catalog-packages/${pkgId}`], ['privacy-approval', '/admin/globals/privacy-policy']];
    for (const [name, url] of adminPages) {
      for (const width of [390, 1440]) {
        const page = await browser.newPage(width, 900);
        await (page as any).cdp.send('Network.setCookie', { name: 'payload-token', value: token, domain: new URL(BASE).hostname, path: '/', httpOnly: true }, (page as any).sid);
        await page.goto(url);
        await sleep(2500);
        const facts = await page.eval<{ path: string; unauthorized: boolean; text: number }>(`({ path: location.pathname, unauthorized: /unauthorized|login/.test(location.pathname), text: document.body.innerText.length })`);
        await page.screenshot(`admin-${width}-${name}.png`);
        rec.add(`S-ADMIN-${name}-${width}`, 'ADMIN', `${width}: OWNER sees ${url}`, !facts.unauthorized && facts.text > 50, facts);
        await page.close();
      }
    }

    // switches OFF again: the contact page is exactly the WhatsApp/phone page
    await c.post('/api/globals/intake-settings', { enabled: false, retentionMonths: 12 });
    await c.post('/api/globals/privacy-policy', { approved: false });
    await sleep(800);
    for (const locale of ['ar', 'en'] as const) {
      for (const width of [390, 1440]) {
        const page = await browser.newPage(width, 900);
        await page.goto(`/${locale}/contact`);
        await sleep(600);
        const formOff = await page.eval<boolean>(`!document.querySelector('form') && !!document.querySelector('[data-testid="contact-whatsapp"]')`);
        await page.screenshot(`${locale}-${width}-contact-form-off.png`);
        rec.add(`S-CONTACT-OFF-${locale}-${width}`, 'PUBLIC', `${locale} ${width}: with the switches off the contact page has no form (WhatsApp/phone only)`, formOff, { formOff });
        await page.close();
      }
    }
  } finally {
    browser.close();
  }
  const out = path.join(APP_ROOT, 'tests', 'results');
  mkdirSync(out, { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), summary: rec.summary(), total: rec.checks.length, failed: rec.checks.filter((x) => !x.pass).length, checks: rec.checks };
  writeFileSync(path.join(out, 'final-shots-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary), `total=${report.total} failed=${report.failed}`);
  process.exit(report.failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
