// Final release (owner 2026-11-04): screenshots for review + browser checks of the new public UI and admin views, on
// the local production build with a disposable clone (run-all, after final-release). Public: the contact page with the
// two equal options («احجز بالواتساب» / «احجز بالفورم») and the Call button ON and OFF, the simplified form driven like a
// visitor (keyboard order, 44 px targets, friendly inline errors with focus on the first one, success message +
// WhatsApp), and the simulator stage 4 with «ابعت خطتك للفريق» opening the same form with the plan attached read-only
// (AR/EN × 390/1440, axe WCAG 2.1 A/AA = 0, no browser errors). Admin (OWNER, MFA-verified session): leads list, one
// lead, sales & metrics, the content editor and the privacy approval (390/1440). Synthetic data only; the switches are
// turned off again at the end.
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
  const created = await new Client(BASE, 'visitor', true).post('/api/booking', { name: 'عميل تجريبي', phone: '+20 101 234 5678', package: 'premium', message: 'طلب تجريبي للمراجعة', plan: 'خطة تجريبية: شقة، 4 أوض، 14 قناة، باقة Premium', consent: true, website: '', t, idempotencyKey: randomUUID().replace(/-/g, ''), source: 'simulator', locale: 'ar' }, { 'x-forwarded-for': '10.250.0.1' });
  const leadId = (await c.get('/api/leads?limit=1&sort=-createdAt')).json?.docs?.[0]?.id;
  const pkgId = (await c.get('/api/catalog-packages?where[packageId][equals]=premium&draft=true')).json?.docs?.[0]?.id;
  rec.add('S-SETUP', 'SETUP', 'switches on, one synthetic lead created for the admin screenshots', created.status === 201 && !!leadId && !!pkgId, { created: created.status, leadId, pkgId });

  const browser = await Browser.launch(BASE, path.join(SHOTS, '..', '.edge-profile-final-shots'), SHOTS, 9441);
  try {
    for (const locale of ['ar', 'en'] as const) {
      for (const width of [390, 1440]) {
        const contact = await browser.newPage(width, 900);
        await contact.setHeaders({ 'x-forwarded-for': `10.250.${width === 390 ? 1 : 2}.${locale === 'ar' ? 1 : 2}` });
        await contact.goto(`/${locale}/contact?package=premium`);
        await contact.waitHydrated('[data-testid="booking-form-contact"] input[name="name"]').catch(() => null);
        const layout = await contact.eval<any>(`(() => {
          const q = (s) => document.querySelector(s);
          const form = q('[data-testid="booking-form-contact"]');
          const a = q('[data-testid="option-whatsapp"]')?.getBoundingClientRect(), b = q('[data-testid="option-form"]')?.getBoundingClientRect();
          const names = form ? [...new Set([...form.querySelectorAll('[name]')].map((e) => e.getAttribute('name')))].sort() : [];
          return { options: !!a && !!b, sideBySide: !!a && !!b && Math.abs(a.top - b.top) < 2 && Math.abs(a.width - b.width) < 2, stacked: !!a && !!b && b.top >= a.bottom,
            call: !!q('[data-testid="contact-call"]'), whatsapp: !!q('[data-testid="contact-whatsapp"]'), names,
            premium: !!form?.querySelector('input[name="package"][value="premium"]:checked'), noteHidden: !!form && form.querySelector('textarea[name="message"]').offsetParent === null };
        })()`);
        const layoutOk = layout.options && (width === 390 ? layout.stacked : layout.sideBySide) && layout.call && layout.whatsapp && layout.premium && layout.noteHidden && JSON.stringify(layout.names) === JSON.stringify(['consent', 'message', 'name', 'package', 'phone', 'website']);
        const v = width === 390 ? await axe(contact) : [];
        await contact.screenshot(`${locale}-${width}-contact-form-on.png`);
        rec.add(`S-CONTACT-ON-${locale}-${width}`, 'PUBLIC', `${locale} ${width}: two equal options (${width === 390 ? 'stacked' : 'side by side'}) «احجز بالواتساب» / «احجز بالفورم» + Call; only name, mobile, package, consent and the collapsed note; ?package= preselects; axe 0; no browser errors`, layoutOk && v.length === 0 && errors(contact).length === 0, { layout, axe: v, issues: errors(contact) });
        if (width === 390) {
          // 44 px targets for every control a visitor touches
          const sizes = await contact.eval<Record<string, number>>(`(() => { const h = (s) => Math.min(...[...document.querySelectorAll(s)].map((e) => e.getBoundingClientRect().height)); const f = '[data-testid="booking-form-contact"] '; return { name: h(f + 'input[name="name"]'), phone: h(f + 'input[name="phone"]'), chips: h(f + '.booking-chip span'), consent: h(f + '.booking-check label'), note: h(f + '.booking-more'), privacy: h(f + '.booking-privacy'), submit: h(f + '.booking-submit'), call: h('[data-testid="contact-call"]'), whatsapp: h('[data-testid="contact-whatsapp"]') }; })()`);
          rec.add(`S-FORM-TARGETS-${locale}`, 'A11Y', `${locale} 390: every form control, the Call and the WhatsApp buttons are at least 44 px tall`, Object.values(sizes).every((n) => n >= 44), sizes);
          // keyboard order: name -> mobile -> the selected package chip
          await contact.eval(`document.querySelector('[data-testid="booking-form-contact"] input[name="name"]').focus(); true`);
          await contact.press('Tab');
          const k1 = await contact.eval<string>(`document.activeElement?.getAttribute('name') ?? ''`);
          await contact.press('Tab');
          const k2 = await contact.eval<string>(`(document.activeElement?.getAttribute('name') ?? '') + ':' + (document.activeElement?.value ?? '')`);
          rec.add(`S-FORM-KEYBOARD-${locale}`, 'A11Y', `${locale}: Tab moves name -> mobile -> the selected package chip`, k1 === 'phone' && k2 === 'package:premium', { k1, k2 });
          // empty submit: friendly inline errors, focus on the first problem
          await contact.click('[data-testid="booking-submit"]');
          await sleep(300);
          const e1 = await contact.eval<any>(`(() => { const f = document.querySelector('[data-testid="booking-form-contact"]'); return { focus: document.activeElement?.getAttribute('name'), invalid: [...f.querySelectorAll('[aria-invalid="true"]')].map((e) => e.getAttribute('name')), errors: [...f.querySelectorAll('.booking-error')].map((e) => e.textContent), described: !!document.getElementById(f.querySelector('input[name="name"]').getAttribute('aria-describedby') ?? '-') }; })()`);
          const ve = await axe(contact);
          await contact.screenshot(`${locale}-390-contact-form-errors.png`);
          const firstErr = locale === 'ar' ? 'اكتب اسمك.' : 'Please enter your name.';
          rec.add(`S-FORM-ERRORS-${locale}`, 'PUBLIC', `${locale}: an empty submit shows inline errors for name, mobile and consent, linked to their fields, focus on the name; nothing is sent; axe 0`, e1.focus === 'name' && e1.errors[0] === firstErr && e1.errors.length === 3 && ['name', 'phone', 'consent'].every((n) => e1.invalid.includes(n)) && e1.described && ve.length === 0, { e1, axe: ve });
          // a wrong number gets its own message; then a real visitor flow succeeds
          await contact.fill('[data-testid="booking-form-contact"] input[name="name"]', locale === 'ar' ? 'عميل تجريبي' : 'Synthetic Visitor');
          await contact.fill('[data-testid="booking-form-contact"] input[name="phone"]', '0123');
          await contact.click('[data-testid="booking-submit"]');
          await sleep(300);
          const e2 = await contact.eval<any>(`({ focus: document.activeElement?.getAttribute('name'), errors: [...document.querySelectorAll('[data-testid="booking-form-contact"] .booking-error')].map((e) => e.textContent) })`);
          rec.add(`S-FORM-PHONE-ERROR-${locale}`, 'PUBLIC', `${locale}: a wrong mobile number explains the expected form (01012345678) and takes the focus`, e2.focus === 'phone' && e2.errors.some((t: string) => t.includes('01012345678')), e2);
          await contact.fill('[data-testid="booking-form-contact"] input[name="phone"]', '+20 101 234 5678');
          await contact.click('[data-testid="booking-note-toggle"]');
          await sleep(200);
          const note = await contact.eval<any>(`({ expanded: document.querySelector('[data-testid="booking-note-toggle"]').getAttribute('aria-expanded'), focus: document.activeElement?.getAttribute('name') })`);
          await contact.fill('[data-testid="booking-form-contact"] textarea[name="message"]', locale === 'ar' ? 'ملاحظة تجريبية' : 'Synthetic note');
          await contact.click('[data-testid="booking-form-contact"] input[name="consent"]');
          await sleep(3300);
          await contact.click('[data-testid="booking-submit"]');
          await contact.waitFor(`!!document.querySelector('[data-testid="booking-thanks"]')`, 10000).catch(() => null);
          const done = await contact.eval<any>(`(() => { const t = document.querySelector('[data-testid="booking-thanks"]'); return { heading: t?.querySelector('h3')?.textContent, focused: document.activeElement === t?.querySelector('h3'), ref: document.querySelector('[data-testid="booking-ref"]')?.textContent ?? '', wa: document.querySelector('[data-testid="booking-thanks-whatsapp"]')?.getAttribute('href') ?? '' }; })()`);
          await contact.screenshot(`${locale}-390-contact-form-success.png`);
          const thanks = locale === 'ar' ? 'وصلنا طلبك! هنكلمك قريب.' : 'We got your request! We’ll call you soon.';
          rec.add(`S-FORM-SUCCESS-${locale}`, 'PUBLIC', `${locale}: the note opens on demand; a valid request shows «${thanks}» with a WhatsApp button carrying the request number; focus moves to the message`, note.expanded === 'true' && note.focus === 'message' && done.heading === thanks && done.focused && /^BK-\d{4}-[A-Z2-9]{6}$/.test(done.ref) && done.wa.startsWith('https://wa.me/') && decodeURIComponent(done.wa).includes(done.ref), { note, done });
        }
        await contact.close();
        const sim = await browser.newPage(width, 900);
        await sim.goto(`/${locale}/try?demo=plan`);
        await sim.waitHydrated('[data-testid="sim-team"]').catch(() => null);
        const closedBefore = await sim.eval<boolean>(`document.querySelector('[data-testid="sim-booking"]')?.hidden === true && document.querySelector('[data-testid="sim-team"]')?.getAttribute('aria-expanded') === 'false'`);
        await sim.click('[data-testid="sim-team"]');
        await sleep(300);
        await sim.eval(`document.querySelector('[data-testid="booking-form-simulator"]')?.scrollIntoView({ block: 'start' }); true`);
        await sleep(300);
        const simState = await sim.eval<any>(`(() => { const f = document.querySelector('[data-testid="booking-form-simulator"]'); const plan = f?.querySelector('[data-testid="booking-plan"] .booking-plan-text'); return { open: document.querySelector('[data-testid="sim-team"]')?.getAttribute('aria-expanded') === 'true' && !!f && f.offsetParent !== null, plan: (plan?.textContent ?? '').length, planReadOnly: !!plan && !plan.querySelector('input,textarea,[contenteditable]'), pkg: f?.querySelector('input[name="package"]:checked')?.value ?? null, whatsapp: !!document.querySelector('[data-testid="sim-whatsapp"]') }; })()`);
        const sv = width === 390 ? await axe(sim) : [];
        await sim.screenshot(`${locale}-${width}-simulator-stage4-form.png`);
        rec.add(`S-SIM-STAGE4-${locale}-${width}`, 'PUBLIC', `${locale} ${width}: «ابعت خطتك للفريق» opens the same form with the plan attached read-only (<= 900) and the recommended package chosen, next to WhatsApp; axe 0; no browser errors`, closedBefore && simState.open && simState.plan > 0 && simState.plan <= 900 && simState.planReadOnly && !!simState.pkg && simState.whatsapp && sv.length === 0 && errors(sim).length === 0, { closedBefore, simState, axe: sv, issues: errors(sim) });
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
        const formOff = await page.eval<boolean>(`!document.querySelector('form') && !document.querySelector('[data-testid="contact-options"]') && !!document.querySelector('[data-testid="contact-booking"]') && !!document.querySelector('[data-testid="contact-whatsapp"]')`);
        await page.screenshot(`${locale}-${width}-contact-form-off.png`);
        const sim = await browser.newPage(width, 900);
        await sim.goto(`/${locale}/try?demo=plan`);
        await sim.waitHydrated('[data-testid="sim-whatsapp"]').catch(() => null);
        const simOff = await sim.eval<boolean>(`!document.querySelector('[data-testid="sim-team"]') && !document.querySelector('form')`);
        await sim.close();
        rec.add(`S-CONTACT-OFF-${locale}-${width}`, 'PUBLIC', `${locale} ${width}: with the switches off the contact page is the WhatsApp/phone page again (no form, no options) and the simulator has no «ابعت خطتك للفريق»`, formOff && simOff, { formOff, simOff });
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
