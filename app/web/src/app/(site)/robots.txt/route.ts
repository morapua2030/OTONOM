import { publicMarketingOnly } from '@/lib/deployment.ts';
import { SITE_URL } from '@/lib/server.ts';

// Read the mode per request (not at build time), so robots.txt always matches the running configuration.
export const dynamic = 'force-dynamic';

export function GET() {
  if (publicMarketingOnly()) {
    return new Response(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain' } });
  }
  return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain' } });
}
