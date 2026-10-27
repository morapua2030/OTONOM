import type { Locale } from './i18n.ts';
import { isDiscipline, type PublicProject, type ProjectImage, type Discipline } from './portfolio.ts';
import type { PortfolioRelease } from './portfolio-release.ts';

const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
function localized(value: unknown, locale: Locale): string {
  return value && typeof value === 'object' ? text((value as Record<string, unknown>)[locale]) : '';
}
export const publicCaseFields = ['id', 'slug', 'title', 'objectives', 'body', 'outcomes', 'limitations', 'seoTitle', 'seoDescription', 'systems', 'projectType'] as const;
/** Also used by the REST/GraphQL boundary; private relations and editorial metadata never escape. */
export function publicCaseRecord(doc: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(publicCaseFields.filter((key) => doc[key] !== undefined).map((key) => [key, doc[key]]));
}
export function projectDTO(doc: Record<string, unknown>, locale: Locale, releases: readonly PortfolioRelease[]): PublicProject | null {
  const slug = text(doc.slug);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) return null;
  if (!['ar', 'en'].every((l) => localized(doc.title, l as Locale) && localized(doc.body, l as Locale))) return null;
  const release = releases.find((item) => item.slug === slug);
  const categories: Discipline[] = release ? [...new Set(release.categories.filter(isDiscipline))] : ['smart-home'];
  const image = (item: NonNullable<PortfolioRelease['hero']>): ProjectImage | undefined => {
    if (!/^\/portfolio\/[a-z0-9-]+\.(webp|png|jpg|jpeg)$/.test(item.src) || !item.alt.ar.trim() || !item.alt.en.trim() || item.width <= 0 || item.height <= 0) return undefined;
    return { src: item.src, alt: item.alt[locale], width: item.width, height: item.height, ...(item.caption ? { caption: item.caption[locale] } : {}) };
  };
  const sections = (items: PortfolioRelease['journey']) => (items ?? []).filter((item) => item.heading.ar && item.heading.en && item.body.ar && item.body.en).map((item) => ({ heading: item.heading[locale], body: item.body[locale] }));
  return {
    slug, title: localized(doc.title, locale), summary: localized(doc.objectives, locale) || localized(doc.body, locale).slice(0, 220),
    categories, searchText: ['ar', 'en'].flatMap((l) => [localized(doc.title, l as Locale), localized(doc.objectives, l as Locale)]).join(' '),
    featured: release?.featured === true, hero: release?.hero ? image(release.hero) : undefined,
    gallery: (release?.gallery ?? []).flatMap((item) => { const approved = image(item); return approved ? [approved] : []; }),
    kind: release?.kind?.[locale], status: release?.status?.[locale], timeframe: release?.timeframe?.[locale],
    challenge: localized(doc.objectives, locale), constraints: localized(doc.limitations, locale),
    solution: localized(doc.body, locale), outcomes: localized(doc.outcomes, locale),
    journey: sections(release?.journey), engineering: sections(release?.engineering),
    seoTitle: localized(doc.seoTitle, locale), seoDescription: localized(doc.seoDescription, locale),
  };
}
