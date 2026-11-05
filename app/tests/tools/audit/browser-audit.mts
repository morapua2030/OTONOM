// D8-A §3.1/3.2/3.5/3.6/3.7: headless Edge (existing CDP driver) per PUBLIC route × locale × {390, 1440} (+640 zoom check):
// axe-core (wcag2a/wcag2aa/wcag21aa), headings, images, brand shell, script heuristics, console/network, reduced motion,
// screenshots. Keyboard + mobile-menu checks at 1440/390. Read-only browsing; no form submissions.
// Usage (from app/tests): npx tsx <this> <base> <outDir> [phase=all|pages|keyboard|errors] [routeFilter]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { Browser, type Page } from '../../src/browser.ts';
// @ts-ignore plain ESM helper
import { ROUTES, LOCALES, ERRORS, slugOf } from './routes.mjs';

const [base, out, phase = 'all', filter = ''] = process.argv.slice(2);
const require = createRequire(new URL('../../package.json', import.meta.url));
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const AXE_VERSION = JSON.parse(readFileSync(require.resolve('axe-core/package.json'), 'utf8')).version;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
mkdirSync(out, { recursive: true });
const PUBLIC = (ROUTES as any[]).filter((r) => ['PUBLIC-INDEXED', 'PUBLIC-NOINDEX'].includes(r.cls) && (!filter || r.path.includes(filter)));

