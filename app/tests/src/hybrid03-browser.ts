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
    add('logo-en-source-and-direction', homeFacts.logo?.endsWith('/wordmark_only_light.svg') && homeFacts.transform === 'none', homeFacts);
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

    // D8-C v3 (design "09 Start a project"): three chip groups build a WhatsApp message. No form, no input, nothing stored.
    const start = await browser.newPage(390, 844);
    await start.touch();
    await start.goto('/en/start-project?package=premium&service=smart-home');
    await start.waitHydrated('[data-testid="start-project"]');
    const chip = (group: number, index: number) => `.v3-start-group:nth-of-type(${group}) .v2-chip:nth-child(${index})`;
    const startFacts = () => start.eval<any>(`(() => {
      const root = document.querySelector('[data-testid="start-project"]');
      const wa = document.querySelector('[data-testid="start-whatsapp"]');
      return {
        message: document.querySelector('[data-testid="start-message"]')?.textContent?.trim(),
        href: wa?.getAttribute('href'),
        rel: wa?.getAttribute('rel'),
        pressed: [...root.querySelectorAll('.v2-chip[aria-pressed="true"]')].map((node) => node.textContent.trim()),
        groups: root.querySelectorAll('[role="group"][aria-labelledby]').length,
        chips: root.querySelectorAll('button.v2-chip[aria-pressed]').length,
        piiFields: document.querySelectorAll('main form, main input, main textarea, main select').length,
        live: document.querySelector('[data-testid="start-message"]')?.getAttribute('aria-live'),
        smallestTarget: Math.min(...[...root.querySelectorAll('.v2-chip, [data-testid="start-whatsapp"]')].map((node) => Math.min(node.getBoundingClientRect().width, node.getBoundingClientRect().height))),
        storage: localStorage.length + sessionStorage.length,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    })()`);
    const prefilled = await startFacts();
    await start.click(chip(1, 2));
    await start.click(chip(2, 1));
    await start.waitFor(`document.querySelector('[data-testid="start-message"]')?.textContent?.includes("we're a company")`);
    const picked = await startFacts();
    await start.click(chip(2, 1));
    await start.waitFor(`!document.querySelector('[data-testid="start-message"]')?.textContent?.includes('idea')`);
    const toggled = await startFacts();
    const expected = "Hi OTONOM, we're a company, I have an idea in smart home and I'd like to talk about a project.";
    add('start-project-chips-build-whatsapp-message', JSON.stringify(prefilled.pressed) === '["Smart home"]' && picked.message === expected && /^https:\/\/wa\.me\/\d+\?text=/.test(picked.href ?? '') && picked.href?.endsWith(`?text=${encodeURIComponent(expected)}`) && /noopener/.test(picked.rel ?? '') && toggled.message === "Hi OTONOM, we're a company, I'm interested in smart home and I'd like to talk about a project." && JSON.stringify(toggled.pressed) === '["Company","Smart home"]', { prefilled, picked, toggled });
    add('start-project-no-pii-no-storage', picked.groups === 3 && picked.chips === 11 && picked.piiFields === 0 && picked.storage === 0 && picked.live === 'polite' && picked.smallestTarget >= 44 && !picked.overflow, picked);
    add('start-project-browser-errors', cleanIssues(start.issues).length === 0, cleanIssues(start.issues));
    await start.screenshot('hybrid03-start-en-390-chips.png');
    await start.close();

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

    // D8-C v4 (DR-112, supersedes DR-109): the D6 selector is back on /products, directly under the controller cards,
    // restyled to v3. Restored checks: presets, multi-controller card with business links, no form, no overflow.
    const products = await browser.newPage(768, 1024);
    await products.goto('/en/products');
    await products.waitHydrated('[data-testid="smart-product-selector"]');
    const order = await products.eval<boolean>(`(() => { const rows = document.querySelector('.product-list-section'); const sel = document.querySelector('[data-testid="smart-product-selector"]'); return !!rows && !!sel && !!(rows.compareDocumentPosition(sel) & Node.DOCUMENT_POSITION_FOLLOWING); })()`);
    await products.click('.product-selector-presets button:nth-child(2)');
    await products.waitFor(`document.querySelector('.product-selector-result h3')?.textContent?.includes('6R')`);
    const sixResult = await products.text('.product-selector-result h3');
    const sixMessage = await products.eval<string>(`new URL(document.querySelector('[data-testid="selector-whatsapp"]').href).searchParams.get('text')`);
    await products.click('.product-selector-presets button:nth-child(5)');
    await products.waitFor(`document.querySelector('.product-selector-complex')`);
    const productFacts = await products.eval<any>(`({
      result: document.querySelector('.product-selector-complex h3')?.textContent,
      business: [...document.querySelectorAll('.product-selector-complex a')].map((node) => node.getAttribute('href')),
      forms: document.querySelectorAll('main form').length,
      textInputs: document.querySelectorAll('[data-testid="smart-product-selector"] input:not([type="range"]), [data-testid="smart-product-selector"] select, [data-testid="smart-product-selector"] textarea').length,
      productLinks: [...new Set([...document.querySelectorAll('main .product-list-section a[href^="/en/products/"]')].map((node) => node.getAttribute('href')))].sort(),
      simLink: document.querySelector('[data-testid="selector-sim-link"]')?.getAttribute('href'),
      price: /EGP|ج\\.م/.test(document.querySelector('[data-testid="smart-product-selector"]')?.textContent ?? ''),
      h1: document.querySelectorAll('main h1').length,
      overflow: document.documentElement.scrollWidth > innerWidth,
    })`);
    add('d6-selector-tablet', order && /6R/.test(sixResult) && sixMessage === 'Hi OTONOM, I need about 6 channels, and the suggestion is 6R.' && /engineer review/i.test(productFacts.result ?? '') && productFacts.forms === 0 && productFacts.textInputs === 0 && !productFacts.price && productFacts.h1 === 1 && !productFacts.overflow, { order, sixResult, sixMessage, ...productFacts });
    add('d6-selector-business-links', JSON.stringify(productFacts.business) === '["/en/business/developers","/en/business/contractors"]', productFacts);
    add('products-v3-controller-cards', JSON.stringify(productFacts.productLinks) === '["/en/products/16r","/en/products/4r","/en/products/6r"]' && productFacts.simLink === '/en/try', productFacts);
    add('products-browser-errors', cleanIssues(products.issues).length === 0, cleanIssues(products.issues));
    await products.screenshot('hybrid03-products-en-768.png');
    await products.close();

    // D6 room mode (restored): totals drive the result, package guidance from the registries, focus moves to the new room.
    const rooms = await browser.newPage(1440, 1000);
    await rooms.reducedMotion();
    await rooms.goto('/en/products');
    await rooms.waitHydrated('[data-testid="smart-product-selector"]');
    await rooms.click('.selector-mode button:nth-child(2)');
    await rooms.waitFor(`document.querySelectorAll('.selector-room-row').length === 1`);
    await rooms.click('.selector-room-add:nth-child(2)');
    await rooms.waitFor(`document.querySelectorAll('.selector-room-row').length === 2`);
    const focusMoved = await rooms.eval<boolean>(`document.activeElement === document.querySelector('.selector-room-row:nth-child(2) .selector-room-name')`);
    for (let i = 0; i < 15; i++) await rooms.click('.selector-room-row:nth-child(1) .selector-stepper button:last-child');
    for (let i = 0; i < 3; i++) await rooms.click('.selector-room-row:nth-child(2) .selector-stepper button:last-child');
    const roomFacts = () => rooms.eval<any>(`(() => {
      const selector = document.querySelector('[data-testid="smart-product-selector"]');
      return {
        mode: selector?.getAttribute('data-mode'),
        total: document.querySelector('.selector-room-total bdi')?.textContent,
        packages: [...document.querySelectorAll('.selector-packages [data-package]')].map((node) => node.getAttribute('data-package')),
        packageLinks: [...document.querySelectorAll('.selector-package-links a')].map((node) => node.getAttribute('href')),
        caveat: document.querySelector('.selector-caveat')?.textContent,
        message: new URL(document.querySelector('[data-testid="selector-whatsapp"]').href).searchParams.get('text'),
        rel: document.querySelector('[data-testid="selector-whatsapp"]')?.rel,
        price: /EGP|ج\\.م/.test(selector?.textContent ?? ''),
        forms: selector?.querySelectorAll('form').length ?? -1,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    })()`);
    await rooms.waitFor(`document.querySelector('.selector-room-total bdi')?.textContent === '20'`);
    const twenty = await roomFacts();
    add('d6-room-mode-20-plus-premium', twenty.mode === 'rooms' && JSON.stringify(twenty.packages) === '["plus","premium"]' && twenty.message === 'Hi OTONOM, I need about 20 channels in 2 rooms, and the suggestion is 2 × 16R.' && /noopener/.test(twenty.rel ?? '') && /initial estimate/.test(twenty.caveat ?? '') && !twenty.price && twenty.forms === 0 && focusMoved && twenty.packageLinks.includes('/en/smart-home/packages#package-plus') && !twenty.overflow, { ...twenty, focusMoved });
    await rooms.screenshot('hybrid03-products-en-1440-rooms-20.png');
    for (let i = 0; i < 10; i++) await rooms.click('.selector-room-row:nth-child(1) .selector-stepper button:first-child');
    await rooms.waitFor(`document.querySelector('.selector-room-total bdi')?.textContent === '10'`);
    const ten = await roomFacts();
    add('d6-room-mode-10-16r-essential', JSON.stringify(ten.packages) === '["essential"]' && /16R/.test(ten.message ?? '') && !ten.price && !ten.overflow, ten);
    add('d6-room-mode-browser-errors', cleanIssues(rooms.issues).length === 0, cleanIssues(rooms.issues));
    await rooms.close();

    const roomsAr = await browser.newPage(390, 844);
    await roomsAr.touch();
    await roomsAr.goto('/ar/products');
    await roomsAr.waitHydrated('[data-testid="smart-product-selector"]');
    await roomsAr.click('.selector-mode button:nth-child(2)');
    await roomsAr.waitFor(`document.querySelectorAll('.selector-room-row').length === 1`);
    const singleRow = await roomsAr.eval<any>(`({ removeDisabled: document.querySelector('.selector-room-remove')?.disabled, removeLabel: document.querySelector('.selector-room-remove')?.getAttribute('aria-label') })`);
    await roomsAr.click('.selector-room-add:last-child');
    await roomsAr.click('.selector-room-add:last-child');
    await roomsAr.waitFor(`document.querySelectorAll('.selector-room-row').length === 3`);
    const arFacts = await roomsAr.eval<any>(`({
      dir: document.documentElement.dir,
      overflow: document.documentElement.scrollWidth > innerWidth,
      smallestTarget: Math.min(...[...document.querySelectorAll('.selector-mode button, .selector-stepper button, .selector-room-remove, .selector-room-add, .product-selector-presets button, [data-testid="selector-whatsapp"]')].filter((node) => node.offsetParent !== null).map((node) => Math.min(node.getBoundingClientRect().width, node.getBoundingClientRect().height))),
      remove: [...document.querySelectorAll('.selector-room-remove')].map((node) => node.getAttribute('aria-label')),
      circuits: [...document.querySelectorAll('.selector-stepper-value')].map((node) => node.getAttribute('aria-label')),
      message: new URL(document.querySelector('[data-testid="selector-whatsapp"]').href).searchParams.get('text'),
      simLink: document.querySelector('[data-testid="selector-sim-link"]')?.textContent,
    })`);
    add('d6-room-mode-ar-mobile', arFacts.dir === 'rtl' && !arFacts.overflow && singleRow.removeDisabled === true && singleRow.removeLabel === 'شيل: صالة' && arFacts.smallestTarget >= 44 && arFacts.message === 'أهلًا OTONOM، محتاج حوالي 3 قناة في 3 أوضة، والمقترح 4R.' && arFacts.simLink === 'جرّب بيتك الذكي ←', { ...arFacts, ...singleRow });
    add('d6-room-names-unique-ar', JSON.stringify(arFacts.remove) === JSON.stringify(['شيل: صالة', 'شيل: أخرى (1)', 'شيل: أخرى (2)']) && new Set(arFacts.circuits).size === 3 && arFacts.circuits[2] === 'القنوات: أخرى (2)', arFacts);
    add('d6-room-mode-ar-browser-errors', cleanIssues(roomsAr.issues).length === 0, cleanIssues(roomsAr.issues));
    await roomsAr.screenshot('hybrid03-products-ar-390-rooms.png');
    await roomsAr.close();

    // Package preselection: ?package= (allow-listed) presses the Smart home chip; no package and no service presses nothing.
    const startAr = await browser.newPage(390, 844);
    await startAr.touch();
    await startAr.goto('/ar/start-project?package=plus&service=smart-home');
    await startAr.waitHydrated('[data-testid="start-project"]');
    const arStart = await startAr.eval<any>(`({
      dir: document.documentElement.dir,
      pressed: [...document.querySelectorAll('[data-testid="start-project"] .v2-chip[aria-pressed="true"]')].map((node) => node.textContent.trim()),
      message: document.querySelector('[data-testid="start-message"]')?.textContent?.trim(),
      overflow: document.documentElement.scrollWidth > innerWidth,
    })`);
    add('start-project-ar-package-preselects-smart-home', arStart.dir === 'rtl' && JSON.stringify(arStart.pressed) === '["المنزل الذكي"]' && /المنزل الذكي/.test(arStart.message ?? '') && !arStart.overflow, arStart);
    await startAr.screenshot('hybrid03-start-ar-390-package.png');
    await startAr.goto('/ar/start-project?service=%3Cscript%3E&package=nope');
    await startAr.waitHydrated('[data-testid="start-project"]');
    const unknownQuery = await startAr.eval<number>(`document.querySelectorAll('[data-testid="start-project"] .v2-chip[aria-pressed="true"]').length`);
    add('start-project-ignores-unknown-query', unknownQuery === 0, { unknownQuery });
    add('start-project-ar-browser-errors', cleanIssues(startAr.issues).length === 0, cleanIssues(startAr.issues));
    await startAr.close();

    // DR-107: retired routes answer 308 to their replacement, keep the locale and drop the query.
    const redirects = await browser.newPage(390, 844);
    const redirectFacts: Record<string, string> = {};
    for (const [from, to] of [['/ar/products/compare?view=table', '/ar/products'], ['/en/products/compare', '/en/products'], ['/ar/solutions/villas?x=1', '/ar/services'], ['/en/legal/privacy', '/en/contact'], ['/ar/build-with-us#idea', '/ar/start-project']]) {
      await redirects.goto(from);
      await redirects.waitFor(`document.readyState === 'complete'`);
      redirectFacts[from] = await redirects.eval<string>(`location.pathname + location.search`);
      add(`legacy-redirect:${from}`, redirectFacts[from] === to, { from, to, landed: redirectFacts[from] });
    }
    add('legacy-redirect-browser-errors', cleanIssues(redirects.issues).length === 0, cleanIssues(redirects.issues));
    await redirects.close();

    // Service FAQ (design "05 Service"): native buttons, keyboard operable, one answer open at a time.
    const faq = await browser.newPage(1440, 1000);
    await faq.goto('/en/services/iot-embedded');
    await faq.waitHydrated('[data-testid="faq"]');
    const faqState = () => faq.eval<any>(`[...document.querySelectorAll('[data-testid="faq"] button[aria-expanded]')].map((button) => ({ expanded: button.getAttribute('aria-expanded'), panelHidden: document.getElementById(button.getAttribute('aria-controls'))?.hidden }))`);
    const before = await faqState();
    await faq.eval(`document.querySelector('[data-testid="faq"] button[aria-expanded]')?.focus()`);
    await faq.press('Enter');
    await faq.waitFor(`document.querySelector('[data-testid="faq"] button[aria-expanded]')?.getAttribute('aria-expanded') === 'true'`);
    const opened = await faqState();
    await faq.eval(`document.querySelectorAll('[data-testid="faq"] button[aria-expanded]')[1]?.focus()`);
    await faq.press('Space');
    await faq.waitFor(`document.querySelectorAll('[data-testid="faq"] button[aria-expanded]')[1]?.getAttribute('aria-expanded') === 'true'`);
    const faqSwitched = await faqState();
    add('service-faq-keyboard-accordion', before.length >= 3 && before.every((item: any) => item.expanded === 'false' && item.panelHidden === true) && opened[0].expanded === 'true' && opened[0].panelHidden === false && faqSwitched[0].expanded === 'false' && faqSwitched[1].expanded === 'true' && faqSwitched.filter((item: any) => item.expanded === 'true').length === 1, { before, opened, faqSwitched });
    add('service-faq-browser-errors', cleanIssues(faq.issues).length === 0, cleanIssues(faq.issues));
    await faq.close();

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
    add('d6-package-table-ar-not-listed', packageTable.lockPlus === '—غير مدرج في الباقة' && /مدرج/.test(packageTable.lockPremium ?? '') && packageTable.regionRole === 'region' && packageTable.regionFocusable && !packageTable.overflow && packageTable.stickyHeader === 'sticky' && packageTable.caveatAfter, packageTable);
    await packagesAr.screenshot('hybrid03-packages-ar-390-table.png');
    await packagesAr.close();

    const switchPage = await browser.newPage(390, 844);
    await switchPage.goto('/ar/start-project?package=plus&service=smart-home');
    await switchPage.waitHydrated('[data-testid="start-project"]');
    await switchPage.waitFor(`document.querySelector('a[hreflang="en"]')?.getAttribute('href') === '/en/start-project?package=plus&service=smart-home'`);
    await switchPage.click('a[hreflang="en"]');
    await switchPage.waitFor(`location.pathname === '/en/start-project'`);
    await switchPage.waitHydrated('[data-testid="start-project"]');
    const switched = await switchPage.eval<any>(`({
      lang: document.documentElement.lang,
      search: location.search,
      pressed: [...document.querySelectorAll('[data-testid="start-project"] .v2-chip[aria-pressed="true"]')].map((node) => node.textContent.trim()),
    })`);
    add('d6-lang-switch-keeps-package', switched.lang === 'en' && switched.search === '?package=plus&service=smart-home' && JSON.stringify(switched.pressed) === '["Smart home"]', switched);
    await switchPage.close();

    // /services index (owner decision): the four discipline cards, each linking to its service page with a unique name.
    const servicesIndex = await browser.newPage(1440, 1000);
    await servicesIndex.goto('/en/services');
    const indexFacts = await servicesIndex.eval<any>(`({
      links: [...document.querySelectorAll('main .v2-arrow-link')].map((node) => node.getAttribute('href')),
      names: [...document.querySelectorAll('main .v2-arrow-link')].map((node) => node.textContent.replace(/\\s+/g, ' ').trim()),
      cta: !!document.querySelector('main [data-testid="cta-book"]'),
      overflow: document.documentElement.scrollWidth > innerWidth,
    })`);
    add('services-index-discipline-cards', JSON.stringify(indexFacts.links) === JSON.stringify(['/en/services/iot-embedded', '/en/services/software-engineering', '/en/services/smart-home-automation', '/en/services/custom-engineering']) && new Set(indexFacts.names).size === 4 && indexFacts.cta && !indexFacts.overflow, indexFacts);
    add('services-index-browser-errors', cleanIssues(servicesIndex.issues).length === 0, cleanIssues(servicesIndex.issues));
    await servicesIndex.close();

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
        r16: rowText('16R'),
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

    // Anchor check (headless Edge: the shared driver always launches --headless=new). The D6 selector that linked here is
    // gone (DR-109); the package anchor must still land below the sticky header when opened directly.
    const anchor = await browser.newPage(390, 844);
    await anchor.touch();
    await anchor.goto('/ar/smart-home/packages#package-plus');
    await anchor.waitFor(`location.pathname === '/ar/smart-home/packages' && location.hash === '#package-plus' && document.readyState === 'complete'`);
    // Measure only after the anchor scroll has settled (same scrollY across 3 animation frames, max 3 s).
    await anchor.eval(`new Promise((resolve) => { const t0 = performance.now(); let last = -1, same = 0; const tick = () => { if (scrollY === last && scrollY > 0) same += 1; else same = 0; last = scrollY; if (same >= 3 || performance.now() - t0 > 3000) resolve(true); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
    const anchorFacts = await anchor.waitFor(`(() => {
      const card = document.querySelector('#package-plus');
      const header = document.querySelector('header.header');
      if (!card || !header || scrollY === 0) return null;
      const top = card.getBoundingClientRect().top;
      const headerBottom = header.getBoundingClientRect().bottom;
      return { top: Math.round(top), headerBottom: Math.round(headerBottom), scrollY: Math.round(scrollY), innerHeight };
    })()`);
    add('d6-anchor-package-plus-below-header', anchorFacts.top >= anchorFacts.headerBottom && anchorFacts.top < anchorFacts.innerHeight, { ...anchorFacts, mode: 'headless' });
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
