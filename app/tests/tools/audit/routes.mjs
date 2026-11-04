// D8-C v3 route inventory (copied from the D8-A tooling and updated for design v3.1 / DR-107). Class: how the route behaves
// on the public profile (no synthetic flags). SITEMAP_STATIC mirrors app/(site)/sitemap.xml/route.ts.
export const SITEMAP_STATIC = ['', '/about', '/services', '/services/iot-embedded', '/services/software-engineering', '/services/smart-home-automation', '/services/custom-engineering', '/business/developers', '/business/contractors', '/start-project', '/smart-home/packages', '/try', '/projects', '/products', '/products/4r', '/products/6r', '/products/16r', '/contact', '/support'];

const GATED = ['/account', '/shop', '/cart', '/checkout', '/support/warranty'];

// DR-107: retired routes → 308 to `/${locale}${to}` (query and hash dropped).
export const REDIRECTS = [
  ['/solutions', '/services'], ['/solutions/multi-unit-developments', '/services'], ['/solutions/villas', '/services'], ['/solutions/apartments', '/services'], ['/solutions/scenarios', '/services'],
  ['/engineering-process', '/about'], ['/build-with-us', '/start-project'], ['/products/compare', '/products'], ['/consultation', '/contact'],
  ['/business/request-a-proposal', '/contact'], ['/business/partners', '/business/contractors'],
  ['/technology', '/products'], ['/technology/controllers', '/products'], ['/technology/integrations', '/products'], ['/technology/documentation', '/products'],
  ['/insights', ''], ['/support/service', '/support'],
];

export const ROUTES = [
  ...SITEMAP_STATIC.map((p) => ({ path: p, cls: 'PUBLIC-INDEXED', source: p === '' ? '[locale]/page.tsx' : 'page / v3 resolver' })),
  ...GATED.map((p) => ({ path: p, cls: 'PUBLIC-NOINDEX', source: 'Gated.tsx (noindex: true); private prefix on marketing-only Production' })),
  { path: '/preview', cls: 'PUBLIC-NOINDEX', source: '[...slug] ROUTES preview', note: 'private prefix on marketing-only Production' },
  { path: '/preview/bidi-samples', cls: 'TEST-ONLY', source: 'preview/bidi-samples/page.tsx (404 without OTONOM_TEST_PAGES)' },
  { path: '/projects/test-only-alpha', cls: 'TEST-ONLY', source: 'projects/[slug] (no published case studies, DR-098)' },
];
export const STAFF = ['/staff/login'];
// final release (DR-114): /legal/privacy is a real page that redirects TEMPORARILY (307) to /contact until approved
export const GATED_TEMP = [['/legal/privacy', '/contact']];
export const ERRORS = ['/ar/this-page-does-not-exist', '/en/this-page-does-not-exist', '/xx', '/xx/about', '/ar/products/99r', '/en/products/99r', '/ar/projects/no-such-case', '/en/projects/no-such-case'];
export const LOCALES = ['ar', 'en'];
export const slugOf = (p) => (p === '' ? 'home' : p.slice(1).replaceAll('/', '__'));
