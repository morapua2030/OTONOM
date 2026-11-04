const ADMIN_PREFIXES = ['/admin', '/staff'];
const PRIVATE_PREFIXES = ['/api', '/graphql'];
const PRIVATE_LOCALIZED_PREFIXES = ['/account', '/cart', '/checkout', '/shop', '/preview', '/support/warranty'];
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/forgot', '/admin/reset', '/admin/logout', '/admin/unauthorized'];

const STATIC_PREFIXES = ['/brand', '/fonts', '/products'];

const hasPathPrefix = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * A fail-closed, Vercel-Production-only mode for the anonymous marketing site.
 * Copying the flag to Preview or local development cannot expose those targets.
 */
export function publicMarketingOnly(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.OTONOM_PUBLIC_MARKETING_ONLY === '1' && env.VERCEL === '1' && env.VERCEL_ENV === 'production';
}

export function isAdministrativePath(pathname: string): boolean {
  return ADMIN_PREFIXES.some((prefix) => hasPathPrefix(pathname, prefix));
}

/**
 * Payload's admin shell can remain in the browser's client cache after logout.
 * A fresh admin request without the HttpOnly auth cookie must therefore be
 * redirected before any admin shell or cached custom view can be rendered.
 */
export function adminPathRequiresSessionCookie(pathname: string, hasSessionCookie: boolean): boolean {
  if (!hasPathPrefix(pathname, '/admin') || PUBLIC_ADMIN_PATHS.some((path) => hasPathPrefix(pathname, path))) return false;
  return !hasSessionCookie;
}

/** Routes that must never be served by the public marketing runtime. */
export function isPrivatePublicRoute(pathname: string): boolean {
  if (PRIVATE_PREFIXES.some((prefix) => hasPathPrefix(pathname, prefix))) return true;
  const match = pathname.match(/^\/(?:ar|en)(\/.*)?$/);
  const localizedPath = match?.[1] ?? '';
  return PRIVATE_LOCALIZED_PREFIXES.some((prefix) => hasPathPrefix(localizedPath, prefix));
}

/**
 * The admin host origin (OTONOM_ADMIN_URL). It must be credential-free HTTPS and either a Vercel domain or an origin
 * listed exactly in OTONOM_CSRF_ORIGINS (so a later move to the company domain is an env change only, see
 * docs/ai/DOMAIN_MOVE.md). Anything else is ignored: staff/admin requests on the public host then answer 404.
 */