function cdp(page: Page) { const p = page as any; return { send: (m: string, params: object = {}) => p.cdp.send(m, params, p.sid), on: (fn: (m: string, x: any) => void) => p.cdp.on(p.sid, fn) }; }
async function key(page: Page, k: 'Tab' | 'Escape' | 'Enter', shift = false) {
  const c = cdp(page); const vk = { Tab: 9, Escape: 27, Enter: 13 }[k];
  const base = { key: k, code: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: shift ? 8 : 0 };
  await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
  if (k === 'Enter') await c.send('Input.dispatchKeyEvent', { type: 'char', text: '\r', unmodifiedText: '\r', ...base });
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
async function open(browser: Browser, url: string, width: number, height = 900) {
  const page = await browser.newPage(width, height);
  if (width < 768) await page.touch();
  await page.reducedMotion();
  const http4xx: string[] = [];
  cdp(page).on((m, x) => { if (m === 'Network.responseReceived' && x.response?.status >= 400 && x.type !== 'Document') http4xx.push(`${x.response.status} ${String(x.response.url).replace(base, '').split('?')[0]}`); });
  await page.goto(url);
  await page.waitFor(`document.readyState === 'complete'`, 20000).catch(() => undefined);
  await page.eval(`document.fonts ? document.fonts.ready.then(() => true) : true`).catch(() => undefined);
  await sleep(400);
  return { page, http4xx };
}

// In-page facts (evaluated in the document). Returns serialisable data only.
const FACTS = String.raw`(() => {
  const vis = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && (r.width > 0 || r.height > 0); };
  const sel = (el) => { if (!el || el === document.body) return 'body'; const id = el.id ? '#' + el.id : ''; const cls = [...el.classList].slice(0, 2).map((c) => '.' + c).join(''); return el.tagName.toLowerCase() + id + cls; };
  const pathOf = (el) => { const p = []; for (let e = el; e && e !== document.body && p.length < 4; e = e.parentElement) p.unshift(sel(e)); return p.join(' > '); };
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => vis(h) && !h.closest('[aria-hidden="true"]')).map((h) => ({ level: +h.tagName[1], text: h.textContent.trim().slice(0, 70), at: pathOf(h) }));
  const skips = []; for (let i = 1; i < headings.length; i++) if (headings[i].level > headings[i - 1].level + 1) skips.push({ from: headings[i - 1], to: headings[i] });
  const imgs = [...document.images].map((i) => ({ src: (i.getAttribute('src') || '').split('?')[0].slice(0, 120), alt: i.getAttribute('alt'), w: i.getAttribute('width'), h: i.getAttribute('height'), cls: i.className, at: pathOf(i), loaded: i.complete && i.naturalWidth > 0, lazy: i.loading === 'lazy' }));
  const header = document.querySelector('header.header img.brand-logo-header');
  const footer = document.querySelector('footer.footer img.brand-logo-footer');
  const logoish = imgs.filter((i) => /logo|brand/i.test(i.src + ' ' + i.cls) && !i.src.startsWith('/brand/otonom/assets/'));
  const fav = [...document.querySelectorAll('link[rel~="icon"]')].map((l) => l.getAttribute('href'));
  const og = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null;
  // Script heuristics
  const BRAND = /\b(OTONOM|IOT SOLUTIONS|IoT|Wi-?Fi|API|KNX|Zigbee|Z-Wave|Matter|Bluetooth|RS-?485|Modbus|DALI|MQTT|HTTP|HTTPS|CMS|R&D|UI|UX|RFQ|PDF|SKU|LED|AC|DC|PIR|USB|ID|Premium|Plus|Essential|Tuya|Alexa|Google|Apple|HomeKit|Android|iOS|Smart Life)\b/g;
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const latinInAr = [], arabicInEn = [], unisolated = [];
  const lang = document.documentElement.lang;
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const el = n.parentElement; if (!el || el.closest('script,style,noscript,template,[hidden]') || !vis(el)) continue;
    const t = n.textContent.replace(/\s+/g, ' ').trim(); if (!t) continue;
    const scoped = el.closest('[lang]')?.getAttribute('lang') || lang;
    if (lang === 'ar' && scoped === 'ar') {
      const stripped = t.replace(BRAND, ' ').replace(/\b\d+\s?R\b|\bR\d+\b/g, ' ');
      if (/[A-Za-z]{2,}(?:[\s,.'’:-]+[A-Za-z]{2,}){2,}/.test(stripped)) latinInAr.push({ text: t.slice(0, 120), at: pathOf(el) });
      const mixed = /[\u0600-\u06FF]/.test(t) && /[A-Za-z0-9\u0660-\u0669]/.test(t);
      if (mixed && /[A-Za-z0-9]/.test(t) && !el.closest('[dir="ltr"],bdi') && !/[\u2066\u2068]/.test(t)) unisolated.push({ text: t.slice(0, 120), at: pathOf(el) });
    }
    if (lang === 'en' && scoped === 'en' && /[\u0600-\u06FF]/.test(t)) arabicInEn.push({ text: t.slice(0, 120), at: pathOf(el) });
  }
  // Arabic letter touching an isolated LTR run (same geometry rule as tests/src/visual.ts BIDI-SPACING) + Arabic-Indic digits
  const touch = [], indic = [];
  if (lang === 'ar') {
    const LETTER = /[ء-ؿف-ي]/, PREFIX = /(^|[\s («])[وبلفك]$/;
    const texts = []; const tw3 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let tn = tw3.nextNode(); tn; tn = tw3.nextNode()) if (tn.nodeValue && tn.parentElement && !tn.parentElement.closest('script,style,noscript,template')) texts.push(tn);
    for (const tn of texts) if (/[٠-٩۰-۹]/.test(tn.nodeValue) && vis(tn.parentElement)) indic.push({ text: tn.nodeValue.trim().slice(0, 80), at: pathOf(tn.parentElement) });
    const charRect = (node, i) => { const r = document.createRange(); r.setStart(node, i); r.setEnd(node, i + 1); return r.getBoundingClientRect(); };
    for (const b of [...document.querySelectorAll('bdi[dir=ltr], bdi.ltr')].filter((x) => !x.parentElement.closest('bdi[dir=ltr], bdi.ltr') && x.getClientRects().length)) {
      const inner = texts.filter((x) => b.contains(x)); if (!inner.length) continue;
      const rects = [...b.getClientRects()];
      for (const side of ['before', 'after']) {
        const node = texts[texts.indexOf(side === 'before' ? inner[0] : inner[inner.length - 1]) + (side === 'before' ? -1 : 1)];
        if (!node || b.contains(node)) continue;
        const raw = node.nodeValue; const at = side === 'before' ? raw.search(/\S\s*$/) : raw.search(/\S/);
        if (at < 0 || !LETTER.test(raw[at]) && raw[at] !== 'ـ') continue;
        const spaced = side === 'before' ? at < raw.length - 1 : at > 0; const lr = charRect(node, at); if (!lr.width) continue;
        const br = rects.reduce((best, r) => (Math.min(r.bottom, lr.bottom) - Math.max(r.top, lr.top) > Math.min(best.bottom, lr.bottom) - Math.max(best.top, lr.top) ? r : best), rects[0]);
        if (Math.min(br.bottom, lr.bottom) - Math.max(br.top, lr.top) < Math.min(br.height, lr.height) * 0.5) continue;
        const gap = side === 'before' ? lr.left - br.right : br.left - lr.right;
        if (gap >= 2) continue;
        if (side === 'before' && !spaced && (PREFIX.test(raw.slice(0, at + 1)) || raw[at] === 'ـ')) continue;
        touch.push({ text: (spaced ? 'space lost ' : 'no space ') + side + ': ' + raw.slice(Math.max(0, at - 12), at + 12).trim() + ' | ' + b.textContent, at: pathOf(b) });
      }
    }
  }
  // Reduced motion (emulated): remaining transform transitions/animations and smooth scrolling
  const motion = [];
  if (getComputedStyle(document.documentElement).scrollBehavior === 'smooth') motion.push({ at: 'html', what: 'scroll-behavior: smooth' });
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    const anim = s.animationName !== 'none' && s.animationDuration.split(',').some((d) => parseFloat(d) > 0.01);
    const props = s.transitionProperty.split(',').map((x) => x.trim()); const durs = s.transitionDuration.split(',').map((d) => parseFloat(d));
    const tr = props.some((p, i) => (p === 'transform' || p === 'all' || p === 'translate' || p === 'scale' || p === 'rotate') && (durs[i] ?? durs[0]) > 0.01);
    if (anim || tr) motion.push({ at: pathOf(el), what: anim ? 'animation ' + s.animationName + ' ' + s.animationDuration : 'transition ' + s.transitionProperty + ' ' + s.transitionDuration });
    if (s.scrollBehavior === 'smooth') motion.push({ at: pathOf(el), what: 'scroll-behavior: smooth' });
  }
  // Personal-data fields (intake must stay disabled)
  const pii = [...document.querySelectorAll('input,textarea,select')].filter((f) => vis(f) && (/^(email|tel)$/.test(f.type) || f.tagName === 'TEXTAREA' || /name|email|phone|mobile|tel|company|address|message/i.test((f.name || '') + ' ' + (f.autocomplete || '') + ' ' + (f.id || '')))).map((f) => ({ tag: f.tagName, type: f.type, name: f.name, id: f.id }));
  const controls = [...document.querySelectorAll('input,select,textarea,button')].filter(vis).length;
  const live = [...document.querySelectorAll('[role="alert"],[role="status"],[aria-live]')].map((e) => sel(e) + ':' + (e.getAttribute('role') || e.getAttribute('aria-live')));
  const ids = new Set([...document.querySelectorAll('[id]')].map((e) => e.id));
  const links = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
  return {
    title: document.title, lang, dir: document.documentElement.dir, h1: document.querySelectorAll('h1').length, h1Text: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim().slice(0, 80)),
    headings: headings.length, headingSkips: skips, imgsNoAlt: imgs.filter((i) => i.alt === null), imgsNoDims: imgs.filter((i) => !i.w || !i.h), imgsBroken: imgs.filter((i) => !i.loaded && !i.lazy), imgCount: imgs.length,
    headerLogo: header?.getAttribute('src') || null, footerLogo: footer?.getAttribute('src') || null, logoish, favicon: fav, og,
    overflow: document.documentElement.scrollWidth > innerWidth + 1, scrollWidth: document.documentElement.scrollWidth, innerWidth,
    latinInAr: latinInAr.slice(0, 30), arabicInEn: arabicInEn.slice(0, 30), unisolated: unisolated.slice(0, 30), motion: motion.slice(0, 30), touch: touch.slice(0, 30), indic: indic.slice(0, 30),
    pii, controls, live, preview: !!document.querySelector('.banner[role="status"]'), robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || null,
    ids: [...ids], links,
  };
})()`;

async function axe(page: Page) {
  await page.eval(`${AXE};true`);
  return page.eval<any>(`axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }, resultTypes: ['violations'] }).then((r) => r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 6).map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 160), summary: (n.failureSummary || '').slice(0, 220) })) })))`);
}

async function pages(browser: Browser) {
  const results: any[] = [];
  const shotsRoot = path.join(out, 'screens');
  for (const route of PUBLIC) for (const locale of LOCALES) for (const width of [390, 768, 1440]) {
    const url = `/${locale}${route.path}`;
    const { page, http4xx } = await open(browser, url, width, width < 768 ? 844 : 1000);
    const facts = await page.eval<any>(FACTS);
    const violations = await axe(page).catch((e) => [{ id: 'axe-error', impact: 'n/a', help: String(e).slice(0, 200), nodes: 0, targets: [] }]);
    const shot = path.join('screens', locale, String(width), `${slugOf(route.path)}.png`);
    mkdirSync(path.join(shotsRoot, locale, String(width)), { recursive: true });
    (page as any).shotsDir = path.join(shotsRoot, locale, String(width));
    await page.screenshot(`${slugOf(route.path)}.png`);
    results.push({ url, path: route.path, cls: route.cls, locale, width, shot, at: new Date().toISOString(), facts: { ...facts, ids: undefined, links: undefined }, links: facts.links, ids: facts.ids, violations, issues: page.issues.filter((i) => i.kind !== 'third-party' || true), http4xx });
    await page.close();
    // 200% zoom equivalent (640 CSS px)
    if (width === 1440) {
      const z = await open(browser, url, 640, 900);
      const o = await z.page.eval<any>(`({ overflow: document.documentElement.scrollWidth > innerWidth + 1, scrollWidth: document.documentElement.scrollWidth, wide: [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('[role=region][tabindex],.table-scroll,[data-scroll]'); }).slice(0, 5).map((e) => e.tagName.toLowerCase() + '.' + [...e.classList].join('.')) })`);
      results[results.length - 1].zoom640 = o;
      await z.page.close();
    }
    process.stdout.write(`.${results.length % 40 === 0 ? `${results.length}\n` : ''}`);
  }
  writeFileSync(path.join(out, 'pages.json'), JSON.stringify({ at: new Date().toISOString(), base, axe: AXE_VERSION, results }, null, 1));
  console.log(`\npages: ${results.length}`);
}

async function keyboard(browser: Browser) {
  const log: any[] = [];
  for (const route of PUBLIC) for (const locale of LOCALES) {
    const url = `/${locale}${route.path}`;
    const { page } = await open(browser, url, 1440, 1000);
    const entry: any = { url, width: 1440 };
    await key(page, 'Tab');
    entry.firstTab = await page.eval<any>(`(() => { const a = document.activeElement; const s = getComputedStyle(a); const r = a.getBoundingClientRect(); return { el: a.tagName.toLowerCase() + '.' + a.className, href: a.getAttribute('href'), outline: s.outlineStyle + ' ' + s.outlineWidth, shadow: s.boxShadow, inView: r.top >= 0 && r.bottom <= innerHeight && r.width > 0 }; })()`);
    entry.skipOk = /a\.skip/.test(entry.firstTab.el) && entry.firstTab.href === '#main';
    await key(page, 'Enter'); await sleep(150);
    entry.afterSkip = await page.eval<any>(`({ hash: location.hash, active: document.activeElement.tagName.toLowerCase() + (document.activeElement.id ? '#' + document.activeElement.id : '') })`);
    await key(page, 'Tab');
    entry.tabAfterSkipInMain = await page.eval<boolean>(`!!document.activeElement.closest('main')`);
    await page.close();
    // Full tab walk from a fresh load
    const w = await open(browser, url, 1440, 1000);
    const focusables = await w.page.eval<number>(`[...document.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')].filter((e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0 && !e.closest('[inert],[aria-hidden="true"]') && ![...document.querySelectorAll('details:not([open])')].some((d) => d.contains(e) && d.querySelector(':scope > summary') !== e); }).length`);
    const seen: string[] = []; const invisible: any[] = []; let cycled = false;
    for (let i = 0; i < Math.min(400, focusables * 2 + 10); i++) {
      await key(w.page, 'Tab');
      await sleep(60);
      const f = await w.page.eval<any>(`(() => { const a = document.activeElement; if (!a || a === document.body) return { body: true }; if (!a.dataset.d8aId) a.dataset.d8aId = String(Math.random()).slice(2, 10); const s = getComputedStyle(a); const r = a.getBoundingClientRect();
        const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none');
        return { id: a.dataset.d8aId, el: a.tagName.toLowerCase() + (a.className && typeof a.className === 'string' ? '.' + a.className.split(' ').slice(0, 2).join('.') : ''), text: (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 50), href: a.getAttribute('href'), ring, focusVisible: a.matches(':focus-visible'), inView: r.bottom > 0 && r.top < innerHeight && r.width > 0 }; })()`);
      if (f.body) { cycled = true; break; }
      if (seen.includes(f.id)) { cycled = true; break; }
      seen.push(f.id);
      if (!f.ring || !f.inView) invisible.push(f);
    }
    entry.focusables = focusables; entry.reached = seen.length; entry.cycled = cycled; entry.focusNotVisible = invisible.slice(0, 12); entry.focusNotVisibleCount = invisible.length;
    entry.trapSuspect = !cycled && seen.length < focusables;
    await w.page.close();
    log.push(entry);
    process.stdout.write('k');
  }
  // Mobile menu at 390: open with keyboard, Escape closes, focus returns
  for (const locale of LOCALES) for (const p of ['', '/products', '/smart-home/packages']) {
    const url = `/${locale}${p}`;
    const { page } = await open(browser, url, 390, 844);
    const m: any = { url, width: 390, menu: true };
    let reached = false;
    for (let i = 0; i < 15 && !reached; i++) { await key(page, 'Tab'); reached = await page.eval<boolean>(`document.activeElement?.matches('.menu-mobile > summary')`); }
    m.summaryReachable = reached;
    if (reached) {
      await key(page, 'Enter'); await sleep(150);
      m.openedByEnter = await page.eval<boolean>(`document.querySelector('.menu-mobile').open`);
      await key(page, 'Tab');
      m.focusIntoMenu = await page.eval<boolean>(`!!document.activeElement.closest('.menu-mobile nav')`);
      await key(page, 'Escape'); await sleep(150);
      m.closedByEscape = await page.eval<boolean>(`!document.querySelector('.menu-mobile').open`);
      m.focusAfterEscape = await page.eval<string>(`document.activeElement.tagName.toLowerCase() + '.' + (document.activeElement.className || '')`);
      // Close with Enter on summary as fallback
      if (!m.closedByEscape) { await page.eval(`document.querySelector('.menu-mobile > summary').focus()`); await key(page, 'Enter'); await sleep(150); m.closedByEnterOnSummary = await page.eval<boolean>(`!document.querySelector('.menu-mobile').open`); }
    }
    // Desktop services menu (details) at 1440: Escape
    await page.close();
    const d = await open(browser, url, 1440, 1000);
    let sReached = false;
    for (let i = 0; i < 15 && !sReached; i++) { await key(d.page, 'Tab'); sReached = await d.page.eval<boolean>(`document.activeElement?.matches('.service-nav-menu > summary')`); }
    m.servicesSummaryReachable = sReached;
    if (sReached) { await key(d.page, 'Enter'); await sleep(150); m.servicesOpened = await d.page.eval<boolean>(`document.querySelector('.service-nav-menu').open`); await key(d.page, 'Escape'); await sleep(150); m.servicesClosedByEscape = await d.page.eval<boolean>(`!document.querySelector('.service-nav-menu').open`); }
    await d.page.close();
    log.push(m);
  }
  writeFileSync(path.join(out, 'keyboard-log.json'), JSON.stringify({ at: new Date().toISOString(), base, log }, null, 1));
  console.log(`\nkeyboard: ${log.length}`);
}

async function errors(browser: Browser) {
  const res: any[] = [];
  for (const url of ERRORS as string[]) for (const width of [390, 1440]) {
    const { page, http4xx } = await open(browser, url, width, width < 768 ? 844 : 1000);
    await sleep(800);
    const f = await page.eval<any>(`({ lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title, header: !!document.querySelector('header.header .brand-logo-header'), footer: !!document.querySelector('footer.footer .brand-logo-footer'), notFound: !!document.querySelector('.not-found'), h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()), home: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h === '/ar' || h === '/en' || h === '/'), skip: !!document.querySelector('a.skip'), text: document.body.innerText.slice(0, 160) })`);
    const dir = path.join(out, 'screens', 'errors', String(width)); mkdirSync(dir, { recursive: true }); (page as any).shotsDir = dir;
    const name = `${url.slice(1).replaceAll('/', '__')}.png`; await page.screenshot(name);
    res.push({ url, width, shot: path.join('screens', 'errors', String(width), name), ...f, issues: page.issues, http4xx });
    await page.close();
  }
  writeFileSync(path.join(out, 'errors.json'), JSON.stringify({ at: new Date().toISOString(), res }, null, 1));
  console.log(`errors: ${res.length}`);
}

const browser = await Browser.launch(base, path.join(out, '.edge-d8a-profile'), path.join(out, 'screens'), 9381);
try {
  if (phase === 'all' || phase === 'errors') await errors(browser);
  if (phase === 'all' || phase === 'pages') await pages(browser);
  if (phase === 'all' || phase === 'keyboard') await keyboard(browser);
} finally { browser.close(); }
