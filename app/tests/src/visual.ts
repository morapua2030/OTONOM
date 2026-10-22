// WAVE 2 visual / RTL / SEO conformance for the local production build, in the locally installed Microsoft Edge (headless)
// driven over the DevTools Protocol (Node 24 built-in WebSocket; no browser download, no npm dependency).
// Server must run with OTONOM_TEST_PAGES=1 (enables /[locale]/preview/bidi-samples). Screenshots are for HUMAN review:
// automated PASS here never replaces the human visual review (stays PENDING until a person signs the checklist).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { generate } from 'otplib';
import { APP_ROOT, SECRETS_DIR } from '@otonom/domain';
import { Client, Recorder, sleep } from './http-client.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PROFILE = path.join(APP_ROOT, 'tests', '.edge-profile');
const SHOTS = path.resolve(APP_ROOT, '..', 'execution', 'evidence', 'screenshots', 's11-20261021');
const PORT = 9334;
const WIDTHS = [360, 768, 1366];
const PAGES = ['', '/solutions', '/solutions/villas', '/solutions/apartments', '/business/developers', '/business/contractors', '/technology/controllers', '/technology/integrations', '/technology/documentation', '/products', '/products/4r', '/products/6r', '/products/16r', '/products/compare', '/projects', '/business/request-a-proposal', '/consultation', '/shop', '/support/warranty', '/preview', '/preview/bidi-samples'];
const rec = new Recorder();

class Cdp {
  private id = 0;
  private pending = new Map<number, (v: any) => void>();
  private waiters: Array<{ method: string; sid?: string; resolve: (v: any) => void }> = [];
  constructor(private ws: WebSocket) {
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(String(ev.data));
      if (m.id && this.pending.has(m.id)) {
        this.pending.get(m.id)!(m);
        this.pending.delete(m.id);
      } else if (m.method) {
        const i = this.waiters.findIndex((w) => w.method === m.method && (!w.sid || w.sid === m.sessionId));
        if (i >= 0) this.waiters.splice(i, 1)[0].resolve(m.params);
      }
    });
  }
  static async connect(url: string) {
    const ws = new WebSocket(url);
    await new Promise((r, j) => {
      ws.addEventListener('open', r, { once: true });
      ws.addEventListener('error', j, { once: true });
    });
    return new Cdp(ws);
  }
  send(method: string, params: object = {}, sessionId?: string): Promise<any> {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((r) => this.pending.set(id, r));
  }
  once(method: string, sid?: string, timeoutMs = 20000): Promise<any> {
    return Promise.race([new Promise((resolve) => this.waiters.push({ method, sid, resolve })), sleep(timeoutMs).then(() => null)]);
  }
  close() {
    this.ws.close();
  }
}

