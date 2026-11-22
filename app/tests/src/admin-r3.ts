// R3 admin (owner 2026-11-22): every menu page in Arabic and English at 1440 and 390 px, on a real browser (Edge
// headless) against a production build with synthetic data. Checks per page: no console error, exception, failed
// request, 5xx or third-party request; no sideways page overflow; <html dir> right-to-left in Arabic; digits 0–9 only;
// the page line from the copy file under the title. axe (WCAG 2.1 A/AA): no serious or critical issue on the 4 key
// screens (sign-in, Home, bookings list, one booking). Also: the menu language switch, the not-found page in both languages,
// and Payload's own language selector on the account page. One request waits at most 60 s; the whole suite at most 25 min.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { generate } from 'otplib';
import pg from 'pg';
import { APP_ROOT, connConfig, SECRETS_DIR } from '@otonom/domain';
import { PAGE, PAYLOAD_TRANSLATIONS, type Pair } from '../../web/src/admin-ui/copy.ts';
import { ACCOUNT_PAGE, menuFor } from '../../web/src/admin-ui/nav-model.ts';
import { Browser, type Page } from './browser.ts';
import { Recorder, sleep } from './http-client.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const SHOTS = path.resolve(APP_ROOT, '..', 'execution', 'evidence', 'screenshots', 'r3-admin');
const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const rec = new Recorder();
const su = new pg.Pool({ ...connConfig('superuser'), max: 2 });
type U = { id: number; email: string; role: string; password: string; totp: string };
const users: U[] = JSON.parse(readFileSync(path.join(SECRETS_DIR, 'dev_users.json'), 'utf8'));
const owner = users.find((u) => u.role === 'OWNER')!;
const SUITE_LIMIT_MS = 25 * 60_000;
const STEP_LIMIT_MS = 60_000;
const strip = (s: string) => s.replace(/[⁦-⁩]/g, '');
const ARABIC_INDIC = /[٠-٩۰-۹]/;

setTimeout(() => {
  console.error(`admin-r3: suite time limit (${SUITE_LIMIT_MS / 60_000} min) reached`);
  process.exit(3);
}, SUITE_LIMIT_MS).unref();

async function freshTotp() {
  const last = Number((await su.query('SELECT last_totp_step FROM cms.users WHERE id = $1', [owner.id])).rows[0]?.last_totp_step ?? 0);
  for (;;) {
    if (Math.floor(Date.now() / 30000) > last) return generate({ secret: owner.totp });
    await sleep(1000);
  }
}
const cdp = (p: Page) => (p as unknown as { cdp: { send: (m: string, params?: object, sid?: string) => Promise<any> } }).cdp;
const sid = (p: Page) => (p as unknown as { sid: string }).sid;
async function viewport(p: Page, width: number) {
  await cdp(p).send('Emulation.setDeviceMetricsOverride', { width, height: width < 768 ? 844 : 900, deviceScaleFactor: 1, mobile: width < 768 }, sid(p));
  await sleep(300);
}
async function setLang(p: Page, lang: 'ar' | 'en') {
  await cdp(p).send('Network.setCookie', { name: 'payload-lng', value: lang, url: BASE }, sid(p));
}
async function settle(p: Page, ready: string) {
  await p.waitFor(ready, STEP_LIMIT_MS, ready);
  await p.waitFor(`!document.querySelector('.template-default') || !!document.querySelector('.template-default--nav-hydrated')`, STEP_LIMIT_MS).catch(() => undefined);
  await sleep(900);
}
async function axeSerious(p: Page) {
  await p.eval(`window.axe ? 1 : (0, eval)(${JSON.stringify(AXE)})`);
  return p.eval<Array<{ id: string; impact: string; nodes: number }>>(
    `axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] }).then((r) => r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })))`,
  );
}
type Facts = { dir: string; lang: string; overflow: number; digits: boolean; line: string; h1: string };
const facts = (p: Page) =>
  p.eval<Facts>(`(() => {
    const line = [...document.querySelectorAll('.otn-line, .custom-view-description, .view-description, .staff-auth-title p')].map((e) => e.textContent || '').join(' | ');
    return {
      dir: (document.documentElement.getAttribute('dir') || '').toLowerCase(),
      lang: document.documentElement.lang,
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      digits: ${ARABIC_INDIC}.test(document.body.innerText),
      line,
      h1: document.querySelector('h1')?.textContent || '',
    };
  })()`);
