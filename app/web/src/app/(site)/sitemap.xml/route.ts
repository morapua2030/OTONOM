import { publicProjects } from '@/lib/portfolio-public.ts';
import { SITE_URL } from '@/lib/server.ts';

export const dynamic = 'force-dynamic';

const STATIC = ['', '/about', '/services', '/services/iot-embedded', '/services/software-engineering', '/services/smart-home-automation', '/services/custom-engineering', '/solutions', '/solutions/multi-unit-developments', '/business/developers', '/business/contractors', '/business/partners', '/business/request-a-proposal', '/build-with-us', '/start-project', '/smart-home/packages', '/engineering-process', '/consultation', '/projects', '/products', '/products/4r', '/products/6r', '/products/16r', '/products/compare', '/technology', '/technology/integrations', '/contact', '/support'];

/** Built from PUBLISHED content only, with reciprocal hreflang alternates. */
export async function GET() {
  const casePaths = (await publicProjects('ar')).map((project) => `/projects/${project.slug}`);
  const paths = [...STATIC, ...casePaths];
  const url = (l: string, p: string) => `${SITE_URL}/${l}${p}`;
  const body = paths
    .map((p) => `<url><loc>${url('ar', p)}</loc><xhtml:link rel="alternate" hreflang="ar" href="${url('ar', p)}"/><xhtml:link rel="alternate" hreflang="en" href="${url('en', p)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${url('ar', p)}"/></url>`)
    .join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${body}</urlset>`, {
    headers: { 'content-type': 'application/xml', 'cache-control': 'no-store' },
  });
}
