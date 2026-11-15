import { blobImageOrigin } from './blob-origin.ts';

const NONCE = /^[A-Za-z0-9+/_-]+={0,2}$/;

/**
 * Per-request Content Security Policy. Next reads this policy from the request
 * headers and applies the nonce to its generated scripts. Payload still needs
 * inline styles, so style-src is intentionally tracked separately from B-38.
 */
export function contentSecurityPolicy(nonce: string, env: NodeJS.ProcessEnv = process.env): string {
  if (!NONCE.test(nonce)) throw new Error('invalid CSP nonce');
  // Admin-uploaded images are served from this project's own Blob store (exact origin, nothing wider).
  const blob = blobImageOrigin(env);
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${blob ? ` ${blob}` : ''}`,
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

export function nonceFromPolicy(policy: string): string | undefined {
  return policy.match(/(?:^|;)\s*script-src\s+[^;]*'nonce-([A-Za-z0-9+/_-]+={0,2})'/)?.[1];
}

