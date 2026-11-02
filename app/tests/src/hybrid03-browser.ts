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

    // D6 room mode: totals drive the same result panel, package guidance is derived from the registries.
    const rooms = await browser.newPage(1440, 1000);
    await rooms.reducedMotion();
    await rooms.goto('/en/products');
    await rooms.waitHydrated('[data-testid="smart-product-selector"]');
    await rooms.click('.selector-mode button:nth-child(2)');
    await rooms.waitFor(`document.querySelectorAll('.selector-room-row').length === 1`);
    await rooms.click('.selector-room-add');
    await rooms.waitFor(`document.querySelectorAll('.selector-room-row').length === 2`);
    await rooms.click('.selector-room-add');
    await rooms.waitFor(`document.querySelectorAll('.selector-room-row').length === 3`);
    const focusMoved = await rooms.eval<boolean>(`document.activeElement?.id === document.querySelector('.selector-room-row:nth-child(3) select')?.id`);
    const setCircuits = async (values: number[]) => {
      for (const [index, value] of values.entries()) await rooms.fill(`.selector-room-row:nth-child(${index + 1}) .selector-stepper input`, String(value));
    };
    const roomFacts = () => rooms.eval<any>(`(() => {
      const selector = document.querySelector('[data-testid="smart-product-selector"]');
      return {
        mode: selector?.getAttribute('data-mode'),
        total: document.querySelector('.selector-room-total bdi')?.textContent,
        controller: document.querySelector('.product-selector-result > img + div h3')?.textContent ?? null,
        multi: !!document.querySelector('.product-selector-complex'),
        packages: [...document.querySelectorAll('.selector-packages [data-package]')].map((node) => node.getAttribute('data-package')),
        packageLinks: [...document.querySelectorAll('.selector-package-links a')].map((node) => node.getAttribute('href')),
        caveat: !!document.querySelector('.selector-packages .selector-caveat'),
        price: /EGP|ج\\.م/.test(selector?.textContent ?? ''),
        forms: selector?.querySelectorAll('form').length ?? -1,
        removeDisabled: [...document.querySelectorAll('.selector-room-remove')].map((node) => node.disabled),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    })()`);
    await setCircuits([8, 6, 6]);
    await rooms.waitFor(`document.querySelector('.selector-room-total bdi')?.textContent === '20'`);
    const twenty = await roomFacts();
    add('d6-room-mode-20-multi-plus-premium', twenty.mode === 'rooms' && twenty.multi && twenty.controller === null && JSON.stringify(twenty.packages) === '["plus","premium"]' && twenty.caveat && !twenty.price && twenty.forms === 0 && focusMoved && twenty.packageLinks.includes('/en/smart-home/packages#package-plus') && twenty.packageLinks.includes('/en/start-project?package=premium&service=smart-home') && !twenty.overflow, { ...twenty, focusMoved });
    await rooms.screenshot('hybrid03-products-en-1440-rooms-20.png');
    await setCircuits([4, 3, 3]);
    await rooms.waitFor(`document.querySelector('.selector-room-total bdi')?.textContent === '10'`);
    const ten = await roomFacts();
    add('d6-room-mode-10-16r-essential', /16R/.test(ten.controller ?? '') && !ten.multi && JSON.stringify(ten.packages) === '["essential"]' && ten.caveat && !ten.price && !ten.overflow, ten);
    add('d6-room-mode-browser-errors', cleanIssues(rooms.issues).length === 0, cleanIssues(rooms.issues));
    await rooms.close();

    const roomsAr = await browser.newPage(390, 844);
    await roomsAr.touch();
    await roomsAr.goto('/ar/products');
    await roomsAr.waitHydrated('[data-testid="smart-product-selector"]');
    await roomsAr.click('.selector-mode button:nth-child(2)');
    await roomsAr.waitFor(`document.querySelectorAll('.selector-room-row').length === 1`);
    const singleRow = await roomsAr.eval<any>(`({ removeDisabled: document.querySelector('.selector-room-remove')?.disabled, removeLabel: document.querySelector('.selector-room-remove')?.getAttribute('aria-label') })`);
    await roomsAr.click('.selector-room-add');
    await roomsAr.waitFor(`document.querySelectorAll('.selector-room-row').length === 2`);
    const arFacts = await roomsAr.eval<any>(`({
      dir: document.documentElement.dir,
      overflow: document.documentElement.scrollWidth > innerWidth,
      rowWidth: document.querySelector('.selector-room-row')?.getBoundingClientRect().width,
      selectWidth: document.querySelector('.selector-room-row select')?.getBoundingClientRect().width,
      smallestTarget: Math.min(...[...document.querySelectorAll('.selector-mode button, .selector-stepper button, .selector-room-remove, .selector-room-add')].map((node) => Math.min(node.getBoundingClientRect().width, node.getBoundingClientRect().height))),
      packages: [...document.querySelectorAll('.selector-packages [data-package]')].map((node) => node.getAttribute('data-package')),
    })`);
    add('d6-room-mode-ar-mobile', arFacts.dir === 'rtl' && !arFacts.overflow && singleRow.removeDisabled === true && singleRow.removeLabel === 'احذف: صالة' && arFacts.smallestTarget >= 44 && arFacts.selectWidth > arFacts.rowWidth * 0.8 && JSON.stringify(arFacts.packages) === '["essential"]', { ...arFacts, ...singleRow });
    add('d6-room-mode-ar-browser-errors', cleanIssues(roomsAr.issues).length === 0, cleanIssues(roomsAr.issues));
    await roomsAr.screenshot('hybrid03-products-ar-390-rooms.png');
    await roomsAr.click('.selector-room-add');
    await roomsAr.waitFor(`document.querySelectorAll('.selector-room-row').length === 3`);
    const roomNames = await roomsAr.eval<any>(`({
      intro: document.querySelector('.product-selector-control > h2 + p')?.textContent?.trim(),
      remove: [...document.querySelectorAll('.selector-room-remove')].map((node) => node.getAttribute('aria-label')),
      circuits: [...document.querySelectorAll('.selector-stepper input')].map((node) => node.getAttribute('aria-label')),
    })`);
    const uniqueNames = (names: string[]) => new Set(names).size === names.length;
    add('d6-room-names-unique-ar', JSON.stringify(roomNames.remove) === JSON.stringify(['احذف: صالة', 'احذف: أخرى (1)', 'احذف: أخرى (2)']) && uniqueNames(roomNames.circuits) && roomNames.circuits[2] === 'عدد الدوائر: أخرى (2)' && /^أضف غرف المكان/.test(roomNames.intro ?? ''), roomNames);
    await roomsAr.close();

    const builderNotice = await browser.newPage(390, 844);
    await builderNotice.goto('/ar/start-project?package=plus&service=smart-home');
    await builderNotice.waitHydrated('[data-testid="project-builder"]');
    await builderNotice.waitFor(`document.querySelector('[data-testid="builder-package-notice"]')`);
    const noticeFacts = await builderNotice.eval<any>(`({
      step: document.querySelector('.builder-progress [aria-current="step"] span')?.textContent,
      role: document.querySelector('[data-testid="builder-package-notice"]')?.getAttribute('role'),
      text: document.querySelector('[data-testid="builder-package-notice"]')?.textContent,
      overflow: document.documentElement.scrollWidth > innerWidth,
    })`);
    add('d6-builder-package-notice-step1', noticeFacts.step === '1' && noticeFacts.role === 'status' && /Plus/.test(noticeFacts.text ?? '') && /الباقة المختارة/.test(noticeFacts.text ?? '') && !noticeFacts.overflow, noticeFacts);
    await builderNotice.screenshot('hybrid03-builder-ar-390-package-notice.png');
    await builderNotice.goto('/ar/start-project');
    await builderNotice.waitHydrated('[data-testid="project-builder"]');
    const noNotice = await builderNotice.eval<boolean>(`!document.querySelector('[data-testid="builder-package-notice"]')`);
    add('d6-builder-no-notice-without-package', noNotice, { noNotice });
    await builderNotice.close();
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
