const ADMIN_PREFIXES = ['/admin', '/staff'];
const PRIVATE_PREFIXES = ['/api', '/graphql'];
const PRIVATE_LOCALIZED_PREFIXES = ['/account', '/cart', '/checkout', '/shop', '/preview', '/support/warranty'];
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/forgot', '/admin/reset', '/admin/logout', '/admin/unauthorized'];

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

/** Only an HTTPS Vercel deployment origin can receive staff/admin redirects. */
export function protectedAdminOrigin(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const configured = env.OTONOM_ADMIN_URL?.trim();
  if (!configured) return undefined;
  try {
    const url = new URL(configured);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.vercel.app') || url.username || url.password) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}
