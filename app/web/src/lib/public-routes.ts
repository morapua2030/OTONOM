import { portfolioReleases } from './portfolio-release.ts';

/** The public pages without a slug, per locale ('' is the home page). The sitemap lists exactly these. */
export const PUBLIC_STATIC_PATHS = ['', '/about', '/services', '/services/iot-embedded', '/services/software-engineering', '/services/smart-home-automation', '/services/custom-engineering', '/business/developers', '/business/contractors', '/start-project', '/smart-home/packages', '/try', '/projects', '/products', '/products/4r', '/products/6r', '/products/16r', '/contact', '/support'] as const;

/** Public pages that exist but are not in the static sitemap list (the sitemap adds privacy itself once approved). */
const PUBLIC_UNLISTED_PATHS = ['/products/compare', '/legal/privacy'];

/**
 * True only for a page this site serves (audit S9-01): a static public page, or a released case study. The path is
 * without the locale prefix. Used by the metrics endpoint so a made-up route is never counted.
 */
export function isKnownPublicPath(path: string): boolean {
  if ((PUBLIC_STATIC_PATHS as readonly string[]).includes(path) || PUBLIC_UNLISTED_PATHS.includes(path)) return true;
  const project = /^\/projects\/([a-z0-9-]{1,40})$/.exec(path);
  return !!project && portfolioReleases.some((release) => release.slug === project[1]);
}
