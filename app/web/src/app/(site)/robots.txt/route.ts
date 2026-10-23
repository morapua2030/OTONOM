import { publicMarketingOnly } from '@/lib/deployment.ts';
import { SITE_URL } from '@/lib/server.ts';

export function GET() {
  if (publicMarketingOnly()) {
    return new Response(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain' } });
  }
  return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain' } });
}
