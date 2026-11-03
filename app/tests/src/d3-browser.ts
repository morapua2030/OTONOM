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
type Facts = { faq: number; cards: number; entry: number; disciplines: string[]; packages: number; controllers: number; cta: boolean; band: boolean };
// Design v3.1 copy: IoT and Software have 6 cards and 4 questions, Custom has 3 cards and 3 questions.
const FAQ_COUNT: Record<string, number> = { '/services/software-engineering': 4, '/services/iot-embedded': 4, '/services/custom-engineering': 3 };
const CARD_COUNT: Record<string, number> = { '/services/software-engineering': 6, '/services/iot-embedded': 6, '/services/custom-engineering': 3 };
const serviceTemplate = (route: string) => (f: Facts) => f.faq === FAQ_COUNT[route] && f.cards === CARD_COUNT[route] && f.entry === 4 && f.cta;
const STRUCTURE: Record<string, (f: Facts, locale: string) => boolean> = {
  '/services': (f, locale) => f.cta && JSON.stringify(f.disciplines) === JSON.stringify(['iot-embedded', 'software-engineering', 'smart-home-automation', 'custom-engineering'].map((slug) => `/${locale}/services/${slug}`)),
  '/services/software-engineering': serviceTemplate('/services/software-engineering'),
  '/services/iot-embedded': serviceTemplate('/services/iot-embedded'),
  '/services/custom-engineering': serviceTemplate('/services/custom-engineering'),
  // Design "01 Home": the page closes with the Alexa band (Book a visit on WhatsApp), not the navy CTA band.
  '/services/smart-home-automation': (f) => f.packages === 3 && f.controllers === 3 && f.band,
};
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
            h1: number; faq: number; cards: number; entry: number; disciplines: string[]; packages: number; controllers: number; cta: boolean; band: boolean; forms: number; overflow: boolean;
            reduced: boolean; lang: string; dir: string; serviceLinks: number; activeNav: string;
          }>(`(() => ({
            h1: document.querySelectorAll('main h1').length,
            faq: document.querySelectorAll('main [data-testid="faq"] button[aria-expanded]').length,
            cards: document.querySelectorAll('main .v3-cards > li.v2-card').length,
            entry: document.querySelectorAll('main .v2-entry a.v2-chip[href^="https://wa.me/"][target="_blank"][rel~="noopener"]').length,
            disciplines: [...document.querySelectorAll('main .v2-grid-4 .v2-arrow-link')].map((node) => node.getAttribute('href')),
            packages: document.querySelectorAll('main .v2-pkg-card[data-package]').length,
            controllers: document.querySelectorAll('main .v3-ctrl-card').length,
            cta: !!document.querySelector('main [data-testid="cta-book"]'),
            band: !!document.querySelector('main .v2-band-dark a[href^="https://wa.me/"]'),
            forms: document.querySelectorAll('main form').length,
            overflow: document.documentElement.scrollWidth <= window.innerWidth,
            reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
            lang: document.documentElement.lang,
            dir: document.documentElement.dir,
            serviceLinks: document.querySelectorAll('.nav-desktop .service-nav-panel a').length,
            activeNav: document.querySelector('.nav-desktop .service-nav-menu > summary')?.getAttribute('aria-current') || '',
          }))()`);
          // D8-C v3: structure follows the design v3.1 templates (05 Service, 01 Home, /services index; DR-109).
          add(`${id}:structure`, facts.h1 === 1 && STRUCTURE[route](facts, locale), facts);
          add(`${id}:locale`, facts.lang === locale && facts.dir === (locale === 'ar' ? 'rtl' : 'ltr'), facts);
          add(`${id}:responsive`, facts.overflow, facts);
          add(`${id}:privacy`, facts.forms === 0, facts.forms);
          add(`${id}:reduced-motion`, facts.reduced, facts.reduced);
          add(`${id}:service-navigation`, facts.serviceLinks === 5 && facts.activeNav === 'page', facts);
          if (route in FAQ_COUNT && width === 1440) {
            // Entry chips are plain links to WhatsApp: reachable from the keyboard (no custom widget).
            const focused = await page.eval<boolean>(`(() => { const el = document.querySelector('main .v2-entry a.v2-chip'); el?.focus(); return document.activeElement === el; })()`);
            add(`${id}:entry-chip-focus`, focused);
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
