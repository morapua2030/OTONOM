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

    const compareAr = await browser.newPage(390, 844);
    await compareAr.touch();
    await compareAr.goto('/ar/products/compare');
    const compareFacts = await compareAr.eval<any>(`(() => {
      const visible = (node) => !!node && getComputedStyle(node).display !== 'none' && node.getBoundingClientRect().height > 0;
      return {
        dir: document.documentElement.dir,
        overflow: document.documentElement.scrollWidth > innerWidth,
        stackVisible: visible(document.querySelector('[data-testid="product-compare-stack"]')),
        tableVisible: visible(document.querySelector('.product-compare-wrap')),
        cards: document.querySelectorAll('.product-compare-card').length,
        bidiChannels: [...document.querySelectorAll('.product-compare-card dd strong bdi[dir="ltr"]')].map((node) => node.textContent),
        smallestTarget: Math.min(...[...document.querySelectorAll('.product-compare-card dd a, .compare-next-steps a')].map((node) => Math.min(node.getBoundingClientRect().width, node.getBoundingClientRect().height))),
      };
    })()`);
    add('d6-compare-ar-390-stacked', compareFacts.dir === 'rtl' && !compareFacts.overflow && compareFacts.stackVisible && !compareFacts.tableVisible && compareFacts.cards === 3 && compareFacts.bidiChannels.length === 3 && compareFacts.smallestTarget >= 44, compareFacts);
    await compareAr.screenshot('hybrid03-compare-ar-390.png');
    await compareAr.close();

    const compareEn = await browser.newPage(1440, 1000);
    await compareEn.goto('/en/products/compare');
    const compareDesktop = await compareEn.eval<any>(`({
      overflow: document.documentElement.scrollWidth > innerWidth,
      stackHidden: getComputedStyle(document.querySelector('[data-testid="product-compare-stack"]')).display === 'none',
      tableRows: document.querySelectorAll('.product-compare tbody tr').length,
    })`);
    add('d6-compare-en-1440-table', !compareDesktop.overflow && compareDesktop.stackHidden && compareDesktop.tableRows === 5, compareDesktop);
    await compareEn.close();

    const packagesAr = await browser.newPage(390, 844);
    await packagesAr.touch();
    await packagesAr.goto('/ar/smart-home/packages');
    const packageTable = await packagesAr.eval<any>(`(() => {
      const region = document.querySelector('[data-testid="package-comparison"]');
      const lockRow = [...document.querySelectorAll('.package-compare tbody tr')].find((row) => row.querySelector('th')?.textContent?.includes('قفل ذكي'));
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        regionRole: region?.getAttribute('role'),
        regionFocusable: region?.getAttribute('tabindex') === '0',
        regionScrolls: region ? region.scrollWidth > region.clientWidth : false,
        lockPlus: lockRow?.querySelector('[data-package="plus"]')?.textContent?.trim(),
        lockPremium: lockRow?.querySelector('[data-package="premium"]')?.textContent?.trim(),
        stickyHeader: getComputedStyle(document.querySelector('.package-compare th[scope="row"]')).position,
        caveatAfter: region?.nextElementSibling?.classList.contains('package-caveat'),
      };
    })()`);
    add('d6-package-table-ar-not-listed', packageTable.lockPlus === 'غير مذكور في البروشور' && /مدرج/.test(packageTable.lockPremium ?? '') && packageTable.regionRole === 'region' && packageTable.regionFocusable && !packageTable.overflow && packageTable.stickyHeader === 'sticky' && packageTable.caveatAfter, packageTable);
    await packagesAr.screenshot('hybrid03-packages-ar-390-table.png');
    await packagesAr.close();

    const switchPage = await browser.newPage(390, 844);
    await switchPage.goto('/ar/start-project?package=plus&service=smart-home');
    await switchPage.waitHydrated('[data-testid="project-builder"]');
    await switchPage.waitFor(`document.querySelector('a[hreflang="en"]')?.getAttribute('href') === '/en/start-project?package=plus&service=smart-home'`);
    await switchPage.click('a[hreflang="en"]');
    await switchPage.waitFor(`location.pathname === '/en/start-project'`);
    await switchPage.waitHydrated('[data-testid="project-builder"]');
    await switchPage.waitFor(`document.querySelector('[data-testid="builder-package-notice"]')`);
    const switched = await switchPage.eval<any>(`({
      lang: document.documentElement.lang,
      search: location.search,
      notice: document.querySelector('[data-testid="builder-package-notice"]')?.textContent,
    })`);
    add('d6-lang-switch-keeps-package', switched.lang === 'en' && switched.search === '?package=plus&service=smart-home' && /Selected package: Plus/.test(switched.notice ?? ''), switched);
    await switchPage.close();

    const selectorBusiness = await browser.newPage(1440, 1000);
    await selectorBusiness.goto('/en/products');
    await selectorBusiness.waitHydrated('[data-testid="smart-product-selector"]');
    await selectorBusiness.click('.product-selector-presets button:nth-child(4)');
    await selectorBusiness.waitFor(`document.querySelector('.product-selector-complex')`);
    const businessLinks = await selectorBusiness.eval<string[]>(`[...document.querySelectorAll('.product-selector-complex a')].map((node) => node.getAttribute('href'))`);
    add('d6-selector-business-links', businessLinks.includes('/en/business/developers') && businessLinks.includes('/en/business/contractors'), { businessLinks });
    await selectorBusiness.close();

    const packageQuantities = await browser.newPage(390, 844);
    await packageQuantities.touch();
    await packageQuantities.goto('/ar/smart-home/packages');
    const quantityFacts = await packageQuantities.eval<any>(`(() => {
      const rowText = (name) => {
        const row = [...document.querySelectorAll('.package-compare tbody tr')].find((tr) => tr.querySelector('th')?.textContent?.includes(name));
        return ['premium', 'plus', 'essential'].map((id) => row?.querySelector('[data-package="' + id + '"]')?.textContent?.trim());
      };
      const title = document.querySelector('.package-compare-title');
      const hint = document.querySelector('.package-compare-hint');
      const region = document.querySelector('[data-testid="package-comparison"]');
      return {
        r16: rowText('R16'),
        alexa: rowText('Amazon Alexa'),
        titleOutsideRegion: !!title && !region?.contains(title) && title.getBoundingClientRect().right <= innerWidth,
        hintVisible: !!hint && getComputedStyle(hint).display !== 'none',
        hintHidden: hint?.getAttribute('aria-hidden'),
        regionScrolls: region ? region.scrollWidth > region.clientWidth : false,
        captionSrOnly: document.querySelector('.package-compare caption')?.classList.contains('sr-only'),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    })()`);
    add('d6-package-table-quantities-and-hint-ar-390', JSON.stringify(quantityFacts.r16) === JSON.stringify(['×2', '×2', '×1']) && quantityFacts.alexa.every((cell: string) => /مدرج/.test(cell ?? '')) && quantityFacts.titleOutsideRegion && quantityFacts.hintVisible && quantityFacts.hintHidden === 'true' && quantityFacts.regionScrolls && quantityFacts.captionSrOnly && !quantityFacts.overflow, quantityFacts);
    await packageQuantities.screenshot('hybrid03-packages-ar-390-table-heading.png');
    await packageQuantities.close();

    const packageDesktop = await browser.newPage(1440, 1000);
    await packageDesktop.goto('/en/smart-home/packages');
    const hintDesktop = await packageDesktop.eval<boolean>(`getComputedStyle(document.querySelector('.package-compare-hint')).display === 'none'`);
    add('d6-package-hint-hidden-1440', hintDesktop, { hintDesktop });
    await packageDesktop.close();

    const builderUrl = await browser.newPage(390, 844);
    await builderUrl.goto('/ar/start-project?package=plus&service=smart-home');
    await builderUrl.waitHydrated('[data-testid="project-builder"]');
    await builderUrl.click('.builder-choice:nth-child(1)');
    await builderUrl.click('.builder-nav .btn:not(.secondary)');
    await builderUrl.waitFor(`document.querySelector('.builder-progress [aria-current="step"] span')?.textContent === '2'`);
    await builderUrl.click('.builder-choice:nth-child(1)');
    await builderUrl.click('.builder-nav .btn:not(.secondary)');
    await builderUrl.waitFor(`document.querySelector('.builder-progress [aria-current="step"] span')?.textContent === '3'`);
    await builderUrl.click('.builder-nav .btn:not(.secondary)');
    await builderUrl.waitFor(`document.querySelector('.builder-progress [aria-current="step"] span')?.textContent === '4'`);
    await builderUrl.fill('.builder-fields select:has(option[value="premium"])', 'premium');
    await builderUrl.waitFor(`location.search === '?package=premium&service=smart-home'`);
    const premiumHref = await builderUrl.waitFor(`document.querySelector('a[hreflang="en"]')?.getAttribute('href') === '/en/start-project?package=premium&service=smart-home' && document.querySelector('a[hreflang="en"]').getAttribute('href')`);
    await builderUrl.fill('.builder-fields select:has(option[value="premium"])', '');
    await builderUrl.waitFor(`location.search === '?service=smart-home'`);
    const clearedHref = await builderUrl.waitFor(`document.querySelector('a[hreflang="en"]')?.getAttribute('href') === '/en/start-project?service=smart-home' && document.querySelector('a[hreflang="en"]').getAttribute('href')`);
    const builderUrlFacts = await builderUrl.eval<any>(`({ path: location.pathname, step: document.querySelector('.builder-progress [aria-current="step"] span')?.textContent, historyLength: history.length })`);
    add('d6-builder-url-follows-package', premiumHref === '/en/start-project?package=premium&service=smart-home' && clearedHref === '/en/start-project?service=smart-home' && builderUrlFacts.path === '/ar/start-project' && builderUrlFacts.step === '4', { premiumHref, clearedHref, ...builderUrlFacts });
    await builderUrl.close();

    // Anchor check (headless Edge: the shared driver always launches --headless=new).
    const anchor = await browser.newPage(390, 844);
    await anchor.touch();
    await anchor.goto('/ar/products');
    await anchor.waitHydrated('[data-testid="smart-product-selector"]');
    await anchor.click('.selector-mode button:nth-child(2)');
    await anchor.waitFor(`document.querySelectorAll('.selector-room-row').length === 1`);
    await anchor.click('.selector-room-add');
    await anchor.waitFor(`document.querySelectorAll('.selector-room-row').length === 2`);
    await anchor.fill('.selector-room-row:nth-child(1) .selector-stepper input', '10');
    await anchor.fill('.selector-room-row:nth-child(2) .selector-stepper input', '10');
    await anchor.waitFor(`document.querySelector('.selector-room-total bdi')?.textContent === '20'`);
    const viewLink = await anchor.eval<any>(`(() => { const a = document.querySelector('.selector-package-links a[href="/ar/smart-home/packages#package-plus"]'); return { text: a?.textContent?.trim(), href: a?.getAttribute('href') }; })()`);
    await anchor.click('.selector-package-links a[href="/ar/smart-home/packages#package-plus"]');
    await anchor.waitFor(`location.pathname === '/ar/smart-home/packages' && location.hash === '#package-plus' && document.readyState === 'complete'`);
    const anchorFacts = await anchor.waitFor(`(() => {
      const card = document.querySelector('#package-plus');
      const header = document.querySelector('header.header');
      if (!card || !header || scrollY === 0) return null;
      const top = card.getBoundingClientRect().top;
      const headerBottom = header.getBoundingClientRect().bottom;
      return { top: Math.round(top), headerBottom: Math.round(headerBottom), scrollY: Math.round(scrollY), innerHeight };
    })()`);
    add('d6-anchor-package-plus-below-header', viewLink.text === 'اعرض الباقة' && anchorFacts.top >= anchorFacts.headerBottom && anchorFacts.top < anchorFacts.innerHeight, { ...viewLink, ...anchorFacts, mode: 'headless' });
    await anchor.screenshot('hybrid03-anchor-ar-390-package-plus.png');
    await anchor.close();
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
