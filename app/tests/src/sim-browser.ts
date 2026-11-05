// D8-C v4 browser checks for the "Try your smart home" simulator (/try) and its entry points, on a production build
// with the public profile (no synthetic flags). Read-only browsing: the simulator has no form and sends nothing.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { APP_ROOT } from '@otonom/domain';
import { Browser, type Page } from './browser.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const EVIDENCE = process.env.OTONOM_SIM_EVIDENCE_DIR ?? path.resolve(APP_ROOT, '..', 'execution', 'evidence', 'd8c-v4-sim-browser');
const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const DEMOS = ['fresh', 'apartment', 'night', 'routine', 'gas', 'day', 'over', 'plan'] as const;
const checks: Array<{ id: string; pass: boolean; detail?: unknown }> = [];
const add = (id: string, pass: boolean, detail?: unknown) => checks.push({ id, pass, ...(pass ? {} : { detail }) });
const cleanIssues = (issues: Array<{ kind: string; text: string; url?: string }>) => issues.filter((issue) => !issue.url?.endsWith('/favicon.ico'));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function axe(page: Page) {
  await page.eval(`window.axe ? 1 : (0, eval)(${JSON.stringify(AXE)})`);
  return page.eval<Array<{ id: string; nodes: number; targets: string[] }>>(`axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }, resultTypes: ['violations'] }).then((r) => r.violations.map((v) => ({ id: v.id, nodes: v.nodes.length, targets: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })))`);
}
/** Press Tab until the focused element matches `selector` (keyboard reachability); returns the number of presses or -1. */
async function tabTo(page: Page, selector: string, max = 400) {
  for (let i = 1; i <= max; i++) {
    await page.press('Tab');
    if (await page.eval<boolean>(`!!document.activeElement?.matches(${JSON.stringify(selector)})`)) return i;
  }
  return -1;
}
/**
 * Owner rule (2026-11-04) for the interaction window — precise, not weaker than before:
 * FAIL on any fetch / XHR / sendBeacon (Ping) / WebSocket / EventSource request, whatever its origin (Next.js RSC
 * fetches included), and on ANY cross-origin request. ALLOW only same-origin GET requests for static assets: the site
 * icon, /_next/static, /_next/image, /brand, /fonts, /products and image or font files. Everything else (a document
 * navigation, a POST, an unknown same-origin path) fails too.
 * Owner decision A (2026-11-04, simulator metrics ON): exactly ONE more thing is allowed — a same-origin
 * navigator.sendBeacon POST (CDP type Ping) to /api/e whose body is { e, r, l } only, with e from the site's fixed
 * event list. A beacon to any other path, a fetch()/XHR to /api/e, an unknown event or any extra field still fails.
 */
const METRIC_EVENTS = ['page_view', 'whatsapp_click', 'call_click', 'package_premium', 'package_plus', 'package_essential', 'sim_start', 'sim_stage_2', 'sim_stage_3', 'sim_stage_4', 'plan_sent'];
function isMetricBeacon(r: { method: string; type: string; url: string; postData?: string | null }): boolean {
  let url: URL;
  try { url = new URL(r.url); } catch { return false; }
  if (url.origin !== ORIGIN_OF_BASE() || r.type !== 'Ping' || r.method !== 'POST' || url.pathname !== '/api/e' || typeof r.postData !== 'string') return false;
  try {
    const body = JSON.parse(r.postData);
    const keys = Object.keys(body).sort().join(',');
    return (keys === 'e,l,r' || keys === 'e,r') && METRIC_EVENTS.includes(body.e) && typeof body.r === 'string' && /^\/(ar|en)(\/[a-z0-9-]{1,40}){0,4}$/.test(body.r);
  } catch {
    return false;
  }
}
const ORIGIN_OF_BASE = () => new URL(BASE).origin;
const ORIGIN = new URL(BASE).origin;
const APP_TRAFFIC_TYPES = ['XHR', 'Fetch', 'WebSocket', 'EventSource', 'Ping'];
const STATIC_ASSET = /^\/(?:favicon\.ico$|_next\/static\/|_next\/image$|brand\/|fonts\/|products\/)|\.(?:png|jpe?g|webp|avif|gif|svg|ico|woff2?)$/;
function isAppTraffic(r: { method: string; type: string; url: string; postData?: string | null }): boolean {
  if (isMetricBeacon(r)) return false;
  let url: URL;
  try { url = new URL(r.url); } catch { return true; }
  if (url.origin !== ORIGIN) return true;
  if (APP_TRAFFIC_TYPES.includes(r.type)) return true;
  if (r.method !== 'GET') return true;
  return !STATIC_ASSET.test(url.pathname);
}
function nonAssetRequests(page: Page, from: number) {
  return page.requests.slice(from).filter(isAppTraffic);
}
const storage = (page: Page) => page.eval<{ local: number; session: number; cookie: string; forms: number; inputs: string[] }>(`({ local: localStorage.length, session: sessionStorage.length, cookie: document.cookie, forms: document.querySelectorAll('form').length, inputs: [...document.querySelectorAll('main input, main textarea, main select, main [contenteditable="true"]')].map((n) => n.tagName + ':' + (n.getAttribute('type') || '')) })`);

