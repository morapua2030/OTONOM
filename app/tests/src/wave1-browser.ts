import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { APP_ROOT } from '@otonom/domain';
import { Browser } from './browser.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3301';
const EVIDENCE = process.env.OTONOM_WAVE1_EVIDENCE_DIR ?? path.resolve(APP_ROOT, '..', 'execution', 'evidence', 'website-wave1-20261026');
const SHOTS = path.join(EVIDENCE, 'screenshots', 'candidate-local');
const PROFILE = path.join(EVIDENCE, '.edge-wave1-profile');
const WIDTHS = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
const PATHS = ['', '/services', '/services/iot-embedded', '/services/software-engineering', '/services/smart-home-automation', '/services/custom-engineering', '/solutions', '/projects', '/products', '/about', '/engineering-process', '/build-with-us', '/contact', '/support'];
const SCREENSHOT_PATHS = new Set(['', '/services', '/build-with-us', '/products']);
const SCREENSHOT_WIDTHS = new Set([390, 1440]);

type Check = { id: string; pass: boolean; detail?: unknown };
const checks: Check[] = [];
const add = (id: string, pass: boolean, detail?: unknown) => checks.push({ id, pass, ...(pass ? {} : { detail }) });

async function main() {
  mkdirSync(EVIDENCE, { recursive: true });
  const browser = await Browser.launch(BASE, PROFILE, SHOTS, 9342);
  let firstNonce = '';
  try {
    for (const locale of ['ar', 'en'] as const) {
      for (const route of PATHS) {
        for (const width of WIDTHS) {
          const page = await browser.newPage(width, 900);
          await page.goto(`/${locale}${route}`);
          const facts = await page.eval<{
            lang: string; dir: string; h1: number; title: string; description: string;
            scrollWidth: number; innerWidth: number; formCount: number; nonceValues: string[];
            commerceLinks: string[]; langSwitch: string; text: string;
          }>(`(() => ({
            lang: document.documentElement.lang,
            dir: document.documentElement.dir,
            h1: document.querySelectorAll('main h1').length,
            title: document.title,
            description: document.querySelector('meta[name=description]')?.content || '',
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            formCount: document.querySelectorAll('main form').length,
            nonceValues: [...document.scripts].map((s) => s.nonce).filter(Boolean),
            commerceLinks: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || '').filter((href) => ['/cart', '/checkout', '/shop', '/support/warranty'].some((part) => href.endsWith(part) || href.includes(part + '/'))),
            langSwitch: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || '').find((h) => h === '/${locale === 'ar' ? 'en' : 'ar'}${route}') || '',
            text: document.body.innerText,
          }))()`);
          const documentResponse = [...page.responses].reverse().find((response) => response.type === 'Document');
          const csp = documentResponse?.headers['content-security-policy'] ?? '';
          const scriptDirective = csp.split(';').map((part) => part.trim()).find((part) => part.startsWith('script-src')) ?? '';
          const requestNonce = facts.nonceValues[0] ?? '';
          if (!firstNonce && requestNonce) firstNonce = requestNonce;

          const id = `${locale}${route || '/'}@${width}`;
          add(`${id}:http`, documentResponse?.status === 200, documentResponse);
          add(`${id}:locale`, facts.lang === locale && facts.dir === (locale === 'ar' ? 'rtl' : 'ltr'), { lang: facts.lang, dir: facts.dir });
          add(`${id}:h1`, facts.h1 === 1, facts.h1);
          add(`${id}:meta`, facts.title !== 'OTONOM' && facts.description.length > 20, { title: facts.title, description: facts.description });
          add(`${id}:overflow`, facts.scrollWidth <= facts.innerWidth, { scrollWidth: facts.scrollWidth, innerWidth: facts.innerWidth });
          add(`${id}:switch`, Boolean(facts.langSwitch), facts.langSwitch);
          add(`${id}:commerce-links`, facts.commerceLinks.length === 0, facts.commerceLinks);
          add(`${id}:csp`, scriptDirective.includes("'strict-dynamic'") && /'nonce-[^']+'/.test(scriptDirective) && !scriptDirective.includes("'unsafe-inline'"), scriptDirective);
          add(`${id}:nonce`, facts.nonceValues.length > 0 && facts.nonceValues.every((nonce) => nonce === requestNonce), facts.nonceValues);
          add(`${id}:issues`, page.issues.length === 0, page.issues);
          if (route === '/contact' || route === '/build-with-us' || route === '/support') add(`${id}:no-public-form`, facts.formCount === 0, facts.formCount);
          if (route === '/support') add(`${id}:warranty-disabled`, /disabled|معطلة|معطّل/.test(facts.text), facts.text.slice(0, 300));
          if (SCREENSHOT_PATHS.has(route) && SCREENSHOT_WIDTHS.has(width)) await page.screenshot(`${locale}${route.replaceAll('/', '_') || '_home'}-${width}.png`);
          await page.close();
        }
      }
    }

    const rotationPage = await browser.newPage(390, 900);
    await rotationPage.goto('/en');
    const rotated = await rotationPage.eval<string>(`document.scripts[0]?.nonce || ''`);
    add('csp:nonce-rotation', Boolean(firstNonce && rotated && firstNonce !== rotated), { firstPresent: Boolean(firstNonce), secondPresent: Boolean(rotated), different: firstNonce !== rotated });
    await rotationPage.close();
  } finally {
    browser.close();
  }

  const result = {
    at: new Date().toISOString(),
    base: BASE,
    method: 'Installed Microsoft Edge headless over CDP',
    locales: ['ar', 'en'], widths: WIDTHS, paths: PATHS,
    total: checks.length,
    passed: checks.filter((check) => check.pass).length,
    failed: checks.filter((check) => !check.pass),
  };
  writeFileSync(path.join(EVIDENCE, 'wave1-browser-local.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ total: result.total, passed: result.passed, failed: result.failed.length }));
  if (result.failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
});
