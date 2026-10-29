import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { APP_ROOT } from '@otonom/domain';
import { Browser } from './browser.ts';

const BASE = process.env.OTONOM_BASE ?? 'http://127.0.0.1:3402';
const EVIDENCE = process.env.OTONOM_HYBRID03_EVIDENCE_DIR ?? path.resolve(APP_ROOT, '..', 'execution', 'evidence', 'website-hybrid03-20261028');
const checks: Array<{ id: string; pass: boolean; detail?: unknown }> = [];
const add = (id: string, pass: boolean, detail?: unknown) => checks.push({ id, pass, ...(pass ? {} : { detail }) });

function cleanIssues(issues: Array<{ kind: string; text: string; url?: string }>) {
  return issues.filter((issue) => !issue.url?.endsWith('/favicon.ico'));
}

async function main() {
  mkdirSync(EVIDENCE, { recursive: true });
  const browser = await Browser.launch(BASE, path.join(EVIDENCE, '.edge-hybrid03-profile'), path.join(EVIDENCE, 'screenshots'), 9361);
  try {
    const home = await browser.newPage(1440, 1000);
    await home.reducedMotion();
    await home.goto('/en');
    const homeFacts = await home.eval<any>(`(() => {
      const logo = document.querySelector('.brand-logo-header');
      const button = document.querySelector('.btn');
      return {
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        h1: document.querySelectorAll('main h1').length,
        overflow: document.documentElement.scrollWidth > innerWidth,
        logo: logo?.getAttribute('src'),
        transform: logo ? getComputedStyle(logo).transform : null,
        transition: button ? Number.parseFloat(getComputedStyle(button).transitionDuration) : 1,
      };
    })()`);
    add('home-en-desktop', homeFacts.lang === 'en' && homeFacts.dir === 'ltr' && homeFacts.h1 === 1 && !homeFacts.overflow, homeFacts);
    add('logo-en-source-and-direction', homeFacts.logo?.endsWith('/primary_light.svg') && homeFacts.transform === 'none', homeFacts);
    add('reduced-motion', homeFacts.transition <= 0.001, homeFacts);
    const documentResponse = home.responses.find((response) => response.type === 'Document' && response.url === `${BASE}/en`);
    const csp = documentResponse?.headers['content-security-policy'] ?? '';
    const scriptDirective = csp.split(';').find((directive) => directive.trim().startsWith('script-src')) ?? '';
    add('csp-nonce', /'nonce-[^']+'/.test(scriptDirective) && !scriptDirective.includes("'unsafe-inline'"), { present: !!csp, nonce: /'nonce-[^']+'/.test(scriptDirective), unsafeInline: scriptDirective.includes("'unsafe-inline'") });
    add('home-en-browser-errors', cleanIssues(home.issues).length === 0, cleanIssues(home.issues));
    await home.screenshot('hybrid03-home-en-1440.png');
    await home.close();

    const arabic = await browser.newPage(390, 844);
    await arabic.touch();
    await arabic.goto('/ar');
    await arabic.eval(`document.querySelector('.menu-mobile > summary')?.focus()`);
    await arabic.press('Enter');
    const arabicFacts = await arabic.eval<any>(`({
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      overflow: document.documentElement.scrollWidth > innerWidth,
      menuOpen: document.querySelector('.menu-mobile')?.open,
      menuLinks: document.querySelectorAll('.nav-mobile a').length,
      logoTransform: getComputedStyle(document.querySelector('.brand-logo-header')).transform,
    })`);
    add('home-ar-mobile', arabicFacts.lang === 'ar' && arabicFacts.dir === 'rtl' && !arabicFacts.overflow && arabicFacts.menuOpen && arabicFacts.menuLinks >= 4, arabicFacts);
    add('logo-ar-unmirrored', arabicFacts.logoTransform === 'none', arabicFacts);
    add('home-ar-browser-errors', cleanIssues(arabic.issues).length === 0, cleanIssues(arabic.issues));
    await arabic.screenshot('hybrid03-home-ar-390-menu.png');
    await arabic.close();

    const builder = await browser.newPage(390, 844);
    await builder.touch();
    await builder.goto('/en/start-project?package=premium&service=smart-home');
    await builder.waitHydrated('[data-testid="project-builder"]');
    await builder.click('.builder-choice:nth-child(1)');
    await builder.click('.builder-nav .btn:not(.secondary)');
    await builder.waitFor(`document.querySelector('.builder-progress [aria-current="step"] span')?.textContent === '2'`);
    await builder.click('.builder-choice:nth-child(1)');
    await builder.click('.builder-nav .btn:not(.secondary)');
    await builder.waitFor(`document.querySelector('.builder-progress [aria-current="step"] span')?.textContent === '3'`);
    const disciplinePrefilled = await builder.exists('.builder-choice[data-selected="true"]');
    if (!disciplinePrefilled) await builder.click('.builder-choice:nth-child(4)');
    await builder.click('.builder-nav .btn:not(.secondary)');
    await builder.waitFor(`document.querySelector('.builder-progress [aria-current="step"] span')?.textContent === '4'`);
    await builder.fill('.builder-fields textarea[required]', 'A safe synthetic outcome description for browser verification only.');
    await builder.click('.builder-nav .btn:not(.secondary)');
    await builder.waitFor(`document.querySelector('.builder-progress [aria-current="step"] span')?.textContent === '5'`);
    const brief = await builder.text('.builder-brief');
    await builder.click('.builder-nav .btn:not(.secondary)');
    await builder.waitFor(`document.querySelector('[data-testid="project-intake-disabled"]')`);
    const builderFacts = await builder.eval<any>(`({
      steps: document.querySelectorAll('.builder-progress li').length,
      disabled: !!document.querySelector('[data-testid="project-intake-disabled"]'),
      piiFields: document.querySelectorAll('.builder-contact input').length,
      overflow: document.documentElement.scrollWidth > innerWidth,
    })`);
    add('builder-six-stage-flow', builderFacts.steps === 6 && builderFacts.disabled && builderFacts.piiFields === 0 && /Premium/.test(brief) && !builderFacts.overflow, { ...builderFacts, packagePrefill: /Premium/.test(brief) });
    add('builder-browser-errors', cleanIssues(builder.issues).length === 0, cleanIssues(builder.issues));
    await builder.screenshot('hybrid03-builder-en-390-locked.png');
    await builder.close();

    const packages = await browser.newPage(390, 844);
    await packages.goto('/ar/smart-home/packages');
    const packageFacts = await packages.eval<any>(`({
      cards: document.querySelectorAll('.package-card').length,
      names: [...document.querySelectorAll('.package-card h3')].map((node) => node.textContent?.trim()),
      checkout: !!document.querySelector('form[action*="checkout"], a[href*="checkout"]'),
      dir: document.documentElement.dir,
      overflow: document.documentElement.scrollWidth > innerWidth,
    })`);
    add('packages-ar-mobile', packageFacts.cards === 3 && packageFacts.dir === 'rtl' && !packageFacts.checkout && !packageFacts.overflow, packageFacts);
    add('packages-browser-errors', cleanIssues(packages.issues).length === 0, cleanIssues(packages.issues));
    await packages.screenshot('hybrid03-packages-ar-390.png');
    await packages.close();

    const products = await browser.newPage(768, 1024);
    await products.goto('/en/products');
    await products.waitHydrated('[data-testid="smart-product-selector"]');
    await products.click('.product-selector-presets button:nth-child(2)');
    await products.waitFor(`document.querySelector('.product-selector-result h3')?.textContent?.includes('6R')`);
    const sixResult = await products.text('.product-selector-result h3');
    await products.click('.product-selector-presets button:nth-child(4)');
    await products.waitFor(`document.querySelector('.product-selector-complex')`);
    const productFacts = await products.eval<any>(`({
      result: document.querySelector('.product-selector-complex h3')?.textContent,
      forms: document.querySelectorAll('[data-testid="smart-product-selector"] form').length,
      overflow: document.documentElement.scrollWidth > innerWidth,
    })`);
    add('d6-selector-tablet', /6R/.test(sixResult) && /architecture/i.test(productFacts.result ?? '') && productFacts.forms === 0 && !productFacts.overflow, { sixResult, ...productFacts });
    add('products-browser-errors', cleanIssues(products.issues).length === 0, cleanIssues(products.issues));
    await products.screenshot('hybrid03-products-en-768-selector.png');
    await products.close();
  } finally {
    browser.close();
  }

  const failed = checks.filter((check) => !check.pass);
  const result = { at: new Date().toISOString(), target: BASE, browser: 'Microsoft Edge', total: checks.length, failed: failed.length, checks };
  writeFileSync(path.join(EVIDENCE, 'hybrid03-browser-local.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ total: result.total, failed: result.failed }));
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
