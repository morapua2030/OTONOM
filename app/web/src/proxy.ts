import { NextResponse, type NextRequest } from 'next/server';
import { contentSecurityPolicy } from './lib/csp.ts';

/**
 * Next 16 request proxy: gives every dynamic response an unpredictable CSP
 * nonce and passes the policy into the renderer so Next/Payload script tags
 * receive the same nonce. Incoming CSP/nonce headers are always overwritten.
 */
export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll('-', '');
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('content-security-policy', policy);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', policy);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

