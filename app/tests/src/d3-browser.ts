import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { APP_ROOT } from '@otonom/domain';
import { Browser } from './browser.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const EVIDENCE = process.env.OTONOM_D3_EVIDENCE_DIR ?? path.resolve(APP_ROOT, '..', 'execution', 'evidence', 'd3-services-20261027');
const SHOTS = path.join(EVIDENCE, 'screenshots', 'local');
const PROFILE = path.join(EVIDENCE, '.edge-d3-profile');
const ROUTES = process.env.OTONOM_D3_ROUTE ? [process.env.OTONOM_D3_ROUTE] : ['/services', '/services/software-engineering', '/services/iot-embedded', '/services/custom-engineering', '/services/smart-home-automation'];
const WIDTHS = process.env.OTONOM_D3_WIDTH ? [Number(process.env.OTONOM_D3_WIDTH)] : [390, 1440];

type Check = { id: string; pass: boolean; detail?: unknown };
const checks: Check[] = [];
const add = (id: string, pass: boolean, detail?: unknown) => checks.push({ id, pass, ...(pass ? {} : { detail }) });

async function main() {
  mkdirSync(EVIDENCE, { recursive: true });
  const browser = await Browser.launch(BASE, PROFILE, SHOTS, 9353);
  try {
    for (const locale of ['ar', 'en'] as const) {
      for (const route of ROUTES) {
        for (const width of WIDTHS) {
          const page = await browser.newPage(width, 900);
          if (width === 390) await page.touch();
          await page.reducedMotion();
          await page.goto(`/${locale}${route}`);
          const id = `${locale}${route}@${width}`;
          const facts = await page.eval<{
            h1: number; faq: number; cards: number; forms: number; overflow: boolean;
            reduced: boolean; lang: string; dir: string; serviceLinks: number; activeNav: string;
          }>(`(() => ({
            h1: document.querySelectorAll('main h1').length,
            faq: document.querySelectorAll('.service-faq details').length,
            cards: document.querySelectorAll('.service-card').length,
            forms: document.querySelectorAll('main form').length,
            overflow: document.documentElement.scrollWidth <= window.innerWidth,
            reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
            lang: document.documentElement.lang,
            dir: document.documentElement.dir,
            serviceLinks: document.querySelectorAll('.nav-desktop .service-nav-panel a').length,
            activeNav: document.querySelector('.nav-desktop .service-nav-menu > summary')?.getAttribute('aria-current') || '',
          }))()`);
          add(`${id}:structure`, facts.h1 === 1 && facts.faq >= 5 && facts.cards >= 14, facts);
          add(`${id}:locale`, facts.lang === locale && facts.dir === (locale === 'ar' ? 'rtl' : 'ltr'), facts);
          add(`${id}:responsive`, facts.overflow, facts);
          add(`${id}:privacy`, facts.forms === 0, facts.forms);
          add(`${id}:reduced-motion`, facts.reduced, facts.reduced);
          add(`${id}:service-navigation`, facts.serviceLinks === 5 && facts.activeNav === 'page', facts);
          if (route === '/services') {
            await page.waitHydrated('.service-discovery .service-selector-tabs button');
            if (width === 1440) {
              const focused = await page.eval<boolean>(`(() => { const el = document.querySelector('.service-discovery .service-selector-tabs button:last-child'); el?.focus(); return document.activeElement === el; })()`);
              add(`${id}:starting-point-focus`, focused);
              await page.press('Enter');
            } else {
              await page.click('.service-discovery .service-selector-tabs button:last-child');
            }
            const start = await page.eval<{ pressed: boolean; href: string; text: string }>(`(() => ({
              pressed: document.querySelector('.service-discovery .service-selector-tabs button:last-child')?.getAttribute('aria-pressed') === 'true',
              href: document.querySelector('.service-discovery .service-selector-result a')?.getAttribute('href') || '',
              text: document.querySelector('.service-discovery .service-selector-result')?.textContent || '',
            }))()`);
            add(`${id}:starting-point`, start.pressed && start.href === `/${locale}/build-with-us#not-sure` && start.text.length > 40, start);
            await page.click('.service-stack .service-selector-tabs button:nth-child(4)');
            const stack = await page.eval<{ pressed: boolean; href: string }>(`(() => ({
              pressed: document.querySelector('.service-stack .service-selector-tabs button:nth-child(4)')?.getAttribute('aria-pressed') === 'true',
              href: document.querySelector('.service-stack .service-selector-result a')?.getAttribute('href') || '',
            }))()`);
            add(`${id}:stack-explorer`, stack.pressed && stack.href.includes('/services/software-engineering#apis'), stack);
          }
          const nav = width === 390 ? '.nav-mobile' : '.nav-desktop';
          if (width === 390) {
            await page.eval(`(() => { const el = document.querySelector('.menu-mobile > summary'); el?.focus(); return document.activeElement === el; })()`);
            await page.press('Enter');
          }
          const navFocused = await page.eval<boolean>(`(() => { const el = document.querySelector('${nav} .service-nav-menu > summary'); el?.focus(); return document.activeElement === el; })()`);
          add(`${id}:nav-focus`, navFocused);
          await page.press('Enter');
          add(`${id}:nav-keyboard`, await page.eval<boolean>(`document.querySelector('${nav} .service-nav-menu')?.hasAttribute('open') === true`));
          await page.press('Enter');
          add(`${id}:nav-close-keyboard`, await page.eval<boolean>(`document.querySelector('${nav} .service-nav-menu')?.hasAttribute('open') === false`));
          add(`${id}:issues`, page.issues.length === 0, page.issues);
          if (route === '/services' && (width === 390 || width === 1440)) await page.screenshot(`${locale}-services-${width}.png`);
          await page.close();
        }
      }
    }
  } finally {
    browser.close();
  }

  const result = {
    at: new Date().toISOString(), base: BASE,
    method: 'Installed Microsoft Edge headless over CDP; mobile touch and reduced-motion emulation',
    locales: ['ar', 'en'], routes: ROUTES, widths: WIDTHS,
    total: checks.length, passed: checks.filter((check) => check.pass).length,
    failed: checks.filter((check) => !check.pass),
  };
  writeFileSync(path.join(EVIDENCE, 'd3-browser-local.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ total: result.total, passed: result.passed, failed: result.failed.length }));
  if (result.failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
});