const problems = (p: Page) => p.issues.filter((i) => i.kind !== 'request-failed' || !/ERR_ABORTED/.test(i.text));

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  // one synthetic booking, preferably one with follow-up notes (their rows add Payload's drag handles to the page)
  const leadId = (await su.query(`SELECT l.id FROM cms.leads l ORDER BY EXISTS (SELECT 1 FROM cms.leads_notes n WHERE n._parent_id = l.id) DESC, l.created_at DESC LIMIT 1`)).rows[0]?.id;
  if (!leadId) throw new Error('admin-r3 needs at least one synthetic booking (seed)');
  const browser = await Browser.launch(BASE, path.join(APP_ROOT, 'tests', '.edge-profile-admin-r3'), SHOTS, 9344);
  try {
    // ---- sign-in screen (signed out), both languages and widths
    for (const lang of ['ar', 'en'] as const) {
      for (const width of [1440, 390]) {
        const p = await browser.newPage(width, width < 768 ? 844 : 900, { adminLang: lang });
        await p.goto('/staff/login');
        await settle(p, `!!document.querySelector('form')`);
        const f = await facts(p);
        const v = await axeSerious(p);
        await p.screenshot(`${lang}-${width}-signin.png`);
        rec.add(`R3-SIGNIN-${lang}-${width}`, 'STAFF', `${lang} ${width}: sign-in in the chosen language (dir), logo + switch, no overflow, digits 0-9, axe serious/critical 0, no browser errors`,
          f.dir === (lang === 'ar' ? 'rtl' : 'ltr') && f.lang === lang && f.overflow === 0 && !f.digits && v.length === 0 && problems(p).length === 0 && (await p.exists('img[src$="primary_light.svg"]')) && (await p.exists('.otn-lang button[aria-pressed="true"]')),
          { f, axe: v, issues: problems(p) });
        await p.close();
      }
    }

    // ---- signed in as the synthetic OWNER through the real staff sign-in
    const p = await browser.newPage(1440, 900, { adminLang: 'ar' });
    await p.goto('/staff/login');
    await p.waitHydrated('form');
    await p.fill('input[name=email]', owner.email);
    await p.fill('input[name=password]', owner.password);
    await p.click('form button');
    await p.waitFor(`document.querySelector('input[name=code]')`, STEP_LIMIT_MS, 'TOTP step');
    await p.waitHydrated('form');
    await p.fill('input[name=code]', await freshTotp());
    await p.click('form button');
    await p.waitFor(`location.pathname.startsWith('/admin') && !!document.querySelector('nav')`, STEP_LIMIT_MS, 'admin');

    const pages: Array<{ key: string; href: string; line: Pair | null; ready: string }> = [
      ...menuFor('OWNER').flatMap((g) => g.pages.map((pg) => ({ key: pg.key, href: pg.href, line: PAGE[pg.key].line as Pair, ready: `!!document.querySelector('h1')` }))),
      { key: ACCOUNT_PAGE.key, href: ACCOUNT_PAGE.href, line: PAGE.accountSecurity.line, ready: `!!document.querySelector('[data-testid="security-current"]')` },
      { key: 'lead', href: `/admin/collections/leads/${leadId}`, line: PAGE.lead.line, ready: `!!document.querySelector('[data-testid="lead-summary"]')` },
      { key: 'overview', href: '/admin/overview', line: PAGE.home.line, ready: `!!document.querySelector('[data-testid="admin-home"]')` },
    ];
    for (const lang of ['ar', 'en'] as const) {
      await setLang(p, lang);
      for (const width of [1440, 390]) {
        await viewport(p, width);
        for (const page of pages) {
          p.issues.length = 0;
          await p.goto(page.href);
          let ok = true;
          await settle(p, page.ready).catch(() => (ok = false));
          const f = await facts(p);
          const lineOk = !page.line || strip(f.line).includes(strip(page.line[lang]));
          const key = ['home', 'leads', 'lead'].includes(page.key) ? page.key : null;
          const v = key ? await axeSerious(p) : [];
          if (width === 1440 || key) await p.screenshot(`${lang}-${width}-${page.key}.png`);
          rec.add(`R3-PAGE-${page.key}-${lang}-${width}`, 'ADMIN', `${lang} ${width}: ${page.href} renders in ${lang} (dir ${lang === 'ar' ? 'rtl' : 'ltr'}) with its page line, no page overflow, digits 0-9 only, no browser errors${key ? ', axe serious/critical 0' : ''}`,
            ok && f.dir === (lang === 'ar' ? 'rtl' : 'ltr') && f.lang === lang && f.overflow === 0 && !f.digits && lineOk && problems(p).length === 0 && v.length === 0,
            { href: page.href, f: { ...f, line: f.line.slice(0, 160) }, lineOk, axe: v, issues: problems(p).slice(0, 5) });
        }
      }
    }

    // ---- the language switch in the menu changes the admin language (and keeps it)
    await viewport(p, 1440);
    await setLang(p, 'ar');
    await p.goto('/admin');
    await settle(p, `!!document.querySelector('.otn-lang')`);
    await p.click('.otn-lang__btn[lang="en"]');
    await p.waitFor(`document.documentElement.lang === 'en'`, STEP_LIMIT_MS, 'switch to English').catch(() => undefined);
    const afterEn = await facts(p);
    await p.goto('/admin/collections/leads');
    await settle(p, `!!document.querySelector('h1')`);
    const keptEn = await facts(p);
    await p.click('.otn-lang__btn[lang="ar"]');
    await p.waitFor(`document.documentElement.lang === 'ar'`, STEP_LIMIT_MS, 'switch back to Arabic').catch(() => undefined);
    const backAr = await facts(p);
    rec.add('R3-LANG-SWITCH', 'ADMIN', 'the menu switch changes the admin to English, the choice is kept on the next page, and it switches back to Arabic (rtl)',
      afterEn.lang === 'en' && afterEn.dir === 'ltr' && keptEn.lang === 'en' && backAr.lang === 'ar' && backAr.dir === 'rtl', { afterEn: afterEn.lang, keptEn: keptEn.lang, backAr: backAr.lang });

    // ---- the not-found page (M8): plain words in the UI language, a link back to Home, the menu, no overflow
    const words = PAYLOAD_TRANSLATIONS as unknown as Record<'ar' | 'en', { general: Record<string, string> }>;
    for (const lang of ['ar', 'en'] as const) {
      await setLang(p, lang);
      for (const width of [1440, 390]) {
        await viewport(p, width);
        p.issues.length = 0;
        await p.goto('/admin/no-such-page');
        let ok = true;
        await settle(p, `!!document.querySelector('h1')`).catch(() => (ok = false));
        const f = await facts(p);
        const text = await p.eval<string>('document.body.innerText');
        await p.screenshot(`${lang}-${width}-not-found.png`);
        rec.add(`R3-NOT-FOUND-${lang}-${width}`, 'ADMIN', `${lang} ${width}: an unknown admin address shows the not-found page in ${lang}, in plain words, with a link back to Home, the menu and no page overflow`,
          ok && f.dir === (lang === 'ar' ? 'rtl' : 'ltr') && f.lang === lang && f.overflow === 0 && !f.digits && text.includes(words[lang].general.sorryNotFound)
            && (await p.exists('[data-testid="staff-nav"]')) && (await p.exists('a[href="/admin"]')) && problems(p).length === 0,
          { f: { ...f, line: '' }, issues: problems(p).slice(0, 5) });
      }
    }

    // ---- Payload's own language selector on the account page keeps working (M1)
    await viewport(p, 1440);
    await setLang(p, 'ar');
    await p.goto('/admin/account');
    await settle(p, `!!document.querySelector('#language-select')`);
    const viaAccount = await p.eval<{ options: string[]; lang: string; dir: string }>(`(async () => {
      const input = document.querySelector('#language-select');
      input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, bubbles: true }));
      await new Promise((r) => setTimeout(r, 600));
      const options = [...document.querySelectorAll('.rs__option')];
      options.find((o) => o.textContent === 'English')?.click();
      for (let i = 0; i < 80 && document.documentElement.lang !== 'en'; i++) await new Promise((r) => setTimeout(r, 250));
      return { options: options.map((o) => o.textContent || ''), lang: document.documentElement.lang, dir: (document.documentElement.getAttribute('dir') || '').toLowerCase() };
    })()`);
    rec.add('R3-ACCOUNT-LANGUAGE', 'ADMIN', "Payload's own language selector on the account page offers Arabic and English and switches the admin to English",
      viaAccount.options.length === 2 && viaAccount.lang === 'en' && viaAccount.dir === 'ltr', viaAccount);
    await p.close();
  } finally {
    browser.close();
    await su.end();
  }
  const out = path.join(APP_ROOT, 'tests', 'results');
  mkdirSync(out, { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), summary: rec.summary(), total: rec.checks.length, failed: rec.checks.filter((x) => !x.pass).length, checks: rec.checks };
  writeFileSync(path.join(out, 'admin-r3-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary), `total=${report.total} failed=${report.failed}`);
  process.exit(report.failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