export function protectedAdminOrigin(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const configured = env.OTONOM_ADMIN_URL?.trim();
  if (!configured) return undefined;
  try {
    const url = new URL(configured);
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    const listed = (env.OTONOM_CSRF_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean).some((o) => {
      try { return new URL(o).origin === url.origin && new URL(o).protocol === 'https:'; } catch { return false; }
    });
    if (!url.hostname.endsWith('.vercel.app') && !listed) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

/** Which host a request arrived on in Production: the admin host (OTONOM_ADMIN_URL) or the public site. */
export function hostRole(host: string | null | undefined, env: NodeJS.ProcessEnv = process.env): 'admin' | 'public' {
  const admin = protectedAdminOrigin(env);
  if (!admin || !host) return 'public';
  return host.trim().toLowerCase() === new URL(admin).host.toLowerCase() ? 'admin' : 'public';
}

/**
 * The only application endpoints the public host serves in marketing-only mode (owner, 2026-11-04): the privacy-first
 * metrics counter and the booking request. Exact method + path; everything else under /api stays closed there.
 */
export const PUBLIC_HOST_ENDPOINTS: ReadonlyArray<{ method: 'POST'; path: string }> = [
  { method: 'POST', path: '/api/e' },
  { method: 'POST', path: '/api/booking' },
];
export const isPublicHostEndpoint = (method: string, pathname: string) =>
  PUBLIC_HOST_ENDPOINTS.some((e) => e.method === method && e.path === pathname);

export type MarketingDecision =
  | { kind: 'pass'; noindex: boolean }
  | { kind: 'not-found' }
  | { kind: 'redirect'; to: string; status: 307 };

/**
 * Routing in Production marketing-only mode, as a pure function (tested in deployment-mode.test.ts):
 * - admin host: staff/admin pages and /api are served (MFA, RBAC and audit apply as before), every response is
 *   noindex, and public pages redirect to /admin;
 * - public host: GET/HEAD marketing pages only; /admin and /staff redirect to the admin host (404 without one);
 *   /api, /graphql and private pages answer 404, except the exact PUBLIC_HOST_ENDPOINTS.
 */
export function marketingDecision(req: { method: string; pathname: string; search: string; host: string | null }, env: NodeJS.ProcessEnv = process.env): MarketingDecision {
  const { method, pathname, search } = req;
  if (hostRole(req.host, env) === 'admin') {
    if (isAdministrativePath(pathname) || hasPathPrefix(pathname, '/api') || hasPathPrefix(pathname, '/graphql')) return { kind: 'pass', noindex: true };
    // Static files (brand logo, icons, fonts, product images) used by the staff shell.
    if ((method === 'GET' || method === 'HEAD') && (STATIC_PREFIXES.some((p) => hasPathPrefix(pathname, p)) || /\/[^/]+\.[a-z0-9]{2,5}$/i.test(pathname))) return { kind: 'pass', noindex: true };
    if (method !== 'GET' && method !== 'HEAD') return { kind: 'not-found' };
    return { kind: 'redirect', to: `${protectedAdminOrigin(env)}/admin`, status: 307 };
  }
  if (isPublicHostEndpoint(method, pathname)) return { kind: 'pass', noindex: true };
  if (method !== 'GET' && method !== 'HEAD') return { kind: 'not-found' };
  if (isAdministrativePath(pathname)) {
    const adminOrigin = protectedAdminOrigin(env);
    if (!adminOrigin) return { kind: 'not-found' };
    return { kind: 'redirect', to: `${adminOrigin}${pathname}${search}`, status: 307 };
  }
  if (isPrivatePublicRoute(pathname)) return { kind: 'not-found' };
  return { kind: 'pass', noindex: false };
}

/** First path segment shaped like a language code (e.g. /xx, /fr-fr/...) that is not one of the site locales. */
const UNKNOWN_LOCALE = /^\/(?!(?:ar|en)(?:\/|$))[a-z]{2}(?:-[a-z]{2})?(?:\/|$)/i;
export const isUnknownLocalePath = (pathname: string) => UNKNOWN_LOCALE.test(pathname);

/**
 * Design v3.1 route decisions (owner, 2026-11-03, DR-107): legacy pages that are not in the design answer with a
 * 308 to the nearest new page; the locale is kept and the query dropped. The only exception is the local synthetic
 * test harness (OTONOM_TEST_PAGES=1, not Vercel, not preview-locked), where the legacy pages stay reachable so the
 * existing security suites (stored-XSS on CMS pages, RFQ backend journeys, claims gate) keep running unchanged.
 */
const LEGACY_ROUTES: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\/solutions(?:\/.*)?$/, '/services'],
  [/^\/engineering-process\/?$/, '/about'],
  [/^\/build-with-us\/?$/, '/start-project'],
  [/^\/products\/compare\/?$/, '/products'],
  [/^\/consultation\/?$/, '/contact'],
  [/^\/business\/request-a-proposal\/?$/, '/contact'],
  [/^\/business\/partners\/?$/, '/business/contractors'],
  [/^\/technology(?:\/.*)?$/, '/products'],
  [/^\/insights\/?$/, ''],
  [/^\/support\/service\/?$/, '/support'],
  [/^\/legal\/privacy\/?$/, '/contact'],
];

export const legacyRouteHarness = (env: NodeJS.ProcessEnv = process.env) =>
  env.OTONOM_TEST_PAGES === '1' && env.VERCEL !== '1' && env.OTONOM_FORCE_PREVIEW !== '1';

/** Target path (locale kept, no query) for a legacy public route, or null. */
export function legacyRouteRedirect(pathname: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const match = /^\/(ar|en)(\/.*)?$/.exec(pathname);
  if (!match || !match[2] || legacyRouteHarness(env)) return null;
  const target = LEGACY_ROUTES.find(([pattern]) => pattern.test(match[2]!))?.[1];
  return target === undefined ? null : `/${match[1]}${target}`;
}