// In-page probe (runs in the browser). Returns layout, bidi, form and SEO facts.
const PROBE = `(() => {
  const html = document.documentElement, vw = window.innerWidth;
  const AR = /[\\u0600-\\u06FF]/, LAT = /[A-Za-z0-9]/;
  const skip = (el) => !!el.closest('script,style,noscript,title,.hp,.skip,.table-scroll table');
  const ISO = /\u2066[^\u2069]*\u2069/g;
  const over = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (skip(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 1 || r.left < -1) over.push(el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
  }
  const mixed = [];
  if (html.lang === 'ar') {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const t = (n.nodeValue || '').replace(ISO, '');
      const p = n.parentElement;
      if (!t.trim() || !p || skip(p) || p.closest('bdi,[dir=ltr]')) continue;
      if (LAT.test(t) && AR.test(t)) mixed.push(t.trim().slice(0, 70));
      else if (LAT.test(t) && AR.test((p.textContent || '').replace(ISO, '')) && p.childElementCount === 0) mixed.push('[adjacent] ' + (p.textContent || '').trim().slice(0, 70));
    }
  }
  const fields = [...document.querySelectorAll('input,select,textarea')].filter((f) => f.type !== 'hidden' && !f.closest('.hp'));
  const unlabelled = fields.filter((f) => !(f.closest('label') || f.getAttribute('aria-label') || (f.id && document.querySelector('label[for=\"' + f.id + '\"]')))).map((f) => f.name || f.id);
  const ltrTypes = fields.filter((f) => ['email', 'tel', 'date', 'number', 'url'].includes(f.type));
  const ltrWrong = ltrTypes.filter((f) => getComputedStyle(f).direction !== 'ltr').map((f) => f.name || f.id);
  const meta = (s) => document.querySelector(s)?.getAttribute('content') || '';
  // visual order inside every LTR isolate: on each rendered line, characters must advance left-to-right
  const orderBad = [];
  const wrapped = [];
  for (const b of document.querySelectorAll('bdi[dir=ltr], .ltr')) {
    const tn = [...b.childNodes].filter((c) => c.nodeType === 3);
    const pos = [];
    for (const t of tn) for (let i = 0; i < t.length; i++) {
      if (!/\\S/.test(t.data[i])) continue;
      const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1);
      const q = r.getBoundingClientRect(); if (q.width) pos.push({ top: Math.round(q.top), x: q.left });
    }
    for (let i = 1; i < pos.length; i++) if (pos[i].top === pos[i - 1].top && pos[i].x < pos[i - 1].x - 0.5) { orderBad.push(b.textContent.slice(0, 40)); break; }
    if (b.classList.contains('nowrap') && new Set(pos.map((p) => p.top)).size > 1) wrapped.push(b.textContent.slice(0, 40));
  }
  // --- accessibility probes (simplified axe-style checks) ---
  const rgb = (s) => { const m = (s || '').match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const lowContrast = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (skip(el) || !el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (!own) continue;
    const cs = getComputedStyle(el); const fg = rgb(cs.color); if (!fg) continue;
    const bg = bgOf(el); const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    if (ratio < need) lowContrast.push(el.tagName.toLowerCase() + ':' + ratio.toFixed(2) + ':' + (el.textContent || '').trim().slice(0, 30));
  }
  const levels = [...document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6')].map((h) => +h.tagName[1]);
  const headingSkips = levels.filter((l, i) => i > 0 && l > levels[i - 1] + 1).length;
  const nameless = [...document.querySelectorAll('a[href], button, summary')].filter((e) => e.offsetParent && !((e.textContent || '').trim() || e.getAttribute('aria-label') || e.getAttribute('title'))).length;
  const landmarks = ['header', 'nav', 'main', 'footer'].filter((s) => !document.querySelector(s));
  const smallTargets = [...document.querySelectorAll('.btn, summary, nav a, input:not([type=hidden]), select, textarea')].filter((e) => { if (!e.offsetParent || e.closest('.hp')) return false; const r = e.getBoundingClientRect(); return r.width < 24 || r.height < 24; }).map((e) => e.tagName.toLowerCase() + ':' + (e.textContent || e.name || '').trim().slice(0, 20));
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); const dupIds = ids.filter((x, i) => ids.indexOf(x) !== i);
  const tablesClipped =[...document.querySelectorAll('table.data')].filter((t) => t.scrollWidth > (t.parentElement?.clientWidth ?? t.clientWidth) + 1).length;
  return JSON.stringify({
    orderBad, wrapped, tablesClipped, lowContrast: lowContrast.slice(0, 6), lowContrastCount: lowContrast.length, headingSkips, nameless, landmarks, smallTargets: smallTargets.slice(0, 6), dupIds: [...new Set(dupIds)],
    lang: html.lang, dir: html.dir, vw, scrollW: html.scrollWidth, contentH: Math.ceil(document.documentElement.scrollHeight),
    overflow: over.slice(0, 8), overflowCount: over.length, mixed: mixed.slice(0, 8), mixedCount: mixed.length,
    fields: fields.length, unlabelled, ltrWrong, h1: document.querySelectorAll('h1').length,
    title: document.title, description: meta('meta[name=description]'), robots: meta('meta[name=robots]'),
    canonical: document.querySelector('link[rel=canonical]')?.getAttribute('href') || '',
    hreflang: [...document.querySelectorAll('link[rel=alternate][hreflang]')].map((l) => l.getAttribute('hreflang') + '=' + new URL(l.href).pathname).sort(),
    langSwitch: [...document.querySelectorAll('header a[hreflang]')].map((a) => new URL(a.href).pathname),
    skipLink: !!document.querySelector('a.skip[href=\"#main\"]'),
  });
})()`;

