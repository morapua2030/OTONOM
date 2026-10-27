import { cache } from 'react';
import type { Locale } from './i18n.ts';
import { publicMarketingOnly } from './deployment.ts';
import { portfolioReleases } from './portfolio-release.ts';
import { projectDTO } from './portfolio-record.ts';

/** Request-scoped cache only: withdrawal/consent is re-evaluated on every request. */
export const publicProjects = cache(async (locale: Locale) => {
  // Marketing release is an explicitly curated subset; no DB access for an empty release.
  if (publicMarketingOnly() && !portfolioReleases.length) return [];
  const [{ getPayload }, { default: config }] = await Promise.all([import('payload'), import('@payload-config')]);
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'case-studies', locale: 'all', fallbackLocale: false, draft: false,
    overrideAccess: false, depth: 0, limit: 200, sort: 'slug',
    ...(publicMarketingOnly() ? { where: { slug: { in: portfolioReleases.map((item) => item.slug) } } } : {}),
  });
  return result.docs.flatMap((doc) => {
    const project = projectDTO(doc as unknown as Record<string, unknown>, locale, portfolioReleases);
    return project ? [project] : [];
  });
});
