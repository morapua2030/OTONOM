import { NextResponse, type NextRequest } from 'next/server';
import { contentSecurityPolicy } from './lib/csp.ts';
import { adminPathRequiresSessionCookie, isAdministrativePath, isPrivatePublicRoute, protectedAdminOrigin, publicMarketingOnly } from './lib/deployment.ts';

function secured(response: NextResponse, policy: string) {
  response.headers.set('Content-Security-Policy', policy);
  return response;
}

/**
 * Next 16 request proxy: gives every dynamic response an unpredictable CSP
 * nonce and passes the policy into the renderer so Next/Payload script tags
 * receive the same nonce. Incoming CSP/nonce headers are always overwritten.
 */
export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll('-', '');
  const policy = contentSecurityPolicy(nonce);

  if (publicMarketingOnly()) {
    const { pathname, search } = request.nextUrl;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return secured(new NextResponse('Not Found', { status: 404, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } }), policy);
    }
    if (isAdministrativePath(pathname)) {
      const adminOrigin = protectedAdminOrigin();
      if (!adminOrigin) {
        return secured(new NextResponse('Not Found', { status: 404, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } }), policy);
      }
      const destination = new URL(adminOrigin);
      destination.pathname = pathname;
      destination.search = search;
      return secured(NextResponse.redirect(destination, 307), policy);
    }
    if (isPrivatePublicRoute(pathname)) {
      return secured(new NextResponse('Not Found', { status: 404, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } }), policy);
    }
  }

  if (adminPathRequiresSessionCookie(request.nextUrl.pathname, request.cookies.has('payload-token'))) {
    const destination = request.nextUrl.clone();
    destination.pathname = '/staff/login';
    destination.search = '';
    const response = NextResponse.redirect(destination, 307);
    response.headers.set('cache-control', 'private, no-cache, no-store, max-age=0, must-revalidate');
    response.headers.set('x-robots-tag', 'noindex');
    return secured(response, policy);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('content-security-policy', policy);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return secured(response, policy);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