async function main() {
  if (!existsSync(EDGE)) throw new Error('Edge not found at the expected path');
  mkdirSync(SHOTS, { recursive: true });
  const edge = spawn(
    EDGE,
    ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync', `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${PORT}`, '--remote-debugging-address=127.0.0.1', 'about:blank'],
    { stdio: 'ignore' },
  );
  let wsUrl = '';
  for (let i = 0; i < 40 && !wsUrl; i++) {
    await sleep(500);
    wsUrl = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json()).then((j: any) => j.webSocketDebuggerUrl).catch(() => '');
  }
  if (!wsUrl) throw new Error('CDP not available');
  const cdp = await Cdp.connect(wsUrl);
  const shots: string[] = [];
  const open = async (url: string, width: number) => {
    const { result: tgt } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { result: att } = await cdp.send('Target.attachToTarget', { targetId: tgt.targetId, flatten: true });
    const sid = att.sessionId as string;
    await cdp.send('Page.enable', {}, sid);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 }, sid);
    const loaded = cdp.once('Page.loadEventFired', sid);
    await cdp.send('Page.navigate', { url }, sid);
    await loaded;
    await sleep(400);
    return { sid, targetId: tgt.targetId as string };
  };
  const evalJson = async (sid: string, expr: string) => {
    const ev = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid);
    const v = ev.result?.result?.value;
    return typeof v === 'string' ? JSON.parse(v) : v;
  };
  const shot = async (sid: string, name: string, width: number, h: number) => {
    const s = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: Math.min(h, 6000), scale: 1 } }, sid);
    if (s.result?.data) {
      const f = path.join(SHOTS, name);
      writeFileSync(f, Buffer.from(s.result.data, 'base64'));
      shots.push(path.relative(path.resolve(APP_ROOT, '..'), f));
    }
  };
  const titles: Record<string, Record<string, string>> = {};
  try {
    for (const locale of ['ar', 'en'] as const) {
      for (const page of PAGES) {
        for (const width of WIDTHS) {
          const url = `${BASE}/${locale}${page}`;
          const { sid, targetId } = await open(url, width);
          // Exercise native lazy-loading before the full-page capture so evidence does not contain blank
          // below-fold product frames. Return to the top before probing/capturing.
          await cdp.send('Runtime.evaluate', {
            expression: `(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 900) { scrollTo(0, y); await new Promise(r => setTimeout(r, 25)); } scrollTo(0, 0); const ready = Promise.all([...document.images].map(img => img.complete ? (img.decode ? img.decode().catch(() => {}) : Promise.resolve()) : new Promise(resolve => { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }); }))); await Promise.race([ready, new Promise(r => setTimeout(r, 2500))]); return true; })()`,
            awaitPromise: true,
          }, sid);
          const p = await evalJson(sid, PROBE);
          const name = `${locale}${page.replace(/\//g, '_') || '_home'}-${width}.png`;
          await shot(sid, name, width, p?.contentH ?? 900);
          await cdp.send('Target.closeTarget', { targetId });
          const id = `VIS-${locale}${page || '/'}-${width}`;
          const other = locale === 'ar' ? 'en' : 'ar';
          const expectHreflang = [`ar=/ar${page}`, `en=/en${page}`, `x-default=/ar${page}`].sort();
          const isTest = page.includes('bidi-samples');
          rec.add(`${id}-LANGDIR`, 'VISUAL', `${locale}${page} lang/dir`, p?.lang === locale && p?.dir === (locale === 'ar' ? 'rtl' : 'ltr'), { lang: p?.lang, dir: p?.dir });
          rec.add(`${id}-OVERFLOW`, 'VISUAL', `${locale}${page} no horizontal overflow at ${width}px`, p?.scrollW <= width && p?.overflowCount === 0, { scrollW: p?.scrollW, overflow: p?.overflow });
          rec.add(`${id}-LTR-ORDER`, 'BIDI', `${locale}${page} LTR tokens render in left-to-right character order at ${width}px`, (p?.orderBad ?? ['probe failed']).length === 0, p?.orderBad);
          rec.add(`${id}-NOWRAP`, 'BIDI', `${locale}${page} short technical tokens never break across lines at ${width}px`, (p?.wrapped ?? ['probe failed']).length === 0, p?.wrapped);
          rec.add(`${id}-TABLES`, 'VISUAL', `${locale}${page} data tables fit their container at ${width}px`, p?.tablesClipped === 0, p?.tablesClipped);
          if (locale === 'ar') rec.add(`${id}-BIDI`, 'BIDI', `${locale}${page} no un-isolated Latin/number run inside Arabic text at ${width}px`, p?.mixedCount === 0, p?.mixed);
          if (p?.fields) {
            rec.add(`${id}-LABELS`, 'A11Y', `${locale}${page} every field labelled`, p.unlabelled.length === 0, p.unlabelled);
            rec.add(`${id}-LTRFIELDS`, 'BIDI', `${locale}${page} phone/email/date/number fields render LTR`, p.ltrWrong.length === 0, p.ltrWrong);
          }
          if (width === WIDTHS[0]) {
            rec.add(`${id}-H1`, 'A11Y', `${locale}${page} exactly one h1`, p?.h1 === 1, p?.h1);
            rec.add(`${id}-CONTRAST`, 'A11Y', `${locale}${page} text contrast ≥ 4.5:1 (3:1 large) against its background`, p?.lowContrastCount === 0, p?.lowContrast);
            rec.add(`${id}-HEADINGS`, 'A11Y', `${locale}${page} no skipped heading levels`, p?.headingSkips === 0, p?.headingSkips);
            rec.add(`${id}-NAMES`, 'A11Y', `${locale}${page} every link/button/summary has an accessible name`, p?.nameless === 0, p?.nameless);
            rec.add(`${id}-LANDMARKS`, 'A11Y', `${locale}${page} header/nav/main/footer landmarks present`, (p?.landmarks ?? ['x']).length === 0, p?.landmarks);
            rec.add(`${id}-TARGETS`, 'A11Y', `${locale}${page} interactive targets ≥ 24×24 px at 360 px (WCAG 2.2 2.5.8)`, (p?.smallTargets ?? ['x']).length === 0, p?.smallTargets);
            rec.add(`${id}-IDS`, 'A11Y', `${locale}${page} no duplicate ids`, (p?.dupIds ?? ['x']).length === 0, p?.dupIds);
            rec.add(`${id}-SKIP`, 'A11Y', `${locale}${page} skip link present`, p?.skipLink === true, p?.skipLink);
            rec.add(`${id}-ROBOTS`, 'SEO', `${locale}${page} noindex while not launched`, /noindex/.test(p?.robots ?? ''), p?.robots);
            if (!isTest) {
              rec.add(`${id}-META`, 'SEO', `${locale}${page} localized title + description`, !!p?.title && p.title !== 'OTONOM' && (p?.description ?? '').length > 20, { title: p?.title, description: p?.description });
              rec.add(`${id}-HREFLANG`, 'SEO', `${locale}${page} canonical + reciprocal hreflang for the same path`, p?.canonical === `/${locale}${page}` && JSON.stringify(p?.hreflang) === JSON.stringify(expectHreflang), { canonical: p?.canonical, hreflang: p?.hreflang });
              rec.add(`${id}-LANGSWITCH`, 'I18N', `${locale}${page} language switch keeps the page`, (p?.langSwitch ?? []).includes(`/${other}${page}`), p?.langSwitch);
              (titles[page] ??= {})[locale] = p?.title;
            }
          }
        }
      }
    }
    for (const [page, t] of Object.entries(titles)) rec.add(`VIS-TITLE-DIFFERS${page || '/'}`, 'SEO', `${page || '/'} title differs between ar and en`, !!t.ar && !!t.en && t.ar !== t.en, t);
    // Admin editing in Arabic (A4): EDITOR signs in with password + TOTP; the editor form must render ar fields RTL and en fields LTR
    {
      const u = JSON.parse(readFileSync(path.join(SECRETS_DIR, 'dev_users.json'), 'utf8')).find((x: any) => x.role === 'EDITOR');
      const c = new Client(BASE, 'editor', true);
      await c.post('/api/users/login', { email: u.email, password: u.password });
      const s0 = Math.floor(Date.now() / 30000);
      while (Math.floor(Date.now() / 30000) === s0) await sleep(1000);
      const mfa = await c.post('/api/mfa/verify', { code: await generate({ secret: u.totp }) });
      const token = c.cookies.get('payload-token');
      for (const loc of ['ar', 'en'] as const) {
        const { result: tgt } = await cdp.send('Target.createTarget', { url: 'about:blank' });
        const { result: att } = await cdp.send('Target.attachToTarget', { targetId: tgt.targetId, flatten: true });
        const sid = att.sessionId as string;
        await cdp.send('Network.enable', {}, sid);
        await cdp.send('Network.setCookie', { name: 'payload-token', value: token ?? '', domain: '127.0.0.1', path: '/', httpOnly: true }, sid);
        await cdp.send('Page.enable', {}, sid);
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false }, sid);
        const loaded = cdp.once('Page.loadEventFired', sid);
        await cdp.send('Page.navigate', { url: `${BASE}/admin/collections/pages/create?locale=${loc}` }, sid);
        await loaded;
        await sleep(3500);
        const st = await evalJson(
          sid,
          `JSON.stringify({ path: location.pathname, fields: [...document.querySelectorAll('form input[type=text], form textarea')].map(f => getComputedStyle(f).direction), h: document.documentElement.scrollHeight })`,
        );
        await shot(sid, `admin_pages-create-${loc}-1366.png`, 1366, Math.min(st?.h ?? 900, 2400));
        await cdp.send('Target.closeTarget', { targetId: tgt.targetId });
        const want = loc === 'ar' ? 'rtl' : 'ltr';
        const textFields = (st?.fields ?? []) as string[];
        rec.add(`VIS-ADMIN-${loc}-FIELD-DIR`, 'ADMIN-I18N', `admin editor (${loc}) renders localized text fields ${want}`, mfa.status === 200 && st?.path?.startsWith('/admin/collections/pages') && textFields.length > 0 && textFields.filter((d) => d === want).length >= Math.ceil(textFields.length / 2), { mfa: mfa.status, path: st?.path, fields: textFields });
      }
    }
    // S10 Store Operations: real local Edge rendering with the normal STORE password + MFA flow.
    {
      const u = JSON.parse(readFileSync(path.join(SECRETS_DIR, 'dev_users.json'), 'utf8')).find((x: any) => x.role === 'STORE');
      const c = new Client(BASE, 'store-visual', true);
      const login = await c.post('/api/users/login', { email: u.email, password: u.password });
      const s0 = Math.floor(Date.now() / 30000);
      while (Math.floor(Date.now() / 30000) === s0) await sleep(1000);
      const mfa = await c.post('/api/mfa/verify', { code: await generate({ secret: u.totp }) });
      const token = c.cookies.get('payload-token');
      for (const width of WIDTHS) {
        const { result: tgt } = await cdp.send('Target.createTarget', { url: 'about:blank' });
        const { result: att } = await cdp.send('Target.attachToTarget', { targetId: tgt.targetId, flatten: true });
        const sid = att.sessionId as string;
        await cdp.send('Network.enable', {}, sid);
        await cdp.send('Network.setCookie', { name: 'payload-token', value: token ?? '', domain: '127.0.0.1', path: '/', httpOnly: true }, sid);
        await cdp.send('Page.enable', {}, sid);
        await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 }, sid);
        const loaded = cdp.once('Page.loadEventFired', sid);
        await cdp.send('Page.navigate', { url: `${BASE}/admin/store-ops` }, sid);
        await loaded;
        await sleep(2500);
        const st = await evalJson(
          sid,
          `JSON.stringify({ path: location.pathname, heading: document.querySelector('h1')?.textContent || '', lab: !!document.querySelector('[data-testid=commerce-lab]'), stage: !!document.querySelector('[data-testid=store-stage]'), scrollW: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, leaked: /DATABASE_URL|postgres(?:ql)?:\\/\\//i.test(document.body.innerText) })`,
        );
        await shot(sid, `admin_store-ops-${width}.png`, width, Math.min(st?.h ?? 900, 6000));
        await cdp.send('Target.closeTarget', { targetId: tgt.targetId });
        rec.add(`VIS-STORE-${width}-AUTH`, 'ADMIN-COMMERCE', `STORE password + MFA session reaches Store Operations at ${width}px`, login.status === 200 && mfa.status === 200 && st?.path === '/admin/store-ops' && /Store Operations/i.test(st?.heading), { login: login.status, mfa: mfa.status, path: st?.path });
        rec.add(`VIS-STORE-${width}-LAB`, 'ADMIN-COMMERCE', `local synthetic commerce review is visible and the public stage warning remains visible at ${width}px`, st?.lab === true && st?.stage === true, { lab: st?.lab, stage: st?.stage });
        rec.add(`VIS-STORE-${width}-LAYOUT`, 'ADMIN-COMMERCE', `Store Operations has no page overflow or connection-string disclosure at ${width}px`, st?.scrollW <= width && st?.leaked === false, { scrollW: st?.scrollW, leaked: st?.leaked });
      }
    }
    // S11 Service Desk: real local Edge rendering at the supported mobile/tablet/desktop widths.
    {
      const u = JSON.parse(readFileSync(path.join(SECRETS_DIR, 'dev_users.json'), 'utf8')).find((x: any) => x.role === 'ENGINEER');
      const c = new Client(BASE, 'service-visual', true);
      const login = await c.post('/api/users/login', { email: u.email, password: u.password });
      const s0 = Math.floor(Date.now() / 30000);
      while (Math.floor(Date.now() / 30000) === s0) await sleep(1000);
      const mfa = await c.post('/api/mfa/verify', { code: await generate({ secret: u.totp }) });
      const token = c.cookies.get('payload-token');
      for (const width of WIDTHS) {
        const { result: tgt } = await cdp.send('Target.createTarget', { url: 'about:blank' });
        const { result: att } = await cdp.send('Target.attachToTarget', { targetId: tgt.targetId, flatten: true });
        const sid = att.sessionId as string;
        await cdp.send('Network.enable', {}, sid);
        await cdp.send('Network.setCookie', { name: 'payload-token', value: token ?? '', domain: '127.0.0.1', path: '/', httpOnly: true }, sid);
        await cdp.send('Page.enable', {}, sid);
        await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 }, sid);
        const loaded = cdp.once('Page.loadEventFired', sid);
        await cdp.send('Page.navigate', { url: `${BASE}/admin/service-desk` }, sid);
        await loaded;
        await sleep(2500);
        const st = await evalJson(sid, `JSON.stringify({ path: location.pathname, heading: document.querySelector('h1')?.textContent || '', policy: !!document.querySelector('[data-testid=warranty-policy]'), tickets: !!document.querySelector('[data-testid=tickets]'), rmas: !!document.querySelector('[data-testid=rmas]'), scrollW: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, leaked: /DATABASE_URL|postgres(?:ql)?:\\/\\//i.test(document.body.innerText) })`);
        await shot(sid, `admin_service-desk-${width}.png`, width, Math.min(st?.h ?? 900, 6000));
        await cdp.send('Target.closeTarget', { targetId: tgt.targetId });
        rec.add(`VIS-SERVICE-${width}-AUTH`, 'ADMIN-SERVICE', `ENGINEER password + MFA session reaches Service Desk at ${width}px`, login.status === 200 && mfa.status === 200 && st?.path === '/admin/service-desk' && /Service desk/i.test(st?.heading), { login: login.status, mfa: mfa.status, path: st?.path });
        rec.add(`VIS-SERVICE-${width}-STATE`, 'ADMIN-SERVICE', `policy, ticket and RMA states render at ${width}px`, st?.policy === true && st?.tickets === true && st?.rmas === true, { policy: st?.policy, tickets: st?.tickets, rmas: st?.rmas });
        rec.add(`VIS-SERVICE-${width}-LAYOUT`, 'ADMIN-SERVICE', `Service Desk has no page overflow or connection-string disclosure at ${width}px`, st?.scrollW <= width && st?.leaked === false, { scrollW: st?.scrollW, leaked: st?.leaked });
      }
    }
    // S11 OWNER account-security cockpit: masked identities and responsive role/MFA posture.
    {
      const u = JSON.parse(readFileSync(path.join(SECRETS_DIR, 'dev_users.json'), 'utf8')).find((x: any) => x.role === 'OWNER');
      const c = new Client(BASE, 'owner-security-visual', true);
      const login = await c.post('/api/users/login', { email: u.email, password: u.password });
      const s0 = Math.floor(Date.now() / 30000);
      while (Math.floor(Date.now() / 30000) === s0) await sleep(1000);
      const mfa = await c.post('/api/mfa/verify', { code: await generate({ secret: u.totp }) });
      const token = c.cookies.get('payload-token');
      for (const width of WIDTHS) {
        const { result: tgt } = await cdp.send('Target.createTarget', { url: 'about:blank' });
        const { result: att } = await cdp.send('Target.attachToTarget', { targetId: tgt.targetId, flatten: true });
        const sid = att.sessionId as string;
        await cdp.send('Network.enable', {}, sid);
        await cdp.send('Network.setCookie', { name: 'payload-token', value: token ?? '', domain: '127.0.0.1', path: '/', httpOnly: true }, sid);
        await cdp.send('Page.enable', {}, sid);
        await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 }, sid);
        const loaded = cdp.once('Page.loadEventFired', sid);
        await cdp.send('Page.navigate', { url: `${BASE}/admin/account-security` }, sid);
        await loaded;
        await sleep(2500);
        const st = await evalJson(
          sid,
          `JSON.stringify({ path: location.pathname, heading: document.querySelector('h1')?.textContent || '', current: !!document.querySelector('[data-testid=security-current]'), directory: !!document.querySelector('[data-testid=security-directory]'), rawEmail: document.body.innerText.includes(${JSON.stringify(u.email)}), secretLabel: /totpSecret|recoveryCodes|payload-token/i.test(document.body.innerText), scrollW: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight })`,
        );
        await shot(sid, `admin_account-security-owner-${width}.png`, width, Math.min(st?.h ?? 900, 4000));
        await cdp.send('Target.closeTarget', { targetId: tgt.targetId });
        rec.add(`VIS-SECURITY-${width}-AUTH`, 'ADMIN-SECURITY', `OWNER password + MFA session reaches Account Security at ${width}px`, login.status === 200 && mfa.status === 200 && st?.path === '/admin/account-security' && /Account security/i.test(st?.heading), { login: login.status, mfa: mfa.status, path: st?.path });
        rec.add(`VIS-SECURITY-${width}-MASKING`, 'ADMIN-SECURITY', `OWNER security state and masked directory render without raw e-mail or secret labels at ${width}px`, st?.current === true && st?.directory === true && st?.rawEmail === false && st?.secretLabel === false, { current: st?.current, directory: st?.directory, rawEmail: st?.rawEmail, secretLabel: st?.secretLabel });
        rec.add(`VIS-SECURITY-${width}-LAYOUT`, 'ADMIN-SECURITY', `Account Security has no page overflow at ${width}px`, st?.scrollW <= width, { scrollW: st?.scrollW });
      }
    }
    // RFQ error state (one width per locale; each submission is rate-limited server-side)
    for (const locale of ['ar', 'en'] as const) {
      const width = 360;
      const { sid, targetId } = await open(`${BASE}/${locale}/business/request-a-proposal`, width);
      await evalJson(sid, `(async () => { document.querySelector('form.rfq').requestSubmit(); await new Promise(r => setTimeout(r, 1500)); return JSON.stringify(1); })()`);
      const st = await evalJson(sid, `JSON.stringify({ summary: !!document.querySelector('.err-summary'), focused: document.activeElement?.classList?.contains('err-summary') ?? false, invalid: document.querySelectorAll('[aria-invalid=true]').length, described: [...document.querySelectorAll('[aria-invalid=true]')].every(f => (f.getAttribute('aria-describedby')||'').split(' ').every(id => document.getElementById(id))), links: [...document.querySelectorAll('.err-summary a')].every(a => document.querySelector(a.getAttribute('href'))), distinct: (() => { const t = [...document.querySelectorAll('.err-summary a')].map(a => a.textContent.trim()); return new Set(t).size === t.length; })(), h: document.documentElement.scrollHeight })`);
      await shot(sid, `${locale}_rfq-errors-${width}.png`, width, st?.h ?? 900);
      await cdp.send('Target.closeTarget', { targetId });
      rec.add(`VIS-${locale}-RFQ-ERRORS`, 'A11Y', `${locale} RFQ invalid submit: focused error summary, aria-invalid fields wired to messages, summary links resolve and name each field`, !!st?.summary && st.focused && st.invalid >= 3 && st.described && st.links && st.distinct, st);
    }
  } finally {
    cdp.close();
    edge.kill();
  }
  const out = path.join(APP_ROOT, 'tests', 'results');
  mkdirSync(out, { recursive: true });
  const report = { base: BASE, at: new Date().toISOString(), method: 'Installed Microsoft Edge headless via DevTools Protocol, exact device-metrics emulation', widths: WIDTHS, humanReview: 'PENDING — see execution/waves/W02-human-visual-review-checklist.md', summary: rec.summary(), total: rec.checks.length, failed: rec.checks.filter((c) => !c.pass).length, screenshots: shots, checks: rec.checks };
  writeFileSync(path.join(out, 'visual-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary), `total=${report.total} failed=${report.failed} screenshots=${shots.length}`);
  process.exit(report.failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