async function main() {
  mkdirSync(EVIDENCE, { recursive: true });
  const browser = await Browser.launch(BASE, path.join(EVIDENCE, '.edge-sim-profile'), path.join(EVIDENCE, 'screenshots'), 9391);
  try {
    // ---- 1. Fresh page structure (AR desktop) ----
    const fresh = await browser.newPage(1440, 1000);
    await fresh.reducedMotion();
    await fresh.goto('/ar/try');
    await fresh.waitHydrated('.sim-home[data-home="apt"]');
    const f = await fresh.eval<any>(`({
      lang: document.documentElement.lang, dir: document.documentElement.dir,
      h1: document.querySelectorAll('main h1').length, title: document.title, description: document.querySelector('meta[name="description"]')?.content,
      canonical: document.querySelector('link[rel="canonical"]')?.href, alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((n) => n.hreflang).sort(),
      pills: document.querySelectorAll('.sim-stage-pill').length, homes: document.querySelectorAll('.sim-home').length,
      pickFirst: document.querySelectorAll('.sim-empty').length, demoNote: !!document.querySelector('[data-testid="sim-demo-note"]'),
      overflow: document.documentElement.scrollWidth > innerWidth, demo: document.querySelector('[data-testid="simulator"]')?.dataset.demo,
    })`);
    const freshStore = await storage(fresh);
    add('try-ar-fresh-structure', f.lang === 'ar' && f.dir === 'rtl' && f.h1 === 1 && f.pills === 4 && f.homes === 3 && f.pickFirst === 3 && !f.overflow && f.demo === 'fresh' && /جرّب بيتك الذكي/.test(f.title) && !!f.description && /\/ar\/try$/.test(f.canonical ?? '') && JSON.stringify(f.alternates) === '["ar","en","x-default"]', f);
    add('try-ar-fresh-no-form-no-input', freshStore.forms === 0 && freshStore.inputs.length === 0, freshStore);
    add('try-ar-fresh-browser-errors', cleanIssues(fresh.issues).length === 0, cleanIssues(fresh.issues));
    await fresh.close();

    // ---- 2. Full interaction run: no network, no storage, no form/text input; message and totals ----
    const run = await browser.newPage(1440, 1000);
    await run.reducedMotion();
    await run.goto('/ar/try');
    await run.waitHydrated('.sim-home[data-home="apt"]');
    const cookie0 = await run.eval<string>('document.cookie');
    const req0 = run.requests.length;
    await run.click('.sim-home[data-home="apt"]');
    await run.waitFor(`document.querySelectorAll('[data-testid="sim-room"]').length === 6`);
    const total = () => run.eval<string>(`document.querySelector('[data-testid="sim-total"] .sim-need-num')?.textContent`);
    const t13 = await total();
    await run.click('[data-testid="sim-room"]:nth-child(1) .sim-stepper button:last-child');
    await run.waitFor(`document.querySelector('[data-testid="sim-total"] .sim-need-num')?.textContent === '14'`);
    await run.click('[data-testid="sim-room"]:nth-child(1) [role="switch"]');
    const acSame = await total();
    await run.click('[data-testid="sim-room"]:nth-child(2) .sim-dev-add');
    await run.waitFor(`document.querySelector('[data-testid="sim-total"] .sim-need-num')?.textContent === '15'`);
    // 4 per device type at most
    for (let i = 0; i < 5; i++) await run.click('[data-testid="sim-room"]:nth-child(2) .sim-dev-on button:last-child').catch(() => null);
    const devMax = await run.eval<any>(`({ qty: document.querySelector('[data-testid="sim-room"]:nth-child(2) .sim-dev-on .sim-dev-label')?.textContent, plusDisabled: document.querySelector('[data-testid="sim-room"]:nth-child(2) .sim-dev-on button:last-child')?.disabled })`);
    // Lines 0..16
    for (let i = 0; i < 20; i++) await run.click('[data-testid="sim-room"]:nth-child(3) .sim-stepper button:last-child').catch(() => null);
    const lines16 = await run.eval<any>(`({ v: document.querySelectorAll('[data-testid="sim-lines"]')[2]?.textContent, plusDisabled: document.querySelector('[data-testid="sim-room"]:nth-child(3) .sim-stepper button:last-child')?.disabled })`);
    const afterLines = await run.eval<any>(`({ ch: document.querySelector('[data-testid="sim-total"] .sim-need-num')?.textContent, pkg: document.querySelector('[data-testid="sim-pkg"]')?.textContent, ctrl: document.querySelector('[data-testid="sim-ctrl"]')?.textContent, up: document.querySelector('[data-testid="sim-up"]')?.textContent })`);
    // Rooms: add until 12
    for (let i = 0; i < 8; i++) {
      if (await run.exists('[data-testid="sim-add-room"]')) { await run.click('[data-testid="sim-add-room"]'); await run.click('.sim-add-type[data-type="office"]'); }
    }
    const rooms12 = await run.eval<any>(`({ n: document.querySelectorAll('[data-testid="sim-room"]').length, addBtn: !!document.querySelector('[data-testid="sim-add-room"]'), full: document.querySelector('[data-testid="sim-rooms-full"]')?.textContent, count: document.querySelector('[data-testid="sim-room-count"]')?.textContent })`);
    await run.click('[data-testid="sim-room"]:nth-child(12) .sim-icon-btn');
    await run.waitFor(`document.querySelectorAll('[data-testid="sim-room"]').length === 11`);
    // Lock, compare, house tiles, day/night, timeline, Alexa, routines, like, gas, copy
    await run.click('[data-testid="sim-lock"]');
    const premium = await run.eval<any>(`({ pkg: document.querySelector('[data-testid="sim-pkg"]')?.textContent, checked: document.querySelector('[data-testid="sim-lock"]')?.getAttribute('aria-checked'), lockTile: !!document.querySelector('.sim-aside .sim-tile[title="قفل ذكي"]') })`);
    await run.click('.sim-aside .sim-up button');
    const cmp = await run.eval<number>(`document.querySelectorAll('.sim-aside .sim-cmp-col').length`);
    await run.click('.sim-floor .sim-ctl');
    await run.click('.sim-daynight button:last-child');
    const nightOn = await run.eval<string>(`document.querySelector('[data-testid="sim-house"]')?.dataset.night`);
    await run.click('[data-testid="sim-day-play"]');
    await sleep(700);
    await run.click('[data-testid="sim-day-play"]');
    await run.fill('[data-testid="sim-scrub"]', '19');
    const clock = await run.text('[data-testid="sim-clock"]');
    for (let i = 0; i < 4; i++) await run.click(`.sim-cmd:nth-child(${i + 1})`);
    const bubble = await run.text('[data-testid="sim-bubble"]');
    await run.click('.sim-routine[data-routine="morning"] .sim-play');
    await run.click('.sim-routine[data-routine="morning"] .sim-heart');
    await run.click('.sim-routine[data-routine="gas"] .sim-heart');
    await run.click('[data-testid="sim-copy"]');
    await run.waitFor(`document.querySelector('[data-testid="sim-copy"]')?.textContent === 'اتنسخت'`, 5000).catch(() => null);
    const copied = await run.text('[data-testid="sim-copy"]');
    await sleep(1200);
    const end = await storage(run);
    const msg = await run.eval<any>(`(() => { const a = document.querySelector('[data-testid="sim-whatsapp"]'); const u = new URL(a.href); const c = new URL(document.querySelector('[data-testid="cta-book"]').href); return { host: u.host, path: u.pathname, text: u.searchParams.get('text'), cta: c.searchParams.get('text'), target: a.target, rel: a.rel, liked: [...document.querySelectorAll('.sim-plan .sim-tag')].map((n) => n.textContent) }; })()`);
    const network = nonAssetRequests(run, req0);
    add('try-totals-lines-devices-ac', t13 === '13' && acSame === '14' && devMax.qty?.includes('×4') && devMax.plusDisabled === true && lines16.v === '16' && lines16.plusDisabled === true, { t13, acSame, devMax, lines16 });
    add('try-rooms-max-12', rooms12.n === 12 && !rooms12.addBtn && /12/.test(rooms12.full ?? '') && rooms12.count === '12 / 12', rooms12);
    add('try-over-plus-extras', afterLines.pkg === 'Plus' && /2 × 16R/.test(afterLines.ctrl ?? '') && /Premium/.test(afterLines.up ?? ''), afterLines);
    add('try-lock-premium', /^Premium/.test(premium.pkg ?? '') && premium.checked === 'true' && premium.lockTile && cmp === 3, { premium, cmp });
    add('try-night-timeline-alexa', nightOn === 'true' && clock === '19:00' && /تصبح على خير/.test(bubble), { nightOn, clock, bubble });
    add('try-whatsapp-plan-message', msg.host === 'wa.me' && msg.path === '/201090721847' && msg.text.startsWith('أهلًا OTONOM، عملت خطة لشقة: 11 أوضة') && msg.text.length <= 900 && msg.cta === msg.text && msg.target === '_blank' && /noopener/.test(msg.rel) && JSON.stringify(msg.liked) === '["صباح الخير","أمان الغاز"]', msg);
    add('try-copy-plan', copied === 'اتنسخت', { copied });
    add('try-no-network-during-interaction', network.length === 0, network);
    const beacons = run.requests.slice(req0).filter(isMetricBeacon).map((r) => { try { return JSON.parse(r.postData ?? '{}').e; } catch { return null; } });
    add('try-metrics-beacons-only', beacons.includes('sim_start') && beacons.includes('sim_stage_2'), { beacons });
    add('try-no-storage-cookies-forms-inputs', end.local === 0 && end.session === 0 && end.cookie === cookie0 && end.forms === 0 && JSON.stringify(end.inputs) === '["INPUT:range"]', { ...end, cookie0 });
    add('try-interaction-browser-errors', cleanIssues(run.issues).length === 0, cleanIssues(run.issues));
    await run.screenshot('try-ar-1440-after-run.png');
    await run.close();

    // ---- 3. Premium gating: a lock routine without Premium shows the upsell; "Add the smart lock" recommends Premium ----
    // ---- 2b. The network rule itself: classifier self-test and a live negative run (owner rule 2026-11-04) ----
    const sample = [
      { method: 'GET', type: 'Other', url: `${ORIGIN}/brand/otonom/assets/icons/favicon.ico`, expect: false },
      { method: 'GET', type: 'Script', url: `${ORIGIN}/_next/static/chunks/a.js`, expect: false },
      { method: 'GET', type: 'Font', url: `${ORIGIN}/fonts/inter-latin-wght.3100e775e8.woff2`, expect: false },
      { method: 'GET', type: 'Image', url: `${ORIGIN}/_next/image`, expect: false },
      { method: 'GET', type: 'Fetch', url: `${ORIGIN}/ar/try`, expect: true },
      { method: 'GET', type: 'XHR', url: `${ORIGIN}/api/ready`, expect: true },
      { method: 'POST', type: 'Ping', url: `${ORIGIN}/api/ready`, expect: true },
      { method: 'GET', type: 'WebSocket', url: 'ws://127.0.0.1:3301/x', expect: true },
      { method: 'GET', type: 'EventSource', url: `${ORIGIN}/events`, expect: true },
      { method: 'GET', type: 'Image', url: 'https://example.com/pixel.png', expect: true },
      { method: 'GET', type: 'Other', url: 'https://example.com/favicon.ico', expect: true },
      { method: 'GET', type: 'Document', url: `${ORIGIN}/ar/contact`, expect: true },
      { method: 'POST', type: 'Other', url: `${ORIGIN}/brand/x.png`, expect: true },
      { method: 'POST', type: 'Ping', url: `${ORIGIN}/api/e`, postData: '{"e":"sim_start","r":"/ar/try","l":"ar"}', expect: false },
      { method: 'POST', type: 'Ping', url: `${ORIGIN}/api/e`, postData: '{"e":"drop_table","r":"/ar/try","l":"ar"}', expect: true },
      { method: 'POST', type: 'Ping', url: `${ORIGIN}/api/e`, postData: '{"e":"sim_start","r":"/ar/try","l":"ar","id":"x"}', expect: true },
      { method: 'POST', type: 'Ping', url: `${ORIGIN}/api/other`, postData: '{"e":"sim_start","r":"/ar/try","l":"ar"}', expect: true },
      { method: 'POST', type: 'Fetch', url: `${ORIGIN}/api/e`, postData: '{"e":"sim_start","r":"/ar/try","l":"ar"}', expect: true },
      { method: 'POST', type: 'Ping', url: 'https://example.com/api/e', postData: '{"e":"sim_start","r":"/ar/try","l":"ar"}', expect: true },
    ];
    const misclassified = sample.filter((r) => isAppTraffic(r) !== r.expect);
    add('try-network-rule-self-test', misclassified.length === 0, misclassified);
    const neg = await browser.newPage(1440, 1000);
    await neg.goto('/ar/try');
    await neg.waitHydrated('.sim-home[data-home="apt"]');
    const negFrom = neg.requests.length;
    await neg.click('.sim-home[data-home="apt"]');
    await neg.eval(`(async () => { try { await fetch('/__sim-network-negative-test', { cache: 'no-store' }); } catch {} return true; })()`);
    await neg.eval(`navigator.sendBeacon('/__sim-network-negative-beacon', 'x')`);
    await neg.eval(`(async () => { try { await fetch('/api/e', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ e: 'sim_start', r: '/ar/try', l: 'ar' }) }); } catch {} return true; })()`);
    await neg.eval(`navigator.sendBeacon('/api/e', new Blob([JSON.stringify({ e: 'drop_table', r: '/ar/try', l: 'ar' })], { type: 'application/json' }))`);
    await neg.eval(`(async () => { const img = new Image(); img.src = '/brand/otonom/assets/icons/favicon.ico?neg=1'; await new Promise((r) => { img.onload = img.onerror = r; setTimeout(r, 2000); }); return true; })()`);
    await sleep(600);
    const negHits = nonAssetRequests(neg, negFrom);
    add('try-network-rule-negative-fetch-fails', negHits.some((r) => r.type === 'Fetch' && r.url.endsWith('/__sim-network-negative-test')) && negHits.some((r) => r.type === 'Ping' && r.url.endsWith('/__sim-network-negative-beacon')) && !negHits.some((r) => r.url.endsWith('/favicon.ico')), negHits);
    add('try-network-rule-negative-metrics', negHits.some((r) => r.type === 'Fetch' && r.url.endsWith('/api/e')) && negHits.some((r) => r.type === 'Ping' && r.url.endsWith('/api/e') && (r.postData ?? '').includes('drop_table')), negHits.filter((r) => r.url.endsWith('/api/e')));
    const unknown = await fetch(`${BASE}/api/e`, { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0 Safari/537.36' }, body: JSON.stringify({ e: 'drop_table', r: '/ar/try', l: 'ar' }) });
    add('try-metrics-unknown-event-rejected', unknown.status === 400, unknown.status);
    await neg.close();

    const gate = await browser.newPage(1440, 1000);
    await gate.reducedMotion();
    await gate.goto('/ar/try?demo=apartment');
    await gate.waitHydrated('.sim-routine[data-routine="leave"] .sim-play');
    const before = await gate.text('[data-testid="sim-pkg"]');
    await gate.click('.sim-routine[data-routine="leave"] .sim-play');
    await gate.waitFor(`document.querySelector('[data-testid="sim-upsell"]')`, 5000).catch(() => null);
    const up = await gate.eval<any>(`({ text: document.querySelector('[data-testid="sim-upsell"]')?.textContent, routine: document.querySelector('[data-testid="sim-upsell"]')?.closest('.sim-routine')?.dataset.routine, locked: [...document.querySelectorAll('.sim-routine[data-routine="night"] .sim-act[data-locked="true"]')].length })`);
    await gate.click('[data-testid="sim-add-lock"]');
    await gate.waitFor(`document.querySelector('[data-testid="sim-pkg"]')?.textContent === 'Premium'`, 5000).catch(() => null);
    await sleep(400);
    const after = await gate.eval<any>(`({ pkg: document.querySelector('[data-testid="sim-pkg"]')?.textContent, lock: document.querySelector('[data-testid="sim-lock"]')?.getAttribute('aria-checked'), upsell: !!document.querySelector('[data-testid="sim-upsell"]'), door: document.querySelector('[data-testid="sim-door"]')?.textContent, nightLocked: document.querySelectorAll('.sim-routine[data-routine="night"] .sim-act[data-locked="true"]').length })`);
    add('try-premium-gating-upsell', before === 'Essential' && up.routine === 'leave' && /Premium \(44,000 ج\.م\)/.test(up.text ?? '') && up.locked === 1, up);
    add('try-add-lock-recommends-premium', after.pkg === 'Premium' && after.lock === 'true' && !after.upsell && after.nightLocked === 0 && /القفل الذكي/.test(after.door ?? ''), after);
    add('try-gating-browser-errors', cleanIssues(gate.issues).length === 0, cleanIssues(gate.issues));
    await gate.close();

    // ---- 4. Gas state shows the phone-style notification and dismisses ----
    const gas = await browser.newPage(1440, 1000);
    await gas.reducedMotion();
    await gas.goto('/en/try?demo=apartment');
    await gas.waitHydrated('.sim-routine[data-routine="gas"] .sim-play');
    await gas.click('.sim-routine[data-routine="gas"] .sim-play');
    await gas.waitFor(`document.querySelector('[data-testid="sim-gas"]')`, 5000).catch(() => null);
    const alert = await gas.eval<any>(`({ role: document.querySelector('[data-testid="sim-gas"]')?.getAttribute('role'), text: document.querySelector('[data-testid="sim-gas"]')?.textContent, kitchen: [...document.querySelectorAll('.sim-room')].find((n) => n.classList.contains('is-gas'))?.textContent })`);
    await gas.click('[data-testid="sim-gas-ack"]');
    const dismissed = await gas.eval<any>(`({ alert: !!document.querySelector('[data-testid="sim-gas"]'), red: document.querySelectorAll('.sim-room.is-gas').length })`);
    add('try-gas-alert-shows', alert.role === 'alert' && /Gas alert in the kitchen/.test(alert.text ?? '') && /Loud alarm/.test(alert.text ?? '') && /Phone notification/.test(alert.text ?? '') && /Kitchen/.test(alert.kitchen ?? ''), alert);
    add('try-gas-alert-dismisses', !dismissed.alert && dismissed.red === 0, dismissed);
    await gas.close();

    // ---- 5. Reduced motion: no keyframes, no transitions; without it the AC pulse animates ----
    for (const reduce of [true, false]) {
      const motion = await browser.newPage(1440, 1000);
      await motion.reducedMotion(reduce);
      await motion.goto('/ar/try?demo=night');
      await motion.waitFor(`document.querySelector('.sim-ac-pulse')`);
      const m = await motion.eval<any>(`(() => { const all = [...document.querySelectorAll('.sim, .sim *')]; const anim = all.filter((n) => getComputedStyle(n).animationName !== 'none').length; const trans = all.filter((n) => getComputedStyle(n).transitionDuration.split(',').some((d) => parseFloat(d) > 0)).length; return { anim, trans, pulse: getComputedStyle(document.querySelector('.sim-ac-pulse')).animationName }; })()`);
      if (reduce) add('try-reduced-motion-no-animation', m.anim === 0 && m.trans === 0, m);
      else add('try-motion-without-preference', m.pulse === 'sim-pulse', m);
      await motion.close();
    }

    // ---- 6. ?demo= allow-list ----
    const demoFacts: Record<string, unknown> = {};
    for (const [q, expect] of [['?demo=night', 'night'], ['?demo=NIGHT', 'fresh'], ['?demo=%3Cscript%3E', 'fresh'], ['?demo=plan&demo=night', 'plan'], ['?demo=__proto__', 'fresh'], ['?other=1', 'fresh']] as const) {
      const p = await browser.newPage(1024, 900);
      await p.goto(`/en/try${q}`);
      const d = await p.eval<any>(`({ demo: document.querySelector('[data-testid="simulator"]')?.dataset.demo, rooms: document.querySelectorAll('[data-testid="sim-room"]').length, html: document.querySelector('main').innerHTML.includes('script%3E') || document.querySelector('main').innerHTML.includes('<script>') })`);
      demoFacts[q] = d;
      add(`try-demo-allow-list:${q}`, d.demo === expect && (expect === 'fresh' ? d.rooms === 0 : d.rooms > 0) && !d.html, d);
      await p.close();
    }

    // ---- 7. Entry points: 5 pages + drawer + footer (AR and EN) ----
    for (const locale of ['ar', 'en']) {
      for (const route of ['', '/services/smart-home-automation', '/smart-home/packages', '/products', '/products/16r']) {
        const p = await browser.newPage(1440, 1000);
        await p.goto(`/${locale}${route}`);
        const e = await p.eval<any>(`({ entry: [...document.querySelectorAll('main [data-testid="sim-entry"]')].map((n) => n.matches('a') ? n.getAttribute('href') : n.querySelector('a')?.getAttribute('href')), footer: !!document.querySelector('footer a[href="/${locale}/try"]'), drawer: !!document.querySelector('.nav-mobile a[href="/${locale}/try"]') })`);
        add(`entry:${locale}${route || '/'}`, e.entry.length === 1 && e.entry[0] === `/${locale}/try` && e.footer && e.drawer, e);
        await p.close();
      }
    }
    const notOthers = await browser.newPage(1440, 1000);
    await notOthers.goto('/en/products/4r');
    add('entry:not-on-4r', !(await notOthers.exists('main [data-testid="sim-entry"]')), {});
    await notOthers.close();

    // ---- 8. Mobile: bottom bar + sheet, no overflow, 44px targets, AR digits Latin ----
    const mobile = await browser.newPage(390, 844);
    await mobile.touch();
    await mobile.reducedMotion();
    await mobile.goto('/ar/try?demo=apartment');
    await mobile.waitHydrated('[data-testid="sim-mobile-bar"] button');
    const bar = await mobile.eval<any>(`({ bar: getComputedStyle(document.querySelector('[data-testid="sim-mobile-bar"]')).position, aside: getComputedStyle(document.querySelector('.sim-aside')).display, expanded: document.querySelector('[data-testid="sim-mobile-bar"] button').getAttribute('aria-expanded'), overflow: document.documentElement.scrollWidth > innerWidth })`);
    await mobile.click('[data-testid="sim-mobile-bar"] .sim-mobile-row button');
    const sheet = await mobile.eval<any>(`({ expanded: document.querySelector('[data-testid="sim-mobile-bar"] .sim-mobile-row button').getAttribute('aria-expanded'), sheet: !!document.querySelector('.sim-sheet'), lock: !!document.querySelector('.sim-sheet [role="switch"]') })`);
    const targets = await mobile.eval<any>(`(() => { const bad = [...document.querySelectorAll('.sim button, .sim a.btn, .sim input')].filter((n) => n.offsetParent !== null).map((n) => { const r = n.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), t: (n.getAttribute('aria-label') || n.textContent || '').trim().slice(0, 30) }; }).filter((r) => r.w < 44 && r.h < 44 || Math.min(r.w, r.h) < 36 || r.h < 44); return bad.slice(0, 10); })()`);
    const digits = await mobile.eval<number>(`(document.querySelector('.sim').textContent.match(/[٠-٩]/g) || []).length`);
    add('try-mobile-bar-and-sheet', bar.bar === 'fixed' && bar.aside === 'none' && bar.expanded === 'false' && !bar.overflow && sheet.expanded === 'true' && sheet.sheet && sheet.lock, { bar, sheet });
    add('try-mobile-targets-44', targets.length === 0, targets);
    add('try-ar-latin-digits', digits === 0, { digits });
    add('try-mobile-browser-errors', cleanIssues(mobile.issues).length === 0, cleanIssues(mobile.issues));
    await mobile.screenshot('try-ar-390-apartment.png');
    await mobile.close();

    // ---- 9. axe (WCAG 2.0/2.1 A/AA) in every stage state, AR and EN ----
    for (const locale of ['ar', 'en']) for (const width of [1440, 390]) for (const demo of DEMOS) {
      if (locale === 'en' && width === 390 && !['fresh', 'gas', 'plan'].includes(demo)) continue;
      const p = await browser.newPage(width, 900);
      await p.reducedMotion();
      await p.goto(`/${locale}/try${demo === 'fresh' ? '' : `?demo=${demo}`}`);
      await sleep(300);
      const violations = await axe(p);
      add(`try-axe:${locale}-${width}-${demo}`, violations.length === 0, violations);
      await p.close();
    }

    // ---- 10. Keyboard path through all 4 stages (Tab, Enter, Space only) ----
    const kb = await browser.newPage(1440, 1000);
    await kb.reducedMotion();
    await kb.goto('/en/try');
    await kb.waitHydrated('.sim-home[data-home="villa"]');
    const steps: Record<string, number | boolean | string> = {};
    steps.villa = await tabTo(kb, '.sim-home[data-home="villa"]');
    await kb.press('Enter');
    await kb.waitFor(`document.querySelectorAll('[data-testid="sim-room"]').length === 11`, 5000).catch(() => null);
    steps.rooms = await kb.eval<number>(`document.querySelectorAll('[data-testid="sim-room"]').length`);
    steps.inc = await tabTo(kb, '[data-testid="sim-room"]:nth-child(2) .sim-stepper button:last-child');
    await kb.press('Enter');
    steps.lines = await kb.eval<string>(`document.querySelectorAll('[data-testid="sim-lines"]')[1]?.textContent`);
    // Room 2 of the villa preset (a bedroom) starts with AC on; Space switches it off.
    steps.ac = await tabTo(kb, '[data-testid="sim-room"]:nth-child(2) [role="switch"]');
    await kb.press('Space');
    steps.acChecked = await kb.eval<string>(`document.querySelector('[data-testid="sim-room"]:nth-child(2) [role="switch"]').getAttribute('aria-checked')`);
    steps.lock = await tabTo(kb, '[data-testid="sim-lock"]');
    await kb.press('Space');
    steps.premium = await kb.text('[data-testid="sim-pkg"]');
    steps.night = await tabTo(kb, '.sim-daynight button:last-child');
    await kb.press('Enter');
    steps.nightOn = await kb.eval<string>(`document.querySelector('[data-testid="sim-house"]').dataset.night`);
    steps.tile = await tabTo(kb, '.sim-floor .sim-ctl');
    await kb.press('Enter');
    steps.tilePressed = await kb.eval<string>(`document.activeElement.getAttribute('aria-pressed')`);
    steps.heart = await tabTo(kb, '.sim-routine[data-routine="guests"] .sim-heart');
    await kb.press('Enter');
    steps.wa = await tabTo(kb, '[data-testid="sim-whatsapp"]');
    steps.liked = await kb.eval<string>(`[...document.querySelectorAll('.sim-plan .sim-tag')].map((n) => n.textContent).join('|')`);
    steps.focusVisible = await kb.eval<string>(`getComputedStyle(document.activeElement).outlineStyle`);
    add('try-keyboard-four-stages', [steps.villa, steps.inc, steps.ac, steps.lock, steps.night, steps.tile, steps.heart, steps.wa].every((n) => typeof n === 'number' && n > 0) && steps.rooms === 11 && steps.lines === '3' && steps.acChecked === 'false' && steps.premium === 'Premium' && steps.nightOn === 'true' && steps.tilePressed === 'true' && steps.liked === 'Guest mode' && steps.focusVisible !== 'none', steps);
    add('try-keyboard-browser-errors', cleanIssues(kb.issues).length === 0, cleanIssues(kb.issues));
    await kb.close();

    // ---- 11. Language switch keeps the allow-listed demo only ----
    const lang = await browser.newPage(1440, 1000);
    await lang.goto('/ar/try?demo=gas&x=1');
    await lang.waitFor(`document.querySelector('.lang-link')?.getAttribute('href') === '/en/try?demo=gas'`, 8000).catch(() => null);
    add('try-language-switch-keeps-demo', (await lang.eval<string>(`document.querySelector('.lang-link')?.getAttribute('href')`)) === '/en/try?demo=gas', {});
    await lang.close();
  } finally {
    browser.close();
  }
  const failed = checks.filter((c) => !c.pass);
  const result = { at: new Date().toISOString(), base: BASE, total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks };
  writeFileSync(path.join(EVIDENCE, 'sim-browser-local.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ total: result.total, passed: result.passed, failed: failed.map((c) => ({ id: c.id, detail: c.detail })) }, null, 1));
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
