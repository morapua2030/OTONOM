import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { APP_ROOT } from '@otonom/domain';
import { Browser } from './browser.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3314';
const EVIDENCE = process.env.OTONOM_D4_EVIDENCE_DIR ?? path.resolve(APP_ROOT, '..', 'execution', 'evidence', 'website-d4-20261027');
const checks: { id: string; pass: boolean; detail?: unknown }[] = [];
const add = (id: string, pass: boolean, detail?: unknown) => checks.push({ id, pass, ...(pass ? {} : { detail }) });
const widths = [320, 375, 768, 1024, 1440, 1920];

async function main() {
  mkdirSync(EVIDENCE, { recursive: true });
  const buildDir = path.join(EVIDENCE, 'fixture-bundle');
  const require = createRequire(import.meta.url);
  const esbuild = require(createRequire(require.resolve('tsx')).resolve('esbuild'));
  await esbuild.build({ entryPoints: [path.join(APP_ROOT, 'web/test/portfolio-browser-fixture.tsx')], bundle: true, outdir: buildDir, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'fixture-next', setup(build: any) {
    build.onResolve({ filter: /^next\/(image|navigation)$/ }, (args: any) => ({ path: args.path, namespace: 'fixture-next' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture-next' }, (args: any) => ({ contents: args.path === 'next/navigation' ? 'export function usePathname(){return location.pathname}' : 'import React from "react"; export default function Image({priority,sizes,...props}){return React.createElement("img",props)}', resolveDir: path.join(APP_ROOT, 'web'), loader: 'js' }));
  } }] });
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (['/portfolio-browser-fixture.js', '/portfolio-browser-fixture.css'].includes(url.pathname)) {
      res.setHeader('content-type', url.pathname.endsWith('.js') ? 'text/javascript' : 'text/css');
      res.end(readFileSync(path.join(buildDir, url.pathname.slice(1))));
    } else if (/^\/products\/otonom-(4r|6r|16r)\.png$/.test(url.pathname)) {
      res.setHeader('content-type', 'image/png'); res.end(readFileSync(path.join(APP_ROOT, 'web/public', url.pathname)));
    } else if (url.pathname === '/favicon.ico') { res.writeHead(204).end(); }
    else { res.setHeader('content-type', 'text/html; charset=utf-8'); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/portfolio-browser-fixture.css"></head><body><div id="root"></div><script src="/portfolio-browser-fixture.js"></script></body></html>'); }
  });
  await new Promise<void>((resolve) => server.listen(3317, '127.0.0.1', resolve));
  const browser = await Browser.launch(BASE, path.join(EVIDENCE, '.edge-d4-profile'), path.join(EVIDENCE, 'screenshots'), 9354);
  let browserOpen = true;
  let fixtureBrowser: Browser | undefined;
  try {
    for (const locale of ['ar', 'en']) {
      for (const width of widths) {
        const page = await browser.newPage(width, 900);
        if (width < 768) await page.touch();
        await page.reducedMotion();
        await page.goto(`/${locale}/projects`);
        await page.waitHydrated('#project-search');
        await page.waitFor(`[...document.querySelectorAll('.pf-product img')].every((image) => image.complete && image.naturalWidth > 0)`, 20_000, 'portfolio product images');
        const facts = await page.eval<any>(`({ h1: document.querySelectorAll('main h1').length, cards: document.querySelectorAll('[data-project]').length, overflow: document.documentElement.scrollWidth > innerWidth, lang: document.documentElement.lang, dir: document.documentElement.dir, images: [...document.querySelectorAll('.pf-product img')].every(i=>i.complete&&i.naturalWidth>0), active: document.querySelector('.nav-desktop a[href="/${locale}/projects"]')?.getAttribute('aria-current') })`);
        add(`${locale}@${width}:page`, facts.h1 === 1 && facts.cards === 0 && facts.lang === locale && facts.dir === (locale === 'ar' ? 'rtl' : 'ltr'), facts);
        add(`${locale}@${width}:layout`, !facts.overflow && facts.images && facts.active === 'page', facts);
        add(`${locale}@${width}:browser-errors`, page.issues.length === 0, page.issues);
        await page.fill('#project-search', 'مستشعر');
        await page.waitFor(`new URLSearchParams(location.search).get('q') === 'مستشعر'`);
        add(`${locale}@${width}:url`, await page.eval(`document.querySelector('.header-actions a[hreflang]')?.getAttribute('href').includes('q=')`));
        await page.click('.pf-results-bar a');
        add(`${locale}@${width}:reset-focus`, await page.eval(`location.search === '' && document.activeElement.id === 'project-search'`));
        await page.screenshot(`${locale}-portfolio-${width}.png`);
        await page.close();
      }
    }
    browser.close();
    browserOpen = false;
    fixtureBrowser = await Browser.launch('http://127.0.0.1:3317', path.join(EVIDENCE, '.edge-d4-fixture-profile'), path.join(EVIDENCE, 'screenshots'), 9355);
    // Synthetic fixture exercises non-empty layouts/interactions WITHOUT production seed data or a test route.
    for (const locale of ['ar', 'en']) {
      const page = await fixtureBrowser.newPage(1440, 960);
      await page.goto(`/${locale}/projects`);
      await page.waitHydrated('#project-search');
      const count = () => page.eval<number>(`document.querySelectorAll('.pf-explorer [data-project]').length`);
      add(`${locale}:fixture-all`, await count() === 3);
      for (const category of ['software', 'iot', 'embedded', 'smart-home', 'custom']) {
        await page.click(`.pf-filters a[href*="category=${category}"]`);
        add(`${locale}:fixture-category:${category}`, await count() === 1);
      }
      await page.click('.pf-filters a[href*="category=iot"]');
      await page.fill('#project-search', 'controller');
      await page.waitFor(`new URLSearchParams(location.search).get('q') === 'controller'`);
      add(`${locale}:fixture-combined`, await count() === 1);
      await page.fill('#project-search', 'unknown');
      await page.waitFor(`new URLSearchParams(location.search).get('q') === 'unknown'`);
      add(`${locale}:fixture-empty`, await count() === 0);
      await page.eval('history.back()');
      await page.waitFor(`document.querySelector('#project-search').value === 'controller'`);
      add(`${locale}:fixture-back`, await count() === 1);
      await page.eval('history.forward()');
      await page.waitFor(`document.querySelector('#project-search').value === 'unknown'`);
      add(`${locale}:fixture-forward`, await count() === 0);
      await page.goto(`http://127.0.0.1:3317/${locale}/projects?category=embedded&q=${encodeURIComponent('تحكم')}`);
      await page.waitHydrated('#project-search');
      add(`${locale}:fixture-deeplink`, await count() === 1);
      await page.click('a[hreflang]');
      await page.waitHydrated('#project-search');
      add(`${locale}:fixture-locale`, await count() === 1 && await page.eval(`new URLSearchParams(location.search).get('category') === 'embedded'`));
      await page.close();
      for (const width of [320, 375, 1440]) for (const variant of ['?count=0', '?count=1', '?count=30', '/test-only-alpha', '/test-only-alpha?minimal=1']) {
        const sample = await fixtureBrowser.newPage(width, 960);
        await sample.goto(`/${locale}/projects${variant}`);
        await sample.waitFor(`document.querySelector('main h1')`);
        add(`${locale}@${width}:fixture:${variant}`, await sample.eval(`document.documentElement.scrollWidth <= innerWidth && document.querySelectorAll('main h1').length === 1`));
        add(`${locale}@${width}:fixture-errors:${variant}`, sample.issues.length === 0, sample.issues);
        if (variant === '/test-only-alpha' || variant === '?count=1') await sample.screenshot(`${locale}-fixture-${width}-${variant.startsWith('/') ? 'detail' : 'single'}.png`);
        await sample.close();
      }
    }
  } finally {
    if (browserOpen) browser.close();
    fixtureBrowser?.close();
    server.close();
  }
  const result = { at: new Date().toISOString(), target: BASE, browser: 'Microsoft Edge', fixture: 'Isolated loopback synthetic component harness; NOT hosted project evidence', total: checks.length, failed: checks.filter((c) => !c.pass).length, checks };
  writeFileSync(path.join(EVIDENCE, 'd4-browser-local.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ total: result.total, failed: result.failed }));
  if (result.failed) process.exitCode = 1;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
