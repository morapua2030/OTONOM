import { withPayload } from '@payloadcms/next/withPayload';

const hostedOverHttps = process.env.VERCEL === '1' || (process.env.OTONOM_SITE_URL ?? '').startsWith('https://');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Per-request CSP is emitted by src/proxy.ts so Next/Payload receive a fresh script nonce.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // HSTS only when the site is served over HTTPS (never on the local http://127.0.0.1 development server)
  ...(hostedOverHttps ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@otonom/domain'],
  poweredByHeader: false,
  serverExternalPackages: ['pg'],
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Self-hosted font files carry a content hash in their name (src/app/(site)/fonts.css): cache them for a year.
      { source: '/fonts/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ];
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
